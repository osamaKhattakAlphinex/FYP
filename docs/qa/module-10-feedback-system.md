# Module 10 — Feedback System · QA Test Plan

**Scope.** Verification of the `/api/feedback/*` surface added in Module 10:
structured feedback (overall + per-area ratings, strengths, areas to develop,
suggestions, recommendation) on closed internships and completed interviews,
one record per author, the student's acknowledgement and reply with the edit
lock, admin moderation, the performance-record summary and its access matrix,
the feedback assistant (`/feedback-assist`) with its offline fallback, the
server-side tone guard, emails, and the cross-role guards.

> **How the Status column was filled.** Every status reflects a run that was
> actually observed:
>
> - **Pass — jest**: `backend/tests/feedback.*.test.js` (no database).
> - **Pass — pytest**: `ai-service/tests/test_feedback_assistant.py`.
> - **Pass — harness (SQLite)**: the real Express routes, controllers, models
>   and validators booted over an **in-memory SQLite** database with email
>   sending recorded (a scratch integration harness, not part of the repo).
>   Run twice: with the AI service down (fallback path) and against a live
>   `uvicorn app.main:app` on port 8765 (`aiGenerated = true`). This is strong
>   evidence but **not** MySQL.
> - **Not run — needs live stack**: UI walk-throughs, real MySQL
>   (`sync({ alter: true })`), real SMTP delivery. Fill these in during your own
>   run; do not treat them as passing.

**Assumed fixtures.**

| Alias | Role | Notes |
|---|---|---|
| `STUDENT_A` | student | holds `PROGRESS_1` (on `TASK_X`), interviewed in `INTERVIEW_1` |
| `STUDENT_B` | student | unrelated |
| `COMPANY_X` | company | owns `TASK_X` |
| `COMPANY_Y` | company | unrelated |
| `COMPANY_Z` | company | `STUDENT_A` has a *pending* application on one of its tasks |
| `MENTOR_A` | mentor | **completed** (or active) assignment on `PROGRESS_1`'s application |
| `MENTOR_C` | mentor | no assignment |
| `ADMIN` | admin | |
| `PROGRESS_1` | — | `completed` |
| `PROGRESS_2` | — | `in_progress` |
| `INTERVIEW_1` | — | `COMPANY_X` × `STUDENT_A`, `completed` |

`FB_1` is `COMPANY_X`'s feedback on `PROGRESS_1`.

---

## A. Functional

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| A1 | Company gives internship feedback | `PROGRESS_1` completed | `POST /api/feedback {context:'internship', progressId, overallRating:4, ratings:{technical:5,communication:3}, strengths, improvements, suggestions:[…], wouldRecommend:true}` as `COMPANY_X` | `201`; `authorRole='company'`, `authorName` = company name, `taskId` = the internship's task, `averageDimensionRating=4`, `permissions={canEdit:true,canDelete:true,canAcknowledge:false}` | Pass — harness (SQLite) |
| A2 | Student is emailed | A1 | Inspect recorded email | Subject "New feedback on your internship …", link to `/student/feedback` | Pass — harness (SQLite) |
| A3 | Mentor gives their own feedback | `MENTOR_A` completed assignment | `POST /api/feedback` as `MENTOR_A` | `201`, `authorRole='mentor'` | Pass — harness (SQLite) |
| A4 | Student sees everything about them | A1, A3 | `GET /api/feedback/received`; `GET /api/feedback/progress/{PROGRESS_1}` as `STUDENT_A` | Both return 2 records; `canAcknowledge=true`; `permissions.canGive=false` | Pass — harness (SQLite) |
| A5 | Interview feedback (US-14) | `INTERVIEW_1` completed | `POST /api/feedback {context:'interview', interviewId}` as `COMPANY_X` | `201`, `progressId=null`, student emailed ("…your interview for…") | Pass — harness (SQLite) |
| A6 | Acknowledge with reply | A1 | `PUT /api/feedback/{FB_1}/acknowledge {response}` as `STUDENT_A` | `200`, `studentAcknowledgedAt` + `studentRespondedAt` set; author emailed with the escaped reply and a link to `/company/progress/{id}` | Pass — harness (SQLite) |
| A7 | Acknowledge without reply | A1 | `PUT …/acknowledge {}` | `200`, `studentResponse=null`, no reply email | Pass — harness (SQLite) |
| A8 | Summary | A1 + mentor record | `GET /api/feedback/students/{STUDENT_A}/summary` | `count=2`, `averageOverall=3.5`, `averageByDimension.technical=4`, `recommendRate=0.5`, `byContext={internship:2,interview:0}`, `recent` ≤ 3 with ≤ 200-char excerpts | Pass — harness (SQLite) · Pass — jest (aggregation) |
| A9 | Assist drafts from evidence | `PROGRESS_1` with a reviewed milestone | `POST /api/feedback/assist {context:'internship', progressId}` as `COMPANY_X` | `200`; non-empty `suggested_strengths`, ≥ 1 suggestion, rating 1–5, `evidenceSource` `evaluation` or `rules`, `aiGenerated` true/false matching AI availability | Pass — harness (SQLite) (both runs) |
| A10 | Drafting rules | — | unit | ≥ 80 → strength, < 60 → improvement + paired library suggestion, cap 3, worst first, indicators only for silent metrics, rating = weighted mean/20 half-up | Pass — jest · Pass — pytest |
| A11 | Interview assist | `INTERVIEW_1` completed | `POST /api/feedback/assist {context:'interview', interviewId}` | `suggested_overall_rating=null`, strengths/improvements start with `Template: ` | Pass — harness (SQLite) · Pass — jest · Pass — pytest |

## B. Positive

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| B1 | Edit before acknowledgement | A1 | `PUT /api/feedback/{FB_1} {overallRating:5, ratings:{teamwork:4}}` | `200`, `editedAt` set, ratings replaced | Pass — harness (SQLite) |
| B2 | Author deletes before acknowledgement, then writes again | A1 | `DELETE /api/feedback/{FB_1}`; `POST` again | `200` then `201` | Pass — harness (SQLite) |
| B3 | Abandoned internship accepts feedback | `PUT /progress/{id}/status {status:'abandoned'}` | `POST /api/feedback` | `201` | Pass — harness (SQLite) |
| B4 | Warnings never block | — | Create with shouted strengths and no suggestions | `201` | Pass — harness (SQLite) · Pass — jest |
| B5 | Company sees the mentor's feedback on its task | A3 | `GET /api/feedback/progress/{PROGRESS_1}` as `COMPANY_X` | 2 records; mentor record has all permissions false | Pass — harness (SQLite) |
| B6 | `/given` | A3 | `GET /api/feedback/given` as `MENTOR_A` | 1 record | Pass — harness (SQLite) |
| B7 | Filter by context | A1 | `GET /api/feedback/received?context=interview` | only interview records | Pass — harness (SQLite) |

## C. Negative

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| C1 | Internship still open | `PROGRESS_2` | `POST /api/feedback` as its company | `400 "Feedback opens once the internship is completed or closed"`; thread endpoint returns `canGive=false, isAuthorRole=true` | Pass — harness (SQLite) |
| C2 | Interview not completed | interview `scheduled` | `POST {context:'interview'}` as owner | `400 "…once the interview is marked completed"` | Pass — harness (SQLite) |
| C3 | Duplicate | A1 | `POST` again as `COMPANY_X` | `409 "You have already left feedback here — edit it instead"` (also for interviews) | Pass — harness (SQLite) |
| C4 | Personal insult on create | `PROGRESS_1` | improvements "…useless … stupid" | `400`, message quotes `"stupid", "useless"`; nothing stored | Pass — harness (SQLite) · Pass — jest |
| C5 | Insult on update / in student reply | A1 | `PUT /:id {strengths:'Pathetic…'}`; `PUT /:id/acknowledge {response:'Shut up…'}` | both `400`; a rejected reply does **not** acknowledge | Pass — harness (SQLite) |
| C6 | Edit / delete after acknowledgement | A6 | `PUT /:id`, `DELETE /:id` as author | `409 "…already acknowledged…"` | Pass — harness (SQLite) |
| C7 | Acknowledge twice | A6 | `PUT /:id/acknowledge` | `409` | Pass — harness (SQLite) |
| C8 | Validation | `PROGRESS_1` | rating 6; missing rating; 6 suggestions; 2-char suggestion; both texts empty; < 20 chars; `context:'interview'` with `progressId`; both ids; `context:'meeting'`; ratings `{charisma:5}`; `{technical:0}`; 4001-char text; update rating 0; reply 2001 chars | all `400` with the specific message; nothing stored | Pass — harness (SQLite) |
| C9 | Assist before closing | `PROGRESS_2` | `POST /api/feedback/assist` | `400` | Pass — harness (SQLite) |
| C10 | Summary of unknown student | — | `GET /students/999999/summary` as admin | `404` | Pass — harness (SQLite) |

## D. Edge cases

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| D1 | Technical words are not insults | — | strengths "lazy loading … garbage collection … stupidity checks" | no `harsh_language` (whole-word match) | Pass — jest · Pass — pytest |
| D2 | Band edges | — | criteria 80 / 60 / 59.99 | 80 strength; 60 neither; 59.99 improvement | Pass — jest · Pass — pytest |
| D3 | Half-up rounding | — | mean 70 → 3.5 | rating 4 in both JS and Python | Pass — jest · Pass — pytest |
| D4 | Indicator vs criterion conflict | — | timeliness criterion 45, on-time rate 0.95 | no timeliness strength; timeliness improvement only | Pass — jest · Pass — pytest |
| D5 | JSON columns as strings (MySQL driver) | — | `toJSON()` on `ratings:'{"teamwork":2}'` | parsed; unknown dimensions dropped | Pass — jest |
| D6 | Empty summary | — | `summarizeFeedback([])` | nulls, not zeros | Pass — jest |
| D7 | Author account deleted | — | delete the author user | record kept with `authorUserId=null`, `authorName` snapshot | Not run — needs live stack |
| D8 | Race: two simultaneous creates | — | two parallel `POST`s | unique index → second gets `409` | Not run — needs live stack (code path reviewed) |
| D9 | Unique indexes under MySQL `sync({alter})` | — | restart server twice | no duplicate `feedback` indexes accumulate | Not run — needs live stack |

## E. Integration

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| E1 | Live AI service | `uvicorn app.main:app --port 8765` | harness with `AI_SERVICE_URL=http://127.0.0.1:8765` | 10/10 pass; `/assist` returns `aiGenerated:true`; 3 `POST /feedback-assist ok` log lines | Pass — harness (SQLite) |
| E2 | JS fallback ≡ Python engine | E1 | 4 sample DTOs (mixed criteria + harsh draft; shouted draft; interview; empty draft) posted to the live service and to `fallbackFeedbackAssist` | deep-equal for all 4 | Pass — live smoke |
| E3 | Contract field sets | — | unit | DTO keys == pydantic `FeedbackSnapshot/…CriterionIn/…Indicators/…Draft`; fallback keys == `FeedbackAssistResponse` | Pass — jest |
| E4 | AI down | default harness | `/assist` | `aiGenerated:false`, same shape | Pass — harness (SQLite) |
| E5 | Module 9 evidence reuse | completed internship | `/assist` | `evidenceSource='evaluation'` when a draft/finalized evaluation exists, else `'rules'` | Pass — harness (SQLite) (accepts either; background generation timing varies) |
| E6 | Real SMTP delivery | SMTP configured | A1, A6 | emails arrive | Not run — needs live stack |
| E7 | UI: Feedback tab, form, Draft with AI, Check my feedback, candidate page button, student page, dashboard card, mentor section | full stack | browser walk-through | as described in the architecture doc | Not run — needs live stack (`tsc` clean, `next build` succeeded) |

## F. Permission / security

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| F1 | Stranger company | `PROGRESS_1` | `POST /api/feedback`, `GET /progress/{id}`, `GET /:id` as `COMPANY_Y` | `403` each | Pass — harness (SQLite) |
| F2 | Unassigned mentor | | `POST` as `MENTOR_C` | `403` | Pass — harness (SQLite) |
| F3 | Student cannot author / assist | | `POST /api/feedback`, `POST /assist` as `STUDENT_A` | `403` | Pass — harness (SQLite) |
| F4 | Other student | A1 | `GET /:id`, `PUT /:id/acknowledge` as `STUDENT_B` | `403` | Pass — harness (SQLite) |
| F5 | Interview feedback: only owning company | `INTERVIEW_1` | `POST` as `COMPANY_Y`, `MENTOR_A` | `403` | Pass — harness (SQLite) |
| F6 | Interview thread visibility | A5 | `GET /interviews/{id}` as student (200), company (200), `COMPANY_Y` (403), mentor (403) | as stated | Pass — harness (SQLite) |
| F7 | Summary matrix | A8 | self, owning company, `COMPANY_Z` (applied), `MENTOR_A`, admin → 200; `COMPANY_Y`, `STUDENT_B`, `MENTOR_C` → 403 | as stated | Pass — harness (SQLite) |
| F8 | Moderation list admin-only | | `GET /api/feedback` as company | `403`; as admin `200` with `?studentId=` filter | Pass — harness (SQLite) |
| F9 | Admin delete after acknowledgement | A6 | `DELETE /:id` as admin | `200`, row gone | Pass — harness (SQLite) |
| F10 | Predicates | — | unit over 9 actor shapes | view/edit/delete/acknowledge/author rules as in the architecture doc | Pass — jest |
| F11 | Private closing rating not leaked | — | student responses | no `performanceRating` on any feedback response; the form prefill is company-perspective only | Not asserted directly — by construction feedback responses never include the progress row; Module 8 stripping unchanged (M8 smoke passes) |
| F12 | Email HTML injection | A6 with `<b>` in reply | inspect email | escaped as `&lt;b&gt;` | Pass — harness (SQLite) |

## G. Regression

| # | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| G1 | Backend unit suites | `cd backend && npx jest` | all pass | Pass — jest (194/194) |
| G2 | AI suites | `cd ai-service && python -m pytest -q` | all pass | Pass — pytest (103/103) |
| G3 | Module 8 smoke | `node --test m8.smoke.test.js` | 1/1 | Pass — harness (SQLite) |
| G4 | Module 9 flow | `node --test m9.flow.test.js` | 7/7 | Pass — harness (SQLite) |
| G5 | Module 5 quick note untouched | A5 | `Interview.companyFeedback` stays null after structured feedback | Pass — harness (SQLite) |
| G6 | Frontend types / build | `npx tsc --noEmit`; `npx next build` | clean; build succeeds (`/student/feedback`, `/mentor/feedback` built) | Pass — tsc / build |

---

## How to run (curl)

```bash
# 1. Company leaves feedback on a completed internship
curl -s -X POST http://localhost:5000/api/feedback \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"context":"internship","progressId":"'"$PROGRESS_ID"'","overallRating":4,
       "ratings":{"technical":5,"communication":3},
       "strengths":"Delivered a clean, well-tested data layer ahead of schedule.",
       "improvements":"Plan the UI work earlier so the last milestone is not rushed.",
       "suggestions":["Set an internal deadline two days before each due date."],
       "wouldRecommend":true}'

# 2. Ask the assistant for a draft / review
curl -s -X POST http://localhost:5000/api/feedback/assist \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"context":"internship","progressId":"'"$PROGRESS_ID"'","draft":{"strengths":"Good work","suggestions":[]}}'

# 3. Student reads, acknowledges and replies
curl -s "http://localhost:5000/api/feedback/received" -H "Authorization: Bearer $STUDENT_TOKEN"
curl -s -X PUT "http://localhost:5000/api/feedback/$FEEDBACK_ID/acknowledge" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"response":"Thank you, I will plan the UI earlier next time."}'

# 4. Interview feedback (interview must be completed)
curl -s -X POST http://localhost:5000/api/feedback \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"context":"interview","interviewId":"'"$INTERVIEW_ID"'","overallRating":4,
       "strengths":"Clear explanation of past projects and trade-offs.","suggestions":["Prepare two STAR examples."]}'

# 5. Performance-record summary
curl -s "http://localhost:5000/api/feedback/students/$STUDENT_ID/summary" -H "Authorization: Bearer $COMPANY_TOKEN"

# 6. Admin moderation
curl -s "http://localhost:5000/api/feedback?studentId=$STUDENT_ID" -H "Authorization: Bearer $ADMIN_TOKEN"
curl -s -X DELETE "http://localhost:5000/api/feedback/$FEEDBACK_ID" -H "Authorization: Bearer $ADMIN_TOKEN"

# 7. The AI endpoint directly
curl -s -X POST http://localhost:8000/feedback-assist -H "Content-Type: application/json" \
  -d '{"feedback":{"context":"internship","criteria":[{"name":"Quality","metric":"quality","score":91,"weight":3},{"name":"Communication","metric":"communication","score":42}],"indicators":{"on_time_submission_rate":1.0},"draft":{}}}'
```

## Automated coverage (observed)

```bash
cd backend    && npx jest            # 194 passed — 6 suites (64 new in feedback.rules / feedback.aiContract)
cd ai-service && python -m pytest -q # 103 passed — 35 new in test_feedback_assistant.py
cd frontend   && npx tsc --noEmit    # clean
cd frontend   && npx next build      # succeeded
```

Integration harness (scratch, in-memory SQLite, not in the repo): the Module 10
flow file — 10 tests, 10 passed with the AI service down (fallback) and 10
passed against a live `uvicorn` on port 8765 (`aiGenerated = true`); Module 8
smoke — 1 passed; Module 9 flow — 7 passed. Live parity: 4/4 sample DTOs gave
identical results from `POST /feedback-assist` and the JS fallback.
Everything marked *Not run — needs live stack* above still needs a MySQL +
SMTP + browser run.
