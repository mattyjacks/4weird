// GraveGain4D arsenal catalog data (v2 layer, slug gravegain4d ONLY).
//
// Mirrors content/gravegain-arsenal.ts item-shape conventions for
// server-side consumers (docs, PlayGate copy, guides): every entry carries
// an id, display name, emoji, advisory stats, always-visible kid-safe
// flavor, a described (words, not numbers) unlock tier, and an upgrade
// path. Canon flavor follows content/gravegain4d-lore.ts: Dr. Lucifer
// Hades + the Hades Array, President Angel Good, Queen Aelindra, Warchief
// Groknak, Lisa Park, Elder Mirathiel, and the folded-timeline premise
// (every mission fought across parallel folds; echoes show what your
// parallel self just did).
//
// LOCATION: content/ owns per-game data. Parity-locked bundles are
// never touched. Named exports only.

export const GRAVEGAIN4D_ARSENAL_VERSION = "1.0.0";

/** localStorage key used by the 4D runtime overlay. */
export const GRAVEGAIN4D_ARSENAL_SAVE_KEY = "gravegain4d_arsenal_v1";

export type GG4DItemSlot = "melee" | "ranged" | "fold" | "armor" | "charm" | "golf";

export type GG4DClassId = "rifleman" | "sapper" | "runner";

export interface GG4DArsenalItem {
  id: string;
  name: string;
  emoji: string;
  slot: GG4DItemSlot;
  /** Advisory rating (display only — the overlay never patches core damage). */
  dmg: number;
  /** Range in tiles (0 for armor/charms, which protect rather than strike). */
  range: number;
  /** Cooldown in seconds (0 for armor/charms, which are always on). */
  cooldown: number;
  /** Advisory protection rating (0 for weapons). */
  protection: number;
  /** Always-visible, kid-safe copy. */
  flavor: string;
  /** Unlock tier, described in words (never a bare number). */
  unlockTier: string;
  /** Upgrade chain from base to final form, as item ids in order. */
  upgradePath: readonly string[];
  /** Suggested classes. */
  classes: GG4DClassId[];
}

/** Full pool: melee, ranged, 4D-fold arms, armor/charms, golf crossovers. */
export const GG4D_ITEMS: readonly GG4DArsenalItem[] = [
  // ---- Melee: fold-blades ----
  {
    id: "fold-blade",
    name: "Fold-Blade",
    emoji: "🗡️",
    slot: "melee",
    dmg: 5,
    range: 1,
    cooldown: 0.8,
    protection: 0,
    flavor: "Valley Net training edge tuned to cut across folds. Your echo swings half a heartbeat behind you.",
    unlockTier: "Unlocks early, around the LZ Crash Site folds",
    upgradePath: ["fold-blade", "echo-fold-blade"],
    classes: ["rifleman", "runner"],
  },
  {
    id: "echo-fold-blade",
    name: "Echo Fold-Blade",
    emoji: "⚔️",
    slot: "melee",
    dmg: 8,
    range: 1,
    cooldown: 0.7,
    protection: 0,
    flavor: "Fold-Blade re-forged with Mother Tree ward-thread. Every swing lands here AND in the next fold over.",
    unlockTier: "Unlocks mid-journey, around the Elven Grove folds",
    upgradePath: ["fold-blade", "echo-fold-blade"],
    classes: ["rifleman", "runner"],
  },
  // ---- Melee: ossuary mauls ----
  {
    id: "ossuary-maul",
    name: "Ossuary Maul",
    emoji: "🔨",
    slot: "melee",
    dmg: 9,
    range: 1,
    cooldown: 1.8,
    protection: 0,
    flavor: "Borin's ancestor-pattern forge head, heavy with honor. Breaks risen anchors, doors, arguments.",
    unlockTier: "Unlocks early, around the Colony Alpha folds",
    upgradePath: ["ossuary-maul", "warden-ossuary-maul"],
    classes: ["sapper"],
  },
  {
    id: "warden-ossuary-maul",
    name: "Warden Ossuary Maul",
    emoji: "🗿",
    slot: "melee",
    dmg: 12,
    range: 1,
    cooldown: 2.1,
    protection: 1,
    flavor: "Vault-Warden knuckle casting folded into the maul head. Slow. Final. The echo carries it with you.",
    unlockTier: "Unlocks late, around the Dwarven Vault folds",
    upgradePath: ["ossuary-maul", "warden-ossuary-maul"],
    classes: ["sapper"],
  },
  // ---- Ranged: echo longbows ----
  {
    id: "echo-longbow",
    name: "Echo Longbow",
    emoji: "🏹",
    slot: "ranged",
    dmg: 6,
    range: 5,
    cooldown: 1.2,
    protection: 0,
    flavor: "Grove-runner recurve strung with ward-thread. The arrow flies here; its echo flies in the parallel fold.",
    unlockTier: "Unlocks early, around the Elven Grove folds",
    upgradePath: ["echo-longbow", "far-echo-longbow"],
    classes: ["runner"],
  },
  {
    id: "far-echo-longbow",
    name: "Far-Echo Longbow",
    emoji: "🌠",
    slot: "ranged",
    dmg: 8,
    range: 7,
    cooldown: 1.4,
    protection: 0,
    flavor: "Queen Aelindra's fletchers sighted it across three timelines. Patient, quiet, and very far-reaching.",
    unlockTier: "Unlocks late, around the Observatory folds",
    upgradePath: ["echo-longbow", "far-echo-longbow"],
    classes: ["runner"],
  },
  // ---- Ranged: array-spike throwers ----
  {
    id: "array-spike-thrower",
    name: "Array-Spike Thrower",
    emoji: "🔱",
    slot: "ranged",
    dmg: 7,
    range: 4,
    cooldown: 1.3,
    protection: 0,
    flavor: "Salvaged Hades Array tine, re-tuned to disrupt the risen. Throws folded spikes that snap back to hand.",
    unlockTier: "Unlocks mid-journey, around the Wastes relay folds",
    upgradePath: ["array-spike-thrower", "hades-spike-repeater"],
    classes: ["rifleman", "sapper"],
  },
  {
    id: "hades-spike-repeater",
    name: "Hades Spike Repeater",
    emoji: "⚡",
    slot: "ranged",
    dmg: 9,
    range: 4,
    cooldown: 1.0,
    protection: 0,
    flavor: "Lisa Park's relay crew wired three tines into one crank. Dr. Hades built the Array; the colony aims it back.",
    unlockTier: "Unlocks late, around the Gate folds",
    upgradePath: ["array-spike-thrower", "hades-spike-repeater"],
    classes: ["rifleman"],
  },
  // ---- 4D-fold arms: W-lances ----
  {
    id: "w-lance",
    name: "W-Lance",
    emoji: "🍴",
    slot: "fold",
    dmg: 7,
    range: 2,
    cooldown: 1.1,
    protection: 0,
    flavor: "Twin-pronged fold lance that strikes two timelines at once — the W is for every path you could take.",
    unlockTier: "Unlocks mid-journey, around the Vault folds",
    upgradePath: ["w-lance", "twin-fold-lance"],
    classes: ["rifleman", "sapper"],
  },
  {
    id: "twin-fold-lance",
    name: "Twin-Fold Lance",
    emoji: "🔱",
    slot: "fold",
    dmg: 10,
    range: 2,
    cooldown: 1.2,
    protection: 1,
    flavor: "Elder Mirathiel's echo blessed the second prong. One thrust, two folds, zero room for the risen to hide.",
    unlockTier: "Unlocks late, around the Tomb folds",
    upgradePath: ["w-lance", "twin-fold-lance"],
    classes: ["rifleman", "sapper"],
  },
  // ---- 4D-fold arms: tesseract shields ----
  {
    id: "tesseract-shield",
    name: "Tesseract Shield",
    emoji: "🛡️",
    slot: "fold",
    dmg: 2,
    range: 1,
    cooldown: 0.9,
    protection: 8,
    flavor: "A folded cube of vault-alloy that turns blows aside into the next timeline. Groknak tested it. It held.",
    unlockTier: "Unlocks mid-journey, around the Outpost siege folds",
    upgradePath: ["tesseract-shield", "gatefold-aegis"],
    classes: ["sapper", "rifleman"],
  },
  {
    id: "gatefold-aegis",
    name: "Gatefold Aegis",
    emoji: "🏰",
    slot: "fold",
    dmg: 3,
    range: 1,
    cooldown: 1.0,
    protection: 12,
    flavor: "Shield plated with Gate-slate from the NecroGenesis threshold. Stands between the Array and everyone you guard.",
    unlockTier: "Unlocks at the end, around the Gate folds",
    upgradePath: ["tesseract-shield", "gatefold-aegis"],
    classes: ["sapper"],
  },
  // ---- Armor ----
  {
    id: "lucky-star-plate",
    name: "LuckyStar Plate",
    emoji: "🚀",
    slot: "armor",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 7,
    flavor: "President Angel Good's botany-deck hull weave. Grows a little moss where it takes a hit — a badge of honor.",
    unlockTier: "Unlocks early, around the LuckyStarShip hub folds",
    upgradePath: ["lucky-star-plate", "grove-ward-weave"],
    classes: ["rifleman", "sapper", "runner"],
  },
  {
    id: "grove-ward-weave",
    name: "Grove-Ward Weave",
    emoji: "🌿",
    slot: "armor",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 10,
    flavor: "Mother Tree barkcloth over vault-alloy. The Tree marks every defender's steps, past and future both.",
    unlockTier: "Unlocks mid-journey, around the Elven Grove folds",
    upgradePath: ["lucky-star-plate", "grove-ward-weave"],
    classes: ["runner", "rifleman"],
  },
  // ---- Charms ----
  {
    id: "seer-fang-charm",
    name: "Seer-Fang Charm",
    emoji: "📿",
    slot: "charm",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 3,
    flavor: "Elven seer fang on a ward-thread cord. Hums softly when a parallel echo is about to warn you.",
    unlockTier: "Unlocks early, around the Elven Grove folds",
    upgradePath: ["seer-fang-charm", "sparkite-luck-coin"],
    classes: ["runner", "rifleman"],
  },
  {
    id: "sparkite-luck-coin",
    name: "Sparkite Luck-Coin",
    emoji: "🪙",
    slot: "charm",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 4,
    flavor: "Deep-mine sparkite coin, warm to the touch. James Wright's stone watches over every bearer.",
    unlockTier: "Unlocks mid-journey, around the Colony Alpha folds",
    upgradePath: ["seer-fang-charm", "sparkite-luck-coin"],
    classes: ["rifleman", "sapper", "runner"],
  },
  // ---- Golf crossovers: putters statted as war-hammers ----
  {
    id: "honor-putter",
    name: "Honor Putter",
    emoji: "⛳",
    slot: "golf",
    dmg: 9,
    range: 1,
    cooldown: 1.7,
    protection: 0,
    flavor: "Tournament putter weighted like a war-hammer. Tap it gentle on the green, swing it firm in the folds.",
    unlockTier: "Unlocks mid-journey, around the Shallows links folds",
    upgradePath: ["honor-putter", "tomb-putter-magnum"],
    classes: ["sapper", "runner"],
  },
  {
    id: "tomb-putter-magnum",
    name: "Tomb Putter Magnum",
    emoji: "🏌️",
    slot: "golf",
    dmg: 11,
    range: 1,
    cooldown: 1.9,
    protection: 1,
    flavor: "Honor Putter re-shafted with catacomb bronze. Sinks long putts AND long odds against the risen.",
    unlockTier: "Unlocks late, around the Tomb folds",
    upgradePath: ["honor-putter", "tomb-putter-magnum"],
    classes: ["sapper"],
  },
  // ---- Golf crossovers: drivers statted as siege arms ----
  {
    id: "lz-driver",
    name: "LZ Driver",
    emoji: "🚀",
    slot: "golf",
    dmg: 12,
    range: 6,
    cooldown: 2.4,
    protection: 0,
    flavor: "Long-drive club ballasted like a siege arm. Tees off from the LZ and clears the whole fairway of risen.",
    unlockTier: "Unlocks late, around the Orbital Calibration folds",
    upgradePath: ["lz-driver", "gatebreaker-driver"],
    classes: ["sapper", "rifleman"],
  },
  {
    id: "gatebreaker-driver",
    name: "Gatebreaker Driver",
    emoji: "💥",
    slot: "golf",
    dmg: 14,
    range: 6,
    cooldown: 2.6,
    protection: 0,
    flavor: "LZ Driver crowned with Gate-slate. Built for one shot: straight down the middle of the NecroGenesis Gate.",
    unlockTier: "Unlocks at the end, around the Gate folds",
    upgradePath: ["lz-driver", "gatebreaker-driver"],
    classes: ["sapper"],
  },
];

export function itemById(id: string): GG4DArsenalItem | null {
  return GG4D_ITEMS.find((item) => item.id === id) ?? null;
}

export function itemsBySlot(slot: GG4DItemSlot): readonly GG4DArsenalItem[] {
  return GG4D_ITEMS.filter((item) => item.slot === slot);
}
