# Frontend Integration Guide

How to integrate this authentication backend with your Next.js frontend.

## Setup

### 1. Install Axios (or your preferred HTTP client)

\`\`\`bash
cd frontend
npm install axios
\`\`\`

### 2. Create API Client

Create `src/lib/api.ts`:

\`\`\`typescript
import axios from 'axios';

const api = axios.create({
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
withCredentials: true, // Important for cookies
headers: {
'Content-Type': 'application/json',
},
});

// Add token to requests
api.interceptors.request.use((config) => {
const token = localStorage.getItem('token');
if (token) {
config.headers.Authorization = \`Bearer \${token}\`;
}
return config;
});

// Handle token expiration
api.interceptors.response.use(
(response) => response,
(error) => {
if (error.response?.status === 401) {
localStorage.removeItem('token');
window.location.href = '/login';
}
return Promise.reject(error);
}
);

export default api;
\`\`\`

### 3. Create Auth Service

Create `src/services/authService.ts`:

\`\`\`typescript
import api from '@/lib/api';

export interface RegisterData {
email: string;
password: string;
role: 'student' | 'company' | 'admin';
firstName?: string;
lastName?: string;
companyName?: string;
}

export interface LoginData {
email: string;
password: string;
}

export const authService = {
// Register
async register(data: RegisterData) {
const response = await api.post('/auth/register', data);
return response.data;
},

// Login
async login(data: LoginData) {
const response = await api.post('/auth/login', data);
if (response.data.token) {
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));
}
return response.data;
},

// Logout
async logout() {
await api.post('/auth/logout');
localStorage.removeItem('token');
localStorage.removeItem('user');
},

// Get current user
async getCurrentUser() {
const response = await api.get('/auth/me');
return response.data.user;
},

// Verify email with token
async verifyEmail(token: string) {
const response = await api.get(\`/auth/verify-email/\${token}\`);
if (response.data.token) {
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));
}
return response.data;
},

// Resend verification email
async resendVerification(email: string) {
const response = await api.post('/auth/resend-verification', { email });
return response.data;
},

// Send OTP
async sendOTP(email: string) {
const response = await api.post('/auth/send-otp', { email });
return response.data;
},

// Verify OTP
async verifyOTP(email: string, otp: string) {
const response = await api.post('/auth/verify-otp', { email, otp });
if (response.data.token) {
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));
}
return response.data;
},

// Forgot password
async forgotPassword(email: string) {
const response = await api.post('/auth/forgot-password', { email });
return response.data;
},

// Reset password
async resetPassword(token: string, password: string, confirmPassword: string) {
const response = await api.put(\`/auth/reset-password/\${token}\`, {
password,
confirmPassword,
});
if (response.data.token) {
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));
}
return response.data;
},

// Update password
async updatePassword(currentPassword: string, newPassword: string) {
const response = await api.put('/auth/update-password', {
currentPassword,
newPassword,
});
return response.data;
},

// Delete account
async deleteAccount(password: string) {
const response = await api.delete('/auth/delete-account', {
data: { password },
});
localStorage.removeItem('token');
localStorage.removeItem('user');
return response.data;
},

// Google OAuth
initiateGoogleAuth(role: 'student' | 'company') {
window.location.href = \`\${process.env.NEXT_PUBLIC_API_URL}/auth/google?role=\${role}\`;
},
};
\`\`\`

## Usage Examples

### Register Form

\`\`\`typescript
'use client';

import { useState } from 'react';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
const router = useRouter();
const [formData, setFormData] = useState({
email: '',
password: '',
role: 'student',
firstName: '',
lastName: '',
});
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setLoading(true);
setError('');

    try {
      await authService.register(formData);
      router.push('/verify-email?email=' + formData.email);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }

};

return (
<form onSubmit={handleSubmit}>
{error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>

);
}
\`\`\`

### Login Form

\`\`\`typescript
'use client';

import { useState } from 'react';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
const router = useRouter();
const [formData, setFormData] = useState({
email: '',
password: '',
});
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setLoading(true);
setError('');

    try {
      const data = await authService.login(formData);

      // Redirect based on role
      if (data.user.role === 'student') {
        router.push('/student/dashboard');
      } else if (data.user.role === 'company') {
        router.push('/company/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }

};

const handleGoogleLogin = () => {
authService.initiateGoogleAuth('student');
};

return (
<form onSubmit={handleSubmit}>
{error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <button type="button" onClick={handleGoogleLogin}>
        Login with Google
      </button>
    </form>

);
}
\`\`\`

### OTP Verification

\`\`\`typescript
'use client';

import { useState } from 'react';
import { authService } from '@/services/authService';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OTPVerification() {
const router = useRouter();
const searchParams = useSearchParams();
const email = searchParams.get('email') || '';

const [otp, setOtp] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);

const handleVerify = async (e: React.FormEvent) => {
e.preventDefault();
setLoading(true);
setError('');

    try {
      await authService.verifyOTP(email, otp);
      router.push('/student/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }

};

const handleResendOTP = async () => {
try {
await authService.sendOTP(email);
alert('OTP sent successfully!');
} catch (err: any) {
setError(err.response?.data?.error || 'Failed to send OTP');
}
};

return (
<form onSubmit={handleVerify}>
{error && <div className="error">{error}</div>}

      <p>Enter the 6-digit code sent to {email}</p>

      <input
        type="text"
        placeholder="000000"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        maxLength={6}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>

      <button type="button" onClick={handleResendOTP}>
        Resend OTP
      </button>
    </form>

);
}
\`\`\`

### Protected Route HOC

Create `src/components/ProtectedRoute.tsx`:

\`\`\`typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function ProtectedRoute({
children,
allowedRoles,
}: {
children: React.ReactNode;
allowedRoles?: string[];
}) {
const router = useRouter();
const [loading, setLoading] = useState(true);
const [authorized, setAuthorized] = useState(false);

useEffect(() => {
const checkAuth = async () => {
const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const user = await authService.getCurrentUser();

        if (allowedRoles && !allowedRoles.includes(user.role)) {
          router.push('/unauthorized');
          return;
        }

        setAuthorized(true);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

}, [router, allowedRoles]);

if (loading) {
return <div>Loading...</div>;
}

return authorized ? <>{children}</> : null;
}
\`\`\`

### Usage in Pages

\`\`\`typescript
// app/(dashboard)/student/dashboard/page.tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StudentDashboard() {
return (
<ProtectedRoute allowedRoles={['student']}>
<div>Student Dashboard Content</div>
</ProtectedRoute>
);
}
\`\`\`

## Environment Variables

Add to `frontend/.env.local`:

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
\`\`\`

## Google OAuth Callback Handler

Create `app/auth/callback/page.tsx`:

\`\`\`typescript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
const router = useRouter();
const searchParams = useSearchParams();

useEffect(() => {
const token = searchParams.get('token');
const error = searchParams.get('error');

    if (error) {
      router.push('/login?error=' + error);
      return;
    }

    if (token) {
      localStorage.setItem('token', token);

      // Fetch user data
      fetch('http://localhost:5000/api/auth/me', {
        headers: {
          Authorization: \`Bearer \${token}\`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          localStorage.setItem('user', JSON.stringify(data.user));

          // Redirect based on role
          if (data.user.role === 'student') {
            router.push('/student/dashboard');
          } else if (data.user.role === 'company') {
            router.push('/company/dashboard');
          }
        })
        .catch(() => {
          router.push('/login?error=authentication_failed');
        });
    }

}, [router, searchParams]);

return <div>Authenticating...</div>;
}
\`\`\`

## Error Handling

\`\`\`typescript
try {
await authService.login(formData);
} catch (err: any) {
if (err.response?.data?.errors) {
// Validation errors
err.response.data.errors.forEach((error: any) => {
console.log(\`\${error.field}: \${error.message}\`);
});
} else {
// General error
console.log(err.response?.data?.error || 'An error occurred');
}
}
\`\`\`

## Complete Integration Checklist

- [ ] Install axios
- [ ] Create API client
- [ ] Create auth service
- [ ] Update register form
- [ ] Update login form
- [ ] Add OTP verification
- [ ] Add forgot password
- [ ] Add reset password
- [ ] Add Google OAuth
- [ ] Create protected route component
- [ ] Add OAuth callback handler
- [ ] Update environment variables
- [ ] Test all flows

Your authentication system is now fully integrated!
