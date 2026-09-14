# FUTURE-PROOF AUDIT — v2/desktop/code + web touchpoints

Owner: DS-DTOP-10 (dtop-10) · 2026-09-14 · report + safe fixes only.
Rule for this file: observations only. No existing code file was edited to
produce it; no secrets are recorded here. Fix queue items are NEW-file /
follow-up-envelope work, never retro-edits by this envelope.

Scope audited:
- `v2/desktop/code`: Electron shell (`app/`), Tauri shell (`src-tauri/`),
  opencode bridge (`lib/opencode_bridge.js`, `src/modules/opencode-cli-bridge.js`),
  MCP server (`server/vcw_mcp_server.js`), heal loop + worker
  (`lib/opencode_bridge.js` heal section, `workers/heal_worker.js`),
  terminal panel (`src/components/terminal-opencode.js`), API server
  (`lib/api_server.js`, `lib/api/routes.js`, `server/start_api_server.js`),
  tests (`tests/`, 30 files), config (`lib/config.js`, `config/default.json`,
  `.env.example`), storage (`lib/storage.js`).
- Web touchpoints in `v2/vcw4w`: `app/terminal/`, `app/api/desktop/*`
  (`mine`, `provision`, `[id]/pod`, `[id]/heartbeat`, `[id]/policy`),
  coin/MCP pay (no desktop path exists; economy-owned).

Gate note: `v2/vcw4w/scripts/verify-desktop-opencode.mjs` (DS-DTOP-09 scope)
was ABSENT at audit time (`Test-Path` → False), so the gate is MISSING-only
red, noted per envelope, to be re-run before close.

---

## 1. Decision list (every bad architecture decision found)

Severity scale: **BREAKING** = will break a supported path or the security
model if left as-is / when the adjacent feature lands. **NON-BREAKING** =
works today, but raises drift, ops, or future-change cost.

### D1 — Two parallel opencode bridges with overlapping duties — NON-BREAKING (high drift risk)
- Evidence: `v2/desktop/code/lib/opencode_bridge.js:1-27` (679-line full
  bridge: export + CLI fix + server fix + heal loop) vs
  `v2/desktop/code/src/modules/opencode-cli-bridge.js:1-60` (457-line second
  bridge: `runSession`/`cancel`/`detectOpencode`, own token-budget estimate
  `CHARS_PER_TOKEN`, own `SECRET_PATTERNS` redaction).
- Why bad: spawn/redact/budget semantics exist twice and can drift (e.g. one
  side changes redaction, the other doesn't). The terminal panel imports only
  the second (`v2/desktop/code/src/components/terminal-opencode.js:18,26`),
  while the API server heal path uses only the first — so a "fix the bridge"
  change lands in one place and silently misses the other.
- Fix: see Q3.

### D2 — `AutoCodeConfig` silently drops the `opencode` block (two config readers) — BREAKING (config path)
- Evidence: `v2/desktop/code/lib/config.js:8-16` (`KNOWN_CONFIG_KEYS` has no
  `opencode`, `serverPort`, `webEngine`, …); `lib/config.js:93-102`
  (`update()` filters silently) and `lib/config.js:177-186` (`fromJSON()`
  filters silently). Meanwhile `v2/desktop/code/config/default.json:50-58`
  ships a real `opencode` block, and `v2/desktop/code/lib/opencode_bridge.js:53-64`
  reads that file as raw JSON, bypassing the class entirely.
- Why bad: enabling opencode through the config class is silently ignored;
  only the raw-JSON reader honors it. Two sources of truth for one setting.
- Fix: see Q2.

### D3 — Shipped defaults bake in one game's content — NON-BREAKING
- Evidence: `v2/desktop/code/config/default.json:4-7` (`gameRules` Overtake
  text, `gameUrl` `http://127.0.0.1:8888/games/html/overtake/…`).
- Why bad: every new game/project inherits Overtake-specific defaults; future
  multi-game or clean-room installs must override rather than start neutral.
- Fix: see Q5.

### D4 — Tauri CSP blocks the desktop's own localhost API — BREAKING (Tauri path)
- Evidence: `v2/desktop/code/src-tauri/tauri.conf.json:25` —
  `connect-src 'self' https://4weird.com` with no `http://127.0.0.1:*` /
  `http://localhost:*` entry, while the desktop control plane lives on
  `127.0.0.1:42069` (`v2/desktop/code/server/start_api_server.js:27-28`),
  static hosting on `:8888` (`:29`), and Ollama on `:11434`
  (`v2/desktop/code/config/default.json:29`). Same file `:6-11` shares
  `../frontend` with Electron.
- Why bad: in the Tauri webview, `fetch()` to the local API/static/Ollama
  ports is a cross-origin connect violating this CSP, so the Tauri shell
  cannot drive the features the Electron shell can. `withGlobalTauri:true`
  (`:13`) additionally exposes the full Tauri API to every loaded page.
- Fix: see Q1.

### D5 — Loopback-without-Origin bypasses `VIBE_API_TOKEN` even when set — BREAKING (security model)
- Evidence: `v2/desktop/code/lib/api_server.js:184-192` — when a token is
  configured, non-GET `/api/*` requires `X-Vibe-Auth`/Bearer **except**
  `isBypassClient = isLocalClient && !origin` (any local process with no
  `Origin` header). `server/start_api_server.js:51-55` documents token auth;
  `:60-64` refuses non-loopback binds without a token (good).
- Why bad: on a machine where the desktop also renders untrusted content
  (launched games, web debugger targets), any local process can POST
  code-execution endpoints (`/api/game/eval`, `/api/game/patch` —
  `v2/desktop/code/lib/api/routes.js:151-158`, 404-list at `:499`) with no
  token. The bypass is intentional for the desktop app, but it is
  identity-blind: the app and any other local process are indistinguishable.
- Fix: see Q1/Q4 (pairing-scoped terminal tokens replace the blanket bypass
  for remote-driven commands; local app keeps a first-party channel).

### D6 — Heal-loop test step is arbitrary shell + regex failure mining — NON-BREAKING (intended power, fragile signal)
- Evidence: `v2/desktop/code/lib/opencode_bridge.js:456-466`
  (`runShellCommand` via `cmd.exe /c` / `sh -c` on caller-supplied
  `testCommand`); `:468-480` (`extractFailuresFromOutput` regexes
  `fail|error|✗|not ok|assertionerror`); `workers/heal_worker.js:46-57`
  (same shell pattern in the "fresh" instance); `lib/opencode_bridge.js:482`
  (runs tracked in an in-memory `Map`, lost on restart);
  `:508-560` (fire-and-forget `setImmediate` loop, default
  `maxIterations = 3` at `:496` — the cap itself is correct).
- Why bad: the loop's power (run anything, fix, retest) rests on a fragile
  signal (substring regex over raw output) and volatile state (memory-only
  run registry; `persistHealRun` swallows errors at `:642`). A test whose
  failure text doesn't match the regex reads as "healed".
- Fix: see Q4.

### D7 — `OPENCODE_BINARY` env + `shell:true` spawn on Windows — NON-BREAKING (local-user scope)
- Evidence: `v2/desktop/code/lib/opencode_bridge.js:67-69`
  (`OPENCODE_BINARY` overrides the binary); `:276` (`spawn(config.binary, …,
  { …, shell: process.platform === 'win32', … })`).
- Why bad: a poisoned env var turns the next heal/fix run into arbitrary
  execution as the desktop user. The desktop user can already run code, so
  this is not a privilege boundary today — but it becomes one the moment a
  *remote* party can influence env or config (see pairing spec: remote input
  must never reach spawn paths).
- Fix: see Q4 (absolute-path pin + `shell:false` allow-list for any
  remote-driven invocation).

### D8 — MCP server is read-mostly: no terminal/heal/fix tools, no pay — NON-BREAKING (gap)
- Evidence: `v2/desktop/code/server/vcw_mcp_server.js:7-22` (14 tools:
  status/games/state/logs/launch/action/layouts/godot×5/bug/handoff — no
  command exec, no heal start/status, no opencode fix); `:5-6,26`
  (single `VCW_API_URL` + env token, stdio transport, no per-caller auth —
  correct for local stdio, insufficient for any networked future).
- Why bad: opencode.ai / any MCP host cannot drive bugtest→fix→retest today;
  when exec tools are added (DS-OCT-03 proposes
  `v2/desktop/code/lib/api/terminal_routes.js` + new MCP tools), doing so
  without the pairing/token model in §3 would repeat D5 remotely.
- Fix: see Q4; hard precondition is §3.

### D9 — Lint covers 5 of 65 lib files; package is publishable — NON-BREAKING
- Evidence: `v2/desktop/code/package.json:29` (`lint` runs `node --check` on
  exactly `vcw_utils, config, pricing, api_server, core` of 65 `lib/**/*.js`
  files counted at audit time); `:103` (`"private": false`).
- Why bad: the files most likely to break the future (bridge, routes,
  storage, MCP server, heal worker) are outside the lint gate; a mistyped
  publish could push the desktop app to a registry.
- Fix: see Q5.

### D10 — Credential storage has two paths with a plaintext-named legacy — NON-BREAKING (suspect, verify before acting)
- Evidence (observed, not fully traced): `v2/desktop/code/lib/storage.js:26-32`
  defines both `credentials.json` (`getCredentialsFilePath`) and
  `credentials.enc` (`getEncryptedCredentialsFilePath`) while the module
  header (`:1-8`) advertises AES-256-GCM at rest in `credentials.enc`.
- Why bad (if the `.json` path is still written): keys at rest in plaintext
  beside the encrypted store defeats the encryption story.
- Fix: see Q5 (read-trace first; migrate-then-delete as a NEW migration
  script, never a silent edit).

### D11 — `app/main.js` is an 1185-line monolith; routes are a 505-line if-chain — NON-BREAKING
- Evidence: `v2/desktop/code/app/main.js` (1185 lines total; imports alone
  `:28-52` span native runner, scanners, window manager, discovery, API
  server, storage, meta endpoint, godot); `v2/desktop/code/lib/api/routes.js`
  (505 lines, sequential `if (pathname === …)` dispatch, endpoint list
  hard-coded in the 404 at `:499`).
- Why bad: every shell/API change touches the same files; no owner-per-file
  fan-out possible; the 404 endpoint list rots independently of the routes.
- Fix: none by this envelope (restructure is explicitly forbidden); Q6 parks
  it as a future envelope with a routing-table-first plan.

### D12 (web) — `/terminal` exists but has no desktop attach; `/api/desktop/*` has no pairing/metering/audit — NON-BREAKING (gap)
- Evidence: `v2/vcw4w/app/terminal/page.tsx` + `layout.tsx` exist; desktop
  APIs present are `app/api/desktop/mine|provision|[id]/pod|[id]/heartbeat|[id]/policy/route.ts`
  (5 routes, observed via glob); no `app/api/terminal/**`, no
  `app/api/desktop/metering/**`, no `lib/desktop-metering.ts` (DS-OCT-04 and
  DS-OCT-06 are `open` — not landed). DS-DTOP-03/04 (web attach + component)
  are claimed/in_progress, not done.
- Why bad: the site cannot reach any desktop today; when attach lands without
  pairing + metering + audit, remote exec arrives before its controls.
- Fix: §3 is the precondition; Q6 sequences the web work.

### D13 (web) — Legacy pairing-code path uses `Math.random` — BREAKING (security, must not be reused)
- Evidence: `v2/vcw4w/public/vibecodeworker-legacy/modules/gpu_remote.js:129`
  (`// Security: pairing codes authenticate a phone to the desktop.
  Math.random…`).
- Why bad: non-cryptographic pairing codes are guessable; whatever §3 builds
  must use `crypto.getRandomValues`/`randomUUID` server-side and must not
  copy this pattern.
- Fix: see Q1.

### D14 (web) — No coin/MCP pay path for desktop compute — NON-BREAKING (gap, economy-owned)
- Evidence: no metering route or rate table in scope (see D12); the
  100-coins-=$1 convention with 75/25 split is specified only in the open
  DS-OCT-06 envelope, and `lib/economy.ts` is explicitly out of bounds
  (economy-owned — never touch; debit via QUEUE request).
- Fix: see Q6.

---

## 2. Ranked fix queue (exact paths, new-files-only)

**Q1 — Security first (BREAKING: D4, D5-remote, D13).**
1. NEW `v2/desktop/code/src-tauri/tauri.conf.json`-adjacent capability doc +
   follow-up envelope widening `connect-src` to `http://127.0.0.1:*`
   `http://localhost:*` (and Ollama host) — exact file to patch in follow-up:
   `v2/desktop/code/src-tauri/tauri.conf.json:25`; capabilities dir
   `v2/desktop/code/src-tauri/capabilities/` for least-privilege scoping of
   `withGlobalTauri`.
2. NEW `v2/desktop/code/lib/api/pairing.js` (implements §3 device side) +
   NEW `v2/desktop/code/tests/test_pairing.js` — never retouch
   `lib/api_server.js` / `lib/api/routes.js` in place; mount via follow-up
   envelope.
3. Purge-or-quarantine `Math.random` pairing in
   `v2/vcw4w/public/vibecodeworker-legacy/modules/gpu_remote.js:129`
   (follow-up envelope; legacy path — deprecate, don't silently change
   behavior).

**Q2 — Config truth (BREAKING: D2).**
1. Follow-up envelope: add `opencode` (+ `serverPort`, `webEngine`,
   `localModels`, `cloud`) to `KNOWN_CONFIG_KEYS` in
   `v2/desktop/code/lib/config.js:8-16` with a schema-validated nested merge
   (never a blind `Object.assign` of nested blocks), plus warn-on-drop for
   unknown keys in `update()` (`:93-102`) / `fromJSON()` (`:177-186`).
2. Follow-up envelope: make `lib/opencode_bridge.js:53-64` read through the
   class instead of raw JSON (single reader).

**Q3 — One bridge (NON-BREAKING: D1).**
1. NEW `v2/desktop/code/docs/OPENCODE-BRIDGE-OWNERSHIP.md`: `lib/`
   owns protocol + heal loop; `src/modules/` owns renderer-safe spawning +
   redaction; terminal panel keeps importing only
   `src/modules/opencode-cli-bridge.js` (as today —
   `src/components/terminal-opencode.js:18,26`).
2. Follow-up envelope: extract shared `redactSecrets` + budget estimator
   into NEW `v2/desktop/code/src/modules/opencode-shared.js` consumed by both
   (no behavior change; both suites green).

**Q4 — Contain execution (NON-BREAKING tightening: D5-local, D6, D7, D8).**
1. NEW `v2/desktop/code/lib/api/terminal_routes.js` (DS-OCT-03 scope):
   token-authed exec, `X-Vibe-Auth` constant-time compare mirroring
   `lib/api_server.js:196-202`, loopback default, no shell metachars, arg
   allow-list, every exec logged; mount WITHOUT editing
   `lib/api/routes.js` / `lib/api_server.js` (mount as QUEUE request).
2. NEW `v2/desktop/code/tests/test_terminal_routes.js` (unauth → 401;
   allow-list rejection; audit-log line per exec).
3. Heal-signal follow-up: structured failure events (exit code + named
   test + artifact path) alongside — never replacing — the regex miner
   (`lib/opencode_bridge.js:468-480`); durable run registry follow-up.
4. Pin `OPENCODE_BINARY` to an absolute path + `shell:false` wherever a
   remote-influenced call path exists (`lib/opencode_bridge.js:276,299`).

**Q5 — Hygiene (NON-BREAKING: D3, D9, D10).**
1. NEW follow-up: `lint` in `v2/desktop/code/package.json:29` → explicit
   `node --check` list over all 65 `lib/**/*.js` + `workers/*.js` +
   `server/*.js`, or a NEW `scripts/node/lint_all.js`; set
   `"private": true` (`package.json:103`).
2. NEW follow-up: neutralize `config/default.json:4-7` game-specific
   defaults (generic neutral defaults + per-game overlay files).
3. Read-trace first: resolve whether `credentials.json`
   (`lib/storage.js:26-28`) is still written; if so, NEW migration script
   `v2/desktop/code/scripts/node/migrate_credentials_enc.js`, then delete
   the legacy path in the same envelope.

**Q6 — Sequenced web + structural work (NON-BREAKING: D11, D12, D14; other owners).**
1. §3 pairing first; then web attach (DS-DTOP-03/04 scopes), then metering
   quote API (DS-OCT-06 scope: NEW `app/api/desktop/metering/route.ts` +
   NEW `lib/desktop-metering.ts`, read-only, no ledger writes), then audit-log
   surfacing. No remote exec before pairing+consent — ever.
2. `app/main.js` / `lib/api/routes.js` decomposition parked as a dedicated
   future envelope (routing-table-first, single dispatcher seam, per-area
   modules); explicitly NOT this envelope (restructure forbidden).

---

## 3. USER-DESKTOP PAIRING SPEC (security-first; precondition for any remote control)

Principle: **remote control NEVER without explicit pairing + ongoing consent.**
An unpaired `desktop exec` (web or MCP) prints a pairing hint and does
nothing else. Pairing is per user + per device, least-privilege, revocable,
expiring, and fully logged on both ends.

### 3.1 Roles & surfaces
- **Desktop app** (device): generates codes, enforces allow-list + consent,
  holds the device key, keeps the device-side audit log.
- **Site** (`4weird.com`, user account): links codes to accounts, mints
  terminal-scoped tokens, keeps the account-side audit log, offers revoke.
- **MCP hosts** (opencode.ai etc.): never pair directly; they present a
  user-bound terminal token through the same allow-listed exec path.

### 3.2 Pairing flow (one-time code)
1. User opens desktop → *Link to 4weird account* → desktop shows a
   one-time code: 8 chars, unambiguous alphabet (no 0/O/1/I), rendered large
   with a 10-minute countdown. Code entropy ≥ 128 bits server-side; the
   displayed string is a short claim check, NOT the secret.
2. Desktop simultaneously registers a pending claim with the site
   (`POST app/api/desktop/pairing/claims`, device fingerprint: ed25519
   device public key generated on-device + device label + app version).
   Claim TTL 10 min, single-use, rate-limited per IP and per device.
3. User (signed in on site) enters the code at `/desktop/link`. Site shows
   device label + version + fingerprint (first-seen trust) and asks for
   explicit consent scope confirmation (terminal-only, always).
4. On confirm, site mints the pairing record + first terminal token (§3.3),
   marks the claim consumed, and both sides log PAIR_CLAIMED.
5. Desktop polls its claim (or receives the site callback) and shows
   "Linked to <account> — terminal-only. Revoke anytime: desktop or site."
6. Unclaimed/expired codes die silently; brute-force attempts lock the claim
   endpoint per IP with exponential backoff and emit a security log.

### 3.3 Token model (bound user + device, terminal-only, expiring, revocable)
- Token = opaque 256-bit `randomUUID`-class secret (server CSPRNG —
  **never `Math.random`**; cf. D13), stored hashed (SHA-256 + per-token salt)
  site-side; the desktop stores only the device private key + token metadata.
- Bound to `(userId, deviceId)`; presented per request as `X-Vibe-Auth`
  (desktop convention, cf. `lib/api_server.js:196-202` constant-time compare)
  or site-side `Authorization: Bearer`.
- Scope string `terminal:exec` ONLY — no file patch, no eval, no cloud
  launch, no settings. Allow-listed commands enumerated in §3.4; anything
  else → 403 + audit line.
- Expiry: 24 h idle / 30 d absolute, whichever first; rotation endpoint
  requires the still-valid token; rotation logs TOKEN_ROTATED with both ids.
- Revocation: user revokes per device (site `/desktop` device list or
  desktop *Unlink*); revocation takes effect ≤ 60 s (short-lived token cache
  TTL on desktop; site rejects immediately). Revoked-token use → 401 +
  security audit line. Desktop uninstall / key wipe revokes all its tokens.
- No secrets in logs: tokens hashed/truncated (`…last4`) in every log line,
  mirroring the bridge's `redactSecrets` doctrine
  (`src/modules/opencode-cli-bridge.js:47-59`).

### 3.4 Allow-listed commands (closed set; versions with the API)
- `vcw.status`, `vcw.list_games`, `vcw.get_state`, `vcw.get_logs`,
  `vcw.launch_game{gameId}`, `vcw.send_action{type,x,y,key}`,
  `vcw.export_testing_layouts{input,inputMode}`, `vcw.godot_status`,
  `vcw.godot_screenshot`, `vcw.generate_handoff{reason}` — i.e. today's
  read-mostly MCP surface (`server/vcw_mcp_server.js:7-22`) plus the
  supervised-action subset already exposed.
- Explicitly OUT until a later consented scope: raw shell, `evalJavaScript`
  with caller script (`lib/api/routes.js:151-158`), file patch, godot
  install, cloud launch/stop, settings/credential changes.
- Each command declares its arg schema; unknown args rejected; shell
  metacharacters rejected; no string is ever passed to `cmd.exe /c`
  or `sh -c` on the remote-driven path (cf. D7).

### 3.5 Consent & revocation UX
- Desktop: *Linked devices* panel — account, scope badge ("terminal only"),
  token expiry, per-session consent toggle ("require approve for each new
  session", default ON), *Unlink* button, last-10 audit lines.
- Site: `/desktop` device list — label, version, fingerprint, linked date,
  last used, scope, *Revoke* per device + *Revoke all*.
- Fresh consent per sensitive action class (launch game, send action):
  first use per session requires an on-desktop approve click unless the user
  opted into session-auto-approve; every approval logged.

### 3.6 Audit log (both sides, append-only, exportable)
- Every pairing event (CODE_SHOWN, CLAIM_CREATED, PAIR_CLAIMED, PAIR_DENIED,
  TOKEN_ROTATED, TOKEN_EXPIRED, REVOKED, UNPAIRED_EXEC_DENIED, EXEC_ALLOWED,
  EXEC_DENIED, CONSENT_GRANTED) records: timestamp, userId, deviceId,
  command + arg-shape (never secret values), result code, IP/origin.
- Desktop persists to the smart-log dir next to heal runs
  (cf. `lib/opencode_bridge.js:622-643`); site persists to its audit store.
- Reviewer check: link → exec → revoke replays as a green/red line trio in
  both logs; `generate_handoff` output includes the pairing audit excerpt.

### 3.7 Exact new-file landing plan (follow-up envelopes, not this one)
- Desktop: NEW `v2/desktop/code/lib/api/pairing.js` (claim + token verify +
  allow-list gate), NEW `v2/desktop/code/tests/test_pairing.js`
  (`node --check` clean; unauth→401, revoked→401, non-allow-list→403,
  unpaired→hint), mount via QUEUE request (never edit `lib/api/routes.js` /
  `lib/api_server.js` in place).
- Site: NEW `v2/vcw4w/app/api/desktop/pairing/**/route.ts` (claims, link,
  rotate, revoke), NEW `v2/vcw4w/app/desktop/link/page.tsx` (code entry +
  consent), NEW `v2/vcw4w/lib/desktop-pairing.ts` (claim math, token hash,
  audit shape) — all DS-OCT-04/06-adjacent follow-ups.
- MCP: exec-class tools land in `server/vcw_mcp_server.js` ONLY behind the
  pairing gate (DS-OCT-03 scope), each emitting the audit line.

### 3.8 Non-goals (explicitly out)
- No remote shell, no remote file write, no remote settings/credential
  access, no persistent sessions surviving revocation, no multi-device
  wildcard tokens, no pairing without a signed-in site account, no
  `Math.random` anywhere in the code path (D13).

---

## 4. Fixes implemented by this envelope
None (by design). Envelope scope is the single NEW doc file; any new JS
would fall outside `scope: ["v2/desktop/code/docs/FUTUREPROOF-AUDIT.md"]`,
so no code was added and no `node --check` was required. All remedies are
parked in the §2 queue as follow-up envelopes for their owning lanes.

## 5. Verification
- Target-absent check pre-write: read of
  `v2/desktop/code/docs/FUTUREPROOF-AUDIT.md` → "File not found" (proceed).
- Post-write: this file exists; zero existing files modified (only this NEW
  file + the envelope JSON lifecycle fields).
- Gate `node scripts/verify-desktop-opencode.mjs` from `v2/vcw4w`: script
  ABSENT (DS-DTOP-09 not landed) — MISSING-only red, recorded here and to be
  re-run before close (see closing report for verbatim output).

## 6. Follow-ups for lead (no QUEUE.md write — not instructed by this envelope)
1. DS-DTOP-09 verifier still missing — gate cannot go green until it lands;
   close of this envelope records MISSING-only red + rerun obligation.
2. Q1–Q6 map to future envelopes: pairing impl (desktop `lib/api/pairing.js`
   + site `app/api/desktop/pairing/**`), Tauri CSP patch
   (`src-tauri/tauri.conf.json:25`), config-keys fix (`lib/config.js:8-16`),
   bridge-ownership doc, terminal-routes + MCP exec tools (DS-OCT-03),
   metering (DS-OCT-06), web attach (DS-DTOP-03/04, DS-OCT-04).
3. Confirm D10 (`lib/storage.js:26-32` dual credential paths) with a
   read-trace before any migration envelope.
