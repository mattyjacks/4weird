@echo off
setlocal
title 4WEIRD VibeCodeWorker Launcher
cd /d "%~dp0"
echo Starting VibeCodeWorker desktop app...
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0app\main.js" %*
set "VIBE_EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %VIBE_EXIT_CODE%
