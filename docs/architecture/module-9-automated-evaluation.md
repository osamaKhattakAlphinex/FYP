# Module 9 — Automated Evaluation

> **Requirement (FYP documentation §1.2.0.9 / §2.2.0.11).** *"The system shall
> automatically evaluate student submissions against predefined criteria once a
> task is completed. It shall generate scores and structured feedback without
> requiring fully manual assessment, which improves consistency and saves time
> for employers and mentors. The evaluation results shall be recorded and linked
> to the student's performance history and certificates. Where appropriate,
> reviewers shall still be able to adjust or confirm the automated outcome to
> ensure fairness."*
>
> §1.2.0.9 adds: *"Mentors or employers can review submissions, assign ratings,
> and record evaluation outcomes within the system."* The ethical NFR
> (§2.3.2.5) asks that automated decisions give clear, understandable reasons.

This document explains how that requirement is realised: what is evaluated
and against what, how each score is computed, who may adjust and release it,
and how the module degrades when the AI service is unavailable.

---

## 1. Where the module sits

Module 8 already records the *evidence* of an internship — weighted milestones,
per-submission review scores (1–5), on-time flags, rework, hours, check-ins,
blockers and the supervisor's closing rating. Module 9 turns that evidence
into a **rubric-based evaluation**:

| Concern | Entity | Status field means |
|---|---|---|
| Did the student get the job? | `Application` | `submitted → … → accepted` |
| Who is guiding them? | `MentorAssignment` | `pending → active → completed` |
| How is the work going? | `InternshipProgress` | `not_started → in_progress → completed` |
| **How well was it done?** | **`InternshipEvaluation`** | **`draft → finalized`** (admin may reopen) |

Every criterion gets an automated 0–100 score with a written rationale and the
evidence lines behind it. A supervisor may adjust any score (with a note),
then finalizes, which releases the result to the student and issues a public
verification code. The requirement's "predefined criteria" are a per-task
**rubric** the company controls.

---

## 2. Data model

Three new tables, under `backend/src/models/`:

```
tasks ──1:M──► task_evaluation_criteria        (the rubric the company defines)

internship_progress ──1:1 (UNIQUE progressId)──► internship_evaluations
                                                        │ 1:M
                                                        ▼
                                              evaluation_criterion_scores
                                          (rubric snapshot + per-criterion scores)
```

### 2.1 `task_evaluation_criteria` — `TaskEvaluationCriterion`

| Column | Notes |
|---|---|
| `taskId` | FK `tasks`, cascade |
| `name` | 2–100 chars, unique per task (case-insensitive, enforced by `validateRubric`) |
| `description` | optional, ≤ 500 |
| `metric` | `quality · timeliness · completion · communication · effort · reliability` — decides which rule scores the criterion |
| `weight` | 1–10 |
| `orderIndex` | display order |

A task with no rows uses `TaskEvaluationCriterion.DEFAULT_CRITERIA`:
Quality of work (quality, ×3), Timeliness (timeliness, ×2), Scope completion
(completion, ×3), Communication (communication, ×1), Effort & commitment
(effort, ×1). A rubric holds 1–8 criteria.

### 2.2 `internship_evaluations` — `InternshipEvaluation`

| Column group | Columns | Notes |
|---|---|---|
| Identity | `progressId` (unique), `applicationId`, `studentId`, `taskId`, `companyId` | denormalised like `InternshipProgress` |
| Lifecycle | `status` (`draft`/`finalized`), `generatedAt`, `generationCount` | |
| Scores | `autoScore`, `finalScore`, `grade`, `confidence`, `aiGenerated` | **derived** from the criterion rows — never edited directly |
| Narrative | `summary`, `strengths[]`, `improvements[]`, `reviewerNote` | automated narrative, reviewer-editable |
| Audit | `evidence` (JSON) | the exact input the scores were computed from |
| Release | `finalizedAt`, `finalizedByUserId`, `finalizedByRole`, `finalizedByName`, `verificationCode` | code is `EV-` + 10 uppercase hex (`crypto.randomBytes(5)`), unique |
| Reopen | `reopenedAt`, `reopenReason` | admin only |

Statics: `gradeFor(score)` — **A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, else F**;
`weightedScore(rows, field)` — Σ(weight·score)/Σweight, 2dp, null when no row
has a score.

Uniqueness of `progressId` and `verificationCode` is declared once, in the
model's `indexes`, not with a column-level `unique: true` — under MySQL,
`sync({ alter: true })` adds a duplicate index for column-level uniques on
every boot.

### 2.3 `evaluation_criterion_scores` — `EvaluationCriterionScore`

The rubric is **snapshotted** into these rows at first generation (`name`,
`description`, `metric`, `weight`, `orderIndex`), so editing a task's rubric
later never rewrites an evaluation that already exists. Each row also holds
`autoScore`, `finalScore`, `rationale`, `evidence[]` (short strings),
`hasEvidence`, `adjusted` and `adjustmentNote`.

`finalScore = autoScore` until a reviewer changes it; `adjusted` records that
they differ.

---

## 3. Evidence

`evaluationService.computeEvidence({ progress, milestones, submissions, updates })`
is a pure function (unit-tested on plain arrays); `loadEvidence(progress)` is
the thin DB loader around it. The output is the snake_case AI contract:

| Field | Definition |
|---|---|
| `weighted_completion` | `progressPercent` (Module 8's weighted formula) |
| `milestone_count`, `completed_milestones` | non-cancelled / approved milestones |
| `required_outstanding`, `closed_with_outstanding_work` | required milestones still open; Module 8's closure flag |
| `submission_count`, `reviewed_count` | all attempts; attempts that were approved or sent back |
| `on_time_submission_rate` | attempts with `wasLate = false` ÷ attempts (null if none) |
| `rework_rate` | `changes_requested` ÷ reviewed (null if none) |
| `first_time_approval_rate` | approved milestones whose earliest approved attempt was attempt 1 ÷ approved milestones |
| `average_review_score` | mean of 1–5 review scores (null if none) |
| `supervisor_rating` | `performanceRating` from closure (1–5, null if not given) |
| `hours_logged` | `totalHoursLogged` |
| `active_weeks` | start of `startDate` → end of `actualEndDate`, in weeks, 1dp, **minimum 1** |
| `expected_hours` | `expectedHoursPerWeek × active_weeks` (null if no weekly target) |
| `estimated_hours` | Σ milestone estimates (null if 0) |
| `checkin_count`, `blockers_raised`, `blockers_resolved` | from `progress_updates` (student `checkin` / `blocker` types only — supervisor risk flags are not the student's communication) |
| `finished_on_time`, `days_late` | `actualEndDate ≤ targetEndDate`; null when undated |

The on-time and rework definitions are identical to the Module 8 report's, so
the two screens never disagree.

---

## 4. Scoring rules

Implemented in `ai-service/app/services/evaluator.py`, mirrored exactly in
`evaluationService.fallbackEvaluation`. Every constant is named in both files.

**No evidence → neutral.** When a metric has nothing to go on, it scores
**60** ("pass but unremarkable", a C) with the rationale *"Neutral score —
insufficient evidence: …"*, `hasEvidence = false`, and it lowers `confidence`.
A missing signal neither sinks nor flatters the student, and reviewers are told
exactly which scores are guesses.

| Metric | Rule |
|---|---|
| **quality** | review = (avg − 1)/4 × 100; rating = (supervisor − 1)/4 × 100. Both → 0.7·review + 0.3·rating; one → that one. Minus up to 15 when `rework_rate` > 0.3 (linear, full 15 at 0.7). |
| **timeliness** | `on_time_submission_rate` × 100 (60 if nothing was submitted). If finished late: − (20 + 2 × days late), capped at 30. Floor 0. |
| **completion** | `weighted_completion`, − 15 if closed with outstanding required work. Neutral when no milestones were planned. |
| **communication** | min(1, check-ins per active week ÷ 1) × 80, + 20 if a blocker was raised **and** resolved. Cap 100. Neutral when no check-ins and no blockers were posted (communication may have happened off-platform). |
| **effort** | ratio = hours ÷ (expected or estimated hours). < 0.9 → linear (ratio/0.9 × 100); 0.9–1.3 → 100; > 1.3 → declines gently to a floor of 80 at 2×. Neutral with no baseline. |
| **reliability** | `first_time_approval_rate` × 100 (fallback 1 − `rework_rate`), − 10 if blockers were left unresolved. Neutral when nothing was reviewed. |

Aggregation: criterion scores are rounded half-up to 1dp; **overall =
weighted mean by criterion weight**, 2dp; grade by `gradeFor`;
`confidence` = share of criteria with real evidence (3dp). Up to three
`strengths` (evidenced criteria ≥ 80) and three `improvements` (evidenced
criteria < 60) are emitted as actionable sentences keyed by metric (two
criteria on one metric do not repeat a sentence), plus a one-paragraph
`summary` naming the strongest and weakest criterion and how many scores were
backed by evidence.

Python's `round()` is banker's rounding; the evaluator uses an explicit
half-up helper so its numbers match JavaScript's `Math.round` in the fallback.
A live smoke run confirmed identical per-criterion scores, overall, grade,
confidence, strengths and improvements from both implementations.

---

## 5. Lifecycle

```
      internship completed (Module 8)
                 │  fire-and-forget generateEvaluation(trigger:'completion')
                 ▼
   ┌────────── draft ◄────────────────── reopen (admin, reason required)
   │   adjust (note ≥5 chars when ≠ auto)       ▲
   │   regenerate (adjustments survive)         │
   │   edit summary / strengths / note          │
   └──── finalize (company · mentor · admin) ──► finalized
                                                 • student can read it
                                                 • verification code issued
                                                 • student emailed
                                                 • frozen (409 on edit/regenerate)
```

**Generation triggers.**

1. **Completion.** `progressController.completeProgress` calls
   `generateEvaluation(progress.id, { trigger: 'completion' })` after its
   commit, without awaiting it and with a `.catch` that only logs — the
   completion response can never fail or slow down because of evaluation.
2. **Back-fill.** Internships completed before Module 9 (or where the
   background call did not run) get their draft when a *supervisor* first
   opens the Evaluation tab — the same back-fill rule Module 8 uses. A student
   read never generates anything.
3. **Manual.** `POST /progress/:progressId/generate` re-scores a draft from the
   latest evidence.

**Regeneration** re-scores the evaluation's *own* snapshot rows (the rubric is
not re-read), updates `autoScore`/`rationale`/`evidence`, and sets
`finalScore = adjusted ? finalScore : autoScore`, so a reviewer's adjustment
survives. The automated `summary`/`strengths`/`improvements` are regenerated
with the scores; `reviewerNote` is kept. A finalized evaluation refuses with
`409`.

**Race.** Completion generates in the background while a supervisor may
already be opening the tab. `UNIQUE(progressId)` guarantees one row; the loser
of the race catches the unique-constraint error and returns the winner's
(deterministic, identical) draft.

**Adjusting.** `PUT /:id` takes `{ criteria: [{ id, finalScore, adjustmentNote }] }`.
A score that differs from `autoScore` requires a note of at least 5 characters
— every override of the automated outcome says why (fairness requirement).
Setting a score back to `autoScore` clears `adjusted` and the note. The
overall `finalScore` and `grade` are recomputed from the rows every time;
`autoScore` is never touched by adjustments.

**Reopening** returns a finalized evaluation to draft, clears the finalizer
and **withdraws the verification code** (the old code stops verifying, since
the result may change), and records `reopenedAt` + `reopenReason`.

---

## 6. Authorisation

Rules live on the model and use the **Module 8 actor**
(`progressController.resolveActor`, now exported):

| Action | Student | Company (owner) | Active mentor | Past mentor | Unrelated mentor / company | Admin |
|---|---|---|---|---|---|---|
| View a draft | ❌ (404 "not released yet") | ✅ | ✅ | ✅ | ❌ 403 | ✅ |
| View a finalized evaluation | ✅ (own) | ✅ | ✅ | ✅ | ❌ 403 | ✅ |
| Trigger back-fill by reading | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Adjust / regenerate / finalize a draft | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Edit anything once finalized | ❌ | ❌ 409 | ❌ 409 | ❌ 409 | ❌ | ❌ 409 |
| Reopen a finalized evaluation | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Read / replace a task's rubric | ❌ | ✅ | ❌ | ❌ | ❌ 403 | ✅ |
| Public verify by code | anyone, no account |||||

**Deliberate widening for mentors.** Module 8 lets only the *active* mentor
supervise. By the time an internship is evaluated the mentorship is usually
`completed`, and the mentor who guided the work is the natural evaluator — so
`InternshipEvaluation.isEvaluator` accepts any mentor with an active **or
completed** assignment on the application (`isAssignedMentor`). A mentor with
no assignment on it gets nothing.

**What the student never sees.** Drafts (every path: `canBeViewedBy`, the
`/student` list is hard-filtered to `finalized`). The supervisor's private
1–5 closing rating stays hidden, as in Module 8: `evidence.supervisor_rating`
is deleted from the student's JSON and criterion evidence lines beginning
`"Supervisor closing rating"` (a fixed prefix both scorers emit) are removed.
The rest of the evidence *is* shown — it is the student's own record, and the
reasons behind a score must be visible to be fair.

**Public verify** returns only student name, task title, company name, grade,
final score, finalized date and the code — no criteria, evidence or notes.

---

## 7. AI integration

`POST /evaluate-internship` on the FastAPI service
(`ai-service/app/routes/evaluation.py` → `services/evaluator.py`), a
**deterministic rule engine** like the Module 6–8 engines — same input, same
output, every number explainable in a defence.

Request: `{ evaluation: { id, task_title, criteria: [{id, name, metric, weight}], evidence: {…§3} } }`
Response: `{ evaluation_id, overall_score, grade, confidence, summary, criteria: [{id, score, rationale, evidence[], has_evidence}], strengths[], improvements[] }`

The backend DTO mapper is `aiService.mapEvaluationToDto`; the field/type map
`EVALUATION_EVIDENCE_FIELDS` is exported and pinned against the Pydantic
schema by `tests/evaluation.aiContract.test.js`.

### Graceful degradation

`generateEvaluation` catches `AIServiceUnavailableError` (network failure,
timeout, non-2xx including a 422) **and** treats an answer that does not score
every criterion it was sent as an outage, then uses `fallbackEvaluation` — the
same rules, the same response shape. `aiGenerated` records which produced the
scores and surfaces as a one-line notice in the UI. Evaluation never fails
because the AI service is down.

---

## 8. API surface

Mounted at `/api/evaluations`. Everything except `/verify/:code` is behind
`protect`; `authorize()` is coarse, the real check is in the controller.

| Method | Path | Access |
|---|---|---|
| `GET` | `/verify/:code` | **public** — finalized only, 404 otherwise (declared before `protect`) |
| `GET` | `/student` | student — own **finalized** evaluations |
| `GET` | `/company` | company — own company's (`?status=draft\|finalized`) |
| `GET` | `/mentor` | mentor — internships of own active/completed assignments |
| `GET` | `/tasks/:taskId/criteria` | owning company, admin → `{ criteria, isDefault }` |
| `PUT` | `/tasks/:taskId/criteria` | owning company, admin — replace all (1–8, unique names, weight 1–10, known metric) |
| `GET` | `/progress/:progressId` | participants; supervisors back-fill the draft; student 404 until finalized; `400` if the internship is not completed. Includes `permissions {canEdit, canFinalize, canRegenerate, canReopen}` |
| `POST` | `/progress/:progressId/generate` | evaluators — (re)generate a draft (`201` created / `200` regenerated / `409` finalized) |
| `PUT` | `/:id` | evaluators, draft only — criterion adjustments, summary, strengths, improvements, reviewerNote |
| `PUT` | `/:id/finalize` | evaluators, draft only |
| `PUT` | `/:id/reopen` | admin — `{ reason }` (5–500 chars) |

Literal paths (`/verify`, `/student`, `/company`, `/mentor`, `/tasks`,
`/progress`) are declared before `/:id`, and `/:id/finalize`, `/:id/reopen`
before `/:id`.

---

## 9. Notifications

`backend/src/utils/evaluationNotifications.js`, following
`progressNotifications.js`: best-effort, never throws, never blocks.

| Event | Goes to | Template |
|---|---|---|
| Draft generated on completion | company **and** the mentor (active, else completed assignment) | `evaluationReady` — automated score, provisional grade, AI vs fallback, link to their workspace |
| Finalized | student | `evaluationFinalized` — grade, final score, finalizer, verification code, link to `/student/internships/<progressId>` and to `/verify/<code>` |

The student is deliberately **not** told when a draft exists — nothing is
theirs to see until a reviewer confirms it. Back-fill and manual generation
send nothing (the supervisor is already looking at it).

---

## 10. Frontend

```
src/types/evaluation.types.ts        shapes mirroring the backend toJSON()
src/services/evaluationService.ts    one method per endpoint + helpers (metric labels/hints,
                                     grade colour, score bar colour, ring tone, verify path)
src/components/evaluation/
  EvaluationPanel.tsx                the "Evaluation" tab of the internship workspace
  EvaluationCriteriaModal.tsx        rubric editor (add/remove/reorder, metric, weight)
src/app/(shared_routes)/verify/[code]/page.tsx   public verification page
```

**One panel, every role.** `EvaluationPanel` is rendered by
`ProgressWorkspace` as a new **Evaluation** tab (icon `Award`) for student,
company and mentor. Like the rest of the workspace it renders only the actions
`evaluation.permissions` says exist:

- not completed → explanatory empty state;
- supervisor + draft → overall score (`ProgressRing`) and grade, evidence
  coverage/confidence, the AI-vs-fallback notice (same wording style as the
  Report tab), per-criterion bars with rationale and evidence bullets, inline
  **Adjust** (0–100 + a required note when it differs), **Regenerate**,
  reviewer note, and **Finalize & release** behind a confirm dialog;
- finalized → read-only, finalizer and date, verification code with a link to
  `/verify/<code>`; admins additionally see **Reopen** (reason prompt);
- student before release → *"Your evaluation has not been released yet"*.

**Rubric entry point.** A new *Evaluation rubric* card and button on the
company task detail page (`/company/tasks/[taskId]`) opens
`EvaluationCriteriaModal`. `/verify` is listed in `publicPaths` in
`src/middleware.ts`.

---

## 11. Hooks into completed modules

Module 9 touches earlier modules only where it must plug in:

| File | Change |
|---|---|
| `backend/src/controllers/progressController.js` | `exports.resolveActor = resolveActor;` and one fire-and-forget `generateEvaluation(...)` call after `completeProgress` commits |
| `backend/src/models/index.js` | register the three models + associations, export them |
| `backend/src/services/aiService.js` | `mapEvaluationToDto`, `evaluateInternship`, `EVALUATION_EVIDENCE_FIELDS` |
| `backend/src/middleware/validation.js` | new Module 9 section at the bottom |
| `backend/src/utils/emailTemplates.js` | two templates appended |
| `backend/src/server.js` | mount `/api/evaluations` |
| `ai-service/app/models/schemas.py`, `app/main.py` | Module 9 schemas; include the router |
| `frontend/src/components/progress/ProgressWorkspace.tsx` | the Evaluation tab |
| `frontend/src/app/(dashboard)/company/tasks/[taskId]/page.tsx` | the rubric card + modal |
| `frontend/src/middleware.ts` | `/verify` public path |

### Design decisions that differ from the original spec

- **`hasEvidence` column** on `evaluation_criterion_scores` and `has_evidence`
  on the AI `CriterionResult`: the spec lowers confidence for evidence-less
  criteria; storing the flag per row lets the UI mark exactly *which* scores
  are neutral guesses.
- **Lists do not back-fill.** `/company` and `/mentor` list existing
  evaluations only; generating drafts for every completed internship on a list
  read would make one AI call per row. Back-fill happens on the per-internship
  read instead.
- **Evaluation `409`s.** Editing, regenerating or finalizing a finalized
  evaluation returns `409 Conflict` (state conflict) rather than `400`/`403`;
  a request from someone who is not an evaluator at all still gets `403`.
- **`canRegenerate`** is included in the `permissions` block alongside
  `canEdit/canFinalize/canReopen`, so the UI never infers it.

---

## 12. Testing

```bash
cd backend    && npx jest            # 130 tests (69 Module 8 + 61 Module 9), no database
cd ai-service && python -m pytest -q # 68 tests (33 existing + 35 evaluator)
```

- `tests/evaluation.rules.test.js` — grade bands, `weightedScore`, every access
  predicate (student blocked on draft / allowed on finalized, stranger company
  blocked, completed-assignment mentor can edit, nobody edits a finalized
  evaluation, only admin reopens), `toJSON`, `computeEvidence` on crafted
  arrays (cancelled milestones, superseded attempts, first-time approval,
  active weeks, lateness), `fallbackEvaluation` shape + every metric with the
  same numbers as the Python tests + determinism + neutral path, `isUsableResult`,
  `validateRubric`, verification code format.
- `tests/evaluation.aiContract.test.js` — the DTO field set equals the Pydantic
  schema fields; types (string ids, numeric DECIMALs, integer counts, nulls
  kept null, weights clamped).
- `ai-service/tests/test_evaluator.py` — grade bands, weights, each metric,
  neutral path, confidence, feedback caps and de-duplication, clamping,
  determinism, schema rejection, the route via `TestClient` (200 and 422).

The HTTP flows were exercised end-to-end on the real routes, controllers and
models over in-memory SQLite (a scratch harness, not part of the repo) — both
with the AI service down (fallback path) and against a live
`uvicorn app.main:app` (`aiGenerated = true`). See
[`docs/qa/module-9-automated-evaluation.md`](../qa/module-9-automated-evaluation.md)
for the case-by-case status, including what still needs the full MySQL stack.
