/**
 * DPS compute pricing — Remastery Wave 2 economy slice (README §3.4 Feature 04:
 * DonatePersonalSeconds P2P Compute & WebGPU Sharing).
 *
 * PURE pricing module: integer coins only, zero I/O, zero ledger writes.
 * Handlers quote through this file and read the ledger separately —
 * balances are ALWAYS SUM(delta) over the append-only paired ledger
 * (`coin_ledger` via the `get_my_coin_balance` RPC); there is NO parallel
 * balance column anywhere on this path.
 *
 * INVARIANTS (a reviewer can verify each in one screen):
 *   1. Vibe Coin parity: 100 coins = exactly $1.00 USD (1 coin = 1 cent).
 *      Every constant here is DERIVED from `@/lib/remastery-pricing`
 *      (itself derived from `@/lib/economy`) — this file never invents a
 *      price. Call `assertPricingInvariants()` at the top of any handler.
 *   2. Monetization split: 75% donor / 25% platform — INCLUDED in every
 *      listed price, never added on top (`splitRevenue` semantics: the
 *      donor is the creator/provider side of the 75/25 rule).
 *   3. Fail-open (README §1.2 axiom 3): an UNKNOWN task type never bricks
 *      the quote — it falls back to the default rate and flags
 *      `taskTypeFallback: true`. Only malformed money shapes (non-positive
 *      or unbounded seconds) throw, so misconfiguration fails loud.
 *
 * Task types: the four canonical values from the README §2 schema comment
 * on `dps_tasks.task_type` ('blender_render', 'video_transcode',
 * 'ai_embedding', 'game_bundle'). The §3.4 prose workloads map onto them
 * via DPS_TASK_ALIASES (game QA runs -> game_bundle, procedural terrain
 * generation -> blender_render, sprite compression -> video_transcode).
 *
 * Rate scale: whole coins per compute-second. The schema default
 * `dps_tasks.vibe_coins_cost = 50` is ~a minute-scale task at these rates
 * (e.g. 25s of blender_render, 50s of game_bundle) — these quotes price a
 * single task execution, not a subscription.
 */

import {
  assertPricingInvariants,
  COINS_PER_USD,
  coinsToUsdCents,
  formatUsdCents,
  MAX_SQUAD_BUDGET_CAP_COINS,
  splitRevenue,
} from "./remastery-pricing";

/** Canonical DPS task types (README §2 `dps_tasks.task_type` comment). */
export const DPS_TASK_TYPES = [
  "blender_render",
  "video_transcode",
  "ai_embedding",
  "game_bundle",
] as const;

export type DpsTaskType = (typeof DPS_TASK_TYPES)[number];

/**
 * §3.4 prose workload names mapped onto the canonical task types.
 * Unknown strings still resolve via the fail-open default below.
 */
export const DPS_TASK_ALIASES: Readonly<Record<string, DpsTaskType>> = {
  qa_run: "game_bundle",
  game_qa: "game_bundle",
  terrain_generation: "blender_render",
  procedural_terrain: "blender_render",
  sprite_compression: "video_transcode",
};

/** Task type used when the caller names nothing (or nothing known). */
export const DEFAULT_DPS_TASK_TYPE: DpsTaskType = "game_bundle";

/**
 * Whole coins per compute-second, per task type. Heavier GPU work costs
 * more; every value is an integer so quotes never touch float money math.
 */
export const DPS_RATE_COINS_PER_SECOND: Readonly<Record<DpsTaskType, number>> = {
  blender_render: 2,
  video_transcode: 1,
  ai_embedding: 3,
  game_bundle: 1,
};

/** Highest rate — bounds the largest billable duration. */
export const MAX_DPS_RATE_COINS_PER_SECOND = 3;

/**
 * Largest duration quotable in one call: the budget cap divided by the
 * highest rate, so `coinsCost` can never exceed the ledger-side cap.
 */
export const MAX_DPS_BILLABLE_SECONDS = Math.floor(
  MAX_SQUAD_BUDGET_CAP_COINS / MAX_DPS_RATE_COINS_PER_SECOND,
);

export type DpsComputeQuote = {
  /** Canonical task type the quote was priced at. */
  taskType: DpsTaskType;
  /** Raw taskType string the caller sent (echoed for debugging). */
  requestedTaskType: string;
  /** True when the request fell back to the default rate (fail-open). */
  taskTypeFallback: boolean;
  /** Whole seconds billed (ceil of the requested duration). */
  secondsBilled: number;
  /** Gross whole-coin price (donor + platform shares, cut INCLUDED). */
  coinsCost: number;
  /** Exact USD cents at parity (1 coin = 1 cent). */
  usdCents: number;
  /** Display string, e.g. "$0.50". */
  usdEquivalent: string;
  /** Donor share: 75% of gross (creator/provider side of the split). */
  donorShareCoins: number;
  /** Platform share: 25% of gross (pays for cloud infrastructure). */
  platformShareCoins: number;
  /** Parity standard echo: always 100. */
  coinsPerUsd: number;
};

function cleanWholeSeconds(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0 || v > MAX_DPS_BILLABLE_SECONDS) return -1;
  return Math.ceil(v);
}

/**
 * Resolve any caller string to a canonical task type. Known types and
 * §3.4 prose aliases map exactly; anything else fails OPEN to the default
 * rate (flagged) instead of bricking the quote.
 */
export function resolveDpsTaskType(value: unknown): {
  taskType: DpsTaskType;
  requestedTaskType: string;
  taskTypeFallback: boolean;
} {
  const requested = String(value ?? "").trim().toLowerCase();
  const direct = (DPS_TASK_TYPES as readonly string[]).includes(requested);
  if (direct) {
    return {
      taskType: requested as DpsTaskType,
      requestedTaskType: requested,
      taskTypeFallback: false,
    };
  }
  const aliased = DPS_TASK_ALIASES[requested];
  if (aliased) {
    return { taskType: aliased, requestedTaskType: requested, taskTypeFallback: false };
  }
  return {
    taskType: DEFAULT_DPS_TASK_TYPE,
    requestedTaskType: requested,
    taskTypeFallback: true,
  };
}

/**
 * Price one DPS task execution. Pure: no I/O, no ledger access.
 * Throws only on malformed money shapes (non-positive / unbounded seconds
 * or a quote that would exceed the cap) — unknown task types fall back,
 * never throw.
 */
export function quoteDpsCompute(taskTypeInput: unknown, secondsInput: unknown): DpsComputeQuote {
  assertPricingInvariants();
  const resolved = resolveDpsTaskType(taskTypeInput);
  const secondsBilled = cleanWholeSeconds(secondsInput);
  if (secondsBilled < 0) {
    throw new Error(
      `[dps-pricing] seconds must be a positive duration up to ${MAX_DPS_BILLABLE_SECONDS}.`,
    );
  }
  const rate = DPS_RATE_COINS_PER_SECOND[resolved.taskType];
  const coinsCost = rate * secondsBilled;
  if (!Number.isInteger(coinsCost) || coinsCost <= 0 || coinsCost > MAX_SQUAD_BUDGET_CAP_COINS) {
    throw new Error("[dps-pricing] quote exceeds the whole-coin budget cap.");
  }
  const usdCents = coinsToUsdCents(coinsCost);
  const split = splitRevenue(coinsCost);
  return {
    taskType: resolved.taskType,
    requestedTaskType: resolved.requestedTaskType,
    taskTypeFallback: resolved.taskTypeFallback,
    secondsBilled,
    coinsCost,
    usdCents,
    usdEquivalent: formatUsdCents(usdCents),
    donorShareCoins: split.creator,
    platformShareCoins: split.platform,
    coinsPerUsd: COINS_PER_USD,
  };
}
