/**
 * MMORPG per-minute coin metering quotes (economy lane, DS-MMO-05).
 *
 * Pure estimator for player-hosted MMORPG servers. All money units are
 * INTEGER centicentcoins (1 Vibe Coin = 100 centicentcoins, 100 coins =
 * exactly $1.00 — see `lib/economy.ts` CENTICENTCOINS_PER_COIN).
 *
 * Rule:
 * - Per-minute share = serverCostPerMin / N players present.
 * - Integer math only: the share is floored to whole centicentcoins with a
 *   FLOOR OF 1 (any positive cost split across players charges each present
 *   player at least 1 centicentcoin per minute — the minimum meter unit).
 * - The rounding remainder is NOT eaten by the host: it carries forward as
 *   `dustCarryOut` into the next minute's numerator (`dustCarryIn`), so
 *   fractional shares resolve into whole units over time instead of leaking.
 * - Split reporting: every gross is reported with the 25% platform cut
 *   INCLUDED in the price (SERVICE_CUT_PCT), never on top.
 *
 * CONVERGENCE with the prior crew slice (`lib/mmo-billing.ts`, NOT forked):
 * - Sanitizers are REUSED from that module (`cleanServerCostPerMin`,
 *   `cleanPlayerCount`) — never re-implemented here.
 * - The remainder home differs ON PURPOSE and is documented, not drift:
 *   `mmo-billing.quoteBilling` (rental/subsidy context) folds the remainder
 *   into `hostCoverPerMin` so `players + host == total`; THIS module
 *   (metering context) carries the remainder as dust so `playersTotal +
 *   hostCover + dustOut == serverCost + dustIn (+ floor-1 surplus, surfaced
 *   as `overCollectedPerMin`, never hidden). Host subsidy modes
 *   (host_full / host_split_pct / host_cap_pool) belong to DS-MMO-06's
 *   host-cover path, not to this per-minute meter.
 *
 * LEDGER CONTRACT (DS-MMO-14 owns all writes — this slice reads only):
 * - This module performs ZERO ledger writes and reads NO balances.
 * - DS-MMO-14's landed `settle_mmo_minute()` RPC (migration
 *   `20261203000003_mmo_coin_settle.sql`, DONE) writes per-minute charge
 *   rows to `coin_ledger` with reasons `MMO minute <match>#<minute>`
 *   (player debit, FIRST) and `MMO host payout <match>#<minute>`
 *   (host credit), with the 25% cut booked to `platform_ledger`. The
 *   `GET /api/coins/mmo/ledger` read path in this slice filters the
 *   caller's own rows on the `<match>` substring of exactly those shapes
 *   (see MMO_SETTLE_*_REASON_PREFIX below) — never a parallel balance
 *   column, never a repair write: retries converge inside DS-MMO-14's
 *   idempotent RPC.
 * - Known quote/settle tolerance (documented, not drift): this estimator
 *   carries rounding remainders forward as dust (envelope-mandated), while
 *   the landed settlement absorbs each minute's remainder into the host
 *   leg. Both conserve every centicentcoin; per-minute player charges can
 *   differ by dust-resolution timing only.
 */

/** Reused sanitizers from the prior crew slice — the convergence point. */
import { cleanPlayerCount, cleanServerCostPerMin } from "./mmo-billing";
import { CENTICENTCOIN_USD, CENTICENTCOINS_PER_COIN, SERVICE_CUT_PCT } from "./economy";

/** Parity: 100 Vibe Coins cost exactly $1.00 (asserted, not assumed). */
export const MMO_COINS_PER_DOLLAR = 100;

/** Input hygiene caps (estimator bounds, not economic policy). */
export const MAX_METER_PLAYERS = 256;
export const MAX_DUST_CARRY_CCC = 1000000;
export const MAX_QUOTE_MINUTES = 1440;
export const MAX_SERVER_COST_PER_MIN_CCC = 100000000;

/** Quote inputs: every value is sanitized, never trusted raw. */
export type MeterQuoteInput = {
  serverCostPerMin: unknown;
  playerCount: unknown;
  hostFree?: unknown;
  dustCarry?: unknown;
  minutes?: unknown;
};

/** One gross split: 25% platform cut INCLUDED in the gross, never on top. */
export type MeterSplit = {
  /** Total charged (integer centicentcoins). */
  gross: number;
  /** Platform cut (integer centicentcoins, floored so it never exceeds gross). */
  platformCut: number;
  /** Host / provider net (gross minus cut, integer centicentcoins). */
  hostNet: number;
};

/** Full per-minute meter quote. All money fields are integer centicentcoins. */
export type MeterQuote = {
  serverCostPerMin: number;
  playerCount: number;
  hostFree: boolean;
  minutes: number;
  /** What each present player pays per minute (integer centicentcoins, floor 1). */
  perPlayerPerMin: number;
  /** Players' combined share per minute (perPlayerPerMin * playerCount). */
  playersTotalPerMin: number;
  /** What the host covers per minute (full cost when hostFree/empty, else 0). */
  hostCoverPerMin: number;
  dustCarryIn: number;
  /** Rounding remainder carried into the next minute (0 when host covers). */
  dustCarryOut: number;
  /** Floor-1 policy surplus when per-player minimums exceed the numerator. */
  overCollectedPerMin: number;
  /** Per-player 75/25 split (gross = perPlayerPerMin). */
  perPlayerSplit: MeterSplit;
  /** Players-combined 75/25 split per minute. */
  playersSplitPerMin: MeterSplit;
  /** Session estimate: per-player total for `minutes` (perPlayerPerMin * minutes). */
  perPlayerForSession: number;
  /** Session estimate: players-combined total for `minutes`. */
  playersTotalForSession: number;
  /** Session players-combined 75/25 split. */
  sessionSplit: MeterSplit;
  /** Human-readable surfacing (derived, never stored). */
  perPlayerCoins: number;
  perPlayerUsd: number;
  quotedFrom: "mmo-meter-quote";
};

/** Clamp any value to a non-negative integer dust carry (centicentcoins). */
export function cleanDustCarry(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(Math.floor(v), MAX_DUST_CARRY_CCC);
}

/** Clamp any value to a session length of 1..MAX_QUOTE_MINUTES minutes. */
export function cleanMinutes(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.min(Math.floor(v), MAX_QUOTE_MINUTES);
}

function isHostFree(value: unknown): boolean {
  return value === true;
}

/**
 * Split an integer-centicentcoin gross into platform cut + host net.
 * Integer math only: cut = round(gross * 25 / 100) — the same rounding the
 * landed `settle_mmo_minute()` RPC and `splitMmoMinute()` use — and
 * hostNet = gross - cut, so `platformCut + hostNet === gross` always and
 * the cut never exceeds the gross. The cut is INCLUDED in the listed
 * gross, never added on top.
 */
export function splitMeterGross(grossCcc: unknown): MeterSplit {
  const gross = cleanServerCostPerMin(grossCcc);
  const platformCut = Math.round((gross * SERVICE_CUT_PCT) / 100);
  return { gross, platformCut, hostNet: gross - platformCut };
}

/**
 * Full per-minute meter quote.
 *
 * Conservation: `playersTotalPerMin + hostCoverPerMin + dustCarryOut ===
 * serverCostPerMin + dustCarryIn + overCollectedPerMin`. The dust terms
 * carry fractional shares across minutes; `overCollectedPerMin` is nonzero
 * only when the floor-1 minimum charges more than the numerator that
 * minute (tiny cost split across many players) — surfaced, never hidden.
 */
export function quoteMeter(input: MeterQuoteInput): MeterQuote {
  const serverCostPerMin = Math.min(
    cleanServerCostPerMin(input.serverCostPerMin),
    MAX_SERVER_COST_PER_MIN_CCC,
  );
  const playerCount = Math.min(cleanPlayerCount(input.playerCount), MAX_METER_PLAYERS);
  const hostFree = isHostFree(input.hostFree);
  const minutes = cleanMinutes(input.minutes);
  const dustCarryIn = cleanDustCarry(input.dustCarry);

  if (hostFree || playerCount <= 0) {
    const perPlayerSplit = splitMeterGross(0);
    const sessionSplit = splitMeterGross(0);
    return {
      serverCostPerMin,
      playerCount,
      hostFree,
      minutes,
      perPlayerPerMin: 0,
      playersTotalPerMin: 0,
      hostCoverPerMin: serverCostPerMin,
      dustCarryIn,
      dustCarryOut: dustCarryIn,
      overCollectedPerMin: 0,
      perPlayerSplit,
      playersSplitPerMin: perPlayerSplit,
      perPlayerForSession: 0,
      playersTotalForSession: 0,
      sessionSplit,
      perPlayerCoins: 0,
      perPlayerUsd: 0,
      quotedFrom: "mmo-meter-quote",
    };
  }

  const numerator = serverCostPerMin + dustCarryIn;
  const base = numerator > 0 ? Math.floor(numerator / playerCount) : 0;
  // Floor 1: any positive numerator charges each present player at least
  // the minimum meter unit of 1 centicentcoin per minute.
  const perPlayerPerMin = numerator > 0 ? Math.max(1, base) : 0;
  const playersTotalPerMin = perPlayerPerMin * playerCount;
  const dustCarryOut =
    playersTotalPerMin <= numerator ? numerator - playersTotalPerMin : 0;
  const overCollectedPerMin =
    playersTotalPerMin > numerator ? playersTotalPerMin - numerator : 0;

  const perPlayerSplit = splitMeterGross(perPlayerPerMin);
  const playersSplitPerMin = splitMeterGross(playersTotalPerMin);
  const perPlayerForSession = perPlayerPerMin * minutes;
  const playersTotalForSession = playersTotalPerMin * minutes;
  const sessionSplit = splitMeterGross(playersTotalForSession);

  return {
    serverCostPerMin,
    playerCount,
    hostFree,
    minutes,
    perPlayerPerMin,
    playersTotalPerMin,
    hostCoverPerMin: 0,
    dustCarryIn,
    dustCarryOut,
    overCollectedPerMin,
    perPlayerSplit,
    playersSplitPerMin,
    perPlayerForSession,
    playersTotalForSession,
    sessionSplit,
    perPlayerCoins: perPlayerPerMin / CENTICENTCOINS_PER_COIN,
    perPlayerUsd: perPlayerPerMin * CENTICENTCOIN_USD,
    quotedFrom: "mmo-meter-quote",
  };
}

/**
 * Match/server id validator shared by the mmo quote + ledger read paths
 * (and the DS-MMO-14 write path). UUIDs (DS-MMO-10 server ids) pass;
 * anything outside `[A-Za-z0-9:_-]{1,128}` is rejected as "".
 */
export function cleanMatchId(value: unknown): string {
  const v = String(value ?? "").trim();
  return /^[A-Za-z0-9:_-]{1,128}$/.test(v) ? v : "";
}

/**
 * Landed settlement reason shapes (DS-MMO-14, read-only reference — this
 * slice never writes them). `settle_mmo_minute()` persists
 * `<PREFIX><match>#<minute>` (truncated to the varchar(120) reason cap):
 * player debits under MMO_SETTLE_DEBIT_REASON_PREFIX, host credits under
 * MMO_SETTLE_CREDIT_REASON_PREFIX. The ledger read path matches the
 * `<match>` substring of these shapes.
 */
export const MMO_SETTLE_DEBIT_REASON_PREFIX = "MMO minute ";
export const MMO_SETTLE_CREDIT_REASON_PREFIX = "MMO host payout ";
