@echo off
chcp 65001 >nul
SETLOCAL

REM ==================================================
REM  AURA Production Environment Setup (Windows)
REM ==================================================

echo 🚀 Starting AURA Production Environment

echo Checking environment files...
IF NOT EXIST "backend\.env" (
    echo ⚠️  backend\.env not found.
    IF EXIST "backend\.env.example" (
        copy /Y "backend\.env.example" "backend\.env" >nul
        echo Created backend\.env from example. Please edit it with your API keys.
    ) ELSE (
        echo Missing backend\.env.example template. Skipping copy.
    )
)

IF NOT EXIST "frontend\.env" (
    echo ⚠️  frontend\.env not found.
    IF EXIST "frontend\.env.example" (
        copy /Y "frontend\.env.example" "frontend\.env" >nul
        echo Created frontend\.env from example. Adjust values as needed.
    ) ELSE (
        echo Missing frontend\.env.example template. Skipping copy.
    )
)

echo.
echo 📦 Installing and building frontend...
PUSHD frontend
IF EXIST package.json (
    call npm install || goto :frontend_fail
    call npm run build || goto :frontend_fail
) ELSE (
    echo package.json not found in frontend directory.
    POPD
    goto :error
)
POPD

echo.
echo 🐍 Installing backend dependencies...
PUSHD backend
IF EXIST requirements.txt (
    REM Prefer python -m pip to ensure proper interpreter
    python -m pip install --upgrade pip >nul 2>&1
    python -m pip install -r requirements.txt || goto :backend_fail
) ELSE (
    echo requirements.txt not found in backend directory.
    POPD
    goto :error
)
POPD

echo.
echo ✅ AURA build complete!
echo.
echo To start the services:
echo   Backend:  cd backend ^& python app.py
echo   Frontend: serve the frontend\dist folder (e.g. npx serve frontend\dist)
echo.
echo For development:
echo   Backend:  cd backend ^& python app.py
echo   Frontend: cd frontend ^& npm run dev
echo.
echo 📊 Health Check: http://localhost:5000/api/health
echo.
goto :eof

:frontend_fail
echo ❌ Frontend build failed. Check the errors above.
POPD
goto :error

:backend_fail
echo ❌ Backend dependency installation failed. Check the errors above.
POPD
goto :error

:error
echo.
echo Build process did not complete successfully.
exit /b 1

ENDLOCAL
