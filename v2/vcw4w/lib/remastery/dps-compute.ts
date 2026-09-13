// DonatePersonalSeconds (DPS) P2P compute — pure helpers (remastery README §3.4, Wave 2).
// Edge-safe: TypeScript strict, no deps, no window/network, no secrets.
// Parity: 100 coins = $1 — DERIVED from the canonical `@/lib/remastery-pricing`
// constants (via `@/lib/dps-pricing`), never invented here. Quotes are integer
// whole coins; the 75/25 donor/platform split is INCLUDED via `splitRevenue`.
// Fail-open (§1.2 axiom 3): an unknown taskType falls back to the default
// rate and flags `taskTypeFallback: true` instead of throwing; only malformed
// money shapes (negative/non-integer maxCoins, over-cap quotes) throw.

import {
  assertPricingInvariants,
  COINS_PER_USD,
  coinsToUsdCents,
  formatUsdCents,
  MAX_SQUAD_BUDGET_CAP_COINS,
  splitRevenue,
} from "@/lib/remastery-pricing";
import {
  resolveDpsTaskType,
} from "@/lib/dps-pricing";

export type DpsTaskType =
  | "blender_render"
  | "video_transcode"
  | "ai_embedding"
  | "game_bundle";

export type DpsTaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface DpsJobSpec {
  taskType: DpsTaskType;
  payloadJson: Record<string, unknown>;
  maxCoins: number;
}

// Flat per-job base cost in whole coins (100 coins = $1 parity, same standard
// as `@/lib/remastery-pricing`; per-second rates live in `@/lib/dps-pricing`
// DPS_RATE_COINS_PER_SECOND — this table prices one job execution, not a second).
export const DPS_BASE_COST_COINS: Record<DpsTaskType, number> = {
  blender_render: 200,
  video_transcode: 120,
  ai_embedding: 50,
  game_bundle: 80,
};

/**
 * Quote a job's cost in whole coins (floored, capped at maxCoins and at
 * MAX_SQUAD_BUDGET_CAP_COINS) plus the exact integer USD cents at parity
 * and the INCLUDED 75/25 donor/platform split.
 * Fail-open: an unknown taskType falls back to DEFAULT_DPS_TASK_TYPE and
 * flags `taskTypeFallback: true` instead of throwing. Throws only on
 * malformed money shapes (negative/non-integer maxCoins, over-cap quotes).
 * `usd` is kept as a display alias (coins / COINS_PER_USD); `usdCents` is exact.
 */
export function quoteJobCost(spec: DpsJobSpec): {
  coins: number;
  usd: number;
  usdCents: number;
  usdEquivalent: string;
  taskType: DpsTaskType;
  taskTypeFallback: boolean;
  donorShareCoins: number;
  platformShareCoins: number;
} {
  assertPricingInvariants();
  const resolved = resolveDpsTaskType(spec.taskType);
  const taskType: DpsTaskType = resolved.taskType;
  if (!Number.isFinite(spec.maxCoins) || !Number.isInteger(spec.maxCoins) || spec.maxCoins < 0) {
    throw new Error(`maxCoins must be a whole-coin integer 0..${MAX_SQUAD_BUDGET_CAP_COINS}`);
  }
  if (spec.maxCoins > MAX_SQUAD_BUDGET_CAP_COINS) {
    throw new Error(`maxCoins must be a whole-coin integer 0..${MAX_SQUAD_BUDGET_CAP_COINS}`);
  }
  const base = DPS_BASE_COST_COINS[taskType];
  const floored = Math.floor(base);
  const coins = Math.min(floored, Math.floor(spec.maxCoins));
  if (coins < 0 || coins > MAX_SQUAD_BUDGET_CAP_COINS) {
    throw new Error(`quote exceeds the whole-coin budget cap 0..${MAX_SQUAD_BUDGET_CAP_COINS}.`);
  }
  const usdCents = coinsToUsdCents(coins);
  const split = splitRevenue(coins);
  return {
    coins,
    usd: coins / COINS_PER_USD,
    usdCents,
    usdEquivalent: formatUsdCents(usdCents),
    taskType,
    taskTypeFallback: resolved.taskTypeFallback,
    donorShareCoins: split.creator,
    platformShareCoins: split.platform,
  };
}

export interface DonorShare {
  cpuSharePercent: number;
  gpuSharePercent: number;
}

/**
 * Validate a donor's CPU/GPU share percentages.
 * Each must be an integer in 0..100, else returns error strings (empty = valid).
 */
export function validateDonorShare(share: DonorShare): string[] {
  const errors: string[] = [];
  const fields: Array<[string, unknown]> = [
    ["cpuSharePercent", share.cpuSharePercent],
    ["gpuSharePercent", share.gpuSharePercent],
  ];
  for (const [name, value] of fields) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`${name} must be an integer 0..100`);
    } else if (value < 0 || value > 100) {
      errors.push(`${name} must be an integer 0..100`);
    }
  }
  return errors;
}

/** FNV-1a 32-bit hash over a string, returned as 8-char lowercase hex. */
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 forces unsigned 32-bit.
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Synchronous demo proof-of-work verifier (anti-spam gate, NOT cryptographic security).
 *
 * Computes a deterministic FNV-1a hex digest over (challenge + nonce) and
 * requires the first `difficulty` hex digits to be "0".
 *
 * Semantics:
 * - difficulty 0 → always true (no gate).
 * - negative, non-integer, non-finite, or missing difficulty → false, never throws.
 * - any non-string challenge/nonce → false, never throws.
 */
export function verifyProofOfWork(
  challenge: string,
  nonce: string,
  difficulty: number,
): boolean {
  if (typeof challenge !== "string" || typeof nonce !== "string") return false;
  if (
    typeof difficulty !== "number" ||
    !Number.isInteger(difficulty) ||
    !Number.isFinite(difficulty) ||
    difficulty < 0
  ) {
    return false;
  }
  if (difficulty === 0) return true;
  const digest = fnv1aHex(challenge + nonce);
  for (let i = 0; i < difficulty; i++) {
    if (i >= digest.length || digest[i] !== "0") return false;
  }
  return true;
}
