/**
 * vocrehab-seed: deterministic seeded PRNG core for VocRehab practice.
 *
 * Usage:
 *   import { makeSeed, parseSeed, mulberry32, xmur3, pick, shuffle, sample } from "./vocrehab-seed";
 *   const seed = parseSeed(new URLSearchParams(location.search).get("seed")) ?? makeSeed();
 *   const rand = mulberry32(xmur3(seed)());
 *
 * Random-by-default, ?seed= for replay. Pure module: zero imports, zero I/O,
 * no browser globals — safe for client + server.
 */

/** Seed string format: VRHB- + 6 chars from A-Z/2-9 (no 0, 1, O, I lookalikes). */
export const SEED_RE: RegExp = /^VRHB-[A-Z2-9]{6}$/;

const SEED_ALPHABET: string = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** xmur3 string hash: returns a seed function for mulberry32. */
export function xmur3(str: string): () => number {
  let h: number = 1779033703 ^ str.length;
  for (let i: number = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** Mulberry32 PRNG: seeded from an unsigned 32-bit int, returns floats in [0, 1). */
export function mulberry32(a: number): () => number {
  let s: number = a | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t: number = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a random VRHB-XXXXXX seed using rand for each char. */
export function makeSeed(rand: () => number = Math.random): string {
  let out: string = "VRHB-";
  for (let i: number = 0; i < 6; i++) {
    out += SEED_ALPHABET[Math.floor(rand() * SEED_ALPHABET.length)];
  }
  return out;
}

/** Return q trimmed when it matches SEED_RE, else null. */
export function parseSeed(q: string | null): string | null {
  if (typeof q !== "string") return null;
  const t: string = q.trim();
  return SEED_RE.test(t) ? t : null;
}

/** True when both parse to valid seeds and are equal. */
export function sameSeed(a: string | null, b: string | null): boolean {
  const pa: string | null = parseSeed(a);
  const pb: string | null = parseSeed(b);
  return pa !== null && pa === pb;
}

/** Pick one item uniformly; throws on empty array. */
export function pick<T>(rand: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new RangeError("pick: empty array");
  return arr[Math.floor(rand() * arr.length)];
}

/** Fisher-Yates shuffle over a copy; never mutates the input. */
export function shuffle<T>(rand: () => number, arr: readonly T[]): T[] {
  const out: T[] = arr.slice();
  for (let i: number = out.length - 1; i > 0; i--) {
    const j: number = Math.floor(rand() * (i + 1));
    const tmp: T = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Sample up to n distinct items (clamped to 0..len), order shuffled. */
export function sample<T>(rand: () => number, arr: readonly T[], n: number): T[] {
  const count: number = Math.max(0, Math.min(Math.floor(n), arr.length));
  if (count === 0) return [];
  return shuffle(rand, arr).slice(0, count);
}

/** Hash a seed string to an unsigned 32-bit int for mulberry32. */
export function vocrehabHashSeed(seed: string): number {
  return xmur3(seed)();
}

/** Mulberry32 PRNG seeded from an unsigned 32-bit int, returns floats in [0, 1). */
export function vocrehabMulberry32(a: number): () => number {
  return mulberry32(a);
}

/** Sample up to n distinct items (clamped to 0..len), order shuffled. */
export function vocrehabSeededSample<T>(arr: readonly T[], n: number, rand: () => number): T[] {
  return sample(rand, arr, n);
}
