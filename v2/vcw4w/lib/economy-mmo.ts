/**
 * MMO per-minute settlement math (economy lane, DS-MMO-14 slice).
 *
 * PURE module: integer-safe coin math only, zero I/O, zero DB reads or
 * writes, never logs balances or PII. Converges the three prior MMO quote
 * modules without importing them (keeps this module dependency-free):
 * - `lib/mmo-billing.ts`      — floor(cost / players) split, remainder host.
 * - `lib/mmo-host-billing.ts` — integer-centicentcoin legs, fail-open clamps.
 * - `lib/mmorpg-economy.ts`   — balanced { debit, credit } pair shapes.
 *
 * PARITY (mirrors `lib/economy.ts` without importing it):
 * - 100 Vibe Coins = exactly $1.00 USD (1 coin = 1 cent = $0.01).
 * - 1 Vibe Coin = 100 centicentcoins; 1 centicentcoin = $0.0001 USD.
 * - Every per-minute price carries the 25% platform cut INCLUDED
 *   (`SERVICE_CUT_PCT`), never on top — same rule as every other lane.
 *
 * LEDGER CONTRACT (enforced downstream, never here):
 * - Settlement persists through the SECURITY DEFINER `settle_mmo_minute()`
 *   RPC (`20261203000003_mmo_coin_settle.sql`): debit the player FIRST via a
 *   plain `coin_ledger` insert (the existing FIFO/expiry trigger allocates
 *   unexpired lots, refund-safe because refunds pre-decrement `remaining`),
 *   then credit the host net, then book the cut in `platform_ledger`.
 * - Idempotency key is `match + minute + player` (`mmoMinuteKey()`); the RPC
 *   converges retries to the stored row, never double-charges.
 * - Short balance yields a `due` settlement row, never a negative balance.
 * - No parallel balance column is read or invented anywhere on this path:
 *   balances are ALWAYS SUM(`remaining_coins`) over unexpired `coin_lots`.
 */

/** Coins per one USD at parity (100 coins = $1.00). */
export const MMO_COINS_PER_USD = 100;

/** Centicentcoins per one Vibe Coin (smallest accountable unit). */
export const MMO_CENTICENTCOINS_PER_COIN = 100;

/** Platform cut INCLUDED in every per-minute price (same rule everywhere). */
export const MMO_SERVICE_CUT_PCT = 25;

/** Smallest settleable share: 0.01 coins (1 centicentcoin). */
export const MMO_MIN_SHARE_COINS = 0.01;

/** Largest single per-minute share (matches the 10k purchase cap). */
export const MMO_MAX_SHARE_COINS = 10000;

/** Largest roster settled in one tick call (fail-open slice cap). */
export const MMO_MAX_PLAYERS_PER_TICK = 500;

/** Coins -> integer centicentcoins (round-half-up to the smallest unit). */
export function mmoToCenticentcoins(coins: number): number {
  return Math.round(coins * MMO_CENTICENTCOINS_PER_COIN);
}

/** Integer centicentcoins -> coins (always 2dp-exact). */
export function mmoToCoins(centicentcoins: number): number {
  return Math.round(centicentcoins) / MMO_CENTICENTCOINS_PER_COIN;
}

/**
 * Fail-open share cleaner: finite, within [0.01, MMO_MAX_SHARE_COINS],
 * rounded to the centicentcoin. Anything malformed (negative, NaN,
 * over-cap) returns 0 — the caller SKIPS a 0 share, never settles it.
 */
export function cleanMmoShare(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < MMO_MIN_SHARE_COINS) return 0;
  if (v > MMO_MAX_SHARE_COINS) return 0;
  return mmoToCoins(mmoToCenticentcoins(v));
}

/** Fail-open minute index: whole minutes >= 0. */
export function cleanMmoMinute(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

/** Fail-open player count: integer >= 0 (0 = nobody to split across). */
export function cleanMmoPlayerCount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

/** Fail-open match id: trimmed text, 1..200 chars, else "". */
export function cleanMmoMatchId(value: unknown): string {
  const v = String(value ?? "").trim();
  return v.length > 0 && v.length <= 200 ? v : "";
}

/**
 * Per-player per-minute share in coins (2dp, centicentcoin-exact).
 * Converges `coinPerMinute()` from `lib/mmo-billing.ts`: the server cost is
 * split evenly and each share is FLOORED to whole centicentcoins; the dust
 * remainder stays with the host (`mmoHostRemainder()`). 0 when the host
 * sponsors the room (`hostFree`), when nobody is present, or when the cost
 * itself is 0/invalid. Never negative, never throws.
 */
export function mmoSharePerMinute(
  serverCostPerMin: unknown,
  playerCount: unknown,
  hostFree: unknown,
): number {
  const costCc = Math.floor(Number(serverCostPerMin));
  if (!Number.isFinite(costCc) || costCc <= 0) return 0;
  const players = cleanMmoPlayerCount(playerCount);
  if (hostFree === true || players <= 0) return 0;
  return mmoToCoins(Math.floor(costCc / players));
}

/**
 * Dust remainder the host absorbs for one minute, in coins:
 * `total - perPlayer * players`. Always >= 0; 0 when the host is free
 * (host covers the full cost instead — see `quoteMmoMinute()`).
 */
export function mmoHostRemainder(
  serverCostPerMin: unknown,
  playerCount: unknown,
  hostFree: unknown,
): number {
  const costCc = Math.floor(Number(serverCostPerMin));
  if (!Number.isFinite(costCc) || costCc <= 0) return 0;
  if (hostFree === true) return mmoToCoins(costCc);
  const players = cleanMmoPlayerCount(playerCount);
  if (players <= 0) return mmoToCoins(costCc);
  const perPlayerCc = Math.floor(costCc / players);
  return mmoToCoins(costCc - perPlayerCc * players);
}

/** One settled minute split: gross (cut INCLUDED) into cut + host net. */
export type MmoMinuteSplit = {
  /** What the player pays (gross, cut included). */
  gross: number;
  /** Platform cut (25% of gross, booked to `platform_ledger`). */
  cut: number;
  /** What the host is credited (gross minus cut). */
  hostNet: number;
};

/**
 * Split a per-minute gross (cut INCLUDED) into platform cut + host net.
 * Integer-centicentcoin math: `gross == cut + hostNet` always. Fail-open:
 * malformed input yields a zero split (caller skips it).
 */
export function splitMmoMinute(grossCoins: unknown): MmoMinuteSplit {
  const grossCc = mmoToCenticentcoins(cleanMmoShare(grossCoins));
  if (grossCc <= 0) return { gross: 0, cut: 0, hostNet: 0 };
  const cutCc = Math.round((grossCc * MMO_SERVICE_CUT_PCT) / 100);
  return {
    gross: mmoToCoins(grossCc),
    cut: mmoToCoins(cutCc),
    hostNet: mmoToCoins(grossCc - cutCc),
  };
}

/**
 * Idempotency key for one settled minute:
 * `mmo:<match>:<minute>:<player>`. The settlement RPC UNIQUE-guards on
 * (match, minute, player) and converges retries to the stored row, so a
 * retried tick never double-charges. Returns "" for malformed parts —
 * the caller must refuse to settle an empty key.
 */
export function mmoMinuteKey(
  matchId: unknown,
  minuteIdx: unknown,
  playerId: unknown,
): string {
  const match = cleanMmoMatchId(matchId);
  const minute = cleanMmoMinute(minuteIdx);
  const player = String(playerId ?? "").trim();
  if (match === "" || player === "") return "";
  if (!Number.isInteger(minute) || minute < 0) return "";
  return `mmo:${match}:${minute}:${player}`;
}

/** One player's minute inside a tick request (validated shapes only). */
export type MmoTickPlayer = {
  playerId: string;
  /** Per-minute share in coins (centicentcoin-exact, > 0). */
  shareCoins: number;
};

/** Settle outcome buckets for a tick response (counts only, never PII). */
export type MmoTickOutcome = {
  settled: number;
  due: number;
  failed: number;
};
