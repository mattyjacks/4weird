/**
 * Team permissions; client-safe mirror of the FULL PERMISSION SET seeded in
 * `supabase/migrations/20260910130000_teams_enterprise_bundle.sql`.
 *
 * The database is the enforcer (has_*_perm + RLS + RPCs). This module only
 * presents the advanced model simply: grouped pickers, default-role
 * previews, and "copy a default, tweak 1-2 keys" encouragement.
 */

export type PermissionGroup = "org" | "team" | "project" | "cloud" | "rooms" | "security";

export type PermissionDef = { key: string; group: PermissionGroup; label: string; blurb: string };

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: "org.view", group: "org", label: "View org", blurb: "See this organization" },
  { key: "org.edit", group: "org", label: "Edit org", blurb: "Rename / describe the org" },
  { key: "org.delete", group: "org", label: "Delete org", blurb: "Danger: removes every team inside" },
  { key: "org.members.view", group: "org", label: "View members", blurb: "See org roster" },
  { key: "org.members.invite", group: "org", label: "Invite members", blurb: "Send org invites" },
  { key: "org.members.remove", group: "org", label: "Remove members", blurb: "Remove or ban org members" },
  { key: "org.members.change_role", group: "org", label: "Change roles", blurb: "Change any org member role" },
  { key: "org.roles.view", group: "org", label: "View roles", blurb: "See default + custom roles" },
  { key: "org.roles.manage", group: "org", label: "Manage roles", blurb: "Create / edit custom roles" },
  { key: "org.billing.view", group: "org", label: "View billing", blurb: "See spend + invoices" },
  { key: "org.billing.manage", group: "org", label: "Manage billing", blurb: "Buy credits, set budgets" },
  { key: "org.wallet.fund", group: "org", label: "Fund wallet", blurb: "Move Vibe Coins into org wallet" },
  { key: "org.wallet.spend", group: "org", label: "Spend wallet", blurb: "Approve cloud spend from wallet" },
  { key: "org.audit.view", group: "org", label: "View audit log", blurb: "Tamper-evident audit trail" },
  { key: "org.teams.create", group: "org", label: "Create teams", blurb: "Open new workspaces" },
  { key: "org.teams.delete", group: "org", label: "Delete teams", blurb: "Remove workspaces" },
  { key: "org.sso.manage", group: "org", label: "Manage SSO", blurb: "Enterprise login + domain claim" },
  { key: "org.api_keys.manage", group: "org", label: "Manage API keys", blurb: "Scoped machine keys" },
  { key: "team.view", group: "team", label: "View team", blurb: "See this workspace" },
  { key: "team.edit", group: "team", label: "Edit team", blurb: "Rename / repurpose the workspace" },
  { key: "team.delete", group: "team", label: "Delete team", blurb: "Danger: removes projects + rooms" },
  { key: "team.members.view", group: "team", label: "View members", blurb: "See workspace roster" },
  { key: "team.members.invite", group: "team", label: "Invite members", blurb: "Send workspace invites" },
  { key: "team.members.remove", group: "team", label: "Remove members", blurb: "Remove workspace members" },
  { key: "team.members.change_role", group: "team", label: "Change roles", blurb: "Change workspace roles" },
  { key: "team.roles.view", group: "team", label: "View roles", blurb: "See workspace roles" },
  { key: "team.roles.manage", group: "team", label: "Manage roles", blurb: "Create workspace custom roles" },
  { key: "team.projects.create", group: "team", label: "Create projects", blurb: "Open team code projects" },
  { key: "team.projects.delete", group: "team", label: "Delete projects", blurb: "Remove projects" },
  { key: "team.rooms.create", group: "team", label: "Create rooms", blurb: "Open secure team rooms" },
  { key: "team.api_keys.manage", group: "team", label: "Manage API keys", blurb: "Scoped workspace keys" },
  { key: "team.budget.manage", group: "team", label: "Manage budget", blurb: "Caps + alerts per workspace" },
  { key: "project.view", group: "project", label: "View project", blurb: "Open the project home" },
  { key: "project.edit", group: "project", label: "Edit project", blurb: "Rename / describe" },
  { key: "project.delete", group: "project", label: "Delete project", blurb: "Danger zone" },
  { key: "project.visibility.manage", group: "project", label: "Change visibility", blurb: "Private / internal / public" },
  { key: "project.code.view", group: "project", label: "Code: read", blurb: "Browse files (Code tab)" },
  { key: "project.code.push", group: "project", label: "Code: push", blurb: "Push branches + commits" },
  { key: "project.code.review", group: "project", label: "Code: review", blurb: "Approve pull requests" },
  { key: "project.branches.manage", group: "project", label: "Manage branches", blurb: "Protect / delete branches" },
  { key: "project.releases.manage", group: "project", label: "Manage releases", blurb: "Cut releases + tags" },
  { key: "project.issues.view", group: "project", label: "Issues: read", blurb: "Browse the Issues tab" },
  { key: "project.issues.create", group: "project", label: "Issues: create", blurb: "Open new issues" },
  { key: "project.issues.comment", group: "project", label: "Issues: comment", blurb: "Discuss issues + PRs" },
  { key: "project.issues.triage", group: "project", label: "Issues: triage", blurb: "Label + assign + milestone" },
  { key: "project.issues.close", group: "project", label: "Issues: close", blurb: "Close / reopen issues" },
  { key: "project.labels.manage", group: "project", label: "Manage labels", blurb: "Issue label taxonomy" },
  { key: "project.milestones.manage", group: "project", label: "Manage milestones", blurb: "Roadmap milestones" },
  { key: "project.pr.merge", group: "project", label: "Merge PRs", blurb: "Merge approved pull requests" },
  { key: "project.wiki.edit", group: "project", label: "Edit wiki", blurb: "Project docs pages" },
  { key: "project.actions.run", group: "project", label: "Run actions", blurb: "CI-ish runs metered in coins" },
  { key: "cloud.catalog.view", group: "cloud", label: "View catalog", blurb: "See every cloud service + price" },
  { key: "cloud.provision", group: "cloud", label: "Provision", blurb: "Start pay-as-you-go services" },
  { key: "cloud.provision.gpu", group: "cloud", label: "Provision GPU", blurb: "GPU pods + serverless workers" },
  { key: "cloud.provision.serverless", group: "cloud", label: "Provision serverless", blurb: "Endpoints + cron" },
  { key: "cloud.storage.manage", group: "cloud", label: "Manage storage", blurb: "Buckets + volumes + CDN" },
  { key: "cloud.database.manage", group: "cloud", label: "Manage databases", blurb: "Postgres + KV + queues" },
  { key: "cloud.kv.manage", group: "cloud", label: "Manage KV", blurb: "Edge key-value namespaces" },
  { key: "cloud.queue.manage", group: "cloud", label: "Manage queues", blurb: "Job queues + webhooks" },
  { key: "cloud.cdn.manage", group: "cloud", label: "Manage CDN", blurb: "Edge cache + custom domains" },
  { key: "cloud.builds.run", group: "cloud", label: "Run builds", blurb: "Image + static builds" },
  { key: "cloud.usage.view", group: "cloud", label: "View usage", blurb: "Live meters per service" },
  { key: "cloud.provision.destroy", group: "cloud", label: "Destroy services", blurb: "Tear down infra" },
  { key: "cloud.spend.approve", group: "cloud", label: "Approve spend", blurb: "Approve over-budget spend" },
  { key: "rooms.view", group: "rooms", label: "View rooms", blurb: "Open secure rooms" },
  { key: "rooms.send", group: "rooms", label: "Send messages", blurb: "Post E2EE ciphertext packets" },
  { key: "rooms.react", group: "rooms", label: "React", blurb: "Emoji reactions" },
  { key: "rooms.invite", group: "rooms", label: "Invite to rooms", blurb: "Add workspace members" },
  { key: "rooms.kick", group: "rooms", label: "Kick from rooms", blurb: "Remove disruptive members" },
  { key: "rooms.e2ee.reset", group: "rooms", label: "Reset E2EE", blurb: "Rotate session keys" },
  { key: "rooms.federate", group: "rooms", label: "Federate rooms", blurb: "Bridge to other servers" },
  { key: "rooms.moderate", group: "rooms", label: "Moderate rooms", blurb: "Redact + quarantine" },
  { key: "security.devices.view", group: "security", label: "View devices", blurb: "Encrypted device list" },
  { key: "security.devices.revoke", group: "security", label: "Revoke devices", blurb: "Kill compromised sessions" },
  { key: "security.audit.view", group: "security", label: "View audit", blurb: "Security audit entries" },
  { key: "security.reports.view", group: "security", label: "View reports", blurb: "Safety triage queue" },
  { key: "security.quarantine", group: "security", label: "Quarantine", blurb: "Hide abusive content org-wide" },
];

export const GROUP_LABELS: Record<PermissionGroup, string> = {
  org: "Organization",
  team: "UnitUnite workspace",
  project: "UnitUnite projects (Code + Issues)",
  cloud: "Cloud services (25% workspace cut incl.)",
  rooms: "UnitUnite messaging (encrypted E2EE)",
  security: "Security & compliance",
};

export function can(perms: string[], key: string): boolean {
  return perms.includes(key);
}

export function groupKeys(group: PermissionGroup): string[] {
  return PERMISSION_CATALOG.filter((p) => p.group === group).map((p) => p.key);
}

/** Starter suggestion: copy Viewer/Developer, add the one missing key. */
export function suggestCustomBase(need: string): string {
  if (need.startsWith("project.issues.")) return "developer";
  if (need.startsWith("project.code.")) return "developer";
  if (need.startsWith("cloud.")) return "developer";
  if (need.startsWith("rooms.")) return "viewer";
  return "viewer";
}
