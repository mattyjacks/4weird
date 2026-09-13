/**
 * Luck Factory — intention + deterministic luck engine (remastery README Feature 08, Wave 3).
 *
 * Entertainment only, not gambling — no wagers, no payouts.
 * Draws are deterministic illustrations of intention/streak inputs, not games of chance.
 */

/** A single deterministic luck draw. */
export interface LuckDraw {
  /** Seed string the draw was derived from. */
  seed: string;
  /** Non-negative integer draw counter (e.g. per-day or per-pull index). */
  counter: number;
  /** Hash-derived value in [0, 1) — 0 inclusive, 1 exclusive. */
  value: number;
  /** D100 roll in [1, 100] derived from value. */
  roll: number;
}

/**
 * Synchronous FNV-1a (32-bit) hash rendered as 8-char lowercase hex.
 *
 * NON-cryptographic mixing for deterministic draws, not security.
 * Not a CSPRNG, not a KDF, not collision-resistant — used only to spread
 * (seed, counter) inputs uniformly over uint32 space so draws are stable.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply with overflow truncation.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function hashToUnit(hashHex: string): number {
  const uint32 = parseInt(hashHex, 16) >>> 0;
  // 2^32 = 4294967296; uint32 max maps to just under 1, never 1.
  return uint32 / 4294967296;
}

/**
 * Deterministic luck draw: same (seed, counter) inputs → same outputs.
 * Pure function (aside from throwing on invalid input, which is pure validation).
 *
 * @throws on empty/whitespace seed or non-integer / negative counter.
 */
export function drawLuck(seed: string, counter: number): LuckDraw {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new Error("drawLuck: seed must be a non-empty string");
  }
  if (!Number.isInteger(counter) || counter < 0) {
    throw new Error("drawLuck: counter must be a non-negative integer");
  }
  const value = hashToUnit(fnv1aHex(`${seed}:${counter}`));
  const roll = 1 + Math.floor(value * 100);
  return { seed, counter, value, roll };
}

/**
 * Meditation-streak bonus: +1 per full 7-day streak week, capped at +10.
 * Result clamped to [1, 100].
 *
 * Fail-open: garbage/negative/non-finite streak or baseRoll inputs yield
 * 0 bonus (base clamped) and this function never throws.
 */
export function intentionBoost(baseRoll: number, streakDays: number): number {
  const base = typeof baseRoll === "number" && Number.isFinite(baseRoll)
    ? Math.floor(baseRoll)
    : 1;
  let bonus = 0;
  if (typeof streakDays === "number" && Number.isFinite(streakDays) && streakDays > 0) {
    bonus = Math.min(10, Math.floor(streakDays / 7));
  }
  const result = base + bonus;
  if (result < 1) return 1;
  if (result > 100) return 100;
  return result;
}

/** True when the draw is a perfect D100 (roll === 100). */
export function isJackpot(draw: LuckDraw): boolean {
  if (!draw || typeof draw.roll !== "number") return false;
  return draw.roll === 100;
}

/**
 * Mint a fresh seed in "label:hexhash" format.
 *
 * IMPURE BY DESIGN — the ONLY impure function in this module. Mixes
 * Date.now() and Math.random() (plus optional caller salt) so each minted
 * seed is unique. Uses only Date/Math (no window, no crypto, no secrets).
 */
export function mintSeed(label: string, salt?: string): string {
  const clean = typeof label === "string" && label.length > 0 ? label : "luck";
  const extra = typeof salt === "string" && salt.length > 0 ? salt : `${Date.now()}:${Math.random()}`;
  return `${clean}:${fnv1aHex(`${clean}:${extra}:${Date.now()}:${Math.random()}`)}`;
}
