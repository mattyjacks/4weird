/**
 * Vibe Coins economy constants. Single source of truth for every price,
 * trial, bonus, and fee shown on the site or enforced by the APIs.
 *
 * Buyer math (25% service cut INCLUDED in every price):
 *   - 100 Vibe Coins cost the buyer exactly $1.00 ($0.01 per coin).
 *   - Of that $1.00, $0.25 is the platform service cut and $0.75 is coin value.
 *   - The 100-coin signup trial is therefore a $1.00 welcome gift.
 */

export const COIN_PRICE_CENTS_EACH = 1;
export const SERVICE_CUT_PCT = 25;
export const TRIAL_COINS_DEFAULT = 100;
export const TRIAL_COINS_MAX = 100;

/** Fixed packs for sale. There is intentionally NO 100-coin pack: 100 coins is the free trial. */
export type CoinPack = { key: string; coins: number; priceCents: number; blurb: string };
export const COIN_PACKS: CoinPack[] = [
  { key: "500", coins: 500, priceCents: 500, blurb: "Starter stash" },
  { key: "1500", coins: 1500, priceCents: 1500, blurb: "Weekend warrior" },
  { key: "5000", coins: 5000, priceCents: 5000, blurb: "Creator fuel" },
  { key: "25000", coins: 25000, priceCents: 25000, blurb: "Whale pod" },
];

/** Custom amounts: any whole-coin count from 500 up, at $0.01 per coin. */
export const CUSTOM_COINS_MIN = 500;
export const CUSTOM_COINS_MAX = 100000;

export function packPriceCents(coins: number): number {
  return Math.round(coins * COIN_PRICE_CENTS_EACH);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Whole-coin custom amount validation (mirrors the edge-function floor/cap). */
export function isCustomAmount(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < CUSTOM_COINS_MIN || v > CUSTOM_COINS_MAX) return 0;
  return v;
}

/** Daily login bonus: 5 coins + 1 per consecutive day, capped at 12. */
export function dailyBonusForStreak(streakDays: number): number {
  return Math.max(5, Math.min(5 + Math.max(0, streakDays - 1), 12));
}

/** Referral rewards, each side. */
export const REFERRAL_INVITER_COINS = 25;
export const REFERRAL_INVITEE_COINS = 25;

/** Referral codes are 8 uppercase alphanumerics, minted server-side (see migration). */
export function isReferralCode(value: unknown): string {
  const v = String(value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(v) ? v : "";
}
