/**
 * Clan server-cost card. Single source of truth for every clan fee, upkeep
 * rate, and revenue rate. The SQL migration mirrors these formulas
 * (meter_clan_posting_fee / accrue_clan_upkeep / credit_clan_channel_revenue);
 * keep both sides in sync when rates change.
 *
 * Money rule (same everywhere on 4weird): prices are GROSS with the 25%
 * platform cut INCLUDED, never added on top. Revenue (ads/affiliate/funding)
 * carries no cut; it is income, not a purchase.
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

// ---------------------------------------------------------------------------
// Per-minute server upkeep (billed every minute at :00 by /api/cron/clan-upkeep
// via accrue_clan_minute_upkeep(); this file mirrors the SQL rate card).
// A 5-member clan with 2 MB of images + 200 KB of text costs ~0.0002/min
// (~0.26 coins/day); extremely minimal for small clans; big active clans pay
// linearly for what they actually store, transfer, and moderate.
// ---------------------------------------------------------------------------

/** Base server postulant per minute (the clan's share of the box). */
export const CLAN_PER_MIN_BASE_COINS = 0.00003;
/** Per member per minute. */
export const CLAN_PER_MIN_PER_MEMBER_COINS = 0.000004;
/** Per stored image MB per minute. */
export const CLAN_PER_MIN_PER_IMAGE_MB_COINS = 0.000008;
/** Per database KB (posts + comments + messages text) per minute. */
export const CLAN_PER_MIN_PER_DB_KB_COINS = 0.0000008;
/** Per transferred KB (measured page/image/api bytes); billed as used. */
export const CLAN_PER_KB_BANDWIDTH_COINS = 0.000002;
/** Luna AI moderation (OpenAI GPT 5.6 Luna) per text check. */
export const CLAN_LUNA_CHECK_COINS = 0.015;

export type ClanMinuteBreakdown = {
  server: number;
  members: number;
  images: number;
  database: number;
};

/** Per-minute upkeep from live usage. Mirrors clan_minute_rate(). */
export function clanMinuteRate(input: {
  members: number;
  imageMb: number;
  dbKb: number;
}): { perMinute: number; perDay: number; breakdown: ClanMinuteBreakdown } {
  const server = CLAN_PER_MIN_BASE_COINS;
  const members = Math.max(0, input.members) * CLAN_PER_MIN_PER_MEMBER_COINS;
  const images = Math.max(0, input.imageMb) * CLAN_PER_MIN_PER_IMAGE_MB_COINS;
  const database = Math.max(0, input.dbKb) * CLAN_PER_MIN_PER_DB_KB_COINS;
  const perMinute = server + members + images + database;
  return {
    perMinute,
    perDay: Math.round(perMinute * 1440 * 10000) / 10000,
    breakdown: { server, members, images, database },
  };
}

/** Bandwidth cost for measured transfer. */
export function clanBandwidthCost(bytesOut: number): number {
  return Math.max(0, bytesOut) / 1024 * CLAN_PER_KB_BANDWIDTH_COINS;
}

export const CLAN_COST_NOTE =
  "Clan server fees are linear in measured usage (per-KB + image surcharge, " +
  "min 1 centicentcoin) with the 25% platform cut included; never on top. " +
  "Wallets pay per-minute upkeep (billed every minute at :00) covering stored " +
  "images, database bytes, measured bandwidth, Luna AI moderation, and base " +
  "server share; house-ad views and affiliate clicks earn revenue " +
  "that offsets it. The creator funds the wallet and any member can donate.";

// ---------------------------------------------------------------------------
// Big communities + Clan Support commons. Single source of truth for the
// scale caps, pruning thresholds, headroom prices, supporter tiers, and the
// tribute math. The SQL migration mirrors these numbers
// (org_member_cap / clan_member_cap / prune settings / buy_*_headroom /
// clan_supporter_tier / run_clan_tribute_sweep); keep both sides in sync
// when prices change - and update LICENSE alongside pricing, always.
// ---------------------------------------------------------------------------

/** Hosted orgs hold this many members (+ prepaid headroom). */
export const ORG_MEMBER_BASE_CAP = 10000;
/** Self-hosted orgs are capped by purchased seats instead - no 10k rule. */
export const ORG_SELF_HOST_CAP_BY_SEATS = true;
/** Clans hold this many members (+ prepaid headroom). */
export const CLAN_MEMBER_BASE_CAP = 100000;

/** Automated pruning arms here (opt-in for orgs, on-by-default for clans). */
export const ORG_PRUNE_THRESHOLD = 9000;
export const CLAN_PRUNE_THRESHOLD = 90000;

/** Paid headroom: flat, simple, 25% cut included. */
export const ORG_HEADROOM_COINS_PER_100_SLOTS = 10;
export const CLAN_HEADROOM_COINS_PER_1000_SLOTS = 10;

/** Pruning strategies, in plain words. */
export const PRUNE_STRATEGIES = [
  "oldest_activity_first",
  "random_chance",
  "oldest_joined_first",
  "never_contributed",
] as const;
export type PruneStrategy = (typeof PRUNE_STRATEGIES)[number];

/** Clan Supporter Status tiers: exact lifetime donated coins → badge. */
export const SUPPORTER_TIERS = [
  { tier: "Ember", minCoins: 1 },
  { tier: "Spark", minCoins: 25 },
  { tier: "Beacon", minCoins: 100 },
  { tier: "Patron", minCoins: 500 },
  { tier: "Legend", minCoins: 2500 },
] as const;

/** Tribute commons, simplified to four numbers. */
export const TRIBUTE_AGE_MONTHS = 6;
export const GLOBALIZE_AGE_MONTHS = 12;
export const TRIBUTE_LIFETIME_CAP_PCT = 50;
export const TRIBUTE_DAILY_RATE_PCT = 1;

/** ~69-day half-life from the 1%/day exponential decay. */
export function tributeHalfLifeDays(): number {
  return Math.round((Math.LN2 / (TRIBUTE_DAILY_RATE_PCT / 100)) * 10) / 10;
}

/** Price a headroom purchase (gross coins, 25% cut included). */
export function orgHeadroomPrice(slots: number): number {
  return Math.round((Math.max(0, slots) / 100) * ORG_HEADROOM_COINS_PER_100_SLOTS * 100) / 100;
}

/** Price a clan headroom purchase (gross coins, 25% cut included). */
export function clanHeadroomPrice(slots: number): number {
  return Math.round((Math.max(0, slots) / 1000) * CLAN_HEADROOM_COINS_PER_1000_SLOTS * 100) / 100;
}
