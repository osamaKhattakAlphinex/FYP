# Module 8 — Progress Tracking

> **Requirement (FYP documentation §1.2.0.8 / §2.2.0.5).** *"The system shall
> continuously track the progress of students as they work through their
> assigned tasks. It shall record key indicators such as milestones reached,
> submission status, time spent, and overall performance throughout the
> internship. Both mentors and organizations shall be able to view progress
> reports to understand how a student is performing. The system shall update
> this information regularly so that any delays or difficulties can be
> identified early."*

This document explains how that requirement is realised: the data model, the
lifecycle rules, who is allowed to do what, how the health signal is derived,
and how the module degrades when the AI service is unavailable.

---

## 1. Where the module sits

The platform already models the *hiring* pipeline (Module 4, `Application`) and
*who guides the student* (Module 7, `MentorAssignment`). Neither of those
models the work itself. Module 8 adds that third axis:

| Concern | Entity | Status field means |
|---|---|---|
| Did the student get the job? | `Application` | `submitted → … → accepted / rejected` |
| Who is guiding them? | `MentorAssignment` | `pending → active → completed` |
| **How is the work going?** | **`InternshipProgress`** | **`not_started → in_progress → completed`** |

Keeping these separate is what lets an internship be *at risk* while the
application is *accepted* and the mentorship is *active* — three independent
facts that the UI needs to show at once.

**The internship is anchored on the application**, one-to-one, because the
application is the only row that already ties together the exact (student,
task, company) triple. `applicationId` carries a `UNIQUE` constraint.

---

## 2. Data model

Six new tables, all under `backend/src/models/`:

```
applications
     │ 1:1 (UNIQUE applicationId)
     ▼
internship_progress ─────────────┬──────────────┬─────────────────────┐
     │ 1:M                       │ 1:M          │ 1:M                 │ 1:M
     ▼                           ▼              ▼                     ▼
progress_milestones     progress_time_logs  progress_updates  progress_status_history
     │ 1:M                       ▲              (checkins,        (audit trail for
     ▼                           │               blockers,         both the internship
milestone_submissions ───────────┘               risk flags)       and its milestones)
   (one row per attempt)   (a log may point at a milestone)
```

### 2.1 `internship_progress`

The internship itself. Denormalises `studentId`, `taskId`, `companyId` for
dashboard filtering (the same trick `MentorAssignment` uses), plus a cached
`mentorId` for display.

| Column group | Columns | Notes |
|---|---|---|
| Identity | `applicationId` (unique), `studentId`, `taskId`, `companyId`, `mentorId` | `mentorId` is a **display cache only** — authorisation always re-reads `mentor_assignments` |
| Lifecycle | `status`, `statusReason`, `startedAt`, `completedAt`, `pausedAt`, `abandonedAt` | |
| Schedule | `startDate`, `targetEndDate`, `actualEndDate`, `expectedHoursPerWeek` | `DATEONLY` |
| Derived cache | `progressPercent`, `milestoneCount`, `completedMilestoneCount`, `overdueMilestoneCount`, `openBlockerCount`, `totalHoursLogged`, `healthStatus` | **Never incremented** — see §4 |
| Closure | `completionNote`, `performanceRating`, `closedWithOutstandingWork` | |

`status ∈ { not_started, in_progress, paused, completed, abandoned }`.
`healthStatus ∈ { on_track, at_risk, overdue }` and is always derived.

### 2.2 `progress_milestones`

The unit progress is measured in. `weight` (1–10) exists so that *"ship the
app"* is not worth the same as *"set up the repo"*. `isRequired` lets optional
work be left undone without blocking completion.

`status ∈ { pending, in_progress, submitted, changes_requested, completed, blocked, cancelled }`

### 2.3 `milestone_submissions`

One row **per attempt**, not per milestone. When a student resubmits, the
previous row is marked `superseded` rather than overwritten, so the review
history survives — including how many times work came back, which is itself a
performance indicator. `wasLate` is snapshotted at submission time so the
on-time rate cannot be rewritten by later date changes.

### 2.4 `progress_time_logs`

Answers *"time spent"* from the requirement. A log may attach to a milestone or
to the internship generally. Caps: 0.25–16h per entry, 16h per day per
internship, no future dates, nothing before the internship start date.

### 2.5 `progress_updates`

Answers *"regular updates"* and *"difficulties identified early"*. Four types:

| Type | Raised by | Needs resolving |
|---|---|---|
| `checkin` | student | no |
| `note` | anyone on the internship | no |
| `blocker` | student | **yes** |
| `risk_flag` | supervisor | **yes** |

An unresolved `blocker` or `risk_flag` holds the internship at `at_risk` — a
deliberate design choice, so raising a blocker is *visible* rather than polite.

### 2.6 `progress_status_history`

A single audit table for both levels: rows with a null `milestoneId` describe
the internship, rows with one describe a milestone. `milestoneTitle` is
denormalised so the timeline still reads correctly after a milestone is
deleted.

---

## 3. Lifecycle rules

### 3.1 Creation

The progress row is created **at the moment an application is accepted**, in
`applicationController.updateApplicationStatus`. The default `targetEndDate` is
derived from the task's advertised duration (`durationValue` × `durationUnit`)
counted from the acceptance date.

Because Modules 4–7 shipped before this one, **every read path also
back-fills**: `getProgressForApplication`, `getStudentProgress`,
`getCompanyProgress` and `getMentorProgress` each top up their own scope via
`findOrCreate`. There is no migration script to remember to run, and the
`UNIQUE(applicationId)` index is the final guard against a race creating two
rows.

### 3.2 Milestone state machine

Defined once, in `ProgressMilestone.TRANSITIONS`. Anything not listed is
rejected with a `400` that names the legal moves, so the audit trail can never
contain an impossible jump.

```
              ┌──────────────── submit without starting ───────────────┐
              │                                                        ▼
pending ──────────► in_progress ──────────► submitted ──────────► completed
   ▲                    ▲   │                   │  │                  │
   │                    │   └── blocked ◄───────┘  │                  │
   │                    │         │                ▼                  │
   │                    └─────────┴──── changes_requested ────────────┘
   │                                          (resubmit)         (reviewer
   └──────────────────── cancelled ◄──────────────────────────    may reopen)
```

Notable rules:

- **`pending → completed` is impossible.** Work must be submitted and reviewed;
  there is no way to mark a milestone done without a submission on record.
- **`pending → submitted` is allowed**, because handing work in implies starting
  it. A student who never pressed *Start* must not be blocked from submitting —
  the UI offers Submit on a pending milestone, and the state machine has to
  agree with it. (`startedAt` is stamped on the way through.) Two unit tests
  assert that `canBeSubmittedByStudent` / `canBeStartedByStudent` and
  `TRANSITIONS` cannot drift apart again.
- **A reviewer may reopen `completed`** — approving too early is recoverable.
  The transition map permits `completed → in_progress`, but the controller
  restricts it to supervisors on **both** the `/start` and `/status` routes, so
  a student cannot reopen their own approval and move their own percentage.
- **`cancelled` may only return to `pending`**, so a cancelled milestone cannot
  re-enter the flow mid-way.

### 3.3 Internship closure

`PUT /:id/complete` refuses while any **required** milestone is still
outstanding, and returns the list of blockers. A supervisor may override with
`acknowledgeIncomplete: true`, which sets `closedWithOutstandingWork` — so
closing early is possible but never silent. `paused` and `abandoned` go through
a separate `PUT /:id/status`; `abandoned` requires a reason.

---

## 4. Derived numbers are always recomputed

Every cached number on `internship_progress` and `progress_milestones` is
derived by `recalcProgressMetrics` / `recalcMilestoneHours` in
`models/index.js`. **Nothing is ever incremented in place.** This follows the
precedent set by `recalcMentorActiveCount` in Module 7, and it means a crashed
request, a concurrent write, or a manual database edit cannot leave the totals
drifting from the rows.

### 4.1 Weighted completion

```
counted  = milestones where status ≠ 'cancelled'
total    = Σ weight over counted
earned   = Σ weight over counted where status = 'completed'
percent  = total ? round(earned / total × 100) : 0
```

Cancelled milestones drop out of the **denominator**, not just the numerator —
cancelling remaining work must not make a student look further behind than they
are.

`submitted` earns **nothing** until it is approved, so 100% genuinely means
every milestone was reviewed and accepted.

### 4.2 Health

`InternshipProgress.deriveHealth` is a pure static so the same rule runs in the
recompute, in the report, and in the unit tests. In priority order:

| Result | Condition |
|---|---|
| `on_track` | the internship is `completed` or `abandoned` (closed work carries no forward risk) |
| `overdue` | the target end date has passed, **or** any milestone is past its due date |
| `at_risk` | a blocker or risk flag is open |
| `at_risk` | completion trails the elapsed schedule by more than **15 points** |
| `at_risk` | `in_progress` with no activity for more than **7 days** |
| `on_track` | none of the above |

**Date semantics.** A `DATEONLY` deadline means *"by the end of that day"*, so
overdue comparisons use the following midnight. Without this an internship due
today would read as overdue from 00:01. `daysRemaining` uses start-of-day
instead, so "due today" reads as `0` rather than `1`.

### 4.3 Alerting without spam

`recalcAndAlert` in the controller compares health **before and after** the
recompute and only emails the supervisors on a *transition into* `at_risk` or
`overdue`. Without that guard, every page load would mail everyone — the
recompute runs on read as well as on write, because time passing is itself a
state change.

---

## 5. Authorisation

Rules live on the model (`InternshipProgress.canBeWorkedOnBy`,
`canBeSupervisedBy`, `canPlanBeEditedBy`, …) and are exercised by the
controller through a resolved *actor*:

```js
{ role, userId, studentId?, companyId?, mentorId?, isAssignedMentor?, isActiveMentor? }
```

The mentor is the awkward case: their access is not a property of their account
but of whether they hold an assignment **on this application**. `resolveActor`
queries `mentor_assignments` for that, giving two distinct flags:

- `isAssignedMentor` (assignment `active` **or** `completed`) → **read** access,
  so a mentor can still refer back to work they guided.
- `isActiveMentor` (`active` only) → **supervise** access.

| Action | Student | Company (owner) | Active mentor | Past mentor | Admin |
|---|---|---|---|---|---|
| View the internship | ✅ | ✅ | ✅ | ✅ | ✅ |
| Start / submit a milestone | ✅ | — | — | — | — |
| Log, edit, delete time | ✅ (own) | — | — | — | ✅ |
| Raise / clear a blocker | ✅ | — | — | — | — |
| Create / edit / delete / reorder milestones | — | ✅ | ✅ | — | ✅ |
| Review a submission | — | ✅ | ✅ | — | ✅ |
| Raise a risk flag | — | ✅ | ✅ | — | ✅ |
| Pause / resume / abandon | — | ✅ | — | — | ✅ |
| Mark complete | — | ✅ | ✅ | — | ✅ |
| See `performanceRating` | ❌ | ✅ | ✅ | ✅ | ✅ |

Two deliberate restrictions:

1. **Students never author milestones.** The requirement says students *"update
   task milestones"* — they do, by driving them through the state machine
   (start → submit → resubmit) and by raising blockers. Authoring the plan is a
   supervisor act, which is what makes the completion percentage meaningful.
2. **`performanceRating` is stripped from every student-facing response** (and
   from the student's completion email). Releasing a supervisor's assessment to
   the student is Module 10's job, not this one.

Plan edits stop once the internship is closed, so a finished record stays an
accurate history.

---

## 6. AI integration

`POST /progress-insight` on the FastAPI service
(`ai-service/app/services/progress_analyzer.py`) turns a progress snapshot into
the *"performance indicators"* and early delay warnings the requirement calls
for.

It is a **deterministic rule engine**, exactly like the Module 6/7 matchers —
same input always gives the same output, and every number can be walked through
in a defence. It emits:

- `risk_level` (`low` / `medium` / `high`) and a `risk_score` 0–100
- `projected_completion_percent` — the current pace extrapolated to the deadline
- `schedule_variance` — completion minus the elapsed-schedule percentage
- `signals[]` — the weighted reasons behind the score
- `recommendations[]` — what to actually do about them
- `indicators{}` — the raw metrics

Eleven signals are scored, capped at 100 in total: `no_plan`, `not_started`,
`schedule_lag`, `overdue_milestones`, `deadline_crunch`, `open_blockers`,
`inactivity`, `effort_shortfall`, `rework`, `late_submissions`,
`estimate_overrun`.

### Graceful degradation

`GET /api/progress/:id/report` catches `AIServiceUnavailableError` and falls
back to `fallbackInsight`, a local rule set that emits **the same response
shape**. The frontend renders it identically and only the `aiGenerated: false`
flag changes, which surfaces as a one-line notice. The report endpoint never
returns 5xx because the AI service is down — and the `indicators` block is
computed on the backend either way, so the numbers are unaffected.

---

## 7. API surface

All routes are under `/api/progress` and behind `protect`. Role gating on the
route is coarse (it only rules out roles that can never reach an endpoint); the
real check is in the controller, because for a mentor it depends on the
specific internship.

**Entry point and dashboards**

| Method | Path | Access |
|---|---|---|
| `GET` | `/applications/:applicationId` | participants — creates/back-fills the record |
| `GET` | `/student` | student |
| `GET` | `/company` | company |
| `GET` | `/mentor` | mentor |
| `GET` | `/overview` | any role — aggregate counters for their own scope |

**One internship**

| Method | Path | Access |
|---|---|---|
| `GET` | `/:id` | participants (includes a `permissions` block) |
| `GET` | `/:id/report` | participants |
| `PUT` | `/:id` | supervisors — dates, objective, weekly hours |
| `PUT` | `/:id/status` | owning company, admin |
| `PUT` | `/:id/complete` | supervisors |

**Milestones**

| Method | Path | Access |
|---|---|---|
| `GET` | `/:id/milestones` | participants |
| `POST` | `/:id/milestones` | supervisors |
| `PUT` | `/:id/milestones/reorder` | supervisors |
| `PUT` `DELETE` | `/:id/milestones/:milestoneId` | supervisors |
| `PUT` | `/:id/milestones/:milestoneId/start` | student |
| `POST` | `/:id/milestones/:milestoneId/submit` | student |
| `PUT` | `/:id/milestones/:milestoneId/review` | supervisors |
| `PUT` | `/:id/milestones/:milestoneId/status` | student (block/unblock) or supervisors |
| `GET` | `/:id/milestones/:milestoneId/submissions` | participants |
| `GET` | `/:id/submissions` | participants — awaiting review |

**Time logs and updates**

| Method | Path | Access |
|---|---|---|
| `GET` | `/:id/time-logs` | participants |
| `POST` | `/:id/time-logs` | student |
| `PUT` `DELETE` | `/:id/time-logs/:logId` | the student who logged it, admin |
| `GET` | `/:id/updates` | participants |
| `POST` | `/:id/updates` | student and supervisors |
| `PUT` | `/:id/updates/:updateId` | author |
| `PUT` | `/:id/updates/:updateId/resolve` | author, supervisors, admin |
| `DELETE` | `/:id/updates/:updateId` | author, admin |

Route ordering matters in two places: the literal `/overview`, `/student`,
`/company`, `/mentor` are declared before `/:id`, and `/:id/milestones/reorder`
before `/:id/milestones/:milestoneId`.

---

## 8. Notifications

`backend/src/utils/progressNotifications.js`, following the Module 7 pattern:
best-effort, never throws, never blocks the response, so a dead SMTP host
cannot 500 a request.

| Event | Goes to |
|---|---|
| Milestone added | student |
| Milestone submitted | company **and** active mentor |
| Approved / changes requested | student |
| Blocker raised | company **and** active mentor |
| Blocker resolved | student |
| Health drops to at-risk / overdue | company **and** active mentor |
| Check-in, note, risk flag | everyone except the author |
| Paused / resumed / abandoned | student, active mentor |
| Completed | student, company, active mentor |

The recipient mentor is always resolved from `mentor_assignments`, not from the
cached `mentorId`, so a mentorship that changed hands still notifies correctly.

---

## 9. Frontend

```
src/types/progress.types.ts          shapes mirroring the backend toJSON()
src/services/progressService.ts      one method per endpoint + presentation helpers
src/lib/apiError.ts                  pulls the specific message out of an error response

src/components/progress/
  ProgressRing.tsx                   circular completion indicator
  ProgressBadges.tsx                 status / health / milestone / risk chips
  ProgressCard.tsx                   list row
  ProgressListView.tsx               the list page, shared by all three roles
  ProgressWorkspace.tsx              the detail page, shared by all three roles
  MilestoneList.tsx                  the plan, with per-role actions
  MilestoneFormModal.tsx             create / edit a milestone
  SubmitMilestoneModal.tsx           student submission
  ReviewMilestoneModal.tsx           approve / request changes, with attempt history
  BlockMilestoneModal.tsx            raise / clear a blocker
  TimeLogPanel.tsx                   time entry + daily bar chart
  ProgressUpdatesPanel.tsx           the check-in / blocker timeline
  ProgressReportPanel.tsx            AI risk assessment + indicators + weekly effort
  EditPlanModal.tsx                  dates, objective, weekly hours
  CompleteInternshipModal.tsx        closure, with the outstanding-work warning
  ActiveInternshipsCard.tsx          dashboard card
  InternshipProgressLink.tsx         bridge from an application to its internship
```

**One workspace, three roles.** `ProgressListView` and `ProgressWorkspace` are
shared; the six route files are thin wrappers that pass a `perspective` and a
back link. What each role can *do* comes from `progress.permissions`, which the
API computes — the components never re-derive authorisation, they only render
the affordances the server says exist. A stale client therefore shows the wrong
button rather than being able to act.

**Routes**

| Role | List | Detail |
|---|---|---|
| Student | `/student/internships` | `/student/internships/[progressId]` |
| Company | `/company/progress` | `/company/progress/[progressId]` |
| Mentor | `/mentor/progress` | `/mentor/progress/[progressId]` |

**Entry points.** Nav item for all three roles; a dashboard card on the student
and company dashboards and on `/mentor/students`; a Progress tab on the company
candidate page; and a progress card on the student application detail and the
mentor assignment detail.

---

## 10. Seeding and testing

```bash
# backend — after seedDemo.js and seed:mentors
npm run seed:progress
```

Builds four internships with deliberately different stories — on-track, at-risk
(open blocker plus a stale check-in), overdue (a milestone past its date with
barely any logged time), and completed — so every state in the module is
visible immediately without clicking through the whole lifecycle.

```bash
cd backend    && npm test    # 69 tests, no database required
cd ai-service && pytest -q   # 33 tests, 22 of them the progress engine
```

The backend tests cover health derivation, the milestone state machine, overdue
date semantics, the weighted-completion formula, the access predicates, the
`toJSON` contract, and the `mapProgressToDto` → `ProgressSnapshot` field
contract with the AI service. That last one matters because if the two sides
drift, the report silently falls back to the local rule set for *every*
internship and nobody notices — the fallback returns the same shape by design.

Everything that needs a live database is covered by the manual plan in
[`docs/qa/module-8-progress-tracking.md`](../qa/module-8-progress-tracking.md).
