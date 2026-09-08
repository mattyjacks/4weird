@echo off
setlocal
title 4WEIRD VibeCodeWorker Launcher
rem UTF-8 output so model names / progress lines render correctly.
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "VIBE_ROOT=%~dp0"
set "ELECTRON_BIN=%VIBE_ROOT%node_modules\electron\dist\electron.exe"
set "APP_MAIN=%VIBE_ROOT%app\main.js"
set "PREFLIGHT_JS=%VIBE_ROOT%scripts\node\ensure_ollama.js"

rem ---- Launcher-only flags (stripped before forwarding to the app) ----
rem   --no-ollama / --skip-ollama : skip the Ollama preflight entirely
rem   --install-ollama            : full auto-install (~700MB+, explicit consent)
rem   --no-pause                  : never pause on error (CI / shortcuts)
set "VIBE_SKIP_OLLAMA=0"
set "VIBE_INSTALL_OLLAMA=0"
set "VIBE_NO_PAUSE=0"
set "VIBE_APP_ARGS="
:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--no-ollama" set "VIBE_SKIP_OLLAMA=1" & shift & goto parse_args
if /i "%~1"=="--skip-ollama" set "VIBE_SKIP_OLLAMA=1" & shift & goto parse_args
if /i "%~1"=="--install-ollama" set "VIBE_INSTALL_OLLAMA=1" & shift & goto parse_args
if /i "%~1"=="--no-pause" set "VIBE_NO_PAUSE=1" & shift & goto parse_args
set "VIBE_APP_ARGS=%VIBE_APP_ARGS% %1"
shift
goto parse_args
:args_done

call :have_node
set "HAVE_NODE=%ERRORLEVEL%"
if "%HAVE_NODE%"=="0" (
  for /f "tokens=*" %%V in ('node --version 2^>nul') do echo [launcher] node %%V detected.
) else (
  echo [launcher] WARNING: node.js not found on PATH. Skipping npm + Ollama preflight.
  echo [launcher]           Install it via "winget install OpenJS.NodeJS.LTS" for full launcher features.
)

rem ---- 1. Electron binary present? Repair with npm when missing ----
if not exist "%ELECTRON_BIN%" (
  echo [launcher] Electron runtime missing - repairing dependencies...
  if not "%HAVE_NODE%"=="0" (
    echo [launcher] ERROR: cannot repair without node.js. Install it, then re-run.
    echo [launcher]          winget install OpenJS.NodeJS.LTS
    set "VIBE_CODE=1" & goto fail
  )
  if exist "%VIBE_ROOT%package-lock.json" (
    echo [launcher] Running "npm ci" ^(clean install from lockfile^)...
    call npm ci --no-audit --no-fund
  ) else (
    echo [launcher] No lockfile - running "npm install"...
    call npm install --no-audit --no-fund
  )
  if errorlevel 1 (
    echo [launcher] ERROR: dependency install failed. Check your network and re-run.
    set "VIBE_CODE=1" & goto fail
  )
  if not exist "%ELECTRON_BIN%" (
    echo [launcher] ERROR: Electron still missing after install. Try deleting
    echo [launcher]        node_modules and re-running, or run "npm install electron".
    set "VIBE_CODE=1" & goto fail
  )
  echo [launcher] Dependencies repaired.
)

rem ---- 2. Ollama preflight: server up when installed (never blocks launch) ----
if "%VIBE_SKIP_OLLAMA%"=="1" (
  echo [launcher] Ollama preflight skipped ^(--no-ollama^).
) else if not "%HAVE_NODE%"=="0" (
  echo [launcher] WARNING: node.js missing - skipping Ollama preflight.
) else if not exist "%PREFLIGHT_JS%" (
  echo [launcher] WARNING: Ollama preflight script missing - skipping.
) else (
  if "%VIBE_INSTALL_OLLAMA%"=="1" (
    echo [launcher] Full Ollama auto-install requested - downloading ^(~700MB+^)...
    call node "%PREFLIGHT_JS%" --install --timeout-ms 15000
  ) else (
    call node "%PREFLIGHT_JS%" --timeout-ms 10000
  )
  if errorlevel 1 (
    echo [launcher] NOTE: local models unavailable - cloud providers still work,
    echo [launcher]       or re-run with --install-ollama for a one-click local setup.
  )
)

rem ---- 3. Launch (single-instance lock lives in app/main.js) ----
echo [launcher] Starting VibeCodeWorker desktop app...
"%ELECTRON_BIN%" "%APP_MAIN%"%VIBE_APP_ARGS%
set "VIBE_EXIT_CODE=%ERRORLEVEL%"
if not "%VIBE_EXIT_CODE%"=="0" (
  echo [launcher] App exited with code %VIBE_EXIT_CODE%.
  set "VIBE_CODE=%VIBE_EXIT_CODE%" & goto fail
)
endlocal & exit /b 0

:have_node
where node >nul 2>&1
exit /b %ERRORLEVEL%

rem Pause-on-error so double-click users can read the message.
rem VIBE_NO_PAUSE=1 (or --no-pause) disables it for CI / shortcuts.
rem Reached only via "goto fail" with VIBE_CODE set (goto terminates the
rem script; call would merely return and keep executing).
:fail
if "%VIBE_NO_PAUSE%"=="1" endlocal & exit /b %VIBE_CODE%
echo.
echo [launcher] Press any key to close...
pause >nul
endlocal & exit /b %VIBE_CODE%

