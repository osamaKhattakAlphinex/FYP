# Module 8 — Progress Tracking · QA Test Plan

**Scope.** Verification of the `/api/progress/*` surface added in Module 8:
automatic internship creation on acceptance, back-fill of pre-Module-8
applications, the milestone state machine, submission and review with attempt
history, time logging with its caps, blockers and check-ins, the derived health
signal, the AI progress report with its offline fallback, closure with
outstanding work, the cross-role access guards — and that the Module 9–12
hook-ins left all of this unchanged.

> **How the Status column was filled.** Every status reflects a run that was
> actually observed:
>
> - **Pass — jest**: `backend/tests/progress.rules.test.js` (53 tests) and
>   `progress.aiContract.test.js` (16 tests), no database.
> - **Pass — pytest**: `ai-service/tests/test_progress_analyzer.py` (22 tests).
> - **Pass — harness (SQLite)**: the real Express routes, controllers, models
>   and validators booted over an **in-memory SQLite** database with email
>   sending recorded (scratch integration harness `m8.flow.test.js` +
>   `m8.smoke.test.js`, kept outside the repo). Run twice: with the AI service
>   down (fallback insight) and against a live `uvicorn app.main:app` on port
>   8765 (`aiGenerated: true`). Dates were moved directly in the database where
>   a case needs "two days ago". Strong evidence, but **not** MySQL.
> - **Fail — …**: the harness observed behaviour that differs from the
>   expected result. Not fixed in this pass (documentation-only change).
> - **Not run — needs live stack**: UI walk-throughs, real MySQL
>   (`sync({ alter: true })`, concurrent transactions), real SMTP delivery.
>   Do not treat these as passing.
>
> The previous revision of this plan had an empty *Verified* column; cases were
> regrouped into the sections below and `(was X)` maps each to its old id.

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

## A. Functional

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| A1 | Accepting an application opens the internship (was A1) | `APPLICATION_3` is `shortlisted` | `PUT /api/applications/:id/status {status:'accepted'}` as the owning company | `200`. A row appears in `internship_progress` with `status='not_started'`, `startDate` = today, `targetEndDate` from the task duration (4 weeks → +28 days). | Pass — harness (SQLite) |
| A2 | Back-fill for a pre-Module-8 acceptance (was A3) | delete the row for `APPLICATION_1` | `GET /api/progress/applications/{APPLICATION_1}` as `STUDENT_A`, twice | `200`, row recreated; the second call returns the same id (one row). | Pass — harness (SQLite) |
| A3 | Back-fill on the list endpoints (was A4) | delete the row again | `GET /api/progress/student`, `/company`, `/mentor` | `200`, the internship is present in `records` for each. | Pass — harness (SQLite) |
| A4 | Company creates a milestone (was B1) | `PROGRESS_1` open | `POST /{PROGRESS_1}/milestones {title, weight:3, dueDate, estimatedHours, isRequired:true}` as `COMPANY_X` | `201`, `status='pending'`, `orderIndex` appended, history `(null → pending)`, milestone-added email to the student. | Pass — harness (SQLite) |
| A5 | Reorder rewrites indexes (was B8) | 3 milestones | `PUT /{PROGRESS_1}/milestones/reorder {milestoneIds:[c,a,b]}` | `200`, `orderIndex` 0, 1, 2 in that order. | Pass — harness (SQLite) |
| A6 | Student starts a milestone (was C1) | `pending` | `PUT …/milestones/{id}/start` as `STUDENT_A` | `200`, `in_progress`, `startedAt` set; the internship auto-advances `not_started → in_progress` with `startedAt`. | Pass — harness (SQLite) |
| A7 | Student submits (was C2) | `in_progress` | `POST …/milestones/{id}/submit {summary, repositoryUrl}` | `201`, milestone `submitted`, `submissionCount=1`; submission `attemptNumber=1`, `pending_review`. Emails to `COMPANY_X` **and** `MENTOR_A` (not the past mentor). | Pass — harness (SQLite) |
| A8 | Reviewer requests changes (was C6) | `submitted` | `PUT …/review {action:'request_changes', note}` as `MENTOR_A` | `200`, milestone and submission `changes_requested`, `reviewNote` stored, email to the student. | Pass — harness (SQLite) |
| A9 | Resubmission keeps the attempt history (was C8) | `changes_requested` | `POST …/submit` again; `GET …/submissions` | `201`, `attemptNumber=2`; both attempts returned (attempt 1 keeps `changes_requested`). An attempt still `pending_review` when a new one is handed in becomes `superseded`, never deleted (see D12). | Pass — harness (SQLite) |
| A10 | Approval completes the milestone (was C9) | `submitted` | `PUT …/review {action:'approve', score:4}` | `200`, `completed`, `completedAt` set, submission `approved`, `reviewScore=4`; `progressPercent` 0 → 50 (1 of 2 equal-weight milestones). | Pass — harness (SQLite) |
| A11 | Student logs time against a milestone (was E1) | open internship | `POST …/time-logs {hours:3, workDate:today, milestoneId}` | `201`; `milestone.actualHours` and `progress.totalHoursLogged` recomputed; `lastActivityAt` set. | Pass — harness (SQLite) |
| A12 | Check-in with self-reported progress (was D7) | — | `POST …/updates {type:'checkin', body, percentSelfReported:60}` as the student | `201`, stored; emailed to the company and active mentor, **not** to the author. | Pass — harness (SQLite) |
| A13 | Student raises a blocker on a milestone (was D1) | `in_progress` | `PUT …/status {status:'blocked', reason:'No DB access'}` | `200`, `blockedReason` stored, a `blocker` update is created, health `at_risk`, emails to `COMPANY_X` and `MENTOR_A`, **`openBlockerCount = 1`**. | Pass — harness (SQLite). Was **Fail** (`openBlockerCount` was 2: the blocked milestone and the `blocker` update it opens were both counted); fixed in `recalcProgressMetrics` — a blocked milestone now only counts when no open update already stands for it — and re-run green. |
| A14 | Clean completion (was H4) | all required milestones approved | `PUT …/complete {completionNote}` | `200`, `closedWithOutstandingWork=false`, `outstandingMilestones: []` (closed here by the active mentor). Completion emails to student, company and active mentor — asserted on the B12 completion, same code path. | Pass — harness (SQLite) |
| A15 | Pause and resume (was H7) | `in_progress` | `PUT …/status {status:'paused', reason}`, then `{status:'in_progress'}` | both `200` (`pausedAt` set, then cleared). Resuming a `not_started` one → `400` "Only a paused internship can be resumed"; resuming one already `in_progress` → `400` "The internship is already in_progress". | Pass — harness (SQLite) |
| A16 | Report with the AI service down (was G2) | AI stopped | `GET /{PROGRESS_1}/report` | `200` (never 5xx), `aiGenerated:false`, same shape from the local fallback. | Pass — harness (SQLite) |
| A17 | Report with the AI service up (was G1) | AI running | `GET /{PROGRESS_1}/report` | `200`, `aiGenerated:true`; `insight` has `risk_level`, `risk_score`, `projected_completion_percent`, `schedule_variance`, `signals[]`, `recommendations[]`. | Pass — harness (SQLite) + live uvicorn (`POST /progress-insight ok`) |
| A18 | Health: on track (was F1) | 50 % complete, ~half the window used, active yesterday | `GET /{PROGRESS_1}` | `healthStatus='on_track'`. | Pass — harness (SQLite) · Pass — jest |
| A19 | Health: overdue by end date (was F2) | `targetEndDate` two days ago | re-read | `overdue`; supervisors emailed **once**, on the transition. | Pass — harness (SQLite) · Pass — jest |
| A20 | Health: overdue by milestone (was F4) | a required milestone two days past due | re-read | `overdueMilestoneCount ≥ 1`, `overdue`. | Pass — harness (SQLite) · Pass — jest |
| A21 | Health: at risk from schedule lag (was F5) | 10 % complete, ~80 % of the window used | re-read | `at_risk`. | Pass — harness (SQLite) · Pass — jest |
| A22 | Health: at risk from silence (was F7) | `lastActivityAt` 8 days ago, `in_progress`, undated | re-read | `at_risk`. | Pass — harness (SQLite) · Pass — jest |
| A23 | Rework rate (was G4) | 1 approved, 1 sent back | read the report | `rework_rate = 50`. | Pass — harness (SQLite) |
| A24 | On-time rate (was G5) | one late submission of two | read the report | `on_time_submission_rate = 50` (the late one has `wasLate=true`). | Pass — harness (SQLite) |
| A25 | Weekly effort series (was G6) | time logged across three weeks | read the report | `weeklyHours` has one entry per ISO week, each `weekStart` a Monday, oldest first. | Pass — harness (SQLite) |
| A26 | Signals are ordered (was G7) | several risks | read the report | `signals` sorted by `weight` desc (fallback and AI). | Pass — harness (SQLite) + live uvicorn · Pass — pytest |
| A27 | Trouble sorts first (was I1) | one overdue, one at-risk, two on-track | `GET /api/progress/company` | overdue → at_risk → on_track, then `updatedAt` desc. | Pass — harness (SQLite) |
| A28 | Overview is role-scoped (was I7) | — | `GET /api/progress/overview` as company, student, other company, past mentor, lone mentor, admin | counts cover only the caller's scope; admin sees every row. | Pass — harness (SQLite) |
| A29 | Health derivation rules | — | unit | 14 `deriveHealth` cases incl. priority, same-day and inverted windows. | Pass — jest |
| A30 | Milestone state machine table | — | unit | 12 transition cases (forward path, rework loop, no skipping review, reopen, restore, unknown status). | Pass — jest |
| A31 | Weighted completion + overdue semantics | — | unit | 6 weighted-completion and 6 `isOverdue` cases. | Pass — jest |
| A32 | Progress risk engine (AI) | — | unit | 22 cases in `test_progress_analyzer.py`. | Pass — pytest |

## B. Positive

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| B1 | Active mentor can create milestones (was B2) | — | A4 as `MENTOR_A` | `201`, `createdByRole='mentor'`. | Pass — harness (SQLite) |
| B2 | Delete an untouched milestone (was B12) | `pending`, no submissions | `DELETE …/milestones/{id}` | `200`, row gone; history row `(pending → deleted)` keeps the title. | Pass — harness (SQLite) |
| B3 | Reviewer reopens an approval (was C14) | `completed` | `PUT …/status {status:'in_progress'}` as `COMPANY_X` | `200`, `completedAt` cleared, `progressPercent` drops back. | Pass — harness (SQLite) · Pass — jest |
| B4 | Submitting without starting (was C14c) | `pending` | `POST …/submit` as the student | `201`, `submitted`, `startedAt` stamped. | Pass — harness (SQLite) · Pass — jest |
| B5 | Cancelling leaves the percentage alone or raises it (was C15) | 2 milestones, 1 completed (50 %) | cancel the other | `progressPercent` 100. | Pass — harness (SQLite) · Pass — jest |
| B6 | Unblocking clears the update (was D3) | `blocked` | `PUT …/status {status:'in_progress', reason:'resolved'}` | `200`, the blocker update resolved, `openBlockerCount` 0, health back to `on_track`. | Pass — harness (SQLite) |
| B7 | Resolving the update unblocks the milestone (was D4) | `blocked` | `PUT …/updates/{blockerId}/resolve` | `200`, milestone `in_progress`, history `(blocked → in_progress, "Blocker resolved")`. | Pass — harness (SQLite) |
| B8 | Standalone blocker (was D5) | — | `POST …/updates {type:'blocker', body}` as the student | `201`, `isOpen=true`, `openBlockerCount=1`, `at_risk`. | Pass — harness (SQLite) |
| B9 | Time without a milestone (was E2) | — | `POST …/time-logs {hours:2}` | `201`, counted in the internship total only. | Pass — harness (SQLite) |
| B10 | Moving a log re-derives both milestones (was E9) | log on A | `PUT …/time-logs/{id} {milestoneId:B}` | `200`; A → 0 h, B → 3 h. | Pass — harness (SQLite) |
| B11 | Deleting re-derives totals (was E11) | — | `DELETE …/time-logs/{id}` | `200`; milestone and internship hours drop. | Pass — harness (SQLite) |
| B12 | Completion override is recorded (was H2) | a required milestone still open | `PUT …/complete {acknowledgeIncomplete:true, completionNote, performanceRating:4}` | `200`, `completed`, `closedWithOutstandingWork=true`, `actualEndDate` today, `outstandingMilestones` listed, history reason "Closed with outstanding required milestones". | Pass — harness (SQLite) |
| B13 | Optional milestones do not block (was H3) | only an optional one open | `PUT …/complete` | `200`, `closedWithOutstandingWork=false`. | Pass — harness (SQLite) |
| B14 | Health filter (was I2) | — | `GET /api/progress/company?health=overdue` | only overdue records. | Pass — harness (SQLite) |
| B15 | Scope filter (was I3) | — | `GET /api/progress/student?scope=completed` | only completed internships. | Pass — harness (SQLite) |
| B16 | A completed mentorship still lists (was I6) | `MENTOR_B` | `GET /api/progress/mentor` | the internship is listed. | Pass — harness (SQLite) |
| B17 | Who can resolve | open blocker / risk flag | the student resolves their own blocker; `MENTOR_A` resolves a company's risk flag | `200` each. | Pass — harness (SQLite) |
| B18 | Admin moderation | — | admin edits a student's update; admin edits a time entry after closure | `200` each. | Pass — harness (SQLite) |
| B19 | Time-log listing | two days of entries | `GET …/time-logs` | `totalHours` and a daily `series` oldest first. | Pass — harness (SQLite) |
| B20 | List pagination | 4 internships | `GET /api/progress/company?limit=2&page=2` | 2 records, `hasPrevPage:true`, `totalRecords` 4. | Pass — harness (SQLite) |
| B21 | Edit a milestone definition | `pending` | `PUT …/milestones/{id} {title, weight}` as the company | `200`, updated. | Pass — harness (SQLite) |

## C. Negative

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| C1 | Progress refused before acceptance (was A2) | `APPLICATION_2` `submitted` | `GET /api/progress/applications/{APPLICATION_2}` as `COMPANY_X` | `400` "Progress tracking starts once the application has been accepted"; **no row**. | Pass — harness (SQLite) |
| C2 | Milestone validators (was B6) | — | `title:'ab'`; `weight:99` | `400` "Milestone title must be between 3 and 200 characters"; "Weight must be between 1 and 10". | Pass — harness (SQLite) |
| C3 | Due date before the start (was B7) | `startDate` set | `POST` with `dueDate` a day earlier | `400` "A milestone cannot be due before the internship starts". | Pass — harness (SQLite) |
| C4 | Partial reorder (was B9) | 3 milestones | `{milestoneIds:[a]}` | `400` "The reorder list must contain every milestone on this internship exactly once". | Pass — harness (SQLite) |
| C5 | Duplicate reorder (was B10) | — | `{milestoneIds:[a,a,b]}` | `400` "The reorder list contains duplicate milestones". | Pass — harness (SQLite) |
| C6 | Delete blocked once work exists (was B11) | milestone `submitted`, then `changes_requested` with `submissionCount ≥ 1` | `DELETE` | `400` telling the caller to cancel instead (both states). | Pass — harness (SQLite) |
| C7 | Summary is validated (was C3) | — | `POST …/submit {summary:'short'}` | `400` "Tell your reviewer what you delivered (10-5000 characters)". | Pass — harness (SQLite) |
| C8 | Double submit (was C4) | `submitted` | `POST …/submit` again | `400` "This milestone is already awaiting review". | Pass — harness (SQLite) |
| C9 | Submit while blocked (was C5) | `blocked` | `POST …/submit` | `400` "Clear the blocker on this milestone before submitting". | Pass — harness (SQLite) |
| C10 | Only a submitted milestone can be reviewed (was C10) | `in_progress` | `PUT …/review {action:'approve'}` | `400` "Only a submitted milestone can be reviewed — this one is 'in_progress'". | Pass — harness (SQLite) |
| C11 | Illegal transitions are named (was C11) | `pending` | `PUT …/status` to `completed`, `submitted`, `changes_requested` as the company | `400` "Approve the submission instead…", "Use the submit endpoint…", "A milestone cannot go from 'pending' to 'changes_requested'. Allowed from here: …". | Pass — harness (SQLite) · Pass — jest |
| C12 | Cancelled restores only to pending (was C16) | `cancelled` | `PUT …/status {status:'in_progress'}` | `400` naming `pending` as the only target; `pending` → `200`. | Pass — harness (SQLite) · Pass — jest |
| C13 | Blocker reason is mandatory (was D2) | — | `PUT …/status {status:'blocked'}` | `400` "Describe what is blocking you". | Pass — harness (SQLite) |
| C14 | Only a blocker or risk flag can be resolved (was D8) | a check-in | `PUT …/updates/{checkinId}/resolve` | `400` "Only a blocker or a risk flag can be resolved". | Pass — harness (SQLite) |
| C15 | Double resolve (was D9) | resolved blocker | resolve again | `400` "That has already been resolved". | Pass — harness (SQLite) |
| C16 | Per-entry time bounds (was E3) | — | `{hours:0.1}`, `{hours:20}` | `400` "Log between 0.25 and 16 hours per entry". | Pass — harness (SQLite) |
| C17 | Daily cap across entries (was E4) | 14 h already today | `{hours:5, workDate:today}` | `400` "That would put {date} at 19 hours on this internship; the daily cap is 16." | Pass — harness (SQLite) |
| C18 | No future dates (was E5) | — | `workDate` tomorrow | `400` "You cannot log time for a future date". | Pass — harness (SQLite) |
| C19 | Nothing before the start date (was E6) | `startDate` set | `workDate` = start − 1 | `400` "You cannot log time before the internship started". | Pass — harness (SQLite) |
| C20 | Cross-internship milestone on a time log (was E7) | milestone of another internship | `POST …/time-logs {milestoneId:<other>}` | `400` "That milestone does not belong to this internship". | Pass — harness (SQLite) |
| C21 | Editing respects the day cap (was E10) | — | `PUT` an entry to push the day over 16 h | `400`, entry unchanged. | Pass — harness (SQLite) |
| C22 | Completion blocked by required work (was H1) | a required milestone `in_progress` | `PUT …/complete` | `400` "1 required milestone(s) are still open. Resolve them, or resend with acknowledgeIncomplete to close anyway."; status unchanged. | Pass — harness (SQLite) |
| C23 | Completion cannot go through the status endpoint (was H6) | — | `PUT …/status {status:'completed'}` | `400` "Use the complete endpoint to close an internship out". | Pass — harness (SQLite) |
| C24 | Abandon needs a reason (was H8) | — | `PUT …/status {status:'abandoned'}`, then with a reason | `400` "A reason is required to abandon an internship"; with a reason `200`, `actualEndDate` today. | Pass — harness (SQLite) |
| C25 | Closed is final (was H9) | `completed` (and `abandoned`) | `PUT …/status {status:'paused'}` | `400` "A completed internship cannot change status again" (for an abandoned one the message reads "A abandoned internship cannot change status again"). | Pass — harness (SQLite) |
| C26 | Backwards move (was H11) | `in_progress` | `PUT …/status {status:'not_started'}` | `400` "An internship cannot be moved back to not started". | Pass — harness (SQLite) |
| C27 | Request changes without a note — API half (was C7) | `submitted` | `PUT …/review {action:'request_changes'}` with no note | The API accepts it (`200`); the note is enforced by the UI only (see H10). | Pass — harness (SQLite) |
| C28 | Plan header dates | — | `PUT /{PROGRESS_1} {targetEndDate: before startDate}` | `400` "The target end date cannot be before the start date". | Pass — harness (SQLite) |
| C29 | Other validators | — | review `score:9` / `action:'maybe'`; milestone `status:'flying'`; `percentSelfReported:101`; complete `performanceRating:6` | `400` each. | Pass — harness (SQLite) |
| C30 | Second completion | `completed` | `PUT …/complete` again | `403` "You cannot close this internship, or it is already closed". | Pass — harness (SQLite) · Pass — jest |

## D. Edge cases

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| D1 | Duplicate protection under concurrency (was A6) | no row yet | two concurrent `GET /applications/{id}` | exactly one row; `UNIQUE(applicationId)` is the final guard. | Not run — needs live stack (the SQLite harness is a single in-memory connection; the two overlapping `findOrCreate` transactions failed with `SQLITE_ERROR: cannot start a transaction within a transaction`, which is a harness limitation and says nothing about MySQL) |
| D2 | Due today is not yet overdue (was F3) | `targetEndDate` today | re-read | **not** `overdue` (observed `at_risk`, from schedule lag). | Pass — harness (SQLite) · Pass — jest |
| D3 | Small lag is tolerated (was F6) | 40 % complete, ~50 % used | re-read | `on_track`. | Pass — harness (SQLite) · Pass — jest |
| D4 | Paused is not flagged for silence (was F8) | `paused`, idle 30 days | re-read | `on_track`. | Pass — harness (SQLite) · Pass — jest |
| D5 | Closed carries no risk — API (was F9) | `completed` with an overdue milestone | re-read | `healthStatus='on_track'` (UI half: H11). | Pass — harness (SQLite) · Pass — jest |
| D6 | No repeat alerts (was F10) | already `overdue` | re-read five times | company and active mentor emailed **once** each. | Pass — harness (SQLite) |
| D7 | Indicators are backend-computed (was G3) | same fixture | compare `indicators` with the AI up and down | identical (10 keys, same values in both runs). | Pass — harness (SQLite) + live uvicorn |
| D8 | Empty plan (was G8) | no milestones | read the report | a `no_plan` signal. With the AI up the recommendations include "Break the task into 3-6 weighted milestones…"; with the AI down the fallback's recommendation is the generic "Review the open signals with the student at the next check-in." | Pass — harness (SQLite) + live uvicorn · Pass — pytest |
| D9 | Cross-internship milestone id (was I12) | milestone from another internship | `PUT /{PROGRESS_1}/milestones/{other}/start` | `404` "Milestone not found". | Pass — harness (SQLite) |
| D10 | Health counts exclude closed work (was I8) | one completed internship | `GET /api/progress/overview` | in `statusCounts`, not in `healthCounts`. | Pass — harness (SQLite) |
| D11 | An optional milestone past due also flags overdue | optional milestone two days late | re-read | `overdue` — the overdue rule counts every non-cancelled milestone, not only required ones (only *completion* distinguishes required). | Pass — harness (SQLite) |
| D12 | Superseded attempt | milestone `submitted` | student blocks it, unblocks it, submits again | attempt 3 `pending_review`, attempt 2 `superseded`, attempt 1 keeps `changes_requested`. Note: a student can take a submitted milestone out of review this way. | Pass — harness (SQLite) |
| D13 | Paused internship refuses student milestone moves | `paused` | `PUT …/status {status:'pending'}` as the student | `403`. | Pass — harness (SQLite) |

## E. Integration

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| E1 | Module 7 assignment status drives mentor access | assignment pending → active → completed / cancelled | read and add milestones as the mentor at each stage | pending/declined `403`; active read + supervise, `progress.mentorId` synced; completed read-only; cancelled `403` and `mentorId` falls back. | Pass — harness (SQLite) (`m7.flow.test.js`) |
| E2 | Module 9 draft on completion | — | `PUT …/complete` | completion `200` unchanged; a `draft` `internship_evaluations` row appears in the background. | Pass — harness (SQLite) |
| E3 | Notification fan-out | flows above | inspect recorded mail | milestone added → student; submitted → company + active mentor; reviewed → student; blocker → company + active mentor; check-in → everyone but the author; overdue → company + active mentor once; completed → student, company, active mentor (student copy without the rating). | Pass — harness (SQLite) (recorded, not delivered) |
| E4 | Real SMTP delivery | SMTP configured | as E3 | emails arrive and render. | Not run — needs live stack |
| E5 | Tables on MySQL | `DB_SYNC=alter` | boot the backend | the six Module 8 tables exist; a second boot adds no duplicate indexes. | Not run — needs live stack |
| E6 | Backend ↔ AI `/progress-insight` contract | — | unit; live call via the report | DTO keys and types match the Pydantic schema; live call `200`. | Pass — jest (16 contract tests) · Pass — harness (SQLite) + live uvicorn |

## F. Permission / security

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| F1 | Probing an id cannot create rows (was A5) | — | `GET /applications/{id}` of someone else's accepted application as `STUDENT_B` / `COMPANY_Y` | `403` "Not authorized for this application"; no row written. | Pass — harness (SQLite) |
| F2 | A past mentor cannot author (was B3) | — | A4 as `MENTOR_B` | `403` (read access does not imply supervise). | Pass — harness (SQLite) · Pass — jest |
| F3 | An unrelated mentor cannot read (was B4) | — | `GET /{PROGRESS_1}` as `MENTOR_C` | `403` "Not authorized to view this internship". | Pass — harness (SQLite) |
| F4 | The student cannot author milestones (was B5) | — | A4 as `STUDENT_A` | `403`. | Pass — harness (SQLite) |
| F5 | Plan frozen after closure (was B13) | `completed` | `POST …/milestones`, `PUT /{PROGRESS_1}` as `COMPANY_X` | `403`. | Pass — harness (SQLite) · Pass — jest |
| F6 | Student cannot self-approve (was C12) | — | `PUT …/status {status:'completed'}` as `STUDENT_A` | `403` (never `200`), `progressPercent` unchanged. | Pass — harness (SQLite) |
| F7 | Student limited to block/unblock (was C13) | — | `PUT …/status {status:'cancelled'}` as `STUDENT_A` | `403` "As the student you can only move a milestone to: blocked, in_progress, pending". | Pass — harness (SQLite) |
| F8 | Student cannot reopen their approval (was C14a) | `completed` | `PUT …/status {status:'in_progress'}` as `STUDENT_A` | `403` "Only the company or your mentor can reopen an approved milestone". | Pass — harness (SQLite) |
| F9 | …nor via the start route (was C14b) | `completed` | `PUT …/start` as `STUDENT_A` | `400` naming `pending` / `changes_requested`. | Pass — harness (SQLite) · Pass — jest |
| F10 | Only a supervisor raises a risk flag (was D6) | — | `POST …/updates {type:'risk_flag'}` as the student, then as `COMPANY_X` | `403` "Only a supervisor can raise a risk flag — post a blocker instead"; company `201`. | Pass — harness (SQLite) |
| F11 | Only the author edits or deletes an update (was D10) | update by `STUDENT_A` | `PUT`/`DELETE` as `COMPANY_X`; `PUT` as admin | `403` "You can only edit your own updates" / "…delete your own updates"; admin `200`. | Pass — harness (SQLite) |
| F12 | Outsider cannot read the timeline (was D11) | — | `GET …/updates` as `STUDENT_B` | `403`. | Pass — harness (SQLite) |
| F13 | Only the owner edits time (was E8) | — | `PUT …/time-logs/{id}` as `COMPANY_X` | `403` "You can only edit your own time entries". | Pass — harness (SQLite) |
| F14 | Time frozen after closure (was E12) | `completed` | `POST`/`PUT`/`DELETE` a time log as the student | `POST` `403`; `PUT`/`DELETE` `400` "Time cannot be edited/deleted once the internship is closed"; admin `PUT` `200`. | Pass — harness (SQLite) |
| F15 | Paused internships accept no work (was E13) | `paused` | `POST …/time-logs` as the student | `403` "Only the student on an open, unpaused internship can log time". | Pass — harness (SQLite) · Pass — jest |
| F16 | `performanceRating` hidden from the student (was H5) | rating 4 set | `GET /{id}`, `GET /applications/{id}`, `GET /student`, `GET /{id}/report` as the student; `GET /{id}` as company and active mentor | absent on every student path; present (4) for company and mentor. The student's completion email omits it; the company's shows "4/5". | Pass — harness (SQLite) |
| F17 | Only the owning company pauses (was H10) | — | `PUT …/status {status:'paused'}` as `MENTOR_A`, as the student | `403` "Only the hiring company can change this status" (admin may). | Pass — harness (SQLite) · Pass — jest |
| F18 | Company sees only its own (was I4) | — | `GET /api/progress/company` and `GET /{id}` as `COMPANY_Y` | empty list; `403`. | Pass — harness (SQLite) |
| F19 | Mentor with no assignments (was I5) | `MENTOR_C` | `GET /api/progress/mentor` | `200`, empty list. | Pass — harness (SQLite) |
| F20 | Wrong role on a role route (was I9) | — | `/company` as a student; `/student` as a company; `/mentor` as a student | `403`. | Pass — harness (SQLite) |
| F21 | Unauthenticated (was I10) | no token | `GET /{PROGRESS_1}` | `401` "Not authorized to access this route". | Pass — harness (SQLite) |
| F22 | Non-existent record (was I11) | — | `GET /api/progress/999999` | `404` "Progress record not found". | Pass — harness (SQLite) |
| F23 | Supervisors cannot act as the student | — | start, submit, log time as `COMPANY_X` | `403` each. | Pass — harness (SQLite) |
| F24 | Past mentor is read-only | `MENTOR_B` | read report and timeline; post an update; review; complete | reads `200`; writes `403`. | Pass — harness (SQLite) |
| F25 | `permissions` object per role | `in_progress` | `GET /{PROGRESS_1}` as company, student, active mentor, past mentor | company all but `canWork`; student only `canWork`; active mentor all but `canWork`/`canChangeStatus`; past mentor none. | Pass — harness (SQLite) |

## G. Regression

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| G1 | Completion payload unchanged by the Module 9 hook | complete an internship | `200`, `message:'Internship marked complete'`, all Module 8 fields + `outstandingMilestones`; no `evaluation`/`payments`/`feedback` keys; a draft evaluation is created alongside. | Pass — harness (SQLite) |
| G2 | Response shapes unchanged after Modules 9–12 | `GET /{id}`, `/report`, `/company`, `/overview`, `/milestones` | same keys as Module 8 (report and overview key sets compared exactly; `permissions` has exactly five flags). | Pass — harness (SQLite) |
| G3 | Module 8 smoke | harness `m8.smoke.test.js` | passes. | Pass — harness (SQLite) |
| G4 | Backend unit suite | `cd backend && npx jest` | 312 passed (69 of them Module 8). | Pass — jest |
| G5 | AI suite | `cd ai-service && python -m pytest -q` | 144 passed (22 of them the progress engine). | Pass — pytest |
| G6 | Frontend types | `cd frontend && npx tsc --noEmit` | clean. | Pass — tsc |

## H. UI walkthrough

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| H1 | Student journey (was J1) | log in as `STUDENT_A` → **Internships** → open the internship | ring shows the weighted percentage; tabs Milestones, Time log, Timeline, Report (plus later-module tabs); Start → Submit on the right milestones only. | Not run — needs live stack |
| H2 | Student cannot see supervisor controls (was J2) | same page | no "Add milestone", "Edit plan", "Mark complete" or Review buttons. | Not run — needs live stack |
| H3 | Company review flow (was J3) | `COMPANY_X` → **Progress** → Milestones → **Review** | modal with submission, links, earlier attempts, approve / request changes and a 1–5 score. | Not run — needs live stack |
| H4 | Mentor sees the same workspace (was J4) | `MENTOR_A` → **Progress** | identical workspace with supervisor affordances. | Not run — needs live stack |
| H5 | Report tab with the AI down (was J5) | stop the AI service, open Report | amber "AI service is unreachable" notice; indicators, signals and the weekly chart still render. | Not run — needs live stack |
| H6 | Dashboard cards (was J6) | `/student/dashboard`, `/company/dashboard`, `/mentor/students` | internships card with up to three rows, at-risk flagged; hidden when empty. | Not run — needs live stack |
| H7 | Entry from an application (was J7) | student `/student/applications/{id}`; company candidate page → **Progress** | progress card links into the workspace; non-accepted explains tracking starts on acceptance. | Not run — needs live stack |
| H8 | Empty state (was J8) | a new internship with no milestones | "No milestones yet", copy differs for supervisor and student. | Not run — needs live stack |
| H9 | No console errors (was J9) | walk every Module 8 page | clean console. | Not run — needs live stack |
| H10 | Request-changes note required in the UI (was C7, UI half) | open Review, choose request changes, leave the note empty | blocked with "Tell the student what needs to change". | Not run — needs live stack |
| H11 | Health badge hidden on a closed internship (was F9, UI half) | open a completed internship | no health badge. | Not run — needs live stack |

---

## How to run

Backend at `http://localhost:5000/api`, AI service at `http://localhost:8000`,
`DB_SYNC=alter` in `backend/.env` for the first boot so the six tables are
created.

```bash
# 0. Seed a populated dataset (after seedDemo.js and seed:mentors)
cd backend && npm run seed:progress

# A2. Open the internship for an accepted application
curl -s "http://localhost:5000/api/progress/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# A4. Company adds a milestone
curl -s -X POST "http://localhost:5000/api/progress/$PROGRESS_ID/milestones" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Build the dashboard data layer","weight":3,"estimatedHours":20,"dueDate":"2026-10-01"}'

# A6 / A7. Student starts and submits
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/start" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
curl -s -X POST "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"summary":"Charts wired to the API with loading and error states.","repositoryUrl":"https://github.com/example/work"}'

# A10. Mentor reviews
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/review" \
  -H "Authorization: Bearer $MENTOR_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"approve","note":"Clean work.","score":4}'

# A11. Student logs time
curl -s -X POST "http://localhost:5000/api/progress/$PROGRESS_ID/time-logs" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"hours":3,"workDate":"2026-09-10","milestoneId":"'"$MS_ID"'","description":"Chart wiring"}'

# A13. Block a milestone, then read openBlockerCount (expect 1)
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/milestones/$MS_ID/status" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"blocked","reason":"No DB access"}'
curl -s "http://localhost:5000/api/progress/$PROGRESS_ID" -H "Authorization: Bearer $COMPANY_TOKEN" | jq '.data.openBlockerCount'

# A16 / A17. Report, then repeat with the AI service stopped
curl -s "http://localhost:5000/api/progress/$PROGRESS_ID/report" \
  -H "Authorization: Bearer $COMPANY_TOKEN" | jq '.data.aiGenerated, .data.insight.risk_level'

# B12. Close with outstanding work
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/complete" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"acknowledgeIncomplete":true,"completionNote":"Closing early","performanceRating":4}'
```

## Automated coverage (observed)

```bash
cd backend    && npx jest            # 312 passed, 9 suites — 69 in progress.rules / progress.aiContract
cd ai-service && python -m pytest -q # 144 passed — 22 in test_progress_analyzer.py
cd frontend   && npx tsc --noEmit    # clean
```

Integration harness (scratch, in-memory SQLite, not in the repo):
`m8.flow.test.js` — **18 tests: 17 passed, 1 skipped** after the A13 fix
(before the fix: 16 passed, 1 failed — identical with the AI service down and
against a live `uvicorn` on port 8765). A13 (`openBlockerCount` double-counted a
blocked milestone) is fixed; the skipped test is D1 (concurrency cannot be reproduced on a single SQLite
connection). `m8.smoke.test.js` — 1 passed. Everything marked *Not run — needs
live stack* above still needs a MySQL + SMTP + browser run.
