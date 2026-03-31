# Quick Reference Guide

## 🚀 Quick Start

```bash
# Install dependencies
cd frontend && npm install

# Start backend (Terminal 1)
cd backend && npm start

# Start frontend (Terminal 2)
cd frontend && npm run dev
```

## 📁 Key Files

| File                                              | Purpose                       |
| ------------------------------------------------- | ----------------------------- |
| `frontend/src/lib/api.ts`                         | HTTP client with interceptors |
| `frontend/src/services/authService.ts`            | Authentication API calls      |
| `frontend/src/contexts/AuthContext.tsx`           | Global auth state             |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route protection              |
| `backend/src/routes/authRoutes.js`                | API endpoints                 |
| `backend/src/controllers/authController.js`       | Business logic                |

## 🔑 Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend (`.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart_ai_internship
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

| Endpoint                          | Method | Auth | Purpose          |
| --------------------------------- | ------ | ---- | ---------------- |
| `/api/auth/register`              | POST   | No   | Register user    |
| `/api/auth/login`                 | POST   | No   | Login user       |
| `/api/auth/logout`                | POST   | Yes  | Logout user      |
| `/api/auth/me`                    | GET    | Yes  | Get current user |
| `/api/auth/send-otp`              | POST   | No   | Send OTP         |
| `/api/auth/verify-otp`            | POST   | No   | Verify OTP       |
| `/api/auth/forgot-password`       | POST   | No   | Request reset    |
| `/api/auth/reset-password/:token` | PUT    | No   | Reset password   |
| `/api/auth/google`                | GET    | No   | Google OAuth     |

## 💻 Code Examples

### Making API Calls

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
        <button onClick={logout}>Logout</button>
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

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div>Dashboard Content</div>
    </ProtectedRoute>
  );
}
```

### Creating New Services

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

## 🔒 Token Management

```typescript
// Store token
localStorage.setItem("token", token);

// Get token
const token = localStorage.getItem("token");

// Remove token
localStorage.removeItem("token");

// Check if authenticated
const isAuth = authService.isAuthenticated();
```

## 🐛 Common Issues

### CORS Error

```javascript
// backend/src/server.js
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
```

### 401 Unauthorized

```typescript
// Clear token and redirect
localStorage.removeItem("token");
window.location.href = "/login";
```

### Token Not Sent

```typescript
// Check interceptor in api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 🧪 Testing

### Test Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Protected Route

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📊 User Roles

| Role      | Dashboard Route      | Permissions                  |
| --------- | -------------------- | ---------------------------- |
| `student` | `/student/dashboard` | Apply to tasks, view profile |
| `company` | `/company/dashboard` | Post tasks, view candidates  |
| `admin`   | `/admin/analytics`   | Manage users, view analytics |

## 🔄 Authentication Flow

1. **Register** → Send OTP → Verify Email → Dashboard
2. **Login** → Verify Credentials → Store Token → Dashboard
3. **OAuth** → Google Auth → Callback → Store Token → Dashboard
4. **Forgot Password** → Send Email → Reset → Login

## 📝 Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Auth Response

```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## 🛠️ Useful Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Check backend health
curl http://localhost:5000/health
```

## 📚 Documentation

- `INTEGRATION_COMPLETE.md` - Overview and setup
- `FRONTEND_BACKEND_INTEGRATION.md` - Detailed guide
- `INTEGRATION_CHECKLIST.md` - Testing checklist
- `INTEGRATION_ARCHITECTURE.md` - System architecture
- `backend/API_TESTING_GUIDE.md` - API testing

## 🆘 Getting Help

1. Check documentation files
2. Review error messages in browser console
3. Check backend logs
4. Verify environment variables
5. Test API endpoints with curl/Postman

## ⚡ Performance Tips

- Use React Query for API caching
- Implement request debouncing
- Add loading states
- Lazy load components
- Optimize images

## 🔐 Security Checklist

- [ ] Use HTTPS in production
- [ ] Implement CSRF protection
- [ ] Use httpOnly cookies for tokens
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets

---

**Quick Reference Version:** 1.0.0
