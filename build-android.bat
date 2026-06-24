@echo off
echo =========================================
echo    JJ CRM - Build Android APK
echo =========================================
echo.

:: Set Java and Android SDK paths
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
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
echo  APK location: client\android\app\build\outputs\apk\debug\app-debug.apk
echo =========================================

:: Also build the APK directly
echo.
echo Building APK...
cd android
set GRADLE_OPTS=-Dorg.gradle.vfs.watch=false
call gradlew assembleDebug --parallel
if errorlevel 1 (
  echo.
  echo ERROR: APK build failed!
  pause
  exit /b 1
)
echo.
echo APK built successfully!
echo Location: client\android\app\build\outputs\apk\debug\app-debug.apk
pause
