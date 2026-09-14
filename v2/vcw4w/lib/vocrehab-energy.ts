/**
 * VocRehab energy-budget micro-game (self-contained, decoupled pack).
 *
 * Mirrors the structure of lib/vocrehab-games.ts without importing it
 * (sibling-owned): own id, own registry, own validator, own scorer.
 * Pure module: zero I/O, zero imports, no browser globals — safe for
 * client + server. Telemetry lives in callers.
 */

export const vocrehabEnergyBudgetId = "energy-budget";

export type VocrehabEnergyEventKind =
  | "start"
  | "action"
  | "error"
  | "help"
  | "pause"
  | "resume"
  | "interrupt"
  | "complete";

/** Structural event shape; matches the games.ts validator structurally. */
export interface VocrehabEnergyEvent {
  t_ms: number;
  kind: VocrehabEnergyEventKind;
  detail: Record<string, unknown>;
}

export interface VocrehabEnergyRegistryEntry {
  id: typeof vocrehabEnergyBudgetId;
  title: string;
  instructions: string;
  timeLimitSec: number | null;
}

export interface VocrehabEnergyScore {
  accuracy: "developing" | "steady" | "strong";
  throughput: "unhurried" | "steady" | "brisk";
  recovery: "growing" | "steady" | "strong";
  notes: string[];
}

const vocrehabEnergyEventKinds: readonly VocrehabEnergyEventKind[] = [
  "start",
  "action",
  "error",
  "help",
  "pause",
  "resume",
  "interrupt",
  "complete",
];

export const vocrehabEnergyRegistry: readonly VocrehabEnergyRegistryEntry[] = [
  {
    id: vocrehabEnergyBudgetId,
    title: "Energy Budget",
    instructions:
      "Plan a Mon-Fri week with 12 energy tokens across work/rest/appointment blocks. Practice then run. Retry anytime.",
    timeLimitSec: null,
  },
];

function vocrehabIsPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate one raw telemetry event: kind enum, t_ms 0..600000, detail object. */
export function vocrehabValidateEnergyEvent(e: unknown): boolean {
  if (!vocrehabIsPlainObject(e)) return false;
  const { t_ms, kind, detail } = e as {
    t_ms: unknown;
    kind: unknown;
    detail: unknown;
  };
  if (typeof t_ms !== "number" || !Number.isFinite(t_ms)) return false;
  if (t_ms < 0 || t_ms > 600000) return false;
  if (typeof kind !== "string") return false;
  if ((vocrehabEnergyEventKinds as readonly string[]).indexOf(kind) < 0) return false;
  if (!vocrehabIsPlainObject(detail)) return false;
  return true;
}

function vocrehabEnergyRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function vocrehabBuildEnergyScore(
  actions: number,
  errors: number,
  helps: number,
  corrections: number,
  durationMin: number,
): VocrehabEnergyScore {
  const total = actions + errors;
  const acc = vocrehabEnergyRate(actions, total);
  const accuracy = acc >= 0.85 ? "strong" : acc >= 0.6 ? "steady" : "developing";
  const perMin = durationMin > 0 ? vocrehabEnergyRate(actions, durationMin) : 0;
  const throughput = perMin >= 8 ? "brisk" : perMin >= 3 ? "steady" : "unhurried";
  const recovery =
    errors === 0 ? "steady" : vocrehabEnergyRate(corrections, errors) >= 0.5 ? "strong" : "growing";
  const notes: string[] = [];
  if (helps > 0)
    notes.push("Energy Budget: asked for help — help-seeking is a work strength.");
  if (errors > 0 && corrections > 0)
    notes.push("Energy Budget: corrected a snag and kept going with the week plan.");
  if (errors === 0 && actions > 0) notes.push("Energy Budget: clean run with no errors recorded.");
  if (actions === 0)
    notes.push("Energy Budget: no scored actions yet — try the practice round first.");
  return { accuracy, throughput, recovery, notes };
}

/** Energy Budget: accuracy = steady token placements; correction = {"corrected": true} action. */
export function vocrehabScoreEnergyBudget(events: VocrehabEnergyEvent[]): VocrehabEnergyScore {
  let actions = 0;
  let errors = 0;
  let helps = 0;
  let corrections = 0;
  let first = Number.POSITIVE_INFINITY;
  let last = 0;
  for (const e of events) {
    if (!vocrehabValidateEnergyEvent(e)) continue;
    if (e.t_ms < first) first = e.t_ms;
    if (e.t_ms > last) last = e.t_ms;
    if (e.kind === "action") {
      actions += 1;
      if (e.detail["corrected"] === true || e.detail["retry"] === true) corrections += 1;
    } else if (e.kind === "error") {
      errors += 1;
    } else if (e.kind === "help") {
      helps += 1;
    }
  }
  const durationMin = first === Number.POSITIVE_INFINITY ? 0 : (last - first) / 60000;
  return vocrehabBuildEnergyScore(actions, errors, helps, corrections, durationMin);
}

/**
 * Strengths-first human summary. Never emits IQ-like numbers or percentiles;
 * raw counts stay out — notes use strengths language only.
 */
export function vocrehabSummarizeEnergyRun(events: VocrehabEnergyEvent[]): string {
  const score = vocrehabScoreEnergyBudget(events);
  const strengthBits: string[] = [];
  if (score.accuracy === "strong") strengthBits.push("sorted choices with care");
  else if (score.accuracy === "steady") strengthBits.push("kept choices mostly on track");
  else strengthBits.push("kept trying through a tricky run");
  if (score.recovery === "strong") strengthBits.push("bounced back after snags");
  if (score.throughput === "brisk") strengthBits.push("kept a brisk, steady pace");
  else if (score.throughput === "steady") strengthBits.push("kept a steady pace");
  else strengthBits.push("took time to think things through");
  const headline = `In Energy Budget, you ${strengthBits.join(", ")}.`;
  const support =
    score.accuracy === "developing"
      ? "A good next step is one more practice round with no timer, then retry — retries always count the same."
      : "A good next step is sending this run to your profile so you and your counselor can spot supports together.";
  const extra = score.notes.length > 0 ? ` ${score.notes.join(" ")}` : "";
  return `${headline} ${support}${extra}`;
}
