<#
.SYNOPSIS
    Installs the MediaMogul AI Plugin for Shotcut.
.DESCRIPTION
    Copies the MediaMogul QML filter files into Shotcut's user extension directory:
    %LOCALAPPDATA%\Meltytech\Shotcut\extensions\filters\mediamogul
#>

param (
    [switch]$SystemWide
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "        MediaMogul - Shotcut AI Studio Installer    " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $scriptDir "filters\mediamogul"

if (-not (Test-Path $sourceDir)) {
    Write-Error "Source filter directory not found at '$sourceDir'!"
    exit 1
}

# Determine target directory
if ($SystemWide) {
    $shotcutProg = "C:\Program Files\Shotcut\share\shotcut\qml\filters"
    if (-not (Test-Path $shotcutProg)) {
        Write-Error "System-wide Shotcut filter directory '$shotcutProg' was not found!"
        exit 1
    }
    $targetDir = Join-Path $shotcutProg "mediamogul"
    Write-Host "[*] Installing system-wide to: $targetDir" -ForegroundColor Yellow
} else {
    $appData = Join-Path $env:LOCALAPPDATA "Meltytech\Shotcut\extensions\filters"
    $targetDir = Join-Path $appData "mediamogul"
    Write-Host "[*] Installing to User AppData (Recommended): $targetDir" -ForegroundColor Green
}

$legacyDir = Join-Path $env:LOCALAPPDATA "Meltytech\Shotcut\extensions\filters\vibeo_video"
if ($legacyDir -and (Test-Path $legacyDir)) {
    Remove-Item -Path $legacyDir -Recurse -Force
    Write-Host "[-] Removed legacy filter at $legacyDir" -ForegroundColor DarkGray
}

# Create target directory
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "[+] Created plugin directory: $targetDir" -ForegroundColor Gray
}

# Copy files
$filesToCopy = @(
    "meta.qml",
    "ui.qml",
    "vui.qml",
    "OpenAiClient.js",
    "mediamogulStorage.js",
    "mediamogulPresets.js",
    "icon.webp",
    "icon.png",
    "logo.svg",
    "run_command_center.bat"
)

foreach ($f in $filesToCopy) {
    $srcPath = Join-Path $sourceDir $f
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $targetDir -Force
        Write-Host "  -> Installed $f" -ForegroundColor DarkGray
    } else {
        Write-Warning "File '$f' not found in source!"
    }
}

# Copy companion directory
$companionSrc = Join-Path $scriptDir "companion"
$companionDest = Join-Path $targetDir "companion"
if (Test-Path $companionSrc) {
    Copy-Item -Path $companionSrc -Destination $companionDest -Recurse -Force
    Write-Host "  -> Installed companion tools to $companionDest" -ForegroundColor DarkGray
}

# Copy standalone command center executable
$exeSrc = Join-Path $scriptDir "mediamogul_command_center.exe"
if (Test-Path $exeSrc) {
    Copy-Item -Path $exeSrc -Destination $targetDir -Force
    Write-Host "  -> Installed mediamogul_command_center.exe" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "✨ MediaMogul installed successfully!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Top-of-Screen 'Open MediaMogul' Option:" -ForegroundColor Cyan
Write-Host "  Start the Agentic AI Command Center and Top-Bar Dock:"
Write-Host "    $scriptDir\run_mediamogul_command_center.bat"
Write-Host "  (When Shotcut is open, an 'Open MediaMogul' button is pinned right next to 'Help'!)"
Write-Host ""
Write-Host "How to use MediaMogul inside Shotcut:" -ForegroundColor Yellow
Write-Host "1. (Re)Start Shotcut."
Write-Host "2. Add any video clip or color clip to the Timeline."
Write-Host "3. In Filters (+), search for 'MediaMogul'."
Write-Host "4. Click 'Settings', paste your OpenAI API Key, and click 'Save Key'."
Write-Host "5. Click '🚀 AI Center' in the filter or click 'Open MediaMogul' next to 'Help' at the top of the screen!"
Write-Host ""
