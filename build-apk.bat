@echo off
setlocal EnableDelayedExpansion
REM ============================================================
REM  Vihar Setu - build a shareable APK (works on any phone)
REM  Usage: double-click build-apk.bat or run: build-apk.bat [debug]
REM ============================================================

:: Auto-detect Java JDK
set "FOUND_JAVA="
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\javac.exe" set "FOUND_JAVA=%JAVA_HOME%"
if not defined FOUND_JAVA (
    for /f "delims=" %%I in ('where javac.exe 2^>nul') do (
        if not defined FOUND_JAVA for %%P in ("%%~dpI..") do set "FOUND_JAVA=%%~fP"
    )
)
if not defined FOUND_JAVA (
    if exist "C:\Program Files\Android\Android Studio\jbr\bin\javac.exe" set "FOUND_JAVA=C:\Program Files\Android\Android Studio\jbr"
)
if not defined FOUND_JAVA (
    for /d %%D in (
        "C:\Program Files\Eclipse Adoptium\jdk-17*"
        "C:\Program Files\Eclipse Adoptium\jdk*"
        "C:\Program Files\Microsoft\jdk-17*"
        "C:\Program Files\Microsoft\jdk*"
        "C:\Program Files\Java\jdk-17*"
        "C:\Program Files\Java\jdk*"
        "C:\Program Files\Zulu\*"
    ) do (
        if not defined FOUND_JAVA if exist "%%~D\bin\javac.exe" set "FOUND_JAVA=%%~D"
    )
)
if defined FOUND_JAVA set "JAVA_HOME=%FOUND_JAVA%"

:: Auto-detect Android SDK
set "FOUND_SDK="
if exist "android\local.properties" (
    for /f "tokens=1* delims==" %%A in ('findstr /i "^sdk.dir" android\local.properties 2^>nul') do (
        set "RAW_SDK=%%B"
        set "RAW_SDK=!RAW_SDK:\:=:!"
        set "RAW_SDK=!RAW_SDK:\\=\!"
        set "RAW_SDK=!RAW_SDK:/=\!"
        if exist "!RAW_SDK!\platform-tools\adb.exe" set "FOUND_SDK=!RAW_SDK!"
    )
)
if not defined FOUND_SDK if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "FOUND_SDK=%ANDROID_HOME%"
if not defined FOUND_SDK if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" set "FOUND_SDK=%ANDROID_SDK_ROOT%"
if not defined FOUND_SDK (
    for /f "delims=" %%I in ('where adb.exe 2^>nul') do (
        if not defined FOUND_SDK for %%P in ("%%~dpI..") do if exist "%%~fP\platform-tools\adb.exe" set "FOUND_SDK=%%~fP"
    )
)
if not defined FOUND_SDK (
    for %%P in (
        "%LOCALAPPDATA%\Android\Sdk"
        "E:\Dev-Tools\AndroidSDK"
        "D:\Dev-Tools\AndroidSDK"
        "C:\Android\Sdk"
        "D:\Android\Sdk"
        "E:\Android\Sdk"
    ) do (
        if not defined FOUND_SDK if exist "%%~P\platform-tools\adb.exe" set "FOUND_SDK=%%~P"
    )
)
if defined FOUND_SDK (
    set "ANDROID_HOME=%FOUND_SDK%"
    if not exist "android\local.properties" (
        set "SDK_FORMATTED=!ANDROID_HOME:\=/!"
        echo sdk.dir=!SDK_FORMATTED!> "android\local.properties"
    )
)

if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;!PATH!"
if defined ANDROID_HOME set "PATH=%ANDROID_HOME%\platform-tools;!PATH!"

cd /d "%~dp0"

echo.
if not exist node_modules (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 goto :fail
) else (
    echo [1/3] Dependencies already installed.
)

call node scripts\patch-native-modules.js >nul 2>&1

cd android

set "MODE=%1"
if /I "%MODE%"=="debug" (
    echo.
    echo [2/3] Building DEBUG APK...
    call gradlew.bat assembleDebug
    set "APK=app\build\outputs\apk\debug\app-debug.apk"
    set "OUT=..\ViharSetu-debug.apk"
) else (
    echo.
    echo [2/3] Building RELEASE APK ^(JS bundled inside, runs standalone on any phone^)...
    call gradlew.bat assembleRelease
    set "APK=app\build\outputs\apk\release\app-release.apk"
    set "OUT=..\ViharSetu.apk"
)
if errorlevel 1 goto :fail

echo.
echo [3/3] Copying APK...
copy /Y "%APK%" "%OUT%" >nul
if errorlevel 1 goto :fail

cd ..
echo.
echo ============================================================
echo  DONE!  APK created at: %CD%\%OUT:..\=%
echo  Send this file to any Android phone to install and test.
echo ============================================================
pause
exit /b 0

:fail
echo.
echo [ERROR] Build failed. Inspect the logs above.
pause
exit /b 1
