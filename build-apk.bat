@echo off
REM ============================================================
REM  Vihar Setu - build a shareable APK (works on any phone)
REM  Put this file in the project root (next to package.json)
REM  and double-click it, or run: build-apk.bat
REM  Optional:  build-apk.bat debug   (debug APK instead of release)
REM ============================================================

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if not defined ANDROID_HOME (
    if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd /d "%~dp0"

echo.
echo [1/3] Installing dependencies (skipped if already installed)...
if not exist node_modules call npm install
if errorlevel 1 goto :fail

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
    echo [2/3] Building RELEASE APK ^(JS bundled inside, runs without your PC^)...
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
echo  DONE!  APK is here:  %CD%\%OUT:..\=%
echo  Send this file to any Android phone (WhatsApp / Drive / USB)
echo  and tap it to install (allow "Install unknown apps").
echo ============================================================
pause
exit /b 0

:fail
echo.
echo BUILD FAILED - scroll up to see the first red error.
pause
exit /b 1
