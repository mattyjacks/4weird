# DevSwarm BRAIN — dispatcher protocol

Any swarm lead (human or agent) follows this file top to bottom. Contract-first hybrid: markdown bus for humans, task envelopes (`TASKS/*.json`) for machines.

## 0. OpenClaw habits (before anything else)

1. Read `MEMORY.md` first — prior runs, landmines, rulings.
2. Check skills for a matching playbook before inventing procedure.
3. Keep runs resumable: all state lives in envelopes, never in chat memory. A new agent must be able to pick up from `TASKS/` + `QUEUE.md` alone.

## 1. INTAKE

Goal arrives via `/swarm <goal>`. Record it verbatim as the run goal. Do not start work until the goal + repo gates for the touched area are known.

## 2. TRIAGE

Classify the goal into lanes (see `LANES.md`). One lane = one file set, one owner. If the goal spans lanes, split — never stretch one lane over another's files. If no lane fits, add a lane row first (see scale story in `README.md`), then proceed.

## 3. SPLIT

Write one task envelope per lane, copied from `TASKS/_template.json`. Required fields:

`id, title, goal, lane, scope_paths, gates, status, owner, created, updated, log[]`

- `scope_paths`: the ONLY paths that lane may write. Be narrow.
- `gates`: the exact checks that must pass for `done` (subset of §6, e.g. `node --check`, one `scripts/verify-*.mjs`).
- `status`: starts at `open`. Lifecycle: `open → claimed → in_progress → done`, or `blocked` from any non-done state.
- `log[]`: append-only progress lines (`<UTC> <owner> <what>`).

## 4. DISPATCH

Agents claim by setting `status` + `owner` on exactly one envelope, then work only inside its `scope_paths`.

- **Claim-before-write.** No claim, no writes. Unclaimed paths are read-only.
- **Re-read shared state before writing.** Re-read the envelope + target files immediately before the first write. A stale snapshot caused a real overwrite of untracked bytes that version control could not recover.
- **One lane owner per file set.** If the file you need is in another envelope's `scope_paths`, stop. Do not edit it.

## 5. SUPERVISE

Lead appends or requires progress lines in the envelope `log[]` — claim, halfway signal, verify evidence, done. No silent work. A run with no `log[]` movement is a stuck run: ping the owner or re-dispatch as `blocked` + reason.

## 6. VERIFY

`status: done` is allowed ONLY when every gate listed in that envelope passes with evidence in `log[]`. Repo gates (pick the relevant subset per envelope):

- `npm test` chain (runs `sync-game-bundles.mjs` + all `scripts/verify-*.mjs` + `eslint` + `tsc --noEmit`; see `v2/vcw4w/package.json`)
- Relevant `node scripts/verify-*.mjs` for the touched area (bundles, content-modes, plus/epic/1d, swarm, …)
- `node --check` for every touched/created `.js` file
- `tsc --noEmit` when `.ts` touched; `eslint` on touched paths

Failed gate → `blocked` + reason in `log[]`, never `done`.

## 7. MERGE

Shared manifests (sync scripts, `package.json`, registries, indexes) are edited LAST by ONE integrator. Everyone else files wiring requests in `QUEUE.md` and touches nothing shared.

- This is the G10/E20 pattern from `aiorch-01.md`: content lanes create NEW files only + append a queue line; the integrator wires them in one pass.
- Queue lines stay owned by their lane until the integrator marks them fulfilled.

## Hard rules (no exceptions)

- `old-v1/` is read-only. Research there, never write there.
- Parity-locked game bundles are never hand-edited. Improve via the v2 layer + sync scripts; `verify-game-bundles.mjs` must stay green.
- Conflicts go to `QUEUE.md`, not into others' files. Pull latest before writing.
- `public/swarm/` stays secret-free: no keys, tokens, credentials, emails. Markdown + light JSON only; never create `index.html` (it would shadow the `/swarm` app route).
