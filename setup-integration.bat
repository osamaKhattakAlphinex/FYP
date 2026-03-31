@echo off
echo 🚀 Setting up Frontend-Backend Integration...
echo.

cd frontend

echo 📦 Installing dependencies...
call npm install

echo.
echo ✅ Integration setup complete!
echo.
echo 📝 Next steps:
echo 1. Make sure backend is running: cd backend ^&^& npm start
echo 2. Start frontend dev server: cd frontend ^&^& npm run dev
echo 3. Open http://localhost:3000 in your browser
echo.
echo 📖 See FRONTEND_BACKEND_INTEGRATION.md for detailed documentation

pause
