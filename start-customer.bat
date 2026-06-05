@echo off

chcp 65001 >nul

setlocal

cd /d "%~dp0"



echo ====================================

echo   حمود — محاسبة تخليص (SewarTech)

echo   قاعدة جديدة: مراكز ومعابر فقط

echo ====================================

echo.



if not exist "backend\.env" (

  if exist "backend\.env.example" (

    copy /Y "backend\.env.example" "backend\.env" >nul

    echo تم إنشاء backend\.env — غيّر JWT_SECRET قبل الاستخدام الجدي.

    echo.

  )

)



echo تشغيل الخادم على http://localhost:3001 ...

echo عند أول تشغيل تُنسخ قاعدة الزبون من seed-data\customer-ready.db

echo.



cd backend

start "Hamoud Accounting" cmd /k ""C:\Program Files\nodejs\node.exe" server.js"



timeout /t 4 /nobreak >nul

start http://localhost:3001



echo.

echo الدخول الافتراضي: admin / admin123

echo راجع دليل-الزبون.md

echo.

pause


