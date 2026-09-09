# Module 8 — Progress Tracking · Manual QA Test Plan

**Scope.** End-to-end verification of the `/api/progress/*` surface added in
Module 8: automatic internship creation on acceptance, back-fill of pre-Module-8
applications, the milestone state machine, submission and review with attempt
history, time logging with its caps, blockers and check-ins, the derived
health signal, the AI progress report with its offline fallback, closure with
outstanding work, and the cross-role access guards.

> **Verification status.** The rule-level logic is covered by automated tests
> that pass (`backend: npm test` — 69 tests; `ai-service: pytest` — 33 tests),
> and the frontend passes `tsc --noEmit` and a full `next build`. The cases
> below need a running MySQL + backend + AI service and have **not** been
> exercised live yet — the **Verified** column is left blank deliberately, to
> be filled in during your own run rather than pre-populated. Do not treat this
> table as evidence of a live pass until you have completed it.

**Assumed fixtures.**

| Alias | Role | Notes |
|---|---|---|
| `STUDENT_A` | student | has `APPLICATION_1` on `TASK_X` with `status='accepted'` |
| `STUDENT_B` | student | unrelated, used for cross-row guards |
| `COMPANY_X` | company | owns `TASK_X` |
| `COMPANY_Y` | company | unrelated, used for cross-tenant checks |
| `MENTOR_A` | mentor | holds an **active** `MentorAssignment` on `APPLICATION_1` |
| `MENTOR_B` | mentor | holds a **completed** assignment on `APPLICATION_1` |
| `MENTOR_C` | mentor | verified but holds no assignment on `APPLICATION_1` |
| `ADMIN` | admin | |
| `APPLICATION_2` | — | `STUDENT_B` → `TASK_X`, `status='submitted'` (not accepted) |

`TOKEN_*` is the JWT from `/api/auth/login`; every request assumes
`Authorization: Bearer <TOKEN_*>` unless noted. `PROGRESS_1` is the internship
for `APPLICATION_1`.

---

## A. Creation and back-fill

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| A1 | Accepting an application opens the internship | `APPLICATION_3` is `shortlisted` | `PUT /api/applications/:id/status {status:'accepted'}` as the owning company | `200`. A row appears in `internship_progress` with `status='not_started'`, `startDate` = today, and `targetEndDate` derived from the task's duration. | |
| A2 | Progress is refused before acceptance | `APPLICATION_2.status='submitted'` | `GET /api/progress/applications/{APPLICATION_2.id}` as `COMPANY_X` | `400` `"Progress tracking starts once the application has been accepted"`. **No row is created.** | |
| A3 | Back-fill for a pre-Module-8 acceptance | delete the `internship_progress` row for `APPLICATION_1` directly in SQL | `GET /api/progress/applications/{APPLICATION_1.id}` as `STUDENT_A` | `200`. The row is recreated. Repeating the call does **not** create a second row. | |
| A4 | Back-fill happens on the list endpoints too | delete the row again | `GET /api/progress/student` as `STUDENT_A` | `200`, and the internship is present in `records`. | |
| A5 | Probing an ID cannot create rows | none | `GET /api/progress/applications/{APPLICATION_1.id}` as `STUDENT_B` | `403` `"Not authorized for this application"`. Authorisation is checked **before** creation, so no row is written. | |
| A6 | Duplicate protection | none | Fire two concurrent `GET /applications/{id}` calls | Exactly one row exists. `UNIQUE(applicationId)` is the final guard. | |

## B. Plan management (milestones)

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| B1 | Company creates a milestone | `PROGRESS_1` open | `POST /api/progress/{PROGRESS_1}/milestones {title,weight:3,dueDate,estimatedHours,isRequired:true}` as `COMPANY_X` | `201`, `status='pending'`, `orderIndex` appended after existing ones. A `progress_status_history` row `(null → pending)` is written. Milestone-added email queued to the student. | |
| B2 | Active mentor can also create | — | Repeat B1 as `MENTOR_A` | `201`, `createdByRole='mentor'`. | |
| B3 | A past mentor cannot | — | Repeat B1 as `MENTOR_B` (completed assignment) | `403` — read access does not imply supervise access. | |
| B4 | An unrelated mentor cannot even read | — | `GET /api/progress/{PROGRESS_1}` as `MENTOR_C` | `403` `"Not authorized to view this internship"`. | |
| B5 | The student cannot author milestones | — | Repeat B1 as `STUDENT_A` | `403` — students drive milestones through the state machine, they do not author them. | |
| B6 | Validator rejects a bad milestone | — | `POST` with `title:'ab'`, then `weight:99` | `400` `"Milestone title must be between 3 and 200 characters"`, then `"Weight must be between 1 and 10"`. | |
| B7 | Due date cannot precede the start | `PROGRESS_1.startDate` is set | `POST` with `dueDate` a day before `startDate` | `400` `"A milestone cannot be due before the internship starts"`. | |
| B8 | Reorder rewrites indexes | 3 milestones exist | `PUT /{PROGRESS_1}/milestones/reorder {milestoneIds:[c,a,b]}` | `200`, `orderIndex` becomes 0,1,2 in that order. | |
| B9 | Partial reorder rejected | 3 milestones exist | `PUT .../reorder {milestoneIds:[a]}` | `400` `"The reorder list must contain every milestone on this internship exactly once"`. | |
| B10 | Duplicate reorder rejected | — | `PUT .../reorder {milestoneIds:[a,a,b]}` | `400` `"The reorder list contains duplicate milestones"`. | |
| B11 | Delete is blocked once work exists | a milestone with `submissionCount ≥ 1` | `DELETE /{PROGRESS_1}/milestones/{id}` | `400` telling the caller to cancel instead — deleting would erase the student's record. | |
| B12 | Delete works on untouched milestones | a `pending` milestone, no submissions | `DELETE` it | `200`, row gone, history row `(pending → deleted)` retained with the title. | |
| B13 | Plan is frozen after closure | `PROGRESS_1.status='completed'` | `POST .../milestones` as `COMPANY_X` | `403` — the plan cannot change once the internship is closed. | |

## C. Milestone state machine

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| C1 | Student starts a milestone | `status='pending'` | `PUT .../milestones/{id}/start` as `STUDENT_A` | `200`, `status='in_progress'`, `startedAt` set. The internship auto-advances `not_started → in_progress` and `startedAt` is stamped. | |
| C2 | Student submits | `status='in_progress'` | `POST .../milestones/{id}/submit {summary, repositoryUrl}` | `201`. `milestone.status='submitted'`, `submissionCount=1`. A `milestone_submissions` row with `attemptNumber=1`, `status='pending_review'`. Emails queued to `COMPANY_X` **and** `MENTOR_A`. | |
| C3 | Summary is validated | — | `POST .../submit {summary:'short'}` | `400` `"Tell your reviewer what you delivered (10-5000 characters)"`. | |
| C4 | Double submit rejected | `status='submitted'` | `POST .../submit` again | `400` `"This milestone is already awaiting review"`. | |
| C5 | Cannot submit while blocked | `status='blocked'` | `POST .../submit` | `400` `"Clear the blocker on this milestone before submitting"`. | |
| C6 | Reviewer requests changes | `status='submitted'` | `PUT .../review {action:'request_changes', note:'…'}` as `MENTOR_A` | `200`, `status='changes_requested'`, submission `status='changes_requested'`, `reviewNote` stored. Email to the student. | |
| C7 | Changes note is required | — | `PUT .../review {action:'request_changes'}` with no note *(UI-level guard)* | The UI blocks it. The API accepts a missing note — confirm the UI shows *"Tell the student what needs to change"*. | |
| C8 | Resubmission supersedes the old attempt | `status='changes_requested'` | `POST .../submit` again | `201`, `attemptNumber=2`. The attempt-1 row is now `status='superseded'`, **not** deleted. `GET .../submissions` returns both. | |
| C9 | Approval completes the milestone | `status='submitted'` | `PUT .../review {action:'approve', score:4}` | `200`, `status='completed'`, `completedAt` set, submission `status='approved'`, `reviewScore=4`. `progressPercent` increases by that milestone's weight share. | |
| C10 | Only a submitted milestone can be reviewed | `status='in_progress'` | `PUT .../review {action:'approve'}` | `400` `"Only a submitted milestone can be reviewed — this one is 'in_progress'"`. | |
| C11 | Illegal transitions are named | `status='pending'` | `PUT .../status {status:'completed'}` | `400` telling the caller to approve the submission instead. | |
| C12 | Student cannot self-approve | — | `PUT .../status {status:'completed'}` as `STUDENT_A` | `400`/`403` — never `200`. `progressPercent` unchanged. | |
| C13 | Student is limited to block/unblock | — | `PUT .../status {status:'cancelled'}` as `STUDENT_A` | `403` `"As the student you can only move a milestone to: blocked, in_progress, pending"`. | |
| C14 | Reviewer can reopen an approval | `status='completed'` | `PUT .../status {status:'in_progress'}` as `COMPANY_X` | `200`, `completedAt` cleared, `progressPercent` drops back. | |
| C14a | A student cannot reopen their own approval | `status='completed'` | `PUT .../status {status:'in_progress'}` as `STUDENT_A` | `403` `"Only the company or your mentor can reopen an approved milestone"`. `progressPercent` unchanged. | |
| C14b | …nor via the start route | `status='completed'` | `PUT .../milestones/{id}/start` as `STUDENT_A` | `400` naming `pending` / `changes_requested` as the only startable states. | |
| C14c | Submitting without starting works | `status='pending'` | `POST .../submit {summary}` as `STUDENT_A` (never pressed Start) | `201`. `status='submitted'`, `startedAt` stamped on the way through — the UI offers Submit here, so the API must accept it. | |
| C15 | Cancelling leaves the percentage alone or raises it | 2 milestones, 1 completed, 1 pending (50%) | Cancel the pending one | `progressPercent` becomes **100** — cancelled work leaves the denominator. | |
| C16 | Cancelled restores only to pending | `status='cancelled'` | `PUT .../status {status:'in_progress'}` | `400` naming `pending` as the only legal target. | |

## D. Blockers and the timeline

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| D1 | Student raises a blocker on a milestone | `status='in_progress'` | `PUT .../status {status:'blocked', reason:'No DB access'}` | `200`, `blockedReason` stored, **and** a `progress_updates` row of type `blocker` is created. `openBlockerCount` = 1, health becomes `at_risk`. Emails to `COMPANY_X` and `MENTOR_A`. | |
| D2 | A reason is mandatory | — | `PUT .../status {status:'blocked'}` | `400` `"Describe what is blocking you"`. | |
| D3 | Unblocking clears the update too | `status='blocked'` | `PUT .../status {status:'in_progress', reason:'resolved'}` | `200`. The blocker update is marked resolved, `openBlockerCount` returns to 0, health recovers. | |
| D4 | Resolving the update unblocks the milestone | `status='blocked'` | `PUT .../updates/{blockerId}/resolve` | `200`. The milestone returns to `in_progress` and a history row `(blocked → in_progress, "Blocker resolved")` is written. | |
| D5 | Standalone blocker | — | `POST .../updates {type:'blocker', body:'…'}` as `STUDENT_A` | `201`, `isOpen=true`, health `at_risk`. | |
| D6 | Only a supervisor raises a risk flag | — | `POST .../updates {type:'risk_flag'}` as `STUDENT_A` | `403` `"Only a supervisor can raise a risk flag — post a blocker instead"`. Repeat as `COMPANY_X` → `201`. | |
| D7 | Check-in with self-reported progress | — | `POST .../updates {type:'checkin', body:'…', percentSelfReported:60}` | `201`. Stored, and notified to everyone except the author. | |
| D8 | Only a resolvable type can be resolved | a `checkin` exists | `PUT .../updates/{checkinId}/resolve` | `400` `"Only a blocker or a risk flag can be resolved"`. | |
| D9 | Double resolve rejected | resolved blocker | `PUT .../resolve` again | `400` `"That has already been resolved"`. | |
| D10 | Only the author edits or deletes | update authored by `STUDENT_A` | `PUT`/`DELETE .../updates/{id}` as `COMPANY_X` | `403` `"You can only edit your own updates"`. Admin succeeds. | |
| D11 | An outsider cannot read the timeline | — | `GET .../updates` as `STUDENT_B` | `403`. | |

## E. Time logging

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| E1 | Student logs time against a milestone | open internship | `POST .../time-logs {hours:3, workDate:today, milestoneId}` | `201`. `milestone.actualHours` and `progress.totalHoursLogged` both recomputed (not incremented). `lastActivityAt` updated. | |
| E2 | Time can be logged without a milestone | — | `POST .../time-logs {hours:2}` (no `milestoneId`) | `201`, counted in the internship total only. | |
| E3 | Per-entry bounds | — | `POST {hours:0.1}` then `{hours:20}` | Both `400` `"Log between 0.25 and 16 hours per entry"`. | |
| E4 | Daily cap across entries | 14h already logged today | `POST {hours:5, workDate:today}` | `400` naming the resulting total and the 16h cap. | |
| E5 | No future dates | — | `POST {hours:2, workDate: tomorrow}` | `400` `"You cannot log time for a future date"`. | |
| E6 | Nothing before the start date | `startDate` set | `POST {hours:2, workDate: startDate - 1}` | `400` `"You cannot log time before the internship started"`. | |
| E7 | Cross-internship milestone rejected | a milestone from another internship | `POST {hours:2, milestoneId: <other>}` | `400` `"That milestone does not belong to this internship"`. | |
| E8 | Only the owner edits | — | `PUT .../time-logs/{id}` as `COMPANY_X` | `403` `"You can only edit your own time entries"`. | |
| E9 | Moving a log between milestones re-derives both | log on milestone A | `PUT .../time-logs/{id} {milestoneId: B}` | `200`. **Both** A and B have `actualHours` recomputed. | |
| E10 | Editing respects the day cap | — | `PUT` an entry to push the day over 16h | `400`, and the entry is unchanged. | |
| E11 | Deleting re-derives the totals | — | `DELETE .../time-logs/{id}` | `200`, milestone and internship hours both drop correctly. | |
| E12 | Time is frozen after closure | `status='completed'` | `POST`/`PUT`/`DELETE` a time log as the student | `403`/`400` — only an admin may still edit. | |
| E13 | Paused internships accept no work | `status='paused'` | `POST .../time-logs` as the student | `403` `"Only the student on an open, unpaused internship can log time"`. | |

## F. Health derivation

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| F1 | On track | 50% complete, half the window used, active yesterday | `GET /api/progress/{PROGRESS_1}` | `healthStatus='on_track'`. | |
| F2 | Overdue by end date | set `targetEndDate` to two days ago | Re-read | `healthStatus='overdue'`. **Emailed once**, on the transition only. | |
| F3 | Due today is not yet overdue | set `targetEndDate` to today | Re-read | **Not** `overdue` (a `DATEONLY` deadline means end of that day). | |
| F4 | Overdue by milestone | a required milestone two days past due | Re-read | `overdueMilestoneCount ≥ 1`, `healthStatus='overdue'`. | |
| F5 | At risk from schedule lag | 10% complete, 80% of the window used | Re-read | `healthStatus='at_risk'`. | |
| F6 | Small lag is tolerated | 40% complete, 50% of the window used | Re-read | `on_track` — inside the 15-point tolerance. | |
| F7 | At risk from silence | set `lastActivityAt` to 8 days ago, status `in_progress` | Re-read | `healthStatus='at_risk'`. | |
| F8 | Paused is not flagged for silence | `status='paused'`, idle 30 days | Re-read | `on_track`. | |
| F9 | Closed carries no risk | `status='completed'` with overdue milestones | Re-read | `healthStatus='on_track'`; the UI hides the health badge entirely. | |
| F10 | No repeat alerts | already `at_risk` | Re-read the record five times | The supervisors are emailed **once**, not on every read. | |

## G. Report and AI fallback

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| G1 | Report with the AI service up | AI service running | `GET /api/progress/{PROGRESS_1}/report` | `200`, `aiGenerated:true`. `insight` carries `risk_level`, `risk_score`, `projected_completion_percent`, `schedule_variance`, `signals[]`, `recommendations[]`. | |
| G2 | Report with the AI service down | stop uvicorn | Repeat G1 | Still `200` (**never 5xx**), `aiGenerated:false`, and the same response shape from the local fallback. The UI shows the "AI service is unreachable" notice and renders identically. | |
| G3 | Indicators are backend-computed | AI down | Compare `indicators` between G1 and G2 | Identical — they are computed on the backend either way. | |
| G4 | Rework rate | 1 approved, 1 sent back | Read the report | `rework_rate = 50`. | |
| G5 | On-time rate | one late submission of two | Read the report | `on_time_submission_rate = 50`. | |
| G6 | Weekly effort series | time logged across three weeks | Read the report | `weeklyHours` has one entry per ISO week (Monday start), oldest first. | |
| G7 | Signals are ordered | several risks present | Read the report | `signals` are sorted by weight descending. | |
| G8 | Empty plan | no milestones | Read the report | A `no_plan` signal, and a recommendation to break the task into milestones. | |

## H. Closure

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| H1 | Completion blocked by required work | one required milestone still `in_progress` | `PUT /{PROGRESS_1}/complete` as `COMPANY_X` | `400` naming the count and telling the caller to resend with `acknowledgeIncomplete`. Status unchanged. | |
| H2 | Override is recorded | same | `PUT .../complete {acknowledgeIncomplete:true, completionNote, performanceRating:4}` | `200`, `status='completed'`, `closedWithOutstandingWork=true`, `actualEndDate` today. The response lists `outstandingMilestones`. | |
| H3 | Optional milestones do not block | only an **optional** milestone open | `PUT .../complete` with no acknowledgement | `200`, `closedWithOutstandingWork=false`. | |
| H4 | Clean completion | all required milestones approved | `PUT .../complete {completionNote}` | `200`. Completion emails to student, company and active mentor. | |
| H5 | `performanceRating` is hidden from the student | `performanceRating=4` set | `GET /api/progress/{PROGRESS_1}` as `STUDENT_A`, then as `COMPANY_X` | Absent for the student, present for the company. The student's completion email also omits it. | |
| H6 | Completion cannot go through the status endpoint | — | `PUT .../status {status:'completed'}` | `400` `"Use the complete endpoint to close an internship out"`. | |
| H7 | Pause and resume | `status='in_progress'` | `PUT .../status {status:'paused'}`, then `{status:'in_progress'}` | Both `200`. Resuming from anything other than `paused` returns `400` `"Only a paused internship can be resumed"`. | |
| H8 | Abandon needs a reason | — | `PUT .../status {status:'abandoned'}` | `400` `"A reason is required to abandon an internship"`. With a reason → `200`, `actualEndDate` set. | |
| H9 | Closed is final | `status='completed'` | `PUT .../status {status:'paused'}` | `400` `"A completed internship cannot change status again"`. | |
| H10 | Only the owning company pauses | — | `PUT .../status {status:'paused'}` as `MENTOR_A` | `403` `"Only the hiring company can change this status"` — a mentor may complete, but not pause or abandon. | |
| H11 | Backwards move rejected | — | `PUT .../status {status:'not_started'}` | `400` `"An internship cannot be moved back to not started"`. | |

## I. Lists, dashboards and cross-role guards

| # | Scenario | Pre-condition | Steps | Expected result | Verified |
|---|---|---|---|---|---|
| I1 | Trouble sorts first | one overdue, one at-risk, one on-track | `GET /api/progress/company` as `COMPANY_X` | Order is overdue → at_risk → on_track, then by `updatedAt` desc. | |
| I2 | Health filter | — | `GET /api/progress/company?health=overdue` | Only overdue records. | |
| I3 | Scope filter | — | `GET /api/progress/student?scope=completed` | Only completed internships. | |
| I4 | Company sees only its own | — | `GET /api/progress/company` as `COMPANY_Y` | `APPLICATION_1`'s internship is **absent**. | |
| I5 | Mentor scope comes from assignments | `MENTOR_C` has none | `GET /api/progress/mentor` as `MENTOR_C` | `200` with an empty list — not a 500, not someone else's data. | |
| I6 | A completed mentorship still lists | `MENTOR_B` | `GET /api/progress/mentor` as `MENTOR_B` | The internship is listed (read access survives completion). | |
| I7 | Overview is role-scoped | — | `GET /api/progress/overview` as each role | Counts cover only that role's scope; an admin sees the whole platform. | |
| I8 | Health counts exclude closed work | one completed internship | `GET /api/progress/overview` | The completed one is in `statusCounts` but **not** in `healthCounts`. | |
| I9 | Wrong role on a role route | — | `GET /api/progress/company` as `STUDENT_A` | `403` from `authorize('company')`. | |
| I10 | Unauthenticated | no token | `GET /api/progress/{PROGRESS_1}` | `401` `"Not authorized to access this route"`. | |
| I11 | Non-existent record | — | `GET /api/progress/999999` | `404` `"Progress record not found"`. | |
| I12 | Cross-internship milestone ID | milestone from another internship | `PUT /{PROGRESS_1}/milestones/{other}/start` | `404` `"Milestone not found"` — the lookup is always scoped by `progressId`. | |

## J. UI walkthrough

| # | Scenario | Steps | Expected result | Verified |
|---|---|---|---|---|
| J1 | Student journey | Log in as `STUDENT_A` → nav **Internships** → open the on-track internship | Ring shows the weighted percentage; four tabs (Milestones, Time log, Timeline, Report). Start → Submit buttons appear on the right milestones only. | |
| J2 | Student cannot see supervisor controls | Same page | No "Add milestone", no "Edit plan", no "Mark complete", no Review buttons. | |
| J3 | Company review flow | Log in as `COMPANY_X` → **Progress** → open the internship → Milestones tab → **Review** | The modal shows the submission, its links, earlier attempts, an approve/request-changes choice and a 1–5 score. | |
| J4 | Mentor sees the same workspace | Log in as `MENTOR_A` → **Progress** → open the internship | Identical workspace with supervisor affordances (their assignment is `active`). | |
| J5 | Report tab with the AI down | Stop the AI service, open the Report tab | The amber "AI service is unreachable" notice appears; indicators, signals and the weekly chart still render. | |
| J6 | Dashboard cards | Visit `/student/dashboard`, `/company/dashboard`, `/mentor/students` | An internships card appears with up to three rows, at-risk ones flagged. It is hidden entirely when there are none. | |
| J7 | Entry from an application | Student: `/student/applications/{id}` (accepted). Company: candidate page → **Progress** tab | Both show the progress card linking into the workspace. On a non-accepted application the company tab explains that tracking starts on acceptance. | |
| J8 | Empty state | A brand-new internship with no milestones | "No milestones yet", with copy that differs for a supervisor (prompting them to create some) and a student. | |
| J9 | No console errors | Walk every Module 8 page | Clean browser console. | |

---

## How to run

Backend at `http://localhost:5000/api`, AI service at `http://localhost:8000`,
`DB_SYNC=alter` in `backend/.env` for the first boot so the six new tables are
created.

```bash
# 0. Seed a populated dataset (after seedDemo.js and seed:mentors)
cd backend && npm run seed:progress

# 1. Open the internship for an accepted application (case A3)
curl -s "http://localhost:5000/api/progress/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# 2. Company adds a milestone (case B1)
curl -s -X POST "http://localhost:5000/api/progress/$PROGRESS_ID/milestones" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Build the dashboard data layer","weight":3,"estimatedHours":20,"dueDate":"2026-10-01"}'

# 3. Student starts and submits (cases C1, C2)
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/start" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
curl -s -X POST "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"summary":"Charts wired to the API with loading and error states.","repositoryUrl":"https://github.com/example/work"}'

# 4. Mentor reviews (case C9)
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/review" \
  -H "Authorization: Bearer $MENTOR_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"approve","note":"Clean work.","score":4}'

# 5. Student logs time (case E1)
curl -s -X POST "http://localhost:5000/api/progress/$PROGRESS_ID/time-logs" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"hours":3,"workDate":"2026-09-10","milestoneId":"'"$MS_ID"'","description":"Chart wiring"}'

# 6. Report, then repeat with the AI service stopped (cases G1, G2)
curl -s "http://localhost:5000/api/progress/$PROGRESS_ID/report" \
  -H "Authorization: Bearer $COMPANY_TOKEN" | jq '.data.aiGenerated, .data.insight.risk_level'
```

## Automated coverage (already passing)

```bash
cd backend    && npm test    # 69 tests — health derivation, the milestone state
                             # machine, overdue date semantics, the weighted
                             # completion formula, access predicates, toJSON
cd ai-service && pytest -q   # 33 tests — 22 of them the progress risk engine
```

These need no database, so they run in CI and locally without setup. Everything
in the tables above needs the full stack.
