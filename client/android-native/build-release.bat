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

:: Disable file watcher + give R8 enough heap (Compose + Hilt needs ~3-4 GB)
set GRADLE_OPTS=-Dorg.gradle.vfs.watch=false -Dorg.gradle.jvmargs=-Xmx4g

:: Verify keystore exists before starting the long build
if not exist "%KEYSTORE_PATH%" (
  echo.
  echo ERROR: Keystore not found at: %KEYSTORE_PATH%
  echo Run generate-keystore.bat first to create it.
  pause
  exit /b 1
)

:: ── Step 1: Clean ────────────────────────────────────────────────────────────
:: Always clean before a release build to remove stale R8/KSP generated files.
echo [1/2] Cleaning previous build outputs...
call gradlew.bat clean --no-daemon
if errorlevel 1 (
  echo WARNING: Clean step failed, proceeding anyway...
)
echo.

:: ── Step 2: Build ────────────────────────────────────────────────────────────
:: IMPORTANT: Do NOT use --parallel here.
::   --parallel can break Hilt/KSP annotation processing because generated
::   classes may not exist yet when other tasks try to use them.
:: Use --no-daemon for a fresh, isolated build process (no stale daemon state).
echo [2/2] Building Release APK (R8 + Hilt typically takes ~7 minutes)...
echo       Keystore: %KEYSTORE_PATH%
echo.

call gradlew.bat assembleRelease --no-daemon ^
  -Pandroid.injected.signing.store.file="%KEYSTORE_PATH%" ^
  -Pandroid.injected.signing.store.password="%KEYSTORE_PASSWORD%" ^
  -Pandroid.injected.signing.key.alias="%KEY_ALIAS%" ^
  -Pandroid.injected.signing.key.password="%KEY_PASSWORD%"

if errorlevel 1 (
  echo.
  echo =========================================
  echo   ERROR: APK BUILD FAILED
  echo   Check the output above for details.
  echo =========================================
  pause
  exit /b 1
)

:: ── Step 3: Verify + Checksum ─────────────────────────────────────────────────
set APK_PATH=app\build\outputs\apk\release\app-release.apk
if not exist "%APK_PATH%" (
  echo.
  echo ERROR: APK not found at: %APK_PATH%
  echo Check Gradle output above for errors.
  pause
  exit /b 1
)

echo.
echo Generating SHA-256 checksum...
certutil -hashfile "%APK_PATH%" SHA256 > "%APK_PATH%.sha256"

echo.
echo =========================================
echo   BUILD SUCCESSFUL
echo.
echo   APK  : %APK_PATH%
for %%F in ("%APK_PATH%") do echo   Size : %%~zF bytes
echo   Hash : %APK_PATH%.sha256
echo =========================================
echo.

:: ── Step 4: Optional ADB Install ─────────────────────────────────────────────
set ADB=%ANDROID_HOME%\platform-tools\adb.exe
if exist "%ADB%" (
  "%ADB%" devices 2>nul | find "device" >nul
  if not errorlevel 1 (
    echo A device/emulator is connected.
    set /p INSTALL_CHOICE=Install release APK now? (Y/N): 
    if /i "%INSTALL_CHOICE%"=="Y" (
      echo Removing previous installation...
      "%ADB%" uninstall com.jalanjyothi.crm >nul 2>&1
      echo Installing...
      "%ADB%" install "%APK_PATH%"
      if errorlevel 1 (
        echo WARNING: Install failed. The device may still have a debug APK
        echo          with a different signature. Uninstall it manually first.
      ) else (
        echo APK installed successfully on device.
      )
    )
  )
)

echo.
pause
