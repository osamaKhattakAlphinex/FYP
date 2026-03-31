# Troubleshooting Guide

## Common Issues and Solutions

### 🔴 Backend Issues

#### Issue: Backend won't start

**Error:** `Cannot find module 'express'`

**Solution:**

```bash
cd backend
npm install
```

---

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**

1. Make sure MongoDB is running:

```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

2. Check MongoDB connection string in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/smart_ai_internship
```

---

**Error:** `Port 5000 is already in use`

**Solution:**

1. Find and kill the process:

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

2. Or change the port in `.env`:

```env
PORT=5001
```

---

### 🔴 Frontend Issues

#### Issue: Frontend won't start

**Error:** `Cannot find module 'axios'`

**Solution:**

```bash
cd frontend
npm install
```

---

**Error:** `Port 3000 is already in use`

**Solution:**

1. Kill the process:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

2. Or start on different port:

```bash
PORT=3001 npm run dev
```

---

**Error:** `Module not found: Can't resolve '@/lib/api'`

**Solution:**
Check `tsconfig.json` has correct path mapping:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### 🔴 Integration Issues

#### Issue: CORS Error

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**

1. Check backend CORS configuration in `backend/src/server.js`:

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
```

2. Verify `.env` has correct frontend URL:

```env
FRONTEND_URL=http://localhost:3000
```

3. Make sure `withCredentials: true` in `frontend/src/lib/api.ts`:

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});
```

---

#### Issue: 401 Unauthorized on protected routes

**Error:** `Request failed with status code 401`

**Possible Causes & Solutions:**

1. **Token expired or invalid**

```typescript
// Clear localStorage and login again
localStorage.removeItem("token");
localStorage.removeItem("user");
window.location.href = "/login";
```

2. **Token not being sent**
   Check interceptor in `frontend/src/lib/api.ts`:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

3. **JWT_SECRET mismatch**
   Verify backend `.env` has JWT_SECRET set:

```env
JWT_SECRET=your-secret-key-here
```

---

#### Issue: API requests going to wrong URL

**Error:** `Network Error` or `404 Not Found`

**Solution:**

1. Check `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

2. Restart frontend dev server after changing `.env.local`

3. Verify in browser console:

```javascript
console.log(process.env.NEXT_PUBLIC_API_URL);
```

---

### 🔴 Authentication Issues

#### Issue: Registration not working

**Error:** `Email already exists`

**Solution:**
User already registered. Try logging in or use different email.

---

**Error:** `Password must be at least 8 characters`

**Solution:**
Use a stronger password that meets requirements:

- At least 8 characters
- Contains uppercase and lowercase
- Contains numbers
- Contains special characters

---

#### Issue: OTP not received

**Possible Causes & Solutions:**

1. **Email service not configured**
   Check backend `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

2. **Check spam folder**
   OTP emails might be in spam

3. **Resend OTP**
   Click "Resend OTP" button on verification page

---

#### Issue: Google OAuth not working

**Error:** `Redirect URI mismatch`

**Solution:**

1. Check Google Console callback URL matches:

```
http://localhost:5000/api/auth/google/callback
```

2. Verify backend `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

**Error:** `Invalid OAuth credentials`

**Solution:**

1. Verify Google OAuth credentials in backend `.env`
2. Make sure OAuth consent screen is configured
3. Add test users in Google Console

---

### 🔴 Database Issues

#### Issue: Database connection failed

**Error:** `MongooseServerSelectionError`

**Solution:**

1. Start MongoDB:

```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

2. Check MongoDB is running:

```bash
# Windows
sc query MongoDB

# Mac/Linux
ps aux | grep mongod
```

3. Test connection:

```bash
mongosh
```

---

#### Issue: Data not persisting

**Possible Causes & Solutions:**

1. **Database not connected**
   Check backend logs for connection success message

2. **Validation errors**
   Check backend logs for validation errors

3. **Model issues**
   Verify model schema in `backend/src/models/`

---

### 🔴 Token Issues

#### Issue: Token not persisting after refresh

**Cause:** localStorage cleared or browser in incognito mode

**Solution:**

1. Don't use incognito mode for development
2. Check browser settings allow localStorage
3. Consider using httpOnly cookies in production

---

#### Issue: Token expires too quickly

**Solution:**
Increase token expiration in backend `.env`:

```env
JWT_EXPIRE=7d
```

---

### 🔴 Development Issues

#### Issue: Hot reload not working

**Solution:**

1. Restart dev server
2. Clear `.next` cache:

```bash
cd frontend
rm -rf .next
npm run dev
```

---

#### Issue: TypeScript errors

**Error:** `Type 'X' is not assignable to type 'Y'`

**Solution:**

1. Check type definitions in `frontend/src/types/`
2. Run TypeScript compiler:

```bash
npx tsc --noEmit
```

---

### 🔴 Production Issues

#### Issue: Environment variables not working in production

**Solution:**

1. For Next.js, prefix with `NEXT_PUBLIC_` for client-side variables
2. Rebuild after changing environment variables:

```bash
npm run build
```

---

#### Issue: HTTPS required in production

**Solution:**

1. Use HTTPS for both frontend and backend
2. Update CORS to allow HTTPS origin
3. Set secure cookies:

```javascript
cookie: {
  secure: true,
  httpOnly: true,
  sameSite: 'strict'
}
```

---

## 🔍 Debugging Tips

### Check Backend Logs

```bash
cd backend
npm start
# Watch for errors in console
```

### Check Frontend Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors or warnings

### Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by XHR/Fetch
4. Check request/response details

### Test API Directly

```bash
# Test with curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Check Database

```bash
# Connect to MongoDB
mongosh

# Use database
use smart_ai_internship

# Check collections
show collections

# Find users
db.users.find()
```

### Verify Environment Variables

```bash
# Backend
cd backend
cat .env

# Frontend
cd frontend
cat .env.local
```

## 🆘 Still Having Issues?

1. **Check Documentation**
   - Read `INTEGRATION_COMPLETE.md`
   - Review `FRONTEND_BACKEND_INTEGRATION.md`
   - Check `QUICK_REFERENCE.md`

2. **Clear Everything and Restart**

```bash
# Stop all servers
# Clear node_modules
cd frontend && rm -rf node_modules .next
cd ../backend && rm -rf node_modules

# Reinstall
cd frontend && npm install
cd ../backend && npm install

# Restart
cd backend && npm start
cd ../frontend && npm run dev
```

3. **Check Versions**

```bash
node --version  # Should be 18+
npm --version
mongod --version
```

4. **Create an Issue**
   - Provide error message
   - Include steps to reproduce
   - Share relevant code snippets
   - Include environment details

## 📞 Getting Help

- Check error messages carefully
- Search existing issues
- Review documentation
- Ask in community forums
- Create detailed bug reports

---

**Last Updated:** 2024
**Version:** 1.0.0
