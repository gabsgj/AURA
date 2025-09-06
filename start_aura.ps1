# AURA Single Startup Script (PowerShell)
# Starts both Backend and Frontend servers

param(
    [switch]$NoWait,
    [switch]$NoBrowser
)

# Set console encoding for Unicode support
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 Starting AURA Application Suite" -ForegroundColor Green
Write-Host ""

# Check if running from correct directory
if (-not (Test-Path "backend\app.py")) {
    Write-Host "❌ Error: Please run this script from the AURA root directory" -ForegroundColor Red
    Write-Host "   Expected: backend\app.py not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Environment Check: Running from AURA root directory" -ForegroundColor Green
Write-Host ""

# Check environment files
Write-Host "🔍 Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  backend\.env not found." -ForegroundColor Yellow
    if (Test-Path ".env") {
        Copy-Item ".env" "backend\.env"
        Write-Host "✅ Copied .env to backend\.env" -ForegroundColor Green
    } else {
        Write-Host "❌ No .env file found. Please create one with your API keys." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✅ Backend environment file found" -ForegroundColor Green
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "⚠️  frontend\.env not found. Creating default..." -ForegroundColor Yellow
    "VITE_API_ORIGIN=http://localhost:5000" | Out-File "frontend\.env" -Encoding UTF8
    Write-Host "✅ Created frontend\.env with default configuration" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend environment file found" -ForegroundColor Green
}

Write-Host ""

# Get Python executable path
try {
    $pythonPath = (Get-Command python -ErrorAction Stop).Source
    Write-Host "✅ Python found at: $pythonPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found in PATH. Please install Python 3.8+" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Start backend server
Write-Host "🐍 Starting Backend Server (Flask)..." -ForegroundColor Cyan

$backendScript = @"
Set-Location '$PWD\backend'
Write-Host 'AURA Backend Server Starting...' -ForegroundColor Green
Write-Host 'Directory: ' -NoNewline; Get-Location
Write-Host 'Python: $pythonPath' -ForegroundColor Gray
Write-Host ''
& '$pythonPath' app.py
"@

$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal -PassThru

Write-Host "✅ Backend server starting (PID: $($backendJob.Id))" -ForegroundColor Green

# Wait for backend to initialize
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start frontend server
Write-Host "📦 Starting Frontend Server (Vite)..." -ForegroundColor Cyan

$frontendScript = @"
Set-Location '$PWD\frontend'
Write-Host 'AURA Frontend Server Starting...' -ForegroundColor Green
Write-Host 'Directory: ' -NoNewline; Get-Location
Write-Host ''
npm run dev
"@

$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript -WindowStyle Normal -PassThru

Write-Host "✅ Frontend server starting (PID: $($frontendJob.Id))" -ForegroundColor Green
Write-Host ""

# Display information
Write-Host "🎉 AURA Application Suite Started Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Application URLs:" -ForegroundColor Yellow
Write-Host "   Backend API:  " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Frontend App: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Health Check: " -NoNewline; Write-Host "http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Server Processes:" -ForegroundColor Yellow
Write-Host "   Backend PID:  $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To Stop Servers:" -ForegroundColor Yellow
Write-Host "   - Close both PowerShell windows, or"
Write-Host "   - Press Ctrl+C in each window, or"
Write-Host "   - Run: taskkill /PID $($backendJob.Id) /PID $($frontendJob.Id) /F"
Write-Host ""

if (-not $NoWait) {
    Write-Host "💡 Waiting 10 seconds for servers to fully start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

if (-not $NoBrowser) {
    Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
    Write-Host "✅ Browser opened. If page doesn't load, wait a few more seconds." -ForegroundColor Green
}

Write-Host ""
Write-Host "ℹ️  This window can be closed after servers are running." -ForegroundColor Gray
Write-Host "   The backend and frontend will continue in their own windows." -ForegroundColor Gray
Write-Host ""
Write-Host "🎤 Try saying: 'Send 100 USD to EUR' using the microphone!" -ForegroundColor Magenta
Write-Host ""

if (-not $NoWait) {
    Read-Host "Press Enter to continue"
}
