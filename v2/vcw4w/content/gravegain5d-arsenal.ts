// GraveGain5D arsenal catalog data (v2 layer, slug gravegain5d ONLY).
//
// Mirrors content/gravegain4d-arsenal.ts item-shape conventions for
// server-side consumers (docs, PlayGate copy, guides): every entry carries
// an id, display name, emoji, advisory stats, always-visible kid-safe
// flavor, a described (words, not numbers) unlock tier, and an upgrade
// path. Canon flavor follows content/gravegain5d-lore.ts + gravegain5d-modes.ts:
// the Sixfold Lattice (Prime, Echo, Dream, Void, Bloom, Static), paradox as
// rent, Hades collecting collapsed spares, Transcendence Cartographer Null,
// the Warden / Drifter / Putter team split, MoonRock six times over, the
// LuckyStarShip hub, and the Hades Array echoing through every universe.
// Golf crossovers statted as war-hammers (putters) and siege arms (drivers),
// with paradox anchors that vent the lattice bill.
//
// LOCATION: content/ owns per-game data. Parity-locked bundles are
// never touched. Named exports only.

export const GRAVEGAIN5D_ARSENAL_VERSION = "1.0.0";

/** localStorage key used by the 5D runtime overlay. */
export const GRAVEGAIN5D_ARSENAL_SAVE_KEY = "gravegain5d_arsenal_v1";

export type GG5DItemSlot = "melee" | "ranged" | "fold" | "armor" | "charm" | "golf";

export type GG5DClassId = "warden" | "drifter" | "putter";

export interface GG5DArsenalItem {
  id: string;
  name: string;
  emoji: string;
  slot: GG5DItemSlot;
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
  classes: GG5DClassId[];
}

/** Full pool: melee, ranged, multiverse-fold arms, armor/charms, golf crossovers. */
export const GG5D_ITEMS: readonly GG5DArsenalItem[] = [
  // ---- Melee: lattice cutlasses ----
  {
    id: "lattice-cutlass",
    name: "Lattice Cutlass",
    emoji: "🗡️",
    slot: "melee",
    dmg: 6,
    range: 1,
    cooldown: 0.9,
    protection: 0,
    flavor: "Null-charted training edge tuned to cut across the Sixfold Lattice. Your Echo-universe self swings half a heartbeat behind you.",
    unlockTier: "Unlocks early, around the Prime hub tee",
    upgradePath: ["lattice-cutlass", "echo-lattice-sabre"],
    classes: ["drifter", "putter"],
  },
  {
    id: "echo-lattice-sabre",
    name: "Echo Lattice Sabre",
    emoji: "⚔️",
    slot: "melee",
    dmg: 9,
    range: 1,
    cooldown: 0.8,
    protection: 0,
    flavor: "Lattice Cutlass re-forged with Aelindra's moonstone ward-thread. Every swing lands here AND in the Echo universe next door.",
    unlockTier: "Unlocks mid-journey, around the Echo drift holes",
    upgradePath: ["lattice-cutlass", "echo-lattice-sabre"],
    classes: ["drifter", "putter"],
  },
  // ---- Melee: MoonRock mauls ----
  {
    id: "moonrock-pick",
    name: "MoonRock Pick",
    emoji: "⛏️",
    slot: "melee",
    dmg: 10,
    range: 1,
    cooldown: 1.8,
    protection: 0,
    flavor: "Borin-pattern quarry pick cut from 0.71g MoonRock. Breaks risen anchors, vault doors, and arguments across all six skies.",
    unlockTier: "Unlocks early, around the Prime quarry holes",
    upgradePath: ["moonrock-pick", "borin-moonrock-maul"],
    classes: ["warden"],
  },
  {
    id: "borin-moonrock-maul",
    name: "Borin MoonRock Maul",
    emoji: "🔨",
    slot: "melee",
    dmg: 13,
    range: 1,
    cooldown: 2.1,
    protection: 1,
    flavor: "Forgemaster Borin folded six MoonRock heads into one oath-keeping maul. Slow. Final. Every parallel Borin nods along.",
    unlockTier: "Unlocks late, around the Deep Forge hold holes",
    upgradePath: ["moonrock-pick", "borin-moonrock-maul"],
    classes: ["warden"],
  },
  // ---- Ranged: LuckyStarShip coilguns ----
  {
    id: "luckystar-coilgun",
    name: "LuckyStar Coilgun",
    emoji: "🚀",
    slot: "ranged",
    dmg: 7,
    range: 5,
    cooldown: 1.3,
    protection: 0,
    flavor: "President Angel Good's botany-deck point-defense coil, re-aimed at the risen. Fires garden-stake rounds that hum on the way out.",
    unlockTier: "Unlocks early, around the LuckyStarShip hub holes",
    upgradePath: ["luckystar-coilgun", "luckystar-broadside"],
    classes: ["drifter", "warden"],
  },
  {
    id: "luckystar-broadside",
    name: "LuckyStar Broadside",
    emoji: "🌠",
    slot: "ranged",
    dmg: 10,
    range: 7,
    cooldown: 1.6,
    protection: 0,
    flavor: "Full starboard battery of the LuckyStarShip, sighted by Sable across three universes. Patient, bright, and very far-reaching.",
    unlockTier: "Unlocks late, around the Static storm holes",
    upgradePath: ["luckystar-coilgun", "luckystar-broadside"],
    classes: ["drifter"],
  },
  // ---- Ranged: Hades Array spike arms ----
  {
    id: "hades-spike-lobber",
    name: "Hades Spike Lobber",
    emoji: "🔱",
    slot: "ranged",
    dmg: 8,
    range: 4,
    cooldown: 1.4,
    protection: 0,
    flavor: "Salvaged Hades Array tine, re-tuned to disrupt the risen. Lobs folded spikes that snap back to hand before paradox can bill you.",
    unlockTier: "Unlocks mid-journey, around the Void relay holes",
    upgradePath: ["hades-spike-lobber", "spare-vault-repeater"],
    classes: ["drifter", "warden"],
  },
  {
    id: "spare-vault-repeater",
    name: "Spare-Vault Repeater",
    emoji: "⚡",
    slot: "ranged",
    dmg: 10,
    range: 4,
    cooldown: 1.1,
    protection: 0,
    flavor: "Lisa Park's relay crew cranked three spare-vault tines into one repeater. Hades filed the spares; the lattice aims them back.",
    unlockTier: "Unlocks late, around the collapsed-spare vault holes",
    upgradePath: ["hades-spike-lobber", "spare-vault-repeater"],
    classes: ["drifter"],
  },
  // ---- Multiverse-fold arms: paradox anchors ----
  {
    id: "paradox-anchor-pike",
    name: "Paradox Anchor Pike",
    emoji: "⚓",
    slot: "fold",
    dmg: 8,
    range: 2,
    cooldown: 1.2,
    protection: 2,
    flavor: "Warden-issue anchor pike that pins one universe in place while you hop. Vents the lattice bill so Void never learns your name.",
    unlockTier: "Unlocks mid-journey, around the Bloom anchor holes",
    upgradePath: ["paradox-anchor-pike", "sixfold-anchor-glaive"],
    classes: ["warden", "drifter"],
  },
  {
    id: "sixfold-anchor-glaive",
    name: "Sixfold Anchor Glaive",
    emoji: "🌌",
    slot: "fold",
    dmg: 11,
    range: 2,
    cooldown: 1.3,
    protection: 3,
    flavor: "Null's own lattice key folded into a glaive head. One thrust anchors all six universes, and the collapse starves at the door.",
    unlockTier: "Unlocks at the end, around the Sixfold Lattice final holes",
    upgradePath: ["paradox-anchor-pike", "sixfold-anchor-glaive"],
    classes: ["warden"],
  },
  // ---- Multiverse-fold arms: hop bells ----
  {
    id: "hop-toll-bell",
    name: "Hop-Toll Bell",
    emoji: "🔔",
    slot: "fold",
    dmg: 6,
    range: 3,
    cooldown: 1.5,
    protection: 1,
    flavor: "Pell & Marrow's ossuary bell, rung once per hop. The toll carries your combo across universes and settles the paradox meter.",
    unlockTier: "Unlocks mid-journey, around the Dream garden holes",
    upgradePath: ["hop-toll-bell", "transcendence-carillon"],
    classes: ["drifter", "putter"],
  },
  {
    id: "transcendence-carillon",
    name: "Transcendence Carillon",
    emoji: "🌀",
    slot: "fold",
    dmg: 9,
    range: 3,
    cooldown: 1.4,
    protection: 2,
    flavor: "Vex and Null tuned six bells into one carillon. Chain your hops to its rhythm and Static cannot find the hallway you left.",
    unlockTier: "Unlocks late, around the transcendence green holes",
    upgradePath: ["hop-toll-bell", "transcendence-carillon"],
    classes: ["drifter", "putter"],
  },
  // ---- Armor ----
  {
    id: "luckystar-voyager-plate",
    name: "LuckyStar Voyager Plate",
    emoji: "🛡️",
    slot: "armor",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 8,
    flavor: "LuckyStarShip hull weave grown over with Dream-garden moss. Takes the hit in this universe so your echoes never feel it.",
    unlockTier: "Unlocks early, around the LuckyStarShip hub holes",
    upgradePath: ["luckystar-voyager-plate", "sixfold-ward-weave"],
    classes: ["warden", "drifter", "putter"],
  },
  {
    id: "sixfold-ward-weave",
    name: "Sixfold Ward-Weave",
    emoji: "🌿",
    slot: "armor",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 12,
    flavor: "Compact-oath cloth warded by Mirathiel's echo in all six universes. Groknak tested it in three. It held in all three.",
    unlockTier: "Unlocks late, around the Compact oath holes",
    upgradePath: ["luckystar-voyager-plate", "sixfold-ward-weave"],
    classes: ["warden", "putter"],
  },
  // ---- Charms ----
  {
    id: "seer-sixfold-charm",
    name: "Seer Sixfold Charm",
    emoji: "📿",
    slot: "charm",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 3,
    flavor: "Elven seer fang on Null's chart-string. Hums softly when a parallel self is about to warn you before a hop.",
    unlockTier: "Unlocks early, around the Dream garden holes",
    upgradePath: ["seer-sixfold-charm", "sparkite-paradox-coin"],
    classes: ["drifter", "putter"],
  },
  {
    id: "sparkite-paradox-coin",
    name: "Sparkite Paradox-Coin",
    emoji: "🪙",
    slot: "charm",
    dmg: 0,
    range: 0,
    cooldown: 0,
    protection: 4,
    flavor: "Deep Forge sparkite coin, warm in every universe at once. Pays a little of the paradox rent so your combo lasts one more hop.",
    unlockTier: "Unlocks mid-journey, around the Prime quarry holes",
    upgradePath: ["seer-sixfold-charm", "sparkite-paradox-coin"],
    classes: ["warden", "drifter", "putter"],
  },
  // ---- Golf crossovers: putters statted as war-hammers ----
  {
    id: "moonrock-putter",
    name: "MoonRock Putter",
    emoji: "⛳",
    slot: "golf",
    dmg: 10,
    range: 1,
    cooldown: 1.7,
    protection: 0,
    flavor: "Tournament putter with a MoonRock war-hammer head. Tap it gentle on the green, swing it firm when the Void collapses the fairway.",
    unlockTier: "Unlocks mid-journey, around the Bloom links holes",
    upgradePath: ["moonrock-putter", "tomb-putter-transcendent"],
    classes: ["putter", "warden"],
  },
  {
    id: "tomb-putter-transcendent",
    name: "Tomb Putter Transcendent",
    emoji: "🏌️",
    slot: "golf",
    dmg: 12,
    range: 1,
    cooldown: 1.9,
    protection: 1,
    flavor: "MoonRock Putter re-shafted with spare-vault bronze from Hades' own filing cabinet. Sinks long putts AND long odds across six universes.",
    unlockTier: "Unlocks late, around the spare-vault links holes",
    upgradePath: ["moonrock-putter", "tomb-putter-transcendent"],
    classes: ["putter"],
  },
  // ---- Golf crossovers: paradox-anchor irons statted as siege arms ----
  {
    id: "anchor-iron",
    name: "Anchor Iron",
    emoji: "🏏",
    slot: "golf",
    dmg: 13,
    range: 6,
    cooldown: 2.4,
    protection: 0,
    flavor: "Long iron ballasted like a paradox anchor. Tees off from the Prime tee and pins the whole fairway in place before the collapse clocks start.",
    unlockTier: "Unlocks late, around the Static storm holes",
    upgradePath: ["anchor-iron", "sixfold-fairway-driver"],
    classes: ["putter", "drifter"],
  },
  {
    id: "sixfold-fairway-driver",
    name: "Sixfold Fairway Driver",
    emoji: "💥",
    slot: "golf",
    dmg: 15,
    range: 6,
    cooldown: 2.6,
    protection: 0,
    flavor: "Anchor Iron crowned with Array-slate from the folded Necromatic Array. Built for one drive: straight down the middle of all six fairways.",
    unlockTier: "Unlocks at the end, around the Sixfold Lattice final holes",
    upgradePath: ["anchor-iron", "sixfold-fairway-driver"],
    classes: ["putter"],
  },
];

/** Full arsenal keyed by id for reviewer lookup. */
export const GG5D_ARSENAL: Record<string, GG5DArsenalItem> = Object.fromEntries(
  GG5D_ITEMS.map((item) => [item.id, item]),
);

export function itemById(id: string): GG5DArsenalItem | null {
  return GG5D_ARSENAL[id] ?? GG5D_ITEMS.find((item) => item.id === id) ?? null;
}

export function itemsBySlot(slot: GG5DItemSlot): readonly GG5DArsenalItem[] {
  return GG5D_ITEMS.filter((item) => item.slot === slot);
}
