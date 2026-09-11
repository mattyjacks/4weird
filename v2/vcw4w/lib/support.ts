/**
 * Voluntary Support + Launch campaigns. Single source of truth for the
 * Patreon-style (subscriptions + tips to verified creators and clans) and
 * GoFundMe-style (gift-based game/startup launch fundraising) surfaces.
 *
 * LEGAL MODEL — closed-loop Vibe Coins only:
 *  - 25% platform cut INCLUDED in every gross amount, never on top.
 *  - Coins have no cash value and cannot be cashed out; recipients get
 *    platform credits spendable on the Service only.
 *  - Nothing here is charitable: no tax deduction, no charitable
 *    solicitation. Campaign categories are creative projects only.
 *  - Perks / campaign rewards are aspirational goals, not contractual
 *    obligations. Supporters can cancel subscriptions anytime; completed
 *    transfers are final except in proven fraud.
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

export const SUPPORT_CUT_PCT = SERVICE_CUT_PCT;

export const SUPPORT_MIN_COINS = 1;
export const SUPPORT_MAX_COINS = 100000;
export const SUPPORT_TIER_MIN_COINS = 1;
export const SUPPORT_TIER_MAX_COINS = 100000;
export const SUPPORT_PERIOD_DAYS = 30;

export const LAUNCH_CATEGORIES = ["game-launch", "startup", "creative-tech"] as const;
export type LaunchCategory = (typeof LAUNCH_CATEGORIES)[number];

export const LAUNCH_CATEGORY_META: Record<LaunchCategory, { label: string; blurb: string }> = {
  "game-launch": { label: "Game launch", blurb: "Fund a game's launch: art, servers, polish." },
  startup: { label: "Tech startup", blurb: "Fund a tech startup's first build or launch." },
  "creative-tech": { label: "Creative tech", blurb: "Tools, mods, engines, and weird experiments." },
};

export const LAUNCH_GOAL_MIN_COINS = 50;
export const LAUNCH_GOAL_MAX_COINS = 1000000;
export const LAUNCH_TITLE_MIN = 4;
export const LAUNCH_TITLE_MAX = 120;
export const LAUNCH_STORY_MIN = 20;
export const LAUNCH_STORY_MAX = 5000;

/**
 * Fundraisers are DISABLED for now while we work out the legal side —
 * regulations and compliance for handling money between parties,
 * especially internationally, is a lot of work and not settled yet.
 *
 * The code paths below are intentionally left working (APIs, RPCs,
 * browser/detail components) so re-enabling is a one-line flip once
 * compliance is sorted. The UI gates on this flag: listing stays
 * readable, but launching / backing / closing is disabled.
 */
export const FUNDRAISERS_ENABLED = false;

export const FUNDRAISERS_DISABLED_NOTICE =
  "Fundraisers are paused while we work out the regulations and compliance for handling money between parties — especially internationally. Moving funds between backers, creators, and clans across borders means money-transmitter rules, tax reporting, payouts, refunds, and fraud handling, and that is a lot of work to get right. Launching, backing, and closing campaigns are disabled for now, but the code is still in place and will return once the legal path is clear.";

export const FUNDRAISERS_COMPLIANCE_NOTE =
  "We are still working out how to handle the money between parties compliantly — who holds funds, when they release, how refunds and disputes work, and what changes country by country. Until that is settled, fundraisers stay disabled.";

/**
 * Currency emoji legend — one emoji, one meaning, everywhere:
 * - 💸 Real Money — actual fiat / cash references only. Never use 🪙 for this.
 * - 👻 Ghost Cash — hypothetical org-work IOU unit. Ghost emoji ONLY, never
 *   paired with a cash emoji. No value, no cash-out, timer books only.
 * - 🪙 Coin (Vibe Coins) — closed-loop platform credits. 100 🪙 = $1.00.
 * - 💌 Love Letters — a /clans/ community currency earned from likes and
 *   other engagement: post in a clan, a human sees it and gives it a love
 *   letter, and letters accumulate on your account. They can be spent on
 *   advanced awards for posts and users. Love Letters can NEVER be mingled
 *   with or transferred into 🪙 coins — the two ledgers stay separate, and
 *   the only way to earn a letter is a human giving one to your post.
 */
export const CURRENCY_LEGEND = [
  {
    emoji: "💸",
    name: "Real Money",
    blurb: "Actual fiat / cash. Whenever we mean real money, we use 💸 — never 🪙.",
  },
  {
    emoji: "👻",
    name: "Ghost Cash",
    blurb: "Hypothetical org-work IOUs from the timer. Ghost emoji only — no cash emoji. No value, no cash-out.",
  },
  {
    emoji: "🪙",
    name: "Coin (Vibe Coins)",
    blurb: "Closed-loop platform credits. 100 🪙 = $1.00. No cash-out, spendable on the Service only.",
  },
  {
    emoji: "💌",
    name: "Love Letters",
    blurb:
      "A /clans/ community currency made from likes and other engagement: post, a human sees it and gives it a love letter, and letters accumulate. Spend them on advanced awards for posts and users. Cannot be mingled or transferred with 🪙 — you have to earn each letter on your posts.",
  },
] as const;

export const SUPPORT_DISCLAIMER_SHORT =
  "Voluntary support in Vibe Coins. Not a charity, not tax-deductible, no cash value, no cash-out. Perks are goals, not promises.";

export const LAUNCH_DISCLAIMER_SHORT =
  "Gift-based backing for creative projects in Vibe Coins. Not a charity, not an investment: no equity, interest, or profit-share. Rewards are goals, not guarantees.";

/** Split a gross support/launch payment (cut INCLUDED) into platform/recipient. */
export function supportSplit(grossCoins: number): { gross: number; cut: number; net: number } {
  const gross = Math.max(0, Math.round(grossCoins * 100) / 100);
  const cut = Math.round((gross * SUPPORT_CUT_PCT)) / 100;
  const net = Math.round((gross - cut) * 100) / 100;
  return { gross, cut, net };
}

/** Validate a tip/subscription/contribution amount: 1..100000, 2dp. */
export function cleanSupportAmount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < SUPPORT_MIN_COINS || v > SUPPORT_MAX_COINS) return 0;
  return Math.round(v * 100) / 100;
}

export function isLaunchCategory(value: unknown): LaunchCategory | "" {
  const v = String(value ?? "").trim().toLowerCase();
  return (LAUNCH_CATEGORIES as readonly string[]).includes(v) ? (v as LaunchCategory) : "";
}

export function isUuid(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}
