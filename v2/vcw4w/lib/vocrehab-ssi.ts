/**
 * VocRehab SSI sketch math (2026-v1 params). Pure module: zero I/O,
 * zero imports, safe for client + server. All outputs are labelled
 * estimate / sketch / about — never a benefit promise.
 */

export const vocrehabSsiParams2026 = {
  paramsVersion: "2026-v1",
  effectiveDate: "2026-01-01",
  sourceNote:
    "Teaching sketch based on the long-standing SSI earned-income sketch ($20 general + $65 earned exclusion, then about $1 shift per $2 earned). Not an SSA determination.",
} as const;

export type VocrehabSsiParamsVersion = typeof vocrehabSsiParams2026.paramsVersion;

export interface VocrehabSsiInput {
  hourlyWage: number;
  hoursPerWeek: number;
}

export interface VocrehabSsiEstimate {
  /** Exact monthly earnings kept internally (cents precision). */
  monthlyEarnings: number;
  /** Sketch of countable earned income after exclusions (about). */
  countableSketch: number;
  /** Sketch of the SSI check shift implied by countable income (about). */
  estimatedSsiShift: number;
  /** Sketch of earnings + remaining SSI baseline shift combined (about). */
  combinedSketch: number;
  paramsVersion: VocrehabSsiParamsVersion;
  disclaimer: string;
}

export const vocrehabSsiDisclaimer =
  "About this estimate (2026-v1 params, effective 2026-01-01): a teaching sketch only — your SSI shift is about this size, never a promised benefit amount. Talk to your VR counselor or WIPA for your situation.";

const GENERAL_EXCLUSION = 20;
const EARNED_EXCLUSION = 65;
const WEEKS_PER_MONTH = 52 / 12;

function assertRange(name: string, value: number, min: number, max: number): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}.`);
  }
}

/**
 * Pure SSI sketch: monthlyEarnings = wage × hours × 52/12.
 * countableSketch = about max(0, (monthly − 20 − 65) / 2).
 * estimatedSsiShift = about countableSketch (the check shifts down by
 * about that amount); combinedSketch = about monthly + base − shift is
 * left to the UI — here we sketch earnings minus shift as the combined
 * about-figure so learners see work usually nets ahead in this sketch.
 */
export function vocrehabCalculateSsiEstimate(input: VocrehabSsiInput): VocrehabSsiEstimate {
  assertRange("hourlyWage", input.hourlyWage, 0, 200);
  assertRange("hoursPerWeek", input.hoursPerWeek, 0, 80);
  const monthlyEarnings = input.hourlyWage * input.hoursPerWeek * WEEKS_PER_MONTH;
  const countableSketch = Math.max(0, (monthlyEarnings - GENERAL_EXCLUSION - EARNED_EXCLUSION) / 2);
  const estimatedSsiShift = countableSketch;
  const combinedSketch = monthlyEarnings - estimatedSsiShift;
  return {
    monthlyEarnings,
    countableSketch,
    estimatedSsiShift,
    combinedSketch,
    paramsVersion: vocrehabSsiParams2026.paramsVersion,
    disclaimer: vocrehabSsiDisclaimer,
  };
}

/** Whole-dollar rounding for UI display; cents stay in the estimate object. */
export function vocrehabFormatWholeDollars(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
