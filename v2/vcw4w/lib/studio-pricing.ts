/**
 * Studio cloud-render metering — Remastery Wave-3 economy slice
 * (README §1.2 economic axioms + §7.3 studio metering).
 *
 * INVARIANTS (a reviewer can verify each in one screen):
 *   1. Vibe Coin parity: 100 coins = exactly $1.00 USD ($0.01 per coin).
 *      Every rate below is an INTEGER number of coins, derived from the
 *      canonical `./economy` constants — never a float price, never a
 *      parallel balance column.
 *   2. Monetization split: 75% creator/provider, 25% platform — INCLUDED in
 *      every quoted price, never added on top (`splitRevenue` guarantees
 *      `creator + platform === gross` with integer math).
 *   3. Ledger discipline: this module never moves coins. Quotes are pure
 *      functions over timeline seconds + preset; any actual charge must flow
 *      through the append-only paired ledger (`coin_ledger` /
 *      `org_wallet_ledger`) via a QUEUE-requested mutation, never from here.
 *   4. Fail-open estimates: an unknown preset string falls back to the
 *      default preset and flags `estimated: true` instead of throwing, so a
 *      dead AI/metadata service never bricks the quote surface. (A nonsense
 *      timeline length is caller error and still throws — same convention as
 *      `./remastery-pricing`.)
 *   5. SSR-safe: no browser APIs, no `window`/`document`/`localStorage` —
 *      pure arithmetic, importable from server routes and client components
 *      alike with zero hydration risk.
 */

import { COIN_PRICE_CENTS_EACH, SERVICE_CUT_PCT } from "./economy";
import {
  assertPricingInvariants,
  COINS_PER_USD,
  formatUsdCents,
  MAX_SQUAD_BUDGET_CAP_COINS,
  splitRevenue,
} from "./remastery-pricing";

/** Coins charged per timeline second, by render preset. Integers only. */
export const STUDIO_RENDER_COINS_PER_SECOND = {
  "480p30": 1,
  "720p30": 2,
  "720p60": 3,
  "1080p30": 3,
  "1080p60": 5,
  "4k30": 10,
  "4k60": 15,
} as const;

export type StudioRenderPreset = keyof typeof STUDIO_RENDER_COINS_PER_SECOND;

/** Unknown presets fall back here (fail-open) instead of throwing. */
export const DEFAULT_STUDIO_RENDER_PRESET: StudioRenderPreset = "1080p30";

/** Longest single timeline quotable in one call (4h of footage). */
export const MAX_STUDIO_RENDER_SECONDS = 14_400;

export type StudioRenderQuote = {
  seconds: number;
  preset: StudioRenderPreset;
  /** True when the requested preset was unknown and the default was used. */
  estimated: boolean;
  coins: number;
  usdCents: number;
  usdEquivalent: string;
  creatorCoins: number;
  platformCoins: number;
  coinsPerUsd: number;
};

/**
 * Fail loud if the canonical money constants ever drift from the axioms.
 * Delegates to the remastery-pricing guard so every quote path enforces the
 * same parity/split standard from a single assertion site.
 */
export function assertStudioPricingInvariants(): void {
  assertPricingInvariants();
  if (COIN_PRICE_CENTS_EACH !== 1) {
    throw new Error(
      `[studio-pricing] parity broken: COIN_PRICE_CENTS_EACH=${COIN_PRICE_CENTS_EACH}, expected 1 (100 coins = exactly $1.00).`,
    );
  }
  if (SERVICE_CUT_PCT !== 25) {
    throw new Error(
      `[studio-pricing] split broken: SERVICE_CUT_PCT=${SERVICE_CUT_PCT}, expected 25 (75/25 creator/platform).`,
    );
  }
}

function cleanRenderSeconds(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || !Number.isInteger(v) || v < 1 || v > MAX_STUDIO_RENDER_SECONDS) return -1;
  return v;
}

/**
 * Validate a timeline length from an API body. Returns the clean integer
 * seconds, or -1 when invalid (caller maps -1 to a 400, mirroring
 * `cleanSquadCap` in `./remastery-pricing`).
 */
export function cleanStudioRenderSeconds(value: unknown): number {
  return cleanRenderSeconds(value);
}

/**
 * Normalize a preset string. Unknown/empty values fall back to the default
 * preset and report `estimated: true` — fail-open, never throws.
 */
export function normalizeStudioPreset(value: unknown): { preset: StudioRenderPreset; estimated: boolean } {
  const key = String(value ?? "").trim();
  if ((Object.keys(STUDIO_RENDER_COINS_PER_SECOND) as string[]).includes(key)) {
    return { preset: key as StudioRenderPreset, estimated: false };
  }
  return { preset: DEFAULT_STUDIO_RENDER_PRESET, estimated: true };
}

/**
 * Quote a cloud render: timeline seconds × preset rate, in whole coins.
 * Pure function — reads no tables, writes nothing; the charge itself (if the
 * user accepts) must move through the paired ledger via a QUEUE-requested
 * mutation, never from this module.
 */
export function quoteStudioRender(secondsValue: unknown, presetValue: unknown = DEFAULT_STUDIO_RENDER_PRESET): StudioRenderQuote {
  assertStudioPricingInvariants();
  const seconds = cleanRenderSeconds(secondsValue);
  if (seconds < 0) {
    throw new Error(
      `[studio-pricing] seconds must be a whole-second integer 1..${MAX_STUDIO_RENDER_SECONDS}.`,
    );
  }
  const { preset, estimated } = normalizeStudioPreset(presetValue);
  const coins = seconds * STUDIO_RENDER_COINS_PER_SECOND[preset];
  if (!Number.isInteger(coins) || coins < 0 || coins > MAX_SQUAD_BUDGET_CAP_COINS) {
    throw new Error("[studio-pricing] quote exceeds the squad budget cap — split the timeline.");
  }
  const split = splitRevenue(coins);
  const usdCents = coins * COIN_PRICE_CENTS_EACH;
  return {
    seconds,
    preset,
    estimated,
    coins,
    usdCents,
    usdEquivalent: formatUsdCents(usdCents),
    creatorCoins: split.creator,
    platformCoins: split.platform,
    coinsPerUsd: COINS_PER_USD,
  };
}
