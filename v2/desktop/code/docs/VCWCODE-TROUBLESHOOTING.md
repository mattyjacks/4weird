# VCWCODE Troubleshooting — GPU / ports / Ollama / Electron

All paths below are relative to `v2/desktop/code`.

## 1. GPU / rendering problems → `--software` fallback

**Symptom:** black or flickering headful game windows, canvas-capture
failures, GPU process crashes on old drivers / VMs / RDP.

**What happens by default:** `launch_vibecodeworker.bat` prefers native GPU
and forwards `--enable-gpu` to the Electron app for headful playtests.

**Fix — force software rendering:**

```bat
launch_vibecodeworker.bat --software
```

Combine with `--no-ollama` to isolate rendering from model issues:

```bat
launch_vibecodeworker.bat --software --no-ollama
```

No code change needed — the flag is launcher-only (`VIBE_SOFTWARE` in the
`.bat`). Remove it again once drivers are fixed to get GPU speed back.

## 2. Port conflicts — `42069` (API) and `8888` (static)

**Defaults** (`server/start_api_server.js`, `app/main.js`):

- API: `42069` (override: `PORT` or `VIBECODEWORKER_PORT` env)
- Static game host: `8888` (override: `STATIC_PORT` env)

**Symptom:** `EADDRINUSE`, second instance exits, or `:8888` serves stale
content from another project.

**Diagnose (PowerShell):**

```powershell
netstat -ano | Select-String "42069|8888"
Get-Process -Id <PID-from-netstat>
```

**Fix:**

- Stop the other holder (another `electron .`, another
  `node server/start_api_server.js`, or anything parked on `:8888`).
- Or move this instance:

  ```bat
  set PORT=42169&& set STATIC_PORT=8898&& npm run start:cloud
  ```

- The Electron app is single-instance (`app/main.js` lock) — a second
  double-click focuses the first window instead of starting a new server.
  That is normal, not a hang.

## 3. Ollama preflight — slow start / "local models unavailable"

**What the launcher does** (`scripts\node\ensure_ollama.js`):

1. Default: `node scripts\node\ensure_ollama.js --timeout-ms 10000`
   (checks `ollama serve`, never installs, never blocks launch).
2. With `--install-ollama`: full auto-install (~700MB+) with a 15s probe.

**Symptom:** long pause at `[launcher]` preflight lines, or
`NOTE: local models unavailable`.

**Fix:**

- Fastest (cloud keys only, no local models):

  ```bat
  launch_vibecodeworker.bat --no-ollama
  ```

- One-click local setup (explicit consent, large download):

  ```bat
  launch_vibecodeworker.bat --install-ollama
  ```

- Point at a LAN Ollama box instead of localhost via `.env`
  (`OLLAMA_URL`, plus per-role tags `VIBE_ROLE_AGENT/VISION/CODER/REASONER`)
  — see `VCWCODE-ENV-GUIDE.md`.
- The `NOTE: local models unavailable` message is **non-fatal**:
  cloud providers still work.

## 4. Electron missing → `npm ci`

**Symptom:**

```text
[launcher] Electron runtime missing - repairing dependencies...
```

or `electron: command not found` / missing
`node_modules\electron\dist\electron.exe`.

**Fix (what the launcher already tries):**

```bat
cd v2\desktop\code
npm ci --no-audit --no-fund
```

Notes:

- Requires Node 18+ on `PATH` (`winget install OpenJS.NodeJS.LTS`).
- Without `package-lock.json` it falls back to `npm install`; do not
  delete the lockfile.
- If Electron is *still* missing after install: delete `node_modules`
  and re-run, or run `npm install electron` directly (message printed by
  the `.bat` itself).
- CI / shortcuts: add `--no-pause` so the launcher never waits for a
  keypress on error:

  ```bat
  launch_vibecodeworker.bat --no-pause
  ```

## 5. Still stuck?

1. Read the OS log dir: `%APPDATA%\vibecodeworker\logs`
   (every `console.*` line lands there).
2. Re-run the API headless (`npm run start:cloud`) to separate API bugs
   from Electron-window bugs.
3. Probe `GET /api/status` — if it answers, the runtime is fine and the
   problem is the window/renderer, not the server.
