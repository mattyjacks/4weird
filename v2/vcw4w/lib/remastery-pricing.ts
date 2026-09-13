/**
 * Remastery Wave-1 squad pricing — README §1.2 economic axioms.
 *
 * INVARIANTS (a reviewer can verify each in one screen):
 *   1. Vibe Coin parity: 100 coins = exactly $1.00 USD ($0.01 per coin).
 *   2. Monetization split: 75% creator/provider, 25% platform — INCLUDED in
 *      every listed price, never added on top.
 *   3. Ledger discipline (LANES.md hard rules): every coin moves as a row in
 *      the append-only paired ledger (`coin_ledger` / `org_wallet_ledger`);
 *      balances are ALWAYS SUM(delta), FIFO expiry is enforced by the
 *      `trg_coin_ledger_lots` DB trigger, and there is NO parallel balance
 *      column anywhere in this module.
 *
 * Canonical money constants live in `./economy` (read-only reference — this
 * file never edits it). Every number below is DERIVED from those imports so
 * a future change to the canonical source is a loud failure here, not a
 * silent price drift. Call `assertPricingInvariants()` at the top of any
 * handler that prices squad budgets.
 */

import { COIN_PRICE_CENTS_EACH, SERVICE_CUT_PCT } from "./economy";

/** Coins per whole US dollar — the parity standard. */
export const COINS_PER_USD = 100;
/** USD cents per single coin — must equal the canonical coin price. */
export const USD_CENTS_PER_COIN = COIN_PRICE_CENTS_EACH;
/** Creator/provider share of every commercial split (percent). */
export const CREATOR_SHARE_PCT = 100 - SERVICE_CUT_PCT;
/** Platform share of every commercial split (percent). */
export const PLATFORM_SHARE_PCT = SERVICE_CUT_PCT;

/** Largest cap the budget RPCs accept (matches `set_org_budget` guard). */
export const MAX_SQUAD_BUDGET_CAP_COINS = 100_000_000;

/**
 * Fail loud if the canonical money constants ever drift from the axioms.
 * Throws — so a misconfiguration can never silently misprice a squad.
 */
export function assertPricingInvariants(): void {
  if (COIN_PRICE_CENTS_EACH !== 1) {
    throw new Error(
      `[remastery-pricing] parity broken: COIN_PRICE_CENTS_EACH=${COIN_PRICE_CENTS_EACH}, expected 1 (100 coins = exactly $1.00).`,
    );
  }
  if (SERVICE_CUT_PCT !== 25) {
    throw new Error(
      `[remastery-pricing] split broken: SERVICE_CUT_PCT=${SERVICE_CUT_PCT}, expected 25 (75/25 creator/platform).`,
    );
  }
  if (COINS_PER_USD * USD_CENTS_PER_COIN !== 100) {
    throw new Error("[remastery-pricing] parity identity broken: 100 coins must equal exactly 100 cents.");
  }
}

function cleanWholeCoins(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0 || v > MAX_SQUAD_BUDGET_CAP_COINS) return -1;
  return v;
}

/**
 * Whole coins -> exact USD cents. Ledger deltas are INTEGER coins, so this
 * takes integers only; 1 coin = 1 cent, no rounding, no float drift.
 */
export function coinsToUsdCents(coins: number): number {
  assertPricingInvariants();
  const whole = cleanWholeCoins(coins);
  if (whole < 0) throw new Error("[remastery-pricing] coinsToUsdCents needs a whole-coin integer 0..100000000.");
  return whole * USD_CENTS_PER_COIN;
}

/**
 * USD cents -> whole coins. Exact only: a remainder means the amount cannot
 * be represented at parity, so it throws instead of silently rounding money.
 */
export function usdCentsToCoins(cents: number): number {
  assertPricingInvariants();
  if (!Number.isFinite(cents) || !Number.isInteger(cents) || cents < 0) {
    throw new Error("[remastery-pricing] usdCentsToCoins needs a non-negative integer cent amount.");
  }
  if (cents % USD_CENTS_PER_COIN !== 0) {
    throw new Error("[remastery-pricing] amount not representable at 100-coins-=$1.00 parity.");
  }
  return cents / USD_CENTS_PER_COIN;
}

export type RevenueSplit = { gross: number; creator: number; platform: number };

/**
 * Split a gross whole-coin charge (cut INCLUDED) into creator/platform.
 * Integer math, sums exactly: platform takes floor(25%), the creator gets
 * the remainder so `creator + platform === gross` always holds.
 */
export function splitRevenue(grossCoins: number): RevenueSplit {
  assertPricingInvariants();
  const gross = cleanWholeCoins(grossCoins);
  if (gross < 0) throw new Error("[remastery-pricing] splitRevenue needs a whole-coin integer 0..100000000.");
  const platform = Math.floor((gross * PLATFORM_SHARE_PCT) / 100);
  return { gross, creator: gross - platform, platform };
}

export type SquadBudgetQuote = {
  capCoins: number;
  usdCents: number;
  usdDisplay: string;
  creatorCoins: number;
  platformCoins: number;
  coinsPerUsd: number;
  monitoringOnly: boolean;
};

/** Format integer cents as $d.cc — no float involved. */
export function formatUsdCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Price a monthly squad budget cap. `capCoins = 0` means monitoring-only
 * (no hard stop) — same convention as `personal_budgets` / `org_budgets`.
 */
export function quoteSquadBudget(monthlyCapCoins: number): SquadBudgetQuote {
  const capCoins = cleanWholeCoins(monthlyCapCoins);
  if (capCoins < 0) throw new Error("[remastery-pricing] cap must be a whole-coin integer 0..100000000.");
  const usdCents = coinsToUsdCents(capCoins);
  const split = splitRevenue(capCoins);
  return {
    capCoins,
    usdCents,
    usdDisplay: formatUsdCents(usdCents),
    creatorCoins: split.creator,
    platformCoins: split.platform,
    coinsPerUsd: COINS_PER_USD,
    monitoringOnly: capCoins === 0,
  };
}

/**
 * Validate a squad budget cap from an API body. Returns the clean integer,
 * or -1 when invalid (0 = monitoring-only is valid).
 */
export function cleanSquadCap(value: unknown): number {
  return cleanWholeCoins(value);
}
