# GraveGain2dB — Game Specification

## One-line pitch

**GraveGain2dB: Breach MoonRock** is a fast, emoji-rendered 2D run-and-gun: one to four defenders blast through the undead occupation of MoonRock, rescue survivors, steal enemy weapons, and turn entire fortifications into rubble.

It is the arcade-action sibling of GraveGain 1D/2D/3D/4D/5D, set during the NecroGenesis. Its identity is *improvised destruction*: every objective has a loud, dangerous, satisfying shortcut.

**Target route:** `/games/gravegain2dB/`

## Player promise

The player should feel like a tiny, over-equipped hero in a huge bad situation: run right, leap into danger, fire in any direction, turn an enemy bunker into falling emoji debris, and extract a civilian before the whole screen erupts.

The game takes genre inspiration from high-chaos side-scrolling action games such as *Contra* and *Broforce*, but uses original MoonRock lore, original heroes, original encounter layouts, and an emoji visual language.

## Product boundaries

- **Camera / genre:** 2D horizontal side-scrolling run-and-gun platformer.
- **Play:** solo first; local/online co-op architecture supports 2–4 players after the core is stable.
- **Session:** 10–18 minutes per mission; 45–90 seconds per checkpoint encounter.
- **Platform:** desktop keyboard/gamepad first, touch controls second.
- **Rendering:** HTML5 canvas at 60 FPS, with emoji as every character, prop, pickup, projectile, and effect.
- **Content rating:** supports the existing 4weird Kid / Teen / Adults mode system. Destruction remains readable in every mode; only effects, language, and corpse treatment change.

## Setting and premise

MoonRock is in the first violent days of the NecroGenesis. Dr. Lucifer Hades has turned colonies, mines, temples, and drop sites into an undead war machine. The LuckyStarShip coalition responds with small **Breach crews**: specialists who can enter a sealed disaster zone, tear down its defenses, recover living people and critical technology, and leave before the Array notices.

Each mission begins with a short radio exchange from familiar faces—Valley Net, Private Lisa Park, Arty Fisher, Groknak—and ends with an extraction or a spectacular boss collapse. The 2dB campaign complements the RPG campaigns instead of retelling them: it covers high-risk flashpoint operations that are too kinetic and destructive for the other games.

## Core loop

1. Drop into a compact side-scrolling combat zone.
2. Move, jump, dodge, and aim independently while fighting an escalating enemy mix.
3. Break terrain, vehicles, shields, and supports to create routes or erase threats.
4. Grab temporary weapons, save trapped allies, and choose risky shortcuts.
5. Complete the mission objective, defeat or bypass the commander, and extract.
6. Earn KillCredits, rescue medals, codex entries, and cosmetic emoji loadout unlocks.

### Combat rhythm

`spot threat → shoot / flank / blow up cover → react to collapse → rescue or push forward → checkpoint → bigger set piece`

The game should never make players wait for enemies to become vulnerable. Every fight has at least two solutions: precision fire or destructive force.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move / climb | A/D or Left/Right; W/S on ladders | Left stick / D-pad |
| Jump / double-jump | Space | South button |
| Aim | Mouse | Right stick |
| Fire | Left mouse | Right trigger |
| Alt-fire / grenade | Right mouse or Q | Left trigger / shoulder |
| Dash / slide | Shift | East button |
| Interact / rescue | E | West button |
| Swap weapon | 1–3 / mouse wheel | D-pad |
| Pause | Esc | Menu |

Movement is intentionally simple: forgiving coyote time, jump buffering, air steering, and a short dash with invulnerability frames. Players aim in 360° with mouse/right stick; keyboard-only players use eight-direction aim with the arrow cluster as a fallback.

## Heroes

Before a mission, a player chooses one of the established four races and one of the established four classes; all 16 combinations are valid. The side-scroller translates those shared identities into run-and-gun kits instead of replacing them with a separate hero roster.

| Race | Emoji | Side-scroller expression |
| --- | --- | --- |
| Human | 👩‍🚀 | shield wall and jetpack mobility |
| Elf | 🧝‍♀️ | hover, mana regeneration, and nature-burst control |
| Dwarf | ⛏️ | double jump, stone form, and demolition resistance |
| Orc | 👹 | ground stomp and escalating rage burst |

| Class | Combat job | Run-and-gun emphasis |
| --- | --- | --- |
| Warrior | aggressive damage | weapon mastery, recoil control, and a breach dash |
| Tank | hold the line | shields, damage soak, and safe civilian extraction |
| Support | keep the crew alive | revive tools, supply drops, and objective control |
| Mage | battlefield manipulation | energy weapons, elemental damage, and terrain interaction |

The combination determines a familiar title—such as Human Soldier, Elven Paladin, Dwarven Warlock, or Orc Berserker—plus one race ability and one class ability. It changes tactics without creating invalid combinations or a long unlock grind.

The following named specialists are campaign voices, unlockable cosmetic profiles, and recommended preset combinations. They share the same movement fundamentals but have a signature skill and an emoji silhouette that is instantly legible.

| Hero | Emoji | Role | Signature skill |
| --- | --- | --- |
| Lisa Park, Drop Trooper | 🧑‍🚀 | all-rounder | **Thruster Kick:** air dash that breaks light walls and reflects weak shots |
| Arty Fisher, Field Engineer | 👨‍🔧 | demolition | **Remote Charge:** place three detonators, then trigger them together |
| Groknak, Orc Warchief | 👹 | frontline | **Rage Ram:** charge through enemies and unstable structures |
| Aelindra, Grove Runner | 🧝 | mobility / control | **Moonvine:** grapple to anchors, stun foes, and pull light cover |
| Borin, Forge Warden | 🧔‍♂️ | defense | **Anvil Drop:** call down a crushing forge capsule that creates hard cover |
| Valley Net, Emergency Shell | 🤖 | support | **Signal Pulse:** reveal objectives, revive allies at range, disrupt turrets |

Unlocks alter presentation and small tactical choices, not fundamental power. A new hero should invite a new approach to destruction, not gate campaign progress.

## Arsenal and pickups

Each hero begins with a reliable infinite-ammo sidearm and can carry two scavenged weapons plus one alt-fire charge.

| Pickup | Emoji | Function |
| --- | --- | --- |
| Pulse rifle | 🔫 | accurate sustained fire; pierces weak enemies |
| Scatter blaster | 💥 | close-range burst; tears light terrain |
| Grave launcher | 🚀 | explosive projectile; collapses damaged structures |
| Moonbeam | ⚡ | continuous beam; chains through metal and shields |
| Forged saw | 🪚 | short-range terrain cutter; creates deliberate tunnels |
| Cryo charm | ❄️ | freezes enemies and makes brittle walls shatter |
| Sun grenade | ☀️ | area clear; ignites oil, spores, and fuel crates |
| Rescue beacon | 📡 | revives allies / marks civilians; replaces grenade for one use |

Ammo is generous. The tension comes from positioning, civilians, timed objectives, and the consequences of collapse—not from withholding bullets.

## Destruction system — “Breach Physics”

Destruction is the game’s defining system. It must be predictable enough for tactical play and spectacular enough to create stories.

### World materials

Levels are built from grid-aligned chunks with material tags. Each chunk has health, debris type, blast resistance, and support rules.

| Material | Emoji language | Behavior |
| --- | --- | --- |
| Wood / roots | 🪵🌿 | burns and breaks quickly; supports light platforms |
| Stone / grave masonry | 🪨🪦 | requires explosives or sustained heavy damage; falls as blocks |
| Scrap metal | ⚙️🔩 | tough; conducts beam weapons and becomes shrapnel when explosive-killed |
| Crystal / moonstone | 💎 | refracts beams; shatters into damaging but short-lived fragments |
| Necro growth | 🫀🦠 | spreads over time; ruptures with fire or sunlight |
| Force barrier | 🟪🛡️ | ignores bullets until its power node is destroyed or bypassed |

### Rules that keep it fair

- Only authored terrain marked destructible can be removed; mission boundaries and necessary spawn floors cannot be accidentally soft-locked.
- Supports are visibly marked (bolts, cracked beams, red hazard rune). Destroying all supports drops attached platforms, towers, and suspended hazards.
- A two-step warning—cracks, dust, wobble—precedes any large collapse, except deliberately telegraphed boss attacks.
- Civilians show a visible danger ring. Explosions knock them down rather than instantly kill them on standard difficulty; repeated reckless damage reduces rescue score.
- Destruction is network-authoritative in multiplayer and seeded/replayed deterministically where practical.
- Debris has a strict lifetime and pooled particle budget to preserve performance on lower-end hardware.

### Destruction verbs

- **Breach:** blow a hole through a wall to skip a kill room.
- **Drop:** remove supports beneath a tower, bridge, gun nest, or boss armor plate.
- **Redirect:** open a route that makes enemies path through fire, acid, or a crush zone.
- **Rescue:** free civilians from cages, rubble, or collapsing lifts.
- **Overload:** expose a generator, then choose to destroy it for a dramatic shortcut or keep it for a safer utility route.

The golden rule: *if it looks explosive, heavy, cracked, wired, or suspended, the player should try shooting it—and the game should reward that instinct.*

## Enemies and bosses

Enemies are readable at a glance and designed around terrain interaction.

| Enemy | Emoji | Pressure it creates | Counterplay |
| --- | --- | --- | --- |
| Colony Zed | 🧟 | basic close pressure | aim, jump, or knock into hazards |
| Bone Rifle | 💀🔫 | cross-screen fire from cover | flank, break cover, reflect shots |
| Spore Burrower | 🍄🪱 | tunnels under platforms | watch ground ripples; freeze or blast it out |
| Necro Sapper | 🧌💣 | damages player supports | eliminate early or use its bomb against enemies |
| Wisp Drone | 👻🛸 | flies and shields allies | beam, grapple, or anti-air burst |
| Array Warden | 🛡️☠️ | anchors force fields and summons | break exposed nodes / collapse its arena |

Bosses are destruction puzzles with direct-fire fallback. Example: **The Gravecrawler Drill** (🪱⚙️💀) tunnels through a mine, creating and erasing platforms; players can shoot its core, drop ore carts on it, or destroy ceiling braces to pin it during a vulnerable window.

## Campaign launch slice

Ship eight missions at launch. Every mission introduces a new destructive idea, a new environmental silhouette, and one memorable escape or collapse.

| # | Mission | Location | Main objective | Signature destruction |
| --- | --- | --- | --- | --- |
| 1 | Crashsite Breach | Colony Alpha crater | secure survivors and the dropship black box | collapse a zed-filled memorial wall |
| 2 | Minefall | Dwarven sparkite mine | restore the evacuation rail | blow ore chutes to reroute a pursuing horde |
| 3 | The Grove Burns Blue | Elven biolume forest | extract grovekeepers | cut burning roots to make safe bridges |
| 4 | Wastes Convoy | Orc badlands train | defend and board a moving supply train | destroy raider ramps and fuel trucks |
| 5 | Relay Below | signal cathedral | power the emergency broadcast | breach vertical shafts and survive falling bells |
| 6 | Fungal Siege | spore nursery | rescue trapped hatchlings | rupture necro growth before it reaches sealed doors |
| 7 | Array Foundry | Hades industrial forge | sabotage armor production | cascade generators to dismantle the foundry |
| 8 | No Grave Holds | NecroGenesis perimeter | plant a breach beacon and extract | boss arena collapses into the Array trench |

Campaign progression has three difficulties: **Cadet**, **Breach**, and **MoonRock Nightmare**. Nightmare adds denser mixed groups and less civilian forgiveness, not inflated enemy health as its primary challenge.

## Mission structure and scoring

Each mission contains two or three checkpoints and one optional rescue/objective route. End-of-mission scoring celebrates the game’s intended behavior:

- **Breach Time:** completion speed.
- **Rescues:** civilians and trapped allies evacuated.
- **Chain:** highest uninterrupted enemy / object destruction chain.
- **Demolition:** meaningful enemy assets and supports destroyed.
- **Clean Exit:** crew lives preserved.

Stars unlock heroes, cosmetic trail effects, mission modifiers, and codex pages. No stat paywall, loot boxes, or grinding requirement.

## Game modes

- **Campaign:** the same ten-mission GraveGain campaign is reinterpreted as side-scrolling breach operations, retaining shared story progression, the LuckyStarShip hub, four races, four classes, and common codex / currency hooks.
- **Endless Dungeon Run:** the shared endless dungeon mode becomes an endless sequence of hostile side-scrolling sectors. Procedural encounter modules, hazards, rescue events, and escalating modifiers preserve the familiar run structure while the player chooses routes by breaking through the level.
- **MMO:** the same GraveGain MMO layer supports parties, shared server events, world bosses, social hub access, and cross-mode progression. In 2dB, live events manifest as public breach zones and extraction defenses; solo play remains fully available when the MMO layer is offline.
- **Breach Run:** a short, leaderboard-ready variant of Endless Dungeon Run built for 6–10 minute sessions and daily seeds.
- **Last Stand:** defend an extract beacon while terrain steadily becomes less safe.
- **Co-op Campaign:** 2–4 players; friendly fire off by default, optional in custom games.
- **Accessibility modifiers:** aim assist, slower game speed, extra checkpoint, reduced flashing, reduced screen shake, and an option to make civilian damage impossible.

## Emoji art direction

The art is not a placeholder layer; emoji are the actual art style. Every object uses a large, high-contrast emoji glyph with a small number of supporting shapes, outlines, shadows, particles, and animation transforms.

- **Readability:** never use color alone. Enemy factions have silhouette and motion identity: shamble, hover, tunnel, shield, or carry explosives.
- **Layering:** background = tinted emoji constellations / terrain; gameplay props = crisp outlined emoji; effects = oversized animated emoji bursts.
- **Animation:** squash-and-stretch, rotation, recoil, parallax, and 2–4-frame emoji swaps. Avoid pretending emoji are detailed sprites.
- **Destruction:** use material-specific fragments: 🪨, 🔩, 🌿, 💎, and stylized effect glyphs. Limit live fragments and merge distant debris into decals.
- **Modes:** Kid mode uses 🌫️ poofs, stars, and scrap; Teen mode uses mild sparks and dark dust; Adults mode may use the existing gravegain gore treatment. All modes retain the same collision and tactical information.

## HUD and UX

Keep the screen clear during play:

- Top left: hero emoji, health armor, equipped weapon, alt-fire.
- Top center: primary objective in one short line.
- Top right: rescue count and waypoint direction.
- Near player: compact ammo / cooldown and a danger indicator for incoming collapse.
- When a structure is close to failure, show a brief `⚠️ UNSTABLE` tag directly on it—not an intrusive tutorial panel.
- Pausing exposes controls, accessibility settings, content mode, and restart checkpoint.

## Technical design and acceptance criteria

### Architecture

- Keep this as a self-contained `gravegain2dB` game bundle with `index.html`, `game.js`, `game.css`, `game.json`, and modular systems for input, entities, terrain, effects, missions, persistence, and netplay.
- Reuse the shared GraveGain content-mode bridge, common save conventions, campaign UI patterns, and multiplayer bridge only where their contracts fit. Do not couple its frame loop to GraveGain2D’s dungeon simulation.
- Use a fixed-timestep simulation and decouple rendering for predictable jumping, explosions, and future multiplayer synchronization.
- Terrain is a chunk grid with destructible cells plus authored indestructible collision; render only changed chunks after an explosion.
- Save campaign stars, unlocks, settings, and content-mode preferences locally; make mission progress recoverable after a browser refresh at a checkpoint.

### Performance targets

- 60 FPS on a typical current laptop at 1280×720 game viewport.
- 30 FPS minimum on a supported mobile device using reduced particles and lower terrain-detail mode.
- No more than 250 active debris particles, 80 active projectiles, and 40 active enemies per camera zone in the launch slice without adaptive culling.
- A maximum of 120 ms player-input-to-visible-action delay under normal local play.

### Definition of done for the vertical slice

The first playable version is complete when Mission 1 includes:

1. Lisa Park, run/jump/dash, independent aiming, pulse rifle, scatter blaster, grenade, damage/death/checkpoint loop.
2. Three enemy types (Colony Zed, Bone Rifle, Necro Sapper) with visible combat roles.
3. At least four destructible materials, a support-collapse set piece, a breakable shortcut, and a civilian rescue.
4. One extraction objective, mission score card, persistence of stars, and keyboard/gamepad support.
5. Emoji graphics with readable effects, low-flash setting, and Kid/Teen/Adults visual-mode behavior.
6. A stable 60 FPS run through the mission on desktop, including the largest explosion.

## Production order

1. Prove the controls: one room, one hero, one gun, one enemy, and perfect jump / aim / hit feel.
2. Prove destruction: material chunks, blast damage, supports, debris budgeting, and soft-lock guards.
3. Build Mission 1 as the vertical slice, then validate its performance and accessibility.
4. Add hero kits, remaining enemy families, boss framework, and campaign systems.
5. Add local co-op, then online synchronization only after the deterministic terrain/event model is proven.
6. Expand into Breach Run, daily seed, and polished co-op content.

## Explicit non-goals for launch

- Not a top-down dungeon crawler or a replacement for existing GraveGain2D.
- Not fully procedurally destructible terrain; authored spectacle and reliable play come first.
- Not a loot-heavy RPG. Weapons are moment-to-moment toys, not inventory chores.
- Not photorealistic or sprite-art dependent. Emoji clarity and motion are the visual north star.
- Not an exact recreation of any inspiration; its identity is MoonRock’s lore, Breach Physics, rescue scoring, and emoji mayhem.
