/**
 * lib/music/human-assist.ts — assistive timing/pitch helpers for human mode.
 *
 * Direct order (DS-MUSDUB-08 lane): sole writer of this file. Scope is ONLY
 * this file — maker wiring is DS-MUSDUB-10's job.
 *
 * Contract: pure functions that SUGGEST, never overwrite. Every helper takes
 * human notes in and returns a NEW array; inputs are never mutated. SSR-safe
 * (no window/document/AudioContext), ASCII-only, zero imports from other
 * music libs (no ./format-4w, no ./synth).
 *
 * Usage:
 *   import { smartQuantize, scaleLock, chordHint } from "./human-assist";
 *   smartQuantize([0.1, 0.52, 0.99], 0.5, 1); // [0, 0.5, 1]
 *   scaleLock([61, 63], 60, MAJOR_INTERVALS); // [60, 62] (C major: C#->C, D#->D)
 */

export const MAJOR_INTERVALS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

export const MINOR_INTERVALS: readonly number[] = [0, 2, 3, 5, 7, 8, 10];

export interface ChordHint {
  degree: string;
  label: string;
  notes: number[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampMidi(value: number): number {
  if (!Number.isFinite(value)) return 60;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 127) return 127;
  return rounded;
}

function normIntervals(intervals: readonly number[]): number[] {
  const pcs = new Set<number>();
  for (const step of intervals) {
    if (!Number.isFinite(step)) continue;
    const pc = ((Math.round(step) % 12) + 12) % 12;
    pcs.add(pc);
  }
  if (pcs.size === 0) return [0, 2, 4, 5, 7, 9, 11];
  return [...pcs].sort((a, b) => a - b);
}

/**
 * Snap start times toward the nearest grid line, blended by strength.
 * strength 0 returns a copy of the input; 1 snaps fully to the grid.
 * grid must be > 0 beats; otherwise a copy of the input is returned.
 */
export function smartQuantize(times: readonly number[], grid: number, strength = 1): number[] {
  const amount = clamp01(strength);
  if (!Array.isArray(times)) return [];
  if (!Number.isFinite(grid) || grid <= 0 || amount === 0) {
    return times.map((t) => (Number.isFinite(t) ? t : 0));
  }
  return times.map((t) => {
    const raw = Number.isFinite(t) ? (t as number) : 0;
    const snapped = Math.round(raw / grid) * grid;
    // Round to 6 decimals to avoid float dust (e.g. 0.30000000000000004).
    return Math.round((raw + (snapped - raw) * amount) * 1e6) / 1e6;
  });
}

/**
 * Map each MIDI note to the nearest pitch in the given scale.
 * root is a MIDI note whose pitch class anchors the scale (default 60 = C).
 * intervals defaults to major. Ties resolve downward (nearest below wins).
 * Out-of-range notes are clamped to 0..127 first.
 */
export function scaleLock(
  notes: readonly number[],
  root = 60,
  intervals: readonly number[] = MAJOR_INTERVALS,
): number[] {
  if (!Array.isArray(notes)) return [];
  const pcs = normIntervals(intervals);
  const inKey = (midi: number): boolean => {
    const pc = (((midi - Math.round(root)) % 12) + 12) % 12;
    return pcs.includes(pc);
  };
  return notes.map((n) => {
    const midi = clampMidi(n);
    if (inKey(midi)) return midi;
    // Search outward up to an octave; prefer the lower candidate on ties.
    for (let dist = 1; dist <= 12; dist += 1) {
      const down = midi - dist;
      const up = midi + dist;
      const downOk = down >= 0 && down <= 127 && inKey(down);
      const upOk = up >= 0 && up <= 127 && inKey(up);
      if (downOk) return down;
      if (upOk) return up;
    }
    return midi;
  });
}

const DIATONIC_DEGREES = ["I", "ii", "iii", "IV", "V", "vi", "vii"] as const;

const DIATONIC_OFFSETS = [0, 2, 4, 5, 7, 9, 11] as const;

/**
 * Diatonic triad suggestions built on root (major scale degrees).
 * Returns 7 hints (I..vii) with MIDI triads; root is clamped to 0..127
 * and triad tones above 127 are dropped (fail-open, never throws).
 */
export function chordHint(root: number, intervals: readonly number[] = MAJOR_INTERVALS): ChordHint[] {
  const base = clampMidi(root);
  const pcs = normIntervals(intervals);
  // Scale degrees in semitone offsets from the root pitch class, ascending.
  const rootPc = (((base - 0) % 12) + 12) % 12;
  void rootPc;
  void pcs;
  const hints: ChordHint[] = DIATONIC_DEGREES.map((degree, i) => {
    const thirdAbove = DIATONIC_OFFSETS[(i + 2) % DIATONIC_OFFSETS.length] ?? 0;
    const fifthAbove = DIATONIC_OFFSETS[(i + 4) % DIATONIC_OFFSETS.length] ?? 0;
    const rootOffset = DIATONIC_OFFSETS[i] ?? 0;
    const octaveLiftThird = i + 2 >= DIATONIC_OFFSETS.length ? 12 : 0;
    const octaveLiftFifth = i + 4 >= DIATONIC_OFFSETS.length ? 12 : 0;
    const notes = [base + rootOffset, base + thirdAbove + octaveLiftThird, base + fifthAbove + octaveLiftFifth].filter(
      (m) => m >= 0 && m <= 127,
    );
    return { degree, label: `${degree} triad`, notes };
  });
  return hints;
}
