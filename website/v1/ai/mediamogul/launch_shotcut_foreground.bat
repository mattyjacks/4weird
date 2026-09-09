@echo off
taskkill /F /IM shotcut.exe 2>nul
timeout /t 1 /nobreak >nul
start "" "c:\GitHub5\CryptArtistStudio\v2\MediaMogul\shotcut\shotcut.exe" "C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001\MattyJacks_Master_Production.mlt"
exit
