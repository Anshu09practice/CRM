@echo off
echo =========================================
echo    Jalan Jyothi CRM - Starting...
echo =========================================
echo.

:: Add Node.js to PATH if needed
set PATH=C:\Program Files\nodejs;%PATH%

:: Install dependencies if node_modules is missing
cd /d "%~dp0server"
if not exist "node_modules" (
  echo Installing server dependencies...
  call npm install
  echo.
)

:: Generate SSL certificates if needed
echo Checking SSL certificates...
node generate-cert.js
if errorlevel 1 (
  echo.
  echo ERROR: Failed to generate SSL certificates
  pause
  exit /b 1
)
echo.

:: Start the server (serves both API and built client)
npx tsx src/index.ts
