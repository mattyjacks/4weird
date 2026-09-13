// DonatePersonalSeconds (DPS) P2P compute — pure helpers (remastery README §3.4, Wave 2).
// Edge-safe: TypeScript strict, no deps, no window/network, no secrets.
// Parity: 100 coins = $1 (VIBE_COINS_PER_USD = 100).

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

// Base cost per task type in whole coins. 100 coins = $1 parity.
export const DPS_BASE_COST_COINS: Record<DpsTaskType, number> = {
  blender_render: 200,
  video_transcode: 120,
  ai_embedding: 50,
  game_bundle: 80,
};

function isKnownTaskType(t: string): t is DpsTaskType {
  return (
    t === "blender_render" ||
    t === "video_transcode" ||
    t === "ai_embedding" ||
    t === "game_bundle"
  );
}

/**
 * Quote a job's cost in coins (floored to whole coins, capped at maxCoins)
 * plus USD equivalent (coins / 100).
 * Throws on unknown taskType or negative maxCoins (pure validation may throw).
 */
export function quoteJobCost(spec: DpsJobSpec): { coins: number; usd: number } {
  if (!isKnownTaskType(spec.taskType)) {
    throw new Error(`unknown taskType: ${String(spec.taskType)}`);
  }
  if (!Number.isFinite(spec.maxCoins) || spec.maxCoins < 0) {
    throw new Error(`maxCoins must be a non-negative finite number`);
  }
  const base = DPS_BASE_COST_COINS[spec.taskType];
  const floored = Math.floor(base);
  const coins = Math.min(floored, Math.floor(spec.maxCoins));
  return { coins, usd: coins / 100 };
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
