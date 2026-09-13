---
name: devswarm
description: Use when the user says swarm, /swarm, devswarm, parallel agents, multi-task across 4weird, or names lane files; dispatches the DevSwarm multi-agent protocol backed by v2/vcw4w/public/swarm/.
---

# DevSwarm

DevSwarm splits one goal into parallel lane tasks, each tracked by a JSON task envelope under `v2/vcw4w/public/swarm/TASKS/`. The `/swarm` command (`.opencode/commands/swarm.md`) is the runnable dispatcher; this skill is the condensed brain that tells the dispatcher how.

## Lifecycle

1. Load brain state (`BRAIN.md`, `LANES.md`, `MEMORY.md`, `QUEUE.md`, `STATUS.json`).
2. Triage the goal into lanes (one task per lane).
3. Claim: write one `TASKS/DS-XXXX.json` envelope per lane (next free number, per `_template.json`).
4. Fan out: one subagent per envelope (lane agents in `.opencode/agents/`).
5. Supervise via envelope logs; keep queue/status truthful.
6. Gate: `npm test` chain including `verify:devswarm` from `v2/vcw4w/` before marking done.
7. Report: files changed, checks green, follow-ups.

## Envelope fields

Per `v2/vcw4w/public/swarm/TASKS/_template.json`: `id` (`DS-XXXX`), `lane`, `goal`, ownership paths (only paths the lane may write), `status` (`claimed` → `in-progress` → `done`, plus blocked states per `BRAIN.md`), and `log` (append-only progress entries). Writing the envelope is the claim; no code changes before it exists.

## Canonical lanes

`web` | `games` | `desktop` | `economy` | `vcw` | `docs` | `infra`

Lane ownership and boundaries are defined in `LANES.md`. One lane per envelope; a stretch outside the lane is noted in the envelope, never silently expanded.

## Hard rules

- `old-v1/` is read-only (research there, build in `v2/`).
- Claim-before-write (envelope first, code second).
- Secrets never in `v2/vcw4w/public/swarm/` (public tree: no keys, tokens, or private data).
- Never create `v2/vcw4w/public/swarm/index.html`.

## Pointers

- Protocol source of truth: `v2/vcw4w/public/swarm/BRAIN.md`
- Lane definitions: `v2/vcw4w/public/swarm/LANES.md`
- Bot onboarding: `v2/vcw4w/public/swarm/FOR-BOTS.md`
- Live board: `https://4weird.com/swarm/` (per-file views under `https://4weird.com/swarm/*`)
