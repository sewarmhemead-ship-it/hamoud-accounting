@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ====================================
echo   حمود — تشغيل محلي (إنتاج)
echo   قاعدة البيانات: backend\data\hamoud.db
echo   برمجة وتطوير — SewarTech
echo ====================================
echo.

if not exist "backend\.env" (
  echo إنشاء backend\.env من المثال...
  copy /Y "backend\.env.example" "backend\.env" >nul
  echo عدّل JWT_SECRET في backend\.env قبل الاستخدام الجدي.
  echo.
)

echo [1/2] بناء الواجهة ونسخها إلى backend\public ...
cd backend
call npm run build:ui
if errorlevel 1 (
  echo فشل بناء الواجهة.
  pause
  exit /b 1
)

echo.
echo [2/2] تشغيل الخادم على http://localhost:3001 ...
set NODE_ENV=production
start "Hamoud Server" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak >nul
start http://localhost:3001
echo.
echo تم. التطبيق والـ API من نفس المنفذ 3001.
echo قاعدة البيانات محفوظة في: backend\data\hamoud.db
echo.
pause
