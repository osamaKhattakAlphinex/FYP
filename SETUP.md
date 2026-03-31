# Setup Instructions

## Install Dependencies

### Frontend (Next.js)

```bash
cd frontend
npm install
```

### Backend (Node.js)

```bash
cd backend
npm install
```

### AI Service (Python)

```bash
cd ai-service
pip install -r requirements.txt
```

## Development Mode

Run each service in separate terminals:

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run dev

# AI Service
cd ai-service && uvicorn app.main:app --reload
```

## Docker Setup

```bash
docker-compose up -d
```

Note: TypeScript errors in the frontend will resolve after running `npm install` in the frontend directory.
