# Testing Guide - Session Management & Authentication

## Quick Test Scenarios

### Scenario 1: New User Registration & Email Verification

1. **Register New User**

   ```
   Navigate to: http://localhost:3000/register
   Fill in:
   - Email: test@example.com
   - Password: Test123!
   - Role: Student
   - Name: John Doe
   Click: "Create Account"
   ```

2. **Expected Results:**
   - ✅ Toast: "Registration successful! Please check your email..."
   - ✅ Redirect to: /verify-email?email=test@example.com
   - ✅ Email received with 6-digit OTP

3. **Verify Email**

   ```
   Enter the 6-digit OTP from email
   ```

4. **Expected Results:**
   - ✅ Toast: "Email verified successfully!"
   - ✅ Redirect to: /student/dashboard
   - ✅ Dashboard header shows with user info
   - ✅ Logout button visible

### Scenario 2: Login with Unverified Email

1. **Register but Don't Verify**

   ```
   Register a new user
   Close the verify-email page without verifying
   ```

2. **Try to Login**

   ```
   Navigate to: http://localhost:3000/login
   Enter credentials
   Click: "Sign In"
   ```

3. **Expected Results:**
   - ✅ Toast: "Please verify your email before logging in"
   - ✅ Redirect to: /verify-email?email=test@example.com
   - ✅ Can request new OTP
   - ✅ After verification, can login successfully

### Scenario 3: Login with Verified Email

1. **Login**

   ```
   Navigate to: http://localhost:3000/login
   Enter verified user credentials
   Click: "Sign In"
   ```

2. **Expected Results:**
   - ✅ Toast: "Login successful!"
   - ✅ Redirect to role-based dashboard
   - ✅ Navbar shows user dropdown instead of Login/Signup
   - ✅ Dashboard header shows with user info

### Scenario 4: Session Persistence

1. **Login and Refresh**

   ```
   Login to dashboard
   Refresh the page (F5)
   ```

2. **Expected Results:**
   - ✅ User stays logged in
   - ✅ Dashboard still shows
   - ✅ User dropdown still visible

3. **Close and Reopen Browser**

   ```
   Close browser completely
   Reopen and navigate to site
   ```

4. **Expected Results:**
   - ✅ User still logged in
   - ✅ Can access dashboard directly

### Scenario 5: User Dropdown Functionality

1. **Open Dropdown**

   ```
   Click on user avatar/name in navbar
   ```

2. **Expected Results:**
   - ✅ Dropdown opens
   - ✅ Shows user name
   - ✅ Shows email
   - ✅ Shows role badge
   - ✅ Shows Dashboard link
   - ✅ Shows Profile link
   - ✅ Shows Sign Out button

3. **Test Links**

   ```
   Click "Dashboard" - should navigate to dashboard
   Click "Profile" - should navigate to profile
   ```

4. **Close Dropdown**

   ```
   Click outside dropdown
   ```

5. **Expected Results:**
   - ✅ Dropdown closes

### Scenario 6: Logout Functionality

1. **Logout from Dropdown**

   ```
   Click user avatar
   Click "Sign Out"
   ```

2. **Expected Results:**
   - ✅ Toast: "Logged out successfully"
   - ✅ Redirect to home page
   - ✅ Navbar shows Login/Signup buttons
   - ✅ Cannot access dashboard without login

3. **Logout from Dashboard**

   ```
   In dashboard, click "Logout" button in header
   ```

4. **Expected Results:**
   - ✅ Toast: "Logged out successfully"
   - ✅ Redirect to home page
   - ✅ Session cleared

### Scenario 7: OTP Resend Functionality

1. **Request New OTP**

   ```
   On verify-email page
   Wait for countdown (or start with 0)
   Click "Resend Code"
   ```

2. **Expected Results:**
   - ✅ Toast: "Verification code sent to your email"
   - ✅ New email received with new OTP
   - ✅ 30-second countdown starts
   - ✅ Button disabled during countdown

### Scenario 8: Invalid OTP Handling

1. **Enter Wrong OTP**

   ```
   On verify-email page
   Enter incorrect 6-digit code
   ```

2. **Expected Results:**
   - ✅ Toast: "Invalid OTP"
   - ✅ Error message shown
   - ✅ Can try again (max 3 attempts)

3. **Max Attempts Exceeded**

   ```
   Enter wrong OTP 3 times
   ```

4. **Expected Results:**
   - ✅ Toast: "Maximum OTP attempts exceeded..."
   - ✅ Must request new OTP

### Scenario 9: Expired OTP Handling

1. **Wait for OTP to Expire**

   ```
   Wait 10 minutes after receiving OTP
   Try to verify with old OTP
   ```

2. **Expected Results:**
   - ✅ Toast: "OTP has expired. Please request a new code."
   - ✅ Can request new OTP

### Scenario 10: Mobile Responsiveness

1. **Test on Mobile**

   ```
   Open site on mobile device or resize browser
   ```

2. **Expected Results:**
   - ✅ Navbar hamburger menu works
   - ✅ User dropdown shows in mobile menu
   - ✅ Dashboard header responsive
   - ✅ Toasts positioned correctly
   - ✅ All buttons accessible

## Toast Notification Checklist

### Success Toasts (Green)

- [ ] Registration successful
- [ ] Login successful
- [ ] Email verified successfully
- [ ] OTP sent successfully
- [ ] Logged out successfully

### Error Toasts (Red)

- [ ] Please verify your email
- [ ] Invalid credentials
- [ ] Registration failed
- [ ] Failed to send OTP
- [ ] Invalid OTP
- [ ] Maximum attempts exceeded
- [ ] OTP expired
- [ ] Failed to logout

## Dashboard Features Checklist

### Student Dashboard

- [ ] Dashboard header shows
- [ ] User info displayed correctly
- [ ] Logout button works
- [ ] Welcome banner shows
- [ ] Stats cards display
- [ ] Recommended tasks show
- [ ] Recent activity shows

### Company Dashboard

- [ ] Dashboard header shows
- [ ] User info displayed correctly
- [ ] Logout button works
- [ ] Welcome banner shows
- [ ] Stats cards display
- [ ] Active tasks show
- [ ] Recent applications show

## Navbar Checklist

### When Logged Out

- [ ] Shows "Log In" button
- [ ] Shows "Get Started Free" button
- [ ] Navigation links work
- [ ] Mobile menu works

### When Logged In

- [ ] Shows user avatar with initials
- [ ] Shows user name (desktop)
- [ ] User dropdown works
- [ ] Navigation links work
- [ ] Mobile menu shows user info

## Security Checklist

- [ ] Cannot access dashboard without login
- [ ] Cannot login with unverified email
- [ ] Session persists correctly
- [ ] Logout clears all session data
- [ ] Token validated on app mount
- [ ] Invalid token redirects to login
- [ ] OTP attempts limited to 3
- [ ] OTP expires after 10 minutes

## Browser Compatibility

Test on:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Performance Checklist

- [ ] Toasts appear instantly
- [ ] Dropdown opens smoothly
- [ ] Page transitions smooth
- [ ] No layout shifts
- [ ] Fast session check on mount

## Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Touch targets large enough

## Common Issues & Solutions

### Issue: Toast not showing

- Check browser console for errors
- Verify ToastProvider in layout.tsx
- Check react-hot-toast installation

### Issue: User dropdown not appearing

- Check if user is logged in
- Verify AuthProvider wraps app
- Check localStorage for token

### Issue: Session not persisting

- Check localStorage in browser DevTools
- Verify token is being saved
- Check API response includes token

### Issue: Redirect not working

- Check router.push() calls
- Verify route paths are correct
- Check for console errors

### Issue: Email not received

- Check spam folder
- Verify email configuration in backend .env
- Check backend logs for email errors

## Test Data

### Valid Test Users

```
Student:
- Email: student@test.com
- Password: Test123!
- Name: John Doe

Company:
- Email: company@test.com
- Password: Test123!
- Company Name: TechCorp Inc.
```

### Invalid Test Cases

```
- Email: invalid-email (should fail validation)
- Password: 123 (too short)
- OTP: 123456 (wrong OTP)
- OTP: 000000 (expired OTP)
```

## Backend Requirements

Ensure backend is running:

```bash
cd smart-ai-micro-internship/backend
npm start
```

Expected output:

```
Server running in development mode on port 5000
MongoDB Connected: localhost
```

## Frontend Requirements

Ensure frontend is running:

```bash
cd smart-ai-micro-internship/frontend
npm run dev
```

Expected output:

```
ready - started server on 0.0.0.0:3000
```

## API Endpoints to Test

1. **POST /api/auth/register**
   - Creates new user
   - Sends OTP email
   - Returns success message

2. **POST /api/auth/login**
   - Validates credentials
   - Returns user and token
   - Checks email verification

3. **POST /api/auth/verify-otp**
   - Validates OTP
   - Marks email as verified
   - Returns user and token

4. **POST /api/auth/send-otp**
   - Generates new OTP
   - Sends email
   - Returns success message

5. **GET /api/auth/me**
   - Returns current user
   - Requires authentication
   - Returns user with role data

6. **POST /api/auth/logout**
   - Clears session
   - Returns success message

## Success Criteria

All tests pass when:

- ✅ User can register and receive OTP
- ✅ User can verify email with OTP
- ✅ Unverified users redirected to verify-email
- ✅ Verified users can login successfully
- ✅ Session persists across refreshes
- ✅ User dropdown shows when logged in
- ✅ Dashboard header shows with logout
- ✅ Logout clears session and redirects
- ✅ Toast notifications show for all actions
- ✅ Mobile responsive design works
- ✅ All security measures in place

## Reporting Issues

When reporting issues, include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Console errors (if any)
6. Screenshots (if applicable)
