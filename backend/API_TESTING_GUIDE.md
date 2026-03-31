# API Testing Guide

Complete guide to test all authentication endpoints.

## Testing Flow

### 1. Register a New User

#### Student Registration

\`\`\`bash
POST /api/auth/register
{
"email": "student@test.com",
"password": "password123",
"role": "student",
"firstName": "John",
"lastName": "Doe"
}
\`\`\`

Expected Response (201):
\`\`\`json
{
"success": true,
"message": "Registration successful. Please check your email to verify your account.",
"userId": "user_id_here"
}
\`\`\`

#### Company Registration

\`\`\`bash
POST /api/auth/register
{
"email": "company@test.com",
"password": "password123",
"role": "company",
"companyName": "Tech Corp"
}
\`\`\`

### 2. Email Verification

You have two options:

#### Option A: Token-based Verification

1. Check your email for verification link
2. Extract token from URL
3. Call:
   \`\`\`bash
   GET /api/auth/verify-email/{token}
   \`\`\`

#### Option B: OTP-based Verification

1. Request OTP:
   \`\`\`bash
   POST /api/auth/send-otp
   {
   "email": "student@test.com"
   }
   \`\`\`

2. Check email for 6-digit OTP
3. Verify OTP:
   \`\`\`bash
   POST /api/auth/verify-otp
   {
   "email": "student@test.com",
   "otp": "123456"
   }
   \`\`\`

Expected Response (200):
\`\`\`json
{
"success": true,
"message": "Email verified successfully",
"token": "jwt_token_here",
"user": {
"id": "user_id",
"email": "student@test.com",
"role": "student",
"isEmailVerified": true
}
}
\`\`\`

### 3. Login

\`\`\`bash
POST /api/auth/login
{
"email": "student@test.com",
"password": "password123"
}
\`\`\`

Expected Response (200):
\`\`\`json
{
"success": true,
"message": "Login successful",
"token": "jwt_token_here",
"user": {
"id": "user_id",
"email": "student@test.com",
"role": "student",
"isEmailVerified": true
}
}
\`\`\`

**Important:** Save the token for authenticated requests!

### 4. Get Current User (Protected)

\`\`\`bash
GET /api/auth/me
Headers: {
"Authorization": "Bearer {your_token}"
}
\`\`\`

Expected Response (200):
\`\`\`json
{
"success": true,
"user": {
"\_id": "user_id",
"email": "student@test.com",
"role": "student",
"isEmailVerified": true,
"isActive": true,
"roleData": {
"firstName": "John",
"lastName": "Doe",
"skills": [],
"education": [],
// ... other student data
}
}
}
\`\`\`

### 5. Forgot Password Flow

1. Request password reset:
   \`\`\`bash
   POST /api/auth/forgot-password
   {
   "email": "student@test.com"
   }
   \`\`\`

2. Check email for reset link
3. Extract token from URL
4. Reset password:
   \`\`\`bash
   PUT /api/auth/reset-password/{token}
   {
   "password": "newpassword123",
   "confirmPassword": "newpassword123"
   }
   \`\`\`

### 6. Update Password (Protected)

\`\`\`bash
PUT /api/auth/update-password
Headers: {
"Authorization": "Bearer {your_token}"
}
Body: {
"currentPassword": "password123",
"newPassword": "newpassword456"
}
\`\`\`

### 7. Google OAuth Flow

1. Open in browser:
   \`\`\`
   http://localhost:5000/api/auth/google?role=student
   \`\`\`

2. Login with Google
3. You'll be redirected to:
   \`\`\`
   http://localhost:3000/auth/callback?token={jwt_token}
   \`\`\`

4. Extract and use the token

### 8. Logout (Protected)

\`\`\`bash
POST /api/auth/logout
Headers: {
"Authorization": "Bearer {your_token}"
}
\`\`\`

### 9. Delete Account (Protected)

\`\`\`bash
DELETE /api/auth/delete-account
Headers: {
"Authorization": "Bearer {your_token}"
}
Body: {
"password": "password123"
}
\`\`\`

## Error Scenarios to Test

### 1. Duplicate Email

Try registering with same email twice:
\`\`\`json
{
"success": false,
"error": "Email already registered"
}
\`\`\`

### 2. Invalid Credentials

Login with wrong password:
\`\`\`json
{
"success": false,
"error": "Invalid credentials"
}
\`\`\`

### 3. Unverified Email

Try accessing protected routes without verification (if required):
\`\`\`json
{
"success": false,
"error": "Please verify your email to access this resource"
}
\`\`\`

### 4. Invalid Token

Use expired or invalid JWT:
\`\`\`json
{
"success": false,
"error": "Not authorized to access this route"
}
\`\`\`

### 5. Validation Errors

Send invalid data:
\`\`\`json
{
"success": false,
"errors": [
{
"field": "email",
"message": "Please provide a valid email"
}
]
}
\`\`\`

### 6. OTP Attempts Exceeded

Try wrong OTP 3+ times:
\`\`\`json
{
"success": false,
"error": "Maximum OTP attempts exceeded"
}
\`\`\`

### 7. Expired OTP

Wait 10+ minutes and try to verify:
\`\`\`json
{
"success": false,
"error": "OTP has expired"
}
\`\`\`

## Testing with Different Roles

### Student

\`\`\`json
{
"email": "student@test.com",
"password": "password123",
"role": "student",
"firstName": "John",
"lastName": "Doe"
}
\`\`\`

### Company

\`\`\`json
{
"email": "company@test.com",
"password": "password123",
"role": "company",
"companyName": "Tech Corp"
}
\`\`\`

### Admin

\`\`\`json
{
"email": "admin@test.com",
"password": "password123",
"role": "admin",
"firstName": "Admin",
"lastName": "User"
}
\`\`\`

## Automated Testing with Postman

1. Import `postman_collection.json`
2. Set environment variable `baseUrl` to `http://localhost:5000/api`
3. Run collection with Collection Runner
4. Token will be automatically saved after login

## Testing Checklist

- [ ] Student registration
- [ ] Company registration
- [ ] Admin registration
- [ ] Email verification (token)
- [ ] Email verification (OTP)
- [ ] Resend verification email
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Get current user
- [ ] Forgot password
- [ ] Reset password
- [ ] Update password
- [ ] Google OAuth login
- [ ] Logout
- [ ] Delete account
- [ ] Duplicate email error
- [ ] Invalid token error
- [ ] Expired token error
- [ ] Validation errors
- [ ] Rate limiting (100+ requests)

## Performance Testing

Test rate limiting:
\`\`\`bash

# Send 101 requests quickly

for i in {1..101}; do
curl -X POST http://localhost:5000/api/auth/login \\
-H "Content-Type: application/json" \\
-d '{"email":"test@test.com","password":"test"}' &
done
\`\`\`

Expected: 101st request should be rate limited

## Security Testing

1. **SQL Injection**: Try injecting in email field
2. **XSS**: Try script tags in input fields
3. **Password Strength**: Try weak passwords
4. **Token Manipulation**: Modify JWT token
5. **CORS**: Try requests from different origins

All should be properly handled and rejected.
