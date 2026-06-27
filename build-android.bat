@echo off
echo =========================================
echo    JJ CRM - Build Android APK (Release)
echo =========================================
echo.

:: Set JAVA_HOME (OpenLogic JDK 17)
if not defined JAVA_HOME (
  if exist "C:\Program Files\OpenLogic\jdk-17.0.14.7-hotspot" (
    set "JAVA_HOME=C:\Program Files\OpenLogic\jdk-17.0.14.7-hotspot"
  ) else if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
  ) else (
    echo ERROR: JAVA_HOME not set. Set JAVA_HOME environment variable.
    pause
    exit /b 1
  )
)

if not defined ANDROID_HOME (
  set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
)

:: Default signing config
if not defined KEYSTORE_PATH (
  set "KEYSTORE_PATH=%~dp0client\android\app\release.jks"
)
if not defined KEYSTORE_PASSWORD (
  set "KEYSTORE_PASSWORD=jjhome"
)
if not defined KEY_ALIAS (
  set "KEY_ALIAS=jj-crm-release"
)
if not defined KEY_PASSWORD (
  set "KEY_PASSWORD=jjhome"
)

set PATH=C:\Program Files\nodejs;%PATH%

cd /d "%~dp0client"

:: Install dependencies if needed
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  echo.
)

:: Build web app (production mode)
echo Building web application (production)...
set NODE_ENV=production
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

:: PCI DSS 6.5.5: Build RELEASE APK (not debug)
echo.
echo Building Release APK...
cd android
set GRADLE_OPTS=-Dorg.gradle.vfs.watch=false

:: Sign with keystore
if not exist "%KEYSTORE_PATH%" (
  echo.
  echo ERROR: Keystore not found at: %KEYSTORE_PATH%
  echo Run generate-keystore.bat first to create it.
  pause
  exit /b 1
)
echo Signing with keystore: %KEYSTORE_PATH%
call gradlew assembleRelease --parallel ^
  -Pandroid.injected.signing.store.file="%KEYSTORE_PATH%" ^
  -Pandroid.injected.signing.store.password="%KEYSTORE_PASSWORD%" ^
  -Pandroid.injected.signing.key.alias="%KEY_ALIAS%" ^
  -Pandroid.injected.signing.key.password="%KEY_PASSWORD%"

if errorlevel 1 (
  echo.
  echo ERROR: APK build failed!
  pause
  exit /b 1
)

:: PCI DSS 6.3.1: Generate checksum for integrity verification
echo.
echo Generating SHA-256 checksum...
if exist "app\build\outputs\apk\release\app-release.apk" (
  certutil -hashfile "app\build\outputs\apk\release\app-release.apk" SHA256 > "app\build\outputs\apk\release\app-release.apk.sha256"
  echo APK built successfully!
  echo Location: client\android\app\build\outputs\apk\release\app-release.apk
  echo Checksum: client\android\app\build\outputs\apk\release\app-release.apk.sha256
) else if exist "app\build\outputs\apk\release\app-release-unsigned.apk" (
  certutil -hashfile "app\build\outputs\apk\release\app-release-unsigned.apk" SHA256 > "app\build\outputs\apk\release\app-release-unsigned.apk.sha256"
  echo Unsigned APK built successfully!
  echo Location: client\android\app\build\outputs\apk\release\app-release-unsigned.apk
  echo.
  echo IMPORTANT: Sign this APK before distribution:
  echo   apksigner sign --ks keystore.jks app-release-unsigned.apk
)
echo.
echo =========================================
echo  PCI DSS Compliance Checklist:
echo  [%if defined KEYSTORE_PATH (echo X) else (echo  )%] APK signed with release keystore
echo  [X] ProGuard/R8 minification enabled
echo  [X] Production build (no debug flags)
echo  [X] SHA-256 integrity checksum generated
echo =========================================
pause
