@echo off
echo =========================================
echo    JJ CRM - Build Android APK
echo =========================================
echo.

:: Add Node.js to PATH if needed
set PATH=C:\Program Files\nodejs;%PATH%

cd /d "%~dp0client"

:: Install dependencies if needed
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  echo.
)

:: Build web app
echo Building web application...
call npx vite build
if errorlevel 1 (
  echo.
  echo ERROR: Build failed!
  pause
  exit /b 1
)
echo.

:: Sync with Android
echo Syncing with Android project...
call npx cap sync android
if errorlevel 1 (
  echo.
  echo ERROR: Capacitor sync failed!
  pause
  exit /b 1
)
echo.

echo =========================================
echo  Build complete!
echo.
echo  To generate the APK:
echo  1. Open Android Studio: npx cap open android
echo  2. Build ^> Generate Signed Bundle/APK
echo  3. Select APK and follow the wizard
echo.
echo  Or build from command line:
echo  cd client\android
echo  gradlew assembleDebug
echo  APK will be in: android\app\build\outputs\apk\debug\
echo =========================================
pause
