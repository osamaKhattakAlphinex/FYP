# NexIntern Navigation Flow

## Public Pages

### Landing Page (`/`)

- **Navbar**:
  - "Log In" button → `/login`
  - "Get Started Free" button → `/register`
- **Hero Section**:
  - "Start as a Student" button → `/register`
  - "Post a Task" button → `/register`
- **For Students/Companies Section**:
  - "Join as a Student" button → `/register`
  - "Post Your First Task" button → `/register`

## Authentication Pages

### Login Page (`/login`)

- **Form Actions**:
  - "Forgot password?" link → `/forgot-password`
  - "Sign In" button → Redirects to role-based dashboard
  - Social auth buttons (Google, LinkedIn, GitHub) → OAuth flow
- **Navigation Links**:
  - "Sign up" link → `/register`
  - Logo → `/` (home)

### Register Page (`/register`)

- **Form Actions**:
  - "Create Account" button → `/verify-email?email={email}`
  - Social auth buttons (Google, LinkedIn, GitHub) → OAuth flow
  - Terms of Service link → `/terms`
  - Privacy Policy link → `/privacy`
- **Navigation Links**:
  - "Sign in" link → `/login`
  - Logo → `/` (home)

### Forgot Password Page (`/forgot-password`)

- **Form Actions**:
  - "Send Reset Link" button → Shows success state
  - "Try Another Email" button → Resets form
  - "Back to Sign In" button → `/login`
- **Navigation Links**:
  - "Back to Sign In" link → `/login`
  - Logo → `/` (home)

### Reset Password Page (`/reset-password?token={token}`)

- **Form Actions**:
  - "Reset Password" button → Shows success, then redirects to `/login`
  - "Request New Link" button (if invalid token) → `/forgot-password`
- **Navigation Links**:
  - "Sign in" link → `/login`
  - Logo → `/` (home)

### Email Verification Page (`/verify-email?email={email}`)

- **Form Actions**:
  - 6-digit OTP input boxes (auto-submits when complete)
  - "Resend Code" button → Sends new OTP (60s cooldown)
  - "Back to Sign In" button → `/login`
  - Auto-verify when OTP is complete → Redirects to `/login`
- **Features**:
  - 6 individual input boxes for OTP digits
  - Auto-focus next box on digit entry
  - Paste support for full OTP
  - Keyboard navigation (arrows, backspace)
  - 60-second countdown timer for resend
  - Real-time validation feedback
- **Navigation Links**:
  - "Back to Sign In" link → `/login`
  - Logo → `/` (home)

## Role-Based Dashboards (After Login)

- **Navigation Links**:
  - "Back to Sign In" link → `/login`
  - Logo → `/` (home)

## Role-Based Dashboards (After Login)

### Student Dashboard

- `/student/profile` - Student profile management
- `/student/tasks` - Browse available tasks
- `/student/applications` - View applications
- `/student/certificates` - View earned certificates
- `/student/analytics` - Performance analytics

### Company Dashboard

- `/company/profile` - Company profile management
- `/company/post-task` - Post new tasks
- `/company/candidates` - View applicants
- `/company/analytics` - Company analytics

### Mentor Dashboard

- `/mentor/students` - Assigned students
- `/mentor/feedback` - Provide feedback

### Admin Dashboard

- `/admin/analytics` - Platform analytics
- `/admin/users` - User management
- `/admin/documents` - Document verification

## Public Profile Pages

- `/profile/[studentId]` - Public student profile
- `/company/[companyId]` - Public company profile
- `/tasks/[taskId]` - Public task details

## Navigation Features

✓ All links use Next.js `<Link>` component for client-side routing
✓ No manual URL entry required
✓ Smooth page transitions
✓ Back button support
✓ Role-based redirects after login
✓ Protected routes (dashboard pages require authentication)
✓ Social authentication integration ready
✓ Email verification flow
✓ Password reset flow
