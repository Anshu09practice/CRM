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

:: Generate SSL certificates if needed
echo Checking SSL certificates...
cd server
node generate-cert.js
if errorlevel 1 (
  echo.
  echo ERROR: Failed to generate SSL certificates
  pause
  exit /b 1
)
cd ..
echo.

npx concurrently "cd server && npx tsx watch src/index.ts" "cd client && npx vite"
