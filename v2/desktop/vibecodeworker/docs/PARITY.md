# Desktop ↔ Web Parity (v2)

Goal: desktop (`v2/desktop/`) can do anything web (`v2/vcw4w/`) can.

## Model: native-first + webview fallback

- **Native first** for QA core (already in `hub.html` + `modules/`): viewport,
  agent loop, vision scan, replay, subagents, patches, local GPU, bot/fal keys.
- **New parity layer** in `v2/desktop/vibecodeworker/parity/` (no bundler, plain
  scripts to keep Tauri `frontendDist` raw):
  - `config.js` — apiBase/siteUrl (default `https://4weird.com`, loopback http
    allowed for dev only), sessionStorage-persisted.
  - `auth_store.js` — bot (`bot4weird_` + 20 or 32) + gateway (`vcw_live_` + 32)
    slots, fingerprint-only status, header order gateway → bot (matches server
    `resolveVcwCaller`). RunPod key stays session-only.
  - `api_client.js` — single fetch wrapper (10s abort, JSON-safe errors,
    `Retry-After` surfaced, secrets never logged).
  - `shell.js` — hash router mirroring web routes + `openWebFallback()` iframe
    (sandboxed) or external-tab escape hatch. This guarantees day-one parity:
    any route not yet native is one click away.
  - `games_browser.js` — catalog fetch (`GET /api/games/catalog`, 24h TTL,
    cache → bundled fallback), client filter, `resolveRuntimeUrl()` (remote
    when online, local bundle offline), PLAY (clean viewport) vs TEST (QA path).
- **Node layer** in `v2/desktop/ai/vibecodeworker/lib/parity/backend_client.js`:
  health-gated `web-vcw → local-ollama → heuristic` chains per task
  (testing web-first, healing/vision local-first), redacted errors.
- **Web addition** (games lane): `GET /api/games/catalog` — public, cacheable,
  no session/Supabase. Desktop never scrapes HTML.

## Route coverage

| Web route | Desktop path |
|---|---|
| `/games`, `/games/[slug]`, `/games/[slug]/play` | parity games browser → viewport (`loadGameTarget` unchanged); saves/metering stay web-side (desktop play is free/local, noted in UI) |
| `/leaderboards`, `/lobbies` | games browser leaderboard tab (`GET /api/leaderboard`); lobby join via shell fallback |
| `/favorites` | device-local stars/favs (mirror `fw-favorites-v1` semantics) |
| `/vibecodeworker`, `/vibecodeworker/[section]` | native hub/run/full/phone/docs/demo (existing) + shell links |
| `/desktop`, `/runpods`, `/agents` | `run.html` control plane + shell fallback to web |
| `/account`, `/my/usage`, `/my/rights`, `/pricing` | shell fallback (read balances/receipts via `api_client`; checkout stays on web — no card handling in desktop) |
| `/clans`, `/squads`, `/support`, `/fundraisers`, `/vault`, `/business/*`, `/timer`, `/swarm`, `/buddy`, `/fal`, `/meshy`, `/blender`, `/newgameplus`, `/xonotic`, `/spaceships`, `/docs/*`, `/academy`, `/accessibility` | shell webview fallback first; native modules per roadmap M3+ |
| `/auth/*`, family/kid flows | system-browser login → paste bot/gateway key once (passwords never persisted) |

## Auth / keys

1. Log in at `4weird.com/auth/login` (system browser) → issue bot key at
   `/bot/setup` + gateway key (`vcw:read`/`vcw:write`).
2. Paste once into desktop drawer (sessionStorage in browser, OS app-data file
   in Tauri). VERIFY = `GET /api/bot/me` (bot) + `GET /api/vcw/gateway/status`.
3. Steady state: `api_client` attaches `x-vcw-key` → `x-bot-key`; handles 401
   (re-verify), 402 (top up coins), 403 (scope hint).
4. No `service_role`, no `RUNPOD_API_KEY`, no peppers ship in desktop.

## Offline

Catalog/leaderboards/docs serve last-good cache; writes queue with retry;
iframe fallback shows cached notice when offline. QA loop is fully local.

## Verification

- `node --check` on new parity JS + backend client.
- `node scripts/verify-devswarm.mjs`, `verify-game-bundles.mjs`, `verify-desktop.mjs`.
- Manual: catalog endpoint returns `{success,count,games}`; desktop lists 34
  online / ≥10 bundled offline; every shell route resolves or opens fallback.
