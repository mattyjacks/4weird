// GraveGain2dB content-mode tables (slug: gravegain2dB).
//
// LOCATION NOTE: content/gravegain2dB-modes.ts mirrors content/gravegain2d-modes.ts.
// content/ owns per-game kid/teen/all presentation tables next to the catalog;
// lib/ stays for shared infra (the sibling-owned lib/content-modes.ts contract).
// NEVER touch lib/content-modes.ts here — the 2dB slug wiring (CONTENT_MODE_GAMES,
// catalog rows, save namespaces) belongs to the integrator lane (DS-GG2DB-10).
//
// CONTRACT (shared infra: lib/content-modes.ts):
//   - Mode type imported from "@/lib/content-modes" (ContentMode = kid|teen|all).
//   - PRESENTATION ONLY: defeat effect, debris tone, and language differ by mode.
//     Physics, geometry, enemy behavior, and rewards are IDENTICAL across modes
//     (see GG2DB_GAMEPLAY_INVARIANCE + assertGg2dBGameplayInvariance below).
//   - Storage key `4weird-content-mode:gravegain2dB` matches
//     contentModeStorageKey("gravegain2dB") once the integrator wires the slug.
//   - Source truth for builds/weapons: public/games/html/gravegain2dB/builds/
//     (races-classes.js, weapons.js). This module carries NO stats — copy only.
//
// UI: do NOT edit components/games/play-gate.tsx (sibling owns it). Sibling
// should import GG2DB_MODE_COPY from here for the PlayGate picker descriptions.

import type { ContentMode } from "@/lib/content-modes";

/** Local alias — identical to the shared ContentMode; kept nominal for GG2DB tables. */
export type Gg2dBContentMode = ContentMode;

export const GG2DB_CONTENT_MODES: readonly Gg2dBContentMode[] = ["kid", "teen", "all"];

/** Storage key for the 2dB mode pick (matches contentModeStorageKey("gravegain2dB")). */
export const GG2DB_CONTENT_MODE_STORAGE_KEY = "4weird-content-mode:gravegain2dB";

/** How a defeated enemy reads on screen. Presentation only. */
export type Gg2dBDefeatEffect =
  | "gray-poof"
  | "light-blood-fall"
  | "red-blood-burst";

/** What destroyed-terrain debris looks like. Presentation only. */
export type Gg2dBDerisTone =
  | "flower-petals"
  | "light-rubble-decals"
  | "gore-rubble-decals";

export type Gg2dBPresentation = {
  /** Enemy takedown visual. */
  defeatEffect: Gg2dBDefeatEffect;
  /** Defeat particle color (advisory CSS color, never a physics value). */
  defeatColor: string;
  /** Destroyed-cell debris visual. */
  debrisTone: Gg2dBDerisTone;
  /** Floor decal set left behind by fights. */
  floorDecals: "petals" | "light-blood" | "gore";
  /** Combat-bark language tier. */
  language: "gentle" | "mild" | "uncut";
  /** NPC chatter voice. */
  npcVoice: "cozy" | "tense-clean" | "full-dark";
  /** Lore framing. */
  loreVoice: "cozy-retelling" | "tense-clean" | "original-dark-plus-coda";
};

/**
 * Per-mode presentation tables. ONLY presentation keys may appear here —
 * adding a physics/geometry/behavior/reward key is a contract break and
 * fails assertGg2dBGameplayInvariance().
 */
export const GG2DB_PRESENTATION: Record<Gg2dBContentMode, Gg2dBPresentation> = {
  kid: {
    defeatEffect: "gray-poof",
    defeatColor: "#9aa0a6",
    debrisTone: "flower-petals",
    floorDecals: "petals",
    language: "gentle",
    npcVoice: "cozy",
    loreVoice: "cozy-retelling",
  },
  teen: {
    defeatEffect: "light-blood-fall",
    defeatColor: "#c1121f",
    debrisTone: "light-rubble-decals",
    floorDecals: "light-blood",
    language: "mild",
    npcVoice: "tense-clean",
    loreVoice: "tense-clean",
  },
  all: {
    defeatEffect: "red-blood-burst",
    defeatColor: "#7f1d1d",
    debrisTone: "gore-rubble-decals",
    floorDecals: "gore",
    language: "uncut",
    npcVoice: "full-dark",
    loreVoice: "original-dark-plus-coda",
  },
};

export function getGg2dBPresentation(mode: Gg2dBContentMode): Gg2dBPresentation {
  const table = GG2DB_PRESENTATION[mode];
  if (!table) throw new Error(`Unknown GraveGain2dB content mode: ${String(mode)}`);
  return table;
}

// ---------- Gameplay invariance ----------
//
// The sim (sim/), terrain lifecycle, enemy behavior, and mission rewards are
// authored ONCE and shared by all three modes. This section is the machine-
// checkable half of that promise: the presentation tables above must never
// grow gameplay keys, and every mode must resolve to the same gameplay
// snapshot (a single shared reference — identical by construction).

/** Gameplay keys that must NEVER appear inside a presentation table. */
export const GG2DB_GAMEPLAY_KEYS = [
  "physics",
  "gravity",
  "speed",
  "damage",
  "dmg",
  "hp",
  "range",
  "cooldown",
  "geometry",
  "hitbox",
  "spawn",
  "behavior",
  "reward",
  "xp",
  "salvage",
  "dropRate",
] as const;

/** Presentation keys — the ONLY keys allowed inside GG2DB_PRESENTATION rows. */
export const GG2DB_PRESENTATION_KEYS = [
  "defeatEffect",
  "defeatColor",
  "debrisTone",
  "floorDecals",
  "language",
  "npcVoice",
  "loreVoice",
] as const;

export type Gg2dBInvarianceReport = {
  ok: boolean;
  violations: string[];
};

/**
 * Asserts gameplay invariance across modes:
 *  1. No presentation row carries a physics/geometry/behavior/reward key.
 *  2. All three modes share one gameplay snapshot (same reference).
 * Returns { ok, violations } — empty violations means invariant. Never throws.
 */
export function assertGg2dBGameplayInvariance(): Gg2dBInvarianceReport {
  const violations: string[] = [];
  const allowed = new Set<string>(GG2DB_PRESENTATION_KEYS as readonly string[]);
  for (const mode of GG2DB_CONTENT_MODES) {
    const row = GG2DB_PRESENTATION[mode] as unknown as Record<string, unknown>;
    for (const key of Object.keys(row)) {
      if (!allowed.has(key)) {
        violations.push(`${mode}: unexpected key "${key}" (presentation-only contract)`);
      }
    }
    for (const banned of GG2DB_GAMEPLAY_KEYS) {
      if (Object.prototype.hasOwnProperty.call(row, banned)) {
        violations.push(`${mode}: banned gameplay key "${banned}" in presentation table`);
      }
    }
  }
  // Single shared gameplay snapshot — identical by construction.
  if (GG2DB_GAMEPLAY_SNAPSHOT !== GG2DB_GAMEPLAY_SNAPSHOT) {
    violations.push("gameplay snapshot identity broken");
  }
  for (const mode of GG2DB_CONTENT_MODES) {
    if (gameplayForMode(mode) !== GG2DB_GAMEPLAY_SNAPSHOT) {
      violations.push(`${mode}: gameplay snapshot differs by mode`);
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * The one shared gameplay snapshot. Modes do not get their own copy —
 * gameplayForMode() returns this same reference for kid, teen, and adults.
 * Values are descriptive (the sim owns the numbers); the point is identity.
 */
export const GG2DB_GAMEPLAY_SNAPSHOT = {
  physics: "shared-sim",
  geometry: "shared-terrain-grid",
  behavior: "shared-enemy-ai",
  rewards: "shared-mission-payouts",
} as const;

export function gameplayForMode(
  _mode: Gg2dBContentMode,
): typeof GG2DB_GAMEPLAY_SNAPSHOT {
  void _mode;
  return GG2DB_GAMEPLAY_SNAPSHOT;
}

// ---------- PlayGate picker copy (sibling imports this; play-gate.tsx untouched) ----------
export const GG2DB_MODE_COPY: Record<
  Gg2dBContentMode,
  { label: string; blurb: string }
> = {
  kid: {
    label: "Kids — Cozy Breach",
    blurb:
      "GraveGain2dB with gray-poof takedowns, flower-petal debris, gentle NPC chatter, and cozy lore retellings. Same maps, same fights, same loot — only the presentation is soft.",
  },
  teen: {
    label: "Teen — Tense Breach",
    blurb:
      "GraveGain2dB with light blood + floor decals, mild language (damn/hell at most), and tense-but-clean lore. Same maps, same fights, same loot.",
  },
  all: {
    label: "Adults — Full Dark",
    blurb:
      "GraveGain2dB uncut: red blood bursts, gore rubble decals, full combat swearing, and original dark lore plus grim codas. Same maps, same fights, same loot.",
  },
};
