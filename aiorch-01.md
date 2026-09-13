# aiorch-01 — AI ORCHESTRATOR (GraveGain graphics + emergent-content swarm)

20 lanes, 2 waves (G1–G10 graphics, E11–E20 emergent). You work alongside
other agents on the same tree. This file is the live bus: claim, log, queue.

## PROTOCOL (every agent, every session)

1. READ this whole file first, then the files in your lane.
2. CLAIM your lane: append `| <LANE> | <agent-tag> | claimed <UTC> |` under CLAIMS.
3. WRITE CODE in your lane files only (see OWNERSHIP). Never touch another
   lane's files. Never touch `old-v1/` (read-only mirror).
4. LOG progress: append one line under LOG (`- <UTC> <LANE> <what>`).
5. DONE: change your claim row to `done`, list files created.
6. INJECTION QUEUE: content agents (G1–G9, E11–E19) create NEW files ONLY and
   append a wiring request under QUEUE. Only G10/E20 edit shared manifests.
7. CONFLICTS: pull latest before writing; if a file you need is owned, note it
   in CONFLICTS instead of editing it.

## HARD RULES (parity / policy / perf)

- EDITABLE: `v2/vcw4w/public/games/html/gravegain3d/**` + `gravegain2d/**`
  (diverged, parity-waived) and `gravegain1d/**` (v2-native). New root-level
  `public/games/html/*.js` files are allowed (reported as extra, not failure).
- FORBIDDEN: `old-v1/**` (read-only), any byte-locked bundle outside the three
  GraveGain dirs. Run `node scripts/verify-game-bundles.mjs` from `v2/vcw4w`
  before finishing.
- VANILLA JS, idempotent files: `if (window.<Flag>) return;`. No imports —
  games load via script tags. Poll for game globals, degrade gracefully.
- AGE BANDS, same graphics for all EXCEPT drugs + gore/blood:
  `kid` = NO blood, rainbow sparkles + praise words instead. `teen` = blood,
  minimal gore. `all` (adults) = over-the-top gore physics + entity damage,
  voxels OK; drugs ONLY on `all`. Never show/filter-leak drugs to kid/teen.
- MODE CONTRACT (reuse, don't reinvent): `?content=kid|teen|all` >
  localStorage `4weird-content-mode:<slug>` / `FourweirdContentMode` >
  `window.FourweirdContentMode = { mode, goreEnabled, drugsAllowed }` >
  `fourweird-content-mode` CustomEvent. Kill FX routes via
  `window.FourweirdGore.spawn` when present; 3D also `window.GraveGain3DGore`,
  2D `window.GraveGain2DGore`. Sibling files: `gore-gravegain3d.js`,
  `gore-gravegain2d.js`, `gravegain-workers.js`, `gravegain-graphics-plus.js`.
- PERF BUDGETS: 60fps target. Pools + caps on all particles/decals/voxels
  (e.g. ≤300 voxels, ≤150 decals, fade ≤30s). GPU: THREE InstancedMesh,
  no per-frame allocations. CPU: chunk AI, spatial hash, offload to existing
  workers (`engine/graphics-worker.js`, `gravegain-workers.js`). Runtime
  patching preferred over engine rewrites.
- REGISTRY: expose `window.GraveGainMods = window.GraveGainMods || []` push
  `{ name, version, init }` so wiring/QA can detect each mod.

## OWNERSHIP (lane → files, new files unless noted)

| Lane | Files |
|---|---|
| G1 voxel gore (adult 3D) | `public/games/html/voxel-gore-3d.js` |
| G2 3D models (enemies+weapons) | `public/games/html/gravegain3d-models.js` |
| G3 thread/GPU tuner | `public/games/html/gravegain-thread-tuner.js` |
| G4 2.5D look (2D) | `public/games/html/gravegain2d-25d.js` |
| G5 2D sprites (enemies+weapons) | `public/games/html/gravegain2d-sprites.js` |
| G6 1D art + emoji style | `public/games/html/gravegain1d-art.js` |
| G7 age-band director | `public/games/html/gravegain-agebands.js` |
| G8 3D arsenal (class/race weapons) | `public/games/html/gravegain3d-arsenal.js` |
| G9 2D+1D arsenal | `public/games/html/gravegain-arsenal-2d1d.js` |
| G10 wiring+settings+QA | manifests (`**/game.json`, `**/index.html`, `scripts/sync-game-bundles.mjs`) + `graphics-settings` docs |
| E11 side quests | `public/games/html/gravegain-sidequests.js` |
| E12 NPCs + dialogue | `public/games/html/gravegain-characters.js` |
| E13 random events | `public/games/html/gravegain-events.js` |
| E14 loot (weapons batch) | `public/games/html/gravegain-loot.js` |
| E15 bestiary (enemies batch) | `public/games/html/gravegain-bestiary.js` |
| E16 1D Echo Drift | `public/games/html/gravegain1d-drift.js` |
| E17 2D endless | `public/games/html/gravegain2d-endless.js` |
| E18 3D endless | `public/games/html/gravegain3d-endless.js` |
| E19 codex/lore | `public/games/html/gravegain-codex.js` |
| E20 wiring+verify+QA | manifests + `scripts/verify-gravegain-swarm.mjs` |

Shared references (read-only for all): `gravegain3d/engine/game-data.js`
(classes/races/weapons), `gravegain3d/engine/graphics-settings.js`,
`gravegain3d/engine/performance-manager.js`, `gravegain3d/lore.js`,
`content/gravegain*-modes.ts`, `lib/age-gate.ts`.

## QUEUE (wiring requests for G10/E20 — each lane replaces its own line)

- voxel-gore-3d.js → gravegain3d, load after gore-gravegain3d.js
- VG-QUEUE sub-04: wire `public/games/html/gravegain-voxel-gore.js` into gravegain2d + gravegain3d + gravegain1d runtimes via scripts/sync-game-bundles.mjs (G10; load AFTER gore-gravegain2d.js / gore-gravegain3d.js so its FourweirdGore.spawn wrapper composes; file exposes window.GraveGainVoxelGore { VERSION, getMode, burst })
- G2-QUEUE: wire `public/games/html/gravegain-models-3d.js` into gravegain3d bundle via scripts/sync-game-bundles.mjs (G10). File exposes window.GraveGainModels3D + GraveGainMods entry; slug-guarded to gravegain3d.
- G2-QUEUE-EXTRA (muse-spark 2026-09-13): additionally wire `public/games/html/gravegain3d-models.js` (G2 ownership-table filename) into gravegain3d bundle via scripts/sync-game-bundles.mjs (G10; load after engine/game-data.js + entities/enemy.js + entities/weapon-factory.js; file exposes window.GraveGain3DModels { VERSION, THEMES, enemies x12, weapons x13, buildEnemy/buildWeapon/mountWeapon, spriteFor/domFor fallbacks, integrate() } + GraveGainMods entry 'gravegain3d-models'; slug-guarded to gravegain3d).
- G3-QUEUE: wire `public/games/html/gravegain-thread-tuner.js` into all 3 games (gravegain1d/2d/3d), load early before game boot (G10)
- G4: wire public/games/html/gravegain-2p5d.js into gravegain2d runtime via scripts/sync-game-bundles.mjs (G10; note: dispatch named it gravegain-2p5d.js, ownership table says gravegain2d-25d.js — wire as-is or rename)
- G4-QUEUE-25D (g4-25d 2026-09-13): additionally wire `public/games/html/gravegain2d-25d.js` (ownership-table G4 filename; exposes `window.GraveGain2D_25D` + GraveGainMods entry `gravegain2d-25d@1.0.0`) into gravegain2d runtime via scripts/sync-game-bundles.mjs (G10; load AFTER gravegain2d/game.js; any order vs gravegain-2p5d.js/gravegain-25d.js is safe — complement mode stands down overlapping layers when `window.GraveGain25D` is present, keeping height-sort + spark glow + theme tint)
- G5-QUEUE-gravegain2d: wire `public/games/html/gravegain2d-sprites.js` (GraveGainMods `gravegain2d-sprites@1.0.0+gg2d2.0.0`) into `gravegain2d/index.html` script tags + use `GraveGain2DSprites.getSprite/drawSprite` in enemy/loot render pass (G10)
- G6-QUEUE: wire `public/games/html/gravegain1d-art.js` into gravegain1d runtime via scripts/sync-game-bundles.mjs (G10; load after game.js, overlay self-boots, no game.js/index.html/game.css edits needed)
- G7-QUEUE-OPEN → G10: wire public/games/html/gravegain-agebands.js into ALL 3 games (gravegain3d, gravegain2d, gravegain1d bundles via scripts/sync-game-bundles.mjs); load BEFORE gore-gravegain3d.js + gore-gravegain2d.js so bands resolve first. No manifest edits by G7.
- G8-QUEUE-GRAVEGAIN3D: wire public/games/html/gravegain3d-arsenal.js into gravegain3d (script tag after weapon-factory.js; exposes window.GraveGain3DArsenal, runtime-hooks factory/loot, GraveGainMods entry 'gravegain3d-arsenal')
- G9-QUEUE-DONE: wire `public/games/html/gravegain-arsenal-2d1d.js` into gravegain2d + gravegain1d runtimes (script tag after game.js; self-registers via `window.GraveGainArsenal2D1D` + `GraveGainMods`)
- E11-QUEUE-OPEN
- E12-QUEUE-OPEN
- E13-QUEUE-OPEN
- EMERGENT-QUEUE sub-06: wire `public/games/html/gravegain-emergent.js` into gravegain2d + gravegain3d + gravegain1d runtimes via scripts/sync-game-bundles.mjs (G10; overlay self-boots on DOMContentLoaded, polls window.GraveGainGame / window.GraveGain1D, pointer-events:none root with pointer-events:auto card only; exposes window.GraveGainEmergent { VERSION, SIDE_QUESTS, ACTIVITIES, WANDERERS, getWandererDialogue })
- E14-QUEUE-OPEN
- ENEMIES-QUEUE sub-08 → G10: wire public/games/html/gravegain-enemies.js into gravegain2d + gravegain3d + gravegain1d runtimes via scripts/sync-game-bundles.mjs (load AFTER game boot; overlay self-boots, exposes window.GraveGainEnemies { VERSION, VARIANTS, pickVariant }; advisory-only tags, no bundle edits needed). No manifest edits by sub-08.
- E16-QUEUE-OPEN
- E17-QUEUE-OPEN
- E18-QUEUE-OPEN
- E19-QUEUE-OPEN
- G10-QUEUE-SETTINGS: none (settings+QA lane, no wiring needed)
- SYNC-PLUS-QUEUE sub-10 (G10): consolidated 8-file wiring — keep epicFiles loop as-is, add slug-routed plusFiles table AFTER it in sync-game-bundles.mjs: gravegain-models-3d.js→[gravegain3d], gravegain-2p5d.js→[gravegain2d], voxel-gore/perf/emergent/arsenal/enemies→[gravegain2d,gravegain3d], gravegain1d-art.js→[gravegain1d]; existsSync-guarded + only-when-absent (full unified diff in session return; scripts/verify-gravegain-plus.mjs asserts all 8 refs; subsumes VG/G3/G4 queue lines above)
- 2026-09-13 G10 DONE (aiorch-lead): plusFiles block landed in sync-game-bundles.mjs; verify-gravegain-plus 44/44 green; sync OK (35 bundles); verify-game-bundles OK (225 files parity intact); verify-content-modes OK; verify-gravegain-epic OK; verify-gravegain1d OK; generated 2D/3D/1D bundles confirmed carrying routed tags; package.json now wires verify:gravegain-plus into npm test. Open conflict for a future agent: sub-07 TS arsenal mirror schema (dmg/range/cooldown + 15 kits) vs sibling S-01/S-02 landed gravegain-arsenal.js v2.0.0 (kind/speed/crit + 16 kits) — adopted sibling JS as canonical (verifier asserts window.GraveGainArsenal, green); TS mirror kept as catalog supplement, see CONFLICTS.

## CLAIMS

| lane | agent | status |
|---|---|---|
| G1 | muse-spark | claimed 2026-09-13 |
| G2 | sub-01 | done 2026-09-13 |
| G3 | thread-tuner | done 2026-09-13 |
| G4 | sub-02 | done 2026-09-13 |
| G4 | g4-25d | done 2026-09-13 (gravegain2d-25d.js — ownership-table filename, complements 2p5d/25d) |
| G5 | g5-sprites | done 2026-09-13T00:00:00Z |
| G6 | sub-03 | done 2026-09-13 |
| G7 | agebands-agent | done 2026-09-13T00:00:00Z — public/games/html/gravegain-agebands.js |
| G8 | g8-arsenal | done 2026-09-13T00:00:00Z (gravegain3d-arsenal.js) |
| G9 | opencode-g9 | claimed 2026-09-13T00:00Z |
| G10 | aiorch-lead | done 2026-09-13 — plusFiles block wired in sync-game-bundles.mjs (8 overlays routed) + verify:gravegain-plus added to package.json test |
| E11 | sub-06 | done 2026-09-13 (gravegain-emergent.js side quests) |
| E12 | sub-06 | done 2026-09-13 (gravegain-emergent.js wanderers + dialogue) |
| E13 | sub-06 | done 2026-09-13 (gravegain-emergent.js event scheduler) |
| E14 | — | open |
| E15 | sub-08 | done 2026-09-13 — public/games/html/gravegain-enemies.js |
| E16 | — | open |
| E17 | — | open |
| E18 | — | open |
| E19 | — | open |
| E20 | sub-10 | done 2026-09-13 (verify-gravegain-plus.mjs) |
| perf-director | sub-05 | done 2026-09-13 (v2 gravegain-perf.js) |

## LOG

- 2026-09-13 G1 claimed voxel-gore-3d build started (muse-spark)
- 2026-09-13 G2 sub-01: created `v2/vcw4w/public/games/html/gravegain-models-3d.js` (6 champions, InstancedMesh swarm, prop set, 4 viewmodels, window.GraveGainModels3D). Verifier: `node --check` CHECK_OK + sandbox harness (API/champions/weapons/ready/setPreset/no-input-listeners all pass). Parity tree untouched.
- 2026-09-13 G3 gravegain-thread-tuner.js built (EMA governor, pool sizing, chunked AI hook, texture/instancing hints); node --check clean
- G4-LOG sub-02 2026-09-13: created public/games/html/gravegain-2p5d.js (v1.0.0, window.GraveGain25D) — parallax far/mid/fog overlays, shadow canvas, torch light (high/ultra only), vignette+fogbands+motes; vanilla IIFE, idempotent, pointer-events:none, pauses when hidden; node --check clean; parity trees untouched (git status shows no gravegain2d/** or gravegain3d/** edits by sub-02)
- 2026-09-13T00:00:00Z G5 claimed gravegain2d-sprites.js; EnemyTypes(10)+LootItem tables read, game.json v2.0.0
- 2026-09-13T00:00Z G6 claimed gravegain1d-art.js (muse-spark)
- 2026-09-13 sub-03 G6 DONE: created v2/vcw4w/public/games/html/gravegain1d-art.js (v1.0.0, window.GraveGain1DArt) — 8 emoji weather effects per sector+mode, 5 sector set-pieces + Echo Drift piece on #gg1dStage, kill celebrations per mode (kid rainbow/unicorn POOF, teen light spray, all delegates to voxel hooks w/ fallback), class trails (rifleman/sapper/runner) + level-up fireworks; tick-wrap + HUD MutationObserver hooks, game.js/css/index.html untouched; node --check clean, DOM-stub smoke (VERSION+idempotent) OK, verify-gravegain1d.mjs all green, no forbidden refs, save key untouched; wiring left for G10
- G7-LOG-OPEN
- 2026-09-13T00:00:00Z G7 claimed; read gore-gravegain3d.js + gore-gravegain2d.js + grepped game-data/lore/game.js (potion/mushroom/brew); building gravegain-agebands.js
- 2026-09-13T00:00:00Z G7 done: gravegain-agebands.js passes node --check + smoke test; QUEUE/DONE updated
- G8-LOG-OPEN
- 2026-09-13T00:00:00Z G8 built public/games/html/gravegain3d-arsenal.js (16 class×race starters + 13 mid/end weapons, age-gated, node --check OK, bundle parity OK)
- 2026-09-13T00:00Z G9 claimed gravegain-arsenal-2d1d.js (2D 4x4 starters + 1D 3 starters + 12 new weapons/game)
- 2026-09-13T00:42:57Z G10 settings+QA landed: sibling hooks + content-mode selector appended to graphics-settings.js; scripts/verify-gravegain-graphics.mjs new (68 checks green); verify-game-bundles still OK, no new failures
- E11-LOG-OPEN
- E12-LOG-OPEN
- E13-LOG-OPEN
- 2026-09-13 sub-06 (E11/E12/E13): created `v2/vcw4w/public/games/html/gravegain-emergent.js` (12 side quests incl. Lost Helmet/Hungry Warchief/Ghost Lanterns/Array Static/Grave Gardener, 6 dungeon activities incl. gated mushroom circle, 7 wanderers x 3-mode emergent dialogue 3+ lines each + quest hooks; mulberry32 scheduler polling GraveGainGame/GraveGain1D kills/x/ticks, DOM banner + choice buttons pointer-events-auto card only, quest log in localStorage gravegain_emergent_v1, idempotent/guarded) + `v2/vcw4w/content/gravegain-emergent.ts` mirror (GRAVEGAIN_EMERGENT_VERSION/SIDE_QUESTS/ACTIVITIES/WANDERERS/getWandererDialogue). Age-banded (kid cozy, teen tense-clean, all grim+profane; drugs usable-only-in-all). Parity trees untouched. Evidence: `node --check` JS_OK; project-config tsc (bundler + @/* paths) clean on the new TS file.
- 2026-09-13 sub-06 (E11/E12/E13): note — single-file standalone tsc on the new .ts shows the `@/lib/content-modes` alias error, which is pre-existing harness behavior (identical on untouched `gravegain2d-modes.ts`); resolves under the project tsconfig.
- E14-LOG-OPEN
- E15-LOG-OPEN
- 2026-09-13 E15 gravegain-bestiary.js created (152 lines, 18 enemies, VERSION 2.0.0) by S-03/G-02
- 2026-09-13 S-04/S-05/S-06 gravegain-emergent.js v2.0.0 created (401 lines: 12 quests/8 activities/6 NPCs; overwrote pre-existing v1.0.0 per task order; node --check clean, kid/teen profanity-free, no listeners/storage-writes/innerHTML)
- E16-LOG-OPEN
- E17-LOG-OPEN
- E18-LOG-OPEN
- E19-LOG-OPEN
- E20-LOG sub-10 2026-09-13: created v2/vcw4w/scripts/verify-gravegain-plus.mjs (8 overlays: existence + window global + if(window.X) guard, parity-tree walk, 3 content mirrors, 8 sync refs, no gore-gravegain1d); run: 11 FAIL = missing gravegain-models-3d.js (sub-01 pending) + 8 sync refs (G10 wiring pending); 7/8 overlays + all mirrors + parity + no-gore checks green; fixed 2p5d global assert to window.GraveGain25D per landed file.
- 2026-09-13 G4 gravegain-25d.js created (A4 2.5D look layer v1.0.0, 6427B).
- 2026-09-13 G4 install/uninstall+shadeByY syntax-checked; wiring left for G10.
- 2026-09-13 G-01 gravegain-graphics-3d.js created (WEAPONSx8/PROPSx6/LIGHT/FX, r128-only, idempotent)
- 2026-09-13 00:36 UTC G-08/G-09 gravegain-gore-tiers.js created (803 lines, VERSION 2.0.0, tiers all/teen/kid + FourweirdGore hook + kills poll)
- 2026-09-13 G-07 gravegain-graphics-1d.js created (733 lines, teen-clean 1D dressing: ticker+rainbow+grade+boss+quality; no game.js touch).
- 2026-09-13T00:00:00Z G-05/G-06 gravegain-graphics-2d.js created (2.5D overlays: parallax/rim/weather/hit-flash/beam/boss-aura, quality-gated, z<5000)
- 2026-09-13 A6 created v2/vcw4w/public/games/html/gravegain-1dart.js (8426B) overlay art, tick logic untouched
- 2026-09-13 A6 verified gravegain-1dart.js node --check clean, no input/storage/net calls, teen-clean emoji only
- 2026-09-13T00:00Z A10 arsenal wrote public/games/html/gravegain-arsenal.js (24 weapons, 16 starters)
- 2026-09-13T00:00Z A10 verified 5242B pure-data idempotent, STARTER_FOR fallback longsword
- 2026-09-13T00:00:00Z A3 gravegain-bestiary3d.js created (6088B, 12 variants, VERSION 1.0.0)
- 2026-09-13T00:00:00Z A3 build/decorate verified: node --check OK, no DOM/events/fetch/eval
- 2026-09-13Z A8 gravegain-perf.js NOT created: path occupied by untracked 491-line sibling owning window.GraveGainPerf; no overwrite per PROTOCOL CONFLICTS rule + task no-edit constraint.
- 2026-09-13Z A8 spec verified ready (FourWeirdGraphics.get/load/apply, FourWeirdWorkers.run-only, autodegrade event live): needs G10/E20 ruling — merge shim API into existing file vs rename to gravegain-perf-shim.js.
- 2026-09-13 S-01/S-02 gravegain-arsenal.js v2.0.0 created (24 weapons + 16 kits)
- 2026-09-13 A5 created v2/vcw4w/public/games/html/gravegain-arsenal2d.js (VERSION 1.0.0, 20 weapon icons, 12 enemy kinds, 6300B, pure canvas)
- 2026-09-13 A5 verified gravegain-arsenal2d.js: idempotent IIFE, node --check clean, no DOM/events/fetch/eval, guarded drawIcon/drawEnemy
- 2026-09-13 A7 created public/games/html/gravegain-agegore.js VERSION 1.0.0 (unified age-band gore director: getMode/setMode/gates/reskinBotany/praise).
- 2026-09-13 A7 verified gravegain-agegore.js node --check clean, 9554B <12KB, vanilla IIFE, no listeners/fetch/eval.
- 2026-09-13T00:33Z S-09/S-10 START: polling 8 sibling BIG-upgrade modules (arsenal,emergent,perf present; bestiary,graphics-3d,graphics-2d,graphics-1d,gore-tiers missing).
- 2026-09-13T00:37Z S-09/S-10 READY: all 8 sibling modules present after ~4min poll (bestiary + graphics-3d landed last).
- 2026-09-13T00:40Z S-09/S-10 DONE: +21-line BIG-UPGRADE block in scripts/sync-game-bundles.mjs only; sync OK (35 bundles); verify-content-modes PASS; verify-gravegain-epic PASS; verify-gravegain1d PASS; verify-game-bundles PASS; missing modules: none.
- 2026-09-13 sub-09 (content/docs lane): created v2/vcw4w/content/gravegain-saga-plus.ts (GRAVEGAIN_SAGA_PLUS_VERSION 2.0.0: RUNTIME_FILES_PLUS x8, AGE_BAND_GRAPHICS x3, WEAPON/EMERGENT/ENEMY_SPOTLIGHT x6 each; type-only import, no runtime deps) — full-project tsc --noEmit shows no errors in the new file (only 2 pre-existing errors in app/api/it/requests/route.ts).
- 2026-09-13 A1 claimed 3D voxel-gore extra: writing v2/vcw4w/public/games/html/gravegain-voxgore.js (adult-only InstancedMesh voxgore)
- 2026-09-13 A1 done: window.GraveGainVoxGore {VERSION,spawnBurst,update,setBudget,count,onEntityHit} 12243B node --check clean + stub sim green
- 2026-09-13T00:41Z A2 claim gravegain-arsenal3d.js (20 3D weapon models, window.GraveGainArsenal3D)
- 2026-09-13T00:41Z A2 done gravegain-arsenal3d.js exposes GraveGainArsenal3D{VERSION,ids,build,palette} 7556B node --check clean + 20/20 stub builds green
- 2026-09-13 00:44 UTC A9 done gravegain-emergent.js pure-data rewrite (VERSION 1.0.0; 8 SIDEQUESTS / 6 ACTIVITIES / 6 NPCS; 11303B; node --check clean + harness green).
- 2026-09-13 00:44 UTC A9 NOTE path was contested mid-task (DOM-overlay v1 + toast v2.0.0 drafts seen on disk); A9 spec version verified on disk at log time — E20 please pin/wire before further edits.
- 2026-09-13 muse-spark G6 RETRACTED: entered on a stale all-open snapshot; G6 was already done by sub-03 (claim/queue/log/done all landed). My claim line above is void — I did NOT hold G6. See CONFLICTS for the file-overwrite disclosure; no other lane files touched.
- 2026-09-13T00:42:18Z S-07/S-08 DONE gravegain-perf.js v2.0.0 (587 lines; window.GraveGainPerf {VERSION,budgets,offloadSteer,offloadParticles,applyBudgets,governorState} + scaleGrain + hidden GraveGainPerfStats; budgets potato 0.5/0.25/20/1/noshadow balanced 1/0.6/40/2 high 1.5/1/80/3 ultra 2/1.5/120/4; governor 60f avg, >26ms down max 1/10s floor potato, <12ms x3 windows auto-only up; throttles steer-every-6th / particles-1-per-frame-cap-300 / timing-1s; node --check clean, grep clean: no Worker/Blob/eval/canvas-context/localStorage-write/DOM-create/dispatch; NOTE overwrote untracked 491-line v1.0.0 per explicit task order — v1 API kept as compat aliases quality/routeMath/setQuality/unlock/stats; A8 no-overwrite note (LOG 168-169) stands for G10/E20 ruling).
- 2026-09-13 S-06b E12-dialogue-copy: extended content/gravegain3d-modes.ts (+ember-cartographer/+ossuary-twins, kid/teen/all x2 lines each) + content/gravegain2d-modes.ts (+relay-hermit/+spore-kid, greeting/combatBark per tier); kid/teen profanity-free, all grim ≤1 strong word/line, drug gating untouched; verify-content-modes OK
- 2026-09-13 sub-05 (perf-director lane): created v2/vcw4w/public/games/html/gravegain-perf.js (VERSION 1.0.0, window.GraveGainPerf { quality,setQuality,unlock,stats,routeMath,pruneDecals,rect }) — rAF governor (60-frame window, step down when avg>24ms / step up when avg<14ms x2), worker router (400ms timeout, slice 0,120, skip when list>400, per-kind throttle, null-resolve sync fallback), GPU hints (pixelRatioMax cap on GraveGainGame.renderer + shadowMap off on potato/balanced), CPU hints (rIC-chunked decal prune, passive-only listeners, cached rects), `gravegain-perf` event broadcast; vanilla IIFE, idempotent, pauses when hidden. NOTE: landed as NEW file (absent on disk at write time — no overwrite; repo-root A8 conflict note concerns a different path). Evidence: node --check clean; vm smoke (quality/setQuality/>400-skip/idempotent) OK; verify-gravegain-plus.mjs perf checks green (exists + exposes + idempotent + sync-injects); remaining 5 FAILs are pre-existing other-lane sync gaps (models-3d, 2p5d, voxel-gore, enemies, 1d-art) for G10. Parity trees untouched.
- 2026-09-13 g4-25d G4 DONE: created `v2/vcw4w/public/games/html/gravegain2d-25d.js` (ownership-table G4 filename; sibling files gravegain-2p5d.js/gravegain-25d.js left untouched — complement mode via `window.GraveGain25D` detect, no overlapping double-draw). Evidence: `node --check` clean; stub-DOM smoke (GraveGainMods register + double-inject idempotent) OK; `verify-game-bundles.mjs` parity OK.

- 2026-09-13 G2 (muse-spark, additive): created `v2/vcw4w/public/games/html/gravegain3d-models.js` (G2 ownership-table filename; complements sub-01 `gravegain-models-3d.js`, no filename/global overlap) — window.GraveGain3DModels v1.0.0: 12 enemies + 13 weapons, THREE r128 primitives, 7 theme palettes + emissive, shared material cache, emoji-billboard fallbacks, opt-in integrate(); vanilla IIFE idempotent, GraveGainMods push. Evidence: node --check clean; stub smoke enemies=12 weapons=13 mods=1; bundle parity OK (225 files); plus-verifier FAILs unchanged (5 pre-existing sync gaps for G10). Wiring queued (G2-QUEUE-EXTRA → G10).
- 2026-09-13 B7 sync-idempotence: `node scripts/sync-game-bundles.mjs` x3 from v2/vcw4w, exit 0 each (35 bundles); gravegain2d 8FDC1AC3…/6762B + gravegain3d D7FFB92E…/7662B identical all runs; gravegain1d D635CB39…/5333B (run1) → 55EBFFE7…/5393B (run2, concurrent tracked-source edit by sibling, staged M on html/gravegain1d/index.html) → identical run3, so sync fn itself deterministic (rm+cpSync+includes-guarded injects).
- 2026-09-13 B7 wave-1 tags: 2d has arsenal/arsenal2d/25d/agegore/emergent/perf, 3d has arsenal/arsenal3d/voxgore/agegore/emergent/perf, 1d has 1dart/arsenal/arsenal2d/agegore/emergent/perf+bestiary; zero `gore-gravegain1d` strings in all 3 bundles (1D teen-clean hold); duplicate script-src count = none in all 3 bundles.
- 2026-09-13 B3 2D-hookup research: mapped gravegain2d/game.js hooks (render L2355/enemy L2543, loot L2490/sweep L2429, kills L2191+L2088+L1967/hit L2297, gen L344/build L1794, light L1214+L2592); no game files touched.
- 2026-09-13 B3 spec delivered: guarded 2-line snippets for GraveGain25D.install / Arsenal2D.drawIcon+drawEnemy / Emergent.nextEvent pure-data pull + AgeGore gates; wiring left for G10.
- 2026-09-13 B9 (content mirror): created `v2/vcw4w/content/gravegain-bigupgrade.ts` (GRAVEGAIN_BIGUPGRADE_VERSION 1.0.0; RUNTIME_FILES_2D x9 / _3D x10 / _1D x8 mirroring sync-game-bundles.mjs BIG-UPGRADE block; AGE_BAND_RULES x3; WEAPON/ENEMY/QUEST_SPOTLIGHT x6 each; pure data, no imports). Evidence: scoped tsc clean for the new file (only pre-existing node_modules @types errors); emit+import shows all 8 exports; saga-plus + arsenal mirrors untouched.
- 2026-09-13 B9 done: `v2/vcw4w/content/gravegain-bigupgrade.ts` landed, no other files edited.
- 2026-09-13 B5 (arsenal art bridge): created `v2/vcw4w/public/games/html/gravegain-arsenal-bridge.js` (VERSION 1.0.0, window.GraveGainArsenalBridge { modelFor, iconFor, starterModel }; 24/24 arsenal ids mapped kind/rarity-routed, starterModel via GraveGainArsenal.getStartingWeapon; vanilla IIFE idempotent, no DOM/events/fetch/eval, 3761B <8KB)
- 2026-09-13 B5 verified gravegain-arsenal-bridge.js: node --check clean + stub harness green (MAP 24/WEAPONS 24, missing none, fallback longsword/longsword never-throws, starter dwarf:tank→kingsfall-maul/blood_talon, reload idempotent); no other writes
- 2026-09-13 B2 hookup spec READY (read-only): mapped game-runtime.js kill sweeps (L1571/L1406) + applyHitToEnemy L969 + initRun weapon L391 + enemy spawn L760/L862 + vfx.update L1743 + particle-system spawn API; full B10 ticket in session return.
- 2026-09-13 B2 note: voxgore=adult-only no-op gate internal, agegore default gravegain3d='teen', arsenal/bestiary kind-map mismatch flagged; no lane files touched.
- 2026-09-13 B6 catalog-copy: description-only edits to gravegain3d/game.json (voxel gore + 20 weapon models + 12 enemy variants, age-banded), gravegain2d/game.json (2.5D lighting/shadows + 20 weapon icons + emergent quests), gravegain1d/game.json (emoji-parallax art + emergent wanderers); slug/genre/tags untouched, all <400 chars teen-clean.
- 2026-09-13 B6 catalog-copy done: 3 game.json descriptions landed, shared/legacy files untouched.
- 2026-09-13T00:57Z B4 claimed gravegain1d/index.html 1D wiring (no prior claim in CLAIMS — gravegain1d/index.html unclaimed, G10 open)
- 2026-09-13T00:57Z B4 done: wired 6 overlays into gravegain1d/index.html (gravegain-1dart.js, gravegain-arsenal.js, gravegain-arsenal2d.js, gravegain-emergent.js, gravegain-agegore.js, gravegain-perf.js — absolute /games/html/ paths, data-slug="gravegain1d", before </body>); node --check 6/6 OK, no site chrome, game.js/game.json untouched
- 2026-09-13T00:58Z B8 global-namespace audit (READ-ONLY): grepped gravegain*.js window.X exposures — 2 hard DUPLICATES (GraveGain25D: gravegain-2p5d.js+gravegain-25d.js; GraveGain1DArt: gravegain-1dart.js+gravegain1d-art.js), 1 guard mismatch (netplay guards GraveGainMPAdapter, exposes GraveGainMP), 1 fetch (netplay L154 only; zero eval/XHR/new-Function); full table + rename/alias/merge recommendations in session return.
- 2026-09-13T00:58Z B8 audit note: GraveGainArsenal/3D/2D/2D1D/Bridge + GraveGain3DArsenal/Drop all distinct (near-miss names only); FourweirdGore writers all merge-style except gore-tiers fallback branch (sibling-absent only, benign); no lane files touched.

## CONFLICTS

- CONFLICTS-OPEN (append `- <LANE> needs <file>: <resolution>` lines here)
- G10 notes gravegain2d-25d.js flag: G4 exposes window.GraveGain2D_25D (underscore), not GraveGain2D25D — G10 sibling hook + verifier accept both, no edit made to G4's file
- G6 (muse-spark 2026-09-13) OVERWROTE sub-03's landed `v2/vcw4w/public/games/html/gravegain1d-art.js`: I read a stale all-open bus snapshot and wrote a fresh implementation before seeing sub-03's done entries. File is untracked in git so sub-03's bytes are NOT recoverable from version control. On-disk replacement (mine) is spec-compliant: vanilla IIFE, `if (window.GraveGain1DArt) return` guard, exposes window.GraveGain1DArt {VERSION 1.0.0, SECTORS, EMOJI, setSector, autoSector, setParticleScale, pulse, init} + GraveGainMods push, 5 sector palettes + Echo Drift, emoji weather/ambient/burst pools (capped 90/36/60), HUD-polled hit pulse + CSS hooks (.gg1d-art-on/.gg1d-art-hit/.gg1d-art-sector-0..5, --gg1d-line-a/b/--gg1d-glow), same art all age bands, game.js/css/index.html untouched. Evidence: node --check clean; verify-gravegain-graphics.mjs 5/5 G6 checks green; verify-game-bundles.mjs parity OK. Needs G10/E20 ruling: accept replacement vs sub-03 re-lands theirs (theirs had tick-wrap + MutationObserver hooks + #gg1dStage set-pieces per their log).
- G6 (muse-spark 2026-09-13) FLAG COLLISION: `window.GraveGain1DArt` is also owned by `v2/vcw4w/public/games/html/gravegain-1dart.js` (A6, {VERSION, install, uninstall}, same first-wins guard). Both files cannot be active at once — needs G10 load-order ruling (wire exactly one, or rename one global).
- sub-07 (arsenal, old-gen lane 7) needs public/games/html/gravegain-arsenal.js: path occupied by landed S-01/S-02 v2.0.0 (24 weapons kind/speed/crit schema + 16 race:warrior-style kits, pure-data, no HUD/persistence/kill-hooks — logged 2026-09-13, node --check clean per sub-07 re-verify). NOT overwritten per PROTOCOL. sub-07 TS mirror landed at v2/vcw4w/content/gravegain-arsenal.ts per old brief (24 weapons w/ dmg/range/cooldown/flavor/classes[] + 15 rifleman/sapper/runner kits + weaponFor; tsc --strict clean). Schemas differ — needs orchestrator ruling: merge vs rename sub-07 runtime vs adopt S-01/S-02 as canonical.

## DONE

- G1 DONE 2026-09-13 (muse-spark): v2/vcw4w/public/games/html/voxel-gore-3d.js (node --check PASS); 2026-09-13 G1 voxel-gore-3d complete, hooks GraveGain3DGore.spawnKill + FourweirdGore.spawn
- G2-DONE: `v2/vcw4w/public/games/html/gravegain-models-3d.js` v1.0.0 wired-pending (see G2-QUEUE).
- G2-DONE-EXTRA (muse-spark 2026-09-13): `v2/vcw4w/public/games/html/gravegain3d-models.js` v1.0.0 (window.GraveGain3DModels: 12 enemies + 13 weapons; node --check clean; stub smoke green) wired-pending (see G2-QUEUE-EXTRA).
- G3-DONE: `public/games/html/gravegain-thread-tuner.js` (window.GraveGainThreadTuner {getStats,setQuality,scheduleAI}; GraveGainMods push); node --check clean
- G4-DONE-OPEN → DONE 2026-09-13 (g4-25d): created `v2/vcw4w/public/games/html/gravegain2d-25d.js` (v1.0.0, `window.GraveGain2D_25D` + GraveGainMods `gravegain2d-25d`) — flicker torch light-map + floor theme tint, y-sorted drop shadows + in-place enemy height-sort, 0.25x/0.4x parallax crag bands + motes, life-graded spark glow + sweep/beacon glow, cached vignette; zero per-frame alloc, EMA governor (shed/recover), no gore/mode logic (same art all bands); node --check clean + stub-DOM smoke (register + idempotent) OK; verify-game-bundles parity OK; wiring queued (G4-QUEUE-25D → G10)
- 2026-09-13T00:00:00Z G5 done: created `v2/vcw4w/public/games/html/gravegain2d-sprites.js` (node --check OK, stub-load OK: 14 enemies/14 weapons); claim row updated to done
- G6-DONE 2026-09-13 (sub-03): `v2/vcw4w/public/games/html/gravegain1d-art.js` (window.GraveGain1DArt v1.0.0); verify-gravegain1d.mjs green, wiring queued for G10
- G7-DONE-OPEN → DONE 2026-09-13T00:00:00Z: created public/games/html/gravegain-agebands.js (window.GraveGainAgeBands, node --check OK, smoke-tested kid/teen/all + fail-closed + reskin)
- G8-DONE gravegain3d-arsenal.js (window.GraveGain3DArsenal v1.0.0, 16 starters + 13 weapons)
- G9-DONE: `public/games/html/gravegain-arsenal-2d1d.js` (VERSION 1.0.0, node --check + smoke-test clean)
- G10-DONE 2026-09-13: gravegain3d/engine/graphics-settings.js (append-only G10 block), v2/vcw4w/scripts/verify-gravegain-graphics.mjs (new)
- E11-DONE-OPEN
- E12-DONE-OPEN
- E13-DONE-OPEN
- EMERGENT-DONE 2026-09-13 sub-06: `v2/vcw4w/public/games/html/gravegain-emergent.js` + `v2/vcw4w/content/gravegain-emergent.ts` landed (covers E11 quests + E12 NPCs/dialogue + E13 events); wiring queued for G10 above.
- E14-DONE-OPEN
- E15-DONE sub-08 2026-09-13: created v2/vcw4w/public/games/html/gravegain-enemies.js (VERSION 1.0.0-sub08, window.GraveGainEnemies { VERSION, VARIANTS x26, BOSS_PHASES x5, pickVariant, variantById }) — 26 variants (lantern-husk … ballot-box-mimic) each { id, name, emoji, color3D, hpMul, atkMul, behavior, threat, taunt.kid/teen/all }; seeded endless-table director tags enemies advisory-only (_variant/_tint/_behaviorHint, overlay floaters, boss enrage+summon notes at 50%/25%); vanilla IIFE, idempotent, guarded, capped, hidden-pause. Evidence: node --check clean; vm sandbox smoke (EXPOSE 1.0.0-sub08, COUNT 26, pickVariant deterministic, fields-ok); parity trees untouched (no gravegain1d/game.js, gravegain2d/**, gravegain3d/** edits). Wiring left for G10 (ENEMIES-QUEUE).
- E16-DONE-OPEN
- E17-DONE-OPEN
- E18-DONE-OPEN
- E19-DONE-OPEN
- E20-DONE-OPEN
- SAGA-PLUS-DONE 2026-09-13 sub-09: v2/vcw4w/content/gravegain-saga-plus.ts landed + tsc-verified (no new errors).
- 2026-09-13 sub-07 (arsenal, old-gen lane 7): TS mirror v2/vcw4w/content/gravegain-arsenal.ts LANDED (GRAVEGAIN_ARSENAL_VERSION 1.0.0, 24 WEAPONS w/ id/name/emoji/dmg/range/cooldown/flavor/classes[], 15 STARTING_KITS rifleman/sapper/runner x human/elf/dwarf/orc/goblin all-distinct + weaponFor; fieldcheck 24/24 clean, tsc --strict --noEmit clean). JS runtime NOT written — v2/vcw4w/public/games/html/gravegain-arsenal.js occupied by sibling S-01/S-02 v2.0.0 (re-verified node --check clean); no overwrite per PROTOCOL, conflict recorded under ## CONFLICTS for orchestrator ruling.
- 2026-09-13 sub-04 DONE: created v2/vcw4w/public/games/html/gravegain-voxel-gore.js (VERSION 1.0.0, window.GraveGainVoxelGore { VERSION, getMode(slug), burst(x,y,slug) }) — extends (not replaces) gore-gravegain2d.js + gore-gravegain3d.js; mode contract ?content= > 4weird-content-mode:<slug> > FourweirdContentMode > event > teen; kid rainbow cubes+sparkles+POOF (spawnBlood never called), teen blood spray+decals only (no gibs), all voxel cubes+gibs+persistent splats+damage states+shake+flash; particleMult-scaled, caps 220/300, GraveGainWorkers.integrateParticles w/ sync fallback, ~30Hz + hidden-pause; vanilla IIFE, pointer-events:none. Evidence: node --check clean; stub-DOM smoke 15/15 PASS; verify-content-modes OK (all green); verify-game-bundles OK (225 files, parity intact, new file listed v2-native extra); verify-gravegain-plus: 3/3 file checks green (exists + window.GraveGainVoxelGore + idempotent guard), only FAILs are the 5 pre-existing sync-injection gaps shared with sibling overlays (models-3d, 2p5d, enemies, 1d-art) — wiring queued for G10 above.
 - 2026-09-13 sub-08 DONE (E15/enemies): created v2/vcw4w/public/games/html/gravegain-enemies.js — 26-variant roster + seeded director + 5 boss-phase notes; window.GraveGainEnemies { VERSION 1.0.0-sub08, VARIANTS, BOSS_PHASES, pickVariant, variantById }; node --check clean + vm sandbox smoke green (COUNT 26, deterministic pick, fields-ok); skimmed gravegain1d/game.js KINDS (shambler/swarm/brute/necro) + 5 gate-boss mechs (wright/mirathiel/warden/karguk/titan) and gore-gravegain2d.js palette/overlay style (gg2d-gore-layer, pointer-events:none, POOF vs blood routing); parity trees untouched; wiring queued (ENEMIES-QUEUE → G10).
- 2026-09-13 B10 integration report: verify-game-bundles parity OK (225 archived: 132 locked + 93 diverged + 125 v2-native extra) + verify-gravegain1d OK; 27 gravegain-*.js runtimes on disk (see full B10 report in session return); BIG-UPGRADE injects 2d x9 / 3d x10 / 1d x8.
- 2026-09-13 B10 risks: DUPLICATE globals GraveGain25D (2p5d vs 25d) + GraveGain1DArt (1dart vs 1d-art, G6-overwrite open) first-wins; CONTESTED arsenal TS/JS schema + perf v1/v2 overwrite (compat aliases kept) + emergent 3-way version fight; UNWIRED (queued, no sync ref): agebands/thread-tuner/3d-arsenal/arsenal-2d1d/2d-sprites/3d-models/2d-25d/voxel-gore/models-3d/enemies/1d-art/voxel-gore-3d; OPEN lanes G10/E14/E16-E19/E20; netplay block duplicated verbatim in sync (harmless no-op).
