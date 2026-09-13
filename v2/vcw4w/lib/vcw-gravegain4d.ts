/**
 * VibeCodeWorker GraveGain4D autoplay probe policy (server-safe, pure data).
 *
 * This module defines HOW VCW autoplay validates the GraveGain4D dream
 * (hole-by-hole probe plan, W-slice sweep values, rewind/ghost assertions,
 * per-hole par budgets, fail-open verdict) WITHOUT touching gameplay code,
 * WITHOUT network, and WITHOUT touching browser globals at import time.
 *
 * Client-side globals this policy reasons ABOUT (never imported here —
 * the TEE/probe runner reads them client-side and feeds plain results in):
 * - `window.GraveGain4DWorlds`   — world/tee definitions per hole
 *   (expected shape: record of hole descriptors; read client-side only).
 * - `window.GraveGain4DMissions` — mission descriptors per hole
 *   (expected shape: record keyed by missionId; read client-side only).
 *
 * Server-safety contract:
 * - No `window` / `document` / `navigator` access at import or at call time.
 * - No fetch, no timers, no side effects. All exports are frozen data or
 *   pure functions over caller-supplied plain values.
 * - No dependencies beyond local types (zero imports).
 */

export type G4DProbeStep = {
  /** 1-based hole number (1..10). */
  hole: number;
  /** Mission id the client-side runner resolves via `window.GraveGain4DMissions`. */
  missionId: string;
  /** Par budget for this hole. Mirrors G4D_PAR_BUDGETS[hole]. */
  par: number;
  /** W-slice values the probe sweeps (4th-axis samples) for this hole. */
  wSweep: readonly number[];
  /** Human-readable rewind assertion the runner checks client-side. */
  rewindAssert: string;
  /** Human-readable ghost assertion the runner checks client-side. */
  ghostAssert: string;
};

/**
 * 10-hole probe plan. Each entry names the mission, its par, the W-slice
 * sweep values, and the rewind/ghost assertions the client-side runner
 * evaluates against the live `window.GraveGain4DWorlds/Missions` globals.
 */
export const G4D_PROBE_PLAN: readonly G4DProbeStep[] = Object.freeze([
  Object.freeze({
    hole: 1,
    missionId: "g4d-mission-tee-warmup",
    par: 3,
    wSweep: Object.freeze([-1, 0, 1]),
    rewindAssert: "rewind restores tee snapshot within epsilon",
    ghostAssert: "ghost trail renders for the warmup line",
  }),
  Object.freeze({
    hole: 2,
    missionId: "g4d-mission-w-drift",
    par: 3,
    wSweep: Object.freeze([-1, -0.5, 0, 0.5, 1]),
    rewindAssert: "rewind clears mid-flight W-drift offset",
    ghostAssert: "ghost shows pre-drift aim pose",
  }),
  Object.freeze({
    hole: 3,
    missionId: "g4d-mission-slice-gate",
    par: 4,
    wSweep: Object.freeze([-1, -0.25, 0.25, 1]),
    rewindAssert: "rewind returns ball to pre-gate slice",
    ghostAssert: "ghost marks gated slice crossing",
  }),
  Object.freeze({
    hole: 4,
    missionId: "g4d-mission-echo-fairway",
    par: 4,
    wSweep: Object.freeze([-0.75, 0, 0.75]),
    rewindAssert: "rewind keeps echo count monotonic",
    ghostAssert: "ghost echo matches last committed stroke",
  }),
  Object.freeze({
    hole: 5,
    missionId: "g4d-mission-turn-halfway",
    par: 3,
    wSweep: Object.freeze([-1, 0, 1]),
    rewindAssert: "rewind at turn preserves halved W-bias",
    ghostAssert: "ghost displays turn checkpoint",
  }),
  Object.freeze({
    hole: 6,
    missionId: "g4d-mission-back-loop",
    par: 4,
    wSweep: Object.freeze([-1, -0.5, 0.5, 1]),
    rewindAssert: "rewind unwinds one loop iteration only",
    ghostAssert: "ghost loop overlay stays aligned",
  }),
  Object.freeze({
    hole: 7,
    missionId: "g4d-mission-narrow-fold",
    par: 4,
    wSweep: Object.freeze([-0.5, -0.1, 0.1, 0.5]),
    rewindAssert: "rewind restores pre-fold aim vector",
    ghostAssert: "ghost fold guide visible at narrow gate",
  }),
  Object.freeze({
    hole: 8,
    missionId: "g4d-mission-gravity-well",
    par: 5,
    wSweep: Object.freeze([-1, -0.33, 0.33, 1]),
    rewindAssert: "rewind escapes well pull without teleport",
    ghostAssert: "ghost well-radius ring matches plan",
  }),
  Object.freeze({
    hole: 9,
    missionId: "g4d-mission-penultimate-rise",
    par: 3,
    wSweep: Object.freeze([-0.5, 0, 0.5]),
    rewindAssert: "rewind keeps rise progress, resets stroke only",
    ghostAssert: "ghost rise marker matches tee read",
  }),
  Object.freeze({
    hole: 10,
    missionId: "g4d-mission-cup-finale",
    par: 4,
    wSweep: Object.freeze([-1, -0.5, 0, 0.5, 1]),
    rewindAssert: "final rewind leaves cup state untouched",
    ghostAssert: "champion ghost plays the finale line",
  }),
] as const);

/** Per-hole par budgets, keyed by 1-based hole number. */
export const G4D_PAR_BUDGETS: Readonly<Record<number, number>> = Object.freeze({
  1: 3,
  2: 3,
  3: 4,
  4: 4,
  5: 3,
  6: 4,
  7: 4,
  8: 5,
  9: 3,
  10: 4,
});

/** Total par across the 10-hole probe round (37). */
export const G4D_PAR_TOTAL = 37;

/** Per-hole result fed into {@link evaluateProbe} (plain data, no DOM). */
export type G4DHoleResult = {
  hole: number;
  strokes: number;
  rewindsUsed?: number;
  ghostOk?: boolean;
};

/** Fail-open verdict returned by {@link evaluateProbe}. */
export type G4DProbeVerdict = {
  pass: boolean;
  strokesVsPar: number;
  notes: string[];
};

/**
 * Fail-open pure evaluator: compares supplied per-hole stroke counts
 * against {@link G4D_PAR_BUDGETS} plus the autoplay policy caps.
 *
 * Fail-open semantics (never throws, never fails on missing data):
 * - Non-array / empty input passes with an explanatory note.
 * - Unknown holes or non-numeric strokes are noted and skipped (pass).
 * - Otherwise pass requires: total strokes within par + slack AND no hole
 *   over the per-hole stroke cap AND rewinds within budget AND ghosts ok
 *   where reported (absent ghost flags are skipped, not failed).
 */
export function evaluateProbe(holeResults: readonly G4DHoleResult[]): G4DProbeVerdict {
  const notes: string[] = [];
  if (!Array.isArray(holeResults) || holeResults.length === 0) {
    return { pass: true, strokesVsPar: 0, notes: ["no hole results supplied; fail-open pass"] };
  }
  let strokesTotal = 0;
  let parTotal = 0;
  let pass = true;
  let rewindsTotal = 0;
  for (const entry of holeResults) {
    const hole = typeof entry?.hole === "number" ? entry.hole : NaN;
    const strokes = typeof entry?.strokes === "number" ? entry.strokes : NaN;
    const budget = G4D_PAR_BUDGETS[hole];
    if (!Number.isInteger(hole) || hole < 1 || hole > G4D_PROBE_PLAN.length || budget === undefined) {
      notes.push(`hole ${String(entry?.hole)} unknown; skipped (fail-open)`);
      continue;
    }
    if (!Number.isFinite(strokes) || strokes < 0) {
      notes.push(`hole ${hole}: non-numeric strokes; skipped (fail-open)`);
      continue;
    }
    strokesTotal += strokes;
    parTotal += budget;
    if (strokes > G4D_AUTOPLAY_MAX_STROKES_PER_HOLE) {
      pass = false;
      notes.push(`hole ${hole}: ${strokes} strokes exceeds per-hole cap ${G4D_AUTOPLAY_MAX_STROKES_PER_HOLE}`);
    }
    const rewinds = typeof entry?.rewindsUsed === "number" ? entry.rewindsUsed : 0;
    if (Number.isFinite(rewinds) && rewinds > 0) {
      rewindsTotal += rewinds;
      if (rewinds > G4D_AUTOPLAY_REWIND_BUDGET_PER_HOLE) {
        pass = false;
        notes.push(`hole ${hole}: ${rewinds} rewinds exceeds per-hole budget ${G4D_AUTOPLAY_REWIND_BUDGET_PER_HOLE}`);
      }
    }
    if (entry?.ghostOk === false) {
      pass = false;
      notes.push(`hole ${hole}: ghost assertion reported false`);
    }
  }
  if (rewindsTotal > G4D_AUTOPLAY_REWIND_BUDGET_TOTAL) {
    pass = false;
    notes.push(`total rewinds ${rewindsTotal} exceeds round budget ${G4D_AUTOPLAY_REWIND_BUDGET_TOTAL}`);
  }
  const strokesVsPar = strokesTotal - parTotal;
  if (strokesVsPar > G4D_AUTOPLAY_PAR_SLACK) {
    pass = false;
    notes.push(`round ${strokesVsPar} over par exceeds slack ${G4D_AUTOPLAY_PAR_SLACK}`);
  }
  if (pass && notes.length === 0) {
    notes.push(`probe clean: ${strokesVsPar} vs par`);
  }
  return { pass, strokesVsPar, notes };
}

/** Autoplay stroke cap: a hole probe aborts (pick up) past this many strokes. */
export const G4D_AUTOPLAY_MAX_STROKES_PER_HOLE = 8;

/** Autoplay rewind budget per hole. */
export const G4D_AUTOPLAY_REWIND_BUDGET_PER_HOLE = 3;

/** Autoplay rewind budget for the full 10-hole probe round. */
export const G4D_AUTOPLAY_REWIND_BUDGET_TOTAL = 12;

/** Strokes-over-par slack the probe round tolerates before failing. */
export const G4D_AUTOPLAY_PAR_SLACK = 6;
