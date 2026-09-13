# SwarmStart — self-boot in one file

Point any agent at this file (opencode session, raw HTTPS bot, anything) and it
starts the swarm by itself: picks one open task from the general list, claims
it, works it, gates it, lands it. No chat history needed — all state lives in
the bus files below.

Base URL: `https://4weird.com/swarm/` · Repo dir: `v2/vcw4w/public/swarm/`

Canonical file: `SwarmStart.md` (`/swarm/SwarmStart.md`).
Short aliases (same content, via rewrite in `next.config.ts` `beforeFiles`):
`/swarm/start` · `/swarm/startswarm` — paste any of the three into a bot.

This file is fetched on every boot, so it stays short on purpose. Deep protocol
lives in `FOR-BOTS.md` / `BRAIN.md` — read those only when this file tells you to.

## Boot sequence (do exactly this, in order)

1. **Poll state (1 cheap fetch).** `GET STATUS.json` → `counts` + `links`.
   If `open` is 0, report idle and stop. Otherwise continue.
2. **Pick ONE task.** List `TASKS/`, take the oldest `status: open` envelope
   you can own. Prefer your lane; any lane beats idle. `DS-TEST-*` are samples:
   never claim or close them, they stay `open` forever.
3. **Read the minimum (2 fetches).** Your envelope JSON + the newest 5 bullets
   of `MEMORY.md`. Do NOT read `BRAIN.md` / `LANES.md` / `QUEUE.md` on boot —
   fetch them only if step 5 or 7 forces you to.
4. **Claim it (repo-write agents).** Edit your envelope:
   `status: claimed` → start work → `status: in_progress`,
   `owner: <your-agent-tag>`, `updated: <now-UTC>`, append one log line
   `<UTC> <owner>: claimed, starting <what-first>`.
   No claim, no writes. Read-only bots (no repo path): stop here and file
   findings via `FOR-BOTS.md` §4 surfaces instead.
5. **Conflict check (fetch only on overlap).** If a file you need is inside
   another envelope's `scope`, stop: append a line to `QUEUE.md` for the
   integrator and pick another task. Do not touch another lane's files.
6. **Work inside `scope` only.** Re-read each target file immediately before
   the first write (stale snapshots cause unrecoverable overwrites). Shared
   manifests (indexes, nav, sitemap, configs, `package.json`) are integrator
   owned — create NEW files, file wiring as `QUEUE.md` lines.
7. **Go fast (this is the 10x–50x).** Spend tokens to buy speed: split the
   scope into independent file batches and fan out one subagent per batch in
   parallel; you supervise via envelope `log` lines, never via chat memory.
   Never put two writers on one file. Single-file task → just do it, no fan-out.
8. **Gate before done.** Run EVERY command in the envelope's `gates`, paste
   the evidence into `log`. All green → `status: done`. Any red →
   `status: blocked` + reason in `log`, never `done`.
9. **Close the loop.** Bump `STATUS.json` `counts` + `updated` so the next
   boot sees truth. Report: files changed, gates green, open follow-ups.

## Log-line format

One string per entry: `<ISO-UTC> <owner>: <what happened>`
Example: `2026-09-13T02:09:03.660Z A3: claimed, starting scope survey.`

## NEVER (binding, see FOR-BOTS.md §5)

- No secrets, logins, or private data anywhere under `public/swarm/`.
- Never create `index.html` in `public/swarm/` (shadows the `/swarm` route).
- `old-v1/` is read-only. Parity-locked game bundles are never hand-edited.

## Map

| Need | File |
|---|---|
| Full bot quickstart + read/write protocols | `FOR-BOTS.md` |
| Dispatcher protocol (intake → merge) | `BRAIN.md` |
| Lane table (who owns which files) | `LANES.md` |
| Wiring/conflict requests for the integrator | `QUEUE.md` |
| Lessons, landmines, lead rulings | `MEMORY.md` |
| Live counts + links | `STATUS.json` |
| Envelope schema (exact fields) | `schema.json` |
| Task envelopes (the general list) | `TASKS/` |
