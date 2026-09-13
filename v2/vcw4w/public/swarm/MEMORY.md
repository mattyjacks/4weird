# DevSwarm Memory (v2/vcw4w)

World-readable under `public/swarm`. NEVER put secrets, keys, tokens, or emails here.

Source of seeded lessons: `aiorch-01.md` at repo root (the prior swarm bus — history stays there, not copied here).
Cap: keep this file under ~200 lines. Summarize quarterly (fold old bullets into one line per theme).

## New entries (newest first)

- 2026-09-13 parity: desktop-can-do-anything-web-can split into 4 lane envelopes (vcw shell, games catalog API, desktop native client, docs) � new files only, STATUS recomputed from TASKS dir at merge (disk had moved under us: 02:30 snapshot vs read snapshot), verify-devswarm + game-bundles + desktop green (evidence: TASKS/DS-*-01.json logs).

- 2026-09-13 desktop/exe: DS-EXE-KEY-01 done — lib.rs now accepts 20-32 suffix to match BOT_KEY_RE; gates node --check JS_OK + cargo check Finished (evidence: TASKS/DS-EXE-KEY-01.json log).
- 2026-09-13 desktop/exe: JS widened BOT_KEY_RE to {20,32} while Rust is_valid_bot_token still enforced exactly 30 chars, causing SAVE-then-reject in the exe (integration report §1). Lesson: align validation on both sides of a Tauri invoke boundary in ONE envelope before rebuilding (evidence: DS-EXE-KEY-01).
- (none yet — append new dated bullets here, newest on top; format `- YYYY-MM-DD <lane/tag>: <lesson> (evidence: <verifier/log>)`)

## Seeded lessons — 2026-09-13 (from aiorch-01.md)

- 2026-09-13 claim-before-write + re-read shared state before writing: a stale all-open snapshot led G6 to overwrite sub-03's landed `gravegain1d-art.js`; file was untracked so sub-03's bytes were unrecoverable from version control (aiorch-01.md:210, CONFLICTS:244). Lesson: CLAIM first, pull/re-read the bus + target file immediately before writing, never write from a cached snapshot.
- 2026-09-13 filename/global collisions need an orchestrator ruling BEFORE wiring: `window.GraveGain1DArt` owned by both `gravegain1d-art.js` and `gravegain-1dart.js`; `window.GraveGain25D` by `gravegain-2p5d.js` + `gravegain-25d.js`; models split `gravegain-models-3d.js` vs `gravegain3d-models.js` (aiorch-01.md:234, 245, 247-249; QUEUE:83-86). Lesson: on collision, record in CONFLICTS and wait for ruling — do not wire either side unilaterally.
- 2026-09-13 merge-vs-replace rulings live in CONFLICTS and are binding: E20 first wired exactly-one 1D-art file per dispatch, then REVERTED to the orchestrator MERGE ruling on finding it in-tree (both art files routed, merge guards, no content bytes touched) (aiorch-01.md:238-239, 248-249). Same pattern for arsenal/emergent/perf rulings (aiorch-01.md:283-285). Lesson: dispatch text loses to in-tree CONFLICTS rulings.
- 2026-09-13 generated bundles vs tracked sources discipline: `scripts/sync-game-bundles.mjs` regenerates bundles; treasure-hunters fix was generated-bundle-only (CHROME_PATTERNS regex + three.js fallback), tracked sources untouched, parity green (aiorch-01.md:108-109); sync proven deterministic over x3 runs (aiorch-01.md:219); E20 touched only sync + regenerated output (aiorch-01.md:238). Lesson: fix generators, never hand-edit generated outputs.
- 2026-09-13 done means gates green with evidence in the log: protocol requires claim → code → log line → done + verifier evidence (aiorch-01.md:6-17); e.g. plusFiles wave 44/44 green + 35 bundles + parity intact (aiorch-01.md:107); swarm verifier 123 pass / 5 fail, all 5 pre-existing content gaps, zero E20-caused (aiorch-01.md:238). Lesson: no `done` without pasted gate output.
- 2026-09-13 small scoped files beat big rewrites: content lanes create NEW files only, wiring lanes edit manifests (aiorch-01.md:13-15; ownership table:48-71); preferred fixes were additive — +21-line BIG-UPGRADE block (aiorch-01.md:202), `weaponFor` bridge instead of second arsenal runtime (aiorch-01.md:283), `pruneDecals`/`rect` compat aliases on perf v2.0.0 instead of restore (aiorch-01.md:285). Lesson: bridge/shim/append, don't rewrite a landed lane file.
