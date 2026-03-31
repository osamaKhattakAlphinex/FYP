# Frontend-Backend Integration Guide

## Overview

This document describes how the Next.js frontend is connected to the Express.js backend API.

## Setup Complete ✅

The following integration components have been implemented:

### 1. API Client (`frontend/src/lib/api.ts`)

- Axios-based HTTP client configured for the backend API
- Automatic token injection in request headers
- Automatic token refresh and error handling
- Redirects to login on 401 errors

### 2. Auth Service (`frontend/src/services/authService.ts`)

- Complete authentication service with all backend endpoints
- Methods for: register, login, logout, verify email, OTP, password reset
- Google OAuth integration
- Local storage management for tokens and user data

### 3. Protected Routes (`frontend/src/components/auth/ProtectedRoute.tsx`)

- HOC component for protecting dashboard routes
- Role-based access control
- Automatic redirect to login if not authenticated

### 4. Auth Context (`frontend/src/contexts/AuthContext.tsx`)

- Global authentication state management
- User data accessible throughout the app
- Login/logout methods

### 5. Integrated Pages

All authentication pages are now connected to the backend:

- ✅ Login (`/login`)
- ✅ Register (`/register`)
- ✅ Email Verification (`/verify-email`)
- ✅ Forgot Password (`/forgot-password`)
- ✅ Reset Password (`/reset-password`)
- ✅ Google OAuth Callback (`/auth/callback`)

## Installation

Install the required dependency:

```bash
cd frontend
npm install
```

The `axios` package has been added to `package.json`.

## Environment Variables

Added to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Usage Examples

### Using Auth Service Directly

```typescript
import { authService } from "@/services/authService";

// Login
const data = await authService.login({
  email: "user@example.com",
  password: "password123",
  role: "student",
});

// Get current user
const user = await authService.getCurrentUser();

// Logout
await authService.logout();
```

### Using Auth Context

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();

  return (
    <div>
      {user ? (
        <p>Welcome, {user.firstName}!</p>
      ) : (
        <button onClick={() => login(email, password)}>Login</button>
      )}
    </div>
  );
}
```

### Protecting Routes

```typescript
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function StudentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div>Student Dashboard Content</div>
    </ProtectedRoute>
  );
}
```

## API Endpoints Used

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `PUT /api/auth/update-password` - Update password
- `DELETE /api/auth/delete-account` - Delete account
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

## Error Handling

All API calls include proper error handling:

```typescript
try {
  await authService.login(credentials);
} catch (err: any) {
  const errorMessage = err.response?.data?.error || "Login failed";
  // Handle error (show toast, set state, etc.)
}
```

## Token Management

- Tokens are stored in `localStorage` under the key `token`
- User data is stored in `localStorage` under the key `user`
- Tokens are automatically included in all API requests via interceptor
- On 401 errors, tokens are cleared and user is redirected to login

## Google OAuth Flow

1. User clicks "Continue with Google"
2. Frontend calls `authService.initiateGoogleAuth(role)`
3. User is redirected to backend OAuth endpoint
4. Backend handles Google authentication
5. Backend redirects to `/auth/callback?token=...`
6. Frontend callback page extracts token and fetches user data
7. User is redirected to appropriate dashboard

## Next Steps

### To Add More API Endpoints:

1. Create service file in `frontend/src/services/` (e.g., `taskService.ts`)
2. Import the `api` client from `@/lib/api`
3. Define methods for your endpoints

Example:

```typescript
// frontend/src/services/taskService.ts
import api from "@/lib/api";

export const taskService = {
  async getTasks() {
    const response = await api.get("/tasks");
    return response.data;
  },

  async createTask(data: any) {
    const response = await api.post("/tasks", data);
    return response.data;
  },
};
```

### To Protect Dashboard Routes:

Wrap your dashboard pages with `ProtectedRoute`:

```typescript
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['student', 'company']}>
      {/* Your dashboard content */}
    </ProtectedRoute>
  );
}
```

## Testing the Integration

1. Start the backend server:

```bash
cd backend
npm start
```

2. Start the frontend dev server:

```bash
cd frontend
npm run dev
```

3. Test the authentication flow:
   - Register a new account
   - Verify email with OTP
   - Login
   - Access protected routes
   - Logout

## Troubleshooting

### CORS Issues

Make sure the backend has CORS configured to allow requests from `http://localhost:3000`

### Token Not Persisting

Check browser console for localStorage errors. Some browsers block localStorage in incognito mode.

### 401 Errors

- Verify the token is being sent in the Authorization header
- Check if the token has expired
- Ensure the backend JWT_SECRET matches

### OAuth Not Working

- Verify Google OAuth credentials in backend `.env`
- Check that callback URL matches in Google Console
- Ensure frontend callback route exists at `/auth/callback`

## Security Notes

- Never commit `.env` files with real credentials
- Use HTTPS in production
- Implement CSRF protection for production
- Consider using httpOnly cookies instead of localStorage for tokens in production
- Implement rate limiting on authentication endpoints
- Add input validation on both frontend and backend

## Production Deployment

Before deploying to production:

1. Update `NEXT_PUBLIC_API_URL` to production backend URL
2. Enable HTTPS
3. Update CORS settings to allow only production frontend domain
4. Use secure, httpOnly cookies for tokens
5. Implement proper session management
6. Add monitoring and logging
7. Set up proper error tracking (e.g., Sentry)

---

**Integration Status:** ✅ Complete and Ready for Testing
