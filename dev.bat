@echo off
echo =========================================
echo    Jalan Jyothi CRM - Development Mode
echo =========================================
echo.
echo Starting server and client with hot-reload...
echo.

:: Add Node.js to PATH if needed
set PATH=C:\Program Files\nodejs;%PATH%

cd /d "%~dp0"
npx concurrently "cd server && npx tsx watch src/index.ts" "cd client && npx vite"
