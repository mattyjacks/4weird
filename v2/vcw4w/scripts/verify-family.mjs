import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-family: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Family migration: tables, axes, RPCs, grants, no client policies.
const fam = read("supabase/migrations/20260924000002_family_accounts.sql");
for (const token of [
  "kid_accounts", "kid_sessions", "kid_controls", "kid_wallet_ledger", "kid_play_days",
  "family_role", "age_band",
  "create_kid_account", "set_kid_controls", "set_kid_password",
  "fund_kid_wallet", "close_kid_account",
  "kid_session_owner", "kid_in_window", "kid_wallet_balance", "kid_seconds_today",
  "start_kid_session", "heartbeat_kid_session", "end_kid_session",
  "discriminator", "username#1234",
]) {
  must(fam.includes(token), `family migration must include ${token}`);
}
// Children reuse the adult metering tables (attribution, not a fork).
for (const token of ["add column if not exists kid_id", "game_ai_compute_split_numeric"]) {
  must(fam.includes(token), `family migration must include ${token}`);
}
// Kid play RPCs are token-verified for anon callers (kids have no auth.jwt);
// parent management RPCs stay authenticated-only.
must(/grant execute on function public\.start_kid_session.*to anon, authenticated/.test(fam), "start_kid_session must be callable by anon (token-verified)");
must(/grant execute on function public\.heartbeat_kid_session.*to anon, authenticated/.test(fam), "heartbeat_kid_session must be callable by anon (token-verified)");
must(/grant execute on function public\.end_kid_session.*to anon, authenticated/.test(fam), "end_kid_session must be callable by anon (token-verified)");
must(/grant execute on function public\.create_kid_account.*to authenticated/.test(fam), "create_kid_account must be authenticated-only");
must(/grant execute on function public\.fund_kid_wallet.*to authenticated/.test(fam), "fund_kid_wallet must be authenticated-only");
// No client RLS policies on kid tables (service_role + definer RPCs only).
must(!/create policy .* on public\.kid_/.test(fam), "kid tables must have no client RLS policies");
for (const table of ["kid_accounts", "kid_sessions", "kid_controls", "kid_wallet_ledger", "kid_play_days"]) {
  must(fam.includes(`alter table public.${table} enable row level security`), `${table} must have RLS enabled`);
}
// Server-side enforcement must live in SQL, not the client.
for (const token of ["outside allowed play hours", "daily time limit reached", "monthly budget cap reached", "rating blocked for this child account", "insufficient balance"]) {
  must(fam.includes(token), `family RPCs must enforce: ${token}`);
}
must(fam.includes("at time zone"), "hours window must respect the named timezone");

// 2. Warlord migration: widened whitelists + seeded templates.
const war = read("supabase/migrations/20260924000001_warlord_roles.sql");
for (const token of [
  "lord", "captain", "infantry", "banker", "banker_readonly",
  "role_templates_key_check", "org_members_role_key_check", "team_members_role_key_check",
  "org.wallet.spend", "org.billing.manage", "team.members.change_role", "project.pr.merge",
]) {
  must(war.includes(token), `warlord migration must include ${token}`);
}
// Read-only banker must not hold any write/fund/spend/manage key.
const roBlock = war.slice(war.indexOf("('banker_readonly'"));
must(!/wallet\.spend|wallet\.fund|billing\.manage|members\.change_role|spend\.approve|provision/.test(roBlock), "banker_readonly must hold no write permission");
// Lord must not be able to destroy the org or seize SSO.
const lordBlock = war.slice(war.indexOf("'lord'"), war.indexOf("'captain'"));
must(!/org\.delete|org\.sso\.manage/.test(lordBlock), "lord must not hold org.delete or sso.manage");

// 3. Routes exist with the right guards.
const kids = read("app/api/family/kids/route.ts");
for (const token of ["create_kid_account", "hashKidPassword", "discriminator", "MAX_KIDS_PER_PARENT", "handle taken", "rateLimit", "sameOrigin"]) {
  must(kids.includes(token), `family/kids route must include ${token}`);
}
const kidDetail = read("app/api/family/kids/[id]/route.ts");
for (const token of ["set_kid_controls", "set_kid_password", "close_kid_account", "refunded_coins"]) {
  must(kidDetail.includes(token), `family/kids/[id] route must include ${token}`);
}
const login = read("app/api/family/kid-login/route.ts");
for (const token of ["verifyKidPassword", "kid_session", "httpOnly", "Wrong handle or password", "kid-login:"]) {
  must(login.includes(token), `kid-login route must include ${token}`);
}
must(login.includes("slice(5)"), "kid-login must cap live sessions per child");
const logout = read("app/api/family/kid-logout/route.ts");
must(logout.includes("kid_sessions") && logout.includes("delete"), "kid-logout must destroy the session row");
const fund = read("app/api/family/fund/route.ts");
must(fund.includes("fund_kid_wallet"), "fund route must use the atomic funding RPC");
const sessionRoute = read("app/api/games/session/route.ts");
for (const token of ["kidSessionPlay", "start_kid_session", "heartbeat_kid_session", "end_kid_session", "getGameRating"]) {
  must(sessionRoute.includes(token), `games/session route must include ${token}`);
}
must(sessionRoute.includes("SERVER catalog"), "kid min-age must come from the server catalog, never the client");
const roles = read("app/api/orgs/roles/route.ts");
must(roles.includes("role_templates"), "orgs/roles must list role_templates");
const profile = read("app/api/me/profile/route.ts");
for (const token of ["age_band", "family_role", "Close your child accounts first"]) {
  must(profile.includes(token), `me/profile route must include ${token}`);
}

// 4. Secrets never leak: exports and list endpoints exclude hashes/tokens.
const rights = read("app/api/my/rights/route.ts");
must(rights.includes("family"), "rights export must include family data");
must(!/select\("password_hash|select\("token_hash|"password_hash"|"token_hash"/.test(rights), "rights export must never select kid secrets");
must(!/select\("[^"]*password_hash|select\("[^"]*token_hash/.test(kids), "kids list must never select secrets");

// 5. Crypto lives in the route (scrypt), never plaintext, never in SQL logs.
const crypto = read("lib/kid-session.ts");
for (const token of ["scryptSync", "timingSafeEqual", "randomBytes(32)", "sha256", "httpOnly", "sameSite"]) {
  must(crypto.includes(token), `lib/kid-session.ts must include ${token}`);
}
must(!/console\.log/.test(kids + login), "family routes must not log credentials");

// 6. UI: parent dashboard, kid login, banner, account wiring, enforcement.
const dash = read("components/family/parent-dashboard.tsx");
for (const token of ["username#1234", "daily_minutes", "allowed_start", "allowed_end", "monthly_cap_coins", "hard_stop", "fund", "Suspend", "Close + refund", "reset", "seconds_today"]) {
  must(dash.toLowerCase().includes(token.toLowerCase()), `parent-dashboard must include ${token}`);
}
const form = read("components/family/kid-login-form.tsx");
must(form.includes("name#1234") && form.includes("/api/family/kid-login"), "kid-login-form must post handle + password");
const banner = read("components/family/kid-banner.tsx");
for (const token of ["kid-logout", "Switch player", "Daily time is up", "Outside play hours"]) {
  must(banner.includes(token), `kid-banner must include ${token}`);
}
const hub = read("components/account/account-hub.tsx");
must(hub.includes("ParentDashboard") && hub.includes('"family"'), "account hub must mount the Family tab");
const accountDash = read("components/account/account-dashboard.tsx");
must(accountDash.includes("age_band") && accountDash.includes("family_role"), "account dashboard must edit age band + family role");
const shell = read("components/games/play-gate.tsx");
for (const token of ["kid-rating", "kid-hours", "kid-timeup", "KidBanner", "bandMinAge", "fail CLOSED"]) {
  must(shell.includes(token), `play-gate must include ${token}`);
}
const catalog = read("components/games/game-catalog.tsx");
must(catalog.includes("kidMaxAge") && catalog.includes("KidBanner"), "catalog must filter by child band + show the banner");
const loginPage = read("app/family/login/page.tsx");
must(loginPage.includes("KidLoginForm"), "family login page must render KidLoginForm");

// 7. Handle parsing spot-checks (mirror of lib/family.ts).
function parseKidHandle(v) {
  const s = String(v ?? "").trim().toLowerCase();
  const h = s.lastIndexOf("#");
  if (h <= 0) return null;
  const u = s.slice(0, h), d = s.slice(h + 1);
  if (!/^[a-z0-9_-]{3,24}$/.test(u) || !/^[0-9]{4}$/.test(d)) return null;
  return { username: u, discriminator: d };
}
must(JSON.stringify(parseKidHandle("Sparky#1234")) === JSON.stringify({ username: "sparky", discriminator: "1234" }), "handle parse must lowercase + split");
must(parseKidHandle("ab#1234") === null, "short username must reject");
must(parseKidHandle("sparky#123") === null, "3-digit discriminator must reject");
must(parseKidHandle("sparky1234") === null, "missing # must reject");
must(parseKidHandle("#1234") === null, "empty username must reject");

// 8. Legal copy: family section in terms + privacy, warlord ranks in terms.
const terms = read("app/terms/page.tsx");
for (const token of ["4B. Parent and Child accounts", "username#1234", "daily play-time limit", "allowed play hours", "monthly coin budget", "Lord", "Captain", "Infantry", "Banker"]) {
  must(terms.includes(token), `terms must include ${token}`);
}
const privacy = read("app/privacy/page.tsx");
for (const token of ["Family accounts.", "scrypt hashes only", "no birth dates on file"]) {
  must(privacy.includes(token), `privacy policy must include ${token}`);
}

// 9. No sexual content anywhere in the new surfaces.
for (const [path, body] of [["lib/family.ts", read("lib/family.ts")], ["parent-dashboard", dash], ["terms-4B", terms]]) {
  must(!/porn|hentai|nsfw|erotic|sex game/i.test(body), `${path} must not describe sexual content`);
}

console.log("Family checks OK: parent/child auth + controls + wallet + warlord ranks.");
