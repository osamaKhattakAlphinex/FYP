# Smart AI Micro Internship Platform

A full-stack web application connecting students with micro-internship opportunities, powered by AI-driven matching and assessment.

## 🎯 Project Overview

This platform enables:

- **Students** to find and apply for micro-internships
- **Companies** to post tasks and evaluate candidates
- **AI-powered** matching and skill assessment
- **Real-time** collaboration and feedback

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│  Express.js │────▶│   MongoDB   │
│  Frontend   │     │   Backend   │     │  Database   │
│  (Port 3000)│     │  (Port 5000)│     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  AI Service │
                    │  (Port 8000)│
                    └─────────────┘
```

## ✅ Integration Status

**Frontend-Backend Integration:** ✅ Complete

All authentication endpoints are connected and functional:

- ✅ User Registration (Student/Company/Admin)
- ✅ Email/Password Login
- ✅ Email Verification with OTP
- ✅ Password Reset Flow
- ✅ Google OAuth Integration
- ✅ Protected Routes with Role-based Access
- ✅ Token Management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd smart-ai-micro-internship
```

2. **Run setup script**

**Windows:**

```bash
setup-integration.bat
```

**Mac/Linux:**

```bash
chmod +x setup-integration.sh
./setup-integration.sh
```

**Or manually:**

```bash
cd frontend
npm install
```

3. **Configure environment variables**

**Frontend (`.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Backend (`.env`):**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart_ai_internship
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
```

4. **Start the services**

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

5. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📁 Project Structure

```
smart-ai-micro-internship/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js pages (App Router)
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── lib/             # Utilities (HTTP client)
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   └── server.js        # Express app
│   └── package.json
│
├── ai-service/              # Python AI service (Future)
│
└── Documentation/
    ├── INTEGRATION_COMPLETE.md
    ├── FRONTEND_BACKEND_INTEGRATION.md
    ├── INTEGRATION_CHECKLIST.md
    ├── INTEGRATION_ARCHITECTURE.md
    └── QUICK_REFERENCE.md
```

## 🔑 Key Features

### Authentication & Authorization

- Multi-role registration (Student, Company, Admin)
- Email verification with OTP
- JWT-based authentication
- Google OAuth integration
- Password reset functionality
- Protected routes with role-based access

### Student Features

- Profile management
- Task browsing and application
- Skill assessment
- Progress tracking
- Certificate generation

### Company Features

- Task posting and management
- Candidate evaluation
- Analytics dashboard
- Team collaboration

### Admin Features

- User management
- Platform analytics
- Content moderation

## 🛠️ Technology Stack

### Frontend

- **Framework:** Next.js 14 (React 18)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **State Management:** React Context API

### Backend

- **Framework:** Express.js
- **Language:** JavaScript (Node.js)
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + Passport.js
- **Security:** Helmet, CORS, Rate Limiting
- **Validation:** Express Validator

### AI Service (Future)

- **Framework:** FastAPI
- **Language:** Python
- **ML Libraries:** TensorFlow, scikit-learn

## 📚 Documentation

| Document                                                             | Description                          |
| -------------------------------------------------------------------- | ------------------------------------ |
| [INTEGRATION_COMPLETE.md](./INTEGRATION_COMPLETE.md)                 | Integration overview and quick start |
| [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) | Detailed integration guide           |
| [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md)               | Testing checklist                    |
| [INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)         | System architecture diagrams         |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)                           | Quick reference for developers       |
| [backend/README.md](./backend/README.md)                             | Backend API documentation            |
| [backend/API_TESTING_GUIDE.md](./backend/API_TESTING_GUIDE.md)       | API testing guide                    |

## 🧪 Testing

### Test Authentication Flow

1. **Register a new user**
   - Go to http://localhost:3000/register
   - Fill in the form and submit
   - Check email for OTP

2. **Verify email**
   - Enter OTP code
   - Should redirect to dashboard

3. **Login**
   - Go to http://localhost:3000/login
   - Enter credentials
   - Should redirect to role-specific dashboard

4. **Test protected routes**
   - Try accessing `/student/dashboard` without login
   - Should redirect to login page

### API Testing

Use the Postman collection in `backend/postman_collection.json` or test with curl:

```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"student"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔐 Security

- JWT token-based authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation and sanitization
- Helmet security headers
- MongoDB injection prevention

## 🚧 Roadmap

### Phase 1: Core Features ✅

- [x] Authentication system
- [x] User registration and login
- [x] Email verification
- [x] Password reset
- [x] Google OAuth

### Phase 2: User Features (In Progress)

- [ ] Student profile management
- [ ] Company profile management
- [ ] Task posting and browsing
- [ ] Application system

### Phase 3: AI Integration

- [ ] AI-powered skill assessment
- [ ] Intelligent task matching
- [ ] Automated feedback generation

### Phase 4: Advanced Features

- [ ] Real-time chat
- [ ] Video interviews
- [ ] Payment integration
- [ ] Certificate generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Add your license here]

## 👥 Team

[Add team members here]

## 📞 Support

For issues and questions:

- Check the documentation
- Review error messages in browser console
- Check backend logs
- Create an issue on GitHub

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Express.js community
- MongoDB team
- All contributors

---

**Project Status:** 🟢 Active Development
**Integration Status:** ✅ Complete
**Version:** 1.0.0
**Last Updated:** 2024
