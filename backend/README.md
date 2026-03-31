# Smart AI Micro Internship - Backend API

Complete authentication backend with all features including email verification, OTP, password reset, and Google OAuth.

## Features Implemented

### Authentication System

- ✅ User Registration (Student, Company, Admin)
- ✅ Email/Password Login
- ✅ Google OAuth Login
- ✅ Email Verification (Token & OTP)
- ✅ Forgot Password
- ✅ Reset Password
- ✅ Update Password
- ✅ Logout
- ✅ Delete Account
- ✅ JWT Authentication
- ✅ Role-based Access Control

### Security Features

- ✅ Password Hashing (bcrypt)
- ✅ JWT Token Authentication
- ✅ HTTP-only Cookies
- ✅ Rate Limiting
- ✅ Data Sanitization
- ✅ Security Headers (Helmet)
- ✅ CORS Protection
- ✅ Input Validation

### Email Features

- ✅ Email Verification with Token
- ✅ OTP Verification (6-digit)
- ✅ Password Reset Email
- ✅ Welcome Email
- ✅ Beautiful HTML Email Templates

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
cd backend
npm install
\`\`\`

### 2. Configure Environment Variables

The `.env` file is already set up. You only need to add your credentials:

#### Required Variables:

- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string for JWT signing
- `SESSION_SECRET` - A secure random string for session management

#### Email Configuration (Gmail):

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password: https://myaccount.google.com/apppasswords
4. Update in `.env`:
   - `EMAIL_USER` - Your Gmail address
   - `EMAIL_PASS` - Your App Password (not your regular password)

#### Google OAuth (Optional):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Update in `.env`:
   - `GOOGLE_CLIENT_ID` - Your Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Client Secret

### 3. Start MongoDB

Make sure MongoDB is running on your system:

\`\`\`bash

# If using local MongoDB

mongod

# Or using Docker

docker run -d -p 27017:27017 --name mongodb mongo
\`\`\`

### 4. Run the Server

\`\`\`bash

# Development mode with auto-reload

npm run dev

# Production mode

npm start
\`\`\`

Server will start on `http://localhost:5000`

## API Endpoints

### Public Routes

#### Register

\`\`\`
POST /api/auth/register
Body: {
"email": "user@example.com",
"password": "password123",
"role": "student|company|admin",
"firstName": "John", // Required for student/admin
"lastName": "Doe", // Required for student/admin
"companyName": "ABC Inc" // Required for company
}
\`\`\`

#### Login

\`\`\`
POST /api/auth/login
Body: {
"email": "user@example.com",
"password": "password123"
}
\`\`\`

#### Verify Email (Token)

\`\`\`
GET /api/auth/verify-email/:token
\`\`\`

#### Resend Verification Email

\`\`\`
POST /api/auth/resend-verification
Body: {
"email": "user@example.com"
}
\`\`\`

#### Send OTP

\`\`\`
POST /api/auth/send-otp
Body: {
"email": "user@example.com"
}
\`\`\`

#### Verify OTP

\`\`\`
POST /api/auth/verify-otp
Body: {
"email": "user@example.com",
"otp": "123456"
}
\`\`\`

#### Forgot Password

\`\`\`
POST /api/auth/forgot-password
Body: {
"email": "user@example.com"
}
\`\`\`

#### Reset Password

\`\`\`
PUT /api/auth/reset-password/:token
Body: {
"password": "newpassword123",
"confirmPassword": "newpassword123"
}
\`\`\`

#### Google OAuth Login

\`\`\`
GET /api/auth/google?role=student
\`\`\`

### Protected Routes (Require Authentication)

Add JWT token in header: `Authorization: Bearer <token>`

#### Get Current User

\`\`\`
GET /api/auth/me
\`\`\`

#### Logout

\`\`\`
POST /api/auth/logout
\`\`\`

#### Update Password

\`\`\`
PUT /api/auth/update-password
Body: {
"currentPassword": "oldpassword123",
"newPassword": "newpassword123"
}
\`\`\`

#### Delete Account

\`\`\`
DELETE /api/auth/delete-account
Body: {
"password": "password123"
}
\`\`\`

## Database Models

### User Model

- email (unique)
- password (hashed)
- role (student/company/admin)
- isEmailVerified
- isActive
- googleId (for OAuth)
- avatar
- tokens and OTP fields
- timestamps

### Student Model

- userId (ref to User)
- firstName, lastName
- phone, dateOfBirth, bio
- location
- education array
- skills array
- experience array
- projects array
- certificates array
- socialLinks
- resume
- preferences
- stats
- profileCompletion

### Company Model

- userId (ref to User)
- companyName
- companySize, industry
- website, description
- logo, coverImage
- location
- contactInfo
- socialLinks
- culture
- team array
- verification
- stats
- profileCompletion

### Admin Model

- userId (ref to User)
- firstName, lastName
- phone
- permissions
- isSuperAdmin

## Email Templates

All emails use beautiful HTML templates with:

- Responsive design
- Brand colors and styling
- Clear call-to-action buttons
- Professional layout

Templates included:

1. Email Verification
2. OTP Verification
3. Password Reset
4. Welcome Email

## Security Best Practices

1. **Password Security**
   - Minimum 6 characters
   - Hashed with bcrypt (10 rounds)
   - Never returned in API responses

2. **JWT Tokens**
   - Signed with secret key
   - 7-day expiration
   - Stored in HTTP-only cookies

3. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Prevents brute force attacks

4. **Data Validation**
   - Input validation with express-validator
   - MongoDB injection prevention
   - XSS protection

5. **CORS**
   - Restricted to frontend URL
   - Credentials enabled

## Testing the API

### Using Postman/Thunder Client

1. Register a new user
2. Check email for verification link/OTP
3. Verify email
4. Login with credentials
5. Use returned token for protected routes

### Using cURL

\`\`\`bash

# Register

curl -X POST http://localhost:5000/api/auth/register \\
-H "Content-Type: application/json" \\
-d '{
"email": "test@example.com",
"password": "password123",
"role": "student",
"firstName": "John",
"lastName": "Doe"
}'

# Login

curl -X POST http://localhost:5000/api/auth/login \\
-H "Content-Type: application/json" \\
-d '{
"email": "test@example.com",
"password": "password123"
}'
\`\`\`

## Error Handling

All errors return consistent JSON format:

\`\`\`json
{
"success": false,
"error": "Error message here"
}
\`\`\`

Common status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Next Steps

1. Add your environment variables
2. Test all authentication endpoints
3. Integrate with frontend
4. Add more features (tasks, applications, etc.)

## Support

For issues or questions, check the code comments or create an issue in the repository.
