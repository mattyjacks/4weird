/**
 * MMORPG coin-per-minute metering (economy lane).
 *
 * PURE pricing module: integer-safe coin math only, zero I/O, zero DB writes.
 * Handlers quote through this file and read the ledger separately — balances
 * are ALWAYS SUM(delta) over the append-only paired ledger (`coin_ledger`);
 * there is NO parallel balance column anywhere on this path, and this file
 * NEVER touches `coin_ledger` tables, `lib/economy.ts`, or migrations.
 *
 * PARITY (mirrors `lib/economy.ts` without importing it, keeping this module
 * dependency-free):
 *   - 100 Vibe Coins = exactly $1.00 USD (1 coin = 1 cent = $0.01).
 *   - 1 Vibe Coin = 100 centicentcoins; 1 centicentcoin = $0.0001 USD.
 *   - Every per-minute price carries the 25% platform cut INCLUDED
 *     (`MMORPG_SERVICE_CUT_PCT`), never on top — same rule as every lane.
 *   - All money math below runs in INTEGER centicentcoins, then converts
 *     back to coins rounded to 2dp — so every returned coin value is
 *     centicentcoin-exact (no float dust like 0.1 + 0.2).
 *
 * DROPLET COST MODEL (one shared $6/mo box for every game):
 *   - `MMORPG_DROPLET_USD_PER_MONTH` is the real DigitalOcean droplet price.
 *   - The monthly coin value is grossed UP so the 25% platform cut stays
 *     INSIDE: 600 coins / 0.75 = 800 coins
 *     (`MMORPG_DROPLET_TOTAL_PER_MIN_COINS = 800 / 43200`, exported for the
 *     API lane; 43200 = minutes in a 30-day month).
 *   - `quoteSession` prices EVERY dimension from that single droplet total
 *     (one box, one price — `gameKind` is still cleaned and echoed for
 *     compat but no longer changes the price), then splits the per-minute
 *     total across seated players (more heads = cheaper each, floored at
 *     1 centicentcoin so a seat is never free-by-dust).
 *   - There is NO per-room rental on a shared box: rental is always 0 and
 *     the host pays 0 unless `hostFree` sponsors the room (then the host
 *     pays the full per-minute burn, players pay 0).
 *   - `MMORPG_SERVER_COSTS` / `MMORPG_SERVER_COSTS_BY_GAME` remain as the
 *     legacy persisted-row rate card (room rows still store those figures)
 *     but they no longer drive quotes.
 *
 * FAIL-OPEN CLAMPS: bad inputs never throw and never bill phantom money —
 * negatives clamp to 0, non-finite values fall back to defaults, player
 * counts floor to integers >= 0, minutes clamp to [0, MAX_SESSION_MINUTES].
 * Only integer-safe, bounded outputs leave this module.
 *
 * ASCII money flow (per session minute, totals scale linearly by minutes):
 * one shared $6/mo droplet, burn split across seats, no rental meter.
 *
 *   hostFree = false (normal split)
 *   +----------------+  droplet/min +----------------------+
 *   | DROPLET METER  | ------------> |  PLAYERS (split even)|
 *   | 800 coins/mo / |  /playerCount |  each pays 1/N share |
 *   | 43200 min, cut |  floor 1cc    |  (min 0.01 coin)     |
 *   | INCLUDED       |               +----------------------+
 *   +----------------+                    HOST pays 0
 *   | NO RENTAL METER|  (shared box, no per-room rental)
 *   +----------------+
 *
 *   hostFree = true (host sponsors the room)
 *   +----------------+  droplet/min +----------------------+
 *   | DROPLET METER  | ------------> |  HOST (pays full     |
 *   | 800 coins/mo / |  full burn    |  per-minute burn)    |
 *   | 43200 min      |               |  players pay 0       |
 *   +----------------+               +----------------------+
 *
 * LEDGER PAIRING: `splitLedgerEntries()` turns a quote into balanced
 * { debit, credit } pairs (debit the payer, credit the house pool) with
 * EQUAL amounts per pair. Shapes only — the caller persists them through
 * its own guarded RPC; this function performs no I/O.
 */

/** Coins per one USD at parity (100 coins = $1.00). */
export const MMORPG_COINS_PER_USD = 100;

/** Centicentcoins per one Vibe Coin (smallest accountable unit). */
export const MMORPG_CENTICENTCOINS_PER_COIN = 100;

/** Longest single session quotable in one call (24h in minutes). */
export const MMORPG_MAX_SESSION_MINUTES = 1440;

/** Platform cut INCLUDED in every per-minute price (same rule everywhere). */
export const MMORPG_SERVICE_CUT_PCT = 25;

/** Real droplet price: one shared $6/mo DigitalOcean box for all games. */
export const MMORPG_DROPLET_USD_PER_MONTH = 6;

/** Minutes in a 30-day droplet billing month (30 * 24 * 60). */
export const MMORPG_DROPLET_MINUTES_PER_MONTH = 43200;

/**
 * Canonical per-minute droplet burn in coins, exported for the API lane.
 * Grossed UP so the 25% cut stays INSIDE: $6/mo = 600 coins at parity,
 * 600 / 0.75 = 800 coins gross per month, spread over 43200 minutes.
 * Integer billing uses `MMORPG_DROPLET_TOTAL_PER_MIN_CC` (rounded to the
 * smallest unit); this float is the display/settlement reference.
 */
export const MMORPG_DROPLET_TOTAL_PER_MIN_COINS = 800 / 43200;

/**
 * Canonical per-minute droplet burn in integer centicentcoins
 * (authoritative for billing math): 800 coins = 80000cc over 43200 min,
 * rounded to the smallest accountable unit (2cc = 0.02 coins).
 */
export const MMORPG_DROPLET_TOTAL_PER_MIN_CC = Math.round(
  ((MMORPG_DROPLET_USD_PER_MONTH * MMORPG_COINS_PER_USD) /
    (1 - MMORPG_SERVICE_CUT_PCT / 100) /
    MMORPG_DROPLET_MINUTES_PER_MONTH) *
    MMORPG_CENTICENTCOINS_PER_COIN,
);

/** Largest player roster quotable in one call (fail-open slice cap). */
export const MMORPG_MAX_PLAYERS_PER_SESSION = 500;

/** Ceiling for any per-minute cost input (matches the 10k purchase cap). */
export const MMORPG_MAX_COST_PER_MIN_COINS = 10000;

/** GraveGain dimension metered by this module (4d above 3d, 5d highest). */
export type MmorpgGameKind =
  | "gravegain1d"
  | "gravegain2dA"
  | "gravegain2dB"
  | "gravegain3d"
  | "gravegain4d"
  | "gravegain5d";

/** Every dimension this module can quote, in cost order (cheapest first). */
export const MMORPG_GAME_KINDS: readonly MmorpgGameKind[] = [
  "gravegain1d",
  "gravegain2dA",
  "gravegain2dB",
  "gravegain3d",
  "gravegain4d",
  "gravegain5d",
];

/** Fallback dimension when `gameKind` is missing or forged (fail-open). */
export const MMORPG_DEFAULT_GAME_KIND: MmorpgGameKind = "gravegain3d";

/**
 * Default server price book, in whole coins (legacy 3d baseline).
 * - basePerMin: flat room cost per minute ($0.10/min => $6.00/hr).
 * - loadPerPlayerPerMin: marginal load per seated player per minute.
 * - rentalPerHour: host's room-rental fee per hour, always host-paid,
 *   prorated to the minute for sessions shorter than an hour.
 * Kept verbatim for backwards compatibility; equals the 3d row below.
 */
export const MMORPG_SERVER_COSTS: MmorpgServerCosts = {
  basePerMin: 10,
  loadPerPlayerPerMin: 2,
  rentalPerHour: 60,
};

export type MmorpgServerCosts = {
  basePerMin: number;
  loadPerPlayerPerMin: number;
  rentalPerHour: number;
};

/**
 * Legacy persisted-row price book, in whole coins (cut INCLUDED).
 * Kept verbatim for backwards compatibility: room rows still store these
 * figures and `resolveMmorpgServerCosts` still serves them, but
 * `quoteSession` no longer prices from them — every dimension quotes the
 * single shared droplet total (`MMORPG_DROPLET_TOTAL_PER_MIN_CC`).
 * Ordering: 4d sits slightly above 3d, 5d is the highest.
 */
export const MMORPG_SERVER_COSTS_BY_GAME: Record<MmorpgGameKind, MmorpgServerCosts> = {
  gravegain1d: { basePerMin: 6, loadPerPlayerPerMin: 1, rentalPerHour: 36 },
  gravegain2dA: { basePerMin: 8, loadPerPlayerPerMin: 2, rentalPerHour: 48 },
  gravegain2dB: { basePerMin: 9, loadPerPlayerPerMin: 2, rentalPerHour: 54 },
  gravegain3d: { basePerMin: 10, loadPerPlayerPerMin: 2, rentalPerHour: 60 },
  gravegain4d: { basePerMin: 12, loadPerPlayerPerMin: 3, rentalPerHour: 72 },
  gravegain5d: { basePerMin: 15, loadPerPlayerPerMin: 4, rentalPerHour: 90 },
};

/** Fail-open dimension cleaner: unknown values fall back to the 3d row. */
export function cleanMmorpgGameKind(value: unknown): MmorpgGameKind {
  const v = String(value ?? "").trim();
  if (
    v === "gravegain1d" ||
    v === "gravegain2dA" ||
    v === "gravegain2dB" ||
    v === "gravegain3d" ||
    v === "gravegain4d" ||
    v === "gravegain5d"
  ) {
    return v;
  }
  return MMORPG_DEFAULT_GAME_KIND;
}

/** Resolve the price row for a dimension (fail-open to the 3d baseline). */
export function resolveMmorpgServerCosts(gameKind: unknown): MmorpgServerCosts {
  return MMORPG_SERVER_COSTS_BY_GAME[cleanMmorpgGameKind(gameKind)];
}

/** Input to {@link quoteSession}. All coin fields are Vibe Coins. */
export type QuoteSessionInput = {
  /** GraveGain dimension row to quote (cleaned + echoed, price is droplet-flat). */
  gameKind?: unknown;
  /** IGNORED for pricing (compat only): one shared box, one droplet price. */
  serverCostPerMin?: unknown;
  /** IGNORED for pricing (compat only): one shared box, one droplet price. */
  loadCostPerMin?: unknown;
  /** Seated players sharing the bill. Clamped to an integer >= 0. */
  playerCount?: unknown;
  /** True => players pay 0, host pays server + load + rental. */
  hostFree?: unknown;
  /** Minutes on the server. Clamped to [0, MMORPG_MAX_SESSION_MINUTES]. */
  minutesOnServer?: unknown;
};

/** Quoted session totals, in Vibe Coins (2dp, centicentcoin-exact). */
export type MmorpgSessionQuote = {
  /** Dimension row the quote used (echo of the cleaned `gameKind`). */
  gameKind: MmorpgGameKind;
  /** Coins each player pays per minute (0 when hostFree or no players). */
  perPlayerPerMin: number;
  /** Coins each player pays for the whole session. */
  perPlayerTotal: number;
  /** Coins the host pays for the whole session (0 unless hostFree; no rental). */
  hostTotal: number;
  /** Echo of the clamped minutes billed. */
  minutesBilled: number;
  /** Echo of the clamped player count the split used. */
  playersSplit: number;
  /** True when the host sponsors the room (players pay 0). */
  hostFree: boolean;
};

/** One side of a paired ledger movement (shape only, no persistence). */
export type MmorpgLedgerSide = {
  /** Payer or pool account id (player/host/house). */
  accountId: string;
  /** Movement kind: who pays whom, for what. */
  kind: "mmorpg-session-player" | "mmorpg-session-host";
  /** Amount in coins (2dp, centicentcoin-exact). */
  amountCoins: number;
  /** Amount in integer centicentcoins (authoritative for persistence). */
  amountCenticentcoins: number;
  /** Owning session id (echoed for idempotency keys downstream). */
  sessionId: string;
  /** Human-readable memo (never carries balances, keys, or PII). */
  memo: string;
};

/** Balanced ledger pair: debit and credit carry EQUAL amounts. */
export type MmorpgLedgerPair = {
  debit: MmorpgLedgerSide;
  credit: MmorpgLedgerSide;
};

/** House pool credited for every MMORPG session movement. */
export const MMORPG_HOUSE_POOL_ACCOUNT_ID = "platform:mmorpg-pool";

/** Coins -> integer centicentcoins (round-half-up to the smallest unit). */
function toCenticentcoins(coins: number): number {
  return Math.round(coins * MMORPG_CENTICENTCOINS_PER_COIN);
}

/** Integer centicentcoins -> coins (always 2dp-exact). */
function toCoins(centicentcoins: number): number {
  return Math.round(centicentcoins) / MMORPG_CENTICENTCOINS_PER_COIN;
}

/** Fail-open player count: integer in [0, MMORPG_MAX_PLAYERS_PER_SESSION]. */
function cleanPlayerCount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 1) return 0;
  return Math.min(Math.floor(v), MMORPG_MAX_PLAYERS_PER_SESSION);
}

/** Fail-open minutes: whole minutes in [0, MMORPG_MAX_SESSION_MINUTES]. */
function cleanMinutes(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(Math.floor(v), MMORPG_MAX_SESSION_MINUTES);
}

/** Fail-open boolean: only literal `true` sponsors the room. */
function cleanHostFree(value: unknown): boolean {
  return value === true;
}

/** Fail-open account id: trimmed non-empty string, else "". */
function cleanAccountId(value: unknown): string {
  const v = String(value ?? "").trim();
  return v.length > 0 && v.length <= 200 ? v : "";
}

/**
 * Quote one MMORPG session. Pure: no I/O, no ledger reads or writes.
 *
 * Droplet model (one shared $6/mo box, single price for every dimension):
 * - The per-minute room total is ALWAYS `MMORPG_DROPLET_TOTAL_PER_MIN_CC`
 *   (800 grossed-up coins/mo over 43200 min, 25% cut INCLUDED) — `gameKind`
 *   is cleaned and echoed for compat but never changes the price, and the
 *   legacy `serverCostPerMin` / `loadCostPerMin` inputs are ignored.
 * - Players split that total evenly per minute, each share rounded to the
 *   nearest centicentcoin with a floor of 1cc (0.01 coin) so a seat is
 *   never free-by-dust; the session total per player scales linearly.
 * - `hostFree = true` => players pay 0 and the host pays the full droplet
 *   burn for every minute. Otherwise the host pays 0 — there is NO
 *   per-room rental on a shared box.
 * - Zero players => per-player quotes are 0 (no phantom bills); the host
 *   still pays the full burn when hostFree, else 0.
 * - All money math runs in integer centicentcoins; outputs are coins.
 */
export function quoteSession(input: QuoteSessionInput): MmorpgSessionQuote {
  const gameKind = cleanMmorpgGameKind(input.gameKind);
  const playersSplit = cleanPlayerCount(input.playerCount);
  const minutesBilled = cleanMinutes(input.minutesOnServer);
  const hostFree = cleanHostFree(input.hostFree);

  const totalPerMinCc = MMORPG_DROPLET_TOTAL_PER_MIN_CC;

  const perPlayerPerMinCc =
    !hostFree && playersSplit > 0
      ? Math.max(1, Math.round(totalPerMinCc / playersSplit))
      : 0;
  const perPlayerTotalCc = perPlayerPerMinCc * minutesBilled;

  // No per-room rental on a shared box: host pays 0 unless hostFree.
  const hostTotalCc = hostFree ? totalPerMinCc * minutesBilled : 0;

  return {
    gameKind,
    perPlayerPerMin: toCoins(perPlayerPerMinCc),
    perPlayerTotal: toCoins(perPlayerTotalCc),
    hostTotal: toCoins(hostTotalCc),
    minutesBilled,
    playersSplit,
    hostFree,
  };
}

/** Input to {@link splitLedgerEntries}. Everything is fail-open. */
export type SplitLedgerEntriesInput = {
  /** Quote produced by {@link quoteSession}. */
  quote: MmorpgSessionQuote;
  /** Player account ids, in split order (extra ids beyond the split are ignored). */
  playerIds: readonly unknown[];
  /** Host account id. */
  hostId: unknown;
  /** Owning session id (echoed onto every side). */
  sessionId: unknown;
};

/**
 * Turn a session quote into balanced { debit, credit } ledger pairs.
 * Pure shape builder: performs NO DB writes, NO reads, never throws —
 * malformed ids are skipped and zero-amount movements are omitted, so a
 * fully free session simply yields zero pairs.
 *
 * Pairing (amounts always equal within a pair):
 * - Per player (up to `quote.playersSplit`, in `playerIds` order):
 *   debit player `perPlayerTotal`, credit the house pool.
 * - Host: debit host `hostTotal`, credit the house pool.
 * - Amounts echo in both coins and integer centicentcoins; persist the
 *   centicentcoin figure downstream to stay dust-free.
 */
export function splitLedgerEntries(input: SplitLedgerEntriesInput): MmorpgLedgerPair[] {
  const quote = input?.quote;
  if (!quote || typeof quote !== "object") return [];
  const sessionId = cleanAccountId(input.sessionId);
  if (sessionId === "") return [];

  const perPlayerTotalCc = toCenticentcoins(Number(quote.perPlayerTotal));
  const hostTotalCc = toCenticentcoins(Number(quote.hostTotal));
  if (!Number.isFinite(perPlayerTotalCc) || !Number.isFinite(hostTotalCc)) return [];

  const pairs: MmorpgLedgerPair[] = [];
  const playersSplit = Math.min(
    cleanPlayerCount(quote.playersSplit),
    MMORPG_MAX_PLAYERS_PER_SESSION,
  );

  if (perPlayerTotalCc > 0 && playersSplit > 0 && Array.isArray(input.playerIds)) {
    const perPlayerCoins = toCoins(perPlayerTotalCc);
    for (let i = 0; i < playersSplit && i < input.playerIds.length; i++) {
      const accountId = cleanAccountId(input.playerIds[i]);
      if (accountId === "") continue;
      pairs.push({
        debit: {
          accountId,
          kind: "mmorpg-session-player",
          amountCoins: perPlayerCoins,
          amountCenticentcoins: perPlayerTotalCc,
          sessionId,
          memo: `MMORPG session ${sessionId}: player seat ${i + 1}/${playersSplit}`,
        },
        credit: {
          accountId: MMORPG_HOUSE_POOL_ACCOUNT_ID,
          kind: "mmorpg-session-player",
          amountCoins: perPlayerCoins,
          amountCenticentcoins: perPlayerTotalCc,
          sessionId,
          memo: `MMORPG session ${sessionId}: player seat ${i + 1}/${playersSplit}`,
        },
      });
    }
  }

  const hostId = cleanAccountId(input.hostId);
  if (hostTotalCc > 0 && hostId !== "") {
    const hostCoins = toCoins(hostTotalCc);
    pairs.push({
      debit: {
        accountId: hostId,
        kind: "mmorpg-session-host",
        amountCoins: hostCoins,
        amountCenticentcoins: hostTotalCc,
        sessionId,
          memo: `MMORPG session ${sessionId}: host sponsored droplet burn`,
      },
      credit: {
        accountId: MMORPG_HOUSE_POOL_ACCOUNT_ID,
        kind: "mmorpg-session-host",
        amountCoins: hostCoins,
        amountCenticentcoins: hostTotalCc,
        sessionId,
          memo: `MMORPG session ${sessionId}: host sponsored droplet burn`,
      },
    });
  }

  return pairs;
}
