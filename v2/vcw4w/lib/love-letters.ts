/**
 * Love Letters (💌); clan-native appreciation currency.
 * Separate from Vibe Coins: never mints coins, never converts, never cashes.
 * Earn: start with 3, +1 per daily-bonus claim, clan quest rewards, receiving
 * from humans who loved your posts. Spend: 1 💌 gifts + tiered advanced awards
 * (spotlight 2 / superstar 5 / legend 10) on posts you love. Giving moves 💌
 * giver -> author; the author must earn it with a post a human actually saw.
 */

export const LOVE_EMOJI = "💌";
export const LOVE_STARTING_BALANCE = 3;
export const LOVE_DAILY_BONUS = 1;
export const LOVE_GIFT_COST = 1;

export const LOVE_AWARD_TIERS = {
  spotlight: { cost: 2, label: "Spotlight", blurb: "Shine a light on a great post." },
  superstar: { cost: 5, label: "Superstar", blurb: "A standout post worth celebrating." },
  legend: { cost: 10, label: "Legend of the Weird", blurb: "Immortalize a legendary post." },
} as const;

export type LoveAwardTier = keyof typeof LOVE_AWARD_TIERS;

export function isLoveAwardTier(v: unknown): v is LoveAwardTier {
  return typeof v === "string" && (v as string) in LOVE_AWARD_TIERS;
}

export type LoveWallet = {
  balance: number;
  earned: number;
  received: number;
  given: number;
  is_public?: boolean;
};

export type LovePublicStats = {
  display_name: string | null;
  public_handle: string | null;
  earned: number;
  received: number;
  given: number;
  is_public: boolean;
};
