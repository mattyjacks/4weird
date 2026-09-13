// GraveGain big-upgrade catalog (v2 layer, slug-aware).
//
// Mirrors the BIG-UPGRADE wiring block in scripts/sync-game-bundles.mjs
// (the runtime overlay files served at /games/html/*) for server-side
// consumers (PlayGate copy, docs, guides). The .js files are the runtime
// truth; this module is the catalog truth.
//
// Age-band contract (same graphics everywhere EXCEPT gore/drugs):
// kid = NO blood (rainbow/sparkles/POOF), teen = red blood spray + fading
// floor decals (NO gibs), all (18+) = over-the-top gore + moonleaf/dreamcap
// usable. Mode source priority: URL ?content= > localStorage
// 4weird-content-mode:<slug> > window.FourweirdContentMode >
// fourweird-content-mode event > teen.
//
// LOCATION: content/ owns per-game data (see gravegain-saga-plus.ts,
// gravegain-arsenal.ts, gravegain-emergent.ts). Pure data; no runtime deps.

export const GRAVEGAIN_BIGUPGRADE_VERSION = "1.0.0";

/** Runtime overlay files wired into the gravegain2d bundle (load order). */
export const RUNTIME_FILES_2D: readonly string[] = [
  "gravegain-arsenal.js",
  "gravegain-arsenal2d.js",
  "gravegain-bestiary.js",
  "gravegain-emergent.js",
  "gravegain-graphics-2d.js",
  "gravegain-25d.js",
  "gravegain-gore-tiers.js",
  "gravegain-agegore.js",
  "gravegain-perf.js",
];

/** Runtime overlay files wired into the gravegain3d bundle (load order). */
export const RUNTIME_FILES_3D: readonly string[] = [
  "gravegain-arsenal.js",
  "gravegain-arsenal3d.js",
  "gravegain-bestiary.js",
  "gravegain-bestiary3d.js",
  "gravegain-emergent.js",
  "gravegain-graphics-3d.js",
  "gravegain-gore-tiers.js",
  "gravegain-agegore.js",
  "gravegain-voxgore.js",
  "gravegain-perf.js",
];

/** Runtime overlay files wired into the gravegain1d bundle (load order). */
export const RUNTIME_FILES_1D: readonly string[] = [
  "gravegain-graphics-1d.js",
  "gravegain-1dart.js",
  "gravegain-arsenal.js",
  "gravegain-arsenal2d.js",
  "gravegain-bestiary.js",
  "gravegain-emergent.js",
  "gravegain-agegore.js",
  "gravegain-perf.js",
];

export interface BigUpgradeAgeBandRule {
  mode: "kid" | "teen" | "all";
  gore: string;
  drugs: string;
}

/** Kid/teen/all gore + drugs matrix (same graphics for all bands). */
export const AGE_BAND_RULES: readonly BigUpgradeAgeBandRule[] = [
  {
    mode: "kid",
    gore: "NO blood. Kills burst into rainbow sparkles with a soft POOF; nothing dismembers.",
    drugs: "Moonleaf/dreamcap visible only as inert glowcap lantern plants. No grow action, no use action.",
  },
  {
    mode: "teen",
    gore: "Blood-minimal: red blood spray + fading floor decals. NO gibs, NO dismemberment.",
    drugs: "Glowlamp cultivars only: lights the hub, flavors nothing. No grow action, no use action.",
  },
  {
    mode: "all",
    gore: "Voxel-overkill: chunky voxel gibs, persistent decals, per-entity damage states.",
    drugs: "Moonleaf/dreamcap growable in the Botany Station and usable (chew buff). 18+ only.",
  },
];

export interface BigUpgradeWeaponSpotlight {
  id: string;
  name: string;
  emoji: string;
}

/** Six signature weapons for PlayGate/docs consumers. */
export const WEAPON_SPOTLIGHT: readonly BigUpgradeWeaponSpotlight[] = [
  { id: "rusty-shovel", name: "Rusty Shovel", emoji: "⛏️" },
  { id: "golem-hammer", name: "Golem Hammer", emoji: "🔨" },
  { id: "hex-bow", name: "Hex Bow", emoji: "🏹" },
  { id: "relay-coil", name: "Relay Coil", emoji: "⚡" },
  { id: "dreamcap-club", name: "Dreamcap Club", emoji: "🍄" },
  { id: "titan-slayer", name: "Titan Slayer", emoji: "💣" },
];

export interface BigUpgradeEnemySpotlight {
  kind: string;
  name: string;
  emoji: string;
}

/** Six signature foes for PlayGate/docs consumers. */
export const ENEMY_SPOTLIGHT: readonly BigUpgradeEnemySpotlight[] = [
  { kind: "shambler", name: "Gravegain Shambler", emoji: "🧟" },
  { kind: "swarm", name: "Skull Swarm", emoji: "💀" },
  { kind: "brute", name: "Crypt Brute", emoji: "👹" },
  { kind: "necro", name: "Elven Necromancer", emoji: "🧙" },
  { kind: "golem", name: "Toxic Chem-Golem", emoji: "🧪" },
  { kind: "titan", name: "Necro-Array Titan", emoji: "🗼" },
];

export interface BigUpgradeQuestSpotlight {
  id: string;
  title: string;
  emoji: string;
}

/** Six signature side quests for PlayGate/docs consumers. */
export const QUEST_SPOTLIGHT: readonly BigUpgradeQuestSpotlight[] = [
  { id: "lost-helmet", title: "Lost Helmet", emoji: "🪖" },
  { id: "hungry-warchief", title: "Hungry Warchief", emoji: "🍲" },
  { id: "ghost-lanterns", title: "Ghost Lanterns", emoji: "🏮" },
  { id: "grave-gardener", title: "Grave Gardener", emoji: "🌸" },
  { id: "sparkite-debt", title: "Sparkite Debt", emoji: "⛏️" },
  { id: "nix-brave", title: "Nix the Brave", emoji: "🦊" },
];
