# Module 11 — Performance Analytics Dashboard · QA Test Plan

**Scope.** Verification of the `/api/analytics/*` surface added in Module 11:
the student dashboard (progress, scores, completed internships, skill
development), the viewer-restricted candidate view, the company dashboard
(funnel, monthly activity, internships, evaluations, per-task table), the
top-performer ranking with its two scopes, the admin platform dashboard
(US-18), the AI performance insight (`/performance-insights`) with its offline
fallback, and the three dashboard pages plus the candidate-page card.

> **How the Status column was filled.** Every status reflects a run that was
> actually observed:
>
> - **Pass — jest**: `backend/tests/analytics.*.test.js` (no database).
> - **Pass — pytest**: `ai-service/tests/test_performance_insights.py`.
> - **Pass — harness (SQLite)**: the real Express routes, controllers, models
>   and validators booted over an **in-memory SQLite** database (a scratch
>   integration harness, not part of the repo), with the dataset built through
>   the Module 8/9/10 endpoints. Run twice: with the AI service down (fallback)
>   and against a live `uvicorn app.main:app` on port 8765
>   (`aiGenerated = true`, identical numbers). This is strong evidence but
>   **not** MySQL.
> - **Not run — needs live stack**: UI walk-throughs, real MySQL, a browser at
>   360 px. Fill these in during your own run; do not treat them as passing.

**Harness dataset** (every expected number below is derived from it by hand).

| Alias | Facts |
|---|---|
| `C1` | company; tasks `T1` "Dashboard" (skills React, Node.js) and `T2` "Landing page" (React) |
| `C2` | company; task `T3` "Mobile app" (React) |
| `S1` | profile skill `react` (Advanced). `T1` accepted → `I1` completed, evaluation **finalized 70** (B), 3 h logged, mentor `M` (completed assignment). `T3` accepted → `I2` completed, **finalized 85** (A), 2.5 h. `T2` withdrawn (history submitted → under_review → withdrawn). |
| `S2` | `T2` accepted → `I3` completed, **finalized 90** (A). `T1` rejected (history submitted → shortlisted → rejected, submitted 4 days before the decision). `T3` submitted. |
| `S3` | `T1` accepted → `I4` completed, evaluation adjusted to 40 but left a **draft**. `T2` under review. |
| Feedback | `C1`→`I1` 4★ recommend · `M`→`I1` 3★ not recommend · `C2`→`I2` 5★ recommend · `C1`→`I3` 5★ recommend |
| Interviews | `C1`: one `completed` (S2/T1), one `no_show` (S3/T2) |
| Others | `S_OUT` (student, nothing), `C_OUT` (company, nothing), `M` (mentor, approved), `ADMIN` |

Accepted applications: submitted 3 days ago, decided 1 day ago (2 days).

---

## A. Functional

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| A1 | Student summary | dataset | `GET /api/analytics/student` as `S1` | `applications {total 3, accepted 2, withdrawn 1, acceptanceRate 1}`, `interviews {0,0}`, `internships {total 2, completed 2, active 0}`, `hoursLogged 5.5`, `finalizedEvaluations 2`, `averageEvaluationScore 77.5`, `latestGrade 'A'`, `feedback {count 3, averageOverall 4, recommendRate 0.667}`, `onTimeSubmissionRate null` | Pass — harness (SQLite) |
| A2 | Score history | A1 | inspect `scoreHistory` | `[70 B Dashboard C1, 85 A Mobile app C2]`, oldest first | Pass — harness (SQLite) |
| A3 | Hours by month | A1; `?months=6` | inspect `hoursByMonth` | 12 zero-filled months, current month 5.5; 6 entries with `months=6` | Pass — harness (SQLite) |
| A4 | Criteria averages | A1 | inspect `criteriaAverages` | quality, timeliness, completion, communication, effort each `77.5` over 2 samples (default rubric) | Pass — harness (SQLite) |
| A5 | Skill improvements over time | A1 | inspect `skills` | `react` (profile spelling, Advanced) in 2 internships, scores 70 → 85, change +15, `improving`; `Node.js` 1 internship, `insufficient_data` | Pass — harness (SQLite) · Pass — jest |
| A6 | Student insight | A1 | inspect `insight` | index **80.9** = (77.5·0.5 + 75·0.2 + 100·0.15)/0.85, `strong`, `improving`, slope 15, no projection (2 evaluations), confidence 0.5, three sentences ("Scores are improving by about 15 points…", "Finished 2 of 2 internships…", "Average feedback rating 4/5 from 3 reviews, 67% would recommend.") | Pass — harness (SQLite) (both runs) |
| A7 | Company summary | dataset | `GET /api/analytics/company` as `C1` | tasks 2 active; applications 6 (accepted 3, rejected 1, under_review 1, withdrawn 1); conversion 0.5; `avgDaysToDecision 2.5`; interviews `{2, 1, 1}`; internships 3 completed, `averageProgress null`; evaluations `{finalized 2, drafts 1, averageScore 80, A1 B1}`; `feedbackGiven {2, 4.5}` | Pass — harness (SQLite) |
| A8 | Funnel with history | A7 | inspect `funnel` | 6 · 6 · 4 · 3 · 3 (the rejected-after-shortlist application counts up to *shortlisted*) | Pass — harness (SQLite) · Pass — jest |
| A9 | Monthly activity | A7 | sum `monthly` | applications 6, acceptances 3, completions 3 | Pass — harness (SQLite) |
| A10 | Per-task table | A7 | inspect `tasks` | Dashboard 3 apps / 2 accepted / 2 completed / avg **70** (draft 40 excluded); Landing page 3 / 1 / 1 / 90 | Pass — harness (SQLite) |
| A11 | Top performers — interns | dataset | `GET /api/analytics/company/top-performers` as `C1` | `candidates 3`, `unrated 1` (S3), ranking `S2 94.1 excellent`, `S1 73.5 strong` (C1-only record: eval 70, feedback (4+3)/2) | Pass — harness (SQLite) (both runs) |
| A12 | Top performers — applicants | dataset | `?scope=applicants` as `C1` | `candidates 3`; `S2 94.1`, `S1 80.9` (platform-wide record) | Pass — harness (SQLite) (both runs) |
| A13 | Company dashboard preview | A7 | inspect `topPerformers` | same order as A11, at most 5 | Pass — harness (SQLite) |
| A14 | Admin platform analytics | dataset | `GET /api/analytics/admin` | users 9 (student 4, company 3, mentor 1, admin 1); companies 3; mentors approved 1; tasks 3 active, one category ×3; applications 8 (accepted 4, rejected 1, under_review 1, withdrawn 1, submitted 1); interviews completed 1 / no_show 1; internships completed 4, hours 5.5; evaluations total 4, finalized 3, average **81.67**, A2 B1, `aiGeneratedShare` 0 (AI down) / 1 (AI live); feedback 4, average 4.25; top companies C1 3, C2 1; `aiHealth` present | Pass — harness (SQLite) (both runs) |
| A15 | Fallback insight rules | — | unit | weights 0.5/0.2/0.15/0.15 with renormalisation (77.5, 78.6), recency half-life 180 days (66.7), band thresholds on the rounded index, slope thresholds ±3, projection only with ≥ 3 (100 clamped, 70, 0 clamped), confidence (0.55, 0.2, 0.45), strengths ≥ 80 / focus < 60, exact sentences | Pass — jest · Pass — pytest |

## B. Positive

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| B1 | Company views an applicant's analytics | `S1` applied to `C1` | `GET /api/analytics/students/{S1}` as `C1` | `200`, `audience 'viewer'`, same `averageEvaluationScore 77.5` and index 80.9 | Pass — harness (SQLite) |
| B2 | Mentor views their mentee | `M` has a completed assignment with `S1` | same as `M` | `200`, `viewer` | Pass — harness (SQLite) |
| B3 | Admin views any student | — | same as `ADMIN` | `200`, `audience 'self'` (full) | Pass — harness (SQLite) |
| B4 | Student views self by id | — | same as `S1` | `200`, `self`, includes `applications` | Pass — harness (SQLite) |
| B5 | Other company the student applied to | `S2` applied to `T3` | `GET /api/analytics/students/{S2}` as `C2` | `200` | Pass — harness (SQLite) |
| B6 | C2's own interns | — | `/company/top-performers` as `C2` | `S1` **91.2 excellent** = (85·0.5 + 100·0.2 + 100·0.15)/0.85 | Pass — harness (SQLite) |
| B7 | Numbers follow new data | A11 | `C1` leaves 2★ feedback on `I4`, re-query | `unrated 0`; `S3` ranked third at **57.1 developing** ((25·0.2 + 100·0.15)/0.35); `feedbackGiven {3, 3.67}` | Pass — harness (SQLite) |
| B8 | AI service live | `uvicorn` on 8765 | re-run the harness with `AI_SERVICE_URL` | every endpoint `aiGenerated: true`; every number and ranking identical to the fallback run | Pass — harness (SQLite) |

## C. Negative

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| C1 | Invalid months | — | `/student?months=7` | `400` validation error | Pass — harness (SQLite) |
| C2 | Invalid scope | — | `/company/top-performers?scope=everyone` | `400` | Pass — harness (SQLite) |
| C3 | Non-numeric limit | — | `?limit=abc` | `400` | Pass — harness (SQLite) |
| C4 | Unknown student | — | `/students/999999` as admin | `404` | Pass — harness (SQLite) |
| C5 | Malformed student id | — | `/students/abc` | `404` | Pass — harness (SQLite) |
| C6 | AI answer malformed | AI returns wrong length / ids out of order | unit | whole batch falls back, `aiGenerated false` | Pass — jest |
| C7 | Programming error in the AI path | `TypeError` | unit | rethrown (not masked as an outage) | Pass — jest |
| C8 | AI schema rejects bad input | score 101, negative days, unknown metric, metric 150, rating 6, rate 1.5, 0 or 201 students | `POST /performance-insights` | `422` | Pass — pytest |

## D. Edge cases

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| D1 | Brand-new student | `S_OUT` | `GET /student` | `200`; totals 0, rates `null`, `scoreHistory []`, `skills []`, all months 0, insight `insufficient_data` | Pass — harness (SQLite) · Pass — jest |
| D2 | Only a draft evaluation | `S3` | `/students/{S3}` as admin | `finalizedEvaluations 0`, `averageEvaluationScore null`, no score history / criteria, skills React & Node.js with 0 scores, insight `insufficient_data` | Pass — harness (SQLite) |
| D3 | Only a completed internship (no evaluation, no feedback) | — | unit | index 0, `insufficient_data` (not 100 — see deviation) | Pass — jest · Pass — pytest |
| D4 | Company with no interns | `C_OUT` | `/company/top-performers` | `{candidates 0, unrated 0, rankings [], aiGenerated false}` | Pass — harness (SQLite) |
| D5 | Limit clamping | — | `?limit=500`, `?limit=0` | `limit 50`; `limit 1` and 1 row | Pass — harness (SQLite) |
| D6 | Division by zero | no decided applications, no submissions, no live internships | unit | `acceptanceRate`, `conversionRate`, `avgDaysToDecision`, `averageProgress`, `aiGeneratedShare` all `null` | Pass — jest |
| D7 | Month boundaries | — | unit | 12 keys ending in the current month; year roll-over (Aug 2025 → Jan 2026); `'2026-03-31'` stays March; out-of-window and future rows ignored | Pass — jest |
| D8 | Skill names | "react ", "REACT", "React" | unit | merged case-insensitively, profile spelling kept; change ±5 → improving/declining, 4.99 → stable | Pass — jest |
| D9 | Ranking ties | equal index | unit | more evaluations first, then higher feedback, then lower id | Pass — jest |
| D10 | More than 200 candidates | 450 records | unit | AI called in chunks 200/200/50 | Pass — jest |
| D11 | MySQL DECIMAL strings | `finalScore: '88.00'` | unit | parsed as numbers everywhere | Pass — jest |
| D12 | Same-day evaluations | equal `finalized_days_ago` | unit | input (finalize) order kept for the trend | Pass — jest · Pass — pytest |

## E. Integration

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| E1 | Module 9 finalize feeds analytics | evaluation adjusted and finalized via `/api/evaluations` | query analytics | score appears; drafts never do | Pass — harness (SQLite) |
| E2 | Module 10 feedback feeds analytics | feedback via `/api/feedback` | query analytics | counts, averages and recommend rate match `summarizeFeedback` | Pass — harness (SQLite) |
| E3 | Module 8 completion / time logs | internships completed via `/api/progress/:id/complete` | query | internship counts, completions per month, hours | Pass — harness (SQLite) |
| E4 | Module 4 status history | history rows | company funnel | stages from history counted | Pass — harness (SQLite) |
| E5 | AI contract | — | mapper field set = pydantic `StudentPerformanceIn` / `PerformanceEvaluationIn`; fallback = `PerformanceInsight` | exact field sets, types, clamping | Pass — jest |
| E6 | Python ↔ JS parity | 3,000 random records | Python rules vs JS fallback; then live `POST /performance-insights` vs JS fallback | 0 mismatches; 3,000 / 3,000 identical live | Pass — (scratch parity script) |
| E7 | Candidate page card | company opens `/company/candidates/{applicationId}` | UI | "Track record" section with index ring, band, trend, eval avg, feedback, completed; hidden on 403 | Not run — needs live stack |
| E8 | Dashboards render | each role | open `/student/analytics`, `/company/analytics`, `/admin/analytics` | charts and empty states render; 6/12 toggle refetches; interns/applicants toggle | Not run — needs live stack |
| E9 | 360 px layout | phone width | open each dashboard | no horizontal page scroll; tables scroll inside their card; month labels thin out | Not run — needs live stack |
| E10 | Real MySQL | MySQL | run the endpoints | same numbers as SQLite (GROUP BY / AVG / SUM only, no dialect date functions) | Not run — needs live stack |

## F. Permission / security

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| F1 | Unrelated company | `C_OUT` never received an application from `S1` | `/students/{S1}` as `C_OUT` | `403` | Pass — harness (SQLite) |
| F2 | Another student | — | `/students/{S1}` as `S2` | `403` | Pass — harness (SQLite) |
| F3 | Viewer never sees other pipelines | — | `/students/{S1}` as `C1` / `M` | no `summary.applications`, no `summary.interviews` | Pass — harness (SQLite) · Pass — jest |
| F4 | Student on company endpoints | — | `/company`, `/company/top-performers` as `S1` | `403` | Pass — harness (SQLite) |
| F5 | Company on admin | — | `/admin` as `C1` | `403` | Pass — harness (SQLite) |
| F6 | Mentor on the student endpoint | — | `/student` as `M` | `403` | Pass — harness (SQLite) |
| F7 | No token | — | `/admin`, `/students/{S1}` | `401` | Pass — harness (SQLite) |
| F8 | Company only sees its own organisation | — | `/company` as `C1` | only C1's tasks/applications/internships (C2's `T3` absent) | Pass — harness (SQLite) |
| F9 | Private closing rating | `performanceRating` set on completion (every harness internship) | any analytics response | never returned — no loader selects the column, and the harness compares summaries with exact-key `deepEqual` | Pass — harness (SQLite) |

## G. Regression

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| G1 | Backend unit suites | — | `npx jest` | all previous suites still pass | Pass — jest |
| G2 | AI suites | — | `python -m pytest -q` | all previous tests still pass | Pass — pytest |
| G3 | Module 8 smoke | — | harness `m8.smoke.test.js` | 1 / 1 | Pass — harness (SQLite) |
| G4 | Module 9 flow | — | harness `m9.flow.test.js` | 7 / 7 | Pass — harness (SQLite) |
| G5 | Module 10 flow (summary rule now exported) | — | harness `m10.flow.test.js` | 10 / 10 | Pass — harness (SQLite) |
| G6 | Frontend types / build | — | `npx tsc --noEmit`, `npx next build` | clean; build succeeds | Pass — tsc + next build |
| G7 | Navbar | each role | UI | Analytics link for student, company, admin (desktop + drawer); none for mentor; role homes unchanged | Not run — needs live stack |

---

## How to run (curl)

```bash
# Student: own dashboard (6 or 12 months)
curl -s "http://localhost:5000/api/analytics/student?months=12" -H "Authorization: Bearer $STUDENT_TOKEN"

# A company weighing up an applicant (viewer audience)
curl -s "http://localhost:5000/api/analytics/students/$STUDENT_ID" -H "Authorization: Bearer $COMPANY_TOKEN"

# Company dashboard and rankings
curl -s "http://localhost:5000/api/analytics/company?months=6" -H "Authorization: Bearer $COMPANY_TOKEN"
curl -s "http://localhost:5000/api/analytics/company/top-performers?scope=interns&limit=10" -H "Authorization: Bearer $COMPANY_TOKEN"
curl -s "http://localhost:5000/api/analytics/company/top-performers?scope=applicants" -H "Authorization: Bearer $COMPANY_TOKEN"

# Admin platform analytics (US-18)
curl -s "http://localhost:5000/api/analytics/admin" -H "Authorization: Bearer $ADMIN_TOKEN"

# The AI endpoint directly
curl -s -X POST http://localhost:8000/performance-insights -H "Content-Type: application/json" \
  -d '{"students":[{"id":"1","evaluations":[{"score":70,"finalized_days_ago":40},{"score":85,"finalized_days_ago":3}],
       "criteria_averages":{"quality":77.5,"effort":55},"feedback_average":4,"feedback_count":3,
       "recommend_rate":0.667,"completed_internships":2,"abandoned_internships":0,"on_time_rate":null}]}'
```

## Automated coverage (observed)

```bash
cd backend    && npx jest            # 257 passed — 8 suites (63 new: 57 analytics.rules + 6 analytics.aiContract)
cd ai-service && python -m pytest -q # 144 passed — 41 new in test_performance_insights.py
cd frontend   && npx tsc --noEmit    # clean
cd frontend   && npx next build      # succeeded (/student/analytics, /company/analytics, /admin/analytics built)
```

Integration harness (scratch, in-memory SQLite, not in the repo): the Module 11
flow file — 9 tests, 9 passed with the AI service down (fallback) and 9 passed
against a live `uvicorn` on port 8765 (`aiGenerated = true`, identical
rankings and numbers); Module 8 smoke 1/1, Module 9 flow 7/7, Module 10 flow
10/10. Parity: 3,000 random records identical between the Python rules and the
JS fallback, and 3,000/3,000 identical between the live endpoint and the
fallback. Everything marked *Not run — needs live stack* still needs a MySQL +
browser run.
