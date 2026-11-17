@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if not defined ANDROID_HOME (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    ) else if exist "C:\Users\nevil\AppData\Local\Android\Sdk" (
        set "ANDROID_HOME=C:\Users\nevil\AppData\Local\Android\Sdk"
    ) else (
        set "ANDROID_HOME=C:\Users\yugam\AppData\Local\Android\Sdk"
    )
)
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
cd /d "%~dp0"
npx @react-native-community/cli run-android
