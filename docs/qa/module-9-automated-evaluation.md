# Module 9 — Automated Evaluation · QA Test Plan

**Scope.** Verification of the `/api/evaluations/*` surface added in Module 9:
automatic draft generation when an internship is completed, back-fill on first
supervisor read, the per-task rubric, the six scoring rules and their neutral
path, reviewer adjustment with mandatory notes, finalize/release with a
verification code, admin reopen, the public verify endpoint, the AI service
with its offline fallback, and the cross-role guards.

> **How the Status column was filled.** Every status reflects a run that was
> actually observed:
>
> - **Pass — jest**: `backend/tests/evaluation.*.test.js` (no database).
> - **Pass — pytest**: `ai-service/tests/test_evaluator.py`.
> - **Pass — harness (SQLite)**: the real Express routes, controllers, models
>   and validators booted over an **in-memory SQLite** database with email
>   sending recorded (a scratch integration harness, not part of the repo).
>   Run twice: with the AI service down (fallback path) and against a live
>   `uvicorn app.main:app` (`aiGenerated = true`). This is strong evidence
>   but **not** MySQL.
> - **Not run — needs live stack**: UI walk-throughs, real MySQL
>   (`sync({ alter: true })`), real SMTP delivery. Fill these in during your own
>   run; do not treat them as passing.

**Assumed fixtures.**

| Alias | Role | Notes |
|---|---|---|
| `STUDENT_A` | student | holds `PROGRESS_1` (on `TASK_X`) |
| `STUDENT_B` | student | unrelated |
| `COMPANY_X` | company | owns `TASK_X` |
| `COMPANY_Y` | company | unrelated |
| `MENTOR_A` | mentor | **completed** assignment on `PROGRESS_1`'s application |
| `MENTOR_C` | mentor | no assignment on it |
| `ADMIN` | admin | |
| `PROGRESS_1` | — | milestones reviewed with scores, a check-in, a resolved blocker, logged time |
| `PROGRESS_2` | — | `in_progress` (not completed) |

`TOKEN_*` is the JWT from `/api/auth/login`; `EVAL_1` is the evaluation of
`PROGRESS_1`.

---

## A. Functional

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| A1 | Completion drafts an evaluation automatically | `PROGRESS_1` open | `PUT /api/progress/{PROGRESS_1}/complete {performanceRating:4}` as `COMPANY_X` | `200` for the completion. Within moments a row appears in `internship_evaluations` with `status='draft'`, one `evaluation_criterion_scores` row per rubric criterion, `generationCount=1`. | Pass — harness (SQLite) |
| A2 | Default rubric used when the task has none | `TASK_X` has no criteria | Open `GET /api/evaluations/progress/{PROGRESS_1}` as `COMPANY_X` | Five criteria: Quality of work ×3, Timeliness ×2, Scope completion ×3, Communication ×1, Effort & commitment ×1. | Pass — harness (SQLite) |
| A3 | Evidence snapshot recorded | A1 | Inspect `data.evidence` | Snake_case evidence incl. `submission_count=3`, `first_time_approval_rate=0.5`, `blockers_resolved=1`, `supervisor_rating=4`. | Pass — harness (SQLite) |
| A4 | Every criterion carries a reason | A1 | Inspect `data.criteria[*]` | Non-empty `rationale`, `evidence[]` lines, `autoScore = finalScore`, `adjusted=false`. | Pass — harness (SQLite) |
| A5 | Overall = weighted mean; grade bands | — | unit | A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, else F; weighted mean 2dp. | Pass — jest · Pass — pytest |
| A6 | Each scoring rule | — | unit, one test per metric | quality 70/30 blend − rework; timeliness − (20+2/day, cap 30); completion − 15 if closed with outstanding; communication cadence + blocker bonus; effort band 0.9–1.3 with floor 80; reliability first-time rate − unresolved blockers. JS fallback returns the same numbers as Python. | Pass — jest · Pass — pytest |
| A7 | Evidence builder | — | unit on crafted arrays | cancelled milestones drop out; superseded attempts counted as submissions not reviews; active weeks ≥ 1; finishing on the target day is on time. | Pass — jest |
| A8 | Finalize issues a code and releases | `EVAL_1` draft | `PUT /api/evaluations/{EVAL_1}/finalize` as `COMPANY_X` | `200`, `status='finalized'`, `verificationCode` matches `^EV-[0-9A-F]{10}$`, `finalizedByRole='company'`, `finalizedByName` set, all `permissions` false. | Pass — harness (SQLite) |
| A9 | Admin reopen | A8 | `PUT /api/evaluations/{EVAL_1}/reopen {reason:'Company asked to fix quality score'}` as `ADMIN` | `200`, back to `draft`, `verificationCode=null`, `reopenReason` stored. | Pass — harness (SQLite) |
| A10 | Rubric replace | — | `PUT /api/evaluations/tasks/{TASK_X}/criteria` with two valid criteria as `COMPANY_X` | `200`, `isDefault=false`, criteria returned in the submitted order. | Pass — harness (SQLite) |

## B. Positive

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| B1 | Adjust with a note recomputes the grade | `EVAL_1` draft | `PUT /api/evaluations/{EVAL_1}` setting every criterion to 10 with a note | `200`, `finalScore=10`, `grade='F'`, every row `adjusted=true`; `autoScore` unchanged. | Pass — harness (SQLite) |
| B2 | Resetting to the automated score clears the adjustment | B1 | `PUT` one criterion with `finalScore = autoScore`, no note | `200`, that row `adjusted=false`, `adjustmentNote=null`. | Pass — harness (SQLite) |
| B3 | Regenerate keeps adjustments | B1 | `POST /api/evaluations/progress/{PROGRESS_1}/generate` | `200`, `generationCount=2`, adjusted `finalScore` unchanged. | Pass — harness (SQLite) |
| B4 | Student reads a finalized evaluation | A8 | `GET /api/evaluations/progress/{PROGRESS_1}` as `STUDENT_A` | `200` with criteria, reasons, strengths/improvements. | Pass — harness (SQLite) |
| B5 | Student list shows it once released | A8 | `GET /api/evaluations/student` | 1 record (0 before finalize). | Pass — harness (SQLite) |
| B6 | Public verify, no account | A8 | `GET /api/evaluations/verify/{code}` with no token (also lower-case) | `200` with student name, task, company, grade, finalScore, finalizedAt — and **no** criteria. | Pass — harness (SQLite) |
| B7 | Completed-assignment mentor evaluates | `MENTOR_A` (completed) | `GET`, `PUT` (with note), `PUT /finalize` as `MENTOR_A` | `200` each, `permissions.canEdit=true`, `finalizedByRole='mentor'`; `/api/evaluations/mentor` lists it. | Pass — harness (SQLite) |
| B8 | AI service up | `uvicorn app.main:app` running | Complete an internship | `aiGenerated=true`, no fallback warning in the backend log. | Pass — harness (SQLite) + live uvicorn |
| B9 | AI and fallback agree | — | Same DTO to `/evaluate-internship` and `fallbackEvaluation` | Identical per-criterion scores, overall, grade, confidence, strengths, improvements. | Pass — live uvicorn smoke |
| B10 | Company list with filter | A1 | `GET /api/evaluations/company?status=draft` | the draft is listed. | Pass — harness (SQLite) |

## C. Negative

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| C1 | Adjusting without a note | draft | `PUT /{EVAL_1} {criteria:[{id, finalScore:10}]}` | `400` "…a note of at least 5 characters is required…"; nothing saved. | Pass — harness (SQLite) |
| C2 | Score out of range | draft | `finalScore:150` | `400` "Scores must be between 0 and 100". | Pass — harness (SQLite) |
| C3 | Criterion from another evaluation | draft | `id:999999` | `400` "…does not belong to this evaluation". | Pass — harness (SQLite) |
| C4 | Edit / regenerate / finalize a finalized evaluation | A8 | `PUT /{id}`, `POST /progress/{pid}/generate`, `PUT /{id}/finalize` | `409` each. | Pass — harness (SQLite) |
| C5 | Reopen without a reason | A8 | `PUT /{id}/reopen {}` as `ADMIN` | `400`. | Pass — harness (SQLite) |
| C6 | Reopen a draft | draft | `PUT /{id}/reopen {reason}` as `ADMIN` | `409` "Only a finalized evaluation can be reopened". | Pass — harness (SQLite) |
| C7 | Rubric with duplicate names | — | `[{name:'Quality'},{name:'quality'}]` | `400` "…listed twice". | Pass — harness (SQLite) · Pass — jest |
| C8 | Rubric too big / empty / bad metric / bad weight | — | 9 items; `[]`; `metric:'charisma'`; `weight:11` | `400` each. | Pass — harness (SQLite) · Pass — jest |
| C9 | Unknown verify code | — | `GET /verify/EV-0000000000`, `/verify/nonsense` | `404` "No finalized evaluation matches this code". | Pass — harness (SQLite) |
| C10 | Unknown task rubric | — | `GET /tasks/999999/criteria` | `404` "Task not found". | Pass — harness (SQLite) |
| C11 | Malformed AI payload | AI running | `POST /evaluate-internship` with an empty rubric | `422`; backend would fall back. | Pass — pytest |

## D. Edge cases

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| D1 | Internship not completed | `PROGRESS_2` | `GET` and `POST …/generate` as company; `GET` as student | `400` "Evaluation becomes available once the internship is completed"; no row created. | Pass — harness (SQLite) |
| D2 | Nothing recorded at all | internship completed with no milestones | open the evaluation | Every criterion `autoScore=60`, `hasEvidence=false`, "insufficient evidence" rationale, `confidence=0`, no improvements lectured. | Pass — harness (SQLite) · Pass — jest · Pass — pytest |
| D3 | Rubric edits do not rewrite past evaluations | `EVAL_1` exists on the default rubric | Replace `TASK_X`'s rubric, then regenerate `EVAL_1` | `EVAL_1` still has its 5 snapshotted criteria; a *new* internship on `TASK_X` is scored on the new rubric. | Pass — harness (SQLite) |
| D4 | Reopen withdraws the code | A9 | `GET /verify/{old code}`; `GET` as `STUDENT_A` | `404` both — the student loses access until it is finalized again. | Pass — harness (SQLite) |
| D5 | Back-fill on supervisor read | delete `EVAL_1`'s row | `GET` as `STUDENT_A`, then as `COMPANY_X` | student `404` and **no row created**; company `200` with a fresh draft. | Pass — harness (SQLite) |
| D6 | Background generation vs. a simultaneous read | — | Complete and immediately open the tab | One row (`UNIQUE progressId`); the loser returns the winner's draft. | Not run — needs live stack (race not reproduced deterministically) |
| D7 | AI answer missing a criterion | — | unit | treated as an outage → fallback. | Pass — jest |
| D8 | Two criteria on one metric | — | rubric with two `quality` lines | both scored; the strength sentence is not repeated. | Pass — pytest |
| D9 | Rounding parity | — | unit | Python uses half-up rounding like `Math.round`. | Pass — live uvicorn smoke (B9) |

## E. Integration

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| E1 | Module 8 completion still works | — | Re-run the Module 8 smoke flow (open → milestone → submit → approve → report → complete) | all `200`; `performanceRating` still hidden from the student. | Pass — harness (SQLite) |
| E2 | "Evaluation ready" email | A1 | inspect outbox | Sent to the company (and the mentor when one exists); **not** to the student. | Pass — harness (SQLite) (recorded, not delivered) |
| E3 | "Your evaluation is ready" email | A8 | inspect outbox | Sent to the student, contains the verification code and link. | Pass — harness (SQLite) (recorded, not delivered) |
| E4 | Real SMTP delivery | SMTP configured | as E2/E3 | Emails arrive and render. | Not run — needs live stack |
| E5 | Tables created on MySQL | `DB_SYNC=alter` | boot the backend | `task_evaluation_criteria`, `internship_evaluations`, `evaluation_criterion_scores` exist; a second boot adds **no** duplicate indexes. | Not run — needs live stack |
| E6 | Contract backend ↔ AI | — | unit | DTO keys == Pydantic fields; types correct. | Pass — jest |

## F. Permission / security

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| F1 | Student cannot see a draft | draft | `GET /progress/{PROGRESS_1}` as `STUDENT_A` | `404` "Your evaluation has not been released yet". | Pass — harness (SQLite) |
| F2 | Student never sees the private rating | A8 | `GET` as `STUDENT_A` | `evidence.supervisor_rating` absent; no "Supervisor closing rating" line; the company still sees both. | Pass — harness (SQLite) |
| F3 | Stranger company | — | `GET`, `PUT`, `PUT /finalize`, `POST /generate` as `COMPANY_Y` | `403` each. | Pass — harness (SQLite) |
| F4 | Another student | — | `GET` / `PUT /finalize` as `STUDENT_B` | `403`. | Pass — harness (SQLite) |
| F5 | Unassigned mentor | — | `GET` as `MENTOR_C` | `403`. | Pass — harness (SQLite) |
| F6 | Only admin reopens | A8 | `PUT /reopen` as `COMPANY_X` | `403`. | Pass — harness (SQLite) · Pass — jest |
| F7 | Rubric ownership | — | `GET`/`PUT /tasks/{TASK_X}/criteria` as `COMPANY_Y` | `403`. | Pass — harness (SQLite) |
| F8 | No token | — | `GET /api/evaluations/company` | `401`. Only `/verify/:code` is public. | Pass — harness (SQLite) |
| F9 | Verify leaks nothing extra | A8 | `GET /verify/{code}` | no criteria, evidence, notes or ids beyond the code. | Pass — harness (SQLite) |

## G. Regression

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| G1 | Backend unit suite | `cd backend && npx jest` | 130 passed (69 pre-existing + 61 new). | Pass — jest |
| G2 | AI suite | `cd ai-service && python -m pytest -q` | 68 passed (33 pre-existing + 35 new). | Pass — pytest |
| G3 | Frontend types | `cd frontend && npx tsc --noEmit` | clean. | Pass — tsc |
| G4 | Frontend build | `cd frontend && npx next build` | succeeds; `/verify/[code]` in the route list. | Pass — next build |
| G5 | Module 8 smoke | harness `m8.smoke.test.js` | passes. | Pass — harness (SQLite) |

## H. UI walkthrough

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| H1 | Evaluation tab before completion | Open any open internship → **Evaluation** | Explanatory empty state, wording differs for student vs supervisor. | Not run — needs live stack |
| H2 | Supervisor draft view | Complete an internship → **Evaluation** as the company | Score ring + grade, confidence, per-criterion bars with reasons and evidence, "not visible to the student" notice. | Not run — needs live stack |
| H3 | Adjust inline | **Adjust** a criterion, change the score | Note field appears and is required; saving updates the bar, the overall and the grade. **Use automated score** resets it. | Not run — needs live stack |
| H4 | Finalize | **Finalize & release** → confirm | Dialog states the grade; afterwards read-only with the verification code and a link. | Not run — needs live stack |
| H5 | Student before / after release | As the student | "not released yet" → full read-only evaluation. | Not run — needs live stack |
| H6 | AI down notice | Stop the AI service, regenerate | Amber "AI service was unreachable" notice. | Not run — needs live stack |
| H7 | Rubric editor | `/company/tasks/{id}` → **Evaluation rubric** | Default rubric note; add/remove/reorder, weight share %, duplicate-name toast; save persists. | Not run — needs live stack |
| H8 | Public verify page | Open `/verify/{code}` logged out | "Verified evaluation" card; a bad code shows the not-found card. | Not run — needs live stack |
| H9 | Admin reopen | As admin open the internship → **Reopen** | Reason prompt; evaluation returns to draft. | Not run — needs live stack |

---

## How to run

Backend at `http://localhost:5000/api`, AI service at `http://localhost:8000`,
`DB_SYNC=alter` for the first boot so the three new tables are created.

```bash
# 1. Complete an internship (Module 8) — the draft is generated in the background
curl -s -X PUT "http://localhost:5000/api/progress/$PROGRESS_ID/complete" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"performanceRating":4,"completionNote":"Solid work"}'

# 2. Read the draft (also back-fills if it does not exist yet)
curl -s "http://localhost:5000/api/evaluations/progress/$PROGRESS_ID" \
  -H "Authorization: Bearer $COMPANY_TOKEN" | jq '.data | {id, status, finalScore, grade, aiGenerated, confidence}'

# 3. Adjust one criterion — the note is required because the score changes
curl -s -X PUT "http://localhost:5000/api/evaluations/$EVAL_ID" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"criteria":[{"id":"'"$CRITERION_ID"'","finalScore":90,"adjustmentNote":"Final demo was excellent"}]}'

# 4. Finalize and release
curl -s -X PUT "http://localhost:5000/api/evaluations/$EVAL_ID/finalize" \
  -H "Authorization: Bearer $COMPANY_TOKEN" | jq '.data.verificationCode'

# 5. Public verification (no token)
curl -s "http://localhost:5000/api/evaluations/verify/$CODE"

# 6. Admin reopen
curl -s -X PUT "http://localhost:5000/api/evaluations/$EVAL_ID/reopen" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Company asked to correct a score"}'

# 7. Define a rubric for a task
curl -s -X PUT "http://localhost:5000/api/evaluations/tasks/$TASK_ID/criteria" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"criteria":[{"name":"Code quality","metric":"quality","weight":4},{"name":"Delivery","metric":"timeliness","weight":2}]}'

# 8. The AI endpoint directly
curl -s -X POST http://localhost:8000/evaluate-internship -H "Content-Type: application/json" \
  -d '{"evaluation":{"id":"1","task_title":"Demo","criteria":[{"id":"q","name":"Quality","metric":"quality","weight":1}],"evidence":{"average_review_score":4,"reviewed_count":2}}}'
```

## Automated coverage (observed)

```bash
cd backend    && npx jest            # 130 passed — 4 suites (61 new in evaluation.rules / evaluation.aiContract)
cd ai-service && python -m pytest -q # 68 passed  — 35 new in test_evaluator.py
cd frontend   && npx tsc --noEmit    # clean
cd frontend   && npx next build      # succeeded
```

Integration harness (scratch, in-memory SQLite, not in the repo): the Module 9
flow file — 7 tests, 7 passed with the AI service down (fallback) and 7 passed
against a live `uvicorn` on port 8765 (`aiGenerated = true`); the Module 8
smoke test — 1 passed. Everything marked *Not run — needs live stack* above
still needs a MySQL + SMTP + browser run.
