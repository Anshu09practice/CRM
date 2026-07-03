@echo off
echo =========================================
echo    JJ CRM - Build Native Android APK
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
  set "KEYSTORE_PATH=C:\Users\AN20545092\glodenversion\Workspace\MyCRM\MyCRM\client\android\app\release.jks"
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

cd /d "%~dp0"

echo Building Release APK...
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
call gradlew.bat assembleRelease --parallel -Pandroid.injected.signing.store.file="%KEYSTORE_PATH%" -Pandroid.injected.signing.store.password="%KEYSTORE_PASSWORD%" -Pandroid.injected.signing.key.alias="%KEY_ALIAS%" -Pandroid.injected.signing.key.password="%KEY_PASSWORD%"

if errorlevel 1 (
  echo.
  echo ERROR: APK build failed!
  pause
  exit /b 1
)

:: Generate checksum for integrity verification
echo.
echo Generating SHA-256 checksum...
set APK_PATH=app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
  certutil -hashfile "%APK_PATH%" SHA256 > "%APK_PATH%.sha256"
  echo.
  echo =========================================
  echo   BUILD SUCCESSFUL
  echo   APK: %APK_PATH%
  echo   Checksum: %APK_PATH%.sha256
  echo =========================================
) else (
  echo WARNING: APK not found at expected location.
  echo Check build output above for errors.
)

echo.
pause
