# Quick Start Guide

Get your authentication backend running in 5 minutes!

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Gmail account (for email features)

## Step 1: Install Dependencies

\`\`\`bash
cd backend
npm install
\`\`\`

## Step 2: Configure Environment

Open `.env` file and update these variables:

### MongoDB (Required)

\`\`\`env
MONGODB_URI=mongodb://localhost:27017/smart_ai_internship
\`\`\`

Or use MongoDB Atlas (cloud):
\`\`\`env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart_ai_internship
\`\`\`

### JWT Secret (Required)

Generate a random string:
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

Update in `.env`:
\`\`\`env
JWT_SECRET=your-generated-secret-here
SESSION_SECRET=your-generated-secret-here
\`\`\`

### Email Configuration (Required for email features)

#### Using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update in `.env`:

\`\`\`env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
\`\`\`

#### Using Other Email Providers:

\`\`\`env
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-password
\`\`\`

### Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Update in `.env`:

\`\`\`env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
\`\`\`

## Step 3: Start MongoDB

### Local MongoDB:

\`\`\`bash
mongod
\`\`\`

### Docker:

\`\`\`bash
docker run -d -p 27017:27017 --name mongodb mongo
\`\`\`

### MongoDB Atlas:

No action needed - just use the connection string

## Step 4: Start the Server

\`\`\`bash
npm run dev
\`\`\`

You should see:
\`\`\`
Server running in development mode on port 5000
MongoDB Connected: localhost
\`\`\`

## Step 5: Test the API

### Option 1: Using Postman

1. Import `postman_collection.json`
2. Run "Register Student" request
3. Check your email for verification
4. Run "Login" request

### Option 2: Using cURL

Register:
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/register \\
-H "Content-Type: application/json" \\
-d '{
"email": "test@example.com",
"password": "password123",
"role": "student",
"firstName": "John",
"lastName": "Doe"
}'
\`\`\`

Login:
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/login \\
-H "Content-Type: application/json" \\
-d '{
"email": "test@example.com",
"password": "password123"
}'
\`\`\`

### Option 3: Using Browser

Visit: http://localhost:5000/health

## Common Issues

### MongoDB Connection Error

- Make sure MongoDB is running
- Check connection string in `.env`
- For Atlas, whitelist your IP address

### Email Not Sending

- Verify Gmail App Password (not regular password)
- Check 2FA is enabled
- Try with a different email provider

### Google OAuth Not Working

- Verify redirect URI matches exactly
- Check client ID and secret
- Make sure Google+ API is enabled

## Next Steps

1. ✅ Backend is running
2. Connect your frontend
3. Test all authentication flows
4. Customize email templates
5. Add more features

## API Documentation

Full API documentation available in `README.md`

## Support

Check the main README.md for detailed documentation and troubleshooting.
