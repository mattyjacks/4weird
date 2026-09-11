/**
 * 👑 Crowns (earn) vs 🪙 Coins (spend). Single source of truth for the split.
 *
 * Coins: bought / granted / metered. Spend on-site only. Never payout-eligible.
 * Crowns: minted ONLY from gifted Coins net (support tips/subs, launch backing
 *   creator-direct, compute escrow provider share). Cannot be bought, sent, or
 *   gifted. Two exits, both from ELIGIBLE (30-day unlocked, unexpired) lots:
 *   (a) fiat payout via a licensed provider after KYC (min 5000),
 *   (b) 1:1 convert to own Coins for on-site spend (min 1, no fee).
 *   Converted Coins are ordinary spend Coins with a fresh 1-year expiry.
 *
 * Cash math: the 25% platform cut was already taken when Coins were gifted,
 * so 100 Crowns = $1.00 payout value (1 Crown = 1 cent), and
 * 100 Crowns = 100 Coins on convert (no second cut, no premium).
 */

export const CROWN_USD_CENTS_EACH = 1;
export const CROWN_UNLOCK_DAYS = 30;
export const CROWN_CHARGEBACK_WINDOW_DAYS = 90;
export const CROWN_EXPIRY_DAYS = 365;
export const CROWN_PAYOUT_MIN = 5000;
export const CROWN_PAYOUT_MAX = 1000000;
export const CROWN_CONVERT_MIN = 1;
export const CROWN_CONVERT_MAX = 1000000;

export function crownPayoutUsdCents(crowns: number): number {
  return Math.round(crowns * CROWN_USD_CENTS_EACH);
}

export function isPayoutAmount(value: unknown): number {
  const v = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(v) || v < CROWN_PAYOUT_MIN || v > CROWN_PAYOUT_MAX) return 0;
  return v;
}

export function isConvertAmount(value: unknown): number {
  const v = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(v) || v < CROWN_CONVERT_MIN || v > CROWN_CONVERT_MAX) return 0;
  return v;
}

export const CROWN_VS_COIN_COPY = {
  coins: "🪙 Coins (spend): buy, play, rent, tip. No cash value, never cash-out.",
  crowns:
    "👑 Crowns (earn): creator earnings from gifts. Time-locked 30 days. Cash out in fiat via our payout provider (5000+), or convert 1:1 to your own Coins anytime (1+).",
} as const;
