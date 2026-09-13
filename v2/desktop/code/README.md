# VibeCodeWorker Desktop — `v2/desktop/code`

Electron dashboard + local REST API + static game host. This folder is the
runnable desktop app.

## What this app is

- **Electron dashboard** — entry point `app/main.js`, launched via
  `npm start` (`electron .`) or double-click `launch_vibecodeworker.bat`.
  Single-instance lock lives in `app/main.js`.
- **Local REST API on `:42069`** — headless server started by
  `server/start_api_server.js` (`npm run start:cloud`).
  Default bind `http://127.0.0.1:42069`. Health probe:
  `http://127.0.0.1:42069/api/status`. Dashboard:
  `http://127.0.0.1:42069/api/dashboard`.
- **Static game host on `:8888`** — `server/start_api_server.js` also starts
  a static server for the `frontend/` website build (`STATIC_PORT`, default
  `8888`): `http://localhost:8888`. The Electron app serves the same content
  on port `8888` (`app/main.js` `STATIC_PORT`).

Source of truth for ports: `server/start_api_server.js`
(`PORT` default `42069`, `STATIC_PORT` default `8888`) and `app/main.js`
(port default `42069`, `STATIC_PORT = 8888`).

## Prerequisites

- **Node.js 18+** (`package.json` `engines: node >= 18.0.0`).
  Check: `node --version`.
- **Dependencies installed.** The launcher repairs them automatically
  (`npm ci` from `package-lock.json`), but for a manual setup run:

  ```bat
  cd v2\desktop\code
  npm ci --no-audit --no-fund
  ```

- **Windows launcher path** needs `node_modules\electron\dist\electron.exe`
  present; if it is missing the `.bat` runs the `npm ci` repair above.
- **Ollama is optional.** Local models work without any API key, but the app
  runs fine on cloud keys alone. Never auto-installs without consent.

## Run

From `v2/desktop/code`:

```bat
rem Full desktop app (recommended on Windows)
launch_vibecodeworker.bat

rem Headless API + static server only (no Electron window)
npm run start:cloud

rem Electron directly (after npm ci)
npm start
```

### `launch_vibecodeworker.bat` flags (launcher-only, stripped before app args)

| Flag | Effect |
| --- | --- |
| `--no-ollama` (alias `--skip-ollama`) | Skip the Ollama preflight entirely |
| `--install-ollama` | Full Ollama auto-install (~700MB+, explicit consent) via `scripts\node\ensure_ollama.js --install` |
| `--software` | Disable native GPU rendering (safe software fallback). Without it the launcher adds `--enable-gpu` for headful playtests |
| `--no-pause` | Never pause on error (CI / shortcuts). Default behaviour pauses so double-click users can read the error |

Examples:

```bat
launch_vibecodeworker.bat --no-ollama
launch_vibecodeworker.bat --software --no-ollama
launch_vibecodeworker.bat --install-ollama
launch_vibecodeworker.bat --no-pause
```

Extra unknown args are forwarded to the Electron app (`VIBE_APP_ARGS`).

## Verify

1. **API is up** — fetch `/api/status` (also aliased at `/status`).
   It lists the real endpoint surface:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:42069/api/status | ConvertTo-Json -Depth 6
   curl http://127.0.0.1:42069/api/status
   ```

   See `docs/VCWCODE-API-EXAMPLES.md` for observed truth
   (`/api/status` exists; `/api/health` does **not** — it 404s with the
   available-endpoints list).

2. **Static probe** — the game/website build should answer on `:8888`:

   ```powershell
   Invoke-WebRequest http://localhost:8888 -UseBasicParsing | Select-Object StatusCode
   curl http://localhost:8888
   ```

3. **Cloud status page** (same API server):
   `http://127.0.0.1:42069/api/dashboard` and
   `http://127.0.0.1:42069/api/opencode/status`.

## Where logs live

- **Dev/repo-local Electron data:** `.vibecodeworker-user-data/` inside
  `v2/desktop/code` (`app/main.js` `localElectronData`). Test runs use
  `.test-appdata/`. Both are git-ignored build artefacts — do not commit.
- **OS app data:** `%APPDATA%\vibecodeworker\logs` on Windows — every
  `console.*` line lands there via SmartLog (`lib/smart_log.js`,
  see `app/main.js` header comment).
- **Credentials (not logs, but nearby):**
  `%APPDATA%\vibecodeworker\credentials.json` — local copy of API keys.
  Never commit `.env` or `credentials.json` (see
  `docs/VCWCODE-ENV-GUIDE.md`).

## Next docs

- `docs/VCWCODE-QUICKSTART.md` — 60-second run guide.
- `docs/VCWCODE-TROUBLESHOOTING.md` — GPU fallback, port conflicts,
  Ollama preflight, missing Electron.
- `docs/VCWCODE-API-EXAMPLES.md` — observed `/api/status` + game endpoint
  examples only (no invented routes).
- `docs/VCWCODE-ENV-GUIDE.md` — `.env.example` → `.env`, minimum 1 key.
