---
description: Cheap swarm — fan out 10-30 thrifty agents on file-sized scopes with snapshot packs and no retries
---

# /cheap — CHEAP swarm (thrifty tokens)

Goal: $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user for a goal and stop — do not fan out on an empty goal.

Trigger: user says "make it with N cheap agents" or invokes `/cheap`.

## Mode contract (canonical: `v2/vcw4w/lib/swarm-ss2/modes.mjs`, `modes.v1`)

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

## 1. Boot (do exactly this — per ss2 boot in `v2/vcw4w/public/swarm/ss2.md`)

All CLI subcommands run from `v2/vcw4w/` via `node ../../../scripts/swarm-ss2.mjs <subcommand>` (full list: `ready` | `pack` | `verify-pack` | `claim` | `heartbeat` | `release` | `run` | `pickup` | `tokens-note` | `tokens-report`):

1. **READY.json:** fetch `v2/vcw4w/public/swarm/READY.json`. If empty `ready[]`, report idle and stop. Never claim `DS-TEST-*`.
2. **Pack:** fetch your pack (`Packs/<id>.json` from the entry's `pack` field; lead mints with `pack <id>`).
3. **Verify-pack:** `verify-pack <id>`. Mismatch = re-read only the drifted file, then write.
4. **Claim:** exclusive-create your lockfile — `claim <id>` (prints your owner id; a failure means someone else holds it — take the next READY entry, never fight).
5. **Work inside `scope` only.** Re-read each target immediately before the first write. One owner per file set — never write outside your scope. Shared manifests are integrator-owned: NEW files only + QUEUE.md wiring lines.
6. **Gate before done:** run the envelope's `gates`, paste evidence into its `log`. Green → `done`, red → `blocked` + reason, never `done` on red. Envelope gates only; the integrator verifies once at the end (no per-agent pair check in CHEAP).
7. **Close:** flip the envelope, delete your lockfile (`release <id> --owner TAG`), append one token line (`tokens-note <id> <model> <in> <out>`).

Fallback: if `READY.json` is missing/stale (>30 min) or the CLI errors, use `SwarmStart.md` classic boot (TASKS/ listing + honor claims). Envelopes are unchanged — only this index is new.

## 2. Open the run

`run --mode cheap --agents N --goal "..." [--target desktop|cloud-vm]` writes a `RUNS/open/<run>.json` intent (phone/desktop/VM pickup). A run is files: `RUNS/open/<run>.json` (intent) → `RUNS/active/` (picked up) → `RUNS/done/` (close-out + token total). State the hard token cap (budgetMultiplier 1.0 × baseline estimate) in the run intent. A STOP file in `v2/vcw4w/public/swarm/` halts pickup; in-flight agents finish, nothing new starts.

## 3. Triage the goal

Split `$ARGUMENTS` into file-sized scopes, one envelope per scope at `v2/vcw4w/public/swarm/TASKS/DS-XXXX.json` (next free number above the highest existing `DS-XXXX.json`; fill per `_template.json`: id, lane, goal, ownership paths, status, log). One owner per file set — no two envelopes share writable paths. If part of the goal fits no clean file scope, put it in the closest scope and note the stretch in the envelope.

## 4. Fan out

Launch 10–30 agents (`Task` tool, one call per envelope, in parallel). Each subagent prompt embeds: the full envelope JSON, the envelope path, its owned file(s), its snapshot pack, and the boot sequence above. Subagents write ONLY inside their owned paths and append one-line progress to their envelope `log`; they never edit another scope's envelope.

## 5. Supervise

Monitor via envelope `log` fields (re-read `TASKS/DS-XXXX.json`), not chat transcripts. Blocked → envelope to `blocked` + reason, append a QUEUE.md line, move on — NO retries, no re-dispatch, no silent ownership expansion. Keep `STATUS.json` / `QUEUE.md` truthful while work is in flight. Never take over a live lockfile: contest via QUEUE.md.

## 6. Integrator verifies once at end

When all envelopes are `done`/`blocked`, the integrator (and only the integrator) merges shared-manifest wiring, then runs the gates once from `v2/vcw4w/` (`npm test` chain, including `verify:devswarm`). Gate failure → QUEUE line for a follow-up run, never a retry inside this run.

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
