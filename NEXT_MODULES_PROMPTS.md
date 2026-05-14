# Smart AI Micro-Internship — AI Prompts for Modules 4, 5, 6

This document contains drop-in prompts for an AI assistant (Claude, Cursor, Copilot Chat, etc.) to build the next three modules of the Smart AI Micro-Internship platform:

- **Module 4 — Application Tracking**
- **Module 5 — Interview Scheduling**
- **Module 6 — AI-Based Matching**

Each prompt is **self-contained**: you can paste it on its own into a new chat and the AI will have enough context to produce code that matches your codebase.

---

## How to Use This Document

1. Pick the prompt you want to run (they are numbered, e.g. `Prompt 4.1`).
2. Copy the entire prompt block, including the **"Project Conventions"** section that appears at the top of each prompt — it tells the AI how your code is structured.
3. Paste into your AI tool. Let it generate files.
4. Review the generated diff, run `npm run dev` (backend) and `npm run dev` (frontend), set `DB_SYNC=alter` in `backend/.env` for the first run so new tables/columns are created.
5. Tick the **Definition of Done** checklist at the bottom of each prompt before moving to the next.

> **Order matters.** Do all of Module 4 before Module 5, and Module 5 before Module 6 — the schemas depend on each other (Interview references Application; AI matching uses Application history).

---

## Project Conventions (shared by every prompt)

> When you paste a prompt into the AI, this section is already included inside it. It is repeated here for your reference.

- **Backend:** Node.js + Express + Sequelize (MySQL). Entry point `backend/src/server.js`. Models register associations in `backend/src/models/index.js`. Tables auto-sync on boot via `DB_SYNC=alter`.
- **Model pattern:** Each model is a `class X extends Model` with its own `toJSON()` that adds a Mongo-style `_id` alias and flattens nested fields. Indexes and hooks live inside `Model.init({...}, { ... })`. See `backend/src/models/Task.js` for the canonical example.
- **Child tables:** Arrays of objects (skills, attachments) are stored in separate tables (e.g. `TaskSkill`, `TaskAttachment`) with `taskId` FK and `onDelete: 'CASCADE'`.
- **Controller pattern:** `backend/src/controllers/*.js`. Functions exported as `exports.fnName = async (req, res, next) => {...}`. Standard response shape: `{ success: true, data: <payload>, message?: <string> }`. Errors thrown via `next(new ErrorResponse(msg, status))` from `backend/src/utils/errorResponse.js`. Multi-table writes use `sequelize.transaction()`.
- **Mongo-compat translator:** Controllers accept Mongo-style nested bodies (`duration: { value, unit }`) and translate them to flat SQL columns (`durationValue`, `durationUnit`) via a small `flattenXBody` helper. See `flattenTaskBody` in `taskController.js`.
- **Routes:** `backend/src/routes/*.js`. Public routes first; then `router.use(protect)`; then role-gated routes with `authorize('student')` / `authorize('company')` / `authorize('admin')` from `backend/src/middleware/auth.js`. Mount in `server.js` under `/api/<resource>`.
- **Validation:** express-validator chains added to `backend/src/middleware/validation.js`, exported and applied in route files.
- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind. Code under `frontend/src/`. Route groups:
  - `(auth)` — login/signup
  - `(dashboard)` — role dashboards: `student/`, `company/`, `admin/`, `mentor/`
  - `(private-routes)` — authenticated cross-role pages (e.g. `tasks/`)
  - `(shared_routes)` — public-ish pages (company profile, profile)
- **API client:** `frontend/src/lib/api.ts` is an axios instance with the JWT interceptor.
- **Service layer:** `frontend/src/services/*.ts` — one file per backend resource. Pattern: export a `xxxService` object with async methods returning typed payloads. See `taskService.ts`.
- **Types:** `frontend/src/types/*.types.ts`. The frontend treats records as Mongo-style (`_id`, nested `duration`, `budget`, `location`) — the backend `toJSON()` already produces this shape.
- **AI Service:** FastAPI app under `ai-service/app/` with empty `routes/`, `services/`, `models/`, `utils/` folders ready to fill. Runs on port 8000 (docker-compose service name `ai-service`). Backend reaches it via `process.env.AI_SERVICE_URL` (default `http://localhost:8000` locally, `http://ai-service:8000` in docker).

---

# MODULE 4 — APPLICATION TRACKING

**Goal:** Students apply to tasks. Companies review applications and move them through statuses. Both sides can track everything.

---

## Prompt 4.1 — Backend: Application data model

```
You are working on the Smart AI Micro-Internship Program (Node.js + Express + Sequelize MySQL + Next.js).

PROJECT CONVENTIONS:
- Sequelize models live in backend/src/models/ and follow the pattern of backend/src/models/Task.js: `class X extends Model` with a `toJSON()` override that adds `_id = id` and flattens nested fields back into nested objects.
- Child / array-of-object data uses a separate table (e.g. TaskSkill, TaskAttachment) with a FK and `onDelete: 'CASCADE'`.
- All associations are registered in backend/src/models/index.js.
- DB sync is automatic on boot via DB_SYNC=alter.

TASK:
Add the data model for **Application Tracking** (Module 4 of the FYP).

Create the following files exactly:

1. backend/src/models/Application.js
   Fields:
   - id (BIGINT.UNSIGNED PK autoIncrement)
   - taskId (BIGINT.UNSIGNED, FK -> tasks.id, ON DELETE CASCADE, not null)
   - studentId (BIGINT.UNSIGNED, FK -> students.id, ON DELETE CASCADE, not null)
   - coverLetter (TEXT, not null, validate len 50..5000)
   - proposedRate (DECIMAL(12,2), nullable)            // for paid tasks
   - proposedCurrency (STRING(10), default 'USD')
   - expectedStartDate (DATE, nullable)
   - availabilityHoursPerWeek (INTEGER, nullable)
   - resumeUrl (STRING(500), nullable)                 // snapshot at time of apply
   - portfolioUrl (STRING(500), nullable)
   - status (ENUM 'submitted','under_review','shortlisted','interview_scheduled','accepted','rejected','withdrawn', default 'submitted')
   - matchScore (INTEGER 0..100, nullable)             // filled later by AI module
   - rejectionReason (STRING(500), nullable)
   - companyNotes (TEXT, nullable)                     // internal company-only notes
   - viewedByCompanyAt (DATE, nullable)
   - submittedAt (DATE, default NOW)
   - decidedAt (DATE, nullable)
   Indexes: [taskId,status], [studentId,status], [status], [submittedAt], UNIQUE [taskId,studentId]
   Hooks:
     - beforeSave: when status moves to accepted/rejected, set decidedAt = now if null.
   Instance methods:
     - canBeWithdrawnByStudent(): returns true if status in ['submitted','under_review','shortlisted']
     - canBeEditedByStudent(): returns true if status === 'submitted'
   Override toJSON() to add `_id`, expose nested `proposed: { rate, currency }`, and remove the flat versions, exactly like Task.js does for budget.

2. backend/src/models/ApplicationAttachment.js
   - id, applicationId (FK -> applications.id ON DELETE CASCADE)
   - name (STRING 255), url (STRING 500), type (STRING 100)
   - timestamps: false
   - toJSON adds _id

3. backend/src/models/ApplicationStatusHistory.js
   - id, applicationId (FK ON DELETE CASCADE)
   - fromStatus (STRING 30, nullable)
   - toStatus (STRING 30, not null)
   - changedByUserId (BIGINT.UNSIGNED, FK -> users.id, nullable for system changes)
   - reason (STRING 500, nullable)
   - createdAt (DATE, default NOW); no updatedAt
   - Indexes: [applicationId]
   - toJSON adds _id

4. Update backend/src/models/index.js:
   - require the 3 new files
   - Associations:
     Task.hasMany(Application, { foreignKey: 'taskId', as: 'applications', onDelete: 'CASCADE' });
     Application.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
     Student.hasMany(Application, { foreignKey: 'studentId', as: 'applications', onDelete: 'CASCADE' });
     Application.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
     Application.hasMany(ApplicationAttachment, { foreignKey: 'applicationId', as: 'attachments', onDelete: 'CASCADE' });
     ApplicationAttachment.belongsTo(Application, { foreignKey: 'applicationId' });
     Application.hasMany(ApplicationStatusHistory, { foreignKey: 'applicationId', as: 'statusHistory', onDelete: 'CASCADE' });
     ApplicationStatusHistory.belongsTo(Application, { foreignKey: 'applicationId' });
     User.hasMany(ApplicationStatusHistory, { foreignKey: 'changedByUserId', as: 'applicationStatusChanges' });
   - Export the new models.

DELIVERABLE: Print each file in full. Don't change any existing model files except index.js. Confirm tables will auto-create on next boot with DB_SYNC=alter.
```

**Definition of Done:**
- [ ] Three new model files exist.
- [ ] `index.js` requires them and wires associations.
- [ ] `npm run dev` boots without errors; `applications`, `application_attachments`, `application_status_history` tables appear in MySQL.

---

## Prompt 4.2 — Backend: Application controller, routes, validation

```
You are working on the Smart AI Micro-Internship Program (Node.js + Express + Sequelize MySQL).

PROJECT CONVENTIONS:
- Controllers in backend/src/controllers/*.js export functions as `exports.fnName = async (req, res, next) => {...}`.
- Standard response shape: `{ success: true, data, message? }`. Errors via `next(new ErrorResponse(msg, status))`.
- Multi-table writes wrap in `sequelize.transaction()` exactly like `createTask` in taskController.js.
- Routes file pattern: backend/src/routes/taskRoutes.js — public routes first, then `router.use(protect)`, then role-gated routes via `authorize('student')` / `authorize('company')`.
- Validation chains live in backend/src/middleware/validation.js using express-validator.
- Tasks have a `applicationCount` column. When a new Application is created, increment it; when withdrawn, decrement.
- Tasks have a `maxApplications` cap and `Task.canApply()` instance method — respect both.

CONTEXT:
The Application model exists with these statuses: submitted, under_review, shortlisted, interview_scheduled, accepted, rejected, withdrawn. Each status change must be logged in ApplicationStatusHistory.

TASK:
Create three files:

1. backend/src/controllers/applicationController.js with these exported handlers:

   STUDENT actions:
   - applyToTask(req, res, next)            POST /api/applications/tasks/:taskId
       Body (Mongo-style accepted): coverLetter, proposedRate?, proposedCurrency?,
       expectedStartDate?, availabilityHoursPerWeek?, resumeUrl?, portfolioUrl?,
       attachments?: [{name,url,type}].
       Rules:
         * Resolve req.user -> Student; 404 if no student profile.
         * Load Task; reject if !task.canApply() (deadline passed / capacity full / not active).
         * Reject if (taskId, studentId) already exists.
         * In a transaction: create Application, insert ApplicationAttachment rows,
           insert ApplicationStatusHistory (fromStatus=null, toStatus='submitted', changedByUserId=req.user.id),
           Task.applicationCount += 1.
   - getMyApplications(req, res, next)      GET  /api/applications/me
       Query: page=1, limit=10, status='all', sortBy='submittedAt', sortOrder='desc'.
       Include task with company (minimal attrs like in taskIncludes), include attachments.
       Return paginated shape identical to getMyTasks in taskController.js.
   - getMyApplication(req, res, next)       GET  /api/applications/:id    (student only, must own)
       Include task+company, attachments, statusHistory ordered ASC.
   - updateMyApplication(req, res, next)    PUT  /api/applications/:id    (student only, status must be 'submitted')
       Allows editing coverLetter, proposedRate, expectedStartDate, availabilityHoursPerWeek, portfolioUrl, attachments.
       Replace attachments wholesale (delete + bulkCreate) like updateTask does for skills.
   - withdrawMyApplication(req, res, next)  POST /api/applications/:id/withdraw
       Allowed only if application.canBeWithdrawnByStudent().
       Transaction: set status='withdrawn', append ApplicationStatusHistory, Task.applicationCount -= 1.

   COMPANY actions (must own the parent task):
   - getApplicationsForTask(req, res, next) GET  /api/applications/tasks/:taskId
       Query: page, limit, status='all', sortBy='submittedAt'|'matchScore', sortOrder.
       Verify req.user owns the company that owns the task.
       Include student (basic attrs: id, firstName, lastName, headline, avatar, locationCity, locationCountry, profileCompletion), attachments.
   - getApplication(req, res, next)         GET  /api/applications/:id        (company-side)
       Authorise: req.user.role === 'company' AND application.task.companyId === req.user's company.id.
       Side effect: if viewedByCompanyAt is null, set to now and save.
       Include student (with their skills + education), attachments, statusHistory.
   - updateApplicationStatus(req, res, next) PUT /api/applications/:id/status
       Body: { status, reason? }. Valid transitions:
         submitted        -> under_review | shortlisted | rejected
         under_review     -> shortlisted | rejected
         shortlisted      -> interview_scheduled | rejected | accepted
         interview_scheduled -> accepted | rejected
       Reject any other transition with 400.
       Transaction: update Application (set status, decidedAt if terminal, rejectionReason from reason),
                    insert ApplicationStatusHistory(fromStatus, toStatus, changedByUserId, reason).
   - updateCompanyNotes(req, res, next)     PUT /api/applications/:id/notes
       Body: { companyNotes }. Company-only field — never returned to student.
   - getApplicationStats(req, res, next)    GET /api/applications/company/stats
       Aggregate counts by status across all tasks of the requesting company,
       plus average matchScore, plus 7-day trend of new applications (group by DATE(submittedAt)).
       Return shape similar to getTaskStats.

   IMPORTANT — STUDENT-SIDE FILTERING:
   When returning data to a student, strip `companyNotes` and `rejectionReason` (unless status='rejected') from the JSON.
   Implement a small helper `sanitizeForStudent(json)` and apply it in getMyApplications / getMyApplication.

2. backend/src/routes/applicationRoutes.js
   Express router. All routes protected via `router.use(protect)`.
   Wire each handler with the right authorize() role:
     POST   /tasks/:taskId               authorize('student')
     GET    /me                          authorize('student')
     GET    /:id                         (both roles; controller checks ownership)
     PUT    /:id                         authorize('student')
     POST   /:id/withdraw                authorize('student')
     POST   /:id/status     -> rename to PUT /:id/status      authorize('company')
     PUT    /:id/notes                   authorize('company')
     GET    /tasks/:taskId               authorize('company')
     GET    /company/stats               authorize('company')
   Apply validators (next file).

3. Extend backend/src/middleware/validation.js
   Add two exported chains, mirroring validateTaskCreation/Update style:
   - validateApplicationCreation: coverLetter required len 50..5000; proposedRate optional numeric >=0; availabilityHoursPerWeek optional int 1..168; attachments optional array of {name,url,type} with type-checks.
   - validateApplicationStatusChange: status required in the enum; reason optional len <=500.

4. Wire the router in backend/src/server.js: `app.use('/api/applications', require('./routes/applicationRoutes'));` placed alongside the other mounts.

DELIVERABLES:
- Full code for the controller, routes, and the new validator chains.
- Print only the snippet to add to server.js.
- A short bullet list of all new endpoints and which role can hit each.
```

**Definition of Done:**
- [ ] `POST /api/applications/tasks/:taskId` with a valid student JWT creates an Application + history row, increments task.applicationCount.
- [ ] Cannot apply twice to the same task (uniqueness violation returns 400).
- [ ] Company can list applications, status transitions are enforced.
- [ ] Withdraw decrements applicationCount.

---

## Prompt 4.3 — Frontend: types + service for Applications

```
You are working on the Smart AI Micro-Internship Program frontend (Next.js 14 App Router + TS + Tailwind).

PROJECT CONVENTIONS:
- Types under frontend/src/types/<resource>.types.ts. Records are Mongo-style: `_id`, nested `proposed: { rate, currency }`, etc.
- Service files under frontend/src/services/<resource>Service.ts. They use the shared axios instance from `@/lib/api`. Pattern: export `xxxService` object with async methods returning typed shapes. See frontend/src/services/taskService.ts.

BACKEND (already built):
The new /api/applications/* endpoints exist (see Prompt 4.2). They return `{ success, data, message? }`. The Application object has fields:
  _id, taskId, task (populated), studentId, student (populated, company-side only),
  coverLetter, proposed: { rate, currency }, expectedStartDate, availabilityHoursPerWeek,
  resumeUrl, portfolioUrl, status, matchScore, rejectionReason (only when status='rejected'),
  companyNotes (company-side only), viewedByCompanyAt, submittedAt, decidedAt,
  attachments: [{_id,name,url,type}], statusHistory: [{_id, fromStatus, toStatus, reason, createdAt}].
Status values: 'submitted'|'under_review'|'shortlisted'|'interview_scheduled'|'accepted'|'rejected'|'withdrawn'.

TASK:
1. Create frontend/src/types/application.types.ts that defines:
   - ApplicationStatus union
   - ApplicationAttachment, ApplicationStatusHistoryEntry
   - Application interface
   - CreateApplicationData (the request body the student submits)
   - UpdateApplicationStatusData ({ status: ApplicationStatus; reason?: string })
   - ApplicationsResponse (with pagination shape identical to TasksResponse)
   - ApplicationStats (statusCounts: Record<ApplicationStatus, number>; averageMatchScore: number; dailyTrend: Array<{date:string, count:number}>)

2. Create frontend/src/services/applicationService.ts that exports `applicationService` with these methods:
   STUDENT:
   - applyToTask(taskId: string, data: CreateApplicationData): Promise<Application>
   - getMyApplications(page=1, limit=10, status='all', sortBy='submittedAt', sortOrder='desc'): Promise<ApplicationsResponse>
   - getMyApplication(id: string): Promise<Application>
   - updateMyApplication(id: string, data: Partial<CreateApplicationData>): Promise<Application>
   - withdrawMyApplication(id: string): Promise<Application>
   COMPANY:
   - getApplicationsForTask(taskId: string, page=1, limit=10, status='all', sortBy='submittedAt', sortOrder='desc'): Promise<ApplicationsResponse>
   - getApplication(id: string): Promise<Application>
   - updateStatus(id: string, payload: UpdateApplicationStatusData): Promise<Application>
   - updateNotes(id: string, companyNotes: string): Promise<Application>
   - getStats(): Promise<ApplicationStats>
   Also include presentation helpers (matching the style in taskService.ts):
   - getStatusColor(status): tailwind class string (green for accepted, red for rejected, blue for under_review, etc.)
   - getStatusLabel(status): human label ('Under Review', 'Shortlisted', ...)
   - canStudentWithdraw(status): boolean

DELIVERABLE: Print both files in full. Make sure imports use `@/lib/api`.
```

**Definition of Done:**
- [ ] `import { applicationService } from '@/services/applicationService'` resolves with no TS errors.
- [ ] Types match the backend payload shape exactly.

---

## Prompt 4.4 — Frontend: student-side Apply flow + My Applications page

```
You are working on the Smart AI Micro-Internship Program frontend (Next.js 14 App Router + TS + Tailwind).

PROJECT CONVENTIONS:
- Student dashboard pages live under frontend/src/app/(dashboard)/student/<feature>/page.tsx.
- The placeholder folder for this work already exists: frontend/src/app/(dashboard)/student/applications/.
- Task detail page is at frontend/src/app/(private-routes)/tasks/[taskId]/page.tsx — add the apply button there.
- Use `applicationService` from `@/services/applicationService` and `Application` type from `@/types/application.types`.
- For toasts/notifications, use whatever pattern is already wired up — read the existing dashboard pages and match.

CONTEXT:
Module 4 backend is done. Students can: POST /api/applications/tasks/:taskId to apply, GET /api/applications/me to list, GET /api/applications/:id to view, PUT to edit while status='submitted', POST /api/applications/:id/withdraw to withdraw.

TASK:

1. Create an `ApplyModal` component at frontend/src/components/applications/ApplyModal.tsx
   Props: { taskId: string; taskTitle: string; isOpen: boolean; onClose(): void; onSuccess(application): void; }
   Fields in the form:
   - coverLetter (textarea, 50–5000 chars, live counter)
   - proposedRate + proposedCurrency (only show if the parent task is paid — pass `taskBudgetType` as a prop and conditionally render)
   - expectedStartDate (date input)
   - availabilityHoursPerWeek (number input 1..168)
   - portfolioUrl (url, optional)
   - attachments: a simple "add attachment" UI that lets the user type/paste a name, url, type (we are not implementing file upload here — that's a later module; just collect metadata).
   Submit -> applicationService.applyToTask(taskId, data). On 400 from backend, show the server error message. On success, close + onSuccess.

2. In frontend/src/app/(private-routes)/tasks/[taskId]/page.tsx, add an "Apply now" button visible only when:
   - the viewer is authenticated as a student,
   - task.timeRemaining.expired === false,
   - task.applicationCount < task.maxApplications.
   The button opens ApplyModal. If the student has already applied (check via a new lightweight call, e.g. `applicationService.getMyApplications(1, 50, 'all').then(filter)` or a server-side flag if you add one), show "View your application" linking to /student/applications/[id] instead.

3. Build the student applications listing at
   frontend/src/app/(dashboard)/student/applications/page.tsx
   Features:
   - Tabs across the top: All | Submitted | Under Review | Shortlisted | Interview | Accepted | Rejected | Withdrawn.
   - Each tab fetches with the appropriate status filter.
   - Card list: company logo + task title, status badge (use applicationService.getStatusColor/getStatusLabel), submitted date, time-remaining if task still open, match score if present (badge "Match: 78%").
   - Pagination controls.
   - Empty state with link to /tasks to browse opportunities.

4. Build the detail page at
   frontend/src/app/(dashboard)/student/applications/[applicationId]/page.tsx
   - Header: task title, company, current status badge.
   - Sidebar: timeline rendered from application.statusHistory (oldest -> newest), formatted human dates.
   - Main body: read-only summary of the application; if status === 'submitted', show "Edit" and "Withdraw" buttons.
   - Edit opens a modal that reuses ApplyModal in edit mode (pre-filled).
   - Withdraw asks for confirmation, calls applicationService.withdrawMyApplication.

DELIVERABLE:
- Full code for all four files.
- A short list of any new shared UI primitives you introduce (Modal, Badge, etc.) — but reuse what already exists in frontend/src/components/ before adding new ones.
```

**Definition of Done:**
- [ ] Student can apply from a task detail page; the modal validates client-side and posts to the API.
- [ ] My Applications page lists, paginates, and filters by status.
- [ ] Detail page shows timeline; edit + withdraw work while status='submitted'.

---

## Prompt 4.5 — Frontend: company-side Applications / Candidates view

```
You are working on the Smart AI Micro-Internship Program frontend (Next.js 14 App Router + TS + Tailwind).

PROJECT CONVENTIONS:
- Company dashboard pages live under frontend/src/app/(dashboard)/company/<feature>/page.tsx.
- Placeholder folder already exists: frontend/src/app/(dashboard)/company/candidates/.
- Company tasks listing exists at frontend/src/app/(dashboard)/company/tasks/.
- Use applicationService from @/services/applicationService.

CONTEXT:
Module 4 backend is done. Companies can:
  GET /api/applications/tasks/:taskId  -> list applicants for one task
  GET /api/applications/company/stats   -> aggregate stats
  GET /api/applications/:id            -> single (also marks viewedByCompanyAt)
  PUT /api/applications/:id/status     -> change status (with allowed transition rules)
  PUT /api/applications/:id/notes      -> save private companyNotes

TASK:

1. Build the candidates inbox at
   frontend/src/app/(dashboard)/company/candidates/page.tsx
   - Top: 5 stat cards (total, new this week, shortlisted, interview, accepted) sourced from applicationService.getStats().
   - Below stats: filter bar with: select Task (populated from companyService.getMyTasks), select Status, sort dropdown (newest / oldest / highest match score).
   - Result: paginated grid of candidate cards. Each card:
       avatar + name, headline, location, applied X days ago,
       match score (color-coded), task title, status badge, "View" button.
       Unread indicator (small dot) if viewedByCompanyAt is null.

2. Build the candidate detail at
   frontend/src/app/(dashboard)/company/candidates/[applicationId]/page.tsx
   - Left column: student profile snapshot (avatar, name, contact, skills with levels, education, experience). Pull from the populated `application.student`.
   - Right column:
       - Tabs: Application | Attachments | Notes | History
       - Application tab: coverLetter, proposed rate, availability, expected start, links.
       - Attachments tab: list of attachments with download links.
       - Notes tab: textarea bound to companyNotes; save button calls applicationService.updateNotes.
       - History tab: full statusHistory timeline.
   - Action bar at top right: status dropdown reflecting the **allowed transitions** for the current status (use the same rule table as in the backend: submitted -> under_review/shortlisted/rejected, etc.). Changing the dropdown opens a small confirm dialog that asks for an optional reason, then calls applicationService.updateStatus.
   - When status is set to 'interview_scheduled', show a placeholder banner: "Schedule the interview from the Interviews tab" (Module 5 will wire this).

3. Add an "Applications: N" badge to each row in frontend/src/app/(dashboard)/company/tasks/page.tsx that links to /company/candidates?taskId=<id>.

DELIVERABLE: Full code for both new pages plus the small edit to the tasks list. Reuse Modal/Badge/Tabs from existing components — don't reinvent.
```

**Definition of Done:**
- [ ] Companies see real applicants for each task.
- [ ] Status changes enforce allowed transitions on the frontend (greyed-out invalid options).
- [ ] companyNotes save round-trips correctly; private notes never appear in student-side responses.

---

## Prompt 4.6 — Tests + manual QA checklist for Module 4

```
You are working on the Smart AI Micro-Internship Program.

TASK:
Create a manual QA test plan for Module 4 (Application Tracking) at:
  docs/qa/module-4-application-tracking.md

The plan must list ~20 test cases in this exact tabular format:

| # | Scenario | Pre-condition | Steps | Expected result |

Cover:
- Happy path apply (student) and verify task.applicationCount increments.
- Apply when task is closed / deadline passed -> 400.
- Apply twice -> 400 (unique constraint).
- Apply exceeds maxApplications -> 400.
- Cover letter shorter than 50 chars -> 400 from validator.
- Edit application while status='submitted' works; while status='under_review' returns 403.
- Withdraw: status flips, history row inserted, count decrements.
- Company sees applications only for their own tasks (cross-tenant check: tries to GET an application belonging to another company -> 403).
- Allowed status transitions enforced (a row of test cases for each invalid transition returning 400).
- viewedByCompanyAt is set on first company GET, not subsequent ones.
- companyNotes never leaks to student-side responses.
- rejectionReason returned to student only when status='rejected'.

Append a "How to run" section with the exact curl commands or HTTP client snippets for at least 5 of the cases.

DELIVERABLE: Just the markdown file.
```

**Definition of Done:**
- [ ] QA doc committed; every case walked through manually with screenshots captured for the FYP report.

---

# MODULE 5 — INTERVIEW SCHEDULING

**Goal:** When a company shortlists/interviews an applicant, they can schedule an interview with date/time/link. Both sides see it on a calendar. Optional reminders by email.

---

## Prompt 5.1 — Backend: Interview model + controller + routes

```
You are working on the Smart AI Micro-Internship Program (Node.js + Express + Sequelize MySQL).

PROJECT CONVENTIONS:
- See backend/src/models/Task.js for the canonical Sequelize model pattern (class extends Model, toJSON adds _id, nested objects re-built in toJSON).
- Multi-table writes go through sequelize.transaction().
- Standard response: { success: true, data, message? }.
- Routes: backend/src/routes/<resource>Routes.js, mounted in server.js. Public first, then `router.use(protect)`, then `authorize('student'|'company')`.
- Existing models you can reference: Application (taskId, studentId, status), Task, Company, Student, User.
- Email helper exists at backend/src/utils/sendEmail.js and templates in backend/src/utils/emailTemplates.js.

CONTEXT:
Module 4 is done. When an Application moves to status='interview_scheduled', an Interview row should already exist or be created at the same moment.

TASK:

1. Create backend/src/models/Interview.js
   Fields:
   - id (BIGINT.UNSIGNED PK)
   - applicationId (FK -> applications.id ON DELETE CASCADE, NOT NULL)
   - taskId (FK -> tasks.id, denormalised for fast lookup)
   - studentId (FK -> students.id, denormalised)
   - companyId (FK -> companies.id, denormalised)
   - scheduledAt (DATE, NOT NULL)
   - durationMinutes (INTEGER, default 30, min 15, max 180)
   - mode (ENUM 'video','phone','onsite', NOT NULL)
   - meetingLink (STRING(500), nullable)         // Zoom/Meet/Teams URL
   - meetingLocation (STRING(255), nullable)     // address for onsite
   - meetingPhoneNumber (STRING(50), nullable)
   - agenda (TEXT, nullable)
   - status (ENUM 'scheduled','rescheduled','completed','cancelled','no_show', default 'scheduled')
   - rescheduleCount (INTEGER, default 0)
   - cancellationReason (STRING(500), nullable)
   - companyFeedback (TEXT, nullable)
   - studentFeedback (TEXT, nullable)
   - companyRating (INTEGER 1..5, nullable)
   - studentRating (INTEGER 1..5, nullable)
   - timezone (STRING(50), default 'UTC')
   - createdByUserId (FK -> users.id)
   Indexes: [applicationId], [companyId, scheduledAt], [studentId, scheduledAt], [status, scheduledAt].
   Instance methods:
     - isUpcoming(): scheduledAt > now AND status in ('scheduled','rescheduled')
     - canBeRescheduledBy(user): true if user belongs to the company OR student AND isUpcoming() AND rescheduleCount < 3.
     - canBeCancelledBy(user): same predicate; also disallow cancel within 2 hours of scheduledAt unless admin.
   toJSON: add _id, nest meeting fields under `meeting: { link, location, phoneNumber }`, nest ratings under `ratings: { company, student }`.

2. Update backend/src/models/index.js with associations:
   Application.hasOne(Interview, { foreignKey: 'applicationId', as: 'interview', onDelete: 'CASCADE' });
   Interview.belongsTo(Application, { foreignKey: 'applicationId' });
   Task.hasMany(Interview, { foreignKey: 'taskId' });
   Company.hasMany(Interview, { foreignKey: 'companyId' });
   Student.hasMany(Interview, { foreignKey: 'studentId' });
   Interview.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
   Interview.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
   Interview.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

3. Create backend/src/controllers/interviewController.js with:
   - scheduleInterview(req, res, next)     POST /api/interviews/applications/:applicationId   (company only)
       Body (Mongo-style accepted):
         scheduledAt, durationMinutes?, mode, meeting?: { link?, location?, phoneNumber? }, agenda?, timezone?
       Rules:
         * Load Application; verify req.user owns the company that owns the task.
         * Application.status must be in ('shortlisted','under_review','submitted','interview_scheduled').
         * Reject scheduledAt in the past.
         * In a transaction: create Interview (denormalising taskId/studentId/companyId),
           if application.status !== 'interview_scheduled', update it to 'interview_scheduled' and append ApplicationStatusHistory row.
         * Send confirmation email to the student (use sendEmail + a new template `interviewScheduled`).
   - rescheduleInterview(req, res, next)   PUT  /api/interviews/:id/reschedule
       Body: { scheduledAt, reason? }. Allowed by either side (use canBeRescheduledBy).
       Transaction: bump rescheduleCount, set status='rescheduled', set scheduledAt; email the other party.
   - cancelInterview(req, res, next)       PUT  /api/interviews/:id/cancel
       Body: { reason }. Permission via canBeCancelledBy.
       On cancel, application.status remains 'interview_scheduled' but interview.status becomes 'cancelled' — the company can either schedule a new one or move the application to rejected.
   - completeInterview(req, res, next)     PUT  /api/interviews/:id/complete   (company only)
       Body: { companyFeedback?, companyRating? }. Sets status='completed'.
   - submitStudentFeedback(req, res, next) PUT  /api/interviews/:id/feedback   (student only, after status='completed')
       Body: { studentFeedback?, studentRating? }
   - getMyInterviews(req, res, next)       GET  /api/interviews/me
       Query: page, limit, scope='upcoming'|'past'|'all' (default 'upcoming'), role auto-detected from req.user.
       For students: filter by studentId; for companies: by companyId.
       Include Task (title), the other party (student basics or company basics), application.
   - getInterview(req, res, next)          GET  /api/interviews/:id
       Permission: user is the student OR is in the company owning it.
   - getCompanyInterviewStats(req, res, next) GET /api/interviews/company/stats
       Counts by status, upcoming count this week, average companyRating, average studentRating.

4. Create backend/src/routes/interviewRoutes.js wiring those handlers with `protect` and `authorize(...)` as appropriate. Mount in server.js at `/api/interviews`.

5. Add a new email template export in backend/src/utils/emailTemplates.js:
   - interviewScheduled({ studentName, companyName, taskTitle, scheduledAt, mode, meetingLink?, meetingLocation?, agenda? }) -> { subject, html, text }
   - interviewRescheduled({ ... new scheduledAt, reason })
   - interviewCancelled({ ... reason })

DELIVERABLE: Print every new/modified file in full. Confirm DB_SYNC=alter creates the `interviews` table.
```

**Definition of Done:**
- [ ] Scheduling an interview from an Application sets `Application.status = 'interview_scheduled'` and inserts a status history row.
- [ ] Email is sent to the student (check the dev mailer log).
- [ ] Reschedule limit of 3 enforced; cancel within 2h forbidden.

---

## Prompt 5.2 — Frontend: types + service + scheduling UI

```
You are working on the Smart AI Micro-Internship Program frontend.

CONTEXT:
Module 5 backend is done (/api/interviews/* endpoints exist; the Interview shape mirrors Mongo style with _id, nested `meeting`, nested `ratings`).

TASK:

1. Create frontend/src/types/interview.types.ts:
   - InterviewMode = 'video' | 'phone' | 'onsite'
   - InterviewStatus = 'scheduled' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show'
   - Interview interface (matching the backend toJSON output)
   - ScheduleInterviewData, RescheduleData, CancelData, CompleteData, StudentFeedbackData
   - InterviewsResponse with pagination
   - InterviewStats

2. Create frontend/src/services/interviewService.ts exposing `interviewService` with:
   - schedule(applicationId, data)
   - reschedule(id, data)
   - cancel(id, data)
   - complete(id, data)
   - submitStudentFeedback(id, data)
   - getMyInterviews(scope, page, limit)
   - getInterview(id)
   - getCompanyStats()
   plus helpers: formatScheduledAt(iso, timezone), getModeIcon(mode), getStatusColor(status).

3. Add a `ScheduleInterviewModal` component at
   frontend/src/components/interviews/ScheduleInterviewModal.tsx
   Props: { application: Application; isOpen; onClose; onScheduled(interview); }
   Fields:
     scheduledAt (date+time picker, min = now+30min)
     durationMinutes (select: 15, 30, 45, 60, 90)
     mode (radio: video / phone / onsite)
     based on mode: show meeting.link (video) | meeting.phoneNumber (phone) | meeting.location (onsite)
     agenda (textarea)
     timezone (select with sensible defaults — at minimum 'UTC' and the browser's Intl.DateTimeFormat().resolvedOptions().timeZone)
   On submit call interviewService.schedule.

4. Wire the modal into the candidate detail page from Module 4
   (frontend/src/app/(dashboard)/company/candidates/[applicationId]/page.tsx):
   - Add a tab "Interview". If application.interview exists, show its details + Reschedule / Cancel / Mark Complete buttons. Otherwise show a "Schedule interview" button that opens the modal. After success, refresh the application to pick up the new interview and the updated status.

DELIVERABLE: Print all files; print the diff against the candidate detail page.
```

**Definition of Done:**
- [ ] Company can schedule an interview from a candidate's page; UI updates to show the scheduled time.
- [ ] Reschedule / cancel / complete buttons appear in the right state and call the right endpoints.

---

## Prompt 5.3 — Frontend: interviews list + student view

```
You are working on the Smart AI Micro-Internship Program frontend.

TASK:

1. Build the company interviews page at
   frontend/src/app/(dashboard)/company/interviews/page.tsx
   - Top: stat cards (Upcoming this week, Scheduled, Completed, Cancelled, Avg student rating) from interviewService.getCompanyStats().
   - Tabs: Upcoming | Past | All.
   - List of cards (or table on >= md): student name + avatar, task title, scheduledAt formatted in their local timezone, mode icon, status badge, quick action buttons.
   - Clicking a card opens the candidate detail page from Module 4 with the Interview tab pre-selected (use a query param `?tab=interview`).

2. Build the student interviews page at
   frontend/src/app/(dashboard)/student/interviews/page.tsx
   - Tabs: Upcoming | Past.
   - Each card: company logo + name, task title, scheduledAt (local time), countdown ("in 2 days, 4 hours"), mode badge, link to join (if meeting.link present and within 15 min of start).
   - After the interview is marked completed by the company, show a "Leave feedback" CTA that opens a small modal calling interviewService.submitStudentFeedback.

3. Add an "Interviews" link to both role sidebars (look at the existing sidebar component under frontend/src/components and add an entry that follows the same icon+label+href pattern).

DELIVERABLE: Print every new file in full; list the exact line you added to the sidebar.
```

**Definition of Done:**
- [ ] Both roles have an interviews dashboard.
- [ ] Sidebar entry visible per role.
- [ ] "Join meeting" button appears within 15 min of `scheduledAt` for video interviews.

---

# MODULE 6 — AI-BASED MATCHING

**Goal:** Use the FastAPI `ai-service` to compute a match score for each (student, task) pair, drive personalised task recommendations on the student dashboard, and rank applicants for the company.

---

## Prompt 6.1 — AI service: skill matching + recommendation endpoints

```
You are extending the Smart AI Micro-Internship Program AI service (Python + FastAPI).

PROJECT LAYOUT:
- ai-service/app/  has empty folders: models/, routes/, services/, utils/.
- The FastAPI entrypoint should expose an HTTP API on port 8000. Use uvicorn.
- The service is reached by the Node backend via env var AI_SERVICE_URL (http://ai-service:8000 in docker, http://localhost:8000 locally).
- We do NOT want the AI service to talk to MySQL directly. The Node backend will POST the data the AI service needs.
- Requirements file: ai-service/requirements.txt — add: fastapi, uvicorn[standard], pydantic>=2, scikit-learn, numpy, sentence-transformers (optional, behind a feature flag).

TASK:

1. Create ai-service/app/main.py — FastAPI app with:
   - title="Smart AI Internship Matching Service"
   - CORS allowed origins from env BACKEND_URL and FRONTEND_URL
   - GET /health -> {status:'ok', version, model_loaded:bool}
   - include the routers from app.routes.match

2. Create ai-service/app/models/schemas.py with pydantic v2 models:
   - SkillIn: name: str, level: Literal['beginner','intermediate','advanced'] = 'intermediate'
   - StudentProfile: id: str, skills: list[SkillIn], experience_years: float = 0,
                    education_level: Literal['high_school','bachelors','masters','phd','other'] = 'other',
                    bio: str | None = None, interests: list[str] = []
   - TaskInput: id: str, title: str, description: str, category: str,
                experience_level: Literal['entry','intermediate','expert'],
                required_skills: list[SkillIn], tags: list[str] = []
   - MatchRequest: student: StudentProfile, tasks: list[TaskInput]
   - MatchScore: task_id: str, score: int (0..100), breakdown: dict[str,float],
                 matched_skills: list[str], missing_skills: list[str], reasons: list[str]
   - MatchResponse: student_id: str, results: list[MatchScore]

3. Create ai-service/app/services/matcher.py with the scoring engine:
   - A pure function `compute_match(student: StudentProfile, task: TaskInput) -> MatchScore`.
   - Score is a weighted average:
       skill_match * 0.55
     + experience_fit * 0.15
     + level_fit * 0.10
     + interest_overlap * 0.10
     + text_similarity * 0.10
   - skill_match: (count of required skills the student has) / max(1, len(required_skills)), weighted by level (beginner=0.6, intermediate=0.85, advanced=1.0). Required skills missing reduce score harder than nice-to-have.
   - experience_fit: maps experience_years to a 0..1 score depending on task.experience_level (entry: best at 0..1y, intermediate: best at 1..3y, expert: 3y+).
   - level_fit: simple table comparing dominant student skill level to required level.
   - interest_overlap: |student.interests ∩ task.tags| / max(1, |task.tags|).
   - text_similarity: TF-IDF cosine between task description and student bio+interests; if sentence-transformers is available (controlled by env AI_USE_EMBEDDINGS=true) use it instead, but make this optional so the service still starts without the model.
   - Round final score to nearest integer, clamp 0..100.
   - Populate reasons[] with human-readable bullets ("Strong match on 4/5 required skills", "Missing required skill: TypeScript").
   - The function must be deterministic for the same input.

4. Create ai-service/app/routes/match.py with:
   - POST /match   body=MatchRequest, response=MatchResponse
       Iterate all tasks, call compute_match, sort descending by score, return.
   - POST /rank-candidates   body={ task: TaskInput, candidates: list[StudentProfile] }
                              response={ task_id: str, ranking: list[{ student_id, score, breakdown, reasons }] }
       Same scoring engine, just transposed; use for ranking applicants of one task.

5. Add an ai-service/Dockerfile if one is missing (read the docker-compose.yml at project root to see what it expects). The service must start with: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

DELIVERABLE: Print every new file in full. Print the diff to requirements.txt.

QUALITY BAR:
- The /match endpoint must respond in < 500ms for 50 tasks on a laptop (TF-IDF only, no embeddings).
- No global mutable state.
- Tests: include a quick `pytest`-able test in ai-service/tests/test_matcher.py for compute_match with two deterministic cases (perfect match -> 95+; no skill overlap -> < 25).
```

**Definition of Done:**
- [ ] `curl http://localhost:8000/health` returns OK.
- [ ] `POST /match` with sample payload returns ranked task scores.
- [ ] `pytest` in `ai-service/` passes.

---

## Prompt 6.2 — Backend integration: real recommendations + match scores

```
You are working on the Smart AI Micro-Internship Program backend (Node.js + Express + Sequelize).

PROJECT CONVENTIONS:
- AI service URL comes from process.env.AI_SERVICE_URL (default http://localhost:8000).
- The AI service exposes POST /match (student + list of tasks -> ranked scores) and POST /rank-candidates (one task + list of students -> ranking).
- Existing `getRecommendedTasks` in backend/src/controllers/taskController.js currently returns the latest active tasks — replace it with real AI ranking.

TASK:

1. Create backend/src/services/aiService.js:
   - Export an async client wrapping axios (already in dependencies).
   - Functions:
       - matchTasksForStudent(studentDto, taskDtos) -> calls POST /match, returns the parsed `results`.
       - rankCandidates(taskDto, studentDtos) -> calls POST /rank-candidates, returns the ranking.
       - mapStudentToDto(student) -> the pydantic shape (id as string, skills with name+level, experience_years computed from StudentExperience aggregate, education_level from highest education, bio, interests from StudentSkill or tags).
       - mapTaskToDto(task) -> pydantic TaskInput (id, title, description, category, experience_level, required_skills, tags).
   - Timeouts: 8s. On failure, log and throw a typed error AIServiceUnavailableError that controllers can catch to fall back gracefully.

2. Rewrite exports.getRecommendedTasks in backend/src/controllers/taskController.js:
   - Load the Student profile + their skills + summary fields.
   - Load up to 100 candidate tasks (active, public, deadline > now, NOT already applied to by this student — left-join Application and filter where applicationId IS NULL).
   - Call aiService.matchTasksForStudent.
   - Re-fetch the top N (default 10) tasks with full includes (taskIncludes) and merge in the matchScore + reasons from the AI response.
   - On AIServiceUnavailableError: fall back to the current naive "latest createdAt" ordering and log a warning.
   - Response shape: same as before but each task object now has additional fields: `matchScore: number, matchReasons: string[]`.

3. In exports.getApplicationsForTask (backend/src/controllers/applicationController.js from Module 4) and exports.applyToTask:
   - When the company first loads applications for a task and any of them have matchScore=null, batch-call aiService.rankCandidates(task, studentsForThisTask), persist matchScore on each Application row.
   - When a student applies, kick off a fire-and-forget match calculation: immediately call aiService.matchTasksForStudent with just that one task, save matchScore on the new Application row (best-effort — do not block the API response on it).

4. Expose POST /api/tasks/:id/recompute-matches (authorize('company')) that forces recomputation for all applications of that task (use case: company updates the task's required skills).

DELIVERABLE: Print backend/src/services/aiService.js in full. Print the diff of the modified controller functions.
```

**Definition of Done:**
- [ ] `GET /api/tasks/recommendations` returns AI-scored, deduplicated tasks (no tasks the student already applied to).
- [ ] When AI service is offline, the endpoint still returns sensible results and the response is fast.
- [ ] Applications carry a matchScore that surfaces in the company candidates view.

---

## Prompt 6.3 — Frontend: match score UI + smarter recommendations

```
You are working on the Smart AI Micro-Internship Program frontend.

CONTEXT:
- /api/tasks/recommendations now returns tasks with matchScore (0..100) and matchReasons (string[]).
- The Application object now has matchScore on it for company-side views.

TASK:

1. Add a reusable component frontend/src/components/match/MatchScoreBadge.tsx:
   Props: { score: number; reasons?: string[]; size?: 'sm'|'md'|'lg' }
   - Renders a colored badge: 80+ green, 60..79 emerald, 40..59 amber, <40 gray/red.
   - On hover (or tap, mobile), shows a tooltip listing the top 3 reasons.
   - Accessible: aria-label "AI match score X out of 100".

2. Update the student dashboard at
   frontend/src/app/(dashboard)/student/dashboard/page.tsx:
   - Add a "Recommended for you" section that calls taskService.getRecommendedTasks(8) (it already exists).
   - Each task card displays MatchScoreBadge in the top-right corner.
   - Below the recommendation grid, add a small "Why these matches?" expand panel that shows one line per task with its top reason.

3. Update the tasks browse page frontend/src/app/(private-routes)/tasks/page.tsx:
   - For authenticated students, append a "Recommended" tab/sort option that orders by matchScore desc.

4. Update the company candidates page frontend/src/app/(dashboard)/company/candidates/page.tsx:
   - Add a sort option "Best match" (orders by application.matchScore desc).
   - Render MatchScoreBadge on every candidate card.

5. Add a small admin/owner button on the company task detail page (look for frontend/src/app/(dashboard)/company/tasks/[taskId]/... if it exists, else create one):
   - "Recompute match scores" — calls POST /api/tasks/:id/recompute-matches; shows a toast on success.

DELIVERABLE: Print all new files and diffs.

VISUAL GUIDANCE:
- Match badge: rounded-full, px-2, py-0.5, text-xs font-semibold; show "★ 87" style (star + score).
- Tooltip uses whatever tooltip primitive already exists in the project — search first; do not add a new dependency.
```

**Definition of Done:**
- [ ] Recommendations on the student dashboard show score badges and ordered by score.
- [ ] Company candidates page sortable by best match.
- [ ] "Recompute" button triggers backend AI re-ranking.

---

## Prompt 6.4 — Tests, observability, and docs for Module 6

```
You are working on the Smart AI Micro-Internship Program.

TASK:

1. Create ai-service/tests/test_matcher.py covering at minimum:
   - Perfect match: required_skills fully present at advanced level + tags overlap + matching experience -> score >= 90.
   - No match: zero skill overlap + opposite experience tier -> score <= 25.
   - Partial match: 2/3 required skills, one missing -> score between 50 and 75.
   - Deterministic: calling compute_match twice with the same input returns the same score.

2. Create backend/src/scripts/seedApplications.js that:
   - Picks N students with skill profiles already seeded,
   - For each active task, randomly creates 5..15 applications across different statuses,
   - Calls aiService to populate matchScore on each (or marks 'pending' if AI is down).
   Useful for demos. Run via `npm run seed:applications`.
   Add the script entry to backend/package.json scripts.

3. Add lightweight observability:
   - In backend/src/services/aiService.js, log each call duration in ms (use console.time/timeEnd or a tiny wrapper).
   - Track failure count per minute; expose via a new admin-only endpoint GET /api/admin/ai-health that returns { reachable: bool, p95LatencyMs, errorRatePerMin } based on an in-memory ring buffer (no Redis dep for this MVP).

4. Documentation:
   - Create docs/architecture/module-6-ai-matching.md explaining: data flow (frontend -> backend -> ai-service), scoring formula, weights, fallback behavior, env vars (AI_SERVICE_URL, AI_USE_EMBEDDINGS).
   - Include a sequence diagram in mermaid syntax: Student opens dashboard -> backend -> ai-service -> response -> frontend renders badges.

DELIVERABLE: All files printed in full. The docs/architecture file should be ~400 words plus the diagram.
```

**Definition of Done:**
- [ ] AI tests run green in CI.
- [ ] Seed script populates a realistic dataset for the demo.
- [ ] `/api/admin/ai-health` returns live metrics.
- [ ] Architecture doc explains the system end-to-end.

---

# Final Wrap-up Checklist (after all three modules)

Run these once everything above is built, before you call Modules 4–6 "done":

- [ ] `DB_SYNC=alter` boots without errors and creates: `applications`, `application_attachments`, `application_status_history`, `interviews`.
- [ ] Full happy path works in the UI as one user journey:
      1. Student browses /tasks → opens detail → applies.
      2. Company sees the application in /company/candidates with a match score.
      3. Company moves status to shortlisted → schedules interview.
      4. Both sides see the interview on their /interviews page; student gets the email.
      5. Company marks completed → student leaves feedback.
      6. Company moves application to accepted (or rejected) — status history reflects all transitions.
- [ ] AI service reachable; `GET /api/admin/ai-health` reports `reachable: true`.
- [ ] No console errors on any of the new pages.
- [ ] All new endpoints documented (either via Swagger if you have it set up, or a markdown file in `docs/api/`).
- [ ] Demo seed script `npm run seed:applications` produces a populated dataset for your FYP defence.

---

*Generated for: Smart AI Micro-Internship System — FYP Spring 2026 (SZABIST).*
*Authors: M. Osama Ahmad, Fahad Maqbool, M. Siyaf — Supervisor: Mr. Muhammad Qasim.*
