import type { MetadataRoute } from "next";
import { games } from "@/content/games";
import { SITE_URL } from "@/lib/seo";

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/**
 * Canonical sitemap; every crawlable, indexable page on 4weird Games.
 *
 * Deliberately EXCLUDED (noindex / gated / non-content):
 * - /account, /auth/*, /my/usage, /my/rights (login-gated, robots noindex)
 * - /api/* (data endpoints, no-store)
 * - /games/<slug>/play shells stay listed below at low priority so crawlers
 *   discover game titles through them, even though the shell itself is
 *   noindex (thin iframe wrapper; the /games/<slug> detail page is the
 *   canonical indexed surface per game).
 * - /games/gravegain4d/play and /feedback/admin are likewise robots-noindex
 *   but stay listed at low priority: verify-sitemap.mjs requires every
 *   non-gated static route to be listed, and this file follows the same
 *   low-priority precedent as the /play shells for those two.
 * - Legacy mirrors (/v1-legacy/*, /vibecodeworker-legacy/*, /games/html/*)
 */

// Hub + money pages; crawl often, rank highest.
const PRIMARY: Entry[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/games", changeFrequency: "daily", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/agents", changeFrequency: "weekly", priority: 0.9 },
  { path: "/vibecodeworker", changeFrequency: "weekly", priority: 0.9 },
  { path: "/squads", changeFrequency: "weekly", priority: 0.8 },
  { path: "/timer", changeFrequency: "weekly", priority: 0.8 },
  { path: "/timer/pro", changeFrequency: "weekly", priority: 0.6 },
  { path: "/desktop", changeFrequency: "weekly", priority: 0.8 },
  { path: "/buddy", changeFrequency: "weekly", priority: 0.8 },
  { path: "/swarm", changeFrequency: "weekly", priority: 0.8 },
  { path: "/fal", changeFrequency: "weekly", priority: 0.8 },
  { path: "/meshy", changeFrequency: "weekly", priority: 0.8 },
  { path: "/stock", changeFrequency: "weekly", priority: 0.8 },
  { path: "/vault", changeFrequency: "weekly", priority: 0.8 },
  { path: "/submit", changeFrequency: "weekly", priority: 0.8 },
  { path: "/newgameplus", changeFrequency: "weekly", priority: 0.8 },
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

// Creator economy; tipping and launch campaigns.
const SUPPORT: Entry[] = [
  { path: "/support", changeFrequency: "weekly", priority: 0.7 },
  { path: "/fundraisers", changeFrequency: "weekly", priority: 0.7 },
];

// Business suite: org-scoped tools + guide (Task E).
const BUSINESS: Entry[] = [
  { path: "/business", changeFrequency: "weekly", priority: 0.7 },
  { path: "/business/crm", changeFrequency: "weekly", priority: 0.6 },
  { path: "/business/invoices", changeFrequency: "weekly", priority: 0.6 },
  { path: "/business/invoices/new", changeFrequency: "weekly", priority: 0.5 },
  { path: "/business/invoices/trash", changeFrequency: "weekly", priority: 0.5 },
  { path: "/business/tax", changeFrequency: "weekly", priority: 0.6 },
  { path: "/docs/business", changeFrequency: "monthly", priority: 0.7 },
];

// IT Command suite: boss/it/work consoles + vocrehab course + guide (added with the routes;
// verify-sitemap requires every indexable route to be listed).
const IT_COMMAND: Entry[] = [
  { path: "/boss", changeFrequency: "weekly", priority: 0.7 },
  { path: "/it", changeFrequency: "weekly", priority: 0.7 },
  { path: "/work", changeFrequency: "weekly", priority: 0.7 },
  { path: "/vocrehab", changeFrequency: "weekly", priority: 0.7 },
];

// MMO realms: browser + rental + guides (renamed slug; old paths 308 via next.config.ts;
// verify-sitemap requires every indexable route to be listed).
const MMO: Entry[] = [
  { path: "/mmo", changeFrequency: "daily", priority: 0.8 },
  { path: "/mmo/rent", changeFrequency: "weekly", priority: 0.7 },
  { path: "/games/servers", changeFrequency: "daily", priority: 0.8 },
  { path: "/games/servers/rent", changeFrequency: "weekly", priority: 0.7 },
];

// Solo compliance tools: deliverability + DNC scrubbing (sitemap parity).
const COMPLIANCE: Entry[] = [
  { path: "/bouncer", changeFrequency: "weekly", priority: 0.6 },
  { path: "/easydnc", changeFrequency: "weekly", priority: 0.6 },
];

// Single-purpose product surfaces: installer builder, game studio,
// chat index, Quake-style power-user terminal + commander.
const PRODUCT: Entry[] = [
  { path: "/builder", changeFrequency: "weekly", priority: 0.6 },
  { path: "/commander", changeFrequency: "weekly", priority: 0.6 },
  { path: "/gamestudio", changeFrequency: "weekly", priority: 0.6 },
  { path: "/gamestudio/debugplay", changeFrequency: "weekly", priority: 0.5 },
  { path: "/chat", changeFrequency: "weekly", priority: 0.6 },
  { path: "/code", changeFrequency: "weekly", priority: 0.6 },
  { path: "/terminal", changeFrequency: "monthly", priority: 0.6 },
];

// Distributed-compute consoles + game compute hub.
const COMPUTE: Entry[] = [
  { path: "/compute/dps", changeFrequency: "weekly", priority: 0.6 },
  { path: "/compute/p2p", changeFrequency: "weekly", priority: 0.6 },
];

// Desktop parity boards + remastery hub.
const DESKTOP_EXTRA: Entry[] = [
  { path: "/desktop/remastery", changeFrequency: "monthly", priority: 0.6 },
  { path: "/desktop/wave2", changeFrequency: "monthly", priority: 0.6 },
  { path: "/desktop/wave3", changeFrequency: "monthly", priority: 0.6 },
];

// Static game discovery surfaces (the [slug] detail/play pair stays
// template-driven off the catalog below). The gravegain4d play route is a
// noindex shell like the /play shells, listed so crawlers discover it.
const GAMES_EXTRA: Entry[] = [
  { path: "/games/compute", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/mods", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/plugins", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/fridgesimulator", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/gravegain4d/play", changeFrequency: "monthly", priority: 0.4 },
];

// Media studio suite: hub + audio + paint + recorder + image + video timeline + editor.
const STUDIO: Entry[] = [
  { path: "/studio", changeFrequency: "weekly", priority: 0.7 },
  { path: "/studio/audio", changeFrequency: "weekly", priority: 0.6 },
  { path: "/studio/paint", changeFrequency: "weekly", priority: 0.6 },
  { path: "/studio/recorder", changeFrequency: "weekly", priority: 0.6 },
  { path: "/studio/image", changeFrequency: "weekly", priority: 0.6 },
  { path: "/studio/video", changeFrequency: "weekly", priority: 0.6 },
  { path: "/studio/video/editor", changeFrequency: "weekly", priority: 0.5 },
];

// Music maker suite: maker + public library (DS-MUSIC-03/05).
const MUSIC: Entry[] = [
  { path: "/music", changeFrequency: "weekly", priority: 0.7 },
  { path: "/music/all", changeFrequency: "weekly", priority: 0.6 },
  { path: "/music/maker", changeFrequency: "weekly", priority: 0.7 },
  { path: "/music/maker/help", changeFrequency: "monthly", priority: 0.6 },
];

// Free browser tools hub + every tool.
const TOOLS: Entry[] = [
  { path: "/tools", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tools/counter", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tools/image", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tools/seo", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tools/writing", changeFrequency: "monthly", priority: 0.6 },
];

// Admin-only feedback queue: robots noindex, but listed at low priority so
// verify-sitemap parity holds (same precedent as the noindex /play shells).
const ADMIN: Entry[] = [
  { path: "/feedback/admin", changeFrequency: "monthly", priority: 0.3 },
];

// Evergreen exhibits + explainers.
const EXPLORE: Entry[] = [
  { path: "/ads", changeFrequency: "weekly", priority: 0.5 },
  { path: "/favorites", changeFrequency: "monthly", priority: 0.5 },
  { path: "/academy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/tech", changeFrequency: "monthly", priority: 0.7 },
  { path: "/game/spaceships", changeFrequency: "monthly", priority: 0.7 },
  { path: "/web-apps", changeFrequency: "monthly", priority: 0.6 },
  { path: "/luck", changeFrequency: "monthly", priority: 0.5 },
  { path: "/pet", changeFrequency: "monthly", priority: 0.6 },
];

// VibeCodeWorker sections (closed list; mirrors app/vibecodeworker/[section]).
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

// Standalone VCW pages outside the [section] closed list.
const VCW_EXTRA: Entry[] = [
  { path: "/vibecodeworker/debug-play", changeFrequency: "monthly", priority: 0.5 },
];

// Docs hub + every doc chapter.
const DOCS: Entry[] = [
  { path: "/docs", changeFrequency: "weekly", priority: 0.8 },
  { path: "/docs/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/getting-started", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/playing-games", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/games/gravegain4d", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/games/gravegain4d/combat", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/games/saves", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/games-fridge", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/games-fridge/foods", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/games-fridge/saves", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/gravegain4d", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/gravegain4d/how-to-play", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/vibe-coins", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/support-launches", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/feedback", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/clans", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/bots", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/integrations", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/integrations/chat-bot", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/integrations/mcp", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/agents-compute", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/dps", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/dps/donor-guide", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/dps/job-requester", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/mmo/hosting", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo/age-bands", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo/dimensions-4d-5d", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo/player", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo/host", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo/safety", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/mmo/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/runpod-vs-digitalocean", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/shadow-it", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/remastery/axioms", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/chat", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/invoicing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/invoicing-trash", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/kanban", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/kanban-sprints", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/migration", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/notifications-chat", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/squads", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/squad-workspaces", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/time-tracking", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/game-ai-buddy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/studio", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/studio/commander", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/dictate-pic", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/luck-factory", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/media-mogul", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/plugin-checklist", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/music", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/music/maker", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/music/bots", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/music/games", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/vibecodeworker", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/explore-more", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/privacy-safety", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/security", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/security/bot-keys", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/faq", changeFrequency: "monthly", priority: 0.8 },
];

// Trust + legal; indexable, change rarely.
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
    ...BUSINESS,
    ...IT_COMMAND,
    ...MMO,
    ...COMPLIANCE,
    ...PRODUCT,
    ...COMPUTE,
    ...DESKTOP_EXTRA,
    ...GAMES_EXTRA,
    ...STUDIO,
    ...MUSIC,
    ...TOOLS,
    ...ADMIN,
    ...EXPLORE,
    ...VCW_SECTIONS,
    ...VCW_STATIC,
    ...VCW_EXTRA,
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
