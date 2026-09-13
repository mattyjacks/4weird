/* GraveGain bestiary — E15 lane (STATS + BEHAVIORS + SPAWN TABLES for 1D/2D/3D).
 *
 * Sibling-lane contract: MODELS live elsewhere — 3D meshes in
 *   gravegain3d-models.js (window.GraveGain3DModels, G2) and 2D sprites in
 *   gravegain2d-sprites.js (window.GraveGain2DSprites, G5). This file owns NO
 *   geometry and paints NO sprites: each entry carries `model` (a G2 enemy key)
 *   and `sprite` (a G5 sprite id) as plain string references, resolved lazily
 *   and guarded at runtime. Advisory tags in gravegain-enemies.js (E15-sub08,
 *   window.GraveGainEnemies) are a separate overlay and are never overwritten.
 *
 * What it does:
 *   - `enemies`: 43 stat blocks (18 legacy v2 rows kept byte-identical + 25 new
 *     E15 variants) with behaviors: charger, splitter, healer, bomber, phaser,
 *     chaser, swarmer, brute, caster, lurker, summoner.
 *   - `behaviors`: per-behavior tuning + neutral FX descriptors (no gore words,
 *     same data for every age band; actual kill FX is delegated to the G7/gore
 *     lanes via window.FourweirdGore.spawn when present — see playDeathFx).
 *   - `spawnTable`: floor-range + per-theme weights with pure pick helpers.
 *   - `eliteMods` + rollElite/applyElite: elite modifier overlays.
 *   - Per-game row converters (toRow2D/toRow3D/toKind1D) + best-effort runtime
 *     registration (install): wraps 2D getAmbientEnemyType and 3D
 *     EnemyEntity.mobsForTheme (chained, flagged, additive only); 1D exposes
 *     SECTORS without a mutable kind registry, so 1D gets an additive
 *     `bestiary` reference + sectorExtras() helper instead of spawn mutation.
 *   - Endless-lane compat: noteEndlessFloor(snapshot) + pickVariant(seed, cycle).
 *
 * Contract: vanilla ES5 IIFE, no imports, no DOM, no listeners, no storage,
 *   no network, never throws, idempotent (`if (window.GraveGainBestiary)
 *   return;`). Install polling is a capped setInterval that pauses when hidden.
 *
 * v3.0.0 migration: BODY_PLANS/buildBody removed (that duplicated the G2 MODELS
 *   lane). Use entry.model + window.GraveGain3DModels.buildEnemy(model) and
 *   entry.sprite + window.GraveGain2DSprites.getSprite(sprite) instead.
 */
(function () {
'use strict';
if (window.GraveGainBestiary) return; // idempotent under double-injection

var VERSION = '3.0.0';

/* ---------------- legacy v2 roster (kept identical so old ids resolve) ---------------- */
var LEGACY = [
  { id: 'shambler', name: 'Risen Shambler', emoji: '🧟', hp: 12, atk: 2, def: 0, spd: 2, xp: 3, gold: 2, tier: 'minion', behavior: 'chaser', flavor2d: 'shambling token, moss-green tint, medium size', flavor1d: '🧟' },
  { id: 'swarm', name: 'Skull Swarm', emoji: '💀', hp: 5, atk: 3, def: 0, spd: 4, xp: 2, gold: 1, tier: 'minion', behavior: 'swarmer', flavor2d: 'skittering token cluster, bone-white tint, small size', flavor1d: '💀' },
  { id: 'brute', name: 'Zed Brute', emoji: '👹', hp: 22, atk: 5, def: 1, spd: 1, xp: 5, gold: 4, tier: 'brute', behavior: 'brute', flavor2d: 'heavy token, blood-red tint, large size', flavor1d: '👹' },
  { id: 'necro', name: 'Array Necromancer', emoji: '🧙', hp: 20, atk: 4, def: 0, spd: 2, xp: 7, gold: 5, tier: 'elite', behavior: 'caster', flavor2d: 'robed token, violet tint, medium size', flavor1d: '🧙' },
  { id: 'wraith', name: 'Pale Wraith', emoji: '👻', hp: 14, atk: 4, def: 0, spd: 4, xp: 5, gold: 3, tier: 'minion', behavior: 'lurker', flavor2d: 'drifting token, pale-cyan tint, medium size', flavor1d: '👻' },
  { id: 'golem', name: 'Crypt Golem', emoji: '🗿', hp: 34, atk: 6, def: 2, spd: 1, xp: 8, gold: 6, tier: 'brute', behavior: 'brute', flavor2d: 'stone token, slate-gray tint, extra-large size', flavor1d: '🗿' },
  { id: 'hexbat', name: 'Hexbat', emoji: '🦇', hp: 8, atk: 3, def: 0, spd: 5, xp: 3, gold: 2, tier: 'minion', behavior: 'swarmer', flavor2d: 'fluttering token, midnight-purple tint, tiny size', flavor1d: '🦇' },
  { id: 'mirelurker', name: 'Mirelurker', emoji: '🐊', hp: 18, atk: 4, def: 1, spd: 2, xp: 5, gold: 3, tier: 'brute', behavior: 'lurker', flavor2d: 'lurking token, murky-teal tint, large size', flavor1d: '🐊' },
  { id: 'ashen-knight', name: 'Ashen Knight', emoji: '🛡️', hp: 26, atk: 6, def: 2, spd: 2, xp: 9, gold: 7, tier: 'elite', behavior: 'chaser', flavor2d: 'armored token, ash-gray tint, large size', flavor1d: '🛡️' },
  { id: 'sporefiend', name: 'Sporefiend', emoji: '🍄', hp: 10, atk: 3, def: 0, spd: 2, xp: 4, gold: 2, tier: 'minion', behavior: 'caster', flavor2d: 'puffball token, sickly-green tint, small size', flavor1d: '🍄' },
  { id: 'crypt-weaver', name: 'Crypt Weaver', emoji: '🕷️', hp: 16, atk: 4, def: 1, spd: 3, xp: 6, gold: 4, tier: 'elite', behavior: 'lurker', flavor2d: 'skittering token, web-silver tint, medium size', flavor1d: '🕷️' },
  { id: 'ember-imp', name: 'Ember Imp', emoji: '🔥', hp: 7, atk: 4, def: 0, spd: 4, xp: 3, gold: 2, tier: 'minion', behavior: 'swarmer', flavor2d: 'flickering token, ember-orange tint, tiny size', flavor1d: '🔥' },
  { id: 'frostbound', name: 'Frostbound Husk', emoji: '❄️', hp: 20, atk: 4, def: 1, spd: 2, xp: 6, gold: 4, tier: 'brute', behavior: 'brute', flavor2d: 'rime token, ice-blue tint, medium size', flavor1d: '❄️' },
  { id: 'grave-titan-spawn', name: 'Grave Titan Spawn', emoji: '🦍', hp: 40, atk: 7, def: 2, spd: 1, xp: 12, gold: 9, tier: 'elite', behavior: 'boss', flavor2d: 'towering token, grave-purple tint, huge size', flavor1d: '🦍' },
  { id: 'marrow-thief', name: 'Marrow Thief', emoji: '🐀', hp: 9, atk: 3, def: 0, spd: 5, xp: 4, gold: 5, tier: 'minion', behavior: 'lurker', flavor2d: 'darting token, dusty-brown tint, tiny size', flavor1d: '🐀' },
  { id: 'bellwether', name: 'Bellwether', emoji: '🔔', hp: 24, atk: 5, def: 1, spd: 2, xp: 10, gold: 8, tier: 'elite', behavior: 'caster', flavor2d: 'tolling token, brassy-gold tint, large size', flavor1d: '🔔' },
  { id: 'dusk-prowler', name: 'Dusk Prowler', emoji: '🐆', hp: 15, atk: 5, def: 0, spd: 5, xp: 6, gold: 4, tier: 'brute', behavior: 'chaser', flavor2d: 'prowling token, dusk-indigo tint, medium size', flavor1d: '🐆' },
  { id: 'herald-spawn', name: 'Herald Spawn', emoji: '👑', hp: 55, atk: 7, def: 2, spd: 2, xp: 20, gold: 30, tier: 'boss', behavior: 'boss', flavor2d: 'crowned token, void-crimson tint, huge size', flavor1d: '👑' }
];

/* ---------------- 25 new E15 variants (stats + behaviors + spawn weights) ----------------
 * floors: 1-based floor/layer range (max 99 = endless-eligible).
 * themes: 2D theme ids (crypt/graveyard/treasury/ash/brine) + 3D dungeon theme
 *   ids (stone_crypt/metallic_ship/elven_grove/dwarven_vault/orc_wastes/
 *   toxic_catacombs/citadel_darkness). model/sprite are string refs into the
 *   G2/G5 lanes (never built here). behaviorParams tune the BEHAVIORS table.
 * Blurbs are one line, age-band neutral (no gore, no profanity). */
var NEWCOMERS = [
  { id: 'rift-charger', name: 'Rift Charger', emoji: '🦏', hp: 26, atk: 6, def: 1, spd: 4, xp: 9, gold: 6, aggro: 7, tier: 'elite', behavior: 'charger', behaviorParams: { telegraphMs: 700, dashSpeedMul: 2.4 }, floors: { min: 1, max: 4 }, themes: { ash: 3, orc_wastes: 3, brine: 2, stone_crypt: 1 }, weight: 3, model: 'skeletonBrute', sprite: 'crypt-jackal', blurb: 'Paws the dust, then crosses the room in one grey line.' },
  { id: 'marrow-splitter', name: 'Marrow Splitter', emoji: '🪺', hp: 30, atk: 5, def: 1, spd: 2, xp: 8, gold: 5, aggro: 5, tier: 'brute', behavior: 'splitter', behaviorParams: { splitInto: 'marrow-mote', splitCount: 2 }, floors: { min: 2, max: 5 }, themes: { crypt: 3, dwarven_vault: 3, treasury: 2 }, weight: 3, model: 'marrowGolem', sprite: 'sludge-mimic', blurb: 'Its nest-shell cracks open instead of falling over.' },
  { id: 'marrow-mote', name: 'Marrow Mote', emoji: '🥚', hp: 6, atk: 3, def: 0, spd: 4, xp: 2, gold: 1, aggro: 8, tier: 'minion', behavior: 'swarmer', behaviorParams: {}, floors: { min: 2, max: 6 }, themes: { crypt: 2, dwarven_vault: 2, treasury: 1 }, weight: 1, model: 'plagueRats', sprite: 'void-leech', blurb: 'A wobbling speck with strong opinions about ankles.' },
  { id: 'pale-medic', name: 'Pale Medic', emoji: '➕', hp: 22, atk: 3, def: 0, spd: 2, xp: 9, gold: 7, aggro: 4, tier: 'elite', behavior: 'healer', behaviorParams: { healRadius: 150, healPerSec: 3 }, floors: { min: 2, max: 5 }, themes: { graveyard: 3, elven_grove: 3, crypt: 1 }, weight: 2, model: 'graveMage', sprite: 'tide-caller', blurb: 'Hums while it patches up its lane-mates.' },
  { id: 'cask-bomber', name: 'Cask Bomber', emoji: '🧨', hp: 10, atk: 7, def: 0, spd: 4, xp: 5, gold: 3, aggro: 8, tier: 'minion', behavior: 'bomber', behaviorParams: { blastRadius: 90, fuseMs: 600 }, floors: { min: 1, max: 4 }, themes: { metallic_ship: 3, ash: 2, brine: 2 }, weight: 3, model: 'forgeImp', sprite: 'ember-wraith', blurb: 'Sprints at you hugging a fizzing powder cask.' },
  { id: 'veilstalker', name: 'Veilstalker', emoji: '🌫️', hp: 20, atk: 5, def: 0, spd: 4, xp: 9, gold: 6, aggro: 6, tier: 'elite', behavior: 'phaser', behaviorParams: { blinkRange: 220, blinkCdMs: 3500 }, floors: { min: 3, max: 6 }, themes: { citadel_darkness: 3, crypt: 2, brine: 1 }, weight: 2, model: 'cryptWraith', sprite: 'frost-revenant', blurb: 'There — no, THERE. It relocates mid-blink.' },
  { id: 'tollkeeper', name: 'Tollkeeper', emoji: '🔔', hp: 34, atk: 6, def: 2, spd: 1, xp: 10, gold: 8, aggro: 5, tier: 'elite', behavior: 'brute', behaviorParams: {}, floors: { min: 2, max: 5 }, themes: { stone_crypt: 3, dwarven_vault: 2, treasury: 2 }, weight: 2, model: 'sarcophagusSentinel', sprite: 'gilt-sentinel', blurb: 'Rings once for every traveler. Then collects.' },
  { id: 'soggy-mimic', name: 'Soggy Mimic', emoji: '📦', hp: 24, atk: 4, def: 1, spd: 2, xp: 7, gold: 6, aggro: 5, tier: 'minion', behavior: 'splitter', behaviorParams: { splitInto: 'marrow-mote', splitCount: 2 }, floors: { min: 3, max: 6 }, themes: { brine: 3, toxic_catacombs: 3, treasury: 1 }, weight: 2, model: 'rustHusk', sprite: 'sludge-mimic', blurb: 'A dripping supply crate. Supply crates should not drip.' },
  { id: 'choir-wren', name: 'Choir Wren', emoji: '🎶', hp: 12, atk: 3, def: 0, spd: 3, xp: 5, gold: 4, aggro: 4, tier: 'minion', behavior: 'healer', behaviorParams: { healRadius: 120, healPerSec: 2 }, floors: { min: 1, max: 4 }, themes: { elven_grove: 3, graveyard: 2 }, weight: 2, model: 'groveWisp', sprite: 'tide-caller', blurb: 'Its trill knits small hurts shut again.' },
  { id: 'lantern-moth', name: 'Lantern Moth', emoji: '🦋', hp: 9, atk: 4, def: 0, spd: 5, xp: 4, gold: 3, aggro: 7, tier: 'minion', behavior: 'phaser', behaviorParams: { blinkRange: 160, blinkCdMs: 2800 }, floors: { min: 2, max: 5 }, themes: { elven_grove: 2, toxic_catacombs: 2, crypt: 1 }, weight: 2, model: 'groveWisp', sprite: 'void-leech', blurb: 'Flickers out of lamplight and into your path.' },
  { id: 'ember-herald', name: 'Ember Herald', emoji: '🔥', hp: 24, atk: 6, def: 0, spd: 2, xp: 9, gold: 6, aggro: 6, tier: 'elite', behavior: 'caster', behaviorParams: { boltSpeed: 220, volley: 3 }, floors: { min: 3, max: 6 }, themes: { ash: 3, orc_wastes: 2, dwarven_vault: 1 }, weight: 2, model: 'forgeImp', sprite: 'ash-ghoul', blurb: 'Announces the cinder column with thrown sparks.' },
  { id: 'frost-clerk', name: 'Frost Clerk', emoji: '❄️', hp: 16, atk: 4, def: 1, spd: 2, xp: 6, gold: 4, aggro: 4, tier: 'minion', behavior: 'lurker', behaviorParams: { ambushMul: 1.5 }, floors: { min: 2, max: 5 }, themes: { brine: 2, metallic_ship: 2, graveyard: 1 }, weight: 2, model: 'rustHusk', sprite: 'frost-revenant', blurb: 'Files itself under "harmless" until you turn around.' },
  { id: 'dice-squire', name: 'Dice Squire', emoji: '🎲', hp: 18, atk: 4, def: 1, spd: 3, xp: 6, gold: 7, aggro: 6, tier: 'minion', behavior: 'chaser', behaviorParams: {}, floors: { min: 1, max: 4 }, themes: { treasury: 3, stone_crypt: 2 }, weight: 3, model: 'boneArcher', sprite: 'bone-orchard', blurb: 'Charges wherever the last roll pointed.' },
  { id: 'moss-judge', name: 'Moss Judge', emoji: '🌿', hp: 36, atk: 6, def: 2, spd: 1, xp: 10, gold: 7, aggro: 5, tier: 'brute', behavior: 'brute', behaviorParams: {}, floors: { min: 3, max: 6 }, themes: { elven_grove: 3, graveyard: 2, toxic_catacombs: 1 }, weight: 2, model: 'marrowGolem', sprite: 'thorn-warden', blurb: 'Slow, mossy, and entirely sure about the verdict.' },
  { id: 'static-hornet', name: 'Static Hornet', emoji: '🐝', hp: 7, atk: 4, def: 0, spd: 5, xp: 3, gold: 2, aggro: 8, tier: 'minion', behavior: 'swarmer', behaviorParams: {}, floors: { min: 2, max: 5 }, themes: { metallic_ship: 3, ash: 1 }, weight: 3, model: 'plagueRats', sprite: 'crypt-jackal', blurb: 'Crackles like a bad antenna and stings like one too.' },
  { id: 'ink-scribe', name: 'Ink Scribe', emoji: '✒️', hp: 20, atk: 5, def: 0, spd: 2, xp: 8, gold: 6, aggro: 4, tier: 'elite', behavior: 'caster', behaviorParams: { boltSpeed: 200, volley: 2 }, floors: { min: 3, max: 6 }, themes: { citadel_darkness: 3, treasury: 1 }, weight: 2, model: 'graveMage', sprite: 'marrow-priest', blurb: 'Writes your name down, then underlines it twice.' },
  { id: 'bellhop-ghoul', name: 'Bellhop Ghoul', emoji: '🛎️', hp: 22, atk: 5, def: 1, spd: 4, xp: 7, gold: 5, aggro: 7, tier: 'minion', behavior: 'charger', behaviorParams: { telegraphMs: 500, dashSpeedMul: 2.0 }, floors: { min: 1, max: 3 }, themes: { stone_crypt: 2, treasury: 2, crypt: 2 }, weight: 3, model: 'skeletonBrute', sprite: 'crypt-jackal', blurb: 'Rings its little bell and rushes your luggage.' },
  { id: 'patchwork-page', name: 'Patchwork Page', emoji: '📜', hp: 18, atk: 3, def: 0, spd: 2, xp: 8, gold: 5, aggro: 4, tier: 'minion', behavior: 'summoner', behaviorParams: { summonIds: ['marrow-mote'], summonCdMs: 6000 }, floors: { min: 2, max: 5 }, themes: { citadel_darkness: 2, crypt: 2 }, weight: 2, model: 'cryptWraith', sprite: 'marrow-priest', blurb: 'Reads bad footnotes aloud until help arrives.' },
  { id: 'wick-keeper', name: 'Wick Keeper', emoji: '🕯️', hp: 26, atk: 4, def: 1, spd: 2, xp: 9, gold: 7, aggro: 4, tier: 'elite', behavior: 'healer', behaviorParams: { healRadius: 140, healPerSec: 3 }, floors: { min: 3, max: 6 }, themes: { dwarven_vault: 3, stone_crypt: 1 }, weight: 2, model: 'sarcophagusSentinel', sprite: 'tide-caller', blurb: 'Trims every wick on the field, friend or foe willing.' },
  { id: 'thunder-drummer', name: 'Thunder Drummer', emoji: '🥁', hp: 28, atk: 7, def: 1, spd: 2, xp: 9, gold: 6, aggro: 6, tier: 'brute', behavior: 'bomber', behaviorParams: { blastRadius: 110, fuseMs: 800 }, floors: { min: 4, max: 7 }, themes: { orc_wastes: 3, ash: 2 }, weight: 2, model: 'marrowGolem', sprite: 'storm-sire', blurb: 'Its finale is one enormous drum solo. Duck.' },
  { id: 'mist-warden', name: 'Mist Warden', emoji: '🌁', hp: 30, atk: 5, def: 2, spd: 2, xp: 10, gold: 7, aggro: 5, tier: 'elite', behavior: 'phaser', behaviorParams: { blinkRange: 200, blinkCdMs: 4000 }, floors: { min: 4, max: 7 }, themes: { brine: 3, citadel_darkness: 2 }, weight: 2, model: 'voidRevenant', sprite: 'storm-sire', blurb: 'Patrols two places at once; both of them behind you.' },
  { id: 'copper-magpie', name: 'Copper Magpie', emoji: '🐦', hp: 11, atk: 4, def: 0, spd: 5, xp: 4, gold: 5, aggro: 6, tier: 'minion', behavior: 'lurker', behaviorParams: { ambushMul: 1.5 }, floors: { min: 1, max: 4 }, themes: { treasury: 3, metallic_ship: 2 }, weight: 3, model: 'groveWisp', sprite: 'crypt-jackal', blurb: 'Steals shiny things, starting with your attention.' },
  { id: 'festival-mask', name: 'Festival Mask', emoji: '🎭', hp: 22, atk: 5, def: 0, spd: 3, xp: 8, gold: 6, aggro: 6, tier: 'elite', behavior: 'splitter', behaviorParams: { splitInto: 'marrow-mote', splitCount: 3 }, floors: { min: 4, max: 7 }, themes: { elven_grove: 2, orc_wastes: 2, crypt: 1 }, weight: 2, model: 'voidRevenant', sprite: 'gilt-sentinel', blurb: 'Every grin hides two smaller grins.' },
  { id: 'tide-usher', name: 'Tide Usher', emoji: '🌊', hp: 24, atk: 4, def: 1, spd: 2, xp: 8, gold: 6, aggro: 5, tier: 'elite', behavior: 'summoner', behaviorParams: { summonIds: ['marrow-mote', 'static-hornet'], summonCdMs: 7000 }, floors: { min: 4, max: 8 }, themes: { brine: 3, toxic_catacombs: 2 }, weight: 2, model: 'graveMage', sprite: 'tide-caller', blurb: 'Shows latecomers to their seats. Latecomers bite.' },
  { id: 'gate-crier', name: 'Gate Crier', emoji: '📯', hp: 70, atk: 7, def: 2, spd: 2, xp: 20, gold: 25, aggro: 9, tier: 'boss', behavior: 'charger', behaviorParams: { telegraphMs: 900, dashSpeedMul: 2.2 }, floors: { min: 6, max: 9 }, themes: { stone_crypt: 2, citadel_darkness: 2, orc_wastes: 1 }, weight: 1, model: 'sarcophagusSentinel', sprite: 'cinder-colossus', blurb: 'Announces the gate in a voice like a falling portcullis.' }
];

var ENEMIES = LEGACY.concat(NEWCOMERS);

var byIdMap = {};
try {
  for (var bi = 0; bi < ENEMIES.length; bi++) byIdMap[ENEMIES[bi].id] = ENEMIES[bi];
} catch (e) { /* map optional */ }

/* ---------------- behaviors (tuning + neutral FX descriptors) ---------------- */
var BEHAVIORS = {
  charger:  { name: 'Charger',  desc: 'Telegraphs, then dashes in a straight line.', fx: { kind: 'dust', color: '#d6c48a' } },
  splitter: { name: 'Splitter', desc: 'Releases smaller foes when defeated.', fx: { kind: 'mote', color: '#b7e4c7' } },
  healer:   { name: 'Healer',   desc: 'Restores nearby allies over time.', fx: { kind: 'glow', color: '#86efac' } },
  bomber:   { name: 'Bomber',   desc: 'Detonates a telegraphed blast near its target.', fx: { kind: 'flash', color: '#fdba74' } },
  phaser:   { name: 'Phaser',   desc: 'Blinks to a nearby position on cooldown.', fx: { kind: 'mist', color: '#c4b5fd' } },
  chaser:   { name: 'Chaser',   desc: 'Steady pursuit at its listed speed.', fx: { kind: 'dust', color: '#d6c48a' } },
  swarmer:  { name: 'Swarmer',  desc: 'Fast, fragile, arrives in groups.', fx: { kind: 'mote', color: '#e7e5e4' } },
  brute:    { name: 'Brute',    desc: 'Slow, sturdy, hits hard up close.', fx: { kind: 'dust', color: '#a8a29e' } },
  caster:   { name: 'Caster',   desc: 'Keeps distance and throws slow bolts.', fx: { kind: 'spark', color: '#a78bfa' } },
  lurker:   { name: 'Lurker',   desc: 'Holds still, then ambushes at close range.', fx: { kind: 'mist', color: '#94a3b8' } },
  summoner: { name: 'Summoner', desc: 'Calls listed reinforcements on cooldown.', fx: { kind: 'spark', color: '#7dd3fc' } },
  boss:     { name: 'Boss',     desc: 'Gate boss: layered phases, no single trick.', fx: { kind: 'flash', color: '#fbbf24' } }
};

/* ---------------- elite modifiers ---------------- */
var ELITE_MODS = [
  { id: 'ember-veined',  name: 'Ember-Veined',  hpMul: 1.0, atkMul: 1.3, defAdd: 0, spdMul: 1.1, xpMul: 1.5, goldMul: 1.25, minFloor: 2, weight: 3 },
  { id: 'stone-plated',  name: 'Stone-Plated',  hpMul: 1.6, atkMul: 1.0, defAdd: 2, spdMul: 0.85, xpMul: 1.5, goldMul: 1.25, minFloor: 2, weight: 3 },
  { id: 'moon-touched',  name: 'Moon-Touched',  hpMul: 1.1, atkMul: 1.0, defAdd: 0, spdMul: 1.0, xpMul: 2.0, goldMul: 2.0, minFloor: 3, weight: 2 },
  { id: 'vast',          name: 'Vast',          hpMul: 2.2, atkMul: 1.2, defAdd: 0, spdMul: 0.9, xpMul: 2.0, goldMul: 1.5, minFloor: 4, weight: 2 },
  { id: 'swift',         name: 'Swift',         hpMul: 0.8, atkMul: 1.0, defAdd: 0, spdMul: 1.4, xpMul: 1.25, goldMul: 1.0, minFloor: 1, weight: 3 },
  { id: 'warded',        name: 'Warded',        hpMul: 1.3, atkMul: 1.0, defAdd: 3, spdMul: 1.0, xpMul: 1.75, goldMul: 1.5, minFloor: 3, weight: 2 }
];

/* ---------------- small utils (pure, never throw) ---------------- */
function toInt(v, fallback) {
  var n = parseInt(v, 10);
  return (isFinite(n) ? n : fallback);
}

function hashStr(s) {
  var h = 2166136261;
  s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

function mulberry32(seed) {
  var a = seed | 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngOf(randFn) {
  try {
    if (typeof randFn === 'function') {
      var r = randFn();
      if (r >= 0 && r < 1) return r;
    }
  } catch (e) { /* fall through */ }
  return Math.random();
}

function byId(id) {
  try {
    if (byIdMap && Object.prototype.hasOwnProperty.call(byIdMap, id)) return byIdMap[id];
    for (var i = 0; i < ENEMIES.length; i++) if (ENEMIES[i].id === id) return ENEMIES[i];
  } catch (e) { /* never throw */ }
  return null;
}

function byTier(tier) {
  var out = [];
  try {
    for (var i = 0; i < ENEMIES.length; i++) if (ENEMIES[i].tier === tier) out.push(ENEMIES[i]);
  } catch (e) { /* never throw */ }
  return out;
}

function byBehavior(behavior) {
  var out = [];
  try {
    for (var i = 0; i < ENEMIES.length; i++) if (ENEMIES[i].behavior === behavior) out.push(ENEMIES[i]);
  } catch (e) { /* never throw */ }
  return out;
}

function randomOf(tier, randFn) {
  try {
    var pool = tier ? byTier(tier) : ENEMIES.slice();
    if (!pool.length) return null;
    var idx = Math.floor(rngOf(randFn) * pool.length) % pool.length;
    return pool[idx];
  } catch (e) { return null; }
}

/* ---------------- spawn tables (floor ranges x theme weights) ---------------- */
function effWeight(def, theme) {
  try {
    var base = (typeof def.weight === 'number' && def.weight > 0) ? def.weight : 1;
    if (!theme) return base;
    if (def.themes && typeof def.themes[theme] === 'number') return base * def.themes[theme];
    return base * 0.5; // off-theme drift: rare but possible
  } catch (e) { return 1; }
}

function eligibleFor(floor) {
  var out = [];
  try {
    var f = toInt(floor, 1);
    for (var i = 0; i < ENEMIES.length; i++) {
      var d = ENEMIES[i];
      var lo = (d.floors && typeof d.floors.min === 'number') ? d.floors.min : 1;
      var hi = (d.floors && typeof d.floors.max === 'number') ? d.floors.max : 99;
      if (f >= lo && f <= hi) out.push(d);
    }
    if (!out.length) out = ENEMIES.slice(); // legacy rows carry no floors: never empty
  } catch (e) { out = ENEMIES.slice(); }
  return out;
}

function weightedPick(pool, theme, randFn) {
  try {
    if (!pool || !pool.length) return null;
    var total = 0, i;
    var ws = [];
    for (i = 0; i < pool.length; i++) { var w = effWeight(pool[i], theme); ws.push(w); total += w; }
    if (!(total > 0)) return pool[0];
    var r = rngOf(randFn) * total;
    for (i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  } catch (e) { return pool && pool.length ? pool[0] : null; }
}

var spawnTable = {
  forFloor: function (floor) {
    try {
      var f = toInt(floor, 1);
      return eligibleFor(f).map(function (d) {
        return { id: d.id, weight: (typeof d.weight === 'number' && d.weight > 0) ? d.weight : 1 };
      });
    } catch (e) { return []; }
  },
  forTheme: function (theme) {
    var out = [];
    try {
      for (var i = 0; i < ENEMIES.length; i++) {
        var d = ENEMIES[i];
        if (d.themes && typeof d.themes[theme] === 'number') out.push({ id: d.id, weight: d.themes[theme] });
      }
    } catch (e) { /* never throw */ }
    return out;
  },
  pick: function (floor, theme, randFn) {
    try { return weightedPick(eligibleFor(floor), theme || null, randFn); }
    catch (e) { return null; }
  }
};

/* ---------------- elite modifiers ---------------- */
function eliteFor(floor) {
  var out = [];
  try {
    var f = toInt(floor, 1);
    for (var i = 0; i < ELITE_MODS.length; i++) if (f >= ELITE_MODS[i].minFloor) out.push(ELITE_MODS[i]);
  } catch (e) { /* never throw */ }
  return out;
}

function applyElite(def, mod) {
  try {
    if (!def || !mod) return def;
    var c = {};
    for (var k in def) if (Object.prototype.hasOwnProperty.call(def, k)) c[k] = def[k];
    c.hp = Math.max(1, Math.round(def.hp * (mod.hpMul || 1)));
    c.atk = Math.max(1, Math.round(def.atk * (mod.atkMul || 1)));
    c.def = (def.def || 0) + (mod.defAdd || 0);
    c.spd = Math.max(1, Math.round(def.spd * (mod.spdMul || 1)));
    c.xp = Math.max(1, Math.round(def.xp * (mod.xpMul || 1)));
    c.gold = Math.max(0, Math.round(def.gold * (mod.goldMul || 1)));
    c.elite = mod.id;
    c.name = mod.name + ' ' + def.name;
    if (c.behaviorParams && typeof c.behaviorParams === 'object') {
      var bp = {};
      for (var b in c.behaviorParams) if (Object.prototype.hasOwnProperty.call(c.behaviorParams, b)) bp[b] = c.behaviorParams[b];
      c.behaviorParams = bp;
    }
    return c;
  } catch (e) { return def; }
}

function rollElite(def, floor, randFn) {
  try {
    if (!def || def.tier === 'boss') return null;
    var f = toInt(floor, 1);
    var chance = f >= 6 ? 0.25 : f >= 3 ? 0.15 : 0.08;
    if (rngOf(randFn) > chance) return null;
    var pool = eliteFor(f);
    if (!pool.length) return null;
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += pool[i].weight || 1;
    var r = rngOf(randFn) * total;
    for (i = 0; i < pool.length; i++) { r -= (pool[i].weight || 1); if (r <= 0) return applyElite(def, pool[i]); }
    return applyElite(def, pool[pool.length - 1]);
  } catch (e) { return null; }
}

/* ---------------- per-game row converters ----------------
 * 2D rows match EnemyTypes in gravegain2d/game.js; 3D rows match the eData
 * shape consumed by EnemyEntity in gravegain3d; 1D rows match KINDS in
 * gravegain1d/game.js. All converters are pure data maps. */
function speed2D(spd) { return 55 + (toInt(spd, 2) * 22); } // spd1->77 … spd5->165

function toRow2D(def) {
  try {
    if (!def) return null;
    var type = 'standard';
    if (def.tier === 'boss') type = 'boss';
    else if (def.tier === 'elite') type = 'elite';
    else if (def.behavior === 'bomber') type = 'exploding';
    return {
      name: def.name, emoji: def.emoji, hp: def.hp, dmg: def.atk,
      speed: speed2D(def.spd), type: type, blood: 'red',
      armored: (def.def || 0) >= 2,
      ranged: (def.behavior === 'caster' || def.behavior === 'phaser' || def.behavior === 'bomber'),
      summoner: (def.behavior === 'summoner'),
      spriteId: def.sprite || null, accent: def.emoji, bestiaryId: def.id
    };
  } catch (e) { return null; }
}

function toRow3D(def) {
  try {
    if (!def) return null;
    var kind = 'skeleton';
    if (def.behavior === 'bomber') kind = 'skull';
    else if (def.behavior === 'caster' || def.behavior === 'healer' || def.behavior === 'summoner') kind = 'mage';
    var scale = 1.0;
    if (def.tier === 'minion') scale = 0.8;
    else if (def.tier === 'brute') scale = 1.15;
    else if (def.tier === 'boss') scale = 1.5;
    return {
      name: def.name, hp: def.hp, dmg: def.atk, speed: speed2D(def.spd),
      scale: scale, armored: (def.def || 0) >= 2, type: kind,
      model: def.model || null, emoji: def.emoji, bestiaryId: def.id
    };
  } catch (e) { return null; }
}

function toKind1D(def) {
  try {
    if (!def) return null;
    return {
      name: def.name, emoji: def.emoji, hp: def.hp, atk: def.atk,
      def: def.def || 0, spd: def.spd, aggro: (typeof def.aggro === 'number' ? def.aggro : 5),
      xp: def.xp, gold: def.gold, bestiaryId: def.id
    };
  } catch (e) { return null; }
}

/* 1D helper: converted extra rows per sector index (0-4, then endless cycles).
 * Returned rows are standalone KINDS-shaped objects for the wiring lane —
 * this file never mutates SECTORS spawn arrays (unknown kind ids would crash
 * spawnSector's KINDS lookup). */
var SECTOR_FLOOR = [1, 2, 3, 4, 5];
function sectorExtras(sectorIdx) {
  var out = [];
  try {
    var idx = toInt(sectorIdx, 0);
    if (idx < 0) idx = 0;
    if (idx > 4) idx = 4;
    var floor = SECTOR_FLOOR[idx];
    var pool = eligibleFor(floor);
    var n = Math.min(3, pool.length);
    var rng = mulberry32((0xBE57 + idx * 97) | 0);
    for (var i = 0; i < n; i++) {
      var d = pool[Math.floor(rng() * pool.length)];
      var row = toKind1D(d);
      if (row) out.push(row);
    }
  } catch (e) { /* never throw */ }
  return out;
}

/* ---------------- FX descriptors (G7/gore lanes do the drawing) ---------------- */
function fxFor(behaviorId) {
  try {
    var b = BEHAVIORS[behaviorId];
    if (b && b.fx) return { kind: b.fx.kind, color: b.fx.color };
  } catch (e) { /* never throw */ }
  return { kind: 'dust', color: '#d6c48a' };
}

/* Best-effort kill-FX routing: delegates to the gore director when present,
 * otherwise a silent no-op. Same call in every age band (neutral descriptor). */
function playDeathFx(x, y, behaviorId) {
  var desc = fxFor(behaviorId);
  try {
    var G = null;
    try { G = window.FourweirdGore || null; } catch (e0) { G = null; }
    if (G && typeof G.spawn === 'function') {
      try { G.spawn({ x: x, y: y, behavior: behaviorId, fx: desc }); } catch (e1) { /* director-owned */ }
    }
  } catch (e) { /* never throw */ }
  return desc;
}

/* ---------------- endless-lane compat (gravegain2d-endless.js) ---------------- */
var lastEndlessSnapshot = null;
function noteEndlessFloor(snapshot) {
  try { lastEndlessSnapshot = snapshot || null; return true; }
  catch (e) { return false; }
}

/* Deterministic variant pick for a (seed, cycle) pair. Non-numeric inputs
 * (e.g. the endless lane's boss object) are string-hashed first. Higher
 * cycles bias toward higher-threat tiers. */
function pickVariant(seed, cycle) {
  try {
    var s = (typeof seed === 'number' && isFinite(seed)) ? (seed | 0) : (hashStr(typeof seed === 'object' ? JSON.stringify(seed) : String(seed)) | 0);
    var c = toInt(cycle, 0);
    if (c < 0) c = 0;
    var rng = mulberry32((s ^ Math.imul(c + 1, 2654435761)) | 0);
    var minXp = c >= 4 ? 9 : c >= 2 ? 6 : 1;
    var pool = [];
    for (var i = 0; i < ENEMIES.length; i++) if ((ENEMIES[i].xp || 0) >= minXp) pool.push(ENEMIES[i]);
    if (!pool.length) pool = ENEMIES.slice();
    return pool[Math.floor(rng() * pool.length) % pool.length];
  } catch (e) { return ENEMIES.length ? ENEMIES[0] : null; }
}

/* ---------------- best-effort runtime registration ---------------- */
function hookAmbient2D(game) {
  try {
    if (!game || game.__ggBestiaryAmbient) return game && game.__ggBestiaryAmbient === true;
    if (typeof game.getAmbientEnemyType !== 'function') return false;
    var orig = game.getAmbientEnemyType.bind(game);
    game.getAmbientEnemyType = function () {
      var fallback = null;
      try { fallback = orig(); } catch (e0) { fallback = null; }
      try {
        var floor = (typeof game.floorIndex === 'number') ? game.floorIndex : 1;
        if (Math.random() < 0.22) {
          var d = spawnTable.pick(floor, null, Math.random);
          d = rollElite(d, floor, Math.random) || d;
          var row = toRow2D(d);
          if (row) return row;
        }
      } catch (e1) { /* fall through to vanilla */ }
      return fallback;
    };
    game.__ggBestiaryAmbient = true;
    try {
      if (!game.bestiaryIds) game.bestiaryIds = ENEMIES.map(function (d) { return d.id; });
    } catch (e2) { /* additive id list optional */ }
    return true;
  } catch (e) { return false; }
}

function hookMobs3D() {
  try {
    var EE = null;
    try { EE = window.GraveGainEnemyEntity || null; } catch (e0) { EE = null; }
    if (!EE || EE.__ggBestiaryMobs || typeof EE.mobsForTheme !== 'function') return !!(EE && EE.__ggBestiaryMobs);
    var orig = EE.mobsForTheme;
    EE.mobsForTheme = function (theme) {
      var pool = null;
      try { pool = orig.call(EE, theme); } catch (e1) { pool = null; }
      if (!Array.isArray(pool)) pool = [];
      try {
        if (Math.random() < 0.35) {
          var d = spawnTable.pick(3, theme, Math.random);
          var row = toRow3D(d);
          if (row) pool.push(row);
        }
      } catch (e2) { /* vanilla pool stands */ }
      return pool;
    };
    EE.__ggBestiaryMobs = true;
    return true;
  } catch (e) { return false; }
}

function hookRef1D() {
  try {
    var G1 = null;
    try { G1 = window.GraveGain1D || null; } catch (e0) { G1 = null; }
    if (!G1 || G1.__ggBestiary) return !!(G1 && G1.__ggBestiary);
    try { G1.bestiary = api; } catch (e1) { return false; }
    G1.__ggBestiary = true;
    return true;
  } catch (e) { return false; }
}

function install() {
  var res = { hooked2D: false, hooked3D: false, hooked1D: false };
  try {
    var G = null;
    try { G = window.GraveGainGame || null; } catch (e0) { G = null; }
    if (G) res.hooked2D = hookAmbient2D(G);
    res.hooked3D = hookMobs3D();
    res.hooked1D = hookRef1D();
  } catch (e) { /* best-effort; data stays usable standalone */ }
  return res;
}

/* Capped install polling: ~1s cadence, pauses while hidden, stops after
 * 60 tries or once every present game is hooked. No listeners, no DOM. */
function startPolling() {
  var attempts = 0;
  try {
    try { install(); } catch (e0) { /* retry below */ }
    var timer = setInterval(function () {
      attempts += 1;
      try {
        var hidden = false;
        try { hidden = (typeof document !== 'undefined' && document.hidden) ? true : false; } catch (e1) { hidden = false; }
        if (!hidden) {
          var r = install();
          var G = null, EE = null, G1 = null;
          try { G = window.GraveGainGame || null; } catch (e2) { G = null; }
          try { EE = window.GraveGainEnemyEntity || null; } catch (e3) { EE = null; }
          try { G1 = window.GraveGain1D || null; } catch (e4) { G1 = null; }
          var settled = true;
          if (G && !r.hooked2D) settled = false;
          if (EE && typeof EE.mobsForTheme === 'function' && !r.hooked3D) settled = false;
          if (G1 && !r.hooked1D) settled = false;
          if (settled || attempts >= 60) clearInterval(timer);
        } else if (attempts >= 60) {
          clearInterval(timer);
        }
      } catch (e5) {
        if (attempts >= 60) clearInterval(timer);
      }
    }, 1000);
  } catch (e) { /* dormant until wiring calls install */ }
}

var api = null;
try {
  api = {
    VERSION: VERSION,
    enemies: ENEMIES,
    behaviors: BEHAVIORS,
    eliteMods: ELITE_MODS,
    spawnTable: spawnTable,
    byId: byId,
    byTier: byTier,
    byBehavior: byBehavior,
    randomOf: randomOf,
    pickVariant: pickVariant,
    noteEndlessFloor: noteEndlessFloor,
    lastEndlessSnapshot: function () { return lastEndlessSnapshot; },
    eliteFor: eliteFor,
    applyElite: applyElite,
    rollElite: rollElite,
    toRow2D: toRow2D,
    toRow3D: toRow3D,
    toKind1D: toKind1D,
    sectorExtras: sectorExtras,
    fxFor: fxFor,
    playDeathFx: playDeathFx,
    install: install
  };
  window.GraveGainBestiary = api;
  try {
    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({ name: 'gravegain-bestiary', version: VERSION, init: install });
  } catch (e2) { /* registry optional */ }
  try { startPolling(); } catch (e3) { /* dormant until wiring calls install */ }
} catch (e) { /* never throw */ }

})();
