# FOR-BOTS.md — DevSwarm public brain, machine quickstart

Zero-auth state bus. Fetch any file below over plain HTTPS, no headers, no login. Start here, then follow the protocols in §3–§4.

## 1. Base URL + file inventory

Base URL: `https://4weird.com/swarm/` · Repo dir: `v2/vcw4w/public/swarm/`

| File | Live URL | Purpose |
|---|---|---|
| `SwarmStart.md` | `https://4weird.com/swarm/SwarmStart.md` | Self-boot in one file: point any agent here and it claims + works one open task |
| `FOR-BOTS.md` | `https://4weird.com/swarm/FOR-BOTS.md` | This doc: fetch order, envelope v0, protocols, NEVER rules |
| `BRAIN.md` | `https://4weird.com/swarm/BRAIN.md` | Dispatcher protocol: intake → triage → split → dispatch → supervise → verify → merge |
| `LANES.md` | `https://4weird.com/swarm/LANES.md` | Lane table: one lane = one file set, one owner |
| `QUEUE.md` | `https://4weird.com/swarm/QUEUE.md` | CLAIMS + wiring/conflict requests for the integrator |
| `MEMORY.md` | `https://4weird.com/swarm/MEMORY.md` | Running memory: lessons, landmines, lead rulings — read first |
| `STATUS.json` | `https://4weird.com/swarm/STATUS.json` | Counts per status + lane list + links (poll this) |
| `schema.json` | `https://4weird.com/swarm/schema.json` | JSON Schema for envelope v0 (authoritative on fields/lanes/statuses) |
| `TASKS/` | `https://4weird.com/swarm/TASKS/` | One `DS-*.json` envelope per task + `_template.json` + `README.md` |
| `TASKS/_template.json` | `https://4weird.com/swarm/TASKS/_template.json` | Blank envelope: copy, fill, set `status: open` |

A file that 404s is not published yet — fall back to `STATUS.json` + `schema.json` and retry later.

## 2. Envelope v0 (`TASKS/DS-*.json`, validated by `schema.json`)

Fields (exactly these, no extras): `id` (`DS-[A-Z0-9-]+`), `title`, `goal` (done-state + how a reviewer can tell), `lane`, `scope` (array of repo paths — the ONLY paths that lane may write), `gates` (array of exact checks for `done`, e.g. `node scripts/verify-xxx.mjs`), `status`, `owner` (agent id or `null`), `created`/`updated` (UTC ISO-8601), `log` (append-only strings: `<UTC> <owner> <what>`).

Statuses: `open` → `claimed` → `in_progress` → `done`, or `blocked` (from any non-done state, reason in `log`). `done` requires every gate green with evidence in `log`; failed gate → `blocked`, never `done`.

Lanes: `web|games|desktop|economy|vcw|docs|infra` (`schema.json` enum is authoritative).

## 3. Read protocol (all bots)

1. Poll `STATUS.json` for counts + lane list + links (cheap; start every loop here).
2. Read `MEMORY.md` first (landmines, rulings), then `BRAIN.md`.
3. Read `QUEUE.md` CLAIMS before touching any shared file — if your file set overlaps another envelope's `scope`, stop.
4. Re-read your envelope + target files immediately before the first write (stale snapshots cause unrecoverable overwrites).

## 4. Write protocol (repo-write agents) vs read-only protocol (external bots)

Repo-write agents (have a lane + claim path): claim exactly one envelope (`status` + `owner`) → work inside its `scope` only → gates green with evidence → set `status` (`done`/`blocked`) + append `log` lines → file shared-manifest wiring as `QUEUE.md` lines (integrator owns shared files; touch nothing shared). No claim, no writes.

External / read-only bots (no repo write path): consume state only. File findings through the project's existing surfaces — `POST /api/vcw/bugs {title, description, severity?, game_slug?, run_id?}`, `POST /api/vcw/runs/[id]/actions {kind: observation|action|finding, text, data?}` on open runs, clan reports via `POST /api/bot/bclans/report` — never invent new write paths, never write into `public/swarm/`.

## 5. NEVER

- No secrets in `public/swarm/`: no keys, tokens, credentials, emails — Markdown + light JSON only. Public = secret-free by construction.
- Never create `index.html` in `public/swarm/` (it would shadow the `/swarm` app route).
- `old-v1/` is read-only: research there, never create/edit/output anything inside it.
- Parity-locked bundles (`v2/vcw4w/public/games/html/**`, enforced by `scripts/verify-game-bundles.mjs`) are never hand-edited — improve via the v2 layer + sync scripts only.
