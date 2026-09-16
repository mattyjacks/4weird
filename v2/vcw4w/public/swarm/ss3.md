# ss3 — file-native swarm boot (v2)

Two fetches, then work. Replaces `ss2.md` for new runs; `ss2.md` stays valid
(legacy). `SwarmStart.md` stays valid for classic runs.

## Boot (do exactly this — canonical; `/cheap` + `/fast` reference this)

All CLI subcommands run from `v2/vcw4w/` via
`node scripts/swarm-ss2.mjs <subcommand>`
(`ready` | `pack` | `verify-pack` | `claim` | `heartbeat` | `release` |
`run` | `pickup` | `tokens-note` | `tokens-report`):

1. **Fetch `READY.json`** (same dir). If empty `ready[]`, report idle and stop.
   Never claim `DS-TEST-*`.
2. **Fetch your pack** (`Packs/<id>.json` from the entry's `pack` field).
3. **Verify hashes:** `verify-pack <id>`. Mismatch = re-read only the drifted
   file, then write.
4. **Claim in ONE pass:** re-read the envelope from disk, then `claim <id>`
   (prints your owner id; failure means someone else holds it — take the next
   READY entry, never fight, never scan-then-claim across two passes).
5. **Work inside `scope` only.** Re-read each target immediately before the
   first write. Shared manifests are integrator-owned: NEW files only +
   one-line `QUEUE.md` wiring asks. Worker tags unique per session.
6. **Gate before done:** run the envelope's `gates`, paste evidence into its
   `log`. Green → `done`, red → `blocked` + reason, never `done` on red.
   Write `TASKS/*.json` BOM-less UTF-8 (PowerShell: `[IO.File]::WriteAllText`
   with UTF8-no-BOM, never `Set-Content`).
7. **Close:** flip the envelope, delete your lockfile (`release <id>`),
   append one token line (`tokens-note <id> <model> <in> <out>`),
   request a `STATUS.json` recount (never hand-edit it).

## Modes (both use cheap models; FAST ≈ 2x CHEAP via parallelism, never via model tier)

- **CHEAP** ("make it with N cheap agents", N = 10–30): 1 file per scope,
  snapshot packs, gates only, no retries, one-line reports.
- **FAST** ("use N fast agents together", N = 3–8 scopes + paired spot-checker
  each): full packs, gates + pair check, one narrowed retry, evidence reports.
- Canonical table: `v2/vcw4w/lib/swarm-ss2/modes.mjs` (pure, no I/O — the
  future relay imports it verbatim; the CLI imports it too, no copies).

## State map (what to read, and what NOT to)

- Live truth: `STATUS.json` counts → your `TASKS/DS-*.json` envelope →
  `MEMORY.md` newest 5 → `QUEUE.md` OPEN only.
- History (read-only, never edit, never re-file from):
  `QUEUE.archive-2026-09-15.md`. Envelope history stays in its `log`.
- Do NOT read `BRAIN.md` / `LANES.md` / the archive on boot — fetch them only
  if a scope overlap or ruling forces you to.

## Runs (phone + desktop + VM control)

- A run is files: `RUNS/open/<run>.json` (intent) → `RUNS/active/` (picked up)
  → `RUNS/done/` (close-out + token total).
- Open from anywhere: the `/swarm/control` page,
  `swarm-ss2 run --mode <cheap|fast> --agents N --goal "..." --target
  <desktop|cloud-vm>`, or (later) Telegram.
- STOP file in this dir halts pickup; in-flight agents finish their task,
  nothing new starts.

## Fallback

If `READY.json` is missing/stale (>30 min) or the CLI errors: use
`SwarmStart.md` classic boot (TASKS/ listing + honor claims). Envelopes are
unchanged — only this index is new.

## NEVER (binding)

- No secrets, logins, or private data anywhere under `public/swarm/`.
- Never create `index.html` in `public/swarm/`.
- `old-v1/` is read-only. Parity-locked game bundles are never hand-edited.
- Never take over a live lockfile: contest via `QUEUE.md`, steward rules.
- Never hand-edit `STATUS.json` counts; never edit the `QUEUE.archive-*` file.

(End of file)
