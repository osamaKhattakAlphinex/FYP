# Module 11 — Performance Analytics Dashboard

> **Requirement (FYP documentation §1.2.0.11 / §2.2.0.12).** *"The system shall
> provide an analytics dashboard that presents performance information in a
> clear and visual form. For students, the dashboard shall display their
> progress, scores, completed tasks, and skill improvements over time. For
> organizations, it shall summarize candidate performance and help identify
> high-performing students. The system shall update these analytics as new data
> is recorded so that the information always reflects the most recent
> activity."*
>
> US-18: *"As an administrator, I want to view platform analytics so that I can
> monitor growth and overall system health."* §1.5.1.3 (employers): *"Access
> performance analytics and candidate insights."* §1.5.1.4 (AI module):
> *"Predict performance based on historical data and patterns … Generate
> insights and recommendations for users and organizations."*

This document explains where every number on the three dashboards comes from,
who may see which analytics, how the performance index / trend / projection are
computed by the AI service (and by the identical backend fallback), and how the
module hooks into Modules 3–10.

---

## 1. Where the module sits

```
applications + status history (M3/M4) ─┐
interviews (M5) ────────────────────────┤
internship_progress, time logs,         │     analyticsService.js
  milestone submissions (M8) ───────────┼──►  pure builders  ──► /api/analytics/student
internship_evaluations + criterion      │     (plain arrays)       /api/analytics/students/:id
  scores — FINALIZED only (M9) ─────────┤                          /api/analytics/company
feedback (M10, summarizeFeedback) ──────┤                          /api/analytics/company/top-performers
users, companies, mentors, tasks ───────┘                          /api/analytics/admin
                                                   │
          per-student track records ──────────────►│ AI POST /performance-insights (batch)
                                                   └► JS fallbackPerformanceInsights (same rules)
```

**No new tables.** Every figure is recomputed on read from the authoritative
rows of Modules 3–10. That is how "update these analytics as new data is
recorded" is met, and it follows the Module 8 rule "derived numbers are always
recomputed" — there is no cache that can drift. The harness proves it: leaving
one new feedback record immediately changes the next ranking.

## 2. Code layout

`backend/src/services/analyticsService.js` has three layers:

1. **Pure builders** over plain arrays — `buildStudentAnalytics`,
   `buildCompanyAnalytics`, `buildAdminAnalytics`, `buildFunnel`,
   `averageDaysToDecision`, `criteriaAverages`, `skillGrowth`,
   `monthlySeries`, `studentPerformanceRecord`, `rankTopPerformers`. Unit-tested
   without a database (`analytics.rules.test.js`).
2. **The JavaScript copy of `performance_insights.py`** —
   `fallbackPerformanceInsights`, plus `runPerformanceInsights` (AI first, in
   batches of 200, all-or-nothing fallback) and `isUsableInsights`.
3. **Thin loaders** — `loadStudentData`, `loadPerformanceRecords`,
   `loadCandidateIds`, `topPerformersForCompany`, `loadCompanyData`,
   `loadAdminAggregates`. They fetch only the columns the builders read.

`controllers/analyticsController.js` does authorisation and response shaping;
`routes/analyticsRoutes.js` mounts it at `/api/analytics`.

### Conventions used in every payload

- **Finalized evaluations only.** A Module 9 draft is not a fact yet: it never
  contributes to an average, a score history, a skill trend, a grade
  distribution or the performance index. (Company analytics report the number
  of drafts separately so a company sees its own backlog.)
- **Feedback** (Module 10) has no draft state, so every record counts.
- **Rates** are 0..1 with 3 decimals; averages are 2 dp (index, projections
  and average progress 1 dp); `null` whenever there is nothing to divide by —
  never `0`, so "no data" is never displayed as "0 %".
- **Rounding** is half-up everywhere (`floor(x·10^p + 0.5)/10^p`), identical to
  the Python `_round`, so the AI service and the fallback produce the same digits.
- **Months** are bucketed in JavaScript on UTC dates (`'YYYY-MM'`), zero-filled
  for the last `?months=6|12` months (default 12). `DATEONLY` work dates are
  taken literally. No SQL date functions are used, so MySQL and SQLite agree.

## 3. Payloads

### Student — `buildStudentAnalytics`

| Field | Definition |
|---|---|
| `summary.applications` | `{total, byStatus (all 7 statuses), acceptanceRate = accepted ÷ (accepted + rejected)}` — withdrawn and pending applications are not decisions |
| `summary.interviews` | `{total, completed}` |
| `summary.internships` | `{total, byStatus, completed, active}` — active = not completed/abandoned |
| `summary.hoursLogged` | Σ time-log hours (the rows, not the cached column) |
| `summary.finalizedEvaluations`, `averageEvaluationScore`, `latestGrade` | finalized only; latest by `finalizedAt` |
| `summary.feedback` | `{count, averageOverall, recommendRate}` from Module 10's `summarizeFeedback` |
| `summary.onTimeSubmissionRate` | submissions with `wasLate = false` ÷ all submissions (Module 8's definition) |
| `scoreHistory` | finalized evaluations oldest first: `{evaluationId, progressId, taskTitle, companyName, finalScore, grade, finalizedAt}` |
| `hoursByMonth` | `[{month, hours}]`, zero-filled |
| `criteriaAverages` | per Module 9 metric, mean final criterion score (auto score if never adjusted) over finalized evaluations: `[{metric, average, samples}]`, metric order, unscored metrics omitted |
| `skills` | see below |
| `insight`, `aiGenerated` | the performance insight on this student's platform-wide record (§5) |

**Skill improvements over time.** Every skill on the student's profile **or**
required by the task of a **completed** internship, names merged
case-insensitively after trimming (the profile's spelling and level win). Per
skill: `internships` (completed internships whose task required it), `scores`
(the finalized scores of those internships, oldest first), `firstScore`,
`latestScore`, `change = latest − first` (null with fewer than two), and
`trend`: `improving` if change ≥ 5, `declining` if ≤ −5, otherwise `stable`;
`insufficient_data` with fewer than two scores. Sorted by internships, then
number of scores, then name.

**Audience.** `self` (the student, or an admin) gets everything. `viewer` (a
company or mentor) gets the same payload **without** `summary.applications`
and `summary.interviews` — the student's pipeline with *other* organisations is
none of the viewer's business; their performance record is exactly what they
are there to judge.

### Company — `buildCompanyAnalytics`

| Field | Definition |
|---|---|
| `summary.tasks` | `{total, byStatus}` over the company's tasks |
| `summary.applications` | `{total, byStatus}` for applications to those tasks |
| `summary.funnel` | stages `submitted → under_review → shortlisted → interview_scheduled → accepted`; an application *reached* a stage when the furthest stage it ever held (its current status **and** every `ApplicationStatusHistory.toStatus`) is at or beyond it. So a candidate rejected after shortlisting still counts in "shortlisted", and the funnel can never widen. `rate` = count ÷ all applications. |
| `summary.conversionRate` | accepted ÷ all applications |
| `summary.avgDaysToDecision` | mean (decidedAt − submittedAt) in days over accepted/rejected applications, 1 dp |
| `summary.interviews` | `{total, completed, no_show}` |
| `summary.internships` | `{total, byStatus, byHealth, averageProgress}` — health and average progress over **live** internships only (a closed internship's health is always `on_track` and would be noise) |
| `summary.evaluations` | `{finalized, drafts, averageScore, gradeDistribution A–F}` — scores from finalized only |
| `summary.feedbackGiven` | feedback written by the company account: `{count, averageOverall}` |
| `monthly` | `[{month, applications (by submittedAt), acceptances (accepted, by decidedAt), completions (completed internships, by completedAt)}]` |
| `tasks` | per task `{taskId, title, status, applications, accepted, completedInternships, averageEvaluationScore}`, most applications first, then task id |
| `topPerformers`, `aiGenerated` | the first 5 of the `interns` ranking |

### Top performers — `/company/top-performers?scope=&limit=`

1. **Candidates.** `interns` (default): students with a `completed` or
   `abandoned` internship with this company. `applicants`: every student who
   applied to one of its tasks.
2. **Records.** For each candidate a track record (`studentPerformanceRecord`):
   finalized evaluations `{score, finalized_days_ago}`, per-metric criteria
   averages, feedback average / count / recommend rate, completed and abandoned
   internships, on-time rate. For `interns` only rows **with this company**
   count; for `applicants` the student's **platform-wide** record counts (the
   point is to spot proven performers among new applicants).
3. **One AI batch** (`POST /performance-insights`; chunks of 200 if needed) or
   the fallback.
4. **Ranking** by performance index desc; ties → more finalized evaluations →
   higher feedback average → lower student id. Students whose band is
   `insufficient_data` are **not ranked**; the response reports how many
   (`unrated`) out of how many `candidates`.

Row: `{rank, student:{id, firstName, lastName, headline, profilePicture},
performanceIndex, band, trend, predictedNextScore, confidence,
averageEvaluationScore (plain mean), evaluationCount, feedbackAverage,
completedInternships, strengths[]}`. `limit` is clamped to 1..50 (default 10).

### Admin — `buildAdminAnalytics` (US-18)

Platform-wide counts come from `COUNT … GROUP BY` queries
(`findAll({attributes, group, raw:true})`) and `AVG`/`SUM` aggregates — no
table is loaded in full. Only rows **inside the month window** are fetched (one
or two date columns) for the monthly series, and bucketed in JavaScript.

`users {total, byRole, newByMonth}`, `companies {total}`,
`mentors {byVerificationStatus}`, `tasks {total, byStatus, byCategory (top 8)}`,
`applications {total, byStatus, monthly}`, `interviews {byStatus}`,
`internships {byStatus, byHealth (live), averageProgress (live), totalHoursLogged}`,
`evaluations {total, finalized, averageScore (finalized), gradeDistribution
(finalized), aiGeneratedShare}` — the share of evaluations scored by the AI
service rather than the fallback, a Module 9 health signal —
`feedback {total, averageOverall, byContext}`, `topCompanies` (top 5 by
completed internships, ties by company id) and `aiHealth`
(`aiService.getAIHealth()`: reachable, p95 latency, errors per minute, last
success).

## 4. Authorisation

| Endpoint | Rule |
|---|---|
| `GET /student` | `authorize('student')`; own record |
| `GET /students/:studentId` | the **Module 10 summary rule**, reused, not copied: `feedbackController.canSeeSummary` (now exported) — the student themself; an admin; a company the student has **applied to**; a mentor with a `pending`/`active`/`completed` assignment for the student. Otherwise `403`; unknown or non-numeric id `404`. Student and admin → `audience:'self'`; company and mentor → `audience:'viewer'`. |
| `GET /company`, `GET /company/top-performers` | `authorize('company')`; own organisation only (resolved from the token) |
| `GET /admin` | `authorize('admin')` |

All routes are behind `protect` (no token → `401`). `InternshipProgress.performanceRating`
(the private closing rating, Module 8) is never read by this module, so it can
never leak to a student.

## 5. AI integration — performance insights

`POST /performance-insights` (ai-service `app/services/performance_insights.py`,
`app/routes/performance.py`, schemas appended to `app/models/schemas.py`,
router registered in `main.py`). Deterministic, like the other engines.

Request: `{students: [StudentPerformanceIn]}` (1–200), each
`{id, evaluations:[{score 0–100, finalized_days_ago ≥ 0}], criteria_averages:
{metric: 0–100}, feedback_average 1–5|null, feedback_count, recommend_rate
0–1|null, completed_internships, abandoned_internships, on_time_rate 0–1|null}`.
Response: `{results: [PerformanceInsight]}` in input order —
`{id, performance_index 0–100, band, trend, trend_slope, predicted_next_score,
confidence 0–1, strengths[], focus_areas[], insights[]}`.

| Rule | Constant(s) |
|---|---|
| **Index** = weighted mean of the components the student has; missing components are dropped and the remaining weights renormalised | evaluation mean `0.5`, feedback `(r − 1)/4 · 100` `0.2`, reliability `completed ÷ (completed + abandoned) · 100` `0.15`, on-time `rate · 100` `0.15` |
| **Recency**: the evaluation mean is weighted `0.5^(days_ago / 180)` (rounded 6 dp, floor 0.01) so recent work counts more | `RECENCY_HALF_LIFE_DAYS = 180`, `RECENCY_MIN_WEIGHT = 0.01` |
| **Data requirement**: an index needs at least one finalized evaluation or one feedback average; otherwise index 0, band `insufficient_data`, confidence 0 | — (see deviations) |
| **Band** on the rounded index | ≥ 85 `excellent`, ≥ 70 `strong`, ≥ 50 `developing`, else `needs_support` |
| **Trend**: least-squares slope of the scores oldest → newest (by `finalized_days_ago` desc, ties keep input order), 2 dp | < 2 evaluations `insufficient_data`; slope ≥ 3 `improving`, ≤ −3 `declining`, else `stable` |
| **Prediction**: fitted line at the next index, clamped 0–100, 1 dp | only with ≥ 3 evaluations |
| **Confidence** = `min(1, n/4)·0.6 + 0.2 (any feedback) + 0.2 (on-time known)`, 3 dp | `CONFIDENCE_*` |
| **Strengths / focus areas**: criteria averages ≥ 80 / < 60, best/worst first, ties in metric order, max 3, with the default rubric's labels | `STRENGTH_AT`, `FOCUS_BELOW`, `MAX_AREAS` |
| **Insights**: at most 3 plain sentences in this order — trend (or why there is none), projection, reliability ("Finished 2 of 3 internships…"), feedback ("Average feedback rating 4.25/5 from 2 reviews, 50% would recommend."), on-time share | `MAX_INSIGHTS` — the "clear and understandable reasons" of §2.3.2.5 |

### Degradation and parity

`runPerformanceInsights` calls the AI service; on `AIServiceUnavailableError`
or an answer without the full shape (wrong length, ids out of order, missing
arrays) it uses `fallbackPerformanceInsights` for the **whole** batch — a
response never mixes the two — and endpoints report `aiGenerated`, exactly like
Modules 8–10. Programming errors are rethrown, not masked.

Parity was checked three ways: the unit tests pin the same hand-computed
numbers on both sides; 3,000 random records gave byte-identical JSON from the
Python rules and the JS fallback; and against a live `uvicorn` all 3,000 records
and the harness rankings were identical (QA doc, "Automated coverage"). To make
that possible both sides sum with plain left-to-right loops (never Python's
`sum`), round half-up, and format numbers so Python's text equals JavaScript's
`String(n)`.

## 6. API surface — `/api/analytics` (all `protect`)

| Method | Path | Roles (`authorize`) | Query | Returns |
|---|---|---|---|---|
| GET | `/student` | student | `months=6|12` | student payload, `audience:'self'` |
| GET | `/students/:studentId` | any (controller-checked) | `months` | student payload, `self` or `viewer` |
| GET | `/company` | company | `months` | company payload incl. `topPerformers` (5) |
| GET | `/company/top-performers` | company | `scope=interns|applicants`, `limit` (1–50) | `{scope, limit, aiGenerated, candidates, unrated, rankings}` |
| GET | `/admin` | admin | `months` | admin payload |

Validation (`validation.js`, Module 11 section): `months` ∈ {6, 12};
`limit` an integer (then clamped by the controller); `scope` ∈ {interns,
applicants}. Invalid values → `400 {errors:[…]}`.

## 7. Notifications

None. Analytics are read-only and have no events of their own.

## 8. Frontend

| File | Purpose |
|---|---|
| `types/analytics.types.ts`, `services/analyticsService.ts` | API client + labels (metrics, bands, trends, funnel stages), `monthLabel`, `percent` |
| `components/analytics/AnalyticsCard.tsx` | Chart frame with a built-in empty state |
| `components/analytics/StatTile.tsx` | Headline number (grid of 2 → 3 → 6 columns) |
| `components/analytics/MonthsToggle.tsx` | 6 / 12 months |
| `components/analytics/BarList.tsx` | Horizontal labelled bars |
| `components/analytics/MonthlyBars.tsx` | Vertical grouped bars per month (1–3 series), label thinning at 12 months, `sr-only` data table |
| `components/analytics/ScoreTrend.tsx` | SVG polyline of finalized scores with grade labels and grade-boundary guides; `role="img"` + summary label |
| `components/analytics/Funnel.tsx` | Centred funnel bars with counts and share |
| `components/analytics/DistributionBar.tsx` | A–F segmented bar + legend |
| `components/analytics/TrendBadge.tsx` | Improving / Steady / Declining / No trend yet |
| `components/analytics/InsightCard.tsx` | `IndexRing` (0–100, band-coloured), band, trend with slope, projection, confidence, strengths / focus chips, insight sentences, "finalized only" note, AI-unreachable notice worded like `ProgressReportPanel` |
| `components/analytics/SkillGrowthTable.tsx` | Skill, profile level, internships, scores oldest → latest, trend (scrolls inside its card on phones) |
| `components/analytics/TopPerformersTable.tsx` | Ranked list (stacks on phones) |
| `components/analytics/CandidatePerformanceCard.tsx` | Compact "Track record" section on the company candidate page; hides itself on 403/any error |
| `app/(dashboard)/student/analytics/page.tsx` | Student dashboard |
| `app/(dashboard)/company/analytics/page.tsx` | Company dashboard with the interns / applicants ranking toggle |
| `app/(dashboard)/admin/analytics/page.tsx` | Platform dashboard incl. AI service health |

No chart library was added — everything is divs, inline SVG and Tailwind. Every
chart has an empty state, so a new account sees an intentional page. Pages use
`useRoleProtection`. Navigation: `RoleNav.analytics` (optional) for student,
company and admin, rendered in `Navbar` (desktop icon link with `BarChart3` and
the mobile drawer), exactly like `progress`. Role homes are unchanged.

## 9. Hooks into completed modules

| File | Change | Why |
|---|---|---|
| `backend/src/controllers/feedbackController.js` | `exports.canSeeSummary = canSeeSummary` (one line + comment) | share Module 10's viewer rule instead of copying it |
| `backend/src/services/aiService.js` | appended `mapStudentPerformanceToDto`, `getPerformanceInsights`, field lists, batch limit | AI contract |
| `backend/src/middleware/validation.js` | `query` added to the express-validator import; appended Module 11 section | query validation |
| `backend/src/server.js` | mount `/api/analytics` | new routes |
| `ai-service/app/main.py` | import + include the `performance` router | new endpoint |
| `ai-service/app/models/schemas.py` | `Annotated` added to the typing import; appended Performance* schemas | contract |
| `frontend/src/lib/roleRoutes.ts` | optional `analytics` entry for student, company, admin | navigation |
| `frontend/src/components/shared/Navbar.tsx` | `BarChart3` icon; render `analytics` (desktop + drawer) | navigation |
| `frontend/.../company/candidates/[applicationId]/page.tsx` | import + mount `CandidatePerformanceCard` in the student snapshot card | candidate insights (§1.5.1.3) |

Nothing else in Modules 1–10 changed. `summarizeFeedback` (Module 10) and
`InternshipEvaluation.gradeFor` / `STATUSES` (Module 9) are reused as-is.

### Design decisions / deviations from the spec

- **Reliability and on-time data alone do not produce an index.** The spec's
  rule "no components → insufficient_data" would give a student whose only
  record is one completed internship a perfect 100 (reliability 100 %,
  renormalised to weight 1) and rank them above students with excellent
  finalized evaluations — the harness dataset showed exactly that for the
  student whose only evaluation is still a draft. The index therefore requires
  at least one finalized evaluation or one feedback average; reliability and
  on-time still contribute once that exists. Implemented identically on both
  sides and tested.
- **Unrated candidates are excluded from the ranking** and reported as
  `unrated`/`candidates`, rather than listed at the bottom with index 0.
- **Rows carry `band`, `confidence`, `predictedNextScore` and `rank`** in
  addition to the spec's fields; the response carries `candidates` and `unrated`.
- **Audience:** an admin also gets `audience:'self'` on `/students/:id` (platform
  monitoring), not only the student.
- **`summary.finalizedEvaluations`** and **`summary.evaluations.drafts`** were
  added so the UI can say "no finalized evaluations yet" / show a company its
  draft backlog.
- **`averageProgress` and `byHealth` cover live internships only**, for both
  company and admin (a closed internship's health is always `on_track`).
- **`feedbackGiven`** for a company = records authored by the company account
  (mentor-authored feedback on its interns is not "given" by the company).
- **InsightCard uses its own `IndexRing`** rather than `ProgressRing`, because
  `ProgressRing` renders "%" and announces "complete", which would misdescribe
  an index.
- `hoursLogged` sums the time-log rows (authoritative) rather than the cached
  `totalHoursLogged` column; the two are equal whenever Module 8's recalculation
  has run.

## 10. Testing

| Layer | File | Count |
|---|---|---|
| Every pure builder, fallback insight rules, AI/fallback switching, batching, ranking | `backend/tests/analytics.rules.test.js` | 57 jest |
| DTO ↔ pydantic field sets, types, clamping, fallback response shape | `backend/tests/analytics.aiContract.test.js` | 6 jest |
| AI engine + endpoint | `ai-service/tests/test_performance_insights.py` | 41 pytest cases |
| HTTP flows with exact numbers on in-memory SQLite (scratch harness, not in repo) | `m11.flow.test.js` | 9 scenarios, run with the AI down and live |

See `docs/qa/module-11-performance-analytics.md` for the scenario table and the
observed counts.
