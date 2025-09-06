@echo off
chcp 65001 >nul
SETLOCAL

REM ==================================================
REM  AURA Quick Start - Single Command Launcher
REM ==================================================

echo 🚀 AURA Quick Start
echo.

REM Run development setup first
echo 📦 Setting up development environment...
call start_development.bat
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Setup failed. Please check the errors above.
    pause
    exit /b 1
)

echo.
echo ✅ Environment ready!
echo.

echo 🐍 Starting Backend...
start "AURA Backend" cmd /k "cd /d backend && python app.py"

echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo 📦 Starting Frontend...
start "AURA Frontend" cmd /k "cd /d frontend && npm run dev"

echo ⏳ Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo.
echo 🎉 AURA is starting up!
echo.
echo 🌐 Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

start http://localhost:3000

echo.
echo ✅ AURA Application Launched!
echo.
echo 📍 URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 🔧 Both servers are running in separate windows
echo 🛑 Close those windows to stop the servers
echo.

ENDLOCAL
