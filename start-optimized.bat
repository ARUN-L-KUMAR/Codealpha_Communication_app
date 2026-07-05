@echo off
echo ========================================
echo  ConnectPro - Professional Communication
echo ========================================
echo.

echo Starting optimized servers...
echo.

echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
echo.

cd backend
start "ConnectPro Backend" cmd /k "node optimized-server.js"

cd ../frontend
start "ConnectPro Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo  ConnectPro is starting...
echo  Please wait for both servers to load
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Test Login: test@example.com / password123
echo ========================================

timeout /t 3 >nul
start http://localhost:5173

pause
