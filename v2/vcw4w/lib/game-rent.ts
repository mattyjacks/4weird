/**
 * Game rentals — "renting games" play metering.
 *
 * Per-second model (one rule everywhere, 25% cut INCLUDED, never on top).
 * Prices are still quoted in familiar "per hour" terms; the ledger simply
 * settles every second instead of every hour:
 *
 *   - First load: proportional to FRESH network bytes for the load.
 *     `load_fee_coins = round2(coins_per_load * new_bytes / 1 MiB)`,
 *     computed in integer centicentcoins so there is no float drift:
 *     `load_fee_cc = round(load_rate_cc * new_bytes / 1048576)`.
 *     0 bytes = 0. Any positive load on a priced game costs at least
 *     1 centicentcoin (0.01 coins). Same bundle version billed in the last
 *     24h is still free server-side (refresh protection in
 *     `start_game_session`). There is no longer a "< 1 MiB free" rule.
 *   - Running play: billed per second from the FIRST second (no included
 *     hour): `owed_coins = round2(coins_per_hour * active_seconds / 3600)`,
 *     i.e. `owed_cc = round(hourly_rate_cc * active_seconds / 3600)`.
 *     Default 1 coin/hr = exactly 100 centicentcoins spread over
 *     60 min * 60 s (3600 s). Heartbeats debit only the delta since the
 *     last beat, so beats never double-bill.
 *   - Every gross amount splits 25% platform / 75% provider with
 *     `cut_cc = round(gross_cc * 25 / 100)` and `provider = gross - cut`,
 *     so cut + provider ALWAYS equals gross (verified by a DB CHECK).
 *   - Game developers set their own rates, 0–100 coins per load and 0–100
 *     coins per hour (0 = free game). Only mapped developers
 *     (`game_developers`, onboarded by an admin) or admins may change rates.
 *   - The client heartbeats visible-tab seconds regularly (60 s cadence)
 *     and surfaces a "still playing?" check every 5 hours of active play.
 *
 * Guests (signed out) never touch coins: they play free inside an IP-based
 * daily quota (`GUEST_FREE_LOADS_PER_DAY`), then keep playing by viewing
 * skippable house ads — no cloud saves, multiplayer, AI, or Buddy.
 */

export const GAME_LOAD_COINS_DEFAULT = 1;
export const GAME_HOURLY_COINS_DEFAULT = 1;
/** Developer-settable ceiling for both load and hourly rates (0 = free). */
export const GAME_RATE_MAX = 100;
/**
 * Reference size for the proportional load fee: the load rate is the price
 * for 1 MiB of fresh bytes. Smaller loads pay the exact fraction, rounded
 * to the nearest centicentcoin (1 coin = 100 centicentcoins).
 */
export const GAME_LOAD_REFERENCE_BYTES = 1024 * 1024; // 1 MiB
/** Back-compat alias: the load reference size in bytes. */
export const GAME_CACHE_FREE_BYTES = GAME_LOAD_REFERENCE_BYTES;
/** First hour is NOT free: running play bills per second from second one. */
export const GAME_INCLUDED_SECONDS = 0;
/** Same bundle version reloaded inside this window is never double-billed. */
export const GAME_RELOAD_FREE_SECONDS = 24 * 3600; // 24h
/** Heartbeat cadence (client) and per-beat cap (server). Per-second ledger. */
export const GAME_HEARTBEAT_SECONDS = 60; // 1 min
export const GAME_HEARTBEAT_MAX_SECONDS = 3600;
/** Still-playing check: warn + confirm every 5 hours of active play. */
export const GAME_STILL_PLAYING_SECONDS = 5 * 3600; // 5h

/** Guest quotas: free loads per IP per day, then ads unlock more play. */
export const GUEST_FREE_LOADS_PER_DAY = 3;
export const GUEST_MAX_LOADS_PER_DAY = 20;
/** Guest mid-play house-ad banner cadence (ms). Signed-in players never see it. */
export const GUEST_AD_INTERVAL_MS = 30 * 60 * 1000; // 30 min

export function isGameRate(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 0 || v > GAME_RATE_MAX) return -1;
  return v;
}

export function isNewBytes(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0 || v > 1024 * 1024 * 1024) return -1;
  return Math.floor(v);
}

export function isBundleVersion(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 32);
  return /^[A-Za-z0-9._-]{1,32}$/.test(v) ? v : "";
}

/**
 * Proportional load fee in coins for `newBytes` of fresh data at
 * `coinsPerLoad` (price per 1 MiB). Exact integer-centicentcoin math:
 * round(load_cc * bytes / 1MiB) / 100, min 1 centicentcoin when a priced
 * game actually moved bytes.
 */
export function loadFeeForBytes(newBytes: number, coinsPerLoad: number): number {
  const bytes = Math.max(0, Math.floor(newBytes));
  const rate = Math.max(0, Math.floor(coinsPerLoad));
  if (bytes <= 0 || rate <= 0) return 0;
  const feeCc = Math.round((rate * 100 * bytes) / GAME_LOAD_REFERENCE_BYTES);
  return Math.max(1, feeCc) / 100;
}

/** Running-play gross owed in coins for `totalActiveSeconds` at the hourly rate. Per-second ledger. */
export function runningOwed(totalActiveSeconds: number, coinsPerHour: number): number {
  const seconds = Math.max(0, Math.floor(totalActiveSeconds));
  const rate = Math.max(0, Math.floor(coinsPerHour));
  if (seconds <= 0 || rate <= 0) return 0;
  return Math.round((rate * 100 * seconds) / 3600) / 100;
}

/** Extra billable hours beyond the included first hour. Legacy helper: the included hour is now 0. */
export function billableExtraHours(totalActiveSeconds: number): number {
  const extra = Math.max(0, Math.floor(totalActiveSeconds) - GAME_INCLUDED_SECONDS);
  if (extra <= 0) return 0;
  return Math.ceil(extra / 3600);
}

/** Hourly coins owed for a session at the game's rate (per-second ledger, no free hour). */
export function hourlyOwed(totalActiveSeconds: number, coinsPerHour: number): number {
  return runningOwed(totalActiveSeconds, coinsPerHour);
}

/** Per-second price in coins for display (hourly rate spread over 3600 s). */
export function perSecondCoins(coinsPerHour: number): number {
  return Math.max(0, Math.floor(coinsPerHour)) / 3600;
}

/** Per-second price in centicentcoins (exact: rate_cc / 3600 per second). */
export function perSecondCenticentcoins(coinsPerHour: number): number {
  return (Math.max(0, Math.floor(coinsPerHour)) * 100) / 3600;
}

export type GameRate = {
  game_slug: string;
  coins_per_load: number;
  coins_per_hour: number;
};

export function rateOrDefault(rate: GameRate | null | undefined): Required<GameRate> & { game_slug: string } {
  return {
    game_slug: rate?.game_slug ?? "",
    coins_per_load: rate && Number.isInteger(rate.coins_per_load) ? rate.coins_per_load : GAME_LOAD_COINS_DEFAULT,
    coins_per_hour: rate && Number.isInteger(rate.coins_per_hour) ? rate.coins_per_hour : GAME_HOURLY_COINS_DEFAULT,
  };
}

/** Worst-case coins for `hours` of play on a rate (proportional load + per-second running). */
export function quotePlay(hours: number, coinsPerLoad: number, coinsPerHour: number): number {
  const h = Math.max(0, Math.floor(hours));
  if (h <= 0) return 0;
  return Math.max(0, Math.floor(coinsPerLoad)) + Math.max(0, h - 1) * Math.max(0, Math.floor(coinsPerHour));
}

/** Worst-case coins for `seconds` of play (full 1 MiB load + per-second running). */
export function quotePlaySeconds(seconds: number, coinsPerLoad: number, coinsPerHour: number): number {
  return loadFeeForBytes(GAME_LOAD_REFERENCE_BYTES, coinsPerLoad) + runningOwed(seconds, coinsPerHour);
}

export const GAME_RENT_CUT_NOTE =
  "Play metering includes the 25% platform cut — never added on top. 100 coins = $1.00. Billed per second, quoted per hour.";
