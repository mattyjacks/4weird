# GRAVEGAIN4D THEME-AUDIT — GraveGain parity + cross-file integrity

> READ-ONLY audit. Nothing was fixed. All findings below are for the integrator.
> Audit date (UTC): 2026-09-13. Repo: `C:\GitHub5\4weird`.
> Scope: `v2/vcw4w/public/games/html/gravegain4d/` vs GraveGain3D
> (`v2/vcw4w/public/games/html/gravegain3d/`, pillars in `engine/game-data.js`:
> `ClassType`, `RaceData`, `QuartersUpgrades`, `BotanySeeds`, `ArmoryUpgrades`).
>
> ⚠️ MID-AUDIT DRIFT: `index.html` and `game.json` changed under this audit
> (a concurrent edit appended `<script src="mmorpg-4d.js">` as `index.html:58`
> and `"mmorpg-4d.js"` to `game.json` assets.local). Findings below describe
> the state at audit end (60 JS files). Re-verify before integrating.

## VERDICT: FAIL — not shippable as a GraveGain entry

- Syntax: **60/60 `node --check` PASS**. No syntax break anywhere.
- Fullscreen contract: **PASS** — zero real `dblclick` listeners, `KeyF`
  explicitly unbound (`input/input4d.js:53,66,156`), fullscreen only via the
  ⛶ overlay button (`index.html:391-406`); no user-facing "double-click" text.
- Everything else fails at the wiring level: **22 of 60 JS modules exist on
  disk but are never loaded** by `index.html`; **zero JS anywhere references
  any screen id or menu-button id** (`mainMenuScreen`, `charSelectScreen`,
  `hubScreen`, `raceGrid`, `classGrid`, `armoryGrid`, `loreList`,
  `btnEnterHub`, `btnStoryMode`, `btnUpgradeQuarters`, `btnBuyUusd`,
  `dailyChallengesList`, `perkCardsGrid` appear ONLY in `index.html`);
  `game.json` assets.local still names **12 files that do not exist**.
- Theme parity: **0 of 11 GraveGain systems live at runtime.** All eleven
  exist on disk (see table) but are orphan or dead at runtime.

**Gap count: 11 theme gaps + 7 integrity breaks = 18 items** (fix list §5).

## 1. Syntax — `node --check` per file (60/60 PASS)

Ran twice via bash (`Get-ChildItem -Recurse -Filter *.js` + `node --check`;
final run: `pass=60 fail=0`). Per-file results — all PASS:

engine/: `vec4.js`, `mat4.js`, `projector.js`, `hyperdungeon.js`, `putt.js`,
`timefold.js`, `branes.js`, `main4d.js`, `savebridge.js`, `modes4d.js` —
graphics/: `textures4d.js`, `wghosts.js`, `slicerenderer.js` —
entities/: `enemies4d.js`, `bosses4d.js`, `ballistics.js` —
world/: `dreamgen.js`, `riftzones.js`, `portal4d.js` —
campaign/: `00-boot4d.js`, `m01.js`…`m10.js`, `director4d.js`, `ui4d.js`,
`codex4d.js` — ui/: `hud4d.js`, `touch4d.js`, `hub4d.js`, `contract4d.js`,
`modes4d.js`, `radar4d.js` — audio/: `sound4d.js` — input/: `input4d.js` —
rpg/: `races4d.js`, `classes4d.js`, `economy4d.js`, `progression4d.js`,
`upgrades4d.js`, `crops4d.js`, `quarters4d.js`, `stone4d.js` —
combat/: `abilities4d.js`, `block4d.js`, `keymap4d.js`, `melee4d.js` —
lore/: `npcs4d.js`, `codex-extra4d.js`, `dreams4d.js`, `hades4d.js` —
root `lore.js`, `mmorpg-4d.js`, `net/mmorpg-bridge-4d.js`.

(Early in the audit the tree held 39 files; concurrent work grew it to 60.
The 60/60 figure is the final full-tree run.)

## 2. Phantom cross-references

### 2a. `window.GG4D_*` referenced but never defined — 7 names, all benign-guarded but dead

`engine/main4d.js:7-11` documents and `:22-26` reads
`GG4D_Engine`, `GraveGain4DGraphics`/`GG4D_Graphics`, `GG4D_Entities`,
`GraveGain4DWorlds`/`GG4D_World`, `GraveGain4DMissions` — **none of these is
assigned anywhere in the tree** (verified: no `window.<name> =` for any of
them). All reads are `w.X || null`, so no throw — but the HUD mission
tracker (`GraveGain4DMissions`) and any graphics/world/entity registries can
never resolve. The real campaign registry is `GG4D_Campaign`
(`campaign/00-boot4d.js:50`) / `GG4D_CampaignMissions` (`:51`).

### 2b. `GraveGain*` globals referenced but never defined

| Reference | Real definition | Severity |
|---|---|---|
| `index.html:409-410` `window.GraveGainGame` in `gg4dRefit` | Never defined in GG4D; game object is `window.GG4D_Game` (`engine/main4d.js:272`). GG3D's global is `GraveGainGame`. | **FAIL (functional)** — resize/fullscreen refit silently no-ops: `g.camera3d`/`g.renderer` never found. |
| `mmorpg-4d.js:269` `window.GraveGain4DMissions` | Never defined; real names are `GG4D_Campaign` / `GG4D_CampaignMissions`. | FAIL (minor, `\|\| null` guarded) — raid mission order always null. |
| `net/mmorpg-bridge-4d.js:148` `GraveGain4DNet`, `:166-167` `GraveGain4DDream` | Never defined; real dream API is `GG4D_Dream` (`world/dreamgen.js:317`). `net/net4d.js` **does not exist** (`net/` holds only the bridge). | FAIL (minor, fail-open guarded) — bridge sits dormant; also wrong path in its own header comment (`:7` cites `public/games/gravegain4d/net/net4d.js`, missing the `html/` segment). |
| `input/input4d.js:84-85` `window.GraveGainBotInput` | External bot harness, `&&`-guarded optional. | PASS (benign). |
| `engine/savebridge.js:114,291` `GraveGainGame` fallback | Guarded fallback chain that includes `GraveGain4D`. | PASS (benign). |

### 2c. `<script src>` in index.html with no file on disk — PASS

All 37 local + 4 shared `src`s resolve (`Test-Path`: `rpg/`, `net/net4d.js`
absent noted separately; `components.js`, `lore.js`,
`/games/html/fourweird-graphics.js`, `../game-meta.js` all TRUE).
Conversely, **22 existing modules are never loaded** — see §4.

### 2d. `dblclick` listeners / F-key fullscreen / 'double-click' user text — PASS × 3

- `addEventListener('dblclick')`: **zero hits** tree-wide. All 13 `dblclick`
  hits are comments asserting absence (e.g. `world/riftzones.js:14`,
  `entities/enemies4d.js:15`, `GRAVEGAIN4D-TEST.md:5,23`).
- F-key: `input/input4d.js:6,52-53,66,156` deliberately leaves `KeyF`
  ability-free; only `requestFullscreen` calls are the ⛶ button
  (`index.html:397`) and the savebridge shell bridge (`engine/savebridge.js:317`).
- `double-click` user text: 4 hits, all code comments
  (`graphics/*.js`, `engine/savebridge.js:281`). Nothing user-facing.

## 3. Theme-gap check vs GraveGain3D (11 systems)

Legend: ✅ live at runtime · 🟡 on disk but orphan/unwired · ❌ absent.
"Loaded?" = has a `<script src>` in `index.html` (37 locals + `lore.js`).

| # | GG3D pillar | GG4D status | Loaded? | Verdict |
|---|---|---|---|---|
| 1 | Races (`RaceData`; 4 races incl. orcs/goblins) | `rpg/races4d.js` defines `GG4D_Races`; campaign/codex + m09 dialogue reference 4 races; NOTHING populates `#raceGrid` | No | 🟡 GAP |
| 2 | Classes (`ClassType` W/M/T/S + combat numbers) | `rpg/classes4d.js` defines `GG4D_Classes` ("mirrors GG3D combat numbers"); NOTHING populates `#classGrid` | No | 🟡 GAP |
| 3 | Modes (GG3D: control/game-speed modes; GG4D saga modes Realtime/Chrono-Lock/Turn-Based) | `engine/modes4d.js` (`GG4D_Modes`) + `ui/modes4d.js` (`GG4D_ModeUI`, keys 1/2/3 + HUD pill); `main4d.js` never reads either | No | 🟡 GAP |
| 4 | Hub (LuckyStarShip: quarters/armory/exchange/lore) | DOM tabs exist (`index.html:184-254`); `ui/hub4d.js` (`GG4D_Hub`, KillCredits bank chain) orphan; zero JS refs to any hub id | No | 🟡 GAP |
| 5 | Crops (GG3D `BotanySeeds`, plant/harvest) | `rpg/crops4d.js` (`GG4D_Crops`, mirrors GG3D seeds 1-4); `ui/hub4d.js:93-94,351-352,411-412` consumes it; no crop UI in hub DOM | No | 🟡 GAP |
| 6 | Quarters (`QuartersUpgrades` L1-6, chrono-sand capacity) | `rpg/quarters4d.js` (`GG4D_Quarters`, "EXACT numbers"); DOM shows level/capacity/cost ids; `#btnUpgradeQuarters` unwired | No | 🟡 GAP |
| 7 | Potions (GG3D Q-potion, `player.potions`, Nanite Flask upgrade) | `combat/abilities4d.js` `drinkPotion` (Q, GG3D parity) + `rpg/upgrades4d.js:15` potions upgrade; no loaded file touches `potions` | No | 🟡 GAP |
| 8 | Stone (GG3D 💎 Stone resource, `game-runtime.js:1854`) | `rpg/stone4d.js` (`GG4D_Stone`); stone/rune *textures* live (`textures4d.js:196-271`), but NO stone resource/HUD/economy at runtime | No | 🟡 GAP |
| 9 | Contract (GG3D objectives card `aaa/50-hud-objectives.js`) | `ui/contract4d.js` (`GG4D_Contract`, mission checklist overlay) orphan; `campaign/ui4d.js` (loaded) does not render objectives | No | 🟡 GAP |
| 10 | Radar (GG3D holographic minimap radar `index.html:160`) | `ui/radar4d.js` (`GG4D_Radar`, canvas minimap) orphan; HUD has only Rift/Brane text | No | 🟡 GAP |
| 11 | NPC voices (GG3D `speechSynthesis` in `sound-engine.js:223-228`) | Lore entries carry `voice_provider`/`voice_id`, `#btnSpeakLore` exists (`index.html:246`), but **zero JS references the button and no `speechSynthesis`/`speakLore` exists tree-wide** | n/a | ❌ GAP |

Net: 10 orphan-gaps + 1 missing (voices) = **11 theme gaps**.

## 4. Orphan modules (on disk, syntax-PASS, never loaded) — 22 files

Not in any `index.html` `<script src>`; `main4d.js` wires none of them
(verified: no matches for any of these globals/ids in `main4d.js`):
`engine/modes4d.js`, `combat/abilities4d.js`, `combat/block4d.js`,
`combat/keymap4d.js`, `combat/melee4d.js`, `rpg/races4d.js`,
`rpg/classes4d.js`, `rpg/economy4d.js`, `rpg/progression4d.js`,
`rpg/upgrades4d.js`, `rpg/crops4d.js`, `rpg/quarters4d.js`,
`rpg/stone4d.js`, `ui/hub4d.js`, `ui/contract4d.js`, `ui/modes4d.js`,
`ui/radar4d.js`, `lore/npcs4d.js`, `lore/codex-extra4d.js`,
`lore/dreams4d.js`, `lore/hades4d.js`, `net/mmorpg-bridge-4d.js`.
(`mmorpg-4d.js` IS loaded — added mid-audit as `index.html:58`.)

## 5. Fix list for the integrator (file:line + change; no fixes applied)

1. `index.html:22-58` — add 22 missing `<script src>` tags in dependency
   order: `rpg/` data first (`races4d, classes4d, economy4d, progression4d,
   quarters4d, crops4d, stone4d, upgrades4d`), then `engine/modes4d.js`,
   `combat/keymap4d.js, melee4d.js, block4d.js, abilities4d.js`,
   `lore/npcs4d.js, codex-extra4d.js, dreams4d.js, hades4d.js`,
   `ui/hub4d.js, contract4d.js, modes4d.js, radar4d.js`,
   `net/mmorpg-bridge-4d.js` (after `mmorpg-4d.js`). Beware duplicate
   basename `engine/modes4d.js` vs `ui/modes4d.js` — keep both paths explicit.
2. `index.html:409-410` — `gg4dRefit` reads `window.GraveGainGame`; change to
   `window.GG4D_Game` (defined `engine/main4d.js:272`) or walk both with
   `GG4D_Game` first. Else resize/fullscreen refit never applies.
3. Menu/screen wiring (currently ZERO): wire `btnStoryMode`, `btnPlay`,
   `btnEnterHub`, `btnOpenSettings`, `btnCharSelectBack/Start`,
   `btnLeaveHub`, hub tab buttons, `btnUpgradeQuarters`, `btnBuyUusd`,
   `btnBuyGold`, `btnSaveSettings`, `btnPause/Resume/Abandon`,
   `btnGoToMenu`, `btnReturnToHub`, `btnSpeakLore`; populate `raceGrid`,
   `classGrid`, `armoryGrid`, `loreList`, `dailyChallengesList`,
   `perkCardsGrid`; toggle the 7 `screen-overlay`s. No JS file does any of
   this today (only `index.html` contains the ids). `ui/hub4d.js` covers hub
   internals only — char-select/perks/daily wiring exists nowhere.
4. `game.json:53` — assets.local names 12 nonexistent files
   (`graphics/hyper-render.js`, `graphics/chrono-fx.js`,
   `entities/player.js`, `entities/wraith.js`, `world/brane-maps.js`,
   `campaign/00-campaign-boot.js`, `campaign/10-campaign-director.js`,
   `ui/hud.js`, `ui/hub-quarters.js`, `audio/sound-engine.js`,
   `input/input-manager.js`, `main.js` — GG3D names). Replace with the real
   38 loaded paths from `index.html:22-58` + `lore.js`, plus any orphans
   promoted by fix #1.
5. `mmorpg-4d.js:269` — `window.GraveGain4DMissions` → `window.GG4D_Campaign
   || window.GG4D_CampaignMissions` (defined `campaign/00-boot4d.js:50-51`).
6. `net/mmorpg-bridge-4d.js:7,148,166-167,179` — decide: either ship
   `net/net4d.js` (`GraveGain4DNet`) or repoint the bridge at `GG4D_Dream`
   (not `GraveGain4DDream`) and correct the header path to
   `public/games/html/gravegain4d/net/net4d.js`. Until then the bridge is
   dormant by design (fail-open, no timers without `?mmorpg=`).
7. Keybinding conflict — `input/input4d.js:52-53,66` binds Q/E to Ana/Kata
   w-shift and ignores `KeyF`, while `combat/keymap4d.js:10,21-23,32,113-122`
   + `combat/abilities4d.js:64-74` assign Q=potion / F=ability, with a
   `BINDING_CHANGE` note asking `input4d.js` to move Q-ana to R (flagged
   read-only by contract). No runtime clash today (combat orphan), but the
   integrator must pick ONE binding and update `index.html:130`
   (`controlsHint` currently promises "Q/E W-Shift") and
   `game.json:24-33` controls block to match.
8. NPC voices — implement `#btnSpeakLore` handler (no `speakLore`/
   `speechSynthesis` exists in GG4D; GG3D precedent:
   `gravegain3d/audio/sound-engine.js:223-228`) consuming lore
   `voice_provider`/`voice_id`, or remove the button (`index.html:246`).
9. `engine/main4d.js:7-11,22-26` — delete or define the dead optional
   lookups (`GG4D_Engine/_Entities/_Graphics/_World`,
   `GraveGain4DGraphics/_Worlds/_Missions`) so the next audit doesn't
   re-flag them; wire the real registries (`GG4D_Putt`, `GG4D_HUD`,
   `GG4D_Touch`, `GG4D_Sound`, orphans from fix #1) explicitly.
10. Gameplay data gaps even after loading: hub DOM has no crop slots UI
    (GG3D `botanyCrops` grid), HUD has no Stone/potion counters
    (GG3D `hudPotionCount`, `resLabel` 💎 Stone), no radar/minimap slot,
    no contract/objectives anchor — add DOM + CSS or descope in `game.json`.

## 6. What PASSES (keep as-is)

- 60/60 syntax; idempotent `window.*` guards; try/catch-never-throw style.
- Fullscreen contract: ⛶-button-only, no `dblclick`, no F-key binding.
- Loaded core chain (vec4→mat4→projector→hyperdungeon→putt→timefold→branes→
  textures→wghosts→slicerenderer→entities→dreamgen→riftzones→portal→
  campaign×14→hud→touch→sound→input→main→savebridge→lore→mmorpg) is ordered
  correctly; all resolve on disk; shared shell scripts resolve.
- Campaign content (m01–m10 dialogue, codex unlocks, KillCredits economy
  language, 4-race compact story) is present and GG3D-consistent.

## 7. INTEGRATOR ADDENDUM (post-audit fixes applied)

- Mission spawn/boss ids reconciled to enemies4d/bosses4d registries (m01-m10 patched).
- index.html load order rewritten to on-disk files + theme lanes (combat/rpg/lore/modes/contract/radar/hub) + engine/flow4d.js (menu/char/hub/pause/level-up/game-over wiring, lore list, speechSynthesis audio logs).
- Canon keymap: Q potion, F ability, R/E ana-kata (input4d remapped).
- Stroke pars 3/4/4/5/4/3/4/5/5/5 (total 42); director stars on parSeconds.
- Catalog wired: games.ts entry + recommended, age-gate adults, sync bundles, guide registered, verify-age-gate list. Sync OK (36 bundles), runtime + guide generated, bridge injected.
- Remaining non-owned items left for their lanes: mmorpg-4d.js/net (other worker), template-demo/game.js parity (pre-existing), commander-client tsc (pre-existing).

