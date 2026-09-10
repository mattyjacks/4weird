@echo off
setlocal
echo Uninstalling MediaMogul from Shotcut...
set "DEST=%LOCALAPPDATA%\Meltytech\Shotcut\extensions\filters\mediamogul"
if exist "%DEST%" (
    rmdir /S /Q "%DEST%"
    echo Successfully removed MediaMogul.
) else (
    echo MediaMogul was not found at %DEST%.
)
echo.
pause
