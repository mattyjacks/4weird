/**
 * UnitUnite — the name for the project-management + get-stuff-done-as-a-team
 * surface of 4weird.
 *
 * Scope (deliberately narrow so it stays simple):
 *   - Team workspaces (orgs -> teams)
 *   - GitHub-like projects (Code tab + Issues tab, PRs, milestones)
 *   - Team messaging (Matrix-style E2EE rooms; server stores ciphertext only)
 *   - Anything else directly about "getting stuff done as a team"
 *     (tasks, standups, action items, room pins).
 *
 * NOT UnitUnite: games, clans-social, bots, billing primitives. Those keep
 * their own names and just plug into UnitUnite via permissions + wallets.
 */

export const UNITUNITE_NAME = "UnitUnite";
export const UNITUNITE_TAGLINE = "Get stuff done as a team.";
export const UNITUNITE_BLURB =
  "UnitUnite is 4weird's teamwork surface: projects, code, issues, and encrypted team messaging — one permissioned workspace.";

export const UNITUNITE_SURFACES = [
  "workspaces",
  "projects",
  "code",
  "issues",
  "rooms",
  "tasks",
] as const;
export type UnitUniteSurface = (typeof UNITUNITE_SURFACES)[number];

/** Route map for everything that counts as UnitUnite. */
export const UNITUNITE_ROUTES: Record<UnitUniteSurface, string> = {
  workspaces: "/teams",
  projects: "/teams",
  code: "/teams",
  issues: "/teams",
  rooms: "/teams",
  tasks: "/teams",
};

export function isUnitUniteRoute(pathname: string): boolean {
  return pathname === "/teams" || pathname.startsWith("/teams/");
}

/** Display helper: "UnitUnite · Issues" style breadcrumbs. */
export function unitUniteTitle(section: string): string {
  const clean = section.trim().slice(0, 40) || "Workspace";
  return `${UNITUNITE_NAME} · ${clean}`;
}
