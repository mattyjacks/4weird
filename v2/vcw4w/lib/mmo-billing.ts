/**
 * MMORPG coins-per-minute metering (economy lane, MMO-06 slice).
 *
 * Pure proportionate-split math for player-hosted MMORPG servers. All money
 * units are INTEGER centicentcoins (1 Vibe Coin = 100 centicentcoins,
 * 100 coins = exactly $1.00 — see `lib/economy.ts` CENTICENTCOINS_PER_COIN).
 * Integer-only math keeps every split exact: no float drift, no dust.
 *
 * Rule:
 * - `serverCostPerMin` is split evenly across `playerCount` players.
 * - Per-player share is floored to whole centicentcoins; the rounding
 *   remainder stays with the host (`hostCoverPerMin` includes it).
 * - The host covers the FULL cost when `hostFree` is true or when there are
 *   no players to split across (`playerCount <= 0`).
 * - Nothing here is ever negative: negative / NaN / non-finite inputs are
 *   clamped to 0.
 *
 * LEDGER-PAIRING HOOK POINT (for MMO-07's charge route — NOT this slice):
 * - This module performs ZERO ledger writes and reads NO balances.
 * - The future charge route must NOT invent a parallel balance column
 *   (no `users.coin_balance`, no `servers.balance` cache). Every coin
 *   movement must flow through the paired `coin_ledger` entries
 *   (debit player lots FIFO + credit host/payout legs), mirroring the
 *   `minutes_billed` usage counter on `mmorpg_sessions`.
 * - Suggested RPC (steward/economy review): a SECURITY DEFINER
 *   `charge_mmorpg_minutes(server_id, minutes)` that (1) computes this
 *   module's quote, (2) appends paired ledger rows, (3) bumps
 *   `mmorpg_sessions.minutes_billed` — atomically, never a bare UPDATE.
 */

/** Quote inputs: all values are sanitized by `quoteBilling`, never trusted raw. */
export type BillingQuoteInput = {
  serverCostPerMin: unknown;
  playerCount: unknown;
  hostFree: unknown;
};

/** Quote result: integer centicentcoins everywhere; `players + host == total`. */
export type BillingQuote = {
  serverCostPerMin: number;
  playerCount: number;
  hostFree: boolean;
  /** What each player pays per minute (integer centicentcoins, floored). */
  perPlayerPerMin: number;
  /** What the host covers per minute (full cost when hostFree/empty, else remainder). */
  hostCoverPerMin: number;
};

/** Clamp any value to a non-negative integer number of centicentcoins. */
export function cleanServerCostPerMin(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

/** Clamp any value to a non-negative integer player count. */
export function cleanPlayerCount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

function isHostFree(value: unknown): boolean {
  return value === true;
}

/**
 * Per-player share in integer centicentcoins.
 * `serverCost / playerCount` floored; 0 when the host covers all
 * (`hostFree`), when there is nobody to split across (`playerCount <= 0`),
 * or when the cost itself is 0/negative/invalid. Never negative.
 */
export function coinPerMinute(
  serverCostPerMin: unknown,
  playerCount: unknown,
  hostFree: unknown,
): number {
  const cost = cleanServerCostPerMin(serverCostPerMin);
  const players = cleanPlayerCount(playerCount);
  if (isHostFree(hostFree) || players <= 0 || cost <= 0) return 0;
  return Math.floor(cost / players);
}

/**
 * Full billing quote. Invariant: `perPlayerPerMin * playerCount +
 * hostCoverPerMin === serverCostPerMin` whenever the host is not free and
 * players > 0; otherwise `hostCoverPerMin === serverCostPerMin` and
 * `perPlayerPerMin === 0`.
 */
export function quoteBilling(input: BillingQuoteInput): BillingQuote {
  const serverCostPerMin = cleanServerCostPerMin(input.serverCostPerMin);
  const playerCount = cleanPlayerCount(input.playerCount);
  const hostFree = isHostFree(input.hostFree);
  const perPlayerPerMin = coinPerMinute(serverCostPerMin, playerCount, hostFree);
  const hostCoverPerMin =
    hostFree || playerCount <= 0
      ? serverCostPerMin
      : serverCostPerMin - perPlayerPerMin * playerCount;
  return { serverCostPerMin, playerCount, hostFree, perPlayerPerMin, hostCoverPerMin };
}
