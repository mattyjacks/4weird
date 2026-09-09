@echo off
where pythonw >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%~dp0..\..\..\..\..\companion\mediamogul_agent_center.py" (
        start "" pythonw "%~dp0..\..\..\..\..\companion\mediamogul_agent_center.py"
        exit
    )
    if exist "%~dp0companion\mediamogul_agent_center.py" (
        start "" pythonw "%~dp0companion\mediamogul_agent_center.py"
        exit
    )
)
if exist "%~dp0mediamogul_command_center.exe" (
    start "" "%~dp0mediamogul_command_center.exe"
    exit
)
if exist "%~dp0..\..\..\..\..\mediamogul_command_center.exe" (
    start "" "%~dp0..\..\..\..\..\mediamogul_command_center.exe"
    exit
)
start "" pythonw "%~dp0companion\mediamogul_agent_center.py"
exit
