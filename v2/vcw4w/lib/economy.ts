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

/**
 * Centicentcoins: Fractional Vibe Coins.
 * 1 Vibe Coin = 1 cent = 100 centicentcoins.
 * 1 centicentcoin (plural: centicentcoins) = 0.01 coins = 0.01 cents = $0.0001 USD.
 */
export const CENTICENTCOINS_PER_COIN = 100;
export const MIN_SPENDABLE_COINS = 0.01;
export const CENTICENTCOIN_USD = 0.0001;

export const SERVICE_CUT_PCT = 25;
/**
 * UnitUnite workspace compute cut: every workspace-metered cloud charge
 * splits 25% platform / 75% provider, INCLUDED in the listed price.
 * Same rate as SERVICE_CUT_PCT by design — one rule everywhere — but scoped
 * per individual workspace so each team's ledger shows its own cut.
 */
export const WORKSPACE_COMPUTE_CUT_PCT = 25;
/**
 * Game AI compute cut: games that require or optionally use AI (OpenAI
 * dialogue bots, AI directors, rented RunPods, inference APIs, Gaming
 * Buddy) meter with the same 25% cut INCLUDED in the listed price.
 * Same rate as SERVICE_CUT_PCT by design — one rule everywhere — but scoped
 * per game + feature kind so /my/usage can attribute every cent.
 */
export const GAME_AI_COMPUTE_CUT_PCT = 25;
/**
 * Clan compute cut: per-post/comment server-cost fees split 25% platform /
 * 75% clan wallet, INCLUDED in the listed fee. Same rate as SERVICE_CUT_PCT
 * by design — one rule everywhere — but scoped per clan so each clan's
 * ledger shows its own cut.
 */
export const CLAN_COMPUTE_CUT_PCT = 25;
export const TRIAL_COINS_DEFAULT = 100;
export const TRIAL_COINS_MAX = 100;

/** Alpha Tester launch gift: 300 coins ($3.00), one per account. */
export const ALPHA_TESTER_COINS = 300;
/** Alpha Tester pool cap: at most this many coins given away in total. */
export const ALPHA_TESTER_TOTAL_CAP_COINS = 10000;

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

/**
 * Refund window: only the UNSPENT remainder of PURCHASED lots (paid
 * VIBE-COINS-* packs, never free grants) bought within this many days can
 * be refunded. Partially-spent lots refund pro-rata for the remainder, and
 * the lot row is marked refunded (refunded_coins + refunded_at).
 */
export const COIN_REFUND_WINDOW_DAYS = 90;
/** Minimum refundable amount: 0.01 coins (1 centicentcoin). */
export const COIN_REFUND_MIN_COINS = 0.01;

export function packPriceCents(coins: number): number {
  return Math.round(coins * COIN_PRICE_CENTS_EACH);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Formats USD with fractional cent / centicentcoin precision ($0.0001) if present. */
export function formatUsdAccurate(usd: number): string {
  const rounded4 = Math.round(usd * 10000) / 10000;
  if (rounded4 % 0.01 === 0) {
    return `$${rounded4.toFixed(2)}`;
  }
  return `$${rounded4.toFixed(4)}`;
}

/** Convert whole or fractional Vibe Coins to integer centicentcoins (1 coin = 100 centicentcoins). */
export function coinsToCenticentcoins(coins: number): number {
  return Math.round(coins * CENTICENTCOINS_PER_COIN);
}

/** Convert integer centicentcoins to Vibe Coins (100 centicentcoins = 1 coin). */
export function centicentcoinsToCoins(centicentcoins: number): number {
  return Math.round(centicentcoins) / CENTICENTCOINS_PER_COIN;
}

/** Format coin balance nicely: integer if whole, or up to 2 decimal places if fractional. */
export function formatCoinBalance(coins: number): string {
  const rounded = Math.round(coins * 100) / 100;
  if (Number.isInteger(rounded)) return rounded.toLocaleString();
  return rounded.toFixed(2);
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

/**
 * Self-Hosted BYOK plan: flat platform subscription plus a reduced metered
 * premium on the customer's own at-cost provider bills (keys stay with them).
 */
export const SELF_HOSTED_MONTHLY_CENTS = 42000;
export const SELF_HOSTED_COMPUTE_CUT_PCT = 15;

/** Split a workspace compute charge (gross, cut INCLUDED) into platform/provider. */
export function workspaceComputeSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(0, Math.round(grossCoins * 100) / 100);
  const cut = Math.round((gross * WORKSPACE_COMPUTE_CUT_PCT)) / 100;
  const provider = Math.round((gross - cut) * 100) / 100;
  return { gross, cut, provider };
}

/** Split a game-AI compute charge (gross, cut INCLUDED) into platform/provider. */
export function gameAiComputeSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(0, Math.round(grossCoins * 100) / 100);
  const cut = Math.round((gross * GAME_AI_COMPUTE_CUT_PCT)) / 100;
  const provider = Math.round((gross - cut) * 100) / 100;
  return { gross, cut, provider };
}

/** Split a clan server-cost fee (gross, cut INCLUDED) into platform/clan-wallet. */
export function clanComputeSplit(grossCoins: number): { gross: number; cut: number; wallet: number } {
  const gross = Math.max(0, Math.round(grossCoins * 100) / 100);
  const cut = Math.round((gross * CLAN_COMPUTE_CUT_PCT)) / 100;
  const wallet = Math.round((gross - cut) * 100) / 100;
  return { gross, cut, wallet };
}

/** Referral codes are 8 uppercase alphanumerics, minted server-side (see migration). */
export function isReferralCode(value: unknown): string {
  const v = String(value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(v) ? v : "";
}

/* ---------------------------------------------------------------------------
 * Player-spend fairness rules (cosmetics + dev charges). Single source of
 * truth — the cosmetics catalog, dev-charge validator, and SQL RPCs all
 * enforce the same numbers:
 * - Cosmetics are looks-only and cost 10 coins each, everywhere in the app.
 * - NOTHING purchasable may help win a multiplayer game (no pay-to-win).
 *   Singleplayer boosts are allowed, clearly labelled.
 * - No single purchase may exceed 10,000 coins, and devs may not take more
 *   than 1,000 coins/day from one player per game without a fresh consent.
 * - Guidance for devs: ~100 coins for deliberate buys, ~10 for automatic ones.
 * ------------------------------------------------------------------------- */

/** Every cosmetic item costs exactly this (looks-only, unified shop). */
export const COSMETIC_PRICE_COINS = 10;
/** Hard ceiling for any single player purchase (cosmetic or boost). */
export const MAX_SINGLE_PURCHASE_COINS = 10000;
/** Per-game, per-player, per-day ceiling on dev-initiated charges. */
export const DEV_GAME_DAILY_CAP_COINS = 1000;
/** Pricing guidance for game devs: deliberate player-confirmed actions. */
export const DEV_PRICE_GUIDE_DELIBERATE_COINS = 100;
/** Pricing guidance for game devs: automatic/background charges. */
export const DEV_PRICE_GUIDE_AUTOMATIC_COINS = 10;

/** What player money may buy. "multiplayer-boost" is banned, never sold. */
export const PURCHASE_CATEGORIES = ["cosmetic", "singleplayer-boost", "multiplayer-boost"] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

/** Categories the shop will ever sell (multiplayer-boost excluded on purpose). */
export const SELLABLE_CATEGORIES: readonly PurchaseCategory[] = ["cosmetic", "singleplayer-boost"];

export function isSellableCategory(value: unknown): value is "cosmetic" | "singleplayer-boost" {
  return value === "cosmetic" || value === "singleplayer-boost";
}

/** Validate any single purchase amount: positive, 2dp, within the 10k cap. */
export function cleanPurchaseAmount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0 || v > MAX_SINGLE_PURCHASE_COINS) return 0;
  return Math.round(v * 100) / 100;
}
