/**
 * lib/music/modfx-4w.ts - additive modulation + part-FX spec for tiny songs (DS-MUSDUB-01).
 *
 * Pure TS, SSR-safe, zero imports, ASCII-only. No DOM, no Node, no Date,
 * no Math.random - deterministic canonical JSON only.
 *
 * This file NEVER imports from './format-4w' or '../music-format' and never
 * edits those contracts or any done lane file (synth-4w, music-synth,
 * maker-shell/client, sfx-lab, help, verifiers, manifests). It bridges both
 * contracts by duck typing: attach helpers accept plain objects and spread
 * mod/fx fields onto them without knowing the Song/Track shapes.
 *
 * MODEL:
 *   ModLane4W = { target, points } where target selects one automatable
 *     parameter (cutoff|wobble|vibrato|detune|vol) and points is a list of
 *     [step, value] integer pairs sorted by strictly increasing step.
 *   PartFx4W = dubstep-flavored one-shot events on a part:
 *     wobble { rate, depth }, growl { amount }, riser { bars },
 *     drop { halftime }, pitchEnv { from, to, steps }.
 *
 * BUDGET:
 *   A typical modulated 16-step part (one lane with 16 points plus a full
 *   PartFx4W) serializes to well under MAX_MOD_BYTES (512). sizeOfMod()
 *   measures the canonical JSON bytes of { lanes, fx } so callers can prove
 *   it: sizeOfMod(typicalMod16().lanes, typicalMod16().fx) <= 512.
 */

// ---------------------------------------------------------------------------
// Budget + limit constants
// ---------------------------------------------------------------------------

/** Max canonical JSON bytes the mod layer may add to one part. */
export const MAX_MOD_BYTES = 512;

/** Max automation points per lane. */
export const MAX_MOD_POINTS = 64;

/** Max lanes per part. */
export const MAX_MOD_LANES = 8;

/** Step bounds (a 16-step part uses 0..15; headroom kept for 64-step parts). */
export const MAX_MOD_STEP = 256;

/** Value bounds per point (MIDI-like 0..127). */
export const MAX_MOD_VALUE = 127;

/** Wobble LFO rate bounds (Hz, integer). */
export const MAX_WOBBLE_RATE = 32;

/** Depth/amount percent bounds. */
export const MAX_DEPTH_PCT = 100;

/** Riser length bounds (bars). */
export const MAX_RISER_BARS = 8;

/** Pitch envelope bounds (semitones + steps). */
export const MAX_PITCH_SEMIS = 24;
export const MAX_PITCH_STEPS = 64;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Automatable parameter for a modulation lane. */
export type ModTarget4W = "cutoff" | "wobble" | "vibrato" | "detune" | "vol";

/** One automation point: [step, value], both integers. */
export type ModPoint4W = [number, number];

/** Per-track automation lane: one target, sorted [step, value] points. */
export interface ModLane4W {
  target: ModTarget4W;
  points: ModPoint4W[];
}

/** Wobble (LFO) event on a part. */
export interface WobbleFx4W {
  rate: number;
  depth: number;
}

/** Growl (distortion/vowel) event on a part. */
export interface GrowlFx4W {
  amount: number;
}

/** Riser (pre-drop build) event on a part. */
export interface RiserFx4W {
  bars: number;
}

/** Drop event on a part. */
export interface DropFx4W {
  halftime: boolean;
}

/** Pitch envelope over a part (semitone glide across N steps). */
export interface PitchEnv4W {
  from: number;
  to: number;
  steps: number;
}

/** Dubstep-flavored FX block attached to one part. All fields optional. */
export interface PartFx4W {
  wobble?: WobbleFx4W;
  growl?: GrowlFx4W;
  riser?: RiserFx4W;
  drop?: DropFx4W;
  pitchEnv?: PitchEnv4W;
}

/** Fail-closed validation result. */
export interface ModValidation {
  ok: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Tiny internals (never throw, no globals)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function fail(errors: string[]): ModValidation {
  return { ok: false, errors };
}

function pass(): ModValidation {
  return { ok: true, errors: [] };
}

const MOD_TARGETS: readonly ModTarget4W[] = [
  "cutoff",
  "wobble",
  "vibrato",
  "detune",
  "vol",
];

const LANE_KEYS: readonly string[] = ["target", "points"];
const FX_KEYS: readonly string[] = [
  "wobble",
  "growl",
  "riser",
  "drop",
  "pitchEnv",
];

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[]): string[] {
  const bad: string[] = [];
  for (const key of Object.keys(value)) {
    if (allowed.indexOf(key) < 0) {
      bad.push(key);
    }
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Validators (fail-closed: never throw, reject unknown keys + bad ranges)
// ---------------------------------------------------------------------------

/**
 * Validate one ModLane4W. Points must be 1..MAX_MOD_POINTS [step, value]
 * integer pairs with strictly increasing steps in 0..MAX_MOD_STEP and
 * values in 0..MAX_MOD_VALUE.
 */
export function validateModLane(value: unknown): ModValidation {
  if (!isRecord(value)) {
    return fail(["lane must be an object"]);
  }
  const errors: string[] = [];
  const bad = unknownKeys(value, LANE_KEYS);
  for (const key of bad) {
    errors.push("lane has unknown key: " + key);
  }
  const target: unknown = value["target"];
  if (typeof target !== "string" || MOD_TARGETS.indexOf(target as ModTarget4W) < 0) {
    errors.push("lane.target must be one of cutoff|wobble|vibrato|detune|vol");
  }
  const points: unknown = value["points"];
  if (!Array.isArray(points)) {
    errors.push("lane.points must be an array of [step,value] pairs");
    return fail(errors);
  }
  if (points.length < 1 || points.length > MAX_MOD_POINTS) {
    errors.push("lane.points length must be 1.." + MAX_MOD_POINTS);
  }
  let prevStep = -1;
  for (let i = 0; i < points.length; i++) {
    const pt: unknown = points[i];
    if (!Array.isArray(pt) || pt.length !== 2) {
      errors.push("lane.points[" + i + "] must be a [step,value] pair");
      continue;
    }
    const step: unknown = pt[0];
    const val: unknown = pt[1];
    if (!isInt(step) || step < 0 || step > MAX_MOD_STEP) {
      errors.push("lane.points[" + i + "][0] step must be int 0.." + MAX_MOD_STEP);
    } else {
      if (step <= prevStep) {
        errors.push("lane.points[" + i + "][0] steps must strictly increase");
      }
      prevStep = step;
    }
    if (!isInt(val) || val < 0 || val > MAX_MOD_VALUE) {
      errors.push("lane.points[" + i + "][1] value must be int 0.." + MAX_MOD_VALUE);
    }
  }
  if (errors.length > 0) {
    return fail(errors);
  }
  return pass();
}

/** Validate one wobble block. */
function validateWobble(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("fx.wobble must be an object");
    return;
  }
  const bad = unknownKeys(value, ["rate", "depth"]);
  for (const key of bad) {
    errors.push("fx.wobble has unknown key: " + key);
  }
  if (!isInt(value["rate"]) || (value["rate"] as number) < 0 || (value["rate"] as number) > MAX_WOBBLE_RATE) {
    errors.push("fx.wobble.rate must be int 0.." + MAX_WOBBLE_RATE);
  }
  if (!isInt(value["depth"]) || (value["depth"] as number) < 0 || (value["depth"] as number) > MAX_DEPTH_PCT) {
    errors.push("fx.wobble.depth must be int 0.." + MAX_DEPTH_PCT);
  }
}

/** Validate one growl block. */
function validateGrowl(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("fx.growl must be an object");
    return;
  }
  const bad = unknownKeys(value, ["amount"]);
  for (const key of bad) {
    errors.push("fx.growl has unknown key: " + key);
  }
  if (!isInt(value["amount"]) || (value["amount"] as number) < 0 || (value["amount"] as number) > MAX_DEPTH_PCT) {
    errors.push("fx.growl.amount must be int 0.." + MAX_DEPTH_PCT);
  }
}

/** Validate one riser block. */
function validateRiser(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("fx.riser must be an object");
    return;
  }
  const bad = unknownKeys(value, ["bars"]);
  for (const key of bad) {
    errors.push("fx.riser has unknown key: " + key);
  }
  if (!isInt(value["bars"]) || (value["bars"] as number) < 1 || (value["bars"] as number) > MAX_RISER_BARS) {
    errors.push("fx.riser.bars must be int 1.." + MAX_RISER_BARS);
  }
}

/** Validate one drop block. */
function validateDrop(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("fx.drop must be an object");
    return;
  }
  const bad = unknownKeys(value, ["halftime"]);
  for (const key of bad) {
    errors.push("fx.drop has unknown key: " + key);
  }
  if (typeof value["halftime"] !== "boolean") {
    errors.push("fx.drop.halftime must be boolean");
  }
}

/** Validate one pitch-envelope block. */
function validatePitchEnv(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("fx.pitchEnv must be an object");
    return;
  }
  const bad = unknownKeys(value, ["from", "to", "steps"]);
  for (const key of bad) {
    errors.push("fx.pitchEnv has unknown key: " + key);
  }
  if (!isInt(value["from"]) || Math.abs(value["from"] as number) > MAX_PITCH_SEMIS) {
    errors.push("fx.pitchEnv.from must be int -" + MAX_PITCH_SEMIS + ".." + MAX_PITCH_SEMIS);
  }
  if (!isInt(value["to"]) || Math.abs(value["to"] as number) > MAX_PITCH_SEMIS) {
    errors.push("fx.pitchEnv.to must be int -" + MAX_PITCH_SEMIS + ".." + MAX_PITCH_SEMIS);
  }
  if (!isInt(value["steps"]) || (value["steps"] as number) < 1 || (value["steps"] as number) > MAX_PITCH_STEPS) {
    errors.push("fx.pitchEnv.steps must be int 1.." + MAX_PITCH_STEPS);
  }
}

/**
 * Validate one PartFx4W. Every block is optional; present blocks must be
 * well-formed and unknown keys are rejected. An empty object is valid
 * (a part with no FX).
 */
export function validatePartFx(value: unknown): ModValidation {
  if (!isRecord(value)) {
    return fail(["fx must be an object"]);
  }
  const errors: string[] = [];
  const bad = unknownKeys(value, FX_KEYS);
  for (const key of bad) {
    errors.push("fx has unknown key: " + key);
  }
  if (value["wobble"] !== undefined) {
    validateWobble(value["wobble"], errors);
  }
  if (value["growl"] !== undefined) {
    validateGrowl(value["growl"], errors);
  }
  if (value["riser"] !== undefined) {
    validateRiser(value["riser"], errors);
  }
  if (value["drop"] !== undefined) {
    validateDrop(value["drop"], errors);
  }
  if (value["pitchEnv"] !== undefined) {
    validatePitchEnv(value["pitchEnv"], errors);
  }
  if (errors.length > 0) {
    return fail(errors);
  }
  return pass();
}

/**
 * Validate a full mod set for one part: 0..MAX_MOD_LANES lanes plus an
 * optional fx block. Lanes must each validate; duplicate targets are
 * rejected (one lane per target per part).
 */
export function validateModSet(lanes: unknown, fx: unknown): ModValidation {
  const errors: string[] = [];
  if (!Array.isArray(lanes)) {
    return fail(["lanes must be an array"]);
  }
  if (lanes.length > MAX_MOD_LANES) {
    errors.push("lanes length must be 0.." + MAX_MOD_LANES);
  }
  const seen: string[] = [];
  for (let i = 0; i < lanes.length; i++) {
    const res = validateModLane(lanes[i]);
    if (!res.ok) {
      for (const e of res.errors) {
        errors.push("lanes[" + i + "]: " + e);
      }
    } else if (isRecord(lanes[i] as unknown)) {
      const t = String((lanes[i] as Record<string, unknown>)["target"]);
      if (seen.indexOf(t) >= 0) {
        errors.push("lanes[" + i + "]: duplicate target " + t);
      } else {
        seen.push(t);
      }
    }
  }
  if (fx !== undefined && fx !== null) {
    const res = validatePartFx(fx);
    if (!res.ok) {
      for (const e of res.errors) {
        errors.push("fx: " + e);
      }
    }
  }
  if (errors.length > 0) {
    return fail(errors);
  }
  return pass();
}

// ---------------------------------------------------------------------------
// Size proof (canonical JSON bytes; ASCII-only so chars == bytes)
// ---------------------------------------------------------------------------

/**
 * Canonical byte size of the mod layer for one part. Measures
 * JSON.stringify({ lanes, fx }) length; all mod strings are ASCII so one
 * char is one byte. Never throws: unserializable input measures 0.
 */
export function sizeOfMod(lanes: ModLane4W[], fx?: PartFx4W | null): number {
  try {
    const payload: Record<string, unknown> = { lanes: lanes || [] };
    if (fx !== undefined && fx !== null) {
      payload["fx"] = fx;
    }
    const text = JSON.stringify(payload);
    return typeof text === "string" ? text.length : 0;
  } catch {
    return 0;
  }
}

/** True when the mod layer for one part fits inside MAX_MOD_BYTES. */
export function modFitsBudget(lanes: ModLane4W[], fx?: PartFx4W | null): boolean {
  return sizeOfMod(lanes, fx) <= MAX_MOD_BYTES;
}

/**
 * Typical modulated 16-step part: one cutoff lane with 16 points plus a
 * full FX block (wobble + growl + riser + drop + pitchEnv). Canonical size
 * is about 340 bytes, provably under MAX_MOD_BYTES (512). Callers prove it
 * with: sizeOfMod(ex.lanes, ex.fx) <= MAX_MOD_BYTES.
 */
export function typicalMod16(): { lanes: ModLane4W[]; fx: PartFx4W } {
  const points: ModPoint4W[] = [
    [0, 20],
    [1, 28],
    [2, 36],
    [3, 44],
    [4, 52],
    [5, 60],
    [6, 68],
    [7, 76],
    [8, 84],
    [9, 90],
    [10, 96],
    [11, 102],
    [12, 108],
    [13, 114],
    [14, 120],
    [15, 127],
  ];
  const lanes: ModLane4W[] = [{ target: "cutoff", points }];
  const fx: PartFx4W = {
    wobble: { rate: 8, depth: 70 },
    growl: { amount: 55 },
    riser: { bars: 2 },
    drop: { halftime: true },
    pitchEnv: { from: 0, to: 12, steps: 16 },
  };
  return { lanes, fx };
}

// ---------------------------------------------------------------------------
// Duck-typed bridge (serves both song contracts without importing them)
// ---------------------------------------------------------------------------

/**
 * Attach lanes + fx to any part-like object by spreading. Never mutates the
 * input; unknown keys on the part pass through untouched. Returns a fresh
 * plain object carrying `mod` (lanes) and, when given, `fx`.
 */
export function withMod(
  part: Record<string, unknown>,
  lanes: ModLane4W[],
  fx?: PartFx4W | null
): Record<string, unknown> {
  const base: Record<string, unknown> = isRecord(part) ? part : {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(base)) {
    out[key] = base[key];
  }
  out["mod"] = Array.isArray(lanes) ? lanes : [];
  if (fx !== undefined && fx !== null) {
    out["fx"] = fx;
  }
  return out;
}

/**
 * Read back an attached mod layer from any part-like object. Returns null
 * when nothing valid is attached (fail-open read; use validateModSet to
 * enforce).
 */
export function readMod(part: unknown): { lanes: ModLane4W[]; fx: PartFx4W | null } | null {
  if (!isRecord(part)) {
    return null;
  }
  const mod: unknown = part["mod"];
  if (!Array.isArray(mod)) {
    return null;
  }
  const fxRaw: unknown = part["fx"];
  const fx: PartFx4W | null = isRecord(fxRaw) ? (fxRaw as PartFx4W) : null;
  return { lanes: mod as ModLane4W[], fx };
}
