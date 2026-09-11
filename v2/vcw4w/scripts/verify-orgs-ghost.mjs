import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-orgs-ghost: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

const mig = read("supabase/migrations/20260925000000_watcher_multirole_ghost.sql");

// 1. Watcher role: view-only template + scoped targets.
for (const token of ["'watcher'", "org_watch_scopes", "set_watch_scope", "org_watch_visible", "org_roles_of"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
const watcherBlock = mig.slice(mig.indexOf("('watcher'"));
must(watcherBlock.includes("org.audit.view"), "watcher must see the audit trail");
for (const bad of ["wallet.spend", "wallet.fund", "billing.manage", "members.change_role", "members.remove", "members.invite", "code.push", "provision", "moderate", "kick"]) {
  must(!new RegExp(`['.]${bad}['\\,\\]]`).test(watcherBlock.slice(0, watcherBlock.indexOf("on conflict"))), `watcher must not hold ${bad}`);
}
// Scoped-out watchers must be filtered in the ghost summary.
must(mig.includes("v_scoped") && mig.includes("v_targets"), "ghost summary must honor watch scopes");

// 2. Multi-role presets: junction + union semantics + management RPC.
for (const token of ["org_member_roles", "set_member_roles", "org_roles_of", "effective_perms(k, null)", "1..5 roles"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("array(select distinct unnest(v_perms || public.effective_perms(k, null)))"), "my_team_perms must union junction presets");

// 3. 100-org cap.
must(mig.includes("enforce_org_count") && mig.includes("100 per user"), "migration must cap orgs at 100/user");
must(mig.includes("trg_org_members_count"), "org-count trigger must exist");

// 4. Ghost Cash: separate tables, no money-path contact.
for (const token of ["ghost_contracts", "ghost_timers", "ghost_proofs", "ghost_debts", "ghost-proofs", "ghost_create_contract", "ghost_clock_in", "ghost_beat", "ghost_clock_out", "ghost_invoice_timer", "ghost_mark_debt", "ghost_settle_debt", "ghost_org_summary", "org_roster", "NO legal value"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(!/public\.coin_ledger|public\.coin_lots|public\.personal_budgets|public\.org_wallet_ledger|public\.org_budgets/.test(mig), "ghost migration must never touch real-money tables");
// Timer precision: seconds accumulate only via beats; one open timer per worker per org.
must(mig.includes("a timer is already running"), "one open timer per worker per org");
must(mig.includes("active_seconds + p_active_seconds"), "beats must accumulate tracked seconds");
must(mig.includes("rate_ghost * v_t.active_seconds / 3600.0"), "invoices must price exact tracked seconds");
// Proofs are worker-attached with a hard size cap.
must(mig.includes("bytes <= 1048576"), "proofs must be capped at 1 MB");

// 5. Routes.
const contracts = read("app/api/ghost/contracts/route.ts");
must(contracts.includes("ghost_create_contract"), "contracts route must use the RPC");
const timer = read("app/api/ghost/timer/route.ts");
for (const token of ["ghost_clock_in", "ghost_beat", "ghost_clock_out", "ghost_invoice_timer"]) {
  must(timer.includes(token), `timer route must include ${token}`);
}
const debts = read("app/api/ghost/debts/route.ts");
must(debts.includes("ghost_mark_debt") && debts.includes("ghost_settle_debt"), "debts route must mark + settle");
const proofs = read("app/api/ghost/proofs/route.ts");
for (const token of ["ghost-proofs", "ghost_proofs", "worker_id", "Field 'file' required"]) {
  must(proofs.includes(token), `proofs route must include ${token}`);
}
must(proofs.includes("Only the worker attaches proof"), "proofs must be worker-only");
const summary = read("app/api/ghost/summary/route.ts");
must(summary.includes("ghost_org_summary"), "summary route must use the one-round-trip RPC");
const memberRoles = read("app/api/orgs/[id]/members/roles/route.ts");
must(memberRoles.includes("set_member_roles") && memberRoles.includes("1–5 roles"), "member-roles route must assign preset bundles");
const members = read("app/api/orgs/[id]/members/route.ts");
must(members.includes("org_roster"), "members route must serve the roster RPC");
const watch = read("app/api/orgs/[id]/watch/route.ts");
must(watch.includes("set_watch_scope"), "watch route must manage scopes");
const orgRoles = read("app/api/orgs/roles/route.ts");
must(orgRoles.includes("role_templates"), "roles catalog must list templates");

// 6. UI: /timer page + workspace wiring.
const page = read("app/timer/page.tsx");
must(page.includes("GhostTimer") && page.includes("no legal value"), "timer page must render the clock + disclaimer");
const clock = read("components/ghost/ghost-timer.tsx");
for (const token of ["Clock in", "Clock out", "Invoice", "Mark owed", "Settle", "activity", "BEAT_SECONDS", "document.hidden", "Proof", "no value, no cash-out"]) {
  must(clock.includes(token), `ghost-timer must include ${token}`);
}
const ranks = read("components/teams/org-ranks.tsx");
for (const token of ["Lord", "Captain", "Infantry", "Banker", "Watcher", "members/roles", "orgs/roles", "whole org"]) {
  must(ranks.includes(token), `org-ranks must include ${token}`);
}
const workspace = read("components/teams/team-workspace.tsx");
must(workspace.includes("OrgRanks") && workspace.includes("/timer"), "workspace must mount ranks + link the timer");
const lib = read("lib/ghost.ts");
must(lib.includes("👻💵") && lib.includes("fmtGhost") && lib.includes("fmtGhostTime"), "lib/ghost must format the currency + time");

// 7. Legal: ghost no-value clause in terms + privacy; ranks in terms.
const terms = read("app/terms/page.tsx");
for (const token of ["Ghost Cash (👻💵) is not currency at all", "no legal value", "not a money-transmission", "never captured by us", "Watcher (sees everything", "several presets at once", "100 orgs"]) {
  must(terms.includes(token), `terms must include ${token}`);
}
const privacy = read("app/privacy/page.tsx");
for (const token of ["Ghost Cash and timer.", "never screen contents", "supplied by the worker"]) {
  must(privacy.includes(token), `privacy policy must include ${token}`);
}

// 8. No sexual content in the new surfaces.
for (const [path, body] of [["ghost-timer", clock], ["terms-ghost", terms]]) {
  must(!/porn|hentai|nsfw|erotic|sex game/i.test(body), `${path} must not describe sexual content`);
}

// 9. Lazy default org: one uninitialized org per user, 0 resources until
// the first write initializes it.
const lazy = read("supabase/migrations/20260928000000_default_org_lazy_init.sql");
for (const token of ["is_initialized", "ensure_default_org", "ensure_org_initialized", "Default Org by ", "trg_init_org_on_use", "initialized_at"]) {
  must(lazy.includes(token), `lazy-org migration must include ${token}`);
}
// Init must move 0 coins: no personal-ledger contact anywhere in the file.
must(!/public\.coin_ledger|coin_grants/.test(lazy), "lazy-org init must never touch coin tables");
// First-use triggers cover every org-child write path.
for (const token of ["trg_teams_init_org", "trg_wallet_ledger_init_org", "trg_provisions_init_org", "trg_ghost_contracts_init_org", "trg_ghost_debts_init_org", "trg_org_invites_init_org"]) {
  must(lazy.includes(token), `lazy-org migration must include ${token}`);
}
// Signup seeds best-effort; reads backfill.
must(lazy.includes("handle_new_user") && lazy.includes("ensure_default_org()"), "default org must seed on signup and backfill on read");

// 10. Org invite links with customized limits + expiry.
for (const token of ["max_uses", "expires_at", "revoked", "create_org_invite_link", "redeem_org_invite", "revoke_org_invite", "list_org_invites"]) {
  must(lazy.includes(token), `invite migration must include ${token}`);
}
must(lazy.includes("max_uses between 1 and 10000"), "invite cap must be bounded 1..10000");
must(lazy.includes("expiry must be in the future"), "invites must validate expiry");
must(lazy.includes("invite expired") && lazy.includes("invite fully used") && lazy.includes("invite revoked"), "redeem must enforce expiry/cap/revoke");
const orgsRoute = read("app/api/orgs/route.ts");
must(orgsRoute.includes("ensure_default_org") && orgsRoute.includes("is_initialized"), "GET /api/orgs must lazy-provision and surface init state");
const invitesRoute = read("app/api/orgs/[id]/invites/route.ts");
for (const token of ["create_org_invite_link", "revoke_org_invite", "list_org_invites", "max_uses", "expires_at"]) {
  must(invitesRoute.includes(token), `invites route must include ${token}`);
}
const redeemRoute = read("app/api/orgs/invites/redeem/route.ts");
must(redeemRoute.includes("redeem_org_invite"), "redeem route must use the RPC");
must(workspace.includes("0 coins") && workspace.includes("Invite links"), "workspace must explain 0-coin default org + invite links");

console.log("Orgs+Ghost checks OK: watcher + multi-role + 100-org cap + 👻💵 timer/books.");
