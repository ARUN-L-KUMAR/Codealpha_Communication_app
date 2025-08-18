@echo off
title ConnectPro - Professional Communication Platform
color 0A

echo.
echo ========================================
echo   ConnectPro - Professional Communication
echo ========================================
echo.
echo Starting servers...
echo.

echo [1/2] Starting Backend Server...
cd backend
start "ConnectPro Backend" cmd /k "echo Starting backend... && node minimal-server.js"

echo [2/2] Starting Frontend Server...
cd ../frontend
start "ConnectPro Frontend" cmd /k "echo Starting frontend... && npm run dev"

echo.
echo ========================================
echo   ConnectPro is starting up...
echo ========================================
echo.
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:5173
echo.
echo Login credentials:
echo Email: test@example.com
echo Password: password123
echo.
echo Please wait for both servers to fully load...
echo The application will open automatically in 10 seconds.
echo ========================================

timeout /t 10 /nobreak >nul

echo Opening ConnectPro...
start http://localhost:5173

echo.
echo ========================================
echo   ConnectPro is ready!
echo ========================================
echo.
echo If the app doesn't load:
echo 1. Make sure both terminal windows show "Server Started"
echo 2. Manually visit: http://localhost:5173
echo 3. Use login: test@example.com / password123
echo.

pause
