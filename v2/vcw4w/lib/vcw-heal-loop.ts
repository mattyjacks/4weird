/**
 * VCW heal-loop orchestrator: bugtest -> autofix -> retest.
 *
 * Pure state machine (no I/O, no fetch, no game-bundle access). It consumes
 * GQA findings by bug id only; the caller performs the real opencode.heal
 * step and the verification test, then feeds outcomes back in.
 *
 * Caller protocol:
 *   const loop = startHealLoop(bugIds, tokenBudget);
 *   for (;;) {
 *     const d = loop.next();
 *     if (d.action === "heal") {
 *       // run the opencode.heal step with d.step.prompt, then loop.next()
 *       // again to reach the mandatory "retest" verification ...
 *     } else if (d.action === "retest") {
 *       // run the bug test, then loop.recordTestResult(pass, tokensSpent)
 *     } else {
 *       // "done" | "budget-exhausted" — terminal, report d
 *       break;
 *     }
 *   }
 *
 * Guarantees:
 * - Token budget is integer-only; every charge is floored, clamped to
 *   [0, remaining], and applied fail-open (invalid input is clamped, never
 *   thrown). tokensSpent NEVER exceeds the budget.
 * - Termination is structural: each bug gets at most maxAttemptsPerBug heal
 *   proposals, each heal is followed by exactly one retest, and a global
 *   maxRounds guard forces "done" no matter what the caller does.
 *
 * Type compat (read-only): bug rows match the GET /api/vcw/bugs select list
 * (id, run_id, game_slug, title, severity, description, created_at) and test
 * outcomes reuse the vcw run verdict vocabulary (pass/fail).
 */

import type { VcwSeverity, VcwVerdict } from "@/lib/vcw-runs";

/** Bug row shape, compatible with the GET /api/vcw/bugs select list. */
export interface VcwHealBug {
  id: string;
  run_id: string | null;
  game_slug: string;
  title: string;
  severity: VcwSeverity;
  description: string;
  created_at: string;
}

/** Test outcome for one verification run (the vcw verdict vocabulary). */
export type VcwHealVerdict = Extract<VcwVerdict, "pass" | "fail">;

/** Default per-bug cap on opencode.heal proposals. */
export const VCW_HEAL_MAX_ATTEMPTS_PER_BUG = 3;

export type HealAction = "heal" | "retest" | "done" | "budget-exhausted";

export interface HealStepProposal {
  bugId: string;
  prompt: string;
  /** 1-based attempt number for this bug. */
  attempt: number;
  maxAttempts: number;
  round: number;
  tokensRemaining: number;
}

export type HealDecision =
  | { action: "heal"; step: HealStepProposal }
  | {
      action: "retest";
      bugId: string;
      attempt: number;
      round: number;
      tokensRemaining: number;
    }
  | {
      action: "done";
      fixed: string[];
      unhealed: string[];
      tokensSpent: number;
      tokensRemaining: number;
      rounds: number;
    }
  | {
      action: "budget-exhausted";
      pending: string[];
      fixed: string[];
      tokensSpent: number;
      tokensRemaining: number;
      rounds: number;
    };

export interface HealLoopOptions {
  /** Per-bug cap on heal proposals. Defaults to VCW_HEAL_MAX_ATTEMPTS_PER_BUG. */
  maxAttemptsPerBug?: number;
  /**
   * Global round cap. Defaults to max(1, bugs * maxAttemptsPerBug), which
   * already bounds every reachable path; an explicit value only tightens it.
   */
  maxRounds?: number;
  /**
   * Optional finding summaries keyed by bug id, embedded verbatim into the
   * proposed heal prompt so the fixer sees the GQA context.
   */
  context?: Readonly<Record<string, string>>;
}

export interface HealLoopSnapshot {
  budget: number;
  tokensSpent: number;
  tokensRemaining: number;
  rounds: number;
  maxRounds: number;
  pending: string[];
  fixed: string[];
  unhealed: string[];
  attemptsByBug: Record<string, number>;
}

type BugPhase = "needs-heal" | "needs-retest" | "fixed" | "given-up";

interface BugEntry {
  bugId: string;
  attempts: number;
  phase: BugPhase;
}

/** Floor to an integer, fail-open: non-finite input becomes 0. */
function toIntTokens(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

function clampInt(value: number, lo: number, hi: number): number {
  const v = toIntTokens(value);
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function cleanBugId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id ? id : null;
}

export function buildHealPrompt(
  bugId: string,
  attempt: number,
  maxAttempts: number,
  context?: Readonly<Record<string, string>>,
): string {
  const extra = context?.[bugId]?.trim();
  const lines = [
    `[tool: opencode.heal; bug="${bugId}" attempt=${attempt}/${maxAttempts}]`,
    `Fix the GQA finding for bug ${bugId} (heal attempt ${attempt} of ${maxAttempts}).`,
    `Keep the change minimal and scoped to the reported defect; do not touch game bundles.`,
    extra ? `Finding context: ${extra.slice(0, 500)}` : null,
    `After applying the fix, report the files changed so the retest can verify it.`,
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

export class VcwHealLoop {
  private readonly entries: BugEntry[];
  private readonly maxAttemptsPerBug: number;
  private readonly maxRounds: number;
  private readonly budget: number;
  private readonly context?: Readonly<Record<string, string>>;
  private spent = 0;
  private rounds = 0;

  constructor(bugIds: string[], tokenBudget: number, options?: HealLoopOptions) {
    const seen = new Set<string>();
    this.entries = [];
    for (const raw of bugIds ?? []) {
      const id = cleanBugId(raw);
      if (id === null || seen.has(id)) continue;
      seen.add(id);
      this.entries.push({ bugId: id, attempts: 0, phase: "needs-heal" });
    }
    this.maxAttemptsPerBug = Math.max(
      1,
      toIntTokens(options?.maxAttemptsPerBug ?? VCW_HEAL_MAX_ATTEMPTS_PER_BUG) || 1,
    );
    const structuralMax = Math.max(1, this.entries.length * this.maxAttemptsPerBug);
    const explicit = toIntTokens(options?.maxRounds ?? structuralMax);
    this.maxRounds = Math.min(
      structuralMax,
      Math.max(1, explicit || structuralMax),
    );
    this.budget = Math.max(0, toIntTokens(tokenBudget));
    this.context = options?.context;
  }

  get tokensSpent(): number {
    return this.spent;
  }

  get tokensRemaining(): number {
    return this.budget - this.spent;
  }

  get currentRound(): number {
    return this.rounds;
  }

  private currentEntry(): BugEntry | undefined {
    return this.entries.find((e) => e.phase === "needs-heal" || e.phase === "needs-retest");
  }

  private doneDecision(): HealDecision {
    return {
      action: "done",
      fixed: this.entries.filter((e) => e.phase === "fixed").map((e) => e.bugId),
      unhealed: this.entries.filter((e) => e.phase !== "fixed").map((e) => e.bugId),
      tokensSpent: this.spent,
      tokensRemaining: this.tokensRemaining,
      rounds: this.rounds,
    };
  }

  private exhaustedDecision(): HealDecision {
    const pending = this.entries
      .filter((e) => e.phase === "needs-heal" || e.phase === "needs-retest")
      .map((e) => e.bugId);
    return {
      action: "budget-exhausted",
      pending,
      fixed: this.entries.filter((e) => e.phase === "fixed").map((e) => e.bugId),
      tokensSpent: this.spent,
      tokensRemaining: this.tokensRemaining,
      rounds: this.rounds,
    };
  }

  /**
   * Propose the next opencode.heal step for the current bug and commit the
   * attempt (phase moves to needs-retest). Returns null when no heal can be
   * proposed (nothing pending, rounds exhausted, or budget exhausted).
   */
  proposeHealStep(): HealStepProposal | null {
    const entry = this.entries.find((e) => e.phase === "needs-heal");
    if (!entry) return null;
    if (this.rounds >= this.maxRounds) return null;
    if (this.tokensRemaining <= 0) return null;
    if (entry.attempts >= this.maxAttemptsPerBug) {
      entry.phase = "given-up";
      return this.proposeHealStep();
    }
    entry.attempts += 1;
    entry.phase = "needs-retest";
    return {
      bugId: entry.bugId,
      prompt: buildHealPrompt(entry.bugId, entry.attempts, this.maxAttemptsPerBug, this.context),
      attempt: entry.attempts,
      maxAttempts: this.maxAttemptsPerBug,
      round: this.rounds,
      tokensRemaining: this.tokensRemaining,
    };
  }

  /**
   * Record the outcome of the verification test for the bug awaiting retest.
   * tokensSpent is floored and clamped to [0, tokensRemaining] so the budget
   * is NEVER exceeded; invalid input is clamped fail-open, never thrown.
   * Each call consumes exactly one round, so the max-rounds guard guarantees
   * termination. No-op (besides no state change) when no bug awaits a result.
   */
  recordTestResult(pass: boolean, tokensSpent: number): void {
    const entry = this.entries.find((e) => e.phase === "needs-retest");
    if (!entry) return;
    const charge = clampInt(tokensSpent, 0, this.tokensRemaining);
    this.spent += charge;
    this.rounds += 1;
    if (pass === true) {
      entry.phase = "fixed";
      return;
    }
    if (entry.attempts >= this.maxAttemptsPerBug || this.rounds >= this.maxRounds) {
      entry.phase = "given-up";
      return;
    }
    entry.phase = "needs-heal";
  }

  /**
   * Route to the next action. Terminal states ("done", "budget-exhausted")
   * carry the full accounting; "heal" carries the opencode.heal prompt;
   * "retest" means the current fix is applied and must be verified now.
   */
  next(): HealDecision {
    const entry = this.currentEntry();
    if (!entry) return this.doneDecision();
    if (this.rounds >= this.maxRounds) return this.doneDecision();
    if (this.tokensRemaining <= 0) return this.exhaustedDecision();
    if (entry.phase === "needs-retest") {
      return {
        action: "retest",
        bugId: entry.bugId,
        attempt: entry.attempts,
        round: this.rounds,
        tokensRemaining: this.tokensRemaining,
      };
    }
    const step = this.proposeHealStep();
    if (!step) {
      const stillPending = this.currentEntry();
      if (!stillPending) return this.doneDecision();
      return this.exhaustedDecision();
    }
    return { action: "heal", step };
  }

  snapshot(): HealLoopSnapshot {
    const attemptsByBug: Record<string, number> = {};
    for (const e of this.entries) attemptsByBug[e.bugId] = e.attempts;
    return {
      budget: this.budget,
      tokensSpent: this.spent,
      tokensRemaining: this.tokensRemaining,
      rounds: this.rounds,
      maxRounds: this.maxRounds,
      pending: this.entries
        .filter((e) => e.phase === "needs-heal" || e.phase === "needs-retest")
        .map((e) => e.bugId),
      fixed: this.entries.filter((e) => e.phase === "fixed").map((e) => e.bugId),
      unhealed: this.entries.filter((e) => e.phase !== "fixed").map((e) => e.bugId),
      attemptsByBug,
    };
  }
}

/** Start a new heal-loop over GQA finding ids with an integer token budget. */
export function startHealLoop(
  bugIds: string[],
  tokenBudget: number,
  options?: HealLoopOptions,
): VcwHealLoop {
  return new VcwHealLoop(bugIds, tokenBudget, options);
}
