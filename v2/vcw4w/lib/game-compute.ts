/**
 * Games-side compute-job submission kit — typed job-request builder + offline queue.
 *
 * Remastery README §3.4 (DPS P2P compute, Wave 2 games slice) + §1.2 axioms:
 * - Vibe Coin parity: 100 coins = exactly $1.00 (VIBE_COINS_PER_USD = 100).
 * - Fail-open (§1.2 axiom 3): a bad spec never bricks navigation — the
 *   validator returns errors, the queue helpers swallow storage/network
 *   failures and fall back to memory.
 *
 * Foundation types live in `lib/remastery/dps-compute.ts` (R-lane owned —
 * NEVER edit from here); this module is the GAMES-side mirror shaped like
 * the `dps_tasks` row columns:
 *
 *   dps_tasks.task_type -> GameComputeTaskType
 *   dps_tasks.payload   -> GameComputePayload (payloadJson)
 *   dps_tasks.coins_bid -> coinsBid (maxCoins)
 *
 * Game-job angle task types: `game_bundle` (DPS native) plus the
 * game-content aliases `procedural` (terrain generation) and `sprite`
 * (sprite compression), alongside `blender_render` / `video_transcode`.
 *
 * Pure TypeScript: no React, no secrets. Browser APIs (localStorage) are
 * touched ONLY inside guarded helpers so server components can import safely.
 */

import { DPS_BASE_COST_COINS } from "@/lib/remastery/dps-compute";
import { COINS_PER_USD, coinsToUsdCents } from "@/lib/remastery-pricing";

/** 100 coins = exactly $1.00 USD (§1.2 axiom 1) — derived from the canonical pricing module. */
export const VIBE_COINS_PER_USD = COINS_PER_USD;

/**
 * Task types the games compute-job form accepts. The first three are DPS
 * foundation types; `procedural` / `sprite` are the game-job angle aliases
 * (§3.4: procedural terrain generation, sprite compression).
 */
export const GAME_COMPUTE_TASK_TYPES = [
  "blender_render",
  "video_transcode",
  "game_bundle",
  "procedural",
  "sprite",
] as const;

export type GameComputeTaskType = (typeof GAME_COMPUTE_TASK_TYPES)[number];

/** Free-form job payload (mirrors the `payload` / `payloadJson` column). */
export type GameComputePayload = Record<string, unknown>;

/**
 * Typed job-request shape (mirrors one `dps_tasks` row):
 * task_type + payload + coins_bid.
 */
export interface GameComputeJobSpec {
  /** Mirrors `dps_tasks.task_type`. */
  taskType: GameComputeTaskType;
  /** Mirrors `dps_tasks.payload`. */
  payload: GameComputePayload;
  /** Bid in whole coins. Mirrors `dps_tasks.coins_bid` / DpsJobSpec.maxCoins. */
  coinsBid: number;
}

/** Cost estimate at 100=$1 parity (`usdCents` is exact; `usd` is a display alias). */
export interface GameComputeCostEstimate {
  coins: number;
  usd: number;
  usdCents: number;
}

/** Result of validating/building a job spec. Never throws — fail-open. */
export interface GameComputeValidationResult {
  ok: boolean;
  errors: string[];
  spec: GameComputeJobSpec | null;
  /** Present only when ok (quote of the cleaned spec). */
  estimate: GameComputeCostEstimate | null;
}

/** Base cost per task type in whole coins (100 coins = $1). DPS-native costs
 *  are re-exported from the foundation module; game-angle aliases get their
 *  own base costs. */
export const GAME_COMPUTE_BASE_COST_COINS: Record<GameComputeTaskType, number> = {
  blender_render: DPS_BASE_COST_COINS.blender_render,
  video_transcode: DPS_BASE_COST_COINS.video_transcode,
  game_bundle: DPS_BASE_COST_COINS.game_bundle,
  procedural: 60,
  sprite: 40,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGameComputeTaskType(value: unknown): value is GameComputeTaskType {
  return (
    typeof value === "string" &&
    (GAME_COMPUTE_TASK_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Quote a spec's cost in coins (floored to whole coins, capped at coinsBid)
 * plus the exact integer USD cents at parity. Never throws — invalid input
 * yields a zero quote so callers can fail open.
 */
export function estimateGameComputeCost(spec: {
  taskType: GameComputeTaskType;
  coinsBid: number;
}): GameComputeCostEstimate {
  try {
    if (!isGameComputeTaskType(spec.taskType)) return { coins: 0, usd: 0, usdCents: 0 };
    if (!Number.isFinite(spec.coinsBid) || spec.coinsBid < 0) {
      return { coins: 0, usd: 0, usdCents: 0 };
    }
    const base = GAME_COMPUTE_BASE_COST_COINS[spec.taskType];
    const coins = Math.min(Math.floor(base), Math.floor(spec.coinsBid));
    return { coins, usd: coins / VIBE_COINS_PER_USD, usdCents: coinsToUsdCents(coins) };
  } catch {
    return { coins: 0, usd: 0, usdCents: 0 };
  }
}

/**
 * Validate an unknown value as a GameComputeJobSpec. Never throws — returns
 * `{ ok, errors, spec, estimate }` so callers can fail open.
 */
export function validateGameComputeJobSpec(
  value: unknown,
): GameComputeValidationResult {
  try {
    if (!isRecord(value)) {
      return {
        ok: false,
        errors: ["job spec must be an object"],
        spec: null,
        estimate: null,
      };
    }
    const errors: string[] = [];
    const { taskType, payload, coinsBid } = value;

    if (!isGameComputeTaskType(taskType)) {
      errors.push(
        `taskType must be one of ${GAME_COMPUTE_TASK_TYPES.join(", ")} (got ${JSON.stringify(taskType)})`,
      );
    }
    if (!isRecord(payload)) {
      errors.push("payload must be an object");
    }
    if (
      typeof coinsBid !== "number" ||
      !Number.isFinite(coinsBid) ||
      !Number.isInteger(coinsBid) ||
      coinsBid < 0
    ) {
      errors.push("coinsBid must be a non-negative integer (whole coins)");
    }

    if (errors.length > 0) {
      return { ok: false, errors, spec: null, estimate: null };
    }
    const spec: GameComputeJobSpec = {
      taskType: taskType as GameComputeTaskType,
      payload: { ...(payload as GameComputePayload) },
      coinsBid: coinsBid as number,
    };
    return {
      ok: true,
      errors: [],
      spec,
      estimate: estimateGameComputeCost(spec),
    };
  } catch (err) {
    return {
      ok: false,
      errors: [
        `job spec validation failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
      spec: null,
      estimate: null,
    };
  }
}

/**
 * Parse + validate a job spec from a JSON string. Never throws.
 */
export function parseGameComputeJobSpec(
  json: string,
): GameComputeValidationResult {
  try {
    return validateGameComputeJobSpec(JSON.parse(json) as unknown);
  } catch (err) {
    return {
      ok: false,
      errors: [
        `job spec is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      ],
      spec: null,
      estimate: null,
    };
  }
}

/** Human one-liner for queue UIs (includes the 100=$1 USD equivalent). */
export function describeGameComputeJob(spec: GameComputeJobSpec): string {
  const { coins, usd } = estimateGameComputeCost(spec);
  return `${spec.taskType} — ${coins} coins ($${usd.toFixed(2)}) bid ${spec.coinsBid}`;
}

/* ---------------------------------------------------------------------------
 * Fail-open offline queue (mirrors the /games/mods local-bundle pattern).
 *
 * The compute submission page reads this queue first (local render), then
 * tries a live POST; ANY failure (offline, 404, no route yet) keeps the job
 * in the local queue so the page never bricks navigation. Every helper is
 * guarded for SSR (no window) and wrapped in try/catch: they NEVER throw.
 * ------------------------------------------------------------------------- */

/** localStorage key for the pending game compute-job queue. */
export const GAME_COMPUTE_QUEUE_KEY = "vcw-game-compute-queue" as const;

/** One queued entry: the validated spec plus bookkeeping. */
export interface QueuedGameComputeJob {
  id: string;
  queuedAt: string;
  spec: GameComputeJobSpec;
  estimate: GameComputeCostEstimate;
}

const memoryQueueFallback: QueuedGameComputeJob[] = [];

function makeQueueId(): string {
  try {
    const cryptoObj =
      typeof globalThis !== "undefined"
        ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
        : undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  } catch {
    // Fall through to the Math.random id below.
  }
  return `job-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function readStoredQueue(): QueuedGameComputeJob[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return [...memoryQueueFallback];
    }
    const raw = window.localStorage.getItem(GAME_COMPUTE_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: QueuedGameComputeJob[] = [];
    for (const entry of parsed) {
      if (!isRecord(entry)) continue;
      const checked = validateGameComputeJobSpec(entry.spec);
      if (!checked.ok || !checked.spec || !checked.estimate) continue;
      valid.push({
        id: typeof entry.id === "string" ? entry.id : makeQueueId(),
        queuedAt:
          typeof entry.queuedAt === "string"
            ? entry.queuedAt
            : new Date().toISOString(),
        spec: checked.spec,
        estimate: checked.estimate,
      });
    }
    return valid;
  } catch {
    return [...memoryQueueFallback];
  }
}

function writeStoredQueue(entries: QueuedGameComputeJob[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      memoryQueueFallback.splice(0, memoryQueueFallback.length, ...entries);
      return;
    }
    window.localStorage.setItem(GAME_COMPUTE_QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full / blocked — keep the memory fallback in sync, never throw.
    memoryQueueFallback.splice(0, memoryQueueFallback.length, ...entries);
  }
}

/**
 * Read the pending offline queue. Never throws — SSR / corrupt storage
 * yields an empty (or memory-fallback) list.
 */
export function readGameComputeQueue(): QueuedGameComputeJob[] {
  try {
    return readStoredQueue();
  } catch {
    return [];
  }
}

/**
 * Enqueue a job spec for later submission. Validates first (invalid input
 * is rejected with errors, not queued) and never throws — storage failures
 * fall back to the in-memory queue.
 */
export function enqueueGameComputeJob(value: unknown): {
  queued: boolean;
  errors: string[];
  entry: QueuedGameComputeJob | null;
} {
  try {
    const checked = validateGameComputeJobSpec(value);
    if (!checked.ok || !checked.spec || !checked.estimate) {
      return { queued: false, errors: checked.errors, entry: null };
    }
    const entry: QueuedGameComputeJob = {
      id: makeQueueId(),
      queuedAt: new Date().toISOString(),
      spec: checked.spec,
      estimate: checked.estimate,
    };
    const current = readStoredQueue();
    writeStoredQueue([...current, entry]);
    return { queued: true, errors: [], entry };
  } catch (err) {
    return {
      queued: false,
      errors: [
        `enqueue failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
      entry: null,
    };
  }
}

/**
 * Remove one entry from the offline queue by id. Never throws; returns true
 * when an entry was removed.
 */
export function dequeueGameComputeJob(id: string): boolean {
  try {
    const current = readStoredQueue();
    const next = current.filter((entry) => entry.id !== id);
    if (next.length === current.length) return false;
    writeStoredQueue(next);
    return true;
  } catch {
    return false;
  }
}
