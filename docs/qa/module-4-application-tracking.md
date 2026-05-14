# Module 4 — Application Tracking · Manual QA Test Plan

**Scope.** End-to-end verification of the `/api/applications/*` surface added in Module 4: applying to a task, editing/withdrawing as a student, listing/reviewing/transitioning status as a company, status-history logging, and the cross-tenant + data-leak guards.

**Assumed fixtures.**

| Alias | Role | Notes |
|------|------|-------|
| `STUDENT_A` | student | has a complete `Student` profile |
| `STUDENT_B` | student | unrelated, used for cross-row guards |
| `COMPANY_X` | company | owns `TASK_OPEN` and `TASK_CAPPED` |
| `COMPANY_Y` | company | owns `TASK_OTHER` — used for cross-tenant test |
| `TASK_OPEN` | task | status=`active`, deadline in the future, `maxApplications=50` |
| `TASK_CLOSED` | task | status=`closed` OR deadline in the past |
| `TASK_CAPPED` | task | `applicationCount === maxApplications` |
| `TASK_OTHER` | task | owned by `COMPANY_Y` |

`TOKEN_*` refers to the JWT returned by `/api/auth/login` for that role. All requests assume `Authorization: Bearer <TOKEN_*>` unless noted otherwise.

---

## Test cases

| # | Scenario | Pre-condition | Steps | Expected result |
|---|----------|---------------|-------|-----------------|
| 1 | Happy path apply (student) | `STUDENT_A` logged in, `TASK_OPEN.applicationCount = N` | `POST /api/applications/tasks/{TASK_OPEN._id}` with valid body (`coverLetter` ≥ 50 chars, optional `proposed`, `attachments`) | `201`. Response `data.status='submitted'`, `data.proposed.rate/currency` present. DB: one row in `applications`, one row in `application_status_history` (`fromStatus=null`, `toStatus='submitted'`, `changedByUserId=STUDENT_A.userId`). `TASK_OPEN.applicationCount` is now `N+1`. |
| 2 | Apply when task status is `closed` | `TASK_CLOSED` has `status='closed'` | `POST /api/applications/tasks/{TASK_CLOSED._id}` with valid body | `400` `"This task is not currently accepting applications"`. No application or history row inserted. `applicationCount` unchanged. |
| 3 | Apply when deadline has passed | `TASK_CLOSED.applicationDeadline` is in the past | Same as #2 | `400` same message. `Task.canApply()` returns `false`. |
| 4 | Apply twice to same task | `STUDENT_A` already applied to `TASK_OPEN` (test #1) | Repeat `POST /api/applications/tasks/{TASK_OPEN._id}` | `400` `"You have already applied to this task"`. Underlying unique index `(taskId, studentId)` is what protects it; transaction rolls back, count not double-incremented. |
| 5 | Apply when task is at `maxApplications` cap | `TASK_CAPPED.applicationCount === TASK_CAPPED.maxApplications` | `POST /api/applications/tasks/{TASK_CAPPED._id}` as a *new* student | `400` `"This task is not currently accepting applications"`. `Task.canApply()` returns `false` because `applicationCount < maxApplications` is violated. |
| 6 | Cover letter shorter than 50 chars | `STUDENT_A` logged in | `POST /api/applications/tasks/{TASK_OPEN._id}` with `coverLetter` length 10 | `400` from `validateApplicationCreation` with `errors[0].field='coverLetter'` and message about the 50–5000 range. No row inserted. |
| 7 | Cover letter longer than 5000 chars | `STUDENT_A` logged in | `POST` with `coverLetter` length 5001 | `400` validator error referencing 50–5000 range. |
| 8 | Edit application while status=`submitted` | `STUDENT_A` owns application `A1` with `status='submitted'` | `PUT /api/applications/{A1._id}` body `{ coverLetter: '<updated 100+ chars>', proposed: { rate: 200 }, attachments: [...] }` | `200`. Returned `coverLetter` is the new text. `application_attachments` rows for `A1` are replaced wholesale (old rows destroyed, new rows bulk-created). No `application_status_history` entry written (status didn't change). |
| 9 | Edit application while status=`under_review` | Company has moved `A1` to `under_review` | Student repeats `PUT /api/applications/{A1._id}` | `400` `"This application can no longer be edited"` (server uses `application.canBeEditedByStudent()`). Cover letter unchanged in DB. |
| 10 | Withdraw allowed status | `A1.status='submitted'`, `TASK_OPEN.applicationCount = M` | `POST /api/applications/{A1._id}/withdraw` | `200`. `A1.status='withdrawn'`. New `application_status_history` row with `fromStatus='submitted'`, `toStatus='withdrawn'`. `TASK_OPEN.applicationCount = M − 1`. |
| 11 | Withdraw from terminal status | `A1.status='accepted'` | `POST /api/applications/{A1._id}/withdraw` | `400` `"This application can no longer be withdrawn"`. `canBeWithdrawnByStudent()` returns `false`. Status and `applicationCount` unchanged. |
| 12 | Cross-tenant `GET /applications/:id` (company-side) | `A_other` is an application on `TASK_OTHER` owned by `COMPANY_Y` | Authenticated as `COMPANY_X`, `GET /api/applications/{A_other._id}` | `403` `"Not authorized to view this application"`. `viewedByCompanyAt` on `A_other` remains unchanged. |
| 13 | `viewedByCompanyAt` set on first company GET only | `A1.viewedByCompanyAt=null`, company that owns the task is logged in | (a) `GET /api/applications/{A1._id}`; capture timestamp T₁. (b) Wait > 1s, repeat. | (a) Response shows `viewedByCompanyAt ≈ T₁`. (b) Second response's `viewedByCompanyAt` equals T₁ (not refreshed). Confirms the "if null, set now" branch. |
| 14 | Valid transition `submitted → under_review` | `A1.status='submitted'`, owning company logged in | `PUT /api/applications/{A1._id}/status` body `{ status: 'under_review' }` | `200`. `A1.status='under_review'`. New `application_status_history` row (`fromStatus='submitted'`, `toStatus='under_review'`, `changedByUserId=company user id`). `decidedAt` remains null (not a terminal state). |
| 15 | Valid transition into terminal `accepted` sets `decidedAt` | `A1.status='shortlisted'`, `decidedAt=null` | `PUT /api/applications/{A1._id}/status` body `{ status: 'accepted' }` | `200`. `A1.status='accepted'`. `decidedAt` is non-null and equals (within seconds) the server time at the call. |
| 16 | Invalid transition `submitted → accepted` | `A1.status='submitted'` | `PUT .../status` body `{ status: 'accepted' }` | `400` `"Invalid status transition from 'submitted' to 'accepted'"`. No status change. No history row. |
| 17 | Invalid transition `submitted → interview_scheduled` | `A1.status='submitted'` | `PUT .../status` body `{ status: 'interview_scheduled' }` | `400` same shape as #16. |
| 18 | Invalid transition `under_review → accepted` (must go through shortlist) | `A1.status='under_review'` | `PUT .../status` body `{ status: 'accepted' }` | `400` same shape. Confirms `under_review` only permits `shortlisted` / `rejected`. |
| 19 | Invalid transition `under_review → interview_scheduled` | `A1.status='under_review'` | `PUT .../status` body `{ status: 'interview_scheduled' }` | `400`. |
| 20 | Invalid transition `interview_scheduled → shortlisted` (no going back) | `A1.status='interview_scheduled'` | `PUT .../status` body `{ status: 'shortlisted' }` | `400`. |
| 21 | Invalid transition from terminal `accepted → anything` | `A1.status='accepted'` | `PUT .../status` body `{ status: 'rejected' }` | `400`. `VALID_TRANSITIONS` has no key for `accepted`, so `allowed=[]`. |
| 22 | Invalid transition from `withdrawn` | `A1.status='withdrawn'` (after #10) | `PUT .../status` body `{ status: 'under_review' }` | `400`. Withdrawn is terminal for company actions. |
| 23 | `companyNotes` does not leak to student | Company sets a private note via `PUT /api/applications/{A1._id}/notes` body `{ companyNotes: 'leaked secret' }` | Student logs in and calls (a) `GET /api/applications/me`, (b) `GET /api/applications/{A1._id}` | Neither response body contains the key `companyNotes`. Helper `sanitizeForStudent` strips it. |
| 24 | `rejectionReason` only visible to student when status=`rejected` | Company moves `A1` from `shortlisted` to `rejected` with `reason: 'Better fit found'`. Separately, another application `A2.status='under_review'` has `rejectionReason=null`. | Student GETs both via `/api/applications/me` and `/api/applications/{id}` | `A1` response includes `rejectionReason: 'Better fit found'`. `A2` response has *no* `rejectionReason` key. `companyNotes` is stripped from both. |

---

## How to run

The examples below use `curl`. Replace `$TOKEN_*` with the JWT returned by `POST /api/auth/login`, and `$TASK_OPEN`, `$A1`, etc. with the IDs you captured from earlier steps. `BASE=http://localhost:5000`.

### Case 1 — Happy path apply (student)

```bash
curl -s -X POST "$BASE/api/applications/tasks/$TASK_OPEN" \
  -H "Authorization: Bearer $TOKEN_STUDENT_A" \
  -H "Content-Type: application/json" \
  -d '{
    "coverLetter": "I am very excited about this opportunity because my recent coursework lines up directly with the deliverables described.",
    "proposed": { "rate": 25, "currency": "USD" },
    "expectedStartDate": "2026-06-01",
    "availabilityHoursPerWeek": 20,
    "attachments": [
      { "name": "resume.pdf", "url": "https://files.example.com/resume.pdf", "type": "application/pdf" }
    ]
  }'
```
Then verify the increment:
```bash
curl -s "$BASE/api/tasks/$TASK_OPEN" | jq '.data.applicationCount'
```

### Case 4 — Apply twice (unique constraint)

Run case 1 once successfully, then repeat the exact same `POST`. Expect:
```json
{ "success": false, "message": "You have already applied to this task" }
```
HTTP status `400`.

### Case 6 — Cover letter too short (validator)

```bash
curl -s -i -X POST "$BASE/api/applications/tasks/$TASK_OPEN" \
  -H "Authorization: Bearer $TOKEN_STUDENT_A" \
  -H "Content-Type: application/json" \
  -d '{ "coverLetter": "too short" }'
```
Expect HTTP `400` and body:
```json
{
  "success": false,
  "errors": [
    { "field": "coverLetter", "message": "Cover letter must be between 50 and 5000 characters" }
  ]
}
```

### Case 10 — Withdraw and verify count decrement

```bash
# 1. capture pre-count
PRE=$(curl -s "$BASE/api/tasks/$TASK_OPEN" -H "Authorization: Bearer $TOKEN_STUDENT_A" | jq '.data.applicationCount')

# 2. withdraw
curl -s -X POST "$BASE/api/applications/$A1/withdraw" \
  -H "Authorization: Bearer $TOKEN_STUDENT_A"

# 3. verify status + decrement
curl -s "$BASE/api/applications/$A1" -H "Authorization: Bearer $TOKEN_STUDENT_A" | jq '.data.status'
POST=$(curl -s "$BASE/api/tasks/$TASK_OPEN" -H "Authorization: Bearer $TOKEN_STUDENT_A" | jq '.data.applicationCount')
echo "pre=$PRE post=$POST"   # expect post = pre - 1
```

### Case 12 — Cross-tenant guard (company)

```bash
# COMPANY_X tries to GET an application that belongs to COMPANY_Y
curl -s -i "$BASE/api/applications/$A_other" \
  -H "Authorization: Bearer $TOKEN_COMPANY_X"
```
Expect HTTP `403` and body:
```json
{ "success": false, "message": "Not authorized to view this application" }
```

### Case 13 — `viewedByCompanyAt` is set once

```bash
# First read — should populate viewedByCompanyAt
T1=$(curl -s "$BASE/api/applications/$A1" \
  -H "Authorization: Bearer $TOKEN_COMPANY_X" | jq -r '.data.viewedByCompanyAt')

sleep 2

# Second read — value must not change
T2=$(curl -s "$BASE/api/applications/$A1" \
  -H "Authorization: Bearer $TOKEN_COMPANY_X" | jq -r '.data.viewedByCompanyAt')

echo "T1=$T1 T2=$T2"   # T1 == T2 and both non-null
```

### Case 16 — Invalid transition `submitted → accepted`

```bash
curl -s -i -X PUT "$BASE/api/applications/$A1/status" \
  -H "Authorization: Bearer $TOKEN_COMPANY_X" \
  -H "Content-Type: application/json" \
  -d '{ "status": "accepted" }'
```
Expect HTTP `400` and body:
```json
{ "success": false, "message": "Invalid status transition from 'submitted' to 'accepted'" }
```

### Case 23 — `companyNotes` never leaks to student

```bash
# Company sets a private note
curl -s -X PUT "$BASE/api/applications/$A1/notes" \
  -H "Authorization: Bearer $TOKEN_COMPANY_X" \
  -H "Content-Type: application/json" \
  -d '{ "companyNotes": "internal: ranking #2 candidate" }'

# Student fetches the same record
curl -s "$BASE/api/applications/$A1" \
  -H "Authorization: Bearer $TOKEN_STUDENT_A" | jq 'has("companyNotes")'
# expect: false  (the key must not be present in the student-side payload)
```

### Case 24 — `rejectionReason` visible only when rejected

```bash
# Company rejects with a reason
curl -s -X PUT "$BASE/api/applications/$A1/status" \
  -H "Authorization: Bearer $TOKEN_COMPANY_X" \
  -H "Content-Type: application/json" \
  -d '{ "status": "rejected", "reason": "Better fit found" }'

# Student sees the reason
curl -s "$BASE/api/applications/$A1" \
  -H "Authorization: Bearer $TOKEN_STUDENT_A" | jq '.data.rejectionReason'
# expect: "Better fit found"

# A non-rejected application must not expose the field
curl -s "$BASE/api/applications/$A2" \
  -H "Authorization: Bearer $TOKEN_STUDENT_A" | jq 'has("rejectionReason")'
# expect: false
```

---

## Exit criteria

- All 24 cases pass on the staging environment with `DB_SYNC=alter`.
- For every case marked "no row inserted" / "count unchanged", confirm via direct SQL (`SELECT count(*) FROM applications`, `SELECT applicationCount FROM tasks WHERE id = ?`) — not just the API response.
- The `application_status_history` table contains exactly one row per state change recorded by cases 1, 10, 14, 15, and 24; no duplicate or missing rows.
- No response body returned to a student token contains the key `companyNotes`; `rejectionReason` is present **iff** `status === 'rejected'`.
