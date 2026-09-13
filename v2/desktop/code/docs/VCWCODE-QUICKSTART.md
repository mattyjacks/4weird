# VCWCODE Quickstart — running in 60 seconds

Goal: Electron dashboard open, or at minimum the `:42069` API answering.

## 0:00 — Prerequisites (10s)

```bat
node --version
```

Need `v18+` (`package.json` `engines`). If missing:

```bat
winget install OpenJS.NodeJS.LTS
```

## 0:10 — Install (15s, first run only)

```bat
cd v2\desktop\code
npm ci --no-audit --no-fund
```

`launch_vibecodeworker.bat` does this repair automatically when
`node_modules\electron\dist\electron.exe` is missing, but running it once
yourself is faster and shows errors clearly.

## 0:25 — Launch (10s)

Pick one:

```bat
rem Option A: full desktop app (recommended)
launch_vibecodeworker.bat --no-ollama

rem Option B: headless API only (no window, for scripts/agents)
npm run start:cloud
```

`--no-ollama` skips the local-model preflight so the window opens fastest.
Drop the flag later if you want local models.

## 0:35 — Verify API (15s)

```powershell
Invoke-RestMethod http://127.0.0.1:42069/api/status | ConvertTo-Json -Depth 6
```

Expect a JSON status payload. That one route is the health signal —
there is no `/api/health` (it returns 404; see
`VCWCODE-API-EXAMPLES.md`).

## 0:50 — Verify static host (10s)

```powershell
Invoke-WebRequest http://localhost:8888 -UseBasicParsing | Select-Object StatusCode
```

Expect `200`. If `:8888` is busy, the static server fails while `:42069`
may still work — see `VCWCODE-TROUBLESHOOTING.md` (port conflicts).

## Done

- Dashboard window open (Option A), plus
- `http://127.0.0.1:42069/api/status` answering, plus
- `http://localhost:8888` answering.

If any step fails, go to `VCWCODE-TROUBLESHOOTING.md` first, then
`VCWCODE-ENV-GUIDE.md` (you need a minimum of 1 API key for cloud
features, but the app launches without one).
