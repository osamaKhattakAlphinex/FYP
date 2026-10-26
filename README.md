# NexIntern: Smart AI Micro-Internship Platform

NexIntern connects university students with short, paid micro-internships posted by companies. Students build a profile and get tasks ranked by how well they fit; companies post tasks, review ranked applicants, interview and evaluate them; mentors guide students through the work. Every AI score comes with written reasons.

- **Live:** https://fyp-two-green.vercel.app
- **Case study:** https://osama-s-porfolio-beige.vercel.app/projects/nexintern

Final-year project for the BS in Software Engineering at SZABIST Islamabad, designed and built by [Osama Khattak](https://osama-s-porfolio-beige.vercel.app).

## Architecture

Three services: a Next.js front end, an Express API that owns the data and business rules, and a Python FastAPI service for the AI scoring.

```
┌──────────────────┐      ┌──────────────────────┐      ┌─────────────┐
│ Next.js frontend │ ───▶ │ Express + Node.js API│ ───▶ │  MySQL 8    │
│  (port 3000)     │      │  (port 5000)         │      │ (Sequelize) │
└──────────────────┘      └──────────┬───────────┘      └─────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ FastAPI AI service   │
                          │  (port 8000)         │
                          └──────────────────────┘
```

The API calls the AI service for matching, progress risk, evaluation, feedback drafting and performance insights. If the AI service is unreachable, the API falls back to its own copy of the same rules, so the platform keeps working.

> **Database history:** the project started on MongoDB with Mongoose. In May 2026, at my supervisor's request, I moved it to MySQL with Sequelize, splitting nested data (student skills, education, task attachments and so on) into their own tables.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI, Formik + Yup, Axios |
| Backend | Node.js, Express 4, Sequelize 6 on MySQL 8, JWT, Passport (Google OAuth), bcrypt, Multer, Nodemailer or Brevo for email |
| Security | Helmet, CORS, express-rate-limit, express-validator, xss-clean |
| AI service | Python 3.11, FastAPI, Pydantic, scikit-learn (TF-IDF), optional sentence-transformers embeddings |
| Payments | Stripe Checkout over Stripe's REST API, with signed webhooks and a sandbox provider for testing |
| Testing | Jest + Supertest (backend), pytest (AI service) |
| Deployment | Vercel (frontend), Render (API), managed MySQL over TLS, Docker and docker-compose for local runs |

## Features

**Accounts and roles**
- Four roles with their own dashboards: student, company, mentor and admin
- Registration with email verification by one-time code, password reset and Google sign-in
- JWT authentication with role-based route protection on both the API and the frontend

**Students**
- Profile with skills, education, experience, projects and certificates
- Task recommendations ranked by match score, applications and interview tracking
- Internship progress with milestones, time logs and submissions; mentorship; feedback, analytics and payouts

**Companies**
- Task posting with required skills and an evaluation rubric
- Applicants ranked by match score, interviews, mentor assignment and progress monitoring
- Analytics and payments

**Mentors and admins**
- Mentors review assigned students' progress and give feedback
- Admins verify mentors and oversee platform analytics and payments

**Evaluation and trust**
- Rubric-based evaluations, finalized with reviewer sign-off and checkable by anyone at `/verify/<code>`
- Feedback assistant that drafts balanced feedback and flags personal or insulting language before it is saved

## AI service

Every engine is deterministic: the same input always gives the same output, and every score comes with plain-language reasons. Nothing is a black box, so each number can be explained in a viva or to a user.

| Endpoint | What it does |
| --- | --- |
| `POST /match` | 0-100 match score between a student and a task |
| `POST /rank-candidates` | Ranks a task's applicants by match score |
| `POST /rank-mentors` | Suggests mentors for a student |
| `POST /progress-insight` | Performance indicators and early delay warnings for an internship |
| `POST /evaluate-internship` | Scores each rubric criterion with a rationale and evidence |
| `POST /feedback-assist` | Drafts feedback and reviews tone |
| `POST /performance-insights` | Performance index, score trend and projection |
| `GET /health` | Service status and whether the embedding model is loaded |

The match score is a weighted sum: skill match 55%, experience fit 15%, level fit 10%, interest overlap 10% and text similarity 10% (TF-IDF, or sentence embeddings when `AI_USE_EMBEDDINGS=true`). See [docs/module-6-matching-explained.md](./docs/module-6-matching-explained.md).

## Modules

| # | Module | Status | Docs |
| - | ------ | ------ | ---- |
| 4 | Application Tracking | ✅ | [QA plan](./docs/qa/module-4-application-tracking.md) |
| 5 | Interview Scheduling | ✅ | — |
| 6 | AI-Based Matching | ✅ | [Architecture](./docs/architecture/module-6-ai-matching.md) |
| 7 | Mentor Assignment | ✅ | [QA plan](./docs/qa/module-7-mentor-assignment.md) |
| 8 | Progress Tracking | ✅ | [Architecture](./docs/architecture/module-8-progress-tracking.md) · [QA plan](./docs/qa/module-8-progress-tracking.md) |
| 9 | Automated Evaluation | ✅ | [Architecture](./docs/architecture/module-9-automated-evaluation.md) · [QA plan](./docs/qa/module-9-automated-evaluation.md) |
| 10 | Feedback System | ✅ | [Architecture](./docs/architecture/module-10-feedback-system.md) · [QA plan](./docs/qa/module-10-feedback-system.md) |
| 11 | Performance Analytics | ✅ | [Architecture](./docs/architecture/module-11-performance-analytics.md) · [QA plan](./docs/qa/module-11-performance-analytics.md) |
| 12 | Payment Integration | ✅ | [Architecture](./docs/architecture/module-12-payment-integration.md) · [QA plan](./docs/qa/module-12-payment-integration.md) |
| 13 | Document Verification | ⏳ | — |

## Running it locally

### Option 1: Docker

```bash
docker compose up --build
```

This starts MySQL, Redis, the API, the AI service and the frontend with the settings in `docker-compose.yml`.

### Option 2: each service by hand

**Prerequisites:** Node.js 18+, Python 3.11, MySQL 8.

**1. Backend API** (http://localhost:5000, health check at `/health`)

```bash
cd backend
cp .env.example .env      # set DB_*, JWT_SECRET, FRONTEND_URL, AI_SERVICE_URL and email settings
npm install
npm run dev
```

Every setting is documented in [`backend/.env.example`](./backend/.env.example), including Google OAuth, Stripe, file storage and the admin account.

**2. AI service** (http://localhost:8000)

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional settings: `AI_USE_EMBEDDINGS=true` (semantic similarity), `AI_EMBEDDING_MODEL`, and `BACKEND_URL`, `FRONTEND_URL` or `AI_EXTRA_ORIGINS` for CORS.

**3. Frontend** (http://localhost:3000)

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
npm install
npm run dev
```

### Demo data

```bash
cd backend
node src/scripts/seedDemo.js   # users, tasks, applications
npm run seed:mentors           # mentors and mentor assignments
npm run seed:progress          # internship progress

# Administrator account (the seeds above don't create one)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<a strong password>' npm run seed:admin
```

More detail in [backend/SEEDING_GUIDE.md](./backend/SEEDING_GUIDE.md).

## Tests

```bash
cd backend && npm test        # Jest: business rules and AI-service contracts
cd ai-service && pytest       # every AI engine
```

A Postman collection is in [`backend/postman_collection.json`](./backend/postman_collection.json). Test plans for modules 4 and 7-12 are in [docs/qa](./docs/qa/README.md).

## Deployment notes

- **Frontend:** Vercel, with `NEXT_PUBLIC_API_URL` pointing at the API.
- **API:** Render, started with `npm run start:render`. It seeds demo data into an empty database when `SEED_IF_EMPTY=true` and creates the admin account when `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set.
- **Database:** managed MySQL with `DB_SSL=true` (paste the provider's CA into `DB_SSL_CA` to verify the certificate).
- **Uploads:** set `FILE_STORAGE=db` on hosts whose disk is wiped on every deploy, so avatars, résumés and attachments are kept in MySQL.
- **Email:** set `BREVO_API_KEY` to send over HTTPS where the host blocks SMTP ports.
- Set `TRUST_PROXY=1` behind a hosting proxy so rate limiting sees real client IPs.

## Project structure

```
├── frontend/            Next.js app (App Router): pages, components, contexts, services
├── backend/             Express API: config, controllers, middleware, models, routes, services
│   └── tests/           Jest tests
├── ai-service/          FastAPI service: routes, services (the engines), schemas
│   └── tests/           pytest tests
├── docs/                Architecture notes and QA plans per module
└── docker-compose.yml   Local stack: MySQL, Redis, API, AI service, frontend
```

## Author

**Osama Khattak** · full-stack Next.js / MERN developer, Islamabad
[Portfolio](https://osama-s-porfolio-beige.vercel.app) · [LinkedIn](https://www.linkedin.com/in/osama-khattak-253626365/) · [GitHub](https://github.com/osamaKhattakAlphinex)
