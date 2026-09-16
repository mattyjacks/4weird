---
description: Cheap swarm — fan out 10-30 thrifty agents on file-sized scopes with snapshot packs and no retries
---

# /cheap — CHEAP swarm (thrifty tokens)

Goal: $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user for a goal and stop — do not fan out on an empty goal.

Trigger: user says "make it with N cheap agents" or invokes `/cheap`.

## Mode contract (canonical: `v2/vcw4w/lib/swarm-ss2/modes.mjs`)

- Agents: 10–30 (clamp N with `clampAgents("cheap", N)`).
- Scope size: 1 file per scope.
- Pack: snapshot (hashes + acceptance cmds, no excerpts).
- Paired: no — no spot-checkers.
- Retries: 0 — NO retries. Blocked → write a QUEUE line, move on.
- Heartbeat: every 10 min (`heartbeat` subcommand refreshes the lockfile).
- Verify: envelope gates only (`gates`).
- Report: one-line agent reports.
- Budget: hard token cap stated in the run — `budgetMultiplier: 1.0` (the CHEAP baseline; the integrator states the cap when opening the run).
- Models: cheap models only.

## 1. Boot (canonical: `v2/vcw4w/public/swarm/ss3.md` §Boot — follow it exactly)

Run from `v2/vcw4w/`; prefix every subcommand with `node scripts/swarm-ss2.mjs`
(e.g. `node scripts/swarm-ss2.mjs claim <id>`).

CHEAP deltas on the canonical boot (everything else identical):

1. **READY.json:** if empty `ready[]`, report idle and stop. Never claim `DS-TEST-*`.
2. **Pack:** snapshot flavor (lead mints with `pack <id>`, no `--full`).
3. **Verify-pack:** mismatch = re-read only the drifted file, then write.
4. **Claim in ONE pass:** re-read the envelope from disk, then `claim <id>` — failure means take the next READY entry, never fight.
5. **Work inside `scope` only.** Re-read each target immediately before the first write. One owner per file set. Shared manifests are integrator-owned: NEW files only + `QUEUE.md` wiring lines.
6. **Gate before done:** envelope `gates` only; green → `done`, red → `blocked` + reason, never `done` on red. No per-agent pair check (the integrator verifies once at the end).
7. **Close:** flip the envelope, `release <id> --owner TAG`, `tokens-note <id> <model> <in> <out>`, request a `STATUS.json` recount (never hand-edit it). Write envelopes BOM-less UTF-8.

Fallback: if `READY.json` is missing/stale (>30 min) or the CLI errors, use `SwarmStart.md` classic boot (TASKS/ listing + honor claims). Envelopes are unchanged.

## 2. Open the run

`run --mode cheap --agents N --goal "..." [--target desktop|cloud-vm]` writes a `RUNS/open/<run>.json` intent (phone/desktop/VM pickup). A run is files: `RUNS/open/<run>.json` (intent) → `RUNS/active/` (picked up) → `RUNS/done/` (close-out + token total). State the hard token cap (budgetMultiplier 1.0 × baseline estimate) in the run intent. A STOP file in `v2/vcw4w/public/swarm/` halts pickup; in-flight agents finish, nothing new starts. Worker tags unique per session; claim-then-verify in one pass on a hot board.

## 3. Triage the goal

Split `$ARGUMENTS` into file-sized scopes, one envelope per scope at `v2/vcw4w/public/swarm/TASKS/DS-XXXX.json` (next free number above the highest existing `DS-XXXX.json`; fill per `_template.json`: id, lane, goal, ownership paths, status, log). One owner per file set — no two envelopes share writable paths. If part of the goal fits no clean file scope, put it in the closest scope and note the stretch in the envelope. Before minting, read the `QUEUE.md` tail — adopt an open envelope that already covers the goal instead of re-minting.

## 4. Fan out

Launch 10–30 agents (`Task` tool, one call per envelope, in parallel). Each subagent prompt embeds: the full envelope JSON, the envelope path, its owned file(s), its snapshot pack, and a pointer to `ss3.md` §Boot (paste the 7 steps inline — subagents must not depend on fetching it). Subagents write ONLY inside their owned paths and append one-line progress to their envelope `log`; they never edit another scope's envelope. `QUEUE.md` OPEN section only — never the archive.

## 5. Supervise

Monitor via envelope `log` fields (re-read `TASKS/DS-XXXX.json`), not chat transcripts. Snapshots lie on a hot board: re-read the envelope from disk before every gate decision. Blocked → envelope to `blocked` + reason, append a QUEUE.md line, move on — NO retries, no re-dispatch, no silent ownership expansion. Keep `STATUS.json` / `QUEUE.md` truthful while work is in flight. Never take over a live lockfile: contest via QUEUE.md.

## 6. Integrator verifies once at end

When all envelopes are `done`/`blocked`, the integrator (and only the integrator) merges shared-manifest wiring, then runs the gates once from `v2/vcw4w/` (`npm test` chain, including `verify:devswarm`). Gate failure → QUEUE line for a follow-up run, never a retry inside this run. Torn `TASKS/*.json` (parse error) is repaired minimally by steward/integrator with disclosure (one-char fix + re-parse check), never by a sibling lane.

## 7. Report

Final message lists:

- Files changed (per envelope / scope)
- Checks green (paste the gate evidence: `npm test` + `verify:devswarm` result)
- Follow-ups (open/blocked envelopes, QUEUE lines added, suggested next `/cheap` goal)

## Hard rules

- `old-v1/` is read-only: never create, edit, move, build, or output anything under it. All new work belongs in `v2/`.
- Claim-before-write: no code changes without a written `TASKS/DS-XXXX.json` envelope claim first.
- Secrets never land in `v2/vcw4w/public/swarm/` (no API keys, tokens, or private data in brain, envelopes, logs, or memory).
- Never create `v2/vcw4w/public/swarm/index.html`.
- Never edit `QUEUE.archive-*.md`; never hand-edit `STATUS.json` counts.
