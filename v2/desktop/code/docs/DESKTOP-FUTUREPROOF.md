# DESKTOP FUTUREPROOF AUDIT — v2/desktop/code

Date: 2026-09-13 | Agent A8 | Scope: read-only audit of `v2/desktop/code`, non-breaking fixes limited to `.env.example` (comments only) + `.gitignore` (ignore entries only).

## BAD-DECISION LIST

### B1 — Electron + Tauri dual build (BREAKING)
- Evidence: `package.json` ships both `electron@^44.3.0` + `electron-builder@^26.15.3` (`start`, `dist`, `build:exe` scripts, `build.directories.output: dist`) AND `@tauri-apps/cli@^2.0.0` (`tauri:dev`, `tauri:build`, `tauri:build:win/mac/linux`); `src-tauri/tauri.conf.json` (productName `vibecodeworker-4weird`, `frontendDist: ../frontend`, bundle targets msi/nsis/dmg/app/appimage/deb) alongside `app/main.js` Electron main; `src-tauri/target/` + `node_modules/electron/dist/` both present.
- Why bad: two runtimes, two toolchains, two bundle/signing pipelines, double CVE surface; `VIBE_WEB_ENGINE` (`ultralight|electron|chromium`) adds a third engine selector on top.
- Fix direction (NOT applied — breaking): pick ONE ship vehicle (recommend Electron since launcher + `app/main.js` single-instance lock + `STATIC_PORT` serving all assume it); demote the other to an experiment branch. Filed as note for steward.

### B2 — `dist/` + `dist-current/` dual output dirs retained (BREAKING)
- Evidence: both dirs exist at repo root; `.gitignore` ignores both; `package.json` `build.files` excludes `!dist/*` + `!dist-current/*`; `automation/vcwcode-check-dist.js` reports sizes with policy "prune candidates only — never delete automatically; move stale bundles to archive by hand."
- Why bad: stale-bundle confusion (which exe is current?), disk bloat, manual archive discipline that nobody enforces.
- Fix direction (NOT applied — deleting artifacts is breaking): single `dist/` + versioned artifact names + explicit archive/retention policy. Filed as note.

### B3 — `credentials.json` vs `.env` dual secret store with drift (BREAKING)
- Evidence: `.env.example` header: keys "also saved locally into `%APPDATA%/vibecodeworker/credentials.json`"; `docs/VCWCODE-ENV-GUIDE.md` §2: "`.env` is the seed, not the only store"; `lib/storage.js` reads `process.env.*_API_KEY` per provider (incl. `RUNPOD_API_KEY`, `FOURWEIRD_BOT_KEY`, `FAL_KEY` not covered by setup docs flow); desktop FAL KEY / BOT TOKEN drawers store "encrypted outside the app folder" while `.env` holds fallbacks.
- Why bad: rotation in one store doesn't propagate; precedence (.env vs drawer vs credentials.json) undocumented in code; bug reports risk pasting values; `credentials.json` name collides with a committed-file risk.
- Fix direction (NOT applied — migration is breaking): single documented precedence chain (e.g. drawer > env > file) + `credentials.json` format version + rotation doc. Filed as note.

### B4 — Hardcoded default ports 42069 (API) + 8888 (static) + 11434 (Ollama) with fail-closed conflicts (BREAKING)
- Evidence: `app/main.js` `STATIC_PORT = 8888`, `VIBECODEWORKER_PORT || PORT || 42069`; `lib/api_server.js` `options.port || 42069`; `config/default.json` `serverPort: 42069`, `gameUrl: http://127.0.0.1:8888/...`, `localModels.ollamaUrl: http://127.0.0.1:11434`; `docs/VCWCODE-TROUBLESHOOTING.md` §2 documents `EADDRINUSE` / second-instance-exits / stale `:8888`; `config/VCWCODE-PORTS-NOTES.md` overlay-only resolution.
- Why bad: collides with concurrent dev servers / second app instance / anything parked on `:8888`; dozens of hardcoded `http://127.0.0.1:42069` references (docs, `frontend/run.js`, `server/vcw_mcp_server.js`, tests) make renumbering a flag day; 11434 ties local-model UX to Ollama's default.
- Fix direction (NOT applied — renumbering is breaking): ephemeral-port default + port-discovery file / loopback token, or at minimum one `PORTS` config table honored by every listener + client. Filed as note.

### B5 — Launcher self-repair runs `npm ci` on missing Electron binary (BREAKING to change)
- Evidence: `launch_vibecodeworker.bat` §1: if `node_modules\electron\dist\electron.exe` missing → `npm ci` (or `npm install`) from lockfile; Ollama preflight `scripts/node/ensure_ollama.js` (never auto-installs without `--install-ollama`, ~700MB+).
- Why bad: launch becomes network-dependent and slow on exactly the machines most likely offline/broken; a lockfile bump silently swaps the runtime under the user; failure mode is "delete node_modules and retry."
- Fix direction (NOT applied — offline/stranded users): verify pinned version + checksum before install, prefer bundled runtime, make repair opt-in with `--repair`. Filed as note.

### B6 — Triple config override: `config/default.json` vs dashboard vs env names (BREAKING to unify)
- Evidence: `serverPort` (file) vs `PORT` vs `VIBECODEWORKER_PORT` (env, code-primary) vs `VCWCODE_PORT` (named in `config/VCWCODE-ENV-CHECKLIST.md` but NOT read by code); `localUrl` vs `OLLAMA_URL` vs `OLLAMA_HOST` vs `localModels.ollamaUrl`; `gameUrl` embeds `:8888` while `STATIC_PORT` overrides it elsewhere.
- Why bad: same knob, three names, precedence spread across `app/main.js`, `lib/api_server.js`, `lib/ollama_manager.js`; checklist references a var (`VCWCODE_PORT`) the code never reads.
- Fix direction (NOT applied — renaming env vars is breaking): canonicalize one name per knob, keep aliases with deprecation warnings, fix checklist. Filed as note.

### N1 — `.env.example` missing vars the code actually reads (NON-BREAKING, FIXED)
- Evidence: `Select-String process.env.*` over `lib/`, `app/`, `server/` finds `VIBECODEWORKER_PORT`, `STATIC_PORT`, `VCW_API_URL`, `VCW_WEB_URL`, `OPENCODE_BINARY`, `OPENROUTER_MODEL`, `RUNPOD_API_KEY`, `RUNPOD_API_BASE`, `VIBE_CLOUD_IMAGE`, `VIBE_OPEN_SOURCE_GAMES_DIR`, `VIBE_GODOT_CLOUD/PROJECT/DISPLAY`, `GODOT_INSTALL_ROOT`, `FOURWEIRD_BASE_URL`, `AUTO_FIX_BUGS`, `VIBECODEWORKER_ROOT`, `OLLAMA_HOST` — none documented in `.env.example` before this audit (`RUNPOD_*` entirely absent despite `lib/runpod_cloud.js` + `storage.js` provider `runpod`).
- Fix applied: appended §13 to `.env.example` — comments + commented-out example lines only, no active values, no secrets. Verify: `git diff -- v2/desktop/code/.env.example`.

### N2 — `.gitignore` user-data/secret coverage gaps (NON-BREAKING, FIXED)
- Evidence: before audit, ignore covered `.env*` (+`!.env.example`), `credentials.json`, `.vibecodeworker-user-data/`, `*-user-data/` — but no generic `user-data/` and no `*.credentials.json` wildcard.
- Fix applied: added `*.credentials.json` and generic `user-data/` (+ clarifying comment). Additive ignores only; tracked files unaffected. Verify: `git diff -- v2/desktop/code/.gitignore` + `git check-ignore -v .env credentials.json user-data/`.

## FIXED vs FILED
- FIXED (non-breaking, in this change): N1 (`.env.example` §13 comments only), N2 (`.gitignore` additive entries).
- FILED AS NOTES (breaking, NOT changed): B1 (dual Electron+Tauri), B2 (dist/dist-current retention), B3 (credentials.json vs .env unification), B4 (port renumbering), B5 (launcher repair behavior), B6 (config/env name unification). Steward/owner decision required for each.

## VERIFICATION
- `node --check` on edited JS: none expected — only `.env.example`, `.gitignore`, and this doc were touched; no `.js` edited.
- `git status --porcelain -- v2/desktop/code` summary pasted in the agent return message.
- No secrets added: all new `.env.example` lines are comments / commented-out placeholders; `git diff` review confirms no values.
