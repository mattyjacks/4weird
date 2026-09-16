// GraveGain2dB effects catalog data (v2 layer, slug gravegain2dB ONLY).
//
// Pickups, hazard telegraphs, and arena modifiers for server-side consumers
// (docs, PlayGate copy, guides). The .js bundle files under
// public/games/html/gravegain2dB/ are the runtime truth; this module is the
// catalog truth. Shared guarantees: pickups never spawn inside
// objective/protected cells, telegraphs always precede damage, and every
// entry ships a kid-safe note.
//
// LOCATION: content/ owns per-game data. Parity-locked bundles are never
// touched. Named exports only. 2dA saves/progression untouched.

export const GRAVEGAIN2DB_EFFECTS_VERSION = "1.0.0";

/** localStorage key used by the 2dB runtime overlay. */
export const GRAVEGAIN2DB_EFFECTS_SAVE_KEY = "gravegain2db_effects_v1";

export type Gg2dBEffectKind = "pickup" | "telegraph" | "arena";

export interface Gg2dBEffect {
  id: string;
  name: string;
  emoji: string;
  kind: Gg2dBEffectKind;
  /** What the player sees and what it does. */
  description: string;
  /** Seconds the effect lasts once active; 0 = instant. */
  durationSeconds: number;
  /** Always-visible, kid-safe note. */
  kidSafeNote: string;
}

/** Pickups: instant or timed benefits; never spawn in objective cells. */
export const GG2DB_PICKUPS: readonly Gg2dBEffect[] = [
  {
    id: "moon-cell",
    name: "Moon Cell",
    emoji: "🔋",
    kind: "pickup",
    description: "Restores one ammo tick to the held scavenged weapon.",
    durationSeconds: 0,
    kidSafeNote: "Glowing battery; grab it to reload.",
  },
  {
    id: "grave-apple",
    name: "Grave Apple",
    emoji: "🍎",
    kind: "pickup",
    description: "Heals two hearts on pickup.",
    durationSeconds: 0,
    kidSafeNote: "Red apple; heals ouchies.",
  },
  {
    id: "lantern-oil",
    name: "Lantern Oil",
    emoji: "🪔",
    kind: "pickup",
    description: "Brightens the light radius for 30 seconds.",
    durationSeconds: 30,
    kidSafeNote: "Lamp oil; makes the dark smaller.",
  },
  {
    id: "swift-boots",
    name: "Swift Boots",
    emoji: "🥾",
    kind: "pickup",
    description: "Plus 20 percent move speed for 20 seconds.",
    durationSeconds: 20,
    kidSafeNote: "Fast boots; zoomies for a bit.",
  },
  {
    id: "aegis-shard",
    name: "Aegis Shard",
    emoji: "🛡️",
    kind: "pickup",
    description: "Blocks the next incoming hit, then shatters.",
    durationSeconds: 60,
    kidSafeNote: "Shield piece; blocks one bonk.",
  },
  {
    id: "echo-horn",
    name: "Echo Horn",
    emoji: "📯",
    kind: "pickup",
    description: "Pings objectives and revives downed allies in co-op.",
    durationSeconds: 0,
    kidSafeNote: "Loud horn; calls friends back.",
  },
];

/** Telegraphs: every hazard shows one of these before it deals damage. */
export const GG2DB_TELEGRAPHS: readonly Gg2dBEffect[] = [
  {
    id: "crack-overlay",
    name: "Crack Overlay",
    emoji: "🪟",
    kind: "telegraph",
    description: "Cracked cells break one hit later; always shown first.",
    durationSeconds: 2,
    kidSafeNote: "Cracks mean move away.",
  },
  {
    id: "siren-ring",
    name: "Siren Ring",
    emoji: "🚨",
    kind: "telegraph",
    description: "Beacon ring plus siren marks an incoming strike zone.",
    durationSeconds: 3,
    kidSafeNote: "Loud ring; leave the circle.",
  },
  {
    id: "spore-mist",
    name: "Spore Mist",
    emoji: "🌫️",
    kind: "telegraph",
    description: "Mist drifts for 4 seconds before the patch turns harmful.",
    durationSeconds: 4,
    kidSafeNote: "Foggy cloud; hold your breath out.",
  },
  {
    id: "tremor-dust",
    name: "Tremor Dust",
    emoji: "💨",
    kind: "telegraph",
    description: "Falling dust warns of a cave-in one beat ahead.",
    durationSeconds: 1,
    kidSafeNote: "Dusty air; something will fall.",
  },
];

/** Arena modifiers: rotating conditions, one active per run. */
export const GG2DB_ARENAS: readonly Gg2dBEffect[] = [
  {
    id: "low-moon",
    name: "Low Moon",
    emoji: "🌙",
    kind: "arena",
    description: "Darker run; lantern radius matters more, pickups glow brighter.",
    durationSeconds: 0,
    kidSafeNote: "Night mode; stay near light.",
  },
  {
    id: "moon-tide",
    name: "Moon Tide",
    emoji: "🌊",
    kind: "arena",
    description: "Shallow tide cells slow movement but hide the player.",
    durationSeconds: 0,
    kidSafeNote: "Splashy water; slow but sneaky.",
  },
  {
    id: "ember-drift",
    name: "Ember Drift",
    emoji: "🔥",
    kind: "arena",
    description: "Drifting embers add light and light chip damage outside cover.",
    durationSeconds: 0,
    kidSafeNote: "Warm sparks; keep moving.",
  },
  {
    id: "quiet-breach",
    name: "Quiet Breach",
    emoji: "🤫",
    kind: "arena",
    description: "Enemies hear less; stealth approaches stay viable longer.",
    durationSeconds: 0,
    kidSafeNote: "Shhh mode; tiptoe past.",
  },
];

/** Union of every catalog entry. */
export const GG2DB_EFFECTS: readonly Gg2dBEffect[] = [
  ...GG2DB_PICKUPS,
  ...GG2DB_TELEGRAPHS,
  ...GG2DB_ARENAS,
];

export function gg2dBEffectById(id: string): Gg2dBEffect | null {
  return GG2DB_EFFECTS.find((e) => e.id === id) ?? null;
}

export function gg2dBEffectsByKind(
  kind: Gg2dBEffectKind,
): readonly Gg2dBEffect[] {
  return GG2DB_EFFECTS.filter((e) => e.kind === kind);
}

/** Fail-open shape check for rows arriving from future backend tables. */
export function validateGg2dBEffect(row: unknown): boolean {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r["id"] === "string" &&
    typeof r["name"] === "string" &&
    typeof r["kind"] === "string" &&
    (r["kind"] === "pickup" ||
      r["kind"] === "telegraph" ||
      r["kind"] === "arena") &&
    typeof r["description"] === "string" &&
    typeof r["durationSeconds"] === "number" &&
    typeof r["kidSafeNote"] === "string"
  );
}
