# RemasterySwarmStart — self-boot into remastery work in one file

Point any agent at this folder (`v2/vcw4w/public/swarm/remastery/`) and it
starts remastery work by itself: picks one open remastery envelope, claims
it, works it, gates it, lands it. No chat history needed — all state lives
in the bus files below.

Repo dir: `v2/vcw4w/public/swarm/` · Spec: `remastery/README.md` (90KB, read
slices, never full) · Canonical boot file: `remastery/SwarmStart.md` (this file).

## Boot sequence (do exactly this, in order)

1. **Poll state (1 cheap fetch).** `GET STATUS.json` → `counts` + `links`.
2. **Pick ONE remastery task.** List `TASKS/`, take the oldest `status: open`
   envelope with id prefix `DS-REM-`, `DS-REMASTER-`, or `DS-REMASTERY-`.
   `DS-TEST-*` are samples: never claim or close them. If no remastery
   envelope is open, report idle and stop — do not invent work.
3. **Read the minimum (envelope + 2 fetches).** Your envelope JSON + the
   newest 5 bullets of `MEMORY.md` + ONLY the README section your envelope
   names (see map). Do NOT read the whole README.
4. **Claim it.** Per `TASKS/README.md` lifecycle: `status: claimed` →
   `status: in_progress`, `owner: <your-agent-tag>`, `updated: <now-UTC>`,
   append one log line `<UTC> <owner>: <what happened>`. No claim, no writes.
   Use a fresh unique tag per session (never reuse another session's tag).
5. **Conflict check.** If a file you need is inside another envelope's
   `scope`, stop: append a line to `QUEUE.md` for the integrator and pick
   another task. If your scope's files already exist on disk (another agent
   landed them), read them first and only fill genuine gaps — never
   overwrite blindly.
6. **Work inside `scope` only. Generator discipline:** `remastery/README.md`
   is GENERATED from `sec1-4_*.py` via `build_guide.py` — never hand-edit
   the README, and never touch `sec*.py` unless your envelope scope says so.
   Shared manifests (nav, sitemap, configs, `package.json`) are integrator
   owned — create NEW files, file wiring as `QUEUE.md` lines.
7. **Go fast.** Split the scope into independent file batches and fan out one
   subagent per batch in parallel; supervise via envelope `log` lines. Never
   put two writers on one file. Single-file task → just do it, no fan-out.
8. **Gate before done.** Run EVERY command in the envelope's `gates`, paste
   the evidence into `log`. All green → `status: done`. Any red →
   `status: blocked` + reason, never `done`.
9. **Close the loop.** Recompute `STATUS.json` `counts` from the `TASKS/` dir
   (it decays under concurrency — never trust a cached snapshot) and report:
   files changed, gates green, open follow-ups.

## Map: README section → wave → envelope prefix → spec source

| README | Wave | Envelope prefix | Spec source (read slice, never edit unless scoped) |
|---|---|---|---|
| §1 vision, axioms, dir map | — | — | `remastery/sec1_vision_and_schema.py` |
| §2 DB migrations, RLS, indexes | W1/W2/W3-infra | `DS-REMASTER-W*n-INFRA`, `DS-REM-07` | `remastery/sec1_vision_and_schema.py` |
| §3 CAS suite (video, canvas, tester, P2P, recorder, pet, terminal, luck, interop, container, IDE, mods, agent) | W2/W3 | `DS-REMASTER-W2-*` (DPS/MCP/Discord/skills), `DS-REMASTER-W3-*` (studio/loader) | `remastery/sec2_cas_features.py` |
| §4 squad tooling (kanban, time, invoices, chat, utils) | W1 | `DS-REM-0*`, `DS-REMASTER-W1-*` | `remastery/sec3_gg_features.py` |
| §5 cross-cutting libs (clipboard, pipeline, notifications) | W1 foundation | `DS-REMASTERY-WAVE1-01` | `remastery/sec4_crosscutting_security_roadmap.py` |
| §6 security hardening, 300-fix | all | axiom in every envelope | `remastery/sec4_crosscutting_security_roadmap.py` |
| §7 rollout waves | — | — | this folder + `TASKS/` |
| §8 verification | — | gates in each envelope | `v2/vcw4w/scripts/verify-*.mjs` |

## Axioms (binding, README §1.2)

- `100 🪙 = exactly $1.00 USD`. 75% creator / 25% platform, cut included.
- Fail-open: dead AI/aux services never brick navigation.
- SSR-safe: no browser APIs at module top level, no hydration errors.
- Every tool publishes to the interop bus; coins move only via the paired
  ledger (never a parallel balance column).

## NEVER (binding, inherits `../SwarmStart.md` §NEVER)

- No secrets, logins, or private data anywhere under `public/swarm/`.
- Never create `index.html` in `public/swarm/` or `public/swarm/remastery/`.
- `old-v1/` is read-only. Parity-locked game bundles are never hand-edited.
- Never hand-edit `remastery/README.md` (generated). Rebuild via
  `build_guide.py` only when a scoped envelope says so.

## Map (bus files)

| Need | File |
|---|---|
| General boot (non-remastery work) | `../SwarmStart.md` |
| Envelope lifecycle + who-may-transition-what | `../TASKS/README.md` |
| Lane table (who owns which files) | `../LANES.md` |
| Wiring/conflict requests for the integrator | `../QUEUE.md` |
| Lessons, landmines, lead rulings | `../MEMORY.md` |
| Live counts + links | `../STATUS.json` |
| Task envelopes (the remastery list) | `../TASKS/` (prefixes above) |

(End of file — for route aliases like `/swarm/remastery/start`, file a
`QUEUE.md` line to the integrator; never edit `next.config.ts` yourself.)
