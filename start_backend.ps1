#!/usr/bin/env pwsh
# AURA Backend Startup Script
Set-Location "D:\mosAIc\AURA\backend"
Write-Host "Current directory: $(Get-Location)"
Write-Host "Starting AURA Backend Server..."
& "C:/Users/GEETHU JOSEPH/AppData/Local/Programs/Python/Python313/python.exe" app.py
