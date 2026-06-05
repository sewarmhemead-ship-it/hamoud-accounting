#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageDir
)

$ErrorActionPreference = 'Stop'
$batPath = Join-Path $PackageDir 'start-prod.bat'
$extractPs1 = Join-Path $PSScriptRoot 'extract-node-runtime.ps1'
$extractDest = Join-Path $PackageDir 'extract-node-runtime.ps1'
if (Test-Path $extractPs1) {
    Copy-Item -LiteralPath $extractPs1 -Destination $extractDest -Force
}

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
if not exist "%NODE_EXE%" (
  echo جاري تجهيز Node.js المضمّن...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0extract-node-runtime.ps1" -AppRoot "%~dp0."
  set "NODE_EXE=%~dp0node-runtime\node.exe"
)
if not exist "%NODE_EXE%" (
  echo فشل تجهيز Node. أعد فك الحزمة أو تواصل مع SewarTech.
  pause
  exit /b 1
)

echo تجهيز المكتبات لأول تشغيل...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0first-run-setup.ps1" -AppRoot "%~dp0."
if errorlevel 1 (
  echo فشل الإعداد الأولي. تواصل مع SewarTech.
  pause
  exit /b 1
)

echo تشغيل الخادم http://localhost:3001 ...
echo Node: %NODE_EXE%
cd backend
set NODE_ENV=production
start "Hamoud Server" cmd /k "cd /d "%~dp0backend" && "%NODE_EXE%" server.js"

echo انتظار جاهزية الخادم...
set /a WAIT=0
:wait_health
timeout /t 2 /nobreak >nul
set /a WAIT+=2
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/health' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"
if %ERRORLEVEL% equ 0 goto open_browser
if %WAIT% geq 30 goto open_browser
goto wait_health
:open_browser
start http://localhost:3001
echo.
echo Ready. UI + API on port 3001.
echo Login: admin / admin123
pause
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($batPath, $content.TrimEnd() + "`r`n", $utf8NoBom)
Write-Host "    Patched: $batPath" -ForegroundColor DarkGray
