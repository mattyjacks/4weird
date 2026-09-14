/**
 * vocrehab-interview-shuffle: seeded ordering for interview practice questions.
 *
 * Every load a different order by default (via makeSeed); same seed replays
 * exactly. Pure module: zero I/O, imports only from frozen ./vocrehab-seed,
 * no DOM, no Math.random / Date.now (freshness comes from makeSeed only).
 */

import { makeSeed, mulberry32, parseSeed, shuffle, xmur3 } from "./vocrehab-seed";

/** Seeded interview question ordering for one job. */
export interface VocrehabInterviewOrder {
  seed: string;
  jobId: string;
  order: number[];
  questions: string[];
}

/** Resolve an unknown seed candidate via parseSeed; null when invalid. */
function asSeed(value: unknown): string | null {
  return typeof value === "string" ? parseSeed(value) : null;
}

/** Build the order payload for a resolved seed (never throws on its own). */
function buildOrder(jobId: string, questions: readonly string[], seed: string): VocrehabInterviewOrder {
  if (questions.length === 0) return { seed, jobId, order: [], questions: [] };
  const rand: () => number = mulberry32(xmur3(seed)());
  const indices: number[] = questions.map((_, i: number): number => i);
  const order: number[] = shuffle(rand, indices);
  const ordered: string[] = order.map((i: number): string => questions[i]);
  return { seed, jobId, order, questions: ordered };
}

/**
 * Seeded interview ordering. Uses `seed` when it parses via parseSeed,
 * otherwise mints a fresh one with makeSeed(). Empty questions yields empty
 * order/questions. Never throws.
 */
export function vocrehabInterviewOrder(
  jobId: string,
  questions: readonly string[],
  seed?: unknown,
): VocrehabInterviewOrder {
  try {
    const resolved: string = asSeed(seed) ?? makeSeed();
    const list: readonly string[] = Array.isArray(questions) ? questions : [];
    return buildOrder(jobId, list, resolved);
  } catch {
    return { seed: makeSeed(), jobId, order: [], questions: [] };
  }
}

/**
 * Replay a prior interview ordering. Returns null unless `seed` parses via
 * parseSeed; otherwise deterministic (same seed + questions = same order).
 */
export function vocrehabReplayInterviewOrder(
  jobId: string,
  questions: readonly string[],
  seed: unknown,
): VocrehabInterviewOrder | null {
  const resolved: string | null = asSeed(seed);
  if (resolved === null) return null;
  try {
    const list: readonly string[] = Array.isArray(questions) ? questions : [];
    return buildOrder(jobId, list, resolved);
  } catch {
    return null;
  }
}

/**
 * Deterministic curveball turn in [2, max(2, turns - 1)] so live + replay
 * agree on interruption placement. Never throws (falls back to 2).
 */
export function vocrehabInterviewCurveballSlot(randSeed: string, turns: number): number {
  try {
    const n: number = typeof turns === "number" && Number.isFinite(turns) ? Math.floor(turns) : 2;
    const hi: number = Math.max(2, n - 1);
    const rand: () => number = mulberry32(xmur3("cb:" + String(randSeed))());
    return 2 + Math.floor(rand() * (hi - 2 + 1));
  } catch {
    return 2;
  }
}
