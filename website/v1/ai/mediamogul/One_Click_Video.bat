@echo off
title MediaMogul - 1-Click Video Production
cd /d "%~dp0"
echo ======================================================================
echo  MEDIAMOGUL SHOTCUT: 1-CLICK AUTONOMOUS VIDEO PRODUCTION
echo ======================================================================
echo.
python one_click_video.py %*
echo.
echo Press any key to exit...
pause >nul
