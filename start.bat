@echo off
chcp 65001 >nul
echo ====================================
echo   حمود — تطوير (محلي)
echo   DB: backend\data\hamoud.db
echo ====================================
echo.

echo [1/2] تشغيل الـ Backend (المنفذ 3001)...
start "Hamoud Backend" cmd /k "cd /d "%~dp0backend" && "C:\Program Files\nodejs\node.exe" server.js"

timeout /t 3 /nobreak >nul

echo [2/2] تشغيل الواجهة (المنفذ 5173)...
start "Hamoud Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo تم التشغيل. افتح المتصفح على:
echo    http://localhost:5173
echo.
start http://localhost:5173
