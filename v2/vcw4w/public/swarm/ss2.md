# ss2 — file-native swarm boot (v1)

Two fetches, then work. Replaces SwarmStart for ss2 runs; SwarmStart stays valid for classic runs.

## Boot (do exactly this)

1. **Fetch `READY.json`** (same dir). If empty `ready[]`, report idle and stop. Never claim `DS-TEST-*`.
2. **Fetch your pack** (`Packs/<id>.json` from the entry's `pack` field).
3. **Verify hashes:** `node scripts/swarm-ss2.mjs verify-pack <id>` from `v2/vcw4w/`. Mismatch = re-read only the drifted file, then write.
4. **Claim:** exclusive-create your lockfile — `node scripts/swarm-ss2.mjs claim <id>` (prints your owner id; a failure means someone else holds it — take the next READY entry, never fight).
5. **Work inside `scope` only.** Re-read each target immediately before the first write. Shared manifests are integrator-owned: NEW files only + QUEUE.md wiring lines.
6. **Gate before done:** run the envelope's `gates`, paste evidence into its `log`. Green → `done`, red → `blocked` + reason, never `done` on red.
7. **Close:** flip the envelope, delete your lockfile (`... release <id>`), append one token line (`... tokens-note <id> <model> <in> <out>`).

## Modes (both use cheap models; FAST ≈ 2x CHEAP via parallelism, never via model tier)

- **CHEAP** ("make it with N cheap agents", N = 10–30): 1 file per scope, snapshot packs, gates only, no retries, one-line reports.
- **FAST** ("use N fast agents together", N = 3–8 scopes + paired spot-checker each): full packs, gates + pair check, one narrowed retry, evidence reports.
- Canonical table: `v2/vcw4w/lib/swarm-ss2/modes.mjs` (pure, no I/O — the future relay imports it verbatim).

## Runs (phone + desktop + VM control)

- A run is files: `RUNS/open/<run>.json` (intent) → `RUNS/active/` (picked up) → `RUNS/done/` (close-out + token total).
- Open from anywhere: the `/swarm/control` page, `swarm-ss2 run --mode <cheap|fast> --agents N --goal "..." --target <desktop|cloud-vm>`, or (later) Telegram.
- STOP file in this dir halts pickup; in-flight agents finish their task, nothing new starts.

## Fallback

If `READY.json` is missing/stale (>30 min) or the CLI errors: use `SwarmStart.md` classic boot (TASKS/ listing + honor claims). Envelopes are unchanged — only this index is new.

## NEVER (binding)

- No secrets, logins, or private data anywhere under `public/swarm/`.
- Never create `index.html` in `public/swarm/`.
- `old-v1/` is read-only. Parity-locked game bundles are never hand-edited.
- Never take over a live lockfile: contest via QUEUE.md, steward rules.
