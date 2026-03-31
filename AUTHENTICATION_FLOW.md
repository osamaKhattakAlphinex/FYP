# Authentication & Session Management Flow

## Visual Flow Diagrams

### 1. Complete User Registration & Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                              │
│  ┌──────────────┐                        ┌──────────────┐       │
│  │   Log In     │                        │ Get Started  │       │
│  └──────┬───────┘                        └──────┬───────┘       │
└─────────┼──────────────────────────────────────┼───────────────┘
          │                                       │
          │                                       ▼
          │                            ┌──────────────────┐
          │                            │  REGISTER PAGE   │
          │                            │  - Email         │
          │                            │  - Password      │
          │                            │  - Role          │
          │                            │  - Name          │
          │                            └────────┬─────────┘
          │                                     │
          │                                     ▼
          │                            ┌──────────────────┐
          │                            │  Backend Creates │
          │                            │  User & Sends    │
          │                            │  6-Digit OTP     │
          │                            └────────┬─────────┘
          │                                     │
          │                                     ▼
          │                            ┌──────────────────┐
          │                            │  VERIFY EMAIL    │
          │                            │  PAGE            │
          │                            │  - Enter OTP     │
          │                            │  - Resend Option │
          │                            └────────┬─────────┘
          │                                     │
          │                                     ▼
          │                            ┌──────────────────┐
          │                            │  OTP Validated   │
          │                            │  Email Verified  │
          │                            │  Welcome Email   │
          │                            └────────┬─────────┘
          │                                     │
          ▼                                     ▼
┌─────────────────┐                   ┌──────────────────┐
│   LOGIN PAGE    │                   │   DASHBOARD      │
│   - Email       │                   │   (Auto Login)   │
│   - Password    │                   └──────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Check Email        │
│  Verification       │
└────────┬────────────┘
         │
         ├─── Not Verified ──────┐
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Redirect to     │
         │              │  VERIFY EMAIL    │
         │              │  + Toast Error   │
         │              └──────────────────┘
         │
         └─── Verified ─────────┐
                                │
                                ▼
                       ┌──────────────────┐
                       │   DASHBOARD      │
                       │   + Toast Success│
                       └──────────────────┘
```

### 2. Session Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     APP INITIALIZATION                        │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Check          │
                    │  localStorage   │
                    │  for Token      │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         Token Found                 No Token
                │                         │
                ▼                         ▼
       ┌─────────────────┐      ┌─────────────────┐
       │  Fetch Current  │      │  Show Login/    │
       │  User from API  │      │  Signup Buttons │
       └────────┬────────┘      └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │  Set User in    │
       │  Context        │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  Show User      │
       │  Dropdown in    │
       │  Navbar         │
       └─────────────────┘
```

### 3. User Dropdown Interaction Flow

```
┌──────────────────────────────────────────────────────────────┐
│                         NAVBAR                                │
│  ┌────────────────────────────────────────────────────┐      │
│  │  [Avatar] John Doe ▼                               │      │
│  └────────────┬───────────────────────────────────────┘      │
└───────────────┼──────────────────────────────────────────────┘
                │
                │ Click
                ▼
       ┌─────────────────────┐
       │   DROPDOWN OPENS    │
       │  ┌───────────────┐  │
       │  │ John Doe      │  │
       │  │ john@test.com │  │
       │  │ [Student]     │  │
       │  ├───────────────┤  │
       │  │ 📊 Dashboard  │──┼──► Navigate to Dashboard
       │  │ 👤 Profile    │──┼──► Navigate to Profile
       │  │ 🚪 Sign Out   │──┼──► Logout & Redirect
       │  └───────────────┘  │
       └─────────────────────┘
                │
                │ Click Outside
                ▼
       ┌─────────────────┐
       │ Dropdown Closes │
       └─────────────────┘
```

### 4. Dashboard Header Layout

```
┌──────────────────────────────────────────────────────────────┐
│                     DASHBOARD HEADER                          │
│                                                               │
│  ┌────┐  NexIntern          🔔  ⚙️  │ JD │  John Doe  [Logout]│
│  │Logo│                                                       │
│  └────┘                                                       │
└──────────────────────────────────────────────────────────────┘
   │                           │   │    │      │          │
   │                           │   │    │      │          │
   └─ Brand                    │   │    │      │          └─ Logout Button
                               │   │    │      └─ User Name
                               │   │    └─ Avatar with Initials
                               │   └─ Settings Icon
                               └─ Notifications Bell
```

### 5. Toast Notification Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      USER ACTION                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  API Call       │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
            Success                    Error
                │                         │
                ▼                         ▼
       ┌─────────────────┐      ┌─────────────────┐
       │  ✅ Success     │      │  ❌ Error       │
       │  Toast          │      │  Toast          │
       │  (Green)        │      │  (Red)          │
       └────────┬────────┘      └────────┬────────┘
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Auto Dismiss   │
                    │  After 4s       │
                    └─────────────────┘
```

### 6. OTP Verification Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   VERIFY EMAIL PAGE                           │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Enter 6-Digit  │
                    │  OTP            │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Validate OTP   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    Valid OTP          Invalid OTP         Expired OTP
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌────────────────┐   ┌────────────────┐
│ Mark Email    │   │ Show Error     │   │ Show Expired   │
│ Verified      │   │ Increment      │   │ Message        │
│               │   │ Attempts       │   │                │
└───────┬───────┘   └────────┬───────┘   └────────┬───────┘
        │                    │                    │
        ▼                    │                    │
┌───────────────┐            │                    │
│ Send Welcome  │            ▼                    ▼
│ Email         │   ┌────────────────┐   ┌────────────────┐
└───────┬───────┘   │ Max Attempts?  │   │ Request New    │
        │           └────────┬───────┘   │ OTP            │
        ▼                    │            └────────────────┘
┌───────────────┐            │
│ Redirect to   │            ▼
│ Dashboard     │   ┌────────────────┐
└───────────────┘   │ Request New    │
                    │ OTP            │
                    └────────────────┘
```

### 7. Logout Flow

```
┌──────────────────────────────────────────────────────────────┐
│              USER CLICKS LOGOUT                               │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Call Logout    │
                    │  API            │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Clear          │
                    │  localStorage   │
                    │  - token        │
                    │  - user         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Clear User     │
                    │  Context        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Show Success   │
                    │  Toast          │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Redirect to    │
                    │  Home Page      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Show Login/    │
                    │  Signup Buttons │
                    └─────────────────┘
```

### 8. Responsive Navbar States

```
DESKTOP VIEW (≥768px)
┌──────────────────────────────────────────────────────────────┐
│  Logo  NexIntern    How It Works  Students  Companies        │
│                                                               │
│                                    [Avatar] John Doe ▼        │
└──────────────────────────────────────────────────────────────┘

MOBILE VIEW (<768px)
┌──────────────────────────────────────────────────────────────┐
│  Logo  NexIntern                                    ☰         │
└──────────────────────────────────────────────────────────────┘
                                                      │
                                                      │ Click
                                                      ▼
┌──────────────────────────────────────────────────────────────┐
│  How It Works                                                 │
│  For Students                                                 │
│  For Companies                                                │
│  Success Stories                                              │
│  ─────────────────────────────────────────────────────────   │
│  [Avatar] John Doe                                            │
│  john@test.com                                                │
│  Student                                                      │
│  ─────────────────────────────────────────────────────────   │
│  📊 Dashboard                                                 │
│  👤 Profile                                                   │
│  🚪 Sign Out                                                  │
└──────────────────────────────────────────────────────────────┘
```

## State Transitions

### Authentication States

```
┌─────────────┐
│ Logged Out  │
└──────┬──────┘
       │
       │ Register/Login
       ▼
┌─────────────┐
│ Logged In   │
│ (Verified)  │
└──────┬──────┘
       │
       │ Logout
       ▼
┌─────────────┐
│ Logged Out  │
└─────────────┘
```

### Email Verification States

```
┌─────────────┐
│ Unverified  │
└──────┬──────┘
       │
       │ Enter OTP
       ▼
┌─────────────┐
│ Validating  │
└──────┬──────┘
       │
       ├─── Success ──► Verified
       │
       └─── Failure ──► Unverified (with error)
```

## Component Hierarchy

```
App (layout.tsx)
├── AuthProvider
│   └── ToastProvider
│       └── Page Content
│           ├── Navbar
│           │   └── UserDropdown (if logged in)
│           │
│           └── Dashboard
│               ├── DashboardHeader
│               │   └── Logout Button
│               │
│               └── Dashboard Content
```

## Data Flow

```
User Action
    │
    ▼
Component Event Handler
    │
    ▼
API Service Call
    │
    ▼
Backend Processing
    │
    ▼
Response
    │
    ├──► Success
    │    ├── Update State
    │    ├── Show Toast
    │    └── Navigate
    │
    └──► Error
         ├── Show Toast
         └── Display Error
```

## Security Layers

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND SECURITY                          │
│  - Email Verification Check                                   │
│  - Token Validation                                           │
│  - Protected Routes                                           │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND SECURITY                           │
│  - OTP Hashing (SHA256)                                       │
│  - JWT Token Generation                                       │
│  - Password Hashing (bcrypt)                                  │
│  - Rate Limiting                                              │
│  - Attempt Limiting (3 max)                                   │
│  - Time Expiry (10 min)                                       │
└──────────────────────────────────────────────────────────────┘
```

## Summary

This authentication system provides:

- ✅ Secure email verification with OTP
- ✅ Session persistence
- ✅ User-friendly feedback
- ✅ Mobile responsive design
- ✅ Multiple security layers
- ✅ Clear user flows
- ✅ Professional UI/UX
