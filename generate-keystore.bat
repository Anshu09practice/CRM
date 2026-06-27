@echo off
echo =========================================
echo    JJ CRM - Generate Release Keystore
echo =========================================
echo.
echo PCI DSS 6.5.5: This creates a secure signing key for APK integrity.
echo.
echo IMPORTANT: Store the keystore file and passwords securely!
echo           Losing the keystore means you cannot update the app.
echo.

set KEYSTORE_DIR=%~dp0client\android\app
set KEYSTORE_FILE=%KEYSTORE_DIR%\release.jks

if exist "%KEYSTORE_FILE%" (
  echo Keystore already exists at: %KEYSTORE_FILE%
  echo Delete it first if you want to regenerate.
  pause
  exit /b 0
)

echo Generating keystore at: %KEYSTORE_FILE%
echo.

:: Use keytool from JAVA_HOME or Android Studio's JBR
if defined JAVA_HOME (
  set "KEYTOOL=%JAVA_HOME%\bin\keytool.exe"
) else (
  set "KEYTOOL=C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
)

"%KEYTOOL%" -genkey -v ^
  -keystore "%KEYSTORE_FILE%" ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity 10000 ^
  -alias jj-crm-release ^
  -storepass jjhome ^
  -keypass jjhome ^
  -dname "CN=Jalan Jyothi CRM, OU=Engineering, O=Jalan Jyothi, L=Bangalore, ST=Karnataka, C=IN"

if errorlevel 1 (
  echo.
  echo ERROR: Keystore generation failed!
  pause
  exit /b 1
)

echo.
echo =========================================
echo  Keystore generated successfully!
echo.
echo  File: %KEYSTORE_FILE%
echo  Alias: jj-crm-release
echo  Password: jjhome
echo.
echo  To use with build-android.bat:
echo    set KEYSTORE_PATH=%KEYSTORE_FILE%
echo    set KEYSTORE_PASSWORD=your-password
echo    set KEY_ALIAS=jj-crm-release
echo    set KEY_PASSWORD=your-key-password
echo.
echo  WARNING: Do NOT commit the keystore to git!
echo           Add to .gitignore: *.jks
echo =========================================
pause
