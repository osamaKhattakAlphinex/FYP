# Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                     http://localhost:3000                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Pages Layer                           │   │
│  │  • /login          • /register      • /verify-email     │   │
│  │  • /forgot-password • /reset-password                   │   │
│  │  • /student/dashboard • /company/dashboard              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Components Layer                         │   │
│  │  • LoginForm       • RegisterForm                       │   │
│  │  • ProtectedRoute  • AuthLayout                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Context/State Layer                         │   │
│  │  • AuthContext (Global Auth State)                      │   │
│  │  • User State Management                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Services Layer                           │   │
│  │  • authService.ts (Auth API calls)                      │   │
│  │  • taskService.ts (Future)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   HTTP Client                            │   │
│  │  • api.ts (Axios with interceptors)                     │   │
│  │  • Token injection                                       │   │
│  │  • Error handling                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
└──────────────────────────────┼──────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              │ Authorization: Bearer <token>
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXPRESS.JS BACKEND                             │
│                  http://localhost:5000                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Middleware Layer                        │   │
│  │  • CORS          • Helmet        • Rate Limiting        │   │
│  │  • Body Parser   • Cookie Parser • Session              │   │
│  │  • Passport      • Auth Middleware                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Routes Layer                           │   │
│  │  • /api/auth/register                                   │   │
│  │  • /api/auth/login                                      │   │
│  │  • /api/auth/verify-email/:token                        │   │
│  │  • /api/auth/send-otp                                   │   │
│  │  • /api/auth/verify-otp                                 │   │
│  │  • /api/auth/forgot-password                            │   │
│  │  • /api/auth/reset-password/:token                      │   │
│  │  • /api/auth/google (OAuth)                             │   │
│  │  • /api/auth/me (Protected)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Controllers Layer                         │   │
│  │  • authController.js                                    │   │
│  │    - register()    - login()      - verifyEmail()       │   │
│  │    - sendOTP()     - verifyOTP()  - forgotPassword()    │   │
│  │    - resetPassword() - getMe()    - logout()            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Models Layer                           │   │
│  │  • User.js (Base user model)                            │   │
│  │  • Student.js (Student profile)                         │   │
│  │  • Company.js (Company profile)                         │   │
│  │  • Admin.js (Admin profile)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
└──────────────────────────────┼──────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   MongoDB        │
                    │   Database       │
                    └──────────────────┘
```

## Authentication Flow

### 1. Registration Flow

```
User → Register Page → RegisterForm → authService.register()
                                            │
                                            ▼
                                    POST /api/auth/register
                                            │
                                            ▼
                                    authController.register()
                                            │
                                            ▼
                                    Create User in MongoDB
                                            │
                                            ▼
                                    Send OTP Email
                                            │
                                            ▼
                                    Return Success
                                            │
                                            ▼
                                    Redirect to /verify-email
```

### 2. Login Flow

```
User → Login Page → LoginForm → authService.login()
                                      │
                                      ▼
                              POST /api/auth/login
                                      │
                                      ▼
                              authController.login()
                                      │
                                      ▼
                              Verify Credentials
                                      │
                                      ▼
                              Generate JWT Token
                                      │
                                      ▼
                              Return { token, user }
                                      │
                                      ▼
                              Store in localStorage
                                      │
                                      ▼
                              Redirect to Dashboard
```

### 3. Protected Route Access

```
User → Protected Page → ProtectedRoute Component
                              │
                              ▼
                        Check localStorage for token
                              │
                              ├─ No Token → Redirect to /login
                              │
                              └─ Has Token
                                    │
                                    ▼
                              authService.getCurrentUser()
                                    │
                                    ▼
                              GET /api/auth/me
                              (with Authorization: Bearer <token>)
                                    │
                                    ▼
                              Verify Token & Return User
                                    │
                                    ├─ Invalid → Redirect to /login
                                    │
                                    └─ Valid
                                          │
                                          ▼
                                    Check User Role
                                          │
                                          ├─ Not Allowed → Redirect to /unauthorized
                                          │
                                          └─ Allowed → Render Page
```

### 4. Google OAuth Flow

```
User → Click "Continue with Google"
            │
            ▼
      authService.initiateGoogleAuth(role)
            │
            ▼
      Redirect to GET /api/auth/google?role=student
            │
            ▼
      Backend redirects to Google OAuth
            │
            ▼
      User authenticates with Google
            │
            ▼
      Google redirects to /api/auth/google/callback
            │
            ▼
      Backend processes OAuth response
            │
            ▼
      Create/Update user in database
            │
            ▼
      Generate JWT token
            │
            ▼
      Redirect to /auth/callback?token=<jwt>
            │
            ▼
      Frontend extracts token
            │
            ▼
      Store token in localStorage
            │
            ▼
      Fetch user data
            │
            ▼
      Redirect to dashboard
```

## Data Flow

### Request Flow (Frontend → Backend)

```
Component
    │
    ▼
Service Method (e.g., authService.login())
    │
    ▼
HTTP Client (api.ts)
    │
    ├─ Add Authorization header (if token exists)
    ├─ Set Content-Type: application/json
    └─ Set withCredentials: true
    │
    ▼
Backend API Endpoint
    │
    ▼
Middleware (CORS, Auth, Validation)
    │
    ▼
Controller Method
    │
    ▼
Database Operation
    │
    ▼
Response
```

### Response Flow (Backend → Frontend)

```
Database Result
    │
    ▼
Controller formats response
    │
    ▼
Express sends JSON response
    │
    ▼
HTTP Client receives response
    │
    ├─ Success (2xx) → Return data
    │
    └─ Error (4xx/5xx)
        │
        ├─ 401 → Clear token, redirect to /login
        │
        └─ Other → Throw error with message
    │
    ▼
Service Method returns/throws
    │
    ▼
Component handles result
    │
    ├─ Success → Update UI, redirect, etc.
    │
    └─ Error → Show error message
```

## Token Management

```
┌─────────────────────────────────────────────────────────┐
│                    Token Lifecycle                       │
└─────────────────────────────────────────────────────────┘

1. Login/Register Success
   └─ Backend generates JWT token
      └─ Frontend stores in localStorage

2. Subsequent Requests
   └─ Interceptor reads token from localStorage
      └─ Adds to Authorization header
         └─ Backend verifies token
            ├─ Valid → Process request
            └─ Invalid → Return 401

3. Token Expiration
   └─ Backend returns 401
      └─ Interceptor catches error
         └─ Clears localStorage
            └─ Redirects to /login

4. Logout
   └─ Frontend calls logout endpoint
      └─ Backend invalidates token (if using blacklist)
         └─ Frontend clears localStorage
            └─ Redirects to /login
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Security Stack                        │
└─────────────────────────────────────────────────────────┘

Frontend Security:
├─ Input Validation (Client-side)
├─ XSS Prevention (React auto-escaping)
├─ HTTPS (Production)
└─ Token Storage (localStorage - consider httpOnly cookies)

Network Security:
├─ CORS (Configured for localhost:3000)
├─ HTTPS (Production)
└─ Rate Limiting (Backend)

Backend Security:
├─ Helmet (Security headers)
├─ Input Validation (express-validator)
├─ SQL Injection Prevention (Mongoose)
├─ NoSQL Injection Prevention (express-mongo-sanitize)
├─ Rate Limiting (express-rate-limit)
├─ JWT Token Verification
├─ Password Hashing (bcrypt)
└─ Session Security (secure cookies)
```

## File Structure

```
smart-ai-micro-internship/
│
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js pages
│   │   │   ├── (auth)/            # Auth pages
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── verify-email/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   ├── (dashboard)/       # Protected pages
│   │   │   └── auth/callback/     # OAuth callback
│   │   │
│   │   ├── components/            # React components
│   │   │   └── auth/
│   │   │       ├── LoginForm.tsx
│   │   │       ├── RegisterForm.tsx
│   │   │       ├── ProtectedRoute.tsx
│   │   │       └── ...
│   │   │
│   │   ├── contexts/              # React contexts
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── services/              # API services
│   │   │   └── authService.ts
│   │   │
│   │   ├── lib/                   # Utilities
│   │   │   └── api.ts            # HTTP client
│   │   │
│   │   └── types/                 # TypeScript types
│   │
│   └── .env.local                 # Environment variables
│
├── backend/
│   ├── src/
│   │   ├── config/                # Configuration
│   │   │   ├── database.js
│   │   │   └── passport.js
│   │   │
│   │   ├── controllers/           # Business logic
│   │   │   └── authController.js
│   │   │
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.js
│   │   │   ├── validation.js
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── models/                # Database models
│   │   │   ├── User.js
│   │   │   ├── Student.js
│   │   │   └── Company.js
│   │   │
│   │   ├── routes/                # API routes
│   │   │   └── authRoutes.js
│   │   │
│   │   └── server.js              # Express app
│   │
│   └── .env                       # Environment variables
│
└── Documentation/
    ├── INTEGRATION_COMPLETE.md
    ├── FRONTEND_BACKEND_INTEGRATION.md
    ├── INTEGRATION_CHECKLIST.md
    └── INTEGRATION_ARCHITECTURE.md (this file)
```

## Technology Stack

### Frontend

- **Framework:** Next.js 14 (React 18)
- **Language:** TypeScript
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React Context API

### Backend

- **Framework:** Express.js
- **Language:** JavaScript (Node.js)
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + Passport.js
- **Security:** Helmet, CORS, Rate Limiting
- **Validation:** Express Validator

### Infrastructure

- **Frontend Port:** 3000
- **Backend Port:** 5000
- **Database:** MongoDB (default port 27017)

---

**Architecture Version:** 1.0.0
**Last Updated:** 2024
