/**
 * Shadow IT: the risks of using tools your team did not approve.
 *
 * Shadow IT means apps and services people use for work without asking
 * first: a random file-share, a free AI chat, a personal cloud drive.
 * This file teaches the risks in plain words and scores how risky a
 * setup is, then points at approved, monitored paths on 4weird instead.
 *
 * No imports, no Supabase; pure TypeScript so any page can use it.
 */

export interface ShadowItRisk {
  id: string;
  title: string;
  /** Plain-English explanation (5th-grade reading level). */
  plain: string;
  /** What to do instead. */
  fix: string;
}

export const SHADOW_IT_RISKS: ShadowItRisk[] = [
  {
    id: "data-leak",
    title: "Data leaks",
    plain:
      "Files you put in a random app can be seen, shared, or sold by that app. You cannot take them back.",
    fix: "Keep work files in an approved, monitored place like /vault so sharing and access are logged.",
  },
  {
    id: "compliance-gdpr",
    title: "Breaks privacy rules (GDPR)",
    plain:
      "Some laws say you must protect people's personal info. Random apps may not follow those laws, and your team gets the blame.",
    fix: "Use approved services that support data export and delete at /my/rights.",
  },
  {
    id: "compliance-hipaa",
    title: "Breaks health rules (HIPAA)",
    plain:
      "Health info needs extra locks. Most free apps do not have them. One upload can break the law.",
    fix: "Never paste health info into unapproved apps; use only approved, access-controlled workspaces.",
  },
  {
    id: "compliance-soc2",
    title: "Fails security checks (SOC 2)",
    plain:
      "Big customers ask: who can see our data? If the answer is a mystery app, you fail the check and lose the deal.",
    fix: "Keep work in monitored services (/squads, /agents) where access and logs can be shown.",
  },
  {
    id: "no-backups",
    title: "No backups",
    plain:
      "If the free app shuts down or deletes your account, your work is gone. Nobody has a copy.",
    fix: "Store work where backups and version history exist, such as /vault and /squads projects.",
  },
  {
    id: "credential-sprawl",
    title: "Passwords everywhere",
    plain:
      "Every new app is one more password. People reuse them, so one hack opens many doors.",
    fix: "Use fewer approved logins (one 4weird account) instead of a new password per tool.",
  },
  {
    id: "cost-sprawl",
    title: "Surprise bills",
    plain:
      "Free trials turn into paid plans on someone's credit card. Nobody knows what the team spends.",
    fix: "Buy through one approved path (/pricing, /account) so every coin spent is listed in one ledger.",
  },
  {
    id: "malware",
    title: "Viruses and fake apps",
    plain:
      "Some look-alike apps hide viruses that steal files or lock your computer until you pay.",
    fix: "Install only from approved lists and links; ask before trying a new download.",
  },
  {
    id: "no-offboarding",
    title: "No good goodbye",
    plain:
      "When someone leaves, their mystery apps keep your files. You cannot lock them out.",
    fix: "Keep membership in one place (/squads, orgs) so removing one person removes all access.",
  },
];

export const SHADOW_IT_WHY_BAD_MD: string = `# Why Shadow IT Is Bad

Shadow IT means using apps for work that your team did not pick.

Think of it like this. Your team has one safe box for work. Shadow IT
is hiding copies of the work in boxes nobody else knows about.

Why is that bad?

1. Lost files. If the secret box breaks, the work is gone.
2. Leaks. Strangers may read or share what you put in there.
3. Broken rules. Laws about privacy need proof of care. Secret boxes have no proof.
4. Big bills. Free apps turn into paid apps on hidden cards.
5. Stuck when people leave. Old helpers keep the keys to secret boxes.

How do approved services fix it?

- One home. Work lives where the team can see it.
- Watchers. Approved tools write down who opened what and when.
- Locks. One login, real passwords, quick lock-out when someone leaves.
- Backups. Copies exist, so mistakes do not delete everything.
- Clear costs. Every coin spent shows in one list.

Rule of thumb: if the team cannot see it, log it, lock it, or back it up,
do not put work in it. Ask first, then use the approved path.
`;

export type ShadowSensitivity = "low" | "medium" | "high" | "critical";
export type ShadowRiskLevel = "low" | "medium" | "high" | "critical";

export interface ShadowRiskInput {
  /** Count of unapproved apps in use. */
  unapprovedApps: number;
  /** Most sensitive data stored in them. */
  dataSensitivity: ShadowSensitivity;
  /** How many people use them. */
  people: number;
}

export interface ShadowRiskScore {
  score: number;
  level: ShadowRiskLevel;
}

const SENSITIVITY_POINTS: Record<ShadowSensitivity, number> = {
  low: 5,
  medium: 15,
  high: 25,
  critical: 35,
};

export function scoreShadowRisk(input: ShadowRiskInput): ShadowRiskScore {
  const apps = Math.max(0, Math.floor(input.unapprovedApps || 0));
  const people = Math.max(0, Math.floor(input.people || 0));
  const sensitivity = SENSITIVITY_POINTS[input.dataSensitivity] ?? 5;

  const appPoints = Math.min(40, apps * 8);
  const peoplePoints = Math.min(25, people * 2);
  const score = Math.min(100, Math.max(0, appPoints + sensitivity + peoplePoints));

  let level: ShadowRiskLevel = "low";
  if (score >= 80) level = "critical";
  else if (score >= 50) level = "high";
  else if (score >= 25) level = "medium";

  return { score, level };
}

/**
 * Unapproved category -> approved path on 4weird.
 * Keys are loose category slugs; values are routes to send people to.
 */
export const APPROVED_ALT_SUGGESTIONS: Record<string, string> = {
  "file-share": "/vault",
  "cloud-storage": "/vault",
  "ai-chat": "/swarm",
  "ai-code": "/agents",
  chat: "/squads",
  "video-call": "/squads",
  "project-tracker": "/squads",
  "code-host": "/squads",
  "cloud-desktop": "/desktop",
  "cloud-gpu": "/agents",
  docs: "/docs",
  "team-wiki": "/docs",
  "password-store": "/account",
  billing: "/pricing",
  support: "/account",
};
