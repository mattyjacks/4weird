/**
 * MMO host billing — host-free subsidy + rental-fee billing.
 *
 * Player-hosted MMORPG servers (`mmorpg_servers`: `cost_per_min`,
 * `load_per_min`, `rental_per_hour`, `host_free`) split every session into
 * three legs — base server cost, bandwidth/load cost, and the host's rental
 * fee — and the host may subsidize any or all of them. When a leg's free
 * flag is set, the host pays that leg; otherwise the joining player does.
 *
 * Pure module (no imports, no I/O, no logging — economy paths must never
 * log balances or PII). All money math runs in integer centicentcoins
 * (1 coin = 100 centicentcoins, same unit as `lib/game-rent.ts`) so there
 * is no float drift; results are returned in coins rounded to 2 decimals.
 *
 * Rental-fee convention (extends the `lib/game-rent.ts` per-second model
 * to hourly host rentals): `rental_per_hour` is quoted per hour but settled
 * pro-rata per minute — `fee = rental_per_hour * minutes / 60`.
 * This module only QUOTES. Settlement (ledger debits, host payouts) is
 * economy-lane owned and must flow through the paired `coin_ledger`
 * entries via a guarded RPC — never a parallel balance column.
 */

export const MMO_MINUTES_PER_HOUR = 60;
/** Upper bound for a single billing quote (24h of play). */
export const MMO_MAX_BILLABLE_MINUTES = 24 * 60;
/** Developer-settable ceiling for each per-minute / per-hour rate leg. */
export const MMO_RATE_MAX_COINS = 100;

export type HostFreeFlags = {
  /** Host subsidizes the base server-cost leg. */
  freeServer: boolean;
  /** Host subsidizes the bandwidth/load leg. */
  freeLoad: boolean;
  /** Host subsidizes the rental-fee leg. */
  freeRental: boolean;
};

export type HostSplit = {
  /** Coins the host pays (sum of the subsidized legs). */
  hostTotal: number;
  /** Coins the joining player pays (sum of the unsubsidized legs). */
  playerTotal: number;
};

/** Sanitize a coin amount: finite, >= 0, rounded to the centicentcoin. */
function toCoins(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100) / 100;
}

/** Sanitize a whole-minute count: integer, >= 0. */
function toMinutes(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

function isFree(value: unknown): boolean {
  return value === true;
}

/**
 * Split the three cost legs between host and player. Each leg whose free
 * flag is set lands on `hostTotal`; every other leg lands on
 * `playerTotal`. `hostTotal + playerTotal` always equals the rounded sum
 * of the three legs.
 */
export function hostCovers(
  serverCost: number,
  loadCost: number,
  rentalFee: number,
  flags?: Partial<HostFreeFlags> | null,
): HostSplit {
  const serverCc = Math.round(toCoins(serverCost) * 100);
  const loadCc = Math.round(toCoins(loadCost) * 100);
  const rentalCc = Math.round(toCoins(rentalFee) * 100);
  const f: HostFreeFlags = {
    freeServer: isFree(flags?.freeServer),
    freeLoad: isFree(flags?.freeLoad),
    freeRental: isFree(flags?.freeRental),
  };
  const hostCc =
    (f.freeServer ? serverCc : 0) +
    (f.freeLoad ? loadCc : 0) +
    (f.freeRental ? rentalCc : 0);
  const totalCc = serverCc + loadCc + rentalCc;
  return {
    hostTotal: hostCc / 100,
    playerTotal: (totalCc - hostCc) / 100,
  };
}

/**
 * Hourly rental fee pro-rated per minute, in coins:
 * `fee = rental_per_hour * minutes / 60`, exact to the centicentcoin.
 */
export function rentalFeeForMinutes(rentalPerHour: number, minutes: number): number {
  const rateCc = Math.round(toCoins(rentalPerHour) * 100);
  const mins = toMinutes(minutes);
  if (rateCc <= 0 || mins <= 0) return 0;
  return Math.round((rateCc * mins) / MMO_MINUTES_PER_HOUR) / 100;
}

export type MmoSessionQuoteInput = {
  costPerMin: number;
  loadPerMin: number;
  rentalPerHour: number;
  minutes: number;
  flags?: Partial<HostFreeFlags> | null;
};

export type MmoSessionQuote = HostSplit & {
  serverCost: number;
  loadCost: number;
  rentalFee: number;
  minutes: number;
};

/**
 * Full session quote for `minutes` of play at the server's rates:
 * per-minute legs scale linearly, the hourly rental leg pro-rates per
 * minute, then `hostCovers` splits the three legs by the free flags.
 */
export function quoteMmoSessionMinutes(input: MmoSessionQuoteInput): MmoSessionQuote {
  const minutes = Math.min(toMinutes(input.minutes), MMO_MAX_BILLABLE_MINUTES);
  const costPerMinCc = Math.round(toCoins(input.costPerMin) * 100);
  const loadPerMinCc = Math.round(toCoins(input.loadPerMin) * 100);
  const serverCost = (costPerMinCc * minutes) / 100;
  const loadCost = (loadPerMinCc * minutes) / 100;
  const rentalFee = rentalFeeForMinutes(input.rentalPerHour, minutes);
  const split = hostCovers(serverCost, loadCost, rentalFee, input.flags ?? null);
  return {
    serverCost: Math.round(serverCost * 100) / 100,
    loadCost: Math.round(loadCost * 100) / 100,
    rentalFee,
    minutes,
    hostTotal: split.hostTotal,
    playerTotal: split.playerTotal,
  };
}
