@echo off
echo ========================================
echo  Real-Time Communication App Starter
echo ========================================
echo.

echo Installing dependencies...
call npm run install-all

echo.
echo Starting the application...
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
echo.

call npm run dev

pause
