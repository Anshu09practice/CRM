@echo off
echo =========================================
echo   Opening Firewall Port 3001 for JJ CRM
echo =========================================
echo.
echo This requires Administrator privileges.
echo.

:: Check if running as admin
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: Please right-click this file and select
    echo        "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: Remove old rule if exists
netsh advfirewall firewall delete rule name="JJ CRM Server 3001" >nul 2>&1

:: Add new inbound rule
netsh advfirewall firewall add rule ^
    name="JJ CRM Server 3001" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=3001 ^
    profile=any ^
    description="Allow JJ CRM server access from Android devices on local network"

if errorlevel 1 (
    echo ERROR: Failed to add firewall rule.
    pause
    exit /b 1
)

echo.
echo =========================================
echo   SUCCESS: Port 3001 is now open
echo   Android devices on your WiFi can now
echo   connect to the JJ CRM server.
echo =========================================
echo.
pause
