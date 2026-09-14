import type { MetadataRoute } from "next";
import { games } from "@/content/games";
import { SITE_URL } from "@/lib/seo";

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/**
 * Canonical sitemap: every crawlable, indexable page on 4weird Games.
 *
 * Google Search Console rules enforced here (do NOT regress):
 * - Only indexable, canonical URLs are listed. Submitting a noindex/gated
 *   URL triggers "Submitted URL marked 'noindex'" / redirect / 401 coverage
 *   errors and burns crawl budget. Discovery of game titles happens through
 *   links from /games and each /games/<slug> detail page, not via sitemap.
 * - No `lastModified` is emitted. The previous `new Date()` stamped every
 *   URL with "now" on every /sitemap.xml fetch, so Google saw the whole
 *   sitemap as changed hourly. Omit lastmod until a real per-page mtime
 *   (git commit date / content mtime) is wired in; GSC accepts sitemaps
 *   without it.
 * - Absolute https URLs on the www canonical (https://www.4weird.com: apex
 *   308s to www at the Vercel edge, so apex locs would report "Page with
 *   redirect"). No trailing slash, no *.html, no legacy redirect sources.
 *
 * Deliberately EXCLUDED (noindex / gated / thin / non-content):
 * - /account, /auth/*, /my/usage, /my/rights, /family/login, /runpods
 *   (login-gated, robots noindex, robots.txt disallow)
 * - /api/* (data endpoints, no-store)
 * - /games/<slug>/play, /games/gravegain4d/play, /games/gravegain5d/play
 *   (thin noindex iframe shells; the /games/<slug> detail page is the
 *   canonical indexed surface per game)
 * - /chat, /chat/[threadId] (private per-device threads, robots noindex)
 * - /business/invoices/trash (owner-only bin, robots noindex)
 * - /boss, /it (X-Robots-Tag: noindex via next.config headers)
 * - /feedback/admin (admin-gated PII queue, robots noindex)
 * - /gamestudio/debugplay, /vibecodeworker/debug-play (debug surfaces)
 * - /swarm/control (login-only console, 401 anonymous)
 * - /vocrehab/export, /vocrehab/pro/* (gated counselor tooling)
 * - User-scoped dynamics with no canonical: /clans/[slug], /code/[id],
 *   /fundraisers/[id], /games/servers/[id], /squads/[id](/kanban),
 *   /vocrehab/pro/sessions/[id] (hubs stay listed; IDs stay out)
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
  { path: "/search", changeFrequency: "weekly", priority: 0.7 },
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

// Business suite: org-scoped tools + guide. Trash is owner-only noindex
// and stays out (see header).
const BUSINESS: Entry[] = [
  { path: "/business", changeFrequency: "weekly", priority: 0.7 },
  { path: "/business/crm", changeFrequency: "weekly", priority: 0.6 },
  { path: "/business/invoices", changeFrequency: "weekly", priority: 0.6 },
  { path: "/business/invoices/new", changeFrequency: "weekly", priority: 0.5 },
  { path: "/business/tax", changeFrequency: "weekly", priority: 0.6 },
  { path: "/docs/business", changeFrequency: "monthly", priority: 0.7 },
];

// Public work console. /boss and /it serve X-Robots-Tag: noindex and stay
// out; /work is the indexable surface.
const WORK: Entry[] = [
  { path: "/work", changeFrequency: "weekly", priority: 0.7 },
];

// MMO realms: browser + rental + guides (renamed slug; old paths 308 via next.config.ts).
const MMO: Entry[] = [
  { path: "/mmo", changeFrequency: "daily", priority: 0.8 },
  { path: "/mmo/rent", changeFrequency: "weekly", priority: 0.7 },
  { path: "/games/servers", changeFrequency: "daily", priority: 0.8 },
  { path: "/games/servers/rent", changeFrequency: "weekly", priority: 0.7 },
];

// Solo compliance tools: deliverability + DNC scrubbing.
const COMPLIANCE: Entry[] = [
  { path: "/bouncer", changeFrequency: "weekly", priority: 0.6 },
  { path: "/easydnc", changeFrequency: "weekly", priority: 0.6 },
];

// Single-purpose product surfaces: installer builder, game studio, code.
// /chat is private per-device (robots noindex) and stays out; debug shells
// (/gamestudio/debugplay) are non-content and stay out.
const PRODUCT: Entry[] = [
  { path: "/builder", changeFrequency: "weekly", priority: 0.6 },
  { path: "/commander", changeFrequency: "weekly", priority: 0.6 },
  { path: "/gamestudio", changeFrequency: "weekly", priority: 0.6 },
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

// Static game discovery surfaces. Per-game detail pages are template-driven
// off the catalog below; noindex /play shells are never listed.
// NOTE: /games/fridgesimulator is ALSO a catalog game slug, so gameEntries
// below emits the same URL — the dedupe in the return keeps a single <loc>.
// Keep the literal: verify-sitemap.mjs requires every static route listed.
const GAMES_EXTRA: Entry[] = [
  { path: "/games/compute", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/mods", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/plugins", changeFrequency: "weekly", priority: 0.6 },
  { path: "/games/fridgesimulator", changeFrequency: "weekly", priority: 0.6 },
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

// Music maker suite: maker + public library + instrument indexes.
const MUSIC: Entry[] = [
  { path: "/music", changeFrequency: "weekly", priority: 0.7 },
  { path: "/music/all", changeFrequency: "weekly", priority: 0.6 },
  { path: "/music/maker", changeFrequency: "weekly", priority: 0.7 },
  { path: "/music/maker/help", changeFrequency: "monthly", priority: 0.6 },
  { path: "/music/maker/instruments", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/music/maker/help/instruments",
    changeFrequency: "monthly",
    priority: 0.6,
  },
];

// Free browser tools hub + every tool.
const TOOLS: Entry[] = [
  { path: "/tools", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tools/counter", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tools/image", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tools/seo", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tools/writing", changeFrequency: "monthly", priority: 0.6 },
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

// Vocational-rehab course: guest-playable, indexable. Gated counselor
// tooling (/vocrehab/export, /vocrehab/pro/*) stays out; per-module lessons
// expand template-driven off the catalog like the games below.
const VOCREHAB: Entry[] = [
  { path: "/vocrehab", changeFrequency: "weekly", priority: 0.7 },
  { path: "/vocrehab/accessibility", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/course", changeFrequency: "weekly", priority: 0.7 },
  { path: "/vocrehab/decide", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/vocrehab/decide/disclosure-paths",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/vocrehab/decide/ssi", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/discover", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/discover/barriers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/discover/goals", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/discover/ipe", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/vocrehab/discover/readiness",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/vocrehab/discover/remote", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/interview", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/vocrehab/interview/disclosure",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/vocrehab/interview/jobs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/interview/pivot", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/interview/prep", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/vocrehab/interview/resume",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/vocrehab/play", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/vocrehab/play/barrier-run",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/energy-budget",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/vocrehab/play/file-sort", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/vocrehab/play/focus-shift",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/inbox-sprint",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/inbox-sprint/drill",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/paycheck-plan",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/phone-greeting",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/resume-rescue",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/schedule-juggle",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/time-punch",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/vocrehab/play/tool-match",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/vocrehab/privacy", changeFrequency: "monthly", priority: 0.6 },
];

// Docs hub + every doc chapter.
const DOCS: Entry[] = [
  { path: "/docs", changeFrequency: "weekly", priority: 0.8 },
  { path: "/docs/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/getting-started", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/playing-games", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/games/gravegain4d", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/games/gravegain4d/combat",
    changeFrequency: "monthly",
    priority: 0.6,
  },
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
  { path: "/docs/future-proof-web", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/search", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/terminal-desktop", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/desktop/opencode", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/desktop/opencode/heal-loops",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/docs/desktop/opencode/terminal",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/remastery", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/remastery/axioms", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/chat", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/remastery/invoicing", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/remastery/invoicing-trash",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/remastery/kanban", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/remastery/kanban-sprints",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/remastery/migration", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/remastery/notifications-chat",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/remastery/squads", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/remastery/squad-workspaces",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/docs/remastery/time-tracking",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/game-ai-buddy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/studio", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/studio/commander", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/dictate-pic", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/luck-factory", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/studio/media-mogul", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/studio/plugin-checklist",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/music", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/music/maker", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/music/bots", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/music/games", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/vibecodeworker", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/vocrehab", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/vocrehab/counselors", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/vocrehab/games", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/docs/vocrehab/getting-started",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/docs/vocrehab/privacy-safety",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/docs/vocrehab/ssi-math", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/vocrehab/seeds", changeFrequency: "monthly", priority: 0.6 },
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
  const staticEntries: MetadataRoute.Sitemap = [
    ...PRIMARY,
    ...COMMUNITY,
    ...SUPPORT,
    ...BUSINESS,
    ...WORK,
    ...MMO,
    ...COMPLIANCE,
    ...PRODUCT,
    ...COMPUTE,
    ...DESKTOP_EXTRA,
    ...GAMES_EXTRA,
    ...STUDIO,
    ...MUSIC,
    ...TOOLS,
    ...EXPLORE,
    ...VCW_SECTIONS,
    ...VCW_STATIC,
    ...VOCREHAB,
    ...DOCS,
    ...TRUST,
  ].map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // Canonical indexed surface per game. Play shells are noindex and stay
  // out of the submitted sitemap (see header); crawlers reach titles via
  // /games and these detail URLs.
  const gameEntries: MetadataRoute.Sitemap = games.map((game) => ({
    url: `${SITE_URL}/games/${game.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Closed 14-module course catalog (mirrors
  // app/vocrehab/course/vocrehab-course-catalog.ts; unknown slugs 404, so
  // expansion is safe). Inlined as literals — not imported — so the
  // vocrehab namespace keeps zero inbound imports (verify-vocrehab
  // rip-out hygiene). If the catalog gains a slug, add it here too.
  const courseEntries: MetadataRoute.Sitemap = [
    "welcome",
    "know-strengths",
    "barriers-supports",
    "pick-direction",
    "interview-basics",
    "the-pivot",
    "the-ask",
    "paper-trail",
    "money-maps",
    "when-to-share",
    "decision-one-pager",
    "what-ipes-are",
    "how-sessions-help",
    "next-3-steps",
  ].map((module) => ({
    url: `${SITE_URL}/vocrehab/course/${module}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dedupe by URL (first occurrence wins): /games/fridgesimulator is both
  // a static route and a catalog slug, so it is emitted twice without this.
  // Duplicate <loc>s burn crawl budget and trip GSC duplicate checks.
  return [...staticEntries, ...gameEntries, ...courseEntries].filter(
    (entry, index, all) => all.findIndex((e) => e.url === entry.url) === index,
  );
}
