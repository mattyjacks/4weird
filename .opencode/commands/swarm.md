---
description: DevSwarm dispatcher — split a goal into parallel lane tasks with task envelopes across the 4weird project
---

# /swarm — DevSwarm dispatcher

Goal: $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user for a goal (or offer to pick up the top open item from `QUEUE.md` / `STATUS.json`) and stop — do not fan out on an empty goal.

## 1. Load brain state

Read these fresh on every run (repo root relative):

- `v2/vcw4w/public/swarm/BRAIN.md`
- `v2/vcw4w/public/swarm/LANES.md`
- `v2/vcw4w/public/swarm/MEMORY.md`
- `v2/vcw4w/public/swarm/QUEUE.md`
- `v2/vcw4w/public/swarm/STATUS.json`
- `v2/vcw4w/public/swarm/TASKS/_template.json` (envelope schema)

Do not rely on cached summaries — the queue, status, and memory may have changed since last run.

## 2. Triage the goal

Split `$ARGUMENTS` into one task per lane. Canonical lanes: `web` | `games` | `desktop` | `economy` | `vcw` | `docs` | `infra`.

- One lane per envelope; never bundle two lanes into one envelope.
- Single-lane goal → single envelope, still use the full envelope flow.
- If part of the goal fits no lane, put it in the closest lane and note the stretch in the envelope.

## 3. Claim and create envelopes

For each lane task, create exactly one envelope at `v2/vcw4w/public/swarm/TASKS/DS-XXXX.json`:

- Use the next free number above the highest existing `DS-XXXX.json` (check the `TASKS/` directory listing first).
- Fill it per `_template.json` (id, lane, goal, ownership paths, status, log).
- Writing the envelope file IS the claim — one claim per lane, before any subagent starts.

## 4. Fan out

Launch one subagent per envelope (`Task` tool, one call per envelope, in parallel):

- Use the lane agent in `.opencode/agents/` matching the envelope lane.
- The subagent prompt must embed: the full envelope JSON, the envelope path, and the owned paths it may write. Subagents write ONLY inside their owned paths.
- Subagents append progress to their envelope `log`; they never edit another lane's envelope.

## 5. Supervise

- Monitor via envelope `log` fields (re-read `TASKS/DS-XXXX.json` files), not via chat transcripts.
- If a lane is blocked, record the blocker in its envelope and either re-scope or re-assign — do not silently expand its ownership paths.
- Keep `STATUS.json` / `QUEUE.md` truthful about lane states while work is in flight.

## 6. Gates before done

No envelope is marked done until gates pass from `v2/vcw4w/`:

- `npm test` chain, including `verify:devswarm`
- If a gate fails, send the failure back to the owning lane's subagent with the failing output; repeat until green.

## 7. Report

Final message lists:

- Files changed (per envelope / lane)
- Checks green (paste the gate evidence: `npm test` + `verify:devswarm` result)
- Follow-ups (open envelopes, deferred items, suggested next `/swarm` goal)

## Hard rules

- `old-v1/` is read-only: never create, edit, move, build, or output anything under it. All new work belongs in `v2/`.
- Claim-before-write: no code changes without a written `TASKS/DS-XXXX.json` envelope claim first.
- Secrets never land in `v2/vcw4w/public/swarm/` (no API keys, tokens, or private data in brain, envelopes, logs, or memory).
- Never create `v2/vcw4w/public/swarm/index.html`.
