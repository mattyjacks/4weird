/**
 * lib/music/dubstep-recipes.ts - tiny dubstep one-shot + part recipes (DS-MUSDUB-03).
 *
 * Pure data + local types. Zero imports from other music libs (never edit them).
 * SSR-safe: no browser APIs, no DOM, no AudioContext. ASCII-only.
 * Never throws: lookups return undefined, checks return error lists.
 *
 * Each recipe is a compact PartFx-style event: a one-shot dubstep voice with
 * wobble (filter-cutoff LFO rate+depth), growl (FM/detune grit amount), riser
 * (bar-counted noise/saw lift), halftime drop feel, or pitch-envelope dives.
 * Canonical JSON per recipe stays under MAX_RECIPE_BYTES (400).
 *
 * Hook shapes transcribed as technique ideas only (never copied) from:
 *   gravegain3d/audio/sound-engine.js (initCtx lazy-AudioContext + playSfx
 *     osc pitch ramps + gain-decay envelopes + noise-buffer bandpass sweeps)
 *   gravegain4d/audio/sound4d.js (same initCtx/playSfx hook shape + master
 *     gain live-mute + tracked-node stop path + gesture-resume)
 *
 * Usage:
 *   import { DUBSTEP_RECIPES, recipeById, recipesByKind } from "./dubstep-recipes";
 *   const wob = recipeById("wobble-a"); // DubstepRecipe | undefined
 *   const growls = recipesByKind("growl"); // DubstepRecipe[]
 */

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/** Max canonical JSON bytes per recipe (keeps one-shots tiny). */
export const MAX_RECIPE_BYTES = 400;

/** Format version for recipes. Only 1 is accepted. */
export const DUBSTEP_RECIPE_VERSION = 1;

// ---------------------------------------------------------------------------
// Types (local PartFx shape - duck-typed, no imports)
// ---------------------------------------------------------------------------

/** Recipe voice kind. */
export type DubstepKind =
  | "wobble"
  | "growl"
  | "kick"
  | "snare"
  | "riser"
  | "drop"
  | "stab"
  | "sub"
  | "dive";

/** Oscillator/filter voice for the one-shot. */
export type DubstepWave = "saw" | "square" | "sine" | "tri" | "noise";

/**
 * Tiny dubstep one-shot + part recipe as pure data.
 * All numeric params use plain JSON numbers; readers clamp defensively.
 */
export interface DubstepRecipe {
  /** Stable id, lowercase letters + digits + dashes. */
  id: string;
  /** Voice family for recipesByKind grouping. */
  kind: DubstepKind;
  /** Oscillator/filter voice. */
  wave: DubstepWave;
  /** Start frequency in Hz (20..20000). */
  freq: number;
  /** End frequency in Hz (20..20000). */
  freqEnd: number;
  /** Duration in seconds (0.05..4). */
  dur: number;
  /** Volume 0..1. */
  vol: number;
  /** Wobble LFO rate in Hz (filter-cutoff LFO). Optional. */
  rate?: number;
  /** Wobble LFO depth 0..1. Optional. */
  depth?: number;
  /** Growl grit amount 0..1 (FM/detune grit). Optional. */
  growl?: number;
  /** Riser length in bars. Optional. */
  bars?: number;
  /** Halftime drop feel flag. Optional. */
  half?: boolean;
}

/** Validation result for one recipe. Never throws. */
export interface DubstepRecipeCheck {
  id: string;
  kind: DubstepKind;
  bytes: number;
  ok: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Pure helpers (no audio)
// ---------------------------------------------------------------------------

function isFiniteNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function inRange(value: number, lo: number, hi: number): boolean {
  return value >= lo && value <= hi;
}

/** Canonical compact JSON for a recipe (same bytes recipeByteSize counts). */
export function encodeRecipe(recipe: DubstepRecipe): string {
  return JSON.stringify(recipe);
}

/** Canonical JSON byte size, or -1 when unserializable. Never throws. */
export function recipeByteSize(recipe: DubstepRecipe): number {
  try {
    return Buffer.byteLength(encodeRecipe(recipe), "utf8");
  } catch {
    try {
      return encodeRecipe(recipe).length;
    } catch {
      return -1;
    }
  }
}

/**
 * Validate one recipe against the local PartFx shape + byte budget.
 * Fail-closed: returns { ok, errors[] }. Never throws.
 */
export function validateRecipe(recipe: DubstepRecipe): {
  ok: boolean;
  errors: string[];
} {
  try {
    const errors: string[] = [];
    if (recipe === null || typeof recipe !== "object") {
      return { ok: false, errors: ["recipe: not an object"] };
    }
    const rec = recipe as unknown as Record<string, unknown>;
    if (typeof rec["id"] !== "string" || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(rec["id"] as string)) {
      errors.push("id: must match ^[a-z0-9][a-z0-9-]{0,39}$");
    }
    const kinds: DubstepKind[] = [
      "wobble",
      "growl",
      "kick",
      "snare",
      "riser",
      "drop",
      "stab",
      "sub",
      "dive",
    ];
    if (typeof rec["kind"] !== "string" || kinds.indexOf(rec["kind"] as DubstepKind) < 0) {
      errors.push("kind: unknown kind");
    }
    const waves: DubstepWave[] = ["saw", "square", "sine", "tri", "noise"];
    if (typeof rec["wave"] !== "string" || waves.indexOf(rec["wave"] as DubstepWave) < 0) {
      errors.push("wave: unknown wave");
    }
    if (!isFiniteNum(rec["freq"]) || !inRange(rec["freq"], 20, 20000)) {
      errors.push("freq: must be 20..20000");
    }
    if (!isFiniteNum(rec["freqEnd"]) || !inRange(rec["freqEnd"], 20, 20000)) {
      errors.push("freqEnd: must be 20..20000");
    }
    if (!isFiniteNum(rec["dur"]) || !inRange(rec["dur"], 0.05, 4)) {
      errors.push("dur: must be 0.05..4");
    }
    if (!isFiniteNum(rec["vol"]) || !inRange(rec["vol"], 0, 1)) {
      errors.push("vol: must be 0..1");
    }
    if (rec["rate"] !== undefined && (!isFiniteNum(rec["rate"]) || !inRange(rec["rate"], 0.5, 32))) {
      errors.push("rate: must be 0.5..32");
    }
    if (rec["depth"] !== undefined && (!isFiniteNum(rec["depth"]) || !inRange(rec["depth"], 0, 1))) {
      errors.push("depth: must be 0..1");
    }
    if (rec["growl"] !== undefined && (!isFiniteNum(rec["growl"]) || !inRange(rec["growl"], 0, 1))) {
      errors.push("growl: must be 0..1");
    }
    if (rec["bars"] !== undefined && (!isFiniteNum(rec["bars"]) || !inRange(rec["bars"], 1, 16))) {
      errors.push("bars: must be 1..16");
    }
    if (rec["half"] !== undefined && typeof rec["half"] !== "boolean") {
      errors.push("half: must be boolean");
    }
    const bytes = recipeByteSize(recipe);
    if (bytes < 0) {
      errors.push("unserializable");
    } else if (bytes > MAX_RECIPE_BYTES) {
      errors.push("JSON " + bytes + " bytes exceeds " + MAX_RECIPE_BYTES);
    }
    return { ok: errors.length === 0, errors };
  } catch {
    return { ok: false, errors: ["validate: threw"] };
  }
}

// ---------------------------------------------------------------------------
// Recipes (13 tiny dubstep one-shots, each <= 400B JSON)
// ---------------------------------------------------------------------------

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'hit' - saw pitch-drop + fast-decay envelope technique.
export const WOBBLE_A: DubstepRecipe = {
  id: "wobble-a",
  kind: "wobble",
  wave: "saw",
  freq: 110,
  freqEnd: 55,
  dur: 0.5,
  vol: 0.8,
  rate: 8,
  depth: 0.9,
};

// Provenance: gravegain4d/audio/sound4d.js playSfx hook - slow filter-sweep LFO wobble technique.
export const WOBBLE_B: DubstepRecipe = {
  id: "wobble-b",
  kind: "wobble",
  wave: "saw",
  freq: 98,
  freqEnd: 49,
  dur: 0.6,
  vol: 0.8,
  rate: 4,
  depth: 0.7,
};

// Provenance: gravegain3d/audio/sound-engine.js ambient LFO pair - fast cutoff-LFO chop technique.
export const WOBBLE_C: DubstepRecipe = {
  id: "wobble-c",
  kind: "wobble",
  wave: "square",
  freq: 130,
  freqEnd: 65,
  dur: 0.45,
  vol: 0.75,
  rate: 12,
  depth: 0.85,
};

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'crit' - detuned triangle grit + downward pitch technique.
export const GROWL_A: DubstepRecipe = {
  id: "growl-a",
  kind: "growl",
  wave: "saw",
  freq: 220,
  freqEnd: 70,
  dur: 0.7,
  vol: 0.85,
  rate: 6,
  depth: 0.8,
  growl: 0.9,
};

// Provenance: gravegain4d/audio/sound4d.js gore-splat hook - FM-style low churn + noise grit technique.
export const GROWL_B: DubstepRecipe = {
  id: "growl-b",
  kind: "growl",
  wave: "square",
  freq: 180,
  freqEnd: 60,
  dur: 0.65,
  vol: 0.82,
  rate: 10,
  depth: 0.6,
  growl: 0.7,
};

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'hit' - low sine punch + click transient technique.
export const HALFTIME_KICK: DubstepRecipe = {
  id: "halftime-kick",
  kind: "kick",
  wave: "sine",
  freq: 150,
  freqEnd: 40,
  dur: 0.3,
  vol: 0.9,
  half: true,
};

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'swing' - noise-buffer bandpass snap technique.
export const HALFTIME_SNARE: DubstepRecipe = {
  id: "halftime-snare",
  kind: "snare",
  wave: "noise",
  freq: 1800,
  freqEnd: 400,
  dur: 0.25,
  vol: 0.85,
  half: true,
};

// Provenance: gravegain4d/audio/sound4d.js tracked-node roll hook - tight repeating snare-build accelerando technique.
export const BUILD_SNARE: DubstepRecipe = {
  id: "build-snare",
  kind: "snare",
  wave: "noise",
  freq: 2200,
  freqEnd: 900,
  dur: 0.18,
  vol: 0.8,
  bars: 2,
};

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'swing' rising variant - bandpass sweep-up lift technique.
export const RISER: DubstepRecipe = {
  id: "riser",
  kind: "riser",
  wave: "noise",
  freq: 400,
  freqEnd: 6000,
  dur: 2.0,
  vol: 0.7,
  bars: 4,
};

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'crit' - stacked punch + noise wash impact technique.
export const DROP_HIT: DubstepRecipe = {
  id: "drop-hit",
  kind: "drop",
  wave: "saw",
  freq: 160,
  freqEnd: 30,
  dur: 0.8,
  vol: 0.9,
  half: true,
};

// Provenance: gravegain4d/audio/sound4d.js high shimmer hook - bright square stab + short decay technique.
export const STAB: DubstepRecipe = {
  id: "stab",
  kind: "stab",
  wave: "square",
  freq: 880,
  freqEnd: 660,
  dur: 0.22,
  vol: 0.8,
};

// Provenance: gravegain3d/audio/sound-engine.js playSfx 'hit' sub variant - deep sine sub-drop technique.
export const SUB_DROP: DubstepRecipe = {
  id: "sub-drop",
  kind: "sub",
  wave: "sine",
  freq: 100,
  freqEnd: 28,
  dur: 1.2,
  vol: 0.9,
};

// Provenance: gravegain4d/audio/sound4d.js rewind reverse-sweep hook - vinyl-stop pitch-dive halt technique.
export const PITCH_DIVE: DubstepRecipe = {
  id: "pitch-dive",
  kind: "dive",
  wave: "saw",
  freq: 600,
  freqEnd: 40,
  dur: 0.9,
  vol: 0.75,
};

/** All thirteen recipes in one list, handy for panels/lab UIs. */
export const DUBSTEP_RECIPES: DubstepRecipe[] = [
  WOBBLE_A,
  WOBBLE_B,
  WOBBLE_C,
  GROWL_A,
  GROWL_B,
  HALFTIME_KICK,
  HALFTIME_SNARE,
  BUILD_SNARE,
  RISER,
  DROP_HIT,
  STAB,
  SUB_DROP,
  PITCH_DIVE,
];

// ---------------------------------------------------------------------------
// Registry lookups (pure, never throw)
// ---------------------------------------------------------------------------

/** Lookup by id (case-insensitive, trimmed). Returns undefined when absent. */
export function recipeById(id: string): DubstepRecipe | undefined {
  try {
    const want = id.trim().toLowerCase();
    for (const recipe of DUBSTEP_RECIPES) {
      if (recipe.id.toLowerCase() === want) return recipe;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** All recipes of one kind, in DUBSTEP_RECIPES order. Never throws. */
export function recipesByKind(kind: DubstepKind): DubstepRecipe[] {
  try {
    return DUBSTEP_RECIPES.filter((recipe) => recipe.kind === kind);
  } catch {
    return [];
  }
}

/** Recipe ids in DUBSTEP_RECIPES order. Never throws. */
export function listRecipeIds(): string[] {
  try {
    return DUBSTEP_RECIPES.map((recipe) => recipe.id);
  } catch {
    return [];
  }
}

/**
 * Validate every recipe against the local PartFx shape plus the byte budget.
 * Never throws.
 */
export function checkDubstepRecipes(): DubstepRecipeCheck[] {
  try {
    return DUBSTEP_RECIPES.map((recipe) => {
      const result = validateRecipe(recipe);
      const bytes = recipeByteSize(recipe);
      const errors = [...result.errors];
      return {
        id: recipe.id,
        kind: recipe.kind,
        bytes,
        ok: result.ok && bytes >= 0 && bytes <= MAX_RECIPE_BYTES,
        errors,
      };
    });
  } catch {
    return [];
  }
}
