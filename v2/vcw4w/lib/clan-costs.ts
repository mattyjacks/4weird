/**
 * Clan server-cost card. Single source of truth for every clan fee, upkeep
 * rate, and revenue rate. The SQL migration mirrors these formulas
 * (meter_clan_posting_fee / accrue_clan_upkeep / credit_clan_channel_revenue);
 * keep both sides in sync when rates change.
 *
 * Money rule (same everywhere on 4weird): prices are GROSS with the 25%
 * platform cut INCLUDED, never added on top. Revenue (ads/affiliate/funding)
 * carries no cut — it is income, not a purchase.
 */

import { CLAN_COMPUTE_CUT_PCT } from "@/lib/economy";

export { CLAN_COMPUTE_CUT_PCT };

/** Minimum server-cost fee per post/comment: 1 centicentcoin = 0.01 coins. */
export const CLAN_MIN_POST_FEE_COINS = 0.01;
/** Per started KB of body text. */
export const CLAN_FEE_PER_KB_COINS = 0.01;
/** Surcharge when a post carries an image (storage + bandwidth proxy). */
export const CLAN_IMAGE_SURCHARGE_COINS = 0.05;

/** Linear per-post/comment fee. Mirrors meter_clan_posting_fee(). */
export function clanPostingFee(bytes: number, hasImage: boolean): number {
  const kb = Math.ceil(Math.max(0, bytes) / 1024);
  const fee = kb * CLAN_FEE_PER_KB_COINS + (hasImage ? CLAN_IMAGE_SURCHARGE_COINS : 0);
  return Math.max(CLAN_MIN_POST_FEE_COINS, Math.round(fee * 100) / 100);
}

/** Split a clan fee gross into platform cut + clan-wallet share. */
export function clanFeeSplit(grossCoins: number): { gross: number; cut: number; wallet: number } {
  const gross = Math.max(0, Math.round(grossCoins * 100) / 100);
  const cut = Math.round((gross * CLAN_COMPUTE_CUT_PCT) / 100 * 100) / 100;
  return { gross, cut, wallet: Math.round((gross - cut) * 100) / 100 };
}

/** Daily upkeep building blocks (linear in members + stored image MB). */
export const CLAN_UPKEEP_BASE_COINS = 0.05;
export const CLAN_UPKEEP_PER_MEMBER_COINS = 0.01;
export const CLAN_UPKEEP_PER_IMAGE_MB_COINS = 0.02;
export const CLAN_UPKEEP_MAX_DAILY_COINS = 25;
export const CLAN_UPKEEP_GRACE_DAYS = 14;

/** Linear daily upkeep. Mirrors accrue_clan_upkeep(). */
export function clanDailyUpkeep(members: number, imageMb: number): number {
  const raw =
    CLAN_UPKEEP_BASE_COINS +
    Math.max(0, members) * CLAN_UPKEEP_PER_MEMBER_COINS +
    Math.max(0, imageMb) * CLAN_UPKEEP_PER_IMAGE_MB_COINS;
  return Math.min(CLAN_UPKEEP_MAX_DAILY_COINS, Math.round(raw * 100) / 100);
}

/** Wallet runway status from balance + daily rate. */
export function clanUpkeepStatus(
  wallet: number,
  daily: number,
): "healthy" | "low" | "delinquent" {
  if (wallet <= 0) return "delinquent";
  if (wallet < daily * 7) return "low";
  return "healthy";
}

/** Published revenue rates (credited 1:1 to the clan wallet, no cut). */
export const CLAN_AD_VIEW_COINS = 0.01;
export const CLAN_AFFILIATE_CLICK_COINS = 0.05;

export const CLAN_COST_NOTE =
  "Clan server fees are linear in measured usage (per-KB + image surcharge, " +
  "min 1 centicentcoin) with the 25% platform cut included — never on top. " +
  "Wallets pay daily upkeep; house-ad views and affiliate clicks earn revenue " +
  "that offsets it.";
