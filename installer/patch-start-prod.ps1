#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageDir
)

$ErrorActionPreference = 'Stop'
$batPath = Join-Path $PackageDir 'start-prod.bat'

$content = @'
@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ====================================
echo   Hamoud - production (customer)
echo   DB: backend\data\hamoud.db
echo   برمجة وتطوير — SewarTech
echo ====================================
echo.

if not exist "backend\.env" (
  echo Creating backend\.env from example...
  copy /Y "backend\.env.example" "backend\.env" >nul
  echo Set JWT_SECRET in backend\.env before serious use.
  echo.
)

set "NODE_EXE=%~dp0node-runtime\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" (
  echo Node.js not found. Reinstall Hamoud Accounting from SewarTech setup.
  pause
  exit /b 1
)

echo Starting server http://localhost:3001 ...
echo Using Node: %NODE_EXE%
cd backend
set NODE_ENV=production
start "Hamoud Server" cmd /k ""%NODE_EXE%" server.js"

timeout /t 3 /nobreak >nul
start http://localhost:3001
echo.
echo Ready. UI + API on port 3001.
echo Login: admin / admin123
pause
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($batPath, $content.TrimEnd() + "`r`n", $utf8NoBom)
Write-Host "    Patched: $batPath" -ForegroundColor DarkGray
