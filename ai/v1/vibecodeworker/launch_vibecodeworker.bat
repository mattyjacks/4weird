@echo off
title 4WEIRD VibeCodeWorker Launcher
cd /d "%~dp0"
echo Starting VibeCodeWorker desktop app...
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0main.js" %*
