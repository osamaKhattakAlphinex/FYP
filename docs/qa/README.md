# QA documentation index — Modules 7–12

One QA plan per module. Every plan uses the same sections (Functional,
Positive, Negative, Edge cases, Integration, Permission / security,
Regression, and a UI walk-through where the module has pages) and the same
columns: `| # | Scenario | Pre-condition | Steps | Expected result | Status |`.

The **Status** column only records runs that were actually observed:

| Status | Meaning |
|---|---|
| `Pass — jest` | backend unit tests (`backend/tests/*.test.js`, no database) |
| `Pass — pytest` | AI-service unit tests (`ai-service/tests/`) |
| `Pass — harness (SQLite)` | real routes/controllers/models over in-memory SQLite, see the note below |
| `Pass — … + live uvicorn` | the harness run against a real AI service process |
| `Pass — live (recorded at Module 7 development, MySQL)` | recorded by the original developer on the full stack; Module 7 only |
| `Pass — tsc` / `Pass — next build` | frontend type-check / production build |
| `Fail — <reason>` | observed behaviour differs from the expected result; not fixed yet |
| `Not run — needs live stack` | UI pages, real MySQL, real SMTP, OAuth, live Stripe |

## Modules

Counts are taken row by row from each plan (every lettered case in sections A–H).
A row counts as **Pass** if its status starts with *Pass*, even when it lists
several evidence sources.

| Module | QA plan | Architecture | Cases | Pass | Fail | Not run | Automated suites that cover it |
|---|---|---|---|---|---|---|---|
| 7 — Mentor Assignment | [module-7-mentor-assignment.md](module-7-mentor-assignment.md) | — (no architecture doc; see the code in `backend/src/controllers/mentor*Controller.js`) | 74 | 64 | 0 | 10 | pytest `test_mentor_matcher.py` (7) · harness `m7.flow` (8/8) · 24 cases also recorded live on MySQL at development time |
| 8 — Progress Tracking | [module-8-progress-tracking.md](module-8-progress-tracking.md) | [module-8-progress-tracking.md](../architecture/module-8-progress-tracking.md) | 144 | 130 | 0 | 14 | jest `progress.rules` (53) + `progress.aiContract` (16) · pytest `test_progress_analyzer.py` (22) · harness `m8.flow` (17 pass / 1 skipped) + `m8.smoke` (1/1) |
| 9 — Automated Evaluation | [module-9-automated-evaluation.md](module-9-automated-evaluation.md) | [module-9-automated-evaluation.md](../architecture/module-9-automated-evaluation.md) | 69 | 57 | 0 | 12 | jest `evaluation.rules` (50) + `evaluation.aiContract` (11) · pytest `test_evaluator.py` (35) · harness `m9.flow` (7/7) |
| 10 — Feedback System | [module-10-feedback-system.md](module-10-feedback-system.md) | [module-10-feedback-system.md](../architecture/module-10-feedback-system.md) | 62 | 56 | 0 | 5 | jest `feedback.rules` (53) + `feedback.aiContract` (11) · pytest `test_feedback_assistant.py` (35) · harness `m10.flow` (10/10) |
| 11 — Performance Analytics | [module-11-performance-analytics.md](module-11-performance-analytics.md) | [module-11-performance-analytics.md](../architecture/module-11-performance-analytics.md) | 69 | 64 | 0 | 5 | jest `analytics.rules` (57) + `analytics.aiContract` (6) · pytest `test_performance_insights.py` (41) · harness `m11.flow` (9/9) |
| 12 — Payment Integration | [module-12-payment-integration.md](module-12-payment-integration.md) | [module-12-payment-integration.md](../architecture/module-12-payment-integration.md) | 84 | 76 | 0 | 8 | jest `payment.rules` (55) · harness `m12.flow` (14/14) |
| **Total** | | | **502** | **447** | **0** | **54** | |

Notes on the counts:

- Module 10 has one case (F11) whose status is *"Not asserted directly — by
  construction…"*; it is neither Pass nor Not run, so its row totals 62 =
  56 + 5 + 1.
- Module 8 A13 was the only **Fail** found (one blocked milestone reported as
  `openBlockerCount = 2`). It was fixed in `recalcProgressMetrics` and the
  harness re-run passes; see the Module 8 plan and the "Fixed issue" note in
  its architecture doc.
- Module 7's live-recorded passes were not re-run on MySQL for this revision;
  every one of them except registration (A1) and the OAuth clamp (F4, never
  run) was re-run in the harness.

## How to run all automated tests

```bash
# Backend unit tests (no database) — 312 tests, 9 suites
cd backend && npx jest

# AI service unit tests (use the system Python; the .venv lacks deps) — 144 tests
cd ai-service && python -m pytest -q

# Frontend
cd frontend && npx tsc --noEmit     # type-check
cd frontend && npx next build       # production build (slow)
```

Last observed: jest 312 passed, pytest 144 passed, `tsc --noEmit` clean.
`next build` was last run and recorded during Module 12 QA, not in the Module
7/8 documentation pass.

## Live-stack cases

Everything marked *Not run — needs live stack* needs the full system running
together: **MySQL** (the schema is created by `sequelize.sync({ alter: true })`
on first boot, `DB_SYNC=alter`), the **backend** on `:5000`, the **AI service**
(`uvicorn app.main:app` on `:8000`), the **frontend** on `:3000`, and, where the
case says so, SMTP credentials, Google OAuth credentials or Stripe test keys.
Each plan's *How to run* section has the curl commands; seed with
`node src/scripts/seedDemo.js`, `npm run seed:mentors` and
`npm run seed:progress` in `backend/`.

## About the SQLite harness

The `Pass — harness (SQLite)` results come from a scratch integration harness
used during development. It boots the real Express routes, controllers, models
and validators against an **in-memory SQLite** database (via Sequelize's
`dialectModule`), records outgoing email instead of sending it, and drives the
API over HTTP with `supertest` under `node --test`. It is **not part of this
repository** — it lived in a temporary working folder outside the repo — so
those results cannot be reproduced from the repo alone. It is strong evidence
that the logic and authorisation work end to end, but it is not MySQL: it runs
on a single connection (so concurrent-transaction cases could not be tested),
and MySQL-specific behaviour (`FULLTEXT` indexes, `SELECT … FOR UPDATE`,
`sync({ alter: true })` on an existing schema) is not covered by it.
