// GraveGain2dB arsenal catalog data (v2 layer, slug gravegain2dB ONLY).
//
// Mirrors public/games/html/gravegain2dB/builds/weapons.js (the runtime weapon
// pool: combat roles, terrain roles, ammo, destruction ratings) for
// server-side consumers (docs, PlayGate copy, guides). The .js bundle file is
// the runtime truth; this module is the catalog truth. Both share: 10 weapons,
// sidearm-infinite + scavenged-limited rules, and the never-destroy-objective
// guarantee (no weapon damages objective/protected cells, ever).
//
// Display names follow the 2dB spec (Pulse Rifle, Scatter Blaster, Grave
// Launcher, Moonbeam, Forged Saw, Cryo Charm, Sun Grenade, Chain Harpoon,
// Orbital Marker, Rescue Beacon). `legacyId` maps each entry to its bundle id
// in builds/weapons.js so the integrator/verifier can join catalog to runtime.
//
// LOCATION: content/ owns per-game data. Parity-locked bundles are never
// touched. Named exports only. 2dA saves/progression untouched.

export const GRAVEGAIN2DB_ARSENAL_VERSION = "1.0.0";

/** localStorage key used by the 2dB runtime overlay. */
export const GRAVEGAIN2DB_ARSENAL_SAVE_KEY = "gravegain2db_arsenal_v1";

export type Gg2dBWeaponKind = "sidearm" | "scavenged" | "scavenged-rare" | "tactical";

export type Gg2dBAmmo = "infinite" | "limited-frequent" | "limited-rare";

/** Destruction rating: 0 = never alters terrain, 1 = light, 2 = medium, 3 = heavy. */
export type Gg2dBDestruction = 0 | 1 | 2 | 3;

export interface Gg2dBWeapon {
  id: string;
  /** Bundle id in public/games/html/gravegain2dB/builds/weapons.js. */
  legacyId: string;
  name: string;
  emoji: string;
  kind: Gg2dBWeaponKind;
  /** What it does to enemies. */
  combatRole: string;
  /** What it does to destructible terrain. */
  terrainRole: string;
  ammo: Gg2dBAmmo;
  destruction: Gg2dBDestruction;
  /** Always-visible, kid-safe tradeoff note. */
  tradeoff: string;
  /** What the player sees before cells break. */
  preBreakVisibility: string;
}

/** Full pool: 1 infinite sidearm + 8 scavenged + 1 rare + 1 tactical throwable. */
export const GG2DB_WEAPONS: readonly Gg2dBWeapon[] = [
  {
    id: "pulse-rifle",
    legacyId: "pulse-rifle",
    name: "Pulse Rifle",
    emoji: "🔫",
    kind: "sidearm",
    combatRole: "Reliable mid-range hitscan; starter sidearm.",
    terrainRole: "No terrain damage (rating 0). Safe everywhere.",
    ammo: "infinite",
    destruction: 0,
    tradeoff: "Lowest DPS; no noise/debris/friendly risk.",
    preBreakVisibility: "N/A (never breaks).",
  },
  {
    id: "scatter-blaster",
    legacyId: "scatter",
    name: "Scatter Blaster",
    emoji: "💥",
    kind: "scavenged",
    combatRole: "Close-range cone burst; room clearer.",
    terrainRole: "Light chew on destructible cells adjacent to blast.",
    ammo: "limited-frequent",
    destruction: 1,
    tradeoff: "Loud; pellet spread risks friendlies at point blank.",
    preBreakVisibility: "Cracks show on cells one hit from breaking.",
  },
  {
    id: "grave-launcher",
    legacyId: "grave-launcher",
    name: "Grave Launcher",
    emoji: "🚀",
    kind: "scavenged",
    combatRole: "Arcing rockets; heavy single-target + splash.",
    terrainRole: "Medium crater on destructible cells.",
    ammo: "limited-frequent",
    destruction: 2,
    tradeoff: "Very loud; debris + self-splash; keep clear of allies.",
    preBreakVisibility: "Target decal + cracked cells before detonation resolves.",
  },
  {
    id: "moonbeam",
    legacyId: "moonbeam",
    name: "Moonbeam",
    emoji: "⚡",
    kind: "scavenged",
    combatRole: "Sustained piercing beam; boss/add melter.",
    terrainRole: "Thin cut line through destructible cells only.",
    ammo: "limited-frequent",
    destruction: 1,
    tradeoff: "Beam glare reveals position; overheat downtime.",
    preBreakVisibility: "Scorch highlight traces the cut before cells break.",
  },
  {
    id: "forged-saw",
    legacyId: "forged-saw",
    name: "Forged Saw",
    emoji: "🪚",
    kind: "scavenged",
    combatRole: "Melee saw; highest close DPS.",
    terrainRole: "Saws destructible cells at contact range.",
    ammo: "limited-frequent",
    destruction: 2,
    tradeoff: "Must be adjacent; sparks + noise; friendly contact risk.",
    preBreakVisibility: "Sparks + crack overlay as the cut progresses.",
  },
  {
    id: "cryo-charm",
    legacyId: "cryo",
    name: "Cryo Charm",
    emoji: "❄️",
    kind: "scavenged",
    combatRole: "Cone slow + shatter on frozen enemies.",
    terrainRole: "No terrain damage (rating 0); freezes hazards for crossing.",
    ammo: "limited-frequent",
    destruction: 0,
    tradeoff: "Low damage alone; mist obscures vision briefly.",
    preBreakVisibility: "N/A (never breaks).",
  },
  {
    id: "sun-grenade",
    legacyId: "sun",
    name: "Sun Grenade",
    emoji: "☀️",
    kind: "scavenged",
    combatRole: "Lobbed fire zones; area denial.",
    terrainRole: "Light scorch on destructible cells in burn patch.",
    ammo: "limited-frequent",
    destruction: 1,
    tradeoff: "Fire hurts allies too; smoke debris limits sightlines.",
    preBreakVisibility: "Burn decal previews the patch before cells break.",
  },
  {
    id: "chain-harpoon",
    legacyId: "harpoon",
    name: "Chain Harpoon",
    emoji: "⚓",
    kind: "scavenged",
    combatRole: "Single heavy bolt + pull on elites.",
    terrainRole: "No terrain damage (rating 0); pins targets to walls.",
    ammo: "limited-frequent",
    destruction: 0,
    tradeoff: "Slow refire; tether can drag shooter toward heavies.",
    preBreakVisibility: "N/A (never breaks).",
  },
  {
    id: "orbital-marker",
    legacyId: "orbital",
    name: "Orbital Marker",
    emoji: "🎯",
    kind: "scavenged-rare",
    combatRole: "Designated orbital strike; deletes packs (rare drop).",
    terrainRole: "Heavy crater on destructible cells in beacon radius.",
    ammo: "limited-rare",
    destruction: 3,
    tradeoff: "Long delay + loud siren; team must clear radius; biggest friendly risk.",
    preBreakVisibility: "Beacon ring + siren + cracked cells well before impact.",
  },
  {
    id: "rescue-beacon",
    legacyId: "rescue-beacon",
    name: "Rescue Beacon",
    emoji: "📡",
    kind: "tactical",
    combatRole: "No damage; revives allies + pings objectives in co-op.",
    terrainRole: "No terrain damage (rating 0).",
    ammo: "limited-frequent",
    destruction: 0,
    tradeoff: "Occupies throwable slot; pulse visible to enemies.",
    preBreakVisibility: "N/A (never breaks).",
  },
];

/** Loadout rules shared with data/builds.js (catalog mirror, advisory). */
export const GG2DB_LOADOUT_RULES = {
  sidearm: "pulse-rifle",
  sidearmAmmo: "infinite",
  scavengedSlots: 2,
  throwableSlots: 1,
  neverDestroyObjective: "No weapon damages objective/protected cells, ever.",
  bossFallback:
    "Boss arenas always allow direct-fire damage (sidearm chip) so no fight soft-locks on ammo.",
} as const;

export function gg2dBWeaponById(id: string): Gg2dBWeapon | null {
  return GG2DB_WEAPONS.find((w) => w.id === id || w.legacyId === id) ?? null;
}

export function gg2dBWeaponsByDestruction(
  rating: Gg2dBDestruction,
): readonly Gg2dBWeapon[] {
  return GG2DB_WEAPONS.filter((w) => w.destruction === rating);
}
