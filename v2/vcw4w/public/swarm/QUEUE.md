# DevSwarm Queue — live bus (v2/vcw4w)

History stays in `aiorch-01.md` at repo root (QUEUE:78-109, CLAIMS:111-141, LOG:143-292, CONFLICTS:240-249, DONE:251-292). Do not copy it here — this file carries ONLY genuinely-open items. World-readable: no secrets/keys/tokens/emails.

## OPEN (wiring/integration requests — owner lane → target integrator lane)

- G9 follow-up: `gravegain-arsenal-2d1d.js` lane still `claimed`, confirm done + close claim — owner G9 → integrator E20 (aiorch-01.md:124, DONE:262, E20-DONE:276).
- E11-extra follow-up: `gravegain-sidequests.js` lane still `claimed`, confirm done + close claim — owner E11-extra → integrator E20 (aiorch-01.md:127, DONE:264).
- E12-extra follow-up: `gravegain-characters.js` lane still `claimed`, confirm done + close claim — owner E12-extra → integrator E20 (aiorch-01.md:140, DONE:266).
- E13-extra follow-up: `gravegain-events.js` lane still `claimed`, confirm done + close claim — owner E13-extra → integrator E20 (aiorch-01.md:141, DONE:267).
- Missing `GraveGainMods.push` gaps (E20 did NOT edit content files): add push to `gravegain-2p5d.js` (G4), `gravegain-voxel-gore.js` (VG), `gravegain-emergent.js` (E11-13), `gravegain-enemies.js` (E15), `gravegain-1dart.js` (A6) — owners G4/VG/E11-13/E15/A6 → integrator file owners (aiorch-01.md:237).
- G5 render-pass hookup: use `GraveGain2DSprites.getSprite/drawSprite` in gravegain2d enemy/loot render pass — owner G5 → integrator G10 (aiorch-01.md:87, 237).
- G3 pre-boot note: `gravegain-thread-tuner.js` loads with bundle via sync, not pre-boot (append-pattern limit) — owner G3 → integrator G10 (aiorch-01.md:84, 237).

## CLAIMS (task id | owner | status)

| task | owner | status |
|---|---|---|
| G9 | opencode-g9 | claimed 2026-09-13T00:00Z (aiorch-01.md:124) |
| E11-extra | e11-sidequests | claimed 2026-09-13 (aiorch-01.md:127) |
| E12-extra | e12-npcs | claimed 2026-09-13 (aiorch-01.md:140) |
| E13-extra | muse-spark | claimed 2026-09-13 (aiorch-01.md:141) |

## CONFLICTS (need + ruling + status)

- None open. All prior rulings (G2 models, G4 look layers, G6 1D-art MERGE, arsenal/emergent/perf canonicals) are binding in aiorch-01.md:240-249, 283-285 — read before wiring.
- Parity shell wiring: hub.html should load parity/config.js, auth_store.js, api_client.js, shell.js, games_browser.js + add parity nav mount + #parity-outlet fallback outlet; new files landed by DS-DESKTOP-PARITY-01 (vcw) � owner muse-spark ? integrator vcw lane.
