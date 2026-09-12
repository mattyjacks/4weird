// Battlesharks 2 balance tables (slug: battlesharks2).
//
// LOCATION: content/battlesharks2-balance.ts (v2 layer). Pure data + helpers.
// NEVER edit public/games/html/battlesharks2/** (parity locked); these tables
// mirror the bundle and drive v2 hints (public/games/html/battlesharks2-tune.js).
//
// BUNDLE TRUTH (public/games/html/battlesharks2/game.js — verified this session):
//   - buyUpgrade costs: lasers 20 debris | thruster 30 debris + 10 biomass |
//     shield 40 debris + 1 mutagen | missiles 50 debris + 2 mutagens |
//     electric 35 biomass + 1 mutagen | acid 25 biomass + 2 mutagens |
//     scales 50 biomass (+50 max HP, damageReduction 1.0 -> 0.75).
//   - spawnAquariumItem costs: coral 15 biomass | wreckage 20 debris |
//     vent 30 biomass + 15 debris.
//   - PREY_TYPES / ENEMY_TYPES below are copied verbatim (emoji, size, biomass,
//     speed, score / damage, debris, health).
//   - Boss: trigger at score >= 3500 (3s alert), 1000 HP; defeat pays
//     +10,000 score, +150 debris, +10 mutagens.
//   - state.difficulty is pinned at 1 (never ramped in-bundle); spawn cadence
//     is 75/difficulty prey ticks, 170/difficulty enemy ticks, floating
//     collectibles every 380 ticks. The v2 overlay governor tiers on score
//     instead of touching bundle state.

export type Bs2Resource = "biomass" | "debris" | "mutagens";

export type Bs2Cost = Partial<Record<Bs2Resource, number>>;

export type Bs2Prey = {
  emoji: string;
  name: string;
  size: number;
  biomass: number;
  speed: number;
  score: number;
  bottomWalker?: boolean;
};

export type Bs2Enemy = {
  emoji: string;
  name: string;
  size: number;
  damage: number;
  debris: number;
  speed: number;
  health?: number;
  isStatic?: boolean;
  shoots?: boolean;
};

export type Bs2Upgrade = {
  id: string;
  name: string;
  slot: "cybernetics" | "mutation";
  cost: Bs2Cost;
  effect: string;
  /** Heuristic ratings (v2 judgment, 0-5) for value math — not bundle truth. */
  ratings: { damage: number; survival: number; mobility: number; economy: number };
};

export type Bs2AquariumItem = {
  id: string;
  name: string;
  cost: Bs2Cost;
  effect: string;
};

/** Verbatim PREY_TYPES from the bundle. Eat values: +biomass, heal 3x biomass. */
export const BS2_PREY: readonly Bs2Prey[] = [
  { emoji: "🐟", name: "Blue Fish", size: 14, biomass: 1, speed: 1.2, score: 10 },
  { emoji: "🐠", name: "Tang Fish", size: 16, biomass: 2, speed: 1.5, score: 15 },
  { emoji: "🐡", name: "Puffer Fish", size: 18, biomass: 3, speed: 0.8, score: 20 },
  { emoji: "🦐", name: "Shrimp", size: 12, biomass: 1, speed: 1.0, score: 5 },
  { emoji: "🦀", name: "Crab", size: 15, biomass: 2, speed: 0.5, score: 15, bottomWalker: true },
  { emoji: "🐙", name: "Octopus", size: 24, biomass: 5, speed: 0.9, score: 40 },
  { emoji: "🦑", name: "Squid", size: 22, biomass: 4, speed: 2.2, score: 35 },
] as const;

/** Verbatim ENEMY_TYPES from the bundle. */
export const BS2_ENEMIES: readonly Bs2Enemy[] = [
  { emoji: "💣", name: "Naval Mine", size: 20, damage: 35, debris: 3, speed: 0, isStatic: true },
  { emoji: "🛢️", name: "Toxic Waste", size: 18, damage: 20, debris: 1, speed: 0.3 },
  { emoji: "scuba", name: "Cyber Diver", size: 22, damage: 15, health: 30, debris: 5, speed: 1.0, shoots: true },
  { emoji: "robot", name: "Mecha Sentinel", size: 25, damage: 25, health: 55, debris: 8, speed: 1.6, shoots: true },
] as const;

/** Upgrade tier list — costs are bundle truth (see header). Order = value rank. */
export const BS2_UPGRADES: readonly Bs2Upgrade[] = [
  {
    id: "lasers", name: "Laser Cannon", slot: "cybernetics",
    cost: { debris: 20 },
    effect: "Ranged energy beams; 10 dmg vs hunters, 12 vs boss.",
    ratings: { damage: 4, survival: 1, mobility: 0, economy: 3 },
  },
  {
    id: "thruster", name: "Jet Engine", slot: "cybernetics",
    cost: { debris: 30, biomass: 10 },
    effect: "SPACE dash with shockwave shove; faster positioning.",
    ratings: { damage: 1, survival: 3, mobility: 5, economy: 2 },
  },
  {
    id: "scales", name: "Chitinous Scales", slot: "mutation",
    cost: { biomass: 50 },
    effect: "+50 max HP, damage taken x0.75.",
    ratings: { damage: 0, survival: 5, mobility: 0, economy: 1 },
  },
  {
    id: "shield", name: "Force Shield", slot: "cybernetics",
    cost: { debris: 40, mutagens: 1 },
    effect: "Blocks one hit, recharges in 360 ticks (~6s).",
    ratings: { damage: 0, survival: 4, mobility: 0, economy: 1 },
  },
  {
    id: "electric", name: "Electric Charge", slot: "mutation",
    cost: { biomass: 35, mutagens: 1 },
    effect: "190px zap every 150 ticks; 20 dmg vs hunters, 35 vs boss.",
    ratings: { damage: 3, survival: 2, mobility: 0, economy: 4 },
  },
  {
    id: "acid", name: "Corrosive Acid", slot: "mutation",
    cost: { biomass: 25, mutagens: 2 },
    effect: "Acid spit (20/25 dmg) + lingering 50px damage clouds.",
    ratings: { damage: 4, survival: 0, mobility: 0, economy: 2 },
  },
  {
    id: "missiles", name: "Homing Micro-Missiles", slot: "cybernetics",
    cost: { debris: 50, mutagens: 2 },
    effect: "Auto homing missile every 140 ticks; 45 dmg vs hunters, 55 vs boss.",
    ratings: { damage: 5, survival: 1, mobility: 0, economy: 2 },
  },
] as const;

/** Aquarium deployables — costs are bundle truth (see header). */
export const BS2_AQUARIUM: readonly Bs2AquariumItem[] = [
  {
    id: "coral", name: "Bioluminescent Coral",
    cost: { biomass: 15 },
    effect: "Spawns edible clownfish every 280 ticks — biomass engine.",
  },
  {
    id: "wreckage", name: "Shipwreck Debris",
    cost: { debris: 20 },
    effect: "Leaks cyber debris every 380 ticks — debris engine.",
  },
  {
    id: "vent", name: "Hydrothermal Vent",
    cost: { biomass: 30, debris: 15 },
    effect: "Emits mutagen canisters every 550 ticks — only renewable 🧪.",
  },
] as const;

export type Bs2BuildOrderName = "starter" | "speedrunner" | "tank";

/** Recommended purchase sequences (v2 guidance; upgrade ids in buy order). */
const BUILD_ORDERS: Record<Bs2BuildOrderName, readonly string[]> = {
  // Safe curve: gun -> move -> tank -> boss defenses.
  starter: ["lasers", "thruster", "scales", "shield", "electric", "acid", "missiles"],
  // Rush ranged DPS + mobility, skip tank stats, spike the boss fast.
  speedrunner: ["lasers", "thruster", "electric", "missiles", "acid", "shield", "scales"],
  // Max effective HP first, then sustained AoE for the boss grind.
  tank: ["scales", "shield", "lasers", "electric", "thruster", "acid", "missiles"],
};

/** Difficulty curve spec (bundle behavior + v2 overlay tiers). */
export const BS2_DIFFICULTY_CURVE = {
  bossTriggerScore: 3500,
  bossAlertTicks: 180,
  bossHp: 1000,
  bossRewards: { score: 10000, debris: 150, mutagens: 10 },
  /** Bundle spawn cadence in ticks (difficulty pinned at 1 in-bundle). */
  bundleCadenceTicks: { prey: 75, enemy: 170, floating: 380 },
  /** Overlay governor: max 1 threat spawn per window, by score tier. */
  governorWindowsMs: [
    { belowScore: 800, perMs: 2500 },
    { belowScore: 2000, perMs: 700 },
    { belowScore: 3500, perMs: 350 },
  ],
  pityDryMs: 75000,
} as const;

function costUnits(cost: Bs2Cost): number {
  // Rough cross-resource denominator: debris/biomass 1:1, mutagens weighted
  // x15 (drop rate ~28% per hunter kill + floating RNG makes them scarcest).
  return (cost.debris ?? 0) + (cost.biomass ?? 0) + (cost.mutagens ?? 0) * 15;
}

/**
 * Heuristic value-for-cost of an upgrade (higher = better deal).
 * Ratings are v2 judgment; costs are bundle truth.
 */
export function upgradeValue(id: string): number {
  const up = BS2_UPGRADES.find((u) => u.id === id);
  if (!up) return NaN;
  const total =
    up.ratings.damage + up.ratings.survival + up.ratings.mobility + up.ratings.economy;
  const denom = costUnits(up.cost);
  if (denom <= 0) return total;
  return Math.round((total / denom) * 1000) / 1000;
}

/** Recommended build order by name; null for unknown names. */
export function buildOrder(name: string): readonly string[] | null {
  if (name === "starter" || name === "speedrunner" || name === "tank") {
    return BUILD_ORDERS[name];
  }
  return null;
}
