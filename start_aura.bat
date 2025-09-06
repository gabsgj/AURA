@echo off
chcp 65001 >nul
SETLOCAL

REM ==================================================
REM  AURA Single Startup Script (Windows)
REM  Starts both Backend and Frontend servers
REM ==================================================

echo 🚀 Starting AURA Application Suite
echo.

REM Check if running from correct directory
IF NOT EXIST "backend\app.py" (
    echo ❌ Error: Please run this script from the AURA root directory
    echo    Expected: backend\app.py not found
    pause
    exit /b 1
)

echo ✅ Environment Check: Running from AURA root directory
echo.

REM Check environment files
echo 🔍 Checking environment configuration...
IF NOT EXIST "backend\.env" (
    echo ⚠️  backend\.env not found.
    IF EXIST ".env" (
        copy /Y ".env" "backend\.env" >nul
        echo ✅ Copied .env to backend\.env
    ) ELSE (
        echo ❌ No .env file found. Please create one with your API keys.
        pause
        exit /b 1
    )
) ELSE (
    echo ✅ Backend environment file found
)

IF NOT EXIST "frontend\.env" (
    echo ⚠️  frontend\.env not found. Creating default...
    echo VITE_API_ORIGIN=http://localhost:5000 > "frontend\.env"
    echo ✅ Created frontend\.env with default configuration
) ELSE (
    echo ✅ Frontend environment file found
)

echo.
echo 🐍 Starting Backend Server (Flask)...

REM Start backend in a new window
start "AURA Backend" cmd /k "cd /d "%~dp0backend" && python app.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo ✅ Backend server starting in separate window
echo.

echo 📦 Starting Frontend Server (Vite)...

REM Start frontend in a new window
start "AURA Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo ✅ Frontend server starting in separate window
echo.

echo 🎉 AURA Application Suite Started Successfully!
echo.
echo 📊 Application URLs:
echo    Backend API:  http://localhost:5000
echo    Frontend App: http://localhost:3000
echo    Health Check: http://localhost:5000/api/health
echo.
echo 🔧 Server Windows:
echo    - Backend: Check "AURA Backend" window for Flask logs
echo    - Frontend: Check "AURA Frontend" window for Vite logs
echo.
echo 🛑 To Stop Servers:
echo    - Close both "AURA Backend" and "AURA Frontend" windows
echo    - Or press Ctrl+C in each window
echo.
echo 💡 Tip: Wait 10-15 seconds for both servers to fully start
echo      Then open http://localhost:3000 in your browser
echo.

REM Wait for user acknowledgment
echo Press any key to open the application in your browser...
pause >nul

REM Open the application in default browser
start http://localhost:3000

echo.
echo 🌐 Browser opened. If it doesn't load, wait a few more seconds.
echo.
echo ℹ️  This window can be closed after servers are running.
echo    The backend and frontend will continue in their own windows.
echo.

ENDLOCAL
