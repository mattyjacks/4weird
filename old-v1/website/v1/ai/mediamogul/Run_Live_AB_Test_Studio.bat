@echo off
title MediaMogul - Multi-Video A/B Testing Studio
cd /d "%~dp0"
echo ======================================================================
echo  MEDIAMOGUL SHOTCUT: MULTI-VIDEO A/B TESTING STUDIO
echo  Producing multiple video variants with unique 8-digit alphanumeric IDs
echo ======================================================================
echo.
python run_ab_test_production.py %*
echo.
echo Press any key to exit...
pause >nul
