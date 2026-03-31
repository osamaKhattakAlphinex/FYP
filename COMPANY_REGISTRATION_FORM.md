# Company Registration Form Implementation

## Overview

Updated the registration form to dynamically show different fields based on the selected role (Student vs Company), with proper validation aligned to the backend Company model schema.

## Changes Implemented

### 1. Updated Type Definitions

**File:** `frontend/src/types/auth.types.ts`

Added company-specific fields to `RegisterData` interface:

```typescript
export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  name: string;
  agreeToTerms: boolean;
  // Company-specific fields
  companyName?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  phone?: string;
  // Student-specific fields
  firstName?: string;
  lastName?: string;
}
```

### 2. Dynamic Form Validation

**File:** `frontend/src/components/auth/RegisterForm.tsx`

Created `getValidationSchema()` function that returns different validation rules based on role:

**For Students:**

- Name (required, min 2 characters)
- Email (required, valid email)
- Password (required, min 8 chars, uppercase/lowercase/number)
- Confirm Password (must match)
- Terms agreement (required)

**For Companies:**

- Company Name (required, min 2 characters)
- Industry (required, dropdown selection)
- Company Size (required, dropdown selection)
- Website (optional, must be valid URL)
- Phone (optional, must be valid phone format)
- Email (required, valid email)
- Password (required, min 8 chars, uppercase/lowercase/number)
- Confirm Password (must match)
- Terms agreement (required)

### 3. Conditional Form Fields

**File:** `frontend/src/components/auth/RegisterForm.tsx`

Form now renders different fields based on `values.role`:

**When role === 'company':**

- Company Name (with Building2 icon)
- Industry (dropdown with 11 options)
- Company Size (dropdown with 6 options)
- Website (optional, with Globe icon)
- Phone (optional, with Phone icon)

**When role === 'student' or 'admin':**

- Full Name (with User icon)

### 4. Industry Options

- Technology
- Finance
- Healthcare
- Education
- E-commerce
- Manufacturing
- Retail
- Consulting
- Marketing
- Real Estate
- Other

### 5. Company Size Options

- 1-10 employees
- 11-50 employees
- 51-200 employees
- 201-500 employees
- 501-1000 employees
- 1000+ employees

### 6. Backend Controller Updates

**File:** `backend/src/controllers/authController.js`

Updated `register` function to:

- Accept new company fields: `industry`, `companySize`, `website`, `phone`
- Validate required company fields
- Create Company document with all provided fields
- Store phone in `contactInfo.phone`
- Store website at root level

### 7. Service Layer Updates

**File:** `frontend/src/services/authService.ts`

Updated `RegisterData` interface to include all company fields.

## Form Behavior

### Role Selection

- When user changes role, validation schema updates dynamically
- Previous validation errors are cleared
- Form fields change based on selected role

### Validation

- Real-time validation on field blur
- Error messages display below each field
- Red borders on invalid fields
- Submit button disabled while submitting

### Company-Specific Validation Rules

- **Company Name:** Required, minimum 2 characters
- **Industry:** Required, must select from dropdown
- **Company Size:** Required, must select from dropdown
- **Website:** Optional, must be valid URL format (https://example.com)
- **Phone:** Optional, must match phone number pattern

### Student-Specific Validation Rules

- **Name:** Required, minimum 2 characters
- Backend splits name into firstName and lastName

## Backend Schema Alignment

### Company Model (Required Fields)

✅ companyName - Captured in form
✅ industry - Captured in form
✅ companySize - Captured in form (optional in model, required in form)

### Company Model (Optional Fields)

✅ website - Captured in form
✅ contactInfo.phone - Captured in form
✅ contactInfo.email - Auto-filled from user email

### Fields Not in Registration (Can be added later in profile)

- foundedYear
- description
- logo
- coverImage
- location (address, city, state, country, zipCode)
- contactPerson details
- socialLinks
- culture
- team

## Files Modified

1. `frontend/src/types/auth.types.ts` - Added company fields to RegisterData
2. `frontend/src/components/auth/RegisterForm.tsx` - Dynamic form with validation
3. `frontend/src/services/authService.ts` - Updated RegisterData interface
4. `backend/src/controllers/authController.js` - Handle company fields

## Testing Checklist

- [x] Select Student role - shows name field
- [x] Select Company role - shows company-specific fields
- [x] Company name validation (required, min 2 chars)
- [x] Industry dropdown (required)
- [x] Company size dropdown (required)
- [x] Website validation (optional, valid URL)
- [x] Phone validation (optional, valid format)
- [x] Form submission with company data
- [x] Backend creates Company document with all fields
- [x] Email verification flow works for companies
- [x] Company can login after verification

## Status

✅ Implementation Complete
✅ TypeScript Compilation Successful
✅ No Diagnostics Errors
✅ Form Aligned with Backend Schema
✅ Dynamic Validation Working
✅ Backend Controller Updated
