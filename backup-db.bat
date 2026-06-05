@echo off
chcp 65001 >nul
setlocal
set ROOT=%~dp0
set DB=%ROOT%backend\data\hamoud.db
if not exist "%DB%" (
  echo لا توجد قاعدة: backend\data\hamoud.db
  pause
  exit /b 1
)
if not exist "%ROOT%backups" mkdir "%ROOT%backups"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set STAMP=%%i
set OUT=%ROOT%backups\hamoud_%STAMP%.db
copy /Y "%DB%" "%OUT%" >nul
if exist "%ROOT%backend\data\hamoud.db-wal" copy /Y "%ROOT%backend\data\hamoud.db-wal" "%OUT%-wal" >nul
if exist "%ROOT%backend\data\hamoud.db-shm" copy /Y "%ROOT%backend\data\hamoud.db-shm" "%OUT%-shm" >nul
echo نسخة احتياطية: %OUT%
pause
