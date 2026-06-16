@echo off
echo =========================================
echo    Jalan Jyothi CRM - Starting...
echo =========================================
echo.

:: Add Node.js to PATH if needed
set PATH=C:\Program Files\nodejs;%PATH%

:: Start the server (serves both API and built client)
cd /d "%~dp0server"
npx tsx src/index.ts
