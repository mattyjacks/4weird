/**
 * House ads; the 10 fallback creatives for 4weird.
 *
 * Shown when the primary ad provider fails, returns nothing, or is blocked
 * (adblock). Guests see them as skippable interstitials/banners on play
 * pages; signed-in players only ever see them in the explicit ad-preview
 * spots (they pay coins instead of watching ads).
 *
 * Hrefs are first-party routes except the two operator-provided domains
 * (mattyjacks.com, shop.mattyjacks.com). The MediaMogul network is covered
 * in VibeCodeWorker ad copy; no guessed URLs anywhere.
 */

export type HouseAd = {
  id: string;
  emoji: string;
  tag: string;
  title: string;
  blurb: string;
  cta: string;
  href: string;
};

export const HOUSE_ADS: HouseAd[] = [
  {
    id: "vibe-coins",
    emoji: "🪙",
    tag: "4weird · Vibe Coins",
    title: "Get 100 free Vibe Coins",
    blurb: "100 coins = $1.00. Daily bonuses alone cover 5+ hours of play a day; no card required.",
    cta: "Claim free coins",
    href: "/pricing",
  },
  {
    id: "gaming-buddy",
    emoji: "🎧",
    tag: "4weird · Gaming Buddy",
    title: "A buddy that watches you play",
    blurb: "Screen-aware voice companion in 9 OpenAI voices. Reacts to your runs in real time.",
    cta: "Meet the Buddy",
    href: "/buddy",
  },
  {
    id: "clans",
    emoji: "👾",
    tag: "4weird · Clans",
    title: "Find your clan",
    blurb: "Forums, game nights, and moderated hangouts for every genre on 4weird.",
    cta: "Browse clans",
    href: "/clans",
  },
  {
    id: "agents",
    emoji: "🤖",
    tag: "4weird · Agent rentals",
    title: "Rent an AI agent on RunPod GPUs",
    blurb: "OpenClaw-style agents by the hour. Coin escrow, metered heartbeats, 25% cut included.",
    cta: "Rent compute",
    href: "/agents",
  },
  {
    id: "unitunite",
    emoji: "🚀",
    tag: "4weird · UnitUnite cloud",
    title: "Squad cloud that bills in coins",
    blurb: "GPU pods, serverless, storage, Postgres, queues; one gross metered price per workspace.",
    cta: "Try UnitUnite",
    href: "/squads",
  },
  {
    id: "vibecodeworker",
    emoji: "🧠",
    tag: "MediaMogul · VibeCodeWorker",
    title: "Evidence-driven QA for the web",
    blurb: "From the MediaMogul network: run, observe, and debug web experiences with an agentic worker.",
    cta: "Open the manual",
    href: "/vibecodeworker/docs",
  },
  {
    id: "functions",
    emoji: "⚡",
    tag: "4weird · Functions",
    title: "Serverless functions + inference APIs",
    blurb: "Autoscaled workers, cron jobs, and hosted model endpoints; metered per second in coins.",
    cta: "See cloud pricing",
    href: "/squads",
  },
  {
    id: "leaderboards",
    emoji: "🏆",
    tag: "4weird · Leaderboards",
    title: "Top the leaderboards",
    blurb: "Kills, actions, and play-time across 35 games. Sign in to post your runs.",
    cta: "View boards",
    href: "/leaderboards",
  },
  {
    id: "mattyjacks",
    emoji: "🎩",
    tag: "mattyjacks.com",
    title: "Meet the maker",
    blurb: "MattyJacks builds strange, joyful internet; games, tools, and experiments.",
    cta: "Visit mattyjacks.com",
    href: "https://mattyjacks.com",
  },
  {
    id: "shop",
    emoji: "🛍️",
    tag: "shop.mattyjacks.com",
    title: "Wear the weird",
    blurb: "Merch from the workshop: shirts, stickers, and drops from shop.mattyjacks.com.",
    cta: "Shop the drop",
    href: "https://shop.mattyjacks.com",
  },
];

/** Deterministic pick (stable per day + slot) so SSR and client agree. */
export function pickHouseAd(seed: string, slot = ""): HouseAd {
  const key = `${seed}:${slot}`;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return HOUSE_ADS[h % HOUSE_ADS.length] ?? HOUSE_ADS[0]!;
}

export function isHouseAdId(value: unknown): boolean {
  return typeof value === "string" && HOUSE_ADS.some((a) => a.id === value);
}
