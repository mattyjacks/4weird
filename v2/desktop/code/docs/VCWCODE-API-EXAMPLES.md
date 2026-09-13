# VCWCODE API Examples — observed truth only

Base: `http://127.0.0.1:42069` (override via `PORT` / `VIBECODEWORKER_PORT`).
Source: `lib/api/routes.js` + `server/start_api_server.js`.

> Scope rule for this file: every path below was read out of the running
> code. Nothing here is invented. Request bodies for POST game routes are
> **not** documented here — see `lib/api/routes.js` for exact schemas.

## 1. `GET /api/status` — EXISTS (the health signal)

This is the canonical "is it up?" probe. Also aliased at `GET /status`.
It lists the real endpoint surface (`status` + `games` links in the
payload).

```powershell
# PowerShell
Invoke-RestMethod http://127.0.0.1:42069/api/status | ConvertTo-Json -Depth 6
Invoke-RestMethod http://127.0.0.1:42069/status | ConvertTo-Json -Depth 6
```

```bat
rem curl (cmd)
curl http://127.0.0.1:42069/api/status
```

```bash
curl http://127.0.0.1:42069/api/status | head -c 2000
```

Expect HTTP `200` with a JSON status object.

## 2. `GET /api/health` — DOES NOT EXIST (404)

There is **no** `/api/health`. Requesting it returns `404` with an
`available-endpoints` list. That 404 body is the authoritative route
catalog — trust it over any external doc:

```powershell
# PowerShell — expect 404; read the available-endpoints list in the body
try { Invoke-RestMethod http://127.0.0.1:42069/api/health } catch { $_.Exception.Response.StatusCode; $_.ErrorDetails.Message | Select-Object -First 1 }
```

```bash
curl -i http://127.0.0.1:42069/api/health
# -> 404 ... Available endpoints: /api/status, /api/games, /api/game/launch, ...
```

Quoting the observed 404 list verbatim (from `lib/api/routes.js`):

```text
Available endpoints: /api/status, /api/games, /api/game/launch,
/api/game/screenshot, /api/game/logs, /api/game/state, /api/game/action,
/api/game/eval, /api/game/patch, /api/game/video/status,
/api/game/video/start, /api/game/video/stop, /api/game/video/layouts,
/api/vision/state, /api/bugs, /api/audio/status, /api/audio/voices,
/api/audio/tts, /api/audio/stt, /api/audio/sfx, /api/audio/music,
/api/audio/analyze, /api/audio/narrate-bug, /api/audio/commentary,
/api/audio/voice-command, /api/audio/npc-pack, /api/audio/cover-missing,
/api/audio/subtitle-check, /api/audio/sfx-hint, /api/engine,
/api/engine/switch, /api/engine/multi-qa, /api/cloud/models,
/api/cloud/estimate, /api/cloud/launch, /api/cloud/status,
/api/cloud/stop, /api/autocode/fix, /api/autocode/report,
/api/opencode/status, /api/opencode/export, /api/opencode/fix,
/api/opencode/heal, /api/opencode/heal/:id, /api/opencode/heal-test,
/api/opencode/revert, /api/opencode/handoff, /api/dashboard
```

So when in doubt: `GET /api/status` for health, and read the 404 body for
the route list. Never guess `/api/health`.

## 3. Game endpoints from that 404 list (methods observed in code)

Methods below are asserted from `lib/api/routes.js` guards
(`405 Method Not Allowed` otherwise). Bodies are **not** asserted here.

```powershell
# List known games (GET, observed in routes.js + lib/vibecodeworker_client.js)
Invoke-RestMethod http://127.0.0.1:42069/api/games | ConvertTo-Json -Depth 6
```

```bat
rem curl equivalents
curl http://127.0.0.1:42069/api/games
curl "http://127.0.0.1:42069/api/game/state?gameId=<id-from-games>"
curl "http://127.0.0.1:42069/api/game/logs?gameId=<id-from-games>"
curl "http://127.0.0.1:42069/api/game/screenshot?gameId=<id-from-games>"
```

```powershell
# Same probes in PowerShell
Invoke-RestMethod "http://127.0.0.1:42069/api/game/state?gameId=<id-from-games>"
Invoke-RestMethod "http://127.0.0.1:42069/api/game/logs?gameId=<id-from-games>"
```

POST-only game routes (GET returns `405`; observed `req.method !== 'POST'`
guards — send a body only per `lib/api/routes.js`, not from memory):

- `POST /api/game/launch`
- `POST /api/game/action` (also aliased at `/action`)
- `POST /api/game/eval` (also aliased at `/eval`)
- `POST /api/game/patch`
- `POST /api/game/video/start`
- `POST /api/game/video/stop`
- `POST /api/game/video/layouts`

Minimal method probe (proves the route exists without claiming a schema):

```bash
curl -i -X POST http://127.0.0.1:42069/api/game/launch
# Expect 400/422 about the body (route exists) — NOT 404.
# A 404 would mean a wrong path; re-read the available-endpoints list.
```

## 4. Two more confirmed GETs (client + server agree)

```powershell
Invoke-RestMethod http://127.0.0.1:42069/api/engine | ConvertTo-Json -Depth 4
Invoke-WebRequest http://127.0.0.1:42069/api/dashboard -UseBasicParsing | Select-Object StatusCode
```

(`GET /api/engine` is called by `lib/vibecodeworker_client.js`;
`/api/dashboard` is printed by `server/start_api_server.js` on boot.)
