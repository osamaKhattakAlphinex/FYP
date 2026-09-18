# Module 7 — Mentor Assignment · QA Test Plan

**Scope.** Verification of the `/api/mentors/*` and `/api/mentor-assignments/*`
surfaces added in Module 7 (plus the mentor queue on `/api/admin/mentors`):
mentor registration and profile, the admin verification gate, AI-ranked mentor
suggestions with their offline fallback, the assign → accept/decline →
complete → rate lifecycle, cancellation, capacity/availability enforcement,
guidance-note thread permissions, the cross-role data-leak guards, and how the
mentorship drives access to the Module 8 internship.

> **How the Status column was filled.** Every status reflects a run that was
> actually observed:
>
> - **Pass — live (recorded at Module 7 development, MySQL)**: exercised by the
>   original developer against a running backend + AI service + MySQL while
>   Module 7 was built. The observed values from that run are kept in brackets.
>   These were not re-run live for this revision.
> - **Pass — harness (SQLite)**: the real Express routes, controllers, models
>   and validators booted over an **in-memory SQLite** database with email
>   sending recorded (scratch integration harness `m7.flow.test.js`, kept
>   outside the repo). Run twice: with the AI service down (fallback ranking)
>   and against a live `uvicorn app.main:app` on port 8765 (`aiRanked: true`).
>   Strong evidence, but **not** MySQL.
> - **Pass — pytest**: `ai-service/tests/test_mentor_matcher.py`.
> - **Pass — jest**: the backend unit suite (there are no Module 7–specific
>   jest tests; it is listed only as a regression gate).
> - **Not run — needs live stack**: registration/OTP mail, Google OAuth, real
>   SMTP delivery, UI walk-throughs, real MySQL concurrency. Do not treat
>   these as passing.
>
> Where a case was recorded live *and* re-run in the harness, both are listed.
> Cases were renumbered into sections; `(was #N)` maps to the previous
> single-table numbering.

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

`TOKEN_*` refers to the JWT from `/api/auth/login`. All requests assume
`Authorization: Bearer <TOKEN_*>` unless noted.

---

## A. Functional

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| A1 | Mentor can register (was #1) | none | `POST /api/auth/register` with `role:'mentor'`, `name`, `headline`, `currentPosition`, `yearsOfExperience`, then `POST /api/auth/verify-otp` | `201`, OTP email queued. After verification `GET /api/auth/me` returns `role:'mentor'` and a populated `roleData` including `verification.status:'pending'`. | Pass — live (recorded at Module 7 development, MySQL). Registration/OTP is outside the harness; the `/auth/me` half (mentor `roleData` populated) is also Pass — harness (SQLite), see G2 |
| A2 | Mentor profile self-service (was #3) | `MENTOR_A` logged in | `PUT /api/mentors/me` with `bio`, `currentPosition`, `currentCompany`, nested `location:{city,country}`, `social:{linkedin}` | `200`. Response nests `location`/`social` back into objects; `profileCompletion` increases (reaches 100 with ≥3 expertise entries). | Pass — live (recorded at Module 7 development, MySQL) [`profileCompletion` 0 → 80] · Pass — harness (SQLite) |
| A3 | Admin verification queue + approve (was #6) | `MENTOR_A.verificationStatus='pending'` | (a) `GET /api/admin/mentors?status=pending` as `ADMIN` (b) `PUT /api/admin/mentors/{id}/verify {status:'approved', note}` | (a) Mentor listed with `expertise`, `statusCounts.pending ≥ 1`. (b) `200`, `verification.status='approved'`, `verifiedAt` set, verification-decision email queued to the mentor. | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| A4 | AI-ranked mentor suggestions (was #9) | `APPLICATION_1` accepted, AI service running, `MENTOR_A`/`MENTOR_B` approved & available | `GET /api/mentor-assignments/applications/{APPLICATION_1}/suggestions` as `COMPANY_X` | `200`, `aiRanked:true`, mentors ordered by `matchScore` desc, each with `matchReasons`/`matchedSkills`/`missingSkills`; unverified/rejected mentors absent. | Pass — live (recorded at Module 7 development, MySQL) [Sara 43, Omar 20, Nadia 18, Bilal 12] · Pass — harness (SQLite) + live uvicorn (`POST /rank-mentors ok`) |
| A5 | Happy-path assign (was #14) | `APPLICATION_1` accepted, no occupying assignment | `POST /api/mentor-assignments/applications/{APPLICATION_1} {mentorId, matchScore:43, assignmentNote}` | `201`, `status='pending'`, `MentorAssignmentHistory` row `(null → pending)`, mentor-request email queued to the mentor. | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| A6 | Accept sets `active` and books capacity (was #18) | assignment `pending` for `MENTOR_B` | `PUT /api/mentor-assignments/{id}/respond {action:'accept'}` | `200`, `status='active'`, `startedAt` set, history `(pending → active)`, `Mentor.activeMenteeCount` recomputed (= 1), acceptance emails to student + company. | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| A7 | Complete releases capacity and updates stats (was #24) | assignment `active` | `PUT /api/mentor-assignments/{id}/complete {mentorRating:4, mentorFeedback}` as the mentor | `200`, `status='completed'`, `completedAt` set, `ratings.mentor=4`, `activeMenteeCount` 1 → 0, `statCompletedMentorships` 0 → 1. | Pass — live (recorded at Module 7 development, MySQL) [Bilal active 1→0, completed 0→1] · Pass — harness (SQLite) |
| A8 | Student rates mentor, average recomputed (was #25) | assignment `completed`, not yet rated | `PUT /api/mentor-assignments/{id}/rate {studentRating:5, studentFeedback}` | `200`, `ratings.student=5`; `statAverageRating=5.00`, `statTotalRatings=1` recomputed from all completed assignments. | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| A9 | Guidance-note thread (was #23) | assignment `active` | (a) mentor posts (b) student replies (c) mentor pins a note (d) student tries to pin (e) student edits the mentor's note (f) unrelated student/mentor reads the thread | (a)/(b) `201`, `authorName` snapshotted, note email to the other party. (c) `200`, `isPinned:true`. (d) `403` "Only the mentor can pin notes". (e) `403` "You can only edit your own notes". (f) `403` "Not authorized to view these notes". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| A10 | Cancel an assignment | assignment `pending` or `active` | `PUT /api/mentor-assignments/{id}/cancel {reason}` as `COMPANY_X` (pending) and as `ADMIN` (active) | `200`, `status='cancelled'`, `cancellationReason` stored, history row, capacity recomputed, cancellation email to the mentor. | Pass — harness (SQLite) |
| A11 | Role lists | lifecycle above | `GET /mentor-assignments/me` (mentor), `/student`, `/company?scope=closed` | Each lists only the caller's rows; `scope=closed` returns declined/completed/cancelled. | Pass — harness (SQLite) |
| A12 | Mentor stats | `MENTOR_B` with 1 active | `GET /api/mentors/me/stats` | `statusCounts.active=1`, `capacity {max, used, remaining}` computed from a `COUNT`. | Pass — harness (SQLite) |
| A13 | Mentor matcher scoring rules | — | unit | strong overlap scores high, none low, partial in the middle; seniority never penalised on entry-level tasks; monotonic experience fit; deterministic; reasons mention free capacity. | Pass — pytest (7 tests) |

## B. Positive

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| B1 | Public directory lists approved mentors only (was #5) | `MENTOR_A` approved, `MENTOR_PENDING` pending | `GET /api/mentors/public` (no auth), before and after approval | Approved mentor present; pending/rejected absent regardless of `isProfilePublic`; `GET /public/{id}` of a pending mentor → `404`. | Pass — live (recorded at Module 7 development, MySQL) [0 mentors before approval, 1 after] · Pass — harness (SQLite) |
| B2 | Decline, then reassign a **different** mentor (was #17) | assignment `pending` for `MENTOR_A` | (a) `PUT …/respond {action:'decline', reason}` as `MENTOR_A` (b) `GET /company/unassigned` (c) `POST /applications/{id} {mentorId: MENTOR_B}` | (a) `200`, `declined`, `declineReason` stored, decline email to the company. (b) application reappears. (c) `201` new `pending` row — the declined row is preserved (both rows coexist). | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| B3 | Suggestions degrade gracefully when AI is down (was #10) | AI service stopped | repeat A4 | Still `200`, `aiRanked:false`, `matchScore:null`, ordered by expertise overlap with the required skills, then `yearsOfExperience` desc; reason text "Matches 2/2 required skills" / "No overlap with the required skills". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| B4 | Pinned notes first; thread survives completion | A9 done | `GET …/notes`; complete the mentorship; post a note | pinned note listed first; posting after completion `201`. | Pass — harness (SQLite) |
| B5 | Admin reads a thread for moderation | active assignment | `GET …/notes` as `ADMIN` | `200` (admins may read, not post). | Pass — harness (SQLite) |
| B6 | Cancellation frees capacity | mentor at `maxActiveMentees=1` with one active | admin cancels the active one, company assigns the mentor elsewhere | `201` on the new assignment. | Pass — harness (SQLite) |
| B7 | Verification can be reset to pending | mentor `rejected` | `PUT /api/admin/mentors/{id}/verify {status:'pending'}` | `200`, `verification.verifiedAt` cleared. | Pass — harness (SQLite) |
| B8 | Assignment email trail | lifecycle | inspect recorded mail | request → mentor; accepted → student + company; declined → company; note → the other party; cancelled → mentor; verification decision → mentor. | Pass — harness (SQLite) (recorded, not delivered) |

## C. Negative

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| C1 | Unknown role rejected at registration (was #2) | none | `POST /api/auth/register` with `role:'wizard'` | `400` "Invalid role"; no `users` row. | Not run — needs live stack (registration is outside the harness; the original note was "covered by existing validator; not re-run") |
| C2 | Duplicate / invalid expertise (was #4) | `MENTOR_A` logged in | (a) three different skills (b) repeat a name (c) `level:'Wizard'` | (a) `201` each (b) `400` "That expertise is already listed" (c) `400` "Invalid expertise level". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C3 | Invalid verification status (was #8) | `ADMIN` | `PUT /api/admin/mentors/{id}/verify {status:'maybe'}` | `400` "Status must be pending, approved or rejected". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C4 | Assign requires an accepted application (was #11) | `APPLICATION_2.status='submitted'` | `POST /api/mentor-assignments/applications/{APPLICATION_2} {mentorId}` | `400` "A mentor can only be assigned to an accepted application"; no row. | Pass — harness (SQLite) (previously "covered by controller guard; not separately re-run") |
| C5 | Cannot assign a pending/rejected mentor (was #12) | `MENTOR_PENDING`, `MENTOR_REJECTED` | assign each to `APPLICATION_1` | Both `403` "That mentor has not been verified by an administrator". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C6 | Assign validator requires `mentorId` (was #13) | `COMPANY_X` | `POST …/applications/{APPLICATION_1} {}` | `400` "A mentor must be selected". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C7 | Duplicate occupying assignment (was #15) | assignment still `pending` | assign again with any mentor | `400` "This internship already has a pending mentor assignment". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C8 | Capacity gate (was #19) | mentor's `maxActiveMentees` = current active count | assign that mentor to another accepted application | `400` "That mentor is already at full capacity". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C9 | Capacity cannot drop below active count (was #20) | mentor has 1 active mentee | `PUT /api/mentors/me/availability {maxActiveMentees:0}` | `400` "You already have 1 active mentee(s); capacity cannot be lower than that". | Pass — harness (SQLite) (previously "covered by controller guard; not separately re-run") |
| C10 | Notes blocked before acceptance (was #22) | assignment `pending` | `POST …/{id}/notes {body}` as the mentor | `403` "Notes are only available to the mentor and student on an active mentorship". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C11 | Rate twice / out of range (was #26) | assignment already rated | (a) rate again (b) `studentRating:9` | (a) `403` "You can only rate a completed mentorship, and only once" (b) `400` "Rating must be between 1 and 5". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| C12 | Unavailable mentor cannot be assigned | mentor `availabilityStatus='unavailable'` | assign them | `400` "That mentor is currently unavailable". | Pass — harness (SQLite) |
| C13 | Unknown ids | — | assign `mentorId:999999`; suggestions for application `999999`; verify mentor `999999`; `GET /mentor-assignments/999999` | `404` each. | Pass — harness (SQLite) |
| C14 | Validator bounds | — | `respond {action:'maybe'}`; `complete {mentorRating:9}`; `availability {maxActiveMentees:51}`; profile `yearsOfExperience:99`; empty note body | `400` each. | Pass — harness (SQLite) |
| C15 | Terminal states are final | completed / cancelled assignment | complete again; cancel again; accept a declined request | `403` each ("You cannot complete this mentorship", "You cannot cancel this assignment", "This request is no longer awaiting your response"). | Pass — harness (SQLite) |
| C16 | Rating an active mentorship | assignment `active` | `PUT …/rate {studentRating:5}` | `403`. | Pass — harness (SQLite) |
| C17 | Bad admin filter | `ADMIN` | `GET /api/admin/mentors?status=bogus` | `400` "Invalid verification status filter". | Pass — harness (SQLite) |

## D. Edge cases

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| D1 | Unavailable mentors excluded from suggestions (was #21) | mentor sets `availabilityStatus:'unavailable'` | `GET …/suggestions` | Absent even though still `approved`. | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| D2 | A mentor at capacity drops out of suggestions | mentor at `maxActiveMentees` | `GET …/suggestions` for another internship | Absent (capacity is `COUNT`ed, not read from the cache). | Pass — harness (SQLite) |
| D3 | Capacity re-checked at accept time | capacity 1, two `pending` requests created while 0 active | accept both | first `200`; second `400` "You are at full capacity. Complete or decline an existing mentorship first." | Pass — harness (SQLite) |
| D4 | Student does not see a pending request | assignment `pending` | `GET /mentor-assignments/student` | empty — a mentorship appears only once `active`. | Pass — harness (SQLite) |
| D5 | Approved but non-public profile | `isProfilePublic=false`, approved | `GET /api/mentors/public` | absent. | Pass — harness (SQLite) |
| D6 | A mentor cannot self-verify | `MENTOR_PENDING` | `PUT /api/mentors/me {verificationStatus:'approved'}` | `200` but `verification.status` stays `pending` (field not editable). | Pass — harness (SQLite) |
| D7 | Two companies' requests race for the last slot / same application | concurrent `POST …/applications/{id}` | fire two at once on MySQL | at most one occupying row per application; capacity not exceeded. | Not run — needs live stack (MySQL concurrency; the SQLite harness is a single connection and cannot overlap transactions) |

## E. Integration

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| E1 | Accepted mentor gains the Module 8 internship | assignment accepted | `GET /api/progress/applications/{id}` as the mentor; add a milestone; `GET /api/progress/mentor` | `200`, `progress.mentorId` = the mentor (synced on read), milestone `201` with `createdByRole='mentor'`, listed. | Pass — harness (SQLite) |
| E2 | Pending or declined mentor has no internship access | assignment `pending` / `declined` | `GET /api/progress/applications/{id}` | `403`. | Pass — harness (SQLite) |
| E3 | Completed mentorship keeps read, loses supervise | assignment completed | `GET /api/progress/{id}`; `POST …/milestones` | `200`; `403`. | Pass — harness (SQLite) |
| E4 | Cancelled mentorship revokes access | second mentor accepted then cancelled | read as that mentor; read as student | `403`; `progress.mentorId` falls back to the completed mentor. | Pass — harness (SQLite) |
| E5 | Module 9: a completed-assignment mentor evaluates | completed assignment, completed internship | `GET/PUT/finalize /api/evaluations/…` as the mentor | allowed, `finalizedByRole='mentor'`. | Pass — harness (SQLite) (`m9.flow.test.js`) |
| E6 | Backend ↔ AI `/rank-mentors` contract | AI service on :8765 | A4 via the backend | `aiRanked:true`, numeric `matchScore` on every row. | Pass — harness (SQLite) + live uvicorn |
| E7 | Real SMTP delivery | SMTP configured | B8 flow | emails arrive and render. | Not run — needs live stack |

## F. Permission / security

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| F1 | Admin queue is admin-only (was #7) | `MENTOR_A` logged in | `GET /api/admin/mentors` with a mentor JWT | `403` "User role 'mentor' is not authorized to access this route". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| F2 | Only the targeted mentor can respond (was #16) | assignment `pending` for `MENTOR_A` | `PUT …/respond {action:'decline'}` as `MENTOR_B` | `403` "This request is no longer awaiting your response". | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| F3 | Per-application history scoping (was #27) | `APPLICATION_1` has history | `GET /mentor-assignments/applications/{id}` as (a) `COMPANY_X` (b) its student (c) `STUDENT_B` | (a) `200` incl. `assignmentNote` (b) `200`, `assignmentNote` stripped (c) `403` "Not authorized for this application". Admin `200`. | Pass — live (recorded at Module 7 development, MySQL) · Pass — harness (SQLite) |
| F4 | Google OAuth cannot create orphan mentor/admin users (was #28) | none | OAuth flow with `oauthRole=mentor` | Falls back to `role='student'` with a `Student` profile. | Not run — needs live stack (code-reviewed only: `passport.js` clamps the role to `student`/`company`; no Google test credentials) |
| F5 | The company is not on the note thread | active assignment | `GET …/notes` as `COMPANY_X` | `403`. | Pass — harness (SQLite) |
| F6 | Single-assignment view | active assignment | `GET /mentor-assignments/{id}` as the student; as an unrelated mentor | student `200` without `assignmentNote`, with `statusHistory`; unrelated mentor `403` "Not authorized to view this mentorship". | Pass — harness (SQLite) |
| F7 | Stranger company | — | suggestions, assign, cancel as `COMPANY_Y` | `403` each; no row written. | Pass — harness (SQLite) |
| F8 | Role gates on routes | — | suggestions as a student; complete as a company; cancel as a mentor; `/api/mentors/me` as a student | `403` each. | Pass — harness (SQLite) |
| F9 | A student can only delete/edit their own notes | mentor's note | `DELETE` it as the student | `403` "You can only delete your own notes". | Pass — harness (SQLite) |
| F10 | Another mentor's expertise row | — | `DELETE /api/mentors/me/expertise/{foreignId}` | `404` (lookup scoped to the caller). | Pass — harness (SQLite) |
| F11 | No token | — | `GET /api/mentor-assignments/me` | `401`. | Pass — harness (SQLite) |

## G. Regression

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| G1 | Module 4 student/company happy path after the shared auth changes (was "Regression") | re-run [module-4-application-tracking.md](module-4-application-tracking.md) | unchanged. | Not run — needs live stack (only the Module 4 accept endpoint is exercised in the harness, by Module 8 case A1) |
| G2 | `/api/auth/me` `roleData` per role (was "Regression") | `GET /api/auth/me` as mentor, student, company, admin | `200`, correct `role`, `roleData` populated for all four. | Pass — harness (SQLite) |
| G3 | Assignment payload shape unchanged after Modules 9–12 | assign and inspect the response | keeps `_id`, ids, `status`, `matchScore`, `assignmentNote`, `ratings`, `feedback` and the `mentor/student/company/task/application` includes; raw `studentRating`/`mentorRating`/`*Feedback` stay folded away. | Pass — harness (SQLite) |
| G4 | Whole Module 7 lifecycle with the Module 9–12 models registered | `node --test m7.flow.test.js` | all flows above pass. | Pass — harness (SQLite) |
| G5 | Backend unit suite | `cd backend && npx jest` | 312 passed (no Module 7–specific tests; regression gate only). | Pass — jest |
| G6 | AI suite | `cd ai-service && python -m pytest -q` | 144 passed, incl. 7 in `test_mentor_matcher.py`. | Pass — pytest |

## H. UI walkthrough

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| H1 | Admin verification | `/admin/mentors` → filter pending → approve with a note | row moves to approved; mentor appears in the public directory. | Not run — needs live stack |
| H2 | Company assigns a mentor | `/company/mentors` → an unassigned internship → **Assign mentor** (`AssignMentorModal`) | ranked suggestions with reasons; "AI unavailable" ordering still shown when the AI is down; assignment created. | Not run — needs live stack |
| H3 | Mentor responds | `/mentor/students` → pending request → accept / decline with reason | request moves to active / disappears; company sees the decline. | Not run — needs live stack |
| H4 | Note thread | `/mentor/students/{assignmentId}` and `/student/mentorship/{assignmentId}` | notes post both ways, mentor can pin, student cannot. | Not run — needs live stack |
| H5 | Mentor profile | `/mentor/profile` → edit, add expertise, set availability | completion bar updates; capacity guard message shown. | Not run — needs live stack |

---

## How to run

Backend at `http://localhost:5000/api`, AI service at `http://localhost:8000`.
Seed data via `npm run seed:mentors` (backend) after `node src/scripts/seedDemo.js`.

```bash
# A1. Register + verify a mentor
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"sara.mentor@example.com","password":"Passw0rd!","role":"mentor","name":"Sara Khan","headline":"Senior Frontend Engineer","yearsOfExperience":9}'
# ... read the OTP from your mail sink, then:
curl -s -X POST http://localhost:5000/api/auth/verify-otp -H "Content-Type: application/json" \
  -d '{"email":"sara.mentor@example.com","otp":"<code>"}'

# A2. Update profile
curl -s -X PUT http://localhost:5000/api/mentors/me -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"...", "location":{"city":"Islamabad","country":"Pakistan"}}'

# A3. Admin approves
curl -s -X PUT http://localhost:5000/api/admin/mentors/$MENTOR_ID/verify -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"approved","note":"Verified via LinkedIn."}'

# A4 / B3. Suggestions, with and without the AI service
curl -s http://localhost:5000/api/mentor-assignments/applications/$APPLICATION_ID/suggestions \
  -H "Authorization: Bearer $COMPANY_TOKEN"
# stop uvicorn, repeat — expect aiRanked:false, still HTTP 200

# A5. Assign
curl -s -X POST http://localhost:5000/api/mentor-assignments/applications/$APPLICATION_ID \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d "{\"mentorId\":$MENTOR_ID,\"assignmentNote\":\"Please focus on component structure.\"}"

# A6. Accept
curl -s -X PUT http://localhost:5000/api/mentor-assignments/$ASSIGNMENT_ID/respond \
  -H "Authorization: Bearer $MENTOR_TOKEN" -H "Content-Type: application/json" -d '{"action":"accept"}'

# A7 / A8. Complete, then the student rates
curl -s -X PUT http://localhost:5000/api/mentor-assignments/$ASSIGNMENT_ID/complete \
  -H "Authorization: Bearer $MENTOR_TOKEN" -H "Content-Type: application/json" -d '{"mentorRating":4}'
curl -s -X PUT http://localhost:5000/api/mentor-assignments/$ASSIGNMENT_ID/rate \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" -d '{"studentRating":5}'

# A10. Cancel
curl -s -X PUT http://localhost:5000/api/mentor-assignments/$ASSIGNMENT_ID/cancel \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" -d '{"reason":"Changed plans"}'
```

## Automated coverage (observed)

```bash
cd backend    && npx jest            # 312 passed, 9 suites — none Module 7-specific (regression gate)
cd ai-service && python -m pytest -q # 144 passed — 7 of them in test_mentor_matcher.py
```

Integration harness (scratch, in-memory SQLite, not in the repo):
`m7.flow.test.js` — **8 tests, 8 passed** with the AI service down (fallback
ranking) and **8 passed** against a live `uvicorn` on port 8765
(`aiRanked: true`, `POST /rank-mentors ok`). Registration/OTP, Google OAuth,
UI pages, SMTP delivery and MySQL concurrency remain *Not run — needs live
stack*.
