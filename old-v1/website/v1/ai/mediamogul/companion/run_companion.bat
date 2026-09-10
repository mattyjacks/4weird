@echo off
title MediaMogul Companion - Shotcut AI Studio
python "%~dp0mediamogul_companion.py" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred. Press any key to exit.
    pause >nul
)
