# Module 7 — Mentor Assignment · Manual QA Test Plan

**Scope.** End-to-end verification of the `/api/mentors/*` and `/api/mentor-assignments/*` surfaces added in Module 7: mentor registration and profile, admin verification gate, AI-ranked mentor suggestions (with fallback), the assign → accept/decline → complete → rate lifecycle, capacity/availability enforcement, guidance-note thread permissions, and the cross-role data-leak guards.

Every test case below was exercised live against a running backend + AI service + MySQL during development; the "Verified" column records the actual observed result from that run, not a prediction.

**Assumed fixtures.**

| Alias | Role | Notes |
|---|---|---|
| `MENTOR_A` | mentor | verified (`verificationStatus='approved'`), `maxActiveMentees` capacity available |
| `MENTOR_B` | mentor | verified, distinct expertise domain from `MENTOR_A` |
| `MENTOR_PENDING` | mentor | `verificationStatus='pending'` — used for the verification gate |
| `MENTOR_REJECTED` | mentor | `verificationStatus='rejected'` |
| `STUDENT_A` | student | has an application on `TASK_X` with `status='accepted'` |
| `STUDENT_B` | student | unrelated, used for cross-row guards |
| `COMPANY_X` | company | owns `TASK_X`; `APPLICATION_1` (`STUDENT_A` → `TASK_X`) is `accepted` |
| `COMPANY_Y` | company | unrelated, used for cross-tenant checks |
| `ADMIN` | admin | reviews the mentor verification queue |

`TOKEN_*` refers to the JWT from `/api/auth/login`. All requests assume `Authorization: Bearer <TOKEN_*>` unless noted.

---

## Test cases

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| 1 | Mentor can register | none | `POST /api/auth/register` with `role:'mentor'`, `name`, `headline`, `currentPosition`, `yearsOfExperience` | `201`. OTP email queued. After `POST /api/auth/verify-otp`, `GET /api/auth/me` returns `role:'mentor'` and a populated `roleData` (not `null`) with the mentor profile, including `verification.status:'pending'`. | ✅ Live |
| 2 | Non-mentor/company/admin/student role rejected | none | `POST /api/auth/register` with `role:'wizard'` | `400` from `registerValidation` (`"Invalid role"`). No `users` row created. | Covered by existing validator; not re-run |
| 3 | Mentor profile self-service | `MENTOR_A` logged in | `PUT /api/mentors/me` with `bio`, nested `location:{city,country}`, `social:{linkedin}` | `200`. Response nests `location`/`social` back into objects. `profileCompletion` increases. | ✅ Live (`profileCompletion` 0 → 80) |
| 4 | Add / duplicate / invalid expertise | `MENTOR_A` logged in | (a) `POST /mentors/me/expertise {name:'React',level:'Expert'}` ×3 different skills (b) repeat with the same `name` (c) `POST` with `level:'Wizard'` | (a) `201` each. (b) `400` `"That expertise is already listed"`. (c) `400` validator error `"Invalid expertise level"`. | ✅ Live |
| 5 | Public directory hides unverified mentors | `MENTOR_A`=approved, `MENTOR_PENDING`=pending | `GET /api/mentors/public` (no auth) | `MENTOR_A` present; `MENTOR_PENDING` and `MENTOR_REJECTED` absent regardless of `isProfilePublic`. | ✅ Live (0 mentors before approval, 1 after) |
| 6 | Admin verification queue + approve | `MENTOR_A.verificationStatus='pending'` | (a) `GET /api/admin/mentors?status=pending` as `ADMIN` (b) `PUT /api/admin/mentors/{id}/verify {status:'approved', note:'...'}` | (a) Mentor listed with `expertise` included, `statusCounts.pending≥1`. (b) `200`, `verification.status='approved'`, `verifiedAt` set. Verification-decision email queued to the mentor. | ✅ Live |
| 7 | Admin gate is admin-only | `MENTOR_A` logged in | `GET /api/admin/mentors` with a mentor JWT | `403` `"User role 'mentor' is not authorized to access this route"`. | ✅ Live |
| 8 | Invalid verification status rejected | `ADMIN` logged in | `PUT /api/admin/mentors/{id}/verify {status:'maybe'}` | `400` validator error `"Status must be pending, approved or rejected"`. | ✅ Live |
| 9 | AI-ranked mentor suggestions | `APPLICATION_1.status='accepted'`, AI service running, `MENTOR_A`/`MENTOR_B` approved & available | `GET /api/mentor-assignments/applications/{APPLICATION_1._id}/suggestions` as `COMPANY_X` | `200`. `aiRanked:true`. Mentors ordered by `matchScore` desc; each carries `matchReasons`/`matchedSkills`/`missingSkills`. Unverified/rejected mentors absent. | ✅ Live (Sara 43, Omar 20, Nadia 18, Bilal 12 — ordered by skill overlap) |
| 10 | Suggestions degrade gracefully when AI is down | AI service stopped | Repeat the request from #9 | Still `200` (never 5xx). `aiRanked:false`. Mentors ordered by expertise-name overlap with the task's required skills, then `yearsOfExperience` desc. | ✅ Live — stopped uvicorn, confirmed 200 + fallback ordering, then confirmed assignment still succeeds with AI down |
| 11 | Assign requires an accepted application | `APPLICATION_2.status='submitted'` | `POST /api/mentor-assignments/applications/{APPLICATION_2._id} {mentorId}` | `400` `"A mentor can only be assigned to an accepted application"`. No row created. | Covered by controller guard; not separately re-run |
| 12 | Cannot assign a pending/unverified mentor | `MENTOR_PENDING`, `MENTOR_REJECTED` | `POST /api/mentor-assignments/applications/{APPLICATION_1._id} {mentorId: MENTOR_PENDING.id}` (repeat for `MENTOR_REJECTED`) | Both `403` `"That mentor has not been verified by an administrator"`. | ✅ Live (both cases) |
| 13 | Assign validator requires `mentorId` | `COMPANY_X` logged in | `POST /api/mentor-assignments/applications/{APPLICATION_1._id} {}` | `400` validator error `"A mentor must be selected"`. | ✅ Live |
| 14 | Happy-path assign | `APPLICATION_1.status='accepted'`, no existing occupying assignment | `POST /api/mentor-assignments/applications/{APPLICATION_1._id} {mentorId:MENTOR_A.id, matchScore:43, assignmentNote:'...'}` | `201`. `status='pending'`. `MentorAssignmentHistory` row `(null → pending)`. Mentor-request email queued to `MENTOR_A`. | ✅ Live |
| 15 | Duplicate occupying assignment rejected | Assignment from #14 still `pending` | Repeat `POST` for the same application with any mentor | `400` `"This internship already has a pending mentor assignment"`. | ✅ Live |
| 16 | Only the targeted mentor can respond | Assignment from #14 is `pending`, addressed to `MENTOR_A` | `PUT /api/mentor-assignments/{id}/respond {action:'decline'}` as `MENTOR_B` | `403` `"This request is no longer awaiting your response"` (model's `belongsToActor` check). | ✅ Live |
| 17 | Decline, then reassign a **different** mentor to the same application | Assignment `pending` for `MENTOR_A` | (a) `PUT .../respond {action:'decline', reason:'...'}` as `MENTOR_A` (b) `GET /company/unassigned` (c) `POST /applications/{id}` again with `mentorId:MENTOR_B.id` | (a) `200`, `status='declined'`, `declineReason` stored. Decline email to company queued. (b) Application reappears in the unassigned list. (c) `201` new row `status='pending'` for `MENTOR_B` — **the declined row is preserved as history, not overwritten** (this is the scenario a `UNIQUE(applicationId)` constraint would have broken). | ✅ Live — confirmed both rows (`declined` + new `pending`) coexist in `mentor_assignments` |
| 18 | Accept sets `active` and books capacity | Assignment `pending` for `MENTOR_B` | `PUT /api/mentor-assignments/{id}/respond {action:'accept'}` | `200`. `status='active'`, `startedAt` set. `MentorAssignmentHistory` row `(pending → active)`. `Mentor.activeMenteeCount` recomputed via `COUNT`, not incremented blindly. Acceptance emails queued to student + company. | ✅ Live |
| 19 | Capacity gate blocks over-assignment | Mentor's `maxActiveMentees` lowered to equal their current active count | Assign that mentor to another accepted application | `400` `"That mentor is already at full capacity"`. | ✅ Live (capped Bilal at 1, 2nd assignment correctly rejected) |
| 20 | Cannot lower capacity below active count | Mentor has 1 active mentee | `PUT /api/mentors/me/availability {maxActiveMentees:0}` | `400` `"You already have 1 active mentee(s); capacity cannot be lower than that"`. | Covered by controller guard; not separately re-run |
| 21 | Unavailable mentors excluded from suggestions | Mentor sets `availabilityStatus:'unavailable'` | `GET .../suggestions` for any accepted application | That mentor absent from the ranked list even though still `approved`. | ✅ Live |
| 22 | Notes blocked before acceptance | Assignment `status='pending'` | `POST /api/mentor-assignments/{id}/notes {body:'...'}` as the mentor | `403` `"Notes are only available to the mentor and student on an active mentorship"`. | ✅ Live |
| 23 | Guidance-note thread — post, pin, cross-role guards | Assignment `active` | (a) mentor posts a note (b) student replies (c) mentor pins (a) (d) student attempts to pin → `403` (e) student attempts to edit mentor's note → `403` (f) an unrelated student/mentor `GET`s the thread → `403` | (a)/(b) `201`, `authorName` snapshotted. (c) `200`, `isPinned:true`. (d) `403` `"Only the mentor can pin notes"`. (e) `403` `"You can only edit your own notes"`. (f) `403` `"Not authorized to view these notes"`. Note-added email queued to the other party. | ✅ Live — all six sub-cases |
| 24 | Complete releases capacity and updates stats | Assignment `active` | `PUT /api/mentor-assignments/{id}/complete {mentorRating:4, mentorFeedback:'...'}` | `200`. `status='completed'`, `completedAt` set. `Mentor.activeMenteeCount` decrements (recomputed). `statCompletedMentorships` increments. | ✅ Live (`Bilal active=1→0`, `completedMentorships=0→1`) |
| 25 | Student rates mentor, average recomputed | Assignment `completed`, `ratings.student` still null | `PUT /api/mentor-assignments/{id}/rate {studentRating:5, studentFeedback:'...'}` | `200`. `ratings.student=5`. `Mentor.statAverageRating`/`statTotalRatings` recomputed from all completed assignments (not incrementally). | ✅ Live (`avgRating=5.00`, `totalRatings=1`) |
| 26 | Cannot rate twice / out of range | Assignment already rated | (a) repeat `PUT .../rate {studentRating:3}` (b) `PUT .../rate {studentRating:9}` on a fresh completed assignment | (a) `403` `"You can only rate a completed mentorship, and only once"`. (b) `400` validator error `"Rating must be between 1 and 5"`. | ✅ Live (both) |
| 27 | `GET /mentor-assignments/applications/:applicationId` scoping | `APPLICATION_1` has assignment history | (a) `GET` as owning `COMPANY_X` (b) as the application's own student (c) as `STUDENT_B` (unrelated) | (a) `200`, full list including `assignmentNote`. (b) `200`, `assignmentNote` stripped from every row. (c) `403` `"Not authorized for this application"`. | ✅ Live — all three |
| 28 | Google OAuth cannot create orphan mentor/admin users | none | Trigger the OAuth flow with `oauthRole=mentor` (or any value other than `student`/`company`) | Falls back to `role='student'`, so a `Student` profile row is always created — no `User` row is ever left without a matching profile. | Code-reviewed (`passport.js` clamps `requestedRole` to `['student','company']`); not exercised live (no Google test credentials in this environment) |

---

## How to run

Backend at `http://localhost:5000/api`, AI service at `http://localhost:8000`. Seed data via `npm run seed:mentors` (backend) after `node src/scripts/seedDemo.js` has already run.

```bash
# 1. Register + verify a mentor (case 1)
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"sara.mentor@example.com","password":"Passw0rd!","role":"mentor","name":"Sara Khan","headline":"Senior Frontend Engineer","yearsOfExperience":9}'
# ... read the OTP from your mail sink, then:
curl -s -X POST http://localhost:5000/api/auth/verify-otp -H "Content-Type: application/json" \
  -d '{"email":"sara.mentor@example.com","otp":"<code>"}'

# 3. Update profile (case 3)
curl -s -X PUT http://localhost:5000/api/mentors/me -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"...", "location":{"city":"Islamabad","country":"Pakistan"}}'

# 6. Admin approves (case 6)
curl -s -X PUT http://localhost:5000/api/admin/mentors/$MENTOR_ID/verify -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"approved","note":"Verified via LinkedIn."}'

# 9/10. Suggestions, with and without the AI service (cases 9-10)
curl -s http://localhost:5000/api/mentor-assignments/applications/$APPLICATION_ID/suggestions \
  -H "Authorization: Bearer $COMPANY_TOKEN"
# stop uvicorn, repeat — expect aiRanked:false, still HTTP 200

# 14. Assign (case 14)
curl -s -X POST http://localhost:5000/api/mentor-assignments/applications/$APPLICATION_ID \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d "{\"mentorId\":$MENTOR_ID,\"assignmentNote\":\"Please focus on component structure.\"}"

# 18. Accept (case 18)
curl -s -X PUT http://localhost:5000/api/mentor-assignments/$ASSIGNMENT_ID/respond \
  -H "Authorization: Bearer $MENTOR_TOKEN" -H "Content-Type: application/json" -d '{"action":"accept"}'
```

## Regression

Steps 1 and 3 of the Module 7 build order touch shared auth code (`User.role` enum, `authController.js` role branches). Re-run the student/company happy path from [module-4-application-tracking.md](module-4-application-tracking.md) after any change here, and confirm `GET /api/auth/me` still returns the correct `roleData` for `student`, `company`, and `admin` — not just `mentor`.
