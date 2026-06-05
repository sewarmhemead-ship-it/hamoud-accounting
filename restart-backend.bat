@echo off
chcp 65001 >nul
echo إيقاف المنفذ 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul
echo تشغيل Backend (Node من Program Files)...
cd /d "%~dp0backend"
"C:\Program Files\nodejs\node.exe" server.js
