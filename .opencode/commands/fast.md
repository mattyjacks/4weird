---
description: Fast swarm — run 3-8 paired scopes with full packs, pair checks, and one narrowed retry for speed
---

# /fast — FAST swarm (hastey wastey)

Goal: $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user for a goal and stop — do not fan out on an empty goal.

Trigger: user says "use N fast agents together on this" or invokes `/fast`.

Cost/speed law (explicit): FAST ≈ 2x CHEAP tokens via parallelism, full packs, pairing, and retries (guard band 1.5–2.3 per `RATIO_GUARD` in `modes.mjs`); 3–5x faster wall-clock. Speed never comes from model tier — both modes run cheap models only, NEVER expensive models.

## Mode contract (canonical: `v2/vcw4w/lib/swarm-ss2/modes.mjs`)

- Agents: 3–8 scopes, each with a paired spot-checker (so up to 16 workers; clamp scope count with `clampAgents("fast", N)`). Builder and spot-checker are BOTH cheap models — NEVER expensive models.
- Scope size: slice (multi-file coherent slice per scope).
- Pack: full (+ excerpts + tried-list on top of the snapshot).
- Paired: yes — one spot-checker sibling per scope (~1/3 build cost), runs gates + pair check on the builder's output.
- Retries: exactly ONE narrowed retry per blocked task, then QUEUE it and move on.
- Heartbeat: every 3 min (`heartbeat` subcommand refreshes the lockfile).
- Verify: per-agent gates + pair check (`gates+pair`).
- Report: evidence reports (gate output + pair verdict pasted into the envelope log).
- Budget: hard token cap stated in the run — `budgetMultiplier: 2.0` (≈2x the CHEAP baseline for the goal; cost drivers per `COST_MODEL`: packs 0.7, execution 0.45, verification 0.3, retries 0.25, coordination 0.3).

## 1. Boot (canonical: `v2/vcw4w/public/swarm/ss3.md` §Boot — follow it exactly)

Run from `v2/vcw4w/`; prefix every subcommand with `node scripts/swarm-ss2.mjs`
(e.g. `node scripts/swarm-ss2.mjs claim <id>`).

FAST deltas on the canonical boot (everything else identical):

1. **READY.json:** if empty `ready[]`, report idle and stop. Never claim `DS-TEST-*`.
2. **Pack:** full flavor (lead mints with `pack <id> --full`, appending the 2–3 grounding excerpts at dispatch).
3. **Verify-pack:** mismatch = re-read only the drifted file, then write.
4. **Claim in ONE pass:** re-read the envelope from disk, then `claim <id>` — failure means take the next READY entry, never fight.
5. **Work inside `scope` only.** Re-read each target immediately before the first write. Builders write ONLY inside owned paths; spot-checkers never write builder paths. Shared manifests are integrator-owned: NEW files only + `QUEUE.md` wiring lines.
6. **Gate before done:** envelope `gates` green (evidence pasted) AND spot-checker verdict green → `done`. Red spends the ONE narrowed retry (same scope, reduced diff, excerpts refreshed); second red → `blocked` + QUEUE line. Never `done` on red.
7. **Close:** flip the envelope, `release <id> --owner TAG`, `tokens-note <id> <model> <in> <out>`, request a `STATUS.json` recount (never hand-edit it). Write envelopes BOM-less UTF-8.

Fallback: if `READY.json` is missing/stale (>30 min) or the CLI errors, use `SwarmStart.md` classic boot (TASKS/ listing + honor claims). Envelopes are unchanged.

## 2. Open the run

`run --mode fast --agents N --goal "..." [--target desktop|cloud-vm]` writes a `RUNS/open/<run>.json` intent (phone/desktop/VM pickup). A run is files: `RUNS/open/<run>.json` (intent) → `RUNS/active/` (picked up) → `RUNS/done/` (close-out + token total). State the hard token cap (budgetMultiplier 2.0 × CHEAP baseline estimate) in the run intent. A STOP file in `v2/vcw4w/public/swarm/` halts pickup; in-flight agents finish, nothing new starts. Worker tags unique per session; claim-then-verify in one pass on a hot board.

## 3. Triage the goal

Split `$ARGUMENTS` into 3–8 slice scopes, one envelope per scope at `v2/vcw4w/public/swarm/TASKS/DS-XXXX.json` (next free number above the highest existing `DS-XXXX.json`; fill per `_template.json`: id, lane, goal, ownership paths, status, log). One owner per file set — no two scopes share writable paths. If part of the goal fits no clean slice, put it in the closest scope and note the stretch in the envelope. Before minting, read the `QUEUE.md` tail — adopt an open envelope that already covers the goal instead of re-minting.

## 4. Fan out

Launch one builder + one spot-checker per scope (`Task` tool, in parallel). Each prompt embeds: the full envelope JSON, the envelope path, its owned slice, its full pack, and a pointer to `ss3.md` §Boot (paste the 7 steps inline — subagents must not depend on fetching it). Builders write ONLY inside their owned paths and append evidence progress to their envelope `log`; spot-checkers never write builder paths — they verify (re-run gates, review the diff) and paste a pair verdict into the envelope `log`. No scope ships without its pair verdict. `QUEUE.md` OPEN section only — never the archive.

## 5. Supervise

Monitor via envelope `log` fields (re-read `TASKS/DS-XXXX.json`), not chat transcripts. Snapshots lie on a hot board: re-read the envelope from disk before every gate decision. Blocked → envelope to `blocked` + reason → exactly ONE narrowed retry (tighter scope, fresh excerpts, same owner) → still red means QUEUE.md line and move on. Never a second retry inside this run; do not silently expand ownership paths. Keep `STATUS.json` / `QUEUE.md` truthful while work is in flight. Never take over a live lockfile: contest via QUEUE.md.

## 6. Gates before done

No envelope is marked done until per-agent gates + pair check pass from `v2/vcw4w/`: the envelope's `gates` green (evidence pasted) AND the spot-checker's verdict green. Gate failure spends the one retry; a second red closes as `blocked` with the failing output attached. Torn `TASKS/*.json` (parse error) is repaired minimally by steward/integrator with disclosure, never by a sibling lane.

## 7. Report

Final message lists:

- Files changed (per envelope / scope, builder + checker noted)
- Checks green (paste the gate evidence plus pair verdicts)
- Follow-ups (open/blocked envelopes, QUEUE lines added, suggested next `/fast` goal)
- Token ratio check: `tokens-report --run <id>` vs the CHEAP baseline through `checkRatio` — outside 1.5–2.3 pages the lead.

## Hard rules

- `old-v1/` is read-only: never create, edit, move, build, or output anything under it. All new work belongs in `v2/`.
- Claim-before-write: no code changes without a written `TASKS/DS-XXXX.json` envelope claim first.
- Secrets never land in `v2/vcw4w/public/swarm/` (no API keys, tokens, or private data in brain, envelopes, logs, or memory).
- Never create `v2/vcw4w/public/swarm/index.html`.
- Never edit `QUEUE.archive-*.md`; never hand-edit `STATUS.json` counts.
