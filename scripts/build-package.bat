@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-package.ps1" %*
if errorlevel 1 (
  echo.
  echo فشل بناء الحزمة.
  pause
  exit /b 1
)
pause
