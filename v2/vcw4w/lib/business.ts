/**
 * Business & Teams hub catalog.
 *
 * Central list for the /business landing page, the homepage
 * "For business & teams" section, and the site nav group.
 *
 * NOTE: /business/invoices is owned by Agent E and /business/crm by
 * Agent C; both are linked here so the hub stays complete even before
 * those routes land.
 */

export const BUSINESS_NAME = "Business & Teams";
export const BUSINESS_TAGLINE = "Run the company like you run a squad.";
export const BUSINESS_BLURB =
  "Squads, time tracking, projects, invoices, CRM, and the vault; one coin where 100 Vibe Coins = exactly $1.00.";

export type BusinessApp = {
  href: string;
  label: string;
  emoji: string;
  blurb: string;
};

export const BUSINESS_APPS: BusinessApp[] = [
  {
    href: "/squads",
    label: "UnitUnite",
    emoji: "🚀",
    blurb: "Squad workspaces with projects, code, issues, and encrypted team messaging.",
  },
  {
    href: "/squads#orgs",
    label: "Orgs & Teams",
    emoji: "🏢",
    blurb: "Orgs hold billing and audit; squads hold the people doing the work.",
  },
  {
    href: "/timer",
    label: "Timer & Work Diary",
    emoji: "⏱️",
    blurb: "Second-by-second tracking with Ghost Cash books for teams.",
  },
  {
    href: "/squads",
    label: "Projects",
    emoji: "📋",
    blurb: "Team code projects with Code + Issues tabs, milestones, and tasks.",
  },
  {
    href: "/business/invoices",
    label: "Invoices",
    emoji: "🧾",
    blurb: "Org-scoped invoice memoranda with line items (not tax invoices); settlement only via guarded flows.",
  },
  {
    href: "/business/crm",
    label: "Business CRM",
    emoji: "🤝",
    blurb: "Contacts, pipelines, and follow-ups for teams that sell things.",
  },
  {
    href: "/squads",
    label: "Team Management",
    emoji: "👥",
    blurb: "Roles, permissions, rooms, and shared wallets for every squad.",
  },
  {
    href: "/vault",
    label: "Data Vault",
    emoji: "🗄️",
    blurb: "Private files for you, your team, or your org; strictly separated.",
  },
];
