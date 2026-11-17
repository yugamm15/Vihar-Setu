@echo off
setlocal EnableDelayedExpansion
title Vihar Setu - Direct Launcher

echo ============================================================
echo   VIHAR SETU - UNIVERSAL ONE-CLICK LAUNCHER
echo ============================================================
echo.

cd /d "%~dp0"

:: -------------------------------------------------------------
:: 1. AUTO-DETECT JAVA JDK (Java 17+)
:: -------------------------------------------------------------
set "FOUND_JAVA="

:: Priority 1: Check active javac compiler in system PATH
for /f "delims=" %%I in ('where javac.exe 2^>nul') do (
    if not defined FOUND_JAVA for %%P in ("%%~dpI..") do if exist "%%~fP\bin\javac.exe" set "FOUND_JAVA=%%~fP"
)

:: Priority 2: Check JAVA_HOME environment variable (verify bin\javac exists)
if not defined FOUND_JAVA (
    if defined JAVA_HOME if exist "%JAVA_HOME%\bin\javac.exe" set "FOUND_JAVA=%JAVA_HOME%"
)

:: Priority 3: Check Android Studio bundled JBR (standard for Android developers)
if not defined FOUND_JAVA (
    if exist "C:\Program Files\Android\Android Studio\jbr\bin\javac.exe" (
        set "FOUND_JAVA=C:\Program Files\Android\Android Studio\jbr"
    ) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\javac.exe" (
        set "FOUND_JAVA=%LOCALAPPDATA%\Programs\Android Studio\jbr"
    )
)

:: Priority 4: Search standard JDK installation directories
if not defined FOUND_JAVA (
    for /d %%D in (
        "C:\Program Files\Eclipse Adoptium\jdk-17*"
        "C:\Program Files\Eclipse Adoptium\jdk-21*"
        "C:\Program Files\Eclipse Adoptium\jdk*"
        "C:\Program Files\Microsoft\jdk-17*"
        "C:\Program Files\Microsoft\jdk-21*"
        "C:\Program Files\Microsoft\jdk*"
        "C:\Program Files\Java\jdk-17*"
        "C:\Program Files\Java\jdk-21*"
        "C:\Program Files\Java\jdk*"
        "C:\Program Files\Zulu\*"
        "C:\Program Files\BellSoft\*"
    ) do (
        if not defined FOUND_JAVA if exist "%%~D\bin\javac.exe" set "FOUND_JAVA=%%~D"
    )
)

if defined FOUND_JAVA (
    set "JAVA_HOME=%FOUND_JAVA%"
    echo [OK] Java JDK located: !JAVA_HOME!
) else (
    echo [!] Warning: No Java JDK automatically detected.
    echo     Please ensure JDK 17 is installed or JAVA_HOME is set if build fails.
)

:: -------------------------------------------------------------
:: 2. AUTO-DETECT ANDROID SDK
:: -------------------------------------------------------------
set "FOUND_SDK="

:: Priority 1: Check existing android\local.properties sdk.dir
if exist "android\local.properties" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-Content android\local.properties -ErrorAction SilentlyContinue | Where-Object { $_ -match '^sdk\.dir\s*=' }) -replace '^sdk\.dir\s*=\s*', '' -replace '\\:', ':' -replace '\\\\', '\' -replace '/', '\'"`) do (
        if exist "%%I\platform-tools\adb.exe" set "FOUND_SDK=%%I"
    )
)

:: Priority 2: Check ANDROID_HOME or ANDROID_SDK_ROOT
if not defined FOUND_SDK if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "FOUND_SDK=%ANDROID_HOME%"
if not defined FOUND_SDK if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" set "FOUND_SDK=%ANDROID_SDK_ROOT%"

:: Priority 3: Check adb in system PATH
if not defined FOUND_SDK (
    for /f "delims=" %%I in ('where adb.exe 2^>nul') do (
        if not defined FOUND_SDK for %%P in ("%%~dpI..") do if exist "%%~fP\platform-tools\adb.exe" set "FOUND_SDK=%%~fP"
    )
)

:: Priority 4: Search standard Windows Android SDK directories
if not defined FOUND_SDK (
    for %%P in (
        "%LOCALAPPDATA%\Android\Sdk"
        "E:\Dev-Tools\AndroidSDK"
        "D:\Dev-Tools\AndroidSDK"
        "C:\Android\Sdk"
        "D:\Android\Sdk"
        "E:\Android\Sdk"
        "C:\AndroidSDK"
        "D:\AndroidSDK"
        "E:\AndroidSDK"
    ) do (
        if not defined FOUND_SDK if exist "%%~P\platform-tools\adb.exe" set "FOUND_SDK=%%~P"
    )
)

if defined FOUND_SDK (
    set "ANDROID_HOME=%FOUND_SDK%"
    echo [OK] Android SDK located: !ANDROID_HOME!
    
    :: Ensure android/local.properties is always valid so Gradle never fails
    if not exist "android\local.properties" (
        set "SDK_FORMATTED=!ANDROID_HOME:\=/!"
        echo sdk.dir=!SDK_FORMATTED!> "android\local.properties"
        echo [OK] Auto-generated android/local.properties
    )
) else (
    echo [!] Warning: Could not locate Android SDK.
    echo     Please ensure Android Studio / SDK is installed.
)

:: Configure PATH for this session
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;!PATH!"
if defined ANDROID_HOME set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;!PATH!"
echo.

:: -------------------------------------------------------------
:: 3. AUTO-SETUP .ENV CONFIGURATION
:: -------------------------------------------------------------
if not exist ".env" (
    echo [*] First-time setup: Creating default .env configuration...
    (
        echo # JINAARYA VIHAR SETU - LOCAL CONFIG
        echo SUPABASE_URL=https://uxymzrpnwdtppxutjwum.supabase.co
        echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eW16cnBud2R0cHB4dXRqd3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjE1NTgsImV4cCI6MjEwMzgzNzU1OH0.WTht3iZiWf0K3OwM14im1BkshHApYKhGL2ASNQaRcv8
        echo GOOGLE_MAPS_API_KEY=AIzaSyYourGoogleMapsApiKeyHere
        echo APP_ENV=development
    ) > ".env"
    echo [OK] .env generated.
) else (
    echo [OK] Environment file .env is ready.
)

:: -------------------------------------------------------------
:: 4. DEPENDENCIES (Skip npm install if node_modules already exists)
:: -------------------------------------------------------------
if not exist "node_modules\" (
    echo.
    echo [*] First-time setup: node_modules missing. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Please check your internet connection or node version.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
) else (
    echo [OK] Dependencies already installed - skipping npm install.
)

:: Ensure Windows pipe deadlock patch is applied to React Native CLI
call node scripts\patch-native-modules.js >nul 2>&1

:: -------------------------------------------------------------
:: 5. ANDROID DEVICE / EMULATOR CHECK
:: -------------------------------------------------------------
echo.
set "DEVICE_COUNT=0"
set "DEVICE_NAME="

for /f "skip=1 tokens=1,2" %%A in ('adb devices 2^>nul') do (
    if "%%B"=="device" (
        set /a DEVICE_COUNT+=1
        if not defined DEVICE_NAME set "DEVICE_NAME=%%A"
    )
)

if !DEVICE_COUNT! gtr 0 (
    echo [OK] Connected Android device found: !DEVICE_NAME! - !DEVICE_COUNT! device online.
) else (
    echo [!] No active device or emulator detected.
    echo [*] Searching for configured Android Emulators...
    
    set "FIRST_AVD="
    for /f "delims=" %%V in ('emulator -list-avds 2^>nul') do (
        if not defined FIRST_AVD set "FIRST_AVD=%%V"
    )
    
    if defined FIRST_AVD (
        echo [*] Auto-launching Android Emulator: !FIRST_AVD!...
        start "Android Emulator (!FIRST_AVD!)" emulator -avd !FIRST_AVD!
        echo [*] Waiting for emulator to connect...
        adb wait-for-device
        echo [OK] Emulator connected and ready.
    ) else (
        echo.
        echo [!] Notice: Please plug in your phone via USB with USB Debugging enabled,
        echo     or start an emulator from Android Studio.
        echo.
    )
)

:: -------------------------------------------------------------
:: 6. METRO BUNDLER (Skip opening new window if already running)
:: -------------------------------------------------------------
echo.
set "EXTRA_FLAGS=--active-arch-only"
netstat -ano -p tcp | findstr /R /C:":8081 .*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [*] Starting Metro Bundler in a separate window...
    start "Vihar Setu - Metro Bundler" cmd /k "cd /d %~dp0 && npm start"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Metro Bundler is already running on port 8081 - reusing existing instance.
    set "EXTRA_FLAGS=--no-packager --active-arch-only"
)

:: -------------------------------------------------------------
:: 7. BUILD AND LAUNCH APPLICATION
:: -------------------------------------------------------------
echo.
echo [*] Building and launching application on Android...
call npx @react-native-community/cli run-android !EXTRA_FLAGS!

if errorlevel 1 (
    echo.
    echo ============================================================
    echo [ERROR] Launch failed. Check the error output above.
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo ============================================================
echo [SUCCESS] Vihar Setu is running on your device!
echo ============================================================
pause
