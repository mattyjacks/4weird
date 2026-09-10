/**
 * Game rentals — "renting games" play metering.
 *
 * Intuitive model (one rule everywhere, 25% cut INCLUDED, never on top):
 *   - Each game load costs `coins_per_load` (default 1 coin = $0.01) and the
 *     load INCLUDES the first hour of play. Continued play costs
 *     `coins_per_hour` per extra hour (default 1 coin/hr).
 *   - So a plain 5-hour session on default rates costs exactly 5 coins —
 *     covered by even a day-1 daily bonus (5 coins). AI features meter on
 *     top via the game-AI ledger (`lib/game-ai.ts`).
 *   - Cached loads are free: when the client reports less than 1 MiB of NEW
 *     network bytes for the load (service-worker + HTTP cache did the work),
 *     no load fee is charged. Same-version reloads within 24h are also free
 *     server-side (refresh-protection in `start_game_session`).
 *   - Game developers set their own rates, 0–100 coins per load and 0–100
 *     coins per hour (0 = free game). Only mapped developers
 *     (`game_developers`, onboarded by an admin) or admins may change rates.
 *
 * Guests (signed out) never touch coins: they play free inside an IP-based
 * daily quota (`GUEST_FREE_LOADS_PER_DAY`), then keep playing by viewing
 * skippable house ads — no cloud saves, multiplayer, AI, or Buddy.
 */

export const GAME_LOAD_COINS_DEFAULT = 1;
export const GAME_HOURLY_COINS_DEFAULT = 1;
/** Developer-settable ceiling for both load and hourly rates (0 = free). */
export const GAME_RATE_MAX = 100;
/** First hour of play is included in the load fee — hourly billing starts after it. */
export const GAME_INCLUDED_SECONDS = 3600;
/** A load moving less than this many NEW bytes is a cached load: free. */
export const GAME_CACHE_FREE_BYTES = 1024 * 1024; // 1 MiB
/** Same bundle version reloaded inside this window is never double-billed. */
export const GAME_RELOAD_FREE_SECONDS = 24 * 3600; // 24h
/** Heartbeat cadence (client) and per-beat cap (server). */
export const GAME_HEARTBEAT_SECONDS = 300; // 5 min
export const GAME_HEARTBEAT_MAX_SECONDS = 3600;

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

/** Extra billable hours beyond the included first hour. */
export function billableExtraHours(totalActiveSeconds: number): number {
  const extra = Math.max(0, Math.floor(totalActiveSeconds) - GAME_INCLUDED_SECONDS);
  if (extra <= 0) return 0;
  return Math.ceil(extra / 3600);
}

/** Hourly coins owed for a session at the game's rate (first hour free). */
export function hourlyOwed(totalActiveSeconds: number, coinsPerHour: number): number {
  return billableExtraHours(totalActiveSeconds) * Math.max(0, Math.floor(coinsPerHour));
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

/** Worst-case coins for `hours` of play on a rate (load incl. first hour). */
export function quotePlay(hours: number, coinsPerLoad: number, coinsPerHour: number): number {
  const h = Math.max(0, Math.floor(hours));
  if (h <= 0) return 0;
  return Math.max(0, Math.floor(coinsPerLoad)) + Math.max(0, h - 1) * Math.max(0, Math.floor(coinsPerHour));
}

export const GAME_RENT_CUT_NOTE =
  "Play metering includes the 25% platform cut — never added on top. 100 coins = $1.00.";
