@echo off
title MediaMogul - Agentic AI Command Center
where pythonw >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%~dp0companion\mediamogul_agent_center.py" (
        start "" pythonw "%~dp0companion\mediamogul_agent_center.py" %*
        exit
    )
)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%~dp0companion\mediamogul_agent_center.py" (
        start "" python "%~dp0companion\mediamogul_agent_center.py" %*
        exit
    )
)
if exist "%~dp0mediamogul_command_center.exe" (
    start "" "%~dp0mediamogul_command_center.exe" %*
    exit
)
if exist "%~dp0dist\mediamogul_command_center.exe" (
    start "" "%~dp0dist\mediamogul_command_center.exe" %*
    exit
)
echo MediaMogul could not be launched. Python or mediamogul_command_center.exe is required.
pause
exit
