/**
 * ss2 mode table — the single source of truth for CHEAP vs FAST.
 *
 * Cost doctrine: BOTH modes run the same cheap-model pool. Speed never comes
 * from model IQ — it comes from parallelism, zero-wait context, and retries
 * instead of stalls. FAST targets ~2x the tokens of CHEAP (see RATIO_GUARD).
 *
 * FUTURE-PROOFING CONTRACT (Plan A relay): this file has zero filesystem and
 * zero network dependencies — pure data + pure functions. The relay's
 * `modes.ts` starts as a verbatim port of this file, so CHEAP/FAST mean
 * exactly the same thing before and after migration. Do not add I/O here.
 *
 * Schema version: modes.v1
 */

export const MODES_VERSION = "modes.v1";

/** Per-model USD price per 1M tokens {in, out}. Edit prices here, never logic. */
export const PRICES = {
  // Generic cheap-model defaults (haiku/flash-class). Override per deployment.
  default: { in: 0.25, out: 1.0 },
};

/**
 * Mode policy table. Every knob an agent, command, or (later) relay needs.
 * - agents: [min, max] fan-out per wave (FAST counts scopes; each scope gets a pair)
 * - pack: "snapshot" (hashes + acceptance cmds) or "full" (+ excerpts + tried-list)
 * - paired: FAST assigns a spot-checker sibling per scope (cheap model, ~1/3 build cost)
 * - retries: narrow re-dispatch budget per blocked task (0 = QUEUE it and move on)
 * - heartbeatMin: lockfile refresh cadence
 * - verify: "gates" (envelope gates only) or "gates+pair" (+ sibling spot-check)
 * - budgetMultiplier: spend cap relative to the CHEAP baseline estimate for the goal
 */
export const MODES = {
  cheap: {
    id: "cheap",
    label: "Thrifty tokens",
    agents: [10, 30],
    scopeSize: "file",
    pack: "snapshot",
    paired: false,
    retries: 0,
    heartbeatMin: 10,
    verify: "gates",
    report: "one-line",
    budgetMultiplier: 1.0,
  },
  fast: {
    id: "fast",
    label: "Hastey wastey",
    agents: [3, 8],
    scopeSize: "slice",
    pack: "full",
    paired: true,
    retries: 1,
    heartbeatMin: 3,
    verify: "gates+pair",
    report: "evidence",
    budgetMultiplier: 2.0,
  },
};

/** Where the ~2x goes, per task, relative to a CHEAP baseline of 1.0. */
export const COST_MODEL = {
  baseline: 1.0,
  drivers: {
    packs: { cheap: 0.35, fast: 0.7 },
    execution: { cheap: 0.45, fast: 0.45 },
    verification: { cheap: 0.1, fast: 0.3 },
    retries: { cheap: 0.0, fast: 0.25 },
    coordination: { cheap: 0.1, fast: 0.3 },
  },
};

/** Guard band: measured FAST/CHEAP token ratio outside this range pages the lead. */
export const RATIO_GUARD = { min: 1.5, max: 2.3 };

/** Free token estimate for a text blob (chars/4). Never billed, never exact. */
export function estimateTokens(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/** USD cost for estimated tokens at the named price tier. Pure math. */
export function estimateCost(estIn, estOut, tier = "default") {
  const p = PRICES[tier] || PRICES.default;
  return (estIn / 1e6) * p.in + (estOut / 1e6) * p.out;
}

/** Clamp a requested agent count into the mode's [min, max]. Pure. */
export function clampAgents(mode, n) {
  const m = MODES[mode] || MODES.cheap;
  const v = Number.isFinite(Number(n)) ? Number(n) : m.agents[1];
  return Math.min(m.agents[1], Math.max(m.agents[0], v));
}

/** Check a measured FAST/CHEAP ratio against the guard band. Pure. */
export function checkRatio(ratio) {
  if (!Number.isFinite(ratio)) return { ok: false, reason: "non-numeric ratio" };
  if (ratio < RATIO_GUARD.min) return { ok: false, reason: `below floor ${RATIO_GUARD.min} (packs too thin?)` };
  if (ratio > RATIO_GUARD.max) return { ok: false, reason: `above ceiling ${RATIO_GUARD.max} (trim excerpts or retries)` };
  return { ok: true, reason: "within band" };
}
