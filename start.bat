@echo off
echo =========================================
echo    Jalan Jyothi CRM - Starting...
echo =========================================
echo.

:: Add Node.js to PATH if needed
set PATH=C:\Program Files\nodejs;%PATH%

:: Generate SSL certificates if needed
cd /d "%~dp0server"
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
