import type { MetadataRoute } from "next";
import { games } from "@/content/games";
import { SITE_URL } from "@/lib/seo";

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/**
 * Canonical sitemap — every crawlable, indexable page on 4weird Games.
 *
 * Deliberately EXCLUDED (noindex / gated / non-content):
 * - /account, /auth/*, /my/usage, /my/rights (login-gated, robots noindex)
 * - /api/* (data endpoints, no-store)
 * - /games/<slug>/play shells stay listed below at low priority so crawlers
 *   discover game titles through them, even though the shell itself is
 *   noindex (thin iframe wrapper — the /games/<slug> detail page is the
 *   canonical indexed surface per game).
 * - Legacy mirrors (/v1-legacy/*, /vibecodeworker-legacy/*, /games/html/*)
 */

// Hub + money pages — crawl often, rank highest.
const PRIMARY: Entry[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/games", changeFrequency: "daily", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/agents", changeFrequency: "weekly", priority: 0.9 },
  { path: "/vibecodeworker", changeFrequency: "weekly", priority: 0.9 },
  { path: "/teams", changeFrequency: "weekly", priority: 0.8 },
  { path: "/timer", changeFrequency: "weekly", priority: 0.8 },
  { path: "/desktop", changeFrequency: "weekly", priority: 0.8 },
  { path: "/buddy", changeFrequency: "weekly", priority: 0.8 },
  { path: "/fal", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blender", changeFrequency: "weekly", priority: 0.8 },
  { path: "/xonotic", changeFrequency: "weekly", priority: 0.7 },
];

// Community + competition surfaces.
const COMMUNITY: Entry[] = [
  { path: "/clans", changeFrequency: "daily", priority: 0.7 },
  { path: "/bot/setup", changeFrequency: "monthly", priority: 0.6 },
  { path: "/bot/bclans", changeFrequency: "weekly", priority: 0.6 },
  { path: "/leaderboards", changeFrequency: "daily", priority: 0.7 },
  { path: "/lobbies", changeFrequency: "daily", priority: 0.6 },
];

// Creator economy — tipping and launch campaigns.
const SUPPORT: Entry[] = [
  { path: "/support", changeFrequency: "weekly", priority: 0.7 },
  { path: "/fundraisers", changeFrequency: "weekly", priority: 0.7 },
];

// Evergreen exhibits + explainers.
const EXPLORE: Entry[] = [
  { path: "/academy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/tech", changeFrequency: "monthly", priority: 0.7 },
  { path: "/spaceships", changeFrequency: "monthly", priority: 0.7 },
  { path: "/web-apps", changeFrequency: "monthly", priority: 0.6 },
];

// VibeCodeWorker sections (closed list — mirrors app/vibecodeworker/[section]).
const VCW_SECTIONS: Entry[] = [
  "overview",
  "hub",
  "run",
  "full",
  "phone",
  "docs",
  "demo",
].map((section) => ({
  path: `/vibecodeworker/${section}`,
  changeFrequency: "monthly" as const,
  priority: section === "overview" || section === "docs" ? 0.7 : 0.5,
}));

// Static VCW product pages served from /public/vcw (see next.config rewrites).
const VCW_STATIC: Entry[] = [
  { path: "/vcw/agent", changeFrequency: "monthly", priority: 0.5 },
  { path: "/vcw/desktop", changeFrequency: "monthly", priority: 0.5 },
];

// Docs hub + every doc chapter.
const DOCS: Entry[] = [
  { path: "/docs", changeFrequency: "weekly", priority: 0.8 },
  { path: "/docs/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/getting-started", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/playing-games", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/vibe-coins", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/support-launches", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/clans", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/bots", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/agents-compute", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/game-ai-buddy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/vibecodeworker", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/explore-more", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/privacy-safety", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/faq", changeFrequency: "monthly", priority: 0.8 },
];

// Trust + legal — indexable, change rarely.
const TRUST: Entry[] = [
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/accessibility", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    ...PRIMARY,
    ...COMMUNITY,
    ...SUPPORT,
    ...EXPLORE,
    ...VCW_SECTIONS,
    ...VCW_STATIC,
    ...DOCS,
    ...TRUST,
  ].map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const gameEntries: MetadataRoute.Sitemap = games.flatMap((game) => [
    {
      url: `${SITE_URL}/games/${game.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/games/${game.slug}/play`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
  ]);

  return [...staticEntries, ...gameEntries];
}
