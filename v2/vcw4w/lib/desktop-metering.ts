/**
 * Desktop metering quotes (DS-OCT-06).
 *
 * Read-only coin math for virtual-desktop compute: seconds x class rate
 * -> vibe coins, with the CLASSICS parity (100 coins = exactly $1.00 USD)
 * and the 75/25 creator/platform split mirrored from
 * `formatCoinsQuote` in app/terminal/page.tsx.
 *
 * QUOTE ONLY — this module never touches coin/ledger tables, never imports
 * lib/economy.ts, and performs no debit. The real guarded debit RPC is
 * economy-lane owned (see the QUEUE.md request filed with this envelope).
 * Spend-link builders below point at the MCP/API path as deep-links/notes;
 * following them performs no write from this module.
 */

export const COINS_PER_DOLLAR = 100;
export const CREATOR_SHARE = 0.75;
export const PLATFORM_SHARE = 0.25;

/** Desktop classes billable by the metering quote endpoint. */
export type DesktopClass = "cpu" | "standard" | "gpu" | "pro";

/** Quote-only rate table: vibe coins per minute of wall-clock compute. */
export const DESKTOP_COIN_RATES_PER_MIN: Record<DesktopClass, number> = {
  cpu: 1,
  standard: 2,
  gpu: 5,
  pro: 8,
};

export const DESKTOP_CLASSES = Object.keys(
  DESKTOP_COIN_RATES_PER_MIN,
) as DesktopClass[];

export function isDesktopClass(value: unknown): value is DesktopClass {
  return (
    typeof value === "string" &&
    (value as string) in DESKTOP_COIN_RATES_PER_MIN
  );
}

/** Cap quotes at 30 days of seconds so a typo cannot mint absurd numbers. */
export const MAX_QUOTE_SECONDS = 30 * 24 * 60 * 60;

export interface DesktopQuote {
  seconds: number;
  class: DesktopClass;
  rateCoinsPerMin: number;
  coins: number;
  /** USD value of `coins` at 100 coins = $1 (rounded to cents). */
  usd: number;
  split: { creator: number; platform: number };
}

/**
 * Pure quote math: seconds x class rate -> integer coins, USD at 100=$1,
 * 75/25 split (creator floors, platform takes the remainder so the parts
 * always sum to the whole — same convention as formatCoinsQuote).
 *
 * Throws RangeError on invalid input (non-integer/negative/over-cap
 * seconds, unknown class) so routes can map it to a 400.
 */
export function quoteDesktopSeconds(
  seconds: number,
  desktopClass: DesktopClass,
): DesktopQuote {
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new RangeError("seconds must be a non-negative integer.");
  }
  if (seconds > MAX_QUOTE_SECONDS) {
    throw new RangeError(`seconds exceeds the ${MAX_QUOTE_SECONDS}s quote cap.`);
  }
  if (!isDesktopClass(desktopClass)) {
    throw new RangeError(`unknown desktop class: ${String(desktopClass)}.`);
  }
  const rateCoinsPerMin = DESKTOP_COIN_RATES_PER_MIN[desktopClass];
  const coins = Math.ceil((seconds * rateCoinsPerMin) / 60);
  const usd = Math.round((coins / COINS_PER_DOLLAR) * 100) / 100;
  const creator = Math.floor(coins * CREATOR_SHARE);
  const platform = coins - creator;
  return { seconds, class: desktopClass, rateCoinsPerMin, coins, usd, split: { creator, platform } };
}

/**
 * CLASSICS coin language for a quote, mirroring formatCoinsQuote in
 * app/terminal/page.tsx: "<n> coins = $X.XX USD (100 coins = $1) — 75/25
 * split: <c> creator / <p> platform".
 */
export function formatDesktopQuote(quote: DesktopQuote): string {
  return (
    `${quote.coins} coins = $${quote.usd.toFixed(2)} USD (100 coins = $1) — ` +
    `75/25 split: ${quote.split.creator} creator / ${quote.split.platform} platform`
  );
}

/**
 * Spend-link builder (deep-link only, NO debit here).
 *
 * Returns the API path a client should call to actually spend the quoted
 * coins once the economy lane ships the guarded debit RPC, plus the MCP
 * tool path for agent callers. Both are plain strings — building them
 * performs no fetch, no ledger write, and logs no balance.
 */
export function buildDesktopSpendLink(quote: DesktopQuote): {
  apiPath: string;
  mcpPath: string;
  note: string;
} {
  const memo = `desktop:${quote.class}:${quote.seconds}s`;
  return {
    apiPath:
      `/api/coins/spend?coins=${quote.coins}` +
      `&memo=${encodeURIComponent(memo)}`,
    mcpPath: `desktop.meter_spend { "coins": ${quote.coins}, "memo": "${memo}" }`,
    note:
      "Quote only — no coins moved. Actual debit awaits the economy-lane " +
      "guarded RPC (QUEUED); do not invent ledger writes here.",
  };
}
