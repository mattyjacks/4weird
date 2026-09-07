@echo off
title 4WEIRD AIPLAY Launcher
cd /d "%~dp0"
echo Starting AIPlay desktop app...
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0main.js" %*
