# DevSwarm bus (`public/swarm/`)

DevSwarm is this repo's formal AI orchestration layer: contract-first hybrid, markdown bus for humans + machine-readable task envelopes for agents. This directory is the bus, served world-readable at `https://4weird.com/swarm/*`.

## Who consumes it

- **Humans** — read the protocol and run state straight from the URLs, no login.
- **The opencode `/swarm` command** — dispatches goals through `BRAIN.md` into lane envelopes.
- **ANY bot over HTTPS with zero auth** — fetch these files and follow the same protocol (start at `FOR-BOTS.md`).

Secret-free by construction: no keys, tokens, credentials, or emails ever land here. Markdown + light JSON only; no `index.html` (it must not shadow the `/swarm` app route).

## Index

- [SwarmStart.md](./SwarmStart.md) — self-boot in one file: point any agent here and it claims + works one open task. Short aliases (same content): `/swarm/start` · `/swarm/startswarm`.
- [BRAIN.md](./BRAIN.md) — dispatcher protocol: intake → triage → split → dispatch → supervise → verify → merge.
- [LANES.md](./LANES.md) — lane table: one lane = one file set, one owner.
- [FOR-BOTS.md](./FOR-BOTS.md) — bot quickstart: fetch order, claim rules, gate evidence format.
- [MEMORY.md](./MEMORY.md) — running memory: lessons, landmines, lead rulings. Read first.
- [QUEUE.md](./QUEUE.md) — wiring/conflict requests for the integrator (the G10/E20 pattern).
- [TASKS/](./TASKS/) — one envelope per lane per `_template.json` (`open → claimed → in_progress → done`, or `blocked`).

## Scale story

New lane = new `LANES.md` row + envelopes. Nothing else changes.
