@echo off
title ConnectPro Startup
color 0A

echo.
echo ========================================
echo   ConnectPro - Professional Communication
echo ========================================
echo.

echo [STEP 1] Checking for existing processes on port 5000...
netstat -ano | findstr :5000 > nul
if %errorlevel% == 0 (
    echo Found existing process on port 5000, killing it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /PID %%a /F > nul 2>&1
    timeout /t 2 > nul
)

echo [STEP 2] Starting Backend Server...
cd backend
start "ConnectPro Backend" cmd /k "echo Starting ConnectPro Backend... && node working-server.js"

echo [STEP 3] Waiting for backend to start...
timeout /t 5 > nul

echo [STEP 4] Starting Frontend Server...
cd ../frontend
start "ConnectPro Frontend" cmd /k "echo Starting ConnectPro Frontend... && npm run dev"

echo.
echo ========================================
echo   ConnectPro is starting up...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo Health Check: http://localhost:5000/api/health
echo.
echo Login Credentials:
echo   Email: test@example.com
echo   Password: password123
echo.
echo Waiting 10 seconds for servers to fully load...
echo ========================================

timeout /t 10 > nul

echo Opening ConnectPro in browser...
start http://localhost:5173

echo.
echo ========================================
echo   ConnectPro is ready!
echo ========================================
echo.
echo If you see any issues:
echo 1. Check both terminal windows show server started
echo 2. Visit http://localhost:5173 manually
echo 3. Use login: test@example.com / password123
echo.
echo Press any key to exit this window...
pause > nul
