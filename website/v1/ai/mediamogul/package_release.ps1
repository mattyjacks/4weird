$ErrorActionPreference = "Stop"

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseDir = Join-Path $baseDir "release\MediaMogul-v1.0.0-windows-x64"

if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Copy-Item (Join-Path $baseDir "mediamogul_command_center.exe") $releaseDir -Force
Copy-Item (Join-Path $baseDir "install.bat") $releaseDir -Force
Copy-Item (Join-Path $baseDir "install.ps1") $releaseDir -Force
Copy-Item (Join-Path $baseDir "uninstall.bat") $releaseDir -Force
Copy-Item (Join-Path $baseDir "uninstall.ps1") $releaseDir -Force
Copy-Item (Join-Path $baseDir "run_mediamogul_command_center.bat") $releaseDir -Force
Copy-Item (Join-Path $baseDir "README.txt") $releaseDir -Force

$filterDest = Join-Path $releaseDir "filters\mediamogul"
New-Item -ItemType Directory -Path $filterDest -Force | Out-Null
Copy-Item (Join-Path $baseDir "filters\mediamogul\*") $filterDest -Recurse -Force

$zipPath = Join-Path $baseDir "release\MediaMogul-v1.0.0-windows-x64.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "Release ZIP created successfully: $zipPath"
Get-Item $zipPath | Select-Object Name, Length, LastWriteTime
