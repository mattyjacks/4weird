/**
 * IT policy enforcement helpers.
 *
 * Boss and IT admins pick which app categories the team may use.
 * Employees work only in approved, logged places. Anything else
 * is shadow IT: ask IT first before using it.
 *
 * No imports, no Supabase; pure TypeScript so any page can use it.
 */

export const BLOCKED_CATEGORIES_DEFAULT: string[] = [
  "personal-file-share",
  "unknown-ai",
  "crypto-miner",
  "personal-email",
  "torrent-share",
  "unvetted-remote-access",
];

/**
 * True when an app slug or category is NOT on the blocked list.
 * Comparison is case-insensitive; empty input is not allowed.
 */
export function isAppAllowed(
  appSlugOrCategory: string,
  blockedList: string[] = BLOCKED_CATEGORIES_DEFAULT,
): boolean {
  const slug = (appSlugOrCategory || "").trim().toLowerCase();
  if (!slug) return false;
  const blocked = (blockedList || []).map((c) => (c || "").trim().toLowerCase());
  return !blocked.includes(slug);
}

/** Plain-English guardrail shown when an app is not approved yet. */
export function guardrailMessage(appName: string): string {
  const name = (appName || "").trim() || "this app";
  return (
    `Ask IT first before using ${name}. ` +
    "It is not approved yet, so work you do there is not logged. " +
    "Your boss or IT admin can review it and approve it if it is safe."
  );
}

export interface PolicyTemplate {
  id: string;
  name: string;
  rules: string[];
  description: string;
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "startup-loose",
    name: "Startup (loose)",
    description:
      "Small fast team. Most common work apps are approved; only risky tools need a review.",
    rules: [
      "Approve common work apps quickly (docs, chat, code, design).",
      "Block only risky categories: crypto-miner, torrent-share, unknown-ai.",
      "Employees can request a new app and keep working while IT reviews it.",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    description:
      "Growing team. Work stays in approved, logged apps; new apps need approval first.",
    rules: [
      "Employees use only approved apps; all work is logged for IT.",
      "Block personal-file-share, personal-email, unknown-ai, and unvetted-remote-access.",
      "Boss or IT admin must approve a new app before the team uses it.",
    ],
  },
  {
    id: "strict-hipaa",
    name: "Strict / HIPAA",
    description:
      "Health or private data. Tightest rules: approved apps only, everything logged, no personal tools.",
    rules: [
      "Employees use only approved apps; nothing else, even for a quick test.",
      "Block all personal tools plus unvetted AI, remote access, and downloads.",
      "Auditors read the logs to prove the rules were followed; they change nothing.",
    ],
  },
];
