@echo off
setlocal

REM Start Metro in a separate window for Fast Refresh.
start "Vihar Setu Metro" cmd /k "cd /d %~dp0 && npm start"

REM Install and launch the debug app on a connected Android device/emulator.
call "%~dp0run-android.bat"

endlocal
