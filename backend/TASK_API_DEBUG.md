# Task API Debugging Guide

## Issue: POST /api/tasks returns 400 Bad Request

### Common Causes

The 400 error indicates validation failure. Here are the most common issues:

#### 1. **Missing or Invalid Required Fields**

All of these fields are **required**:

- `title` (5-100 characters)
- `description` (50-5000 characters) ⚠️ **Minimum 50 characters!**
- `category` (must match enum exactly)
- `type` ('internship', 'project', or 'freelance')
- `duration.value` (1-52)
- `duration.unit` ('days', 'weeks', or 'months')
- `workType` ('remote', 'onsite', or 'hybrid')
- `experienceLevel` ('entry', 'intermediate', or 'expert')
- `skillsRequired` (array with at least 1 skill)
- `budget.type` ('fixed', 'hourly', or 'unpaid')
- `applicationDeadline` (ISO date string)
- `startDate` (ISO date string)

#### 2. **Date Validation Issues**

⚠️ **Critical Date Rules:**

- `applicationDeadline` must be **at least 24 hours from now**
- `startDate` must be **after** `applicationDeadline`

Example:

```javascript
// ❌ WRONG - deadline too soon
applicationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

// ✅ CORRECT - deadline at least 24 hours away
applicationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

// ❌ WRONG - startDate before deadline
applicationDeadline: "2026-05-10T00:00:00Z";
startDate: "2026-05-08T00:00:00Z";

// ✅ CORRECT - startDate after deadline
applicationDeadline: "2026-05-10T00:00:00Z";
startDate: "2026-05-15T00:00:00Z";
```

#### 3. **Category Enum Mismatch**

The category must **exactly match** one of these values (case-sensitive):

- 'Web Development'
- 'Mobile Development'
- 'UI/UX Design'
- 'Data Science'
- 'Machine Learning'
- 'Digital Marketing'
- 'Content Writing'
- 'Graphic Design'
- 'Video Editing'
- 'Business Analysis'
- 'Quality Assurance'
- 'DevOps'
- 'Cybersecurity'
- 'Other'

#### 4. **Skills Array Structure**

```javascript
// ❌ WRONG - empty array
skillsRequired: [];

// ❌ WRONG - missing name
skillsRequired: [{ level: "intermediate" }];

// ✅ CORRECT
skillsRequired: [
  {
    name: "JavaScript",
    level: "intermediate", // optional: 'beginner', 'intermediate', 'advanced'
    required: true, // optional: boolean
  },
];
```

#### 5. **Budget Structure**

```javascript
// ✅ For unpaid tasks
budget: {
  type: 'unpaid'
}

// ✅ For paid tasks
budget: {
  type: 'fixed', // or 'hourly'
  amount: {
    min: 500,
    max: 1000
  },
  currency: 'USD' // optional
}
```

### How to Debug

#### Option 1: Use the Test Script

1. Get your authentication token:

```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

2. Run the test script:

```bash
node test-task-creation.js YOUR_TOKEN_HERE
```

The script will show you exactly which fields are failing validation.

#### Option 2: Check Server Logs

Look for validation errors in your server console. The error handler will log the full error details.

#### Option 3: Test with Postman/Thunder Client

Use the provided `postman_collection.json` in the backend folder.

### Valid Example Request

```json
{
  "title": "Full Stack Developer Internship",
  "description": "We are looking for a talented full stack developer to join our team. This is a great opportunity to work on real-world projects and gain valuable experience. You will be working with modern technologies including React, Node.js, and MongoDB.",
  "category": "Web Development",
  "type": "internship",
  "duration": {
    "value": 12,
    "unit": "weeks"
  },
  "workType": "remote",
  "experienceLevel": "entry",
  "skillsRequired": [
    {
      "name": "JavaScript",
      "level": "intermediate"
    },
    {
      "name": "React",
      "level": "beginner"
    }
  ],
  "budget": {
    "type": "unpaid"
  },
  "applicationDeadline": "2026-05-10T00:00:00Z",
  "startDate": "2026-05-20T00:00:00Z",
  "maxApplications": 50
}
```

### Authentication Requirements

⚠️ **Important:** This endpoint requires:

1. Valid JWT token in Authorization header: `Bearer YOUR_TOKEN`
2. User must have role: `company`
3. Company profile must exist for the user

### Quick Fixes

If you're getting 400 errors, check these in order:

1. ✅ Is your description at least 50 characters?
2. ✅ Is applicationDeadline at least 24 hours from now?
3. ✅ Is startDate after applicationDeadline?
4. ✅ Does category exactly match one of the enum values?
5. ✅ Is skillsRequired a non-empty array with valid objects?
6. ✅ Are you authenticated as a company user?
7. ✅ Do all required fields exist in your request?

### Response Format

**Success (201):**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    /* task object */
  }
}
```

**Validation Error (400):**

```json
{
  "success": false,
  "errors": [
    {
      "field": "applicationDeadline",
      "message": "Application deadline must be at least 24 hours from now"
    }
  ]
}
```

**Auth Error (401):**

```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

**Company Not Found (404):**

```json
{
  "success": false,
  "error": "Company profile not found"
}
```
