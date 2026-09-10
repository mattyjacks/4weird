@echo off
setlocal
echo ====================================================
echo        MediaMogul - 1-Click Installer
echo ====================================================
echo.
set "DEST=%LOCALAPPDATA%\Meltytech\Shotcut\extensions\filters\mediamogul"
echo Installing MediaMogul to:
echo %DEST%
echo.

if not exist "%DEST%" mkdir "%DEST%"

xcopy /E /Y /I "%~dp0filters\mediamogul" "%DEST%"
if exist "%~dp0mediamogul_command_center.exe" (
    copy /Y "%~dp0mediamogul_command_center.exe" "%DEST%\" >nul
)
if exist "%~dp0companion" (
    xcopy /E /Y /I "%~dp0companion" "%DEST%\companion\" >nul
)

echo.
echo ====================================================
echo ✨ MediaMogul installed successfully!
echo ====================================================
echo.
echo 1. Launch run_mediamogul_command_center.bat to start the AI Command Center and Top-of-Screen Dock.
echo 2. Open Shotcut: You will see [🎬 Open MediaMogul] right next to 'Help'!
echo.
pause
