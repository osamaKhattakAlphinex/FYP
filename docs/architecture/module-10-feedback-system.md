# Module 10 — Feedback System

> **Requirement (FYP documentation §1.2.0.10 / §2.2.0.6).** *"The system shall
> allow employers and mentors to provide structured feedback on a student's
> performance after tasks or interviews are completed. This feedback may include
> written comments, ratings, and specific suggestions for improvement. Students
> shall be able to view the feedback so that they can understand their strengths
> and the areas that need further development. The system shall store feedback
> against the relevant task so that it becomes part of the student's overall
> performance record."*
>
> User story US-14: *"As a company, I want to provide feedback and ratings after
> interviews so that students can improve and others can trust the results."*
> The ethical NFR (§2.3.2.5) asks the platform to treat users respectfully and
> protect them from misuse.

This document explains how that requirement is realised: what a feedback record
holds, when it can be written and by whom, how the student reads and answers it,
how the assistant helps authors write useful and respectful feedback, and how
the module degrades when the AI service is unavailable.

---

## 1. Where the module sits

```
Module 5 Interview (completed) ─┐
                                ├─► Feedback (one per author per internship / interview)
Module 8 Internship (closed) ───┘        │  stored against applicationId · studentId · taskId · companyId
                                         │
Module 9 Evaluation criteria ──► /feedback/assist (draft + review) ──► AI /feedback-assist
Module 8 indicators ───────────┘                                   └─► JS fallback (same rules)
```

What already existed and is **not** duplicated or changed:

| Existing | What it is | Module 10's relation |
|---|---|---|
| `Interview.companyFeedback/companyRating` (M5) | Quick note typed when marking an interview complete | Left as-is. Module 10 adds a structured record next to it. |
| `MentorAssignment.*Rating/*Feedback` (M7) | Ratings *of the mentorship* | Different subject; untouched. |
| `InternshipProgress.performanceRating` (M8) | Private closing rating, stripped from students | Still stripped. It only **prefills** the company's own form; the author then chooses what to share. |
| `InternshipEvaluation` (M9) | Rubric scores | Used as evidence by the assistant; never altered. |

## 2. Data model — `feedback` (`Feedback`)

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `context` | ENUM `internship`,`interview` | What the record is about |
| `progressId` | FK `internship_progress` CASCADE, null | Set for `internship` |
| `interviewId` | FK `interviews` CASCADE, null | Set for `interview` |
| `applicationId`, `studentId`, `taskId`, `companyId` | FKs CASCADE | Denormalised: "stored against the relevant task" and part of the student's record without joins |
| `authorUserId` | FK `users` SET NULL | The record outlives the author's account |
| `authorRole` | ENUM `company`,`mentor` | |
| `authorName` | STRING(200) | Snapshot, so it reads correctly later |
| `overallRating` | INT 1–5, required | |
| `ratings` | JSON | Optional 1–5 per dimension: `technical`, `communication`, `professionalism`, `problemSolving`, `teamwork` |
| `strengths`, `improvements` | TEXT ≤ 4000 | At least 20 characters across the two |
| `suggestions` | JSON array | 0–5 items, each 5–300 chars |
| `wouldRecommend` | BOOLEAN null | |
| `aiAssisted` | BOOLEAN | Author started from the assistant's draft (shown as a badge) |
| `studentAcknowledgedAt`, `studentResponse` (≤ 2000), `studentRespondedAt` | | The student's read receipt and optional reply |
| `editedAt` | DATE | Set on every author edit |

Indexes: unique `[authorUserId, progressId]`, unique `[authorUserId, interviewId]`
(declared only in `indexes` — a column-level `unique` duplicates the index on
every MySQL `sync({ alter: true })`, found in Module 9; NULLs never collide, so
an interview record's null `progressId` does not clash), plus
`[studentId, createdAt]`, `[companyId]`, `[taskId]`.

Associations (`models/index.js`): Student / Task / Company / InternshipProgress /
Interview / Application `hasMany Feedback as 'feedback'`; Feedback `belongsTo`
each (`student`, `task`, `company`, `progress`, `interview`, `application`) and
`belongsTo User as 'author'`.

`toJSON()` adds `_id`, whitelists and numbers the dimension ratings, parses JSON
columns that MySQL may return as strings, and adds `averageDimensionRating`.

## 3. Lifecycle

```
            (internship completed|abandoned, or interview completed)
author ──── POST /feedback ──► [unacknowledged] ──► PUT /:id (edit; editedAt)
                                     │               DELETE /:id (author)
                                     │
student ─── PUT /:id/acknowledge ───►[acknowledged] (locked: author can no longer edit or delete)
            {response?}  → author emailed if a reply was left
admin ───── DELETE /:id  (moderation, any time)
```

- **When it opens.** Internship feedback opens once the internship is
  `completed` **or** `abandoned` (both are closed; an abandoned internship
  still deserves an honest account). Interview feedback opens once the
  interview is `completed`.
- **One per author.** A second attempt returns `409 "You have already left
  feedback here — edit it instead"`. The unique index is the final guard
  against two racing submits.
- **The acknowledgement lock.** Once the student has read (and maybe answered)
  the feedback, changing it would rewrite what they responded to, so edit and
  author-delete stop (`409`). Admin moderation deletion still works.

## 4. Authorisation

Predicates live on the model, take the Module 8 actor from
`progressController.resolveActor` (already exported), resolved against the
record's `applicationId` so a mentor's assignment on *that* internship counts.

| Action | Rule |
|---|---|
| Author internship feedback (`canAuthorInternshipFeedback`) | status ∈ {completed, abandoned} **and** (owning company **or** mentor with an active *or completed* assignment on the application). Admin is a moderator, not an author. |
| Author interview feedback (`canAuthorInterviewFeedback`) | interview `completed` **and** owning company (US-14) |
| View (`canBeViewedBy`) | admin; the student it is about; the author; the owning company (sees a mentor's feedback on its task too); an assigned mentor — internship context only |
| Edit (`canBeEditedBy`) | author (`authorUserId === actor.userId`) and not acknowledged |
| Delete (`canBeDeletedBy`) | author before acknowledgement, or admin any time |
| Acknowledge (`canBeAcknowledgedBy`) | the student it is about, once |
| Student summary | the student; admin; a company the student has **applied to** (an application exists on one of its tasks); a mentor with a `pending`/`active`/`completed` assignment for the student |

Refusals are graded so the UI can explain them: a would-be author on an open
internship gets `400 "Feedback opens once the internship is completed or
closed"`; anybody else gets `403`. The progress/interview thread endpoints
return `permissions.isAuthorRole` so the tab can say "not yet" rather than
nothing.

## 5. AI integration — the feedback assistant

`POST /feedback-assist` (ai-service `app/services/feedback_assistant.py`,
route `app/routes/feedback.py`, schemas appended to `schemas.py`). Deterministic,
like the other engines: named constants and short rules, same input → same
output. It does two jobs.

**Drafting** (internship):

- Evidence = the Module 9 evaluation's criterion scores (finalized **or**
  draft — the assist is author-only) plus Module 8 indicators from
  `evaluationService.loadEvidence`. When no evaluation exists (e.g. an
  abandoned internship), the Module 9 rules are run on the fly over the task
  rubric via `evaluationService.fallbackEvaluation` — nothing is stored, and
  neutral "no evidence" criteria are dropped.
- Strengths from criteria ≥ 80, improvements from criteria < 60 (Module 9
  bands); each improvement is paired with a concrete suggestion from a fixed
  library — one entry per Module 9 metric (quality → "Ask for a review
  checkpoint midway…", timeliness → "Set an internal deadline two days
  ahead…", etc.). At most 3 of each.
- Indicators (on-time ≥ 0.9 / < 0.6, rework ≤ 0.1 / > 0.4) add items only for
  metrics no criterion already covered, so the student is never praised and
  criticised for the same thing.
- Suggested rating = weighted criterion mean ÷ 20, rounded half up, clamped
  1–5; `null` without criteria.
- Interview: no recorded evidence, so the assistant returns clearly-labelled
  `"Template: …"` text and two generic preparation suggestions, and no rating.
- The form only fills **empty** fields and sets `aiAssisted`, and the card shows
  an "AI-assisted draft" badge — the author stays responsible for the text.

**Review** of the author's draft (issues in this fixed order):

| Code | Severity | Rule |
|---|---|---|
| `harsh_language` | critical | word-boundary match against a short list of personal insults (`stupid`, `idiot`, `useless`, `clueless`, `shut up`, …). Technical terms that merely sound negative (`lazy loading`, `dumb component`, `garbage collection`) are deliberately not listed. |
| `too_short` | warning | strengths + improvements < 40 chars |
| `shouting` | warning | a field with ≥ 20 letters of which ≥ 60 % are capitals |
| `no_suggestions` | warning | no suggestions |
| `rating_mismatch` | warning | rating ≤ 2 with no improvements, or 5 with only improvements |
| `unbalanced` | info | no strengths, or no improvements while rating ≤ 4 |
| `not_actionable` | info | improvements contain none of a small list of action verbs |

`quality_score = max(0, 100 − Σ penalty)` with critical 40, warning 15, info 5.

### Tone guard and graceful degradation

`backend/src/services/feedbackService.js` is a line-for-line JavaScript copy
(same constants, messages, issue order, half-up rounding and code-point name
ordering). It is used:

1. as the fallback when the AI service is unreachable or returns a malformed
   answer (`/assist` then reports `aiGenerated: false`, the Module 8/9
   pattern), and
2. **always** as the server-side tone guard on create, update and the
   student's reply: a `critical` issue is refused with `400` and the issue's
   message. Warnings never block. Because this runs locally, saving feedback
   never depends on the AI service being up.

Parity was checked live: four sample DTOs posted to a running `uvicorn`
returned byte-identical results to `fallbackFeedbackAssist` (see QA doc).

## 6. API surface — `/api/feedback` (all `protect`)

| Method | Path | Roles (`authorize`) | Behaviour |
|---|---|---|---|
| GET | `/received` | student | Feedback about me, paginated, `?context=` |
| GET | `/given` | company, mentor | Feedback I wrote, `?context=` |
| GET | `/students/:studentId/summary` | any (controller-checked) | `{count, averageOverall, averageByDimension, recommendRate, byContext, recent[3]}` |
| GET | `/progress/:progressId` | any participant | `{records, permissions:{canGive,isAuthorRole,hasGiven,myFeedbackId}}` |
| GET | `/interviews/:interviewId` | company, student, admin | same shape; owning company, the student, admin |
| POST | `/assist` | company, mentor | `{context, progressId|interviewId, draft?}` → draft + review + `aiGenerated`, `evidenceSource` |
| GET | `/` | admin | Moderation list, `?context=&studentId=&companyId=` |
| POST | `/` | company, mentor | Create; 201; emails the student; 409 duplicate; 400 tone / not closed |
| GET | `/:id` | any (view rule) | One record with `permissions` |
| PUT | `/:id` | company, mentor | Author edit; 409 once acknowledged; sets `editedAt` |
| DELETE | `/:id` | company, mentor, admin | Author before ack; admin any time |
| PUT | `/:id/acknowledge` | student | `{response?}`; 409 second time; emails the author when a reply is left |

Validation (`validation.js`, "Feedback validation rules (Module 10)"): context
enum; exactly one of `progressId`/`interviewId`, matching the context, numeric;
`overallRating` int 1–5; `ratings` keys whitelisted and each 1–5; strengths /
improvements ≤ 4000 and ≥ 20 combined on create (re-checked on the merged record
on update); suggestions ≤ 5 of 5–300 chars; booleans; reply ≤ 2000.

## 7. Notifications

`backend/src/utils/feedbackNotifications.js`, templates in `emailTemplates.js`
(Module 10 section, `interviewShell`). Best-effort, never throw.

| Event | To | Template | Link |
|---|---|---|---|
| Feedback created | the student | `feedbackReceived` (author, task, stars) | `/student/feedback` |
| Student acknowledged **with a reply** | the author's account email (company falls back to its contact email) | `feedbackResponded` (reply excerpt ≤ 500 chars) | internship workspace (`/company|mentor/progress/:id`) or `/company/candidates/:applicationId?tab=interview` |

User-written text in these two templates is HTML-escaped.

## 8. Frontend

| File | Purpose |
|---|---|
| `types/feedback.types.ts`, `services/feedbackService.ts` | API client + helpers (dimension labels, star formatting, severity colours) |
| `components/feedback/FeedbackStars.tsx` | Read-only stars + star picker |
| `components/feedback/FeedbackCard.tsx` | One record: author/role/date, stars, dimension chips, strengths / to develop / suggestions, recommend + AI-assisted badges, "edited" marker, student response; edit/delete/acknowledge/reply per `permissions` |
| `components/feedback/FeedbackFormModal.tsx` | Create/edit: overall + 5 optional star pickers, texts, suggestion list (max 5), recommend toggle, **Draft with AI** (fills empty fields) and **Check my feedback** (shows score + issues), fallback notice; company overall prefilled from the private closing rating |
| `components/feedback/FeedbackPanel.tsx` | New **Feedback** tab (`MessagesSquare`) in `ProgressWorkspace` |
| `components/feedback/InterviewFeedbackAction.tsx` | "Give structured feedback" / "View feedback" on the company candidate page for a completed interview |
| `components/feedback/RecentFeedbackCard.tsx` | Student dashboard rail card |
| `components/feedback/GivenFeedbackSection.tsx` | "Feedback you've given" on `/mentor/feedback` |
| `app/(dashboard)/student/feedback/page.tsx` | All received feedback, context filter (`?context=`), summary header (count, average, recommend rate, per-area bars), acknowledge/reply |

## 9. Hooks into completed modules

| File | Change | Why |
|---|---|---|
| `backend/src/models/index.js` | require + associations + export `Feedback` | register the model |
| `backend/src/server.js` | mount `/api/feedback` | new routes |
| `backend/src/services/aiService.js` | `mapFeedbackAssistToDto`, `assistFeedback`, field maps (appended) | AI contract |
| `backend/src/middleware/validation.js` | appended Module 10 section | validation chains |
| `backend/src/utils/emailTemplates.js` | appended `feedbackReceived`, `feedbackResponded` | notifications |
| `ai-service/app/main.py` | include `feedback` router | new endpoint |
| `ai-service/app/models/schemas.py` | appended Feedback* schemas | contract |
| `frontend/.../ProgressWorkspace.tsx` | one tab + one panel render | Feedback tab |
| `frontend/.../company/candidates/[applicationId]/page.tsx` | mount `InterviewFeedbackAction` for completed interviews | US-14 entry point |
| `frontend/.../student/interviews/page.tsx` | "View feedback" link on completed interviews | student entry point |
| `frontend/.../mentor/feedback/page.tsx` | append `GivenFeedbackSection` | mentor view |
| `frontend/.../student/dashboard/page.tsx` | `RecentFeedbackCard` at the top of the rail | discoverability |

No Module 5/7/8/9 controller, model or rule was changed; `resolveActor` was
already exported by Module 9's work. `evaluationService` exports
(`loadEvidence`, `criteriaForTask`, `fallbackEvaluation`) are reused as-is.

### Design decisions / deviations from the spec

- **Criterion `weight` added to the assist contract** (`FeedbackCriterionIn.weight`,
  default 1). The spec asks for a *weighted* criterion mean but listed criteria
  as `{name, metric, score}`; the Module 9 weight is carried through.
- **Assist without an evaluation** runs the Module 9 rules on the fly (no
  persistence) rather than sending no criteria, so abandoned internships and
  internships whose draft has not been generated still get specific drafting.
- **Tone guard also covers the student's reply** — respect runs both ways (§2.3.2.5).
- **Mentor summary access** counts `pending`, `active` and `completed`
  assignments; `declined`/`cancelled` do not establish a relationship.
- **Shouting is judged per field**, not over the combined text, so one
  shouted paragraph is caught even when the rest is normal.
- `permissions.isAuthorRole` added to the thread endpoints so the UI can explain
  why feedback cannot be given yet.
- The admin moderation list ignores non-numeric `studentId`/`companyId` filters
  rather than rejecting the request.

## 10. Testing

| Layer | File | Count |
|---|---|---|
| Model predicates, eligibility, fallback drafting + every review rule, tone guard, summary | `backend/tests/feedback.rules.test.js` | jest |
| DTO ↔ pydantic field sets, types, fallback response shape | `backend/tests/feedback.aiContract.test.js` | jest |
| AI engine + endpoint | `ai-service/tests/test_feedback_assistant.py` | 35 pytest cases |
| HTTP flows on in-memory SQLite (scratch harness, not in repo) | `m10.flow.test.js` | 10 scenarios |

See `docs/qa/module-10-feedback-system.md` for the scenario table and the
observed counts.
