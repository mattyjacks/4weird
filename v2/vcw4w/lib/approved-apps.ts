/**
 * Approved apps: the curated catalog that replaces Shadow IT.
 *
 * Boss and IT admins approve these services for work. Employees use
 * only these logged paths. Anything else is shadow IT (see shadow-it.ts).
 *
 * No imports, no Supabase; pure TypeScript so any page can use it.
 */

export interface ApprovedService {
  slug: string;
  name: string;
  category: string;
  path: string;
  whySafe: string;
  monitored: boolean;
}

export const APPROVED_APPS: ApprovedService[] = [
  {
    slug: "vault",
    name: "Vault files",
    category: "file-share",
    path: "/vault",
    whySafe: "Work files stay in one team box with logged sharing and backups.",
    monitored: true,
  },
  {
    slug: "swarm",
    name: "Swarm chat",
    category: "ai-chat",
    path: "/swarm",
    whySafe: "Team AI chat runs on approved models with logged prompts, not random free chats.",
    monitored: true,
  },
  {
    slug: "agents",
    name: "Agents rental",
    category: "cloud-gpu",
    path: "/agents",
    whySafe: "GPU work rents through one approved path so spend and access are logged.",
    monitored: true,
  },
  {
    slug: "desktop",
    name: "Desktop",
    category: "cloud-desktop",
    path: "/desktop",
    whySafe: "Cloud desktops live on team hardware with one login and quick lock-out.",
    monitored: true,
  },
  {
    slug: "squads",
    name: "Squads rooms",
    category: "chat",
    path: "/squads",
    whySafe: "Team chat, calls, and projects in one membership that survives people leaving.",
    monitored: true,
  },
  {
    slug: "timer",
    name: "Timer diary",
    category: "project-tracker",
    path: "/timer",
    whySafe: "Work time is written down in one diary the team can audit.",
    monitored: true,
  },
  {
    slug: "fal-studio",
    name: "fal Studio",
    category: "design",
    path: "/fal",
    whySafe: "Media renders run on the approved studio key with logged jobs and costs.",
    monitored: true,
  },
  {
    slug: "meshy",
    name: "Meshy",
    category: "design",
    path: "/meshy",
    whySafe: "3D models build on the approved key so files and spend stay visible.",
    monitored: true,
  },
  {
    slug: "buddy",
    name: "Buddy",
    category: "ai-chat",
    path: "/buddy",
    whySafe: "Game helper answers from approved data with logged sessions, not mystery bots.",
    monitored: true,
  },
  {
    slug: "newgameplus",
    name: "NewGamePlus",
    category: "docs",
    path: "/newgameplus",
    whySafe: "Playtests and guides live in one approved place with version history.",
    monitored: true,
  },
  {
    slug: "clans",
    name: "Clans work",
    category: "team-wiki",
    path: "/clans",
    whySafe: "Clan pages and fees share one membership so removing one person removes access.",
    monitored: true,
  },
  {
    slug: "support",
    name: "Support",
    category: "support",
    path: "/support",
    whySafe: "Help requests go through one logged queue instead of hidden side channels.",
    monitored: true,
  },
];

export const DEFAULT_APPROVED_SLUGS: string[] = [
  "vault",
  "swarm",
  "agents",
  "desktop",
  "squads",
  "timer",
  "fal-studio",
  "meshy",
  "buddy",
  "newgameplus",
  "clans",
  "support",
];

/** Find one approved app by slug (case-insensitive). Returns undefined when unknown. */
export function getApprovedApp(slug: string): ApprovedService | undefined {
  const key = (slug || "").trim().toLowerCase();
  if (!key) return undefined;
  return APPROVED_APPS.find((app) => app.slug.toLowerCase() === key);
}

/** List approved apps in one category (case-insensitive). Returns [] when none match. */
export function listByCategory(cat: string): ApprovedService[] {
  const key = (cat || "").trim().toLowerCase();
  if (!key) return [];
  return APPROVED_APPS.filter((app) => app.category.toLowerCase() === key);
}

/** Search approved apps by name, slug, category, or path (case-insensitive). */
export function searchApps(q: string): ApprovedService[] {
  const key = (q || "").trim().toLowerCase();
  if (!key) return [];
  return APPROVED_APPS.filter(
    (app) =>
      app.name.toLowerCase().includes(key) ||
      app.slug.toLowerCase().includes(key) ||
      app.category.toLowerCase().includes(key) ||
      app.path.toLowerCase().includes(key),
  );
}
