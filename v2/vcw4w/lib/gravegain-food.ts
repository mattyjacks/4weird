// GraveGain shared food-consumable model (v2 layer).
//
// Every food emoji in gravegain1d / gravegain2d / gravegain3d / gravegain4d /
// gravegain5d resolves to ONE
// effect kind with a tier (1 common, 2 uncommon, 3 rare). The SAME emoji has
// the SAME effect in every game and mode — only the numbers move, via
// deriveFoodStats(), so balance is per-game/per-mode while identity is global.
//
// LOCATION: lib/ is shared infra; per-batch tables live in
// content/gravegain-food-batch-*.ts (NEW files only). Parity-locked bundles
// under public/games/html/** are never touched — the loot overlay bundle
// (gravegain-loot.js) consumes these tables through the integrator wiring
// filed in QUEUE.md.
//
// Effect kinds:
//   heal   — instant HP restore (soup, fruit, milk, sweets)
//   shield — temporary ward HP (hard shells, garlic, cheese, crab)
//   power  — +% damage buff (meat, spice, brew, curry)
//   haste  — +% move/attack speed buff (carrot, coffee, noodles, candy)
//   focus  — +% XP and +% drop rate buff (berries, tea, chocolate, salad)
//   feast  — heal + shield combo platter (burger, pizza, hotpot, cake)

export const GRAVEGAIN_FOOD_GAMES = [
  "gravegain1d",
  "gravegain2d",
  "gravegain3d",
  "gravegain4d",
  "gravegain5d",
] as const;
export type GraveGainFoodGame = (typeof GRAVEGAIN_FOOD_GAMES)[number];

export const GRAVEGAIN_FOOD_MODES = [
  "endless",
  "mission",
  "mmorpg",
] as const;
export type GraveGainFoodMode = (typeof GRAVEGAIN_FOOD_MODES)[number];

export const GRAVEGAIN_FOOD_EFFECTS = [
  "heal",
  "shield",
  "power",
  "haste",
  "focus",
  "feast",
] as const;
export type GraveGainFoodEffect = (typeof GRAVEGAIN_FOOD_EFFECTS)[number];

export type GraveGainFoodTier = 1 | 2 | 3;

export interface GraveGainFoodModeStats {
  heal?: number;
  shield?: number;
  damagePct?: number;
  speedPct?: number;
  xpPct?: number;
  dropPct?: number;
  /** Buff duration in seconds; 0 = instant (heal). */
  durationSec: number;
  cooldownSec: number;
  /** Shop price in coins. */
  price: number;
  /** Loot drop weight 1..100. */
  dropWeight: number;
  /** True only in mmorpg (player-tradable there, bound elsewhere). */
  tradeable: boolean;
  /** Where/how this drops in this game+mode (4..120 chars). */
  note?: string;
}

export interface GraveGainFoodRosterEntry {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  effect: GraveGainFoodEffect;
  tier: GraveGainFoodTier;
}

export type GraveGainFoodStatsTable = Record<
  GraveGainFoodGame,
  Record<GravegainFoodModeAlias, GraveGainFoodModeStats>
>;
// Local alias kept nominal so batch files read naturally.
export type GravegainFoodModeAlias = GraveGainFoodMode;

export interface GraveGainFoodItemDef extends GraveGainFoodRosterEntry {
  stats: GraveGainFoodStatsTable;
}

/** V2 runtime overlay bundle that will consume these tables (integrator wiring). */
export const GRAVEGAIN_FOOD_RUNTIME_FILES = ["gravegain-loot.js"] as const;

/** Per-game stat scale: 1d runs small numbers, 2d baseline, 3d dungeon-scale, 4d dream-scale above 3d, 5d multiverse highest. */
const GAME_SCALE: Record<GraveGainFoodGame, number> = {
  gravegain1d: 0.7,
  gravegain2d: 1.0,
  gravegain3d: 1.4,
  gravegain4d: 1.8,
  gravegain5d: 2.2,
};

interface BaseLine {
  heal: number;
  shield: number;
  damagePct: number;
  speedPct: number;
  xpPct: number;
  dropPct: number;
  durationSec: number;
  cooldownSec: number;
  price: number;
  dropWeight: number;
}

/** Baseline numbers per (effect, tier) at 2d scale, before game/mode tuning. */
const BASE: Record<GraveGainFoodEffect, Record<GraveGainFoodTier, BaseLine>> = {
  heal: {
    1: { heal: 12, shield: 0, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 0, cooldownSec: 20, price: 8, dropWeight: 90 },
    2: { heal: 25, shield: 0, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 0, cooldownSec: 25, price: 18, dropWeight: 60 },
    3: { heal: 45, shield: 0, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 0, cooldownSec: 30, price: 35, dropWeight: 30 },
  },
  shield: {
    1: { heal: 0, shield: 10, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 20, cooldownSec: 35, price: 10, dropWeight: 85 },
    2: { heal: 0, shield: 22, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 25, cooldownSec: 40, price: 22, dropWeight: 55 },
    3: { heal: 0, shield: 40, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 30, cooldownSec: 50, price: 40, dropWeight: 28 },
  },
  power: {
    1: { heal: 0, shield: 0, damagePct: 10, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 15, cooldownSec: 40, price: 12, dropWeight: 80 },
    2: { heal: 0, shield: 0, damagePct: 20, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 20, cooldownSec: 50, price: 25, dropWeight: 50 },
    3: { heal: 0, shield: 0, damagePct: 35, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 25, cooldownSec: 60, price: 45, dropWeight: 25 },
  },
  haste: {
    1: { heal: 0, shield: 0, damagePct: 0, speedPct: 8, xpPct: 0, dropPct: 0, durationSec: 15, cooldownSec: 40, price: 12, dropWeight: 80 },
    2: { heal: 0, shield: 0, damagePct: 0, speedPct: 15, xpPct: 0, dropPct: 0, durationSec: 20, cooldownSec: 50, price: 25, dropWeight: 50 },
    3: { heal: 0, shield: 0, damagePct: 0, speedPct: 25, xpPct: 0, dropPct: 0, durationSec: 25, cooldownSec: 60, price: 45, dropWeight: 25 },
  },
  focus: {
    1: { heal: 0, shield: 0, damagePct: 0, speedPct: 0, xpPct: 10, dropPct: 5, durationSec: 30, cooldownSec: 60, price: 15, dropWeight: 70 },
    2: { heal: 0, shield: 0, damagePct: 0, speedPct: 0, xpPct: 25, dropPct: 10, durationSec: 45, cooldownSec: 90, price: 30, dropWeight: 45 },
    3: { heal: 0, shield: 0, damagePct: 0, speedPct: 0, xpPct: 50, dropPct: 20, durationSec: 60, cooldownSec: 120, price: 55, dropWeight: 22 },
  },
  feast: {
    1: { heal: 10, shield: 8, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 20, cooldownSec: 45, price: 20, dropWeight: 60 },
    2: { heal: 20, shield: 15, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 25, cooldownSec: 60, price: 40, dropWeight: 35 },
    3: { heal: 35, shield: 30, damagePct: 0, speedPct: 0, xpPct: 0, dropPct: 0, durationSec: 30, cooldownSec: 90, price: 70, dropWeight: 15 },
  },
};

function scalePrimary(n: number, game: GraveGainFoodGame): number {
  if (n === 0) return 0;
  return Math.max(1, Math.round(n * GAME_SCALE[game]));
}

/**
 * Derive balanced per-game/per-mode stats for one roster entry.
 * Same input always yields the same output — that is the balance guarantee.
 */
export function deriveFoodStats(
  effect: GraveGainFoodEffect,
  tier: GraveGainFoodTier,
  game: GraveGainFoodGame,
  mode: GraveGainFoodMode,
): GraveGainFoodModeStats {
  const b = BASE[effect][tier];
  const priceMult = mode === "mmorpg" ? 1.5 : 1.0;
  let drop = b.dropWeight;
  if (mode === "endless") drop = Math.min(100, Math.round(drop * 1.25));
  if (mode === "mission") drop = Math.max(1, Math.round(drop * 0.8));
  if (mode === "mmorpg") drop = Math.max(1, Math.round(drop * 0.6));
  let cooldown = b.cooldownSec;
  if (mode === "endless") cooldown = Math.max(8, Math.round(cooldown * 0.8));
  if (mode === "mmorpg") cooldown = Math.round(cooldown * 1.5);
  const duration =
    b.durationSec === 0 ? 0 : b.durationSec + (mode === "mission" ? 5 : 0);
  const out: GraveGainFoodModeStats = {
    durationSec: duration,
    cooldownSec: cooldown,
    price: Math.max(1, Math.round(b.price * GAME_SCALE[game] * priceMult)),
    dropWeight: drop,
    tradeable: mode === "mmorpg",
  };
  const heal = scalePrimary(b.heal, game);
  const shield = scalePrimary(b.shield, game);
  if (heal > 0) out.heal = heal;
  if (shield > 0) out.shield = shield;
  if (b.damagePct > 0) out.damagePct = b.damagePct;
  if (b.speedPct > 0) out.speedPct = b.speedPct;
  if (b.xpPct > 0) out.xpPct = b.xpPct;
  if (b.dropPct > 0) out.dropPct = b.dropPct;
  return out;
}

/** Build the full 5-games x 3-modes table for a roster entry (notes added by batch files). */
export function buildFoodStatsTable(
  effect: GraveGainFoodEffect,
  tier: GraveGainFoodTier,
): GraveGainFoodStatsTable {
  const table = {} as GraveGainFoodStatsTable;
  for (const game of GRAVEGAIN_FOOD_GAMES) {
    const modes = {} as Record<GraveGainFoodMode, GraveGainFoodModeStats>;
    for (const mode of GRAVEGAIN_FOOD_MODES) {
      modes[mode] = deriveFoodStats(effect, tier, game, mode);
    }
    table[game] = modes;
  }
  return table;
}

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

/** Validate one item; returns error strings (empty = valid). */
export function validateFoodItem(item: GraveGainFoodItemDef): string[] {
  const errs: string[] = [];
  if (!item.id || !/^[a-z0-9-]+$/.test(item.id)) errs.push(`${item.id}: bad id`);
  if (!item.name) errs.push(`${item.id}: missing name`);
  if (!item.emoji) errs.push(`${item.id}: missing emoji`);
  if (!item.blurb || item.blurb.length > 140)
    errs.push(`${item.id}: blurb must be 1..140 chars`);
  for (const game of GRAVEGAIN_FOOD_GAMES) {
    for (const mode of GRAVEGAIN_FOOD_MODES) {
      const s = item.stats?.[game]?.[mode];
      if (!s) {
        errs.push(`${item.id}: missing stats ${game}/${mode}`);
        continue;
      }
      for (const f of [
        "heal",
        "shield",
        "damagePct",
        "speedPct",
        "xpPct",
        "dropPct",
      ] as const) {
        const v = s[f];
        if (v !== undefined && (!isInt(v) || v < 0))
          errs.push(`${item.id} ${game}/${mode}: ${f} must be int >= 0`);
      }
      if (!isInt(s.durationSec) || s.durationSec < 0 || s.durationSec > 125)
        errs.push(`${item.id} ${game}/${mode}: durationSec 0..125`);
      if (!isInt(s.cooldownSec) || s.cooldownSec < 8 || s.cooldownSec > 300)
        errs.push(`${item.id} ${game}/${mode}: cooldownSec 8..300`);
      if (!isInt(s.price) || s.price < 1 || s.price > 999)
        errs.push(`${item.id} ${game}/${mode}: price 1..999`);
      if (!isInt(s.dropWeight) || s.dropWeight < 1 || s.dropWeight > 100)
        errs.push(`${item.id} ${game}/${mode}: dropWeight 1..100`);
      if (s.tradeable !== (mode === "mmorpg"))
        errs.push(`${item.id} ${game}/${mode}: tradeable must be ${mode === "mmorpg"}`);
      const nonzero =
        (s.heal ?? 0) +
        (s.shield ?? 0) +
        (s.damagePct ?? 0) +
        (s.speedPct ?? 0) +
        (s.xpPct ?? 0) +
        (s.dropPct ?? 0);
      if (nonzero <= 0)
        errs.push(`${item.id} ${game}/${mode}: no effect magnitude`);
      if (!s.note || s.note.length < 4 || s.note.length > 120)
        errs.push(`${item.id} ${game}/${mode}: note 4..120 chars`);
    }
  }
  return errs;
}

/** Validate a whole batch against its expected roster ids. */
export function validateFoodBatch(
  items: readonly GraveGainFoodItemDef[],
  expectedIds: readonly string[],
): string[] {
  const errs: string[] = [];
  const got = new Set(items.map((i) => i.id));
  for (const id of expectedIds) {
    if (!got.has(id)) errs.push(`missing item ${id}`);
  }
  for (const item of items) {
    if (!expectedIds.includes(item.id)) errs.push(`unexpected item ${item.id}`);
    errs.push(...validateFoodItem(item));
  }
  const emojis = items.map((i) => i.emoji);
  if (new Set(emojis).size !== emojis.length) errs.push("duplicate emoji in batch");
  return errs;
}
