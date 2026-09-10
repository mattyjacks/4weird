<#
.SYNOPSIS
    Uninstalls the MediaMogul AI Plugin from Shotcut.
#>

param (
    [switch]$SystemWide
)

$ErrorActionPreference = "Stop"

Write-Host "Uninstalling MediaMogul from Shotcut..." -ForegroundColor Yellow

if ($SystemWide) {
    $targetDir = "C:\Program Files\Shotcut\share\shotcut\qml\filters\mediamogul"
} else {
    $targetDir = Join-Path $env:LOCALAPPDATA "Meltytech\Shotcut\extensions\filters\mediamogul"
}

if (Test-Path $legacyDir) {
    Remove-Item -Path $legacyDir -Recurse -Force
    Write-Host "Successfully removed legacy $legacyDir" -ForegroundColor Green
}

if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force
    Write-Host "Successfully removed $targetDir" -ForegroundColor Green
} else {
    Write-Host "MediaMogul was not found at $targetDir" -ForegroundColor DarkGray
}

Write-Host "Uninstallation complete. Restart Shotcut to apply changes." -ForegroundColor Cyan
