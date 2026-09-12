import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-scale-tribute: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// The stock substr-FROM regex false-positives on string literals
// ("tribute from the commons"), so strip quotes before checking.
function noSubstrFrom(src, name) {
  const stripped = src.replace(/'(?:[^']|'')*'/g, "''");
  must(!/substr\([^)]*\bfrom\b/i.test(stripped), `${name} must not use substr() with FROM/FOR (42601)`);
}

const mig = read("supabase/migrations/20261015000100_scale_prune_tribute.sql");
noSubstrFrom(mig, "scale migration");

// 1. Caps: 10k orgs (+seats override), 100k clans, exact + race-safe.
for (const token of ["10000", "100000", "self_host_licenses", "org_member_cap", "clan_member_cap", "set_self_host_seats"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("pg_advisory_xact_lock"), "cap triggers must serialize joins per community");
must(mig.includes("organization member limit reached") && mig.includes("clan member limit reached"), "cap triggers must refuse with limit-reached errors");
must(mig.includes("self-hosted orgs grow by seats"), "self-hosted orgs must grow by seats, not headroom");

// 2. Cached counters + backfill + paginated rosters.
for (const token of ["member_count", "bump_org_member_count", "bump_clan_member_count", "org_roster_page", "clan_roster_page"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("limit v_limit + 1"), "roster pages must fetch limit+1 to detect the next page");
must(mig.includes("least(coalesce(p_limit, 25), 100)") || mig.includes("least(coalesce(p_limit, 100), 100)"), "roster limits must clamp to 100");

// 3. Pruning: settings, strategies, owner immunity, grace, dry-run, auto.
for (const token of ["org_prune_settings", "clan_prune_settings", "prune_org_members", "prune_clan_members", "run_org_auto_prune", "run_clan_auto_prune"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
for (const s of ["oldest_activity_first", "random_chance", "oldest_joined_first", "never_contributed"]) {
  must(mig.includes(s), `migration must include strategy ${s}`);
}
must(mig.includes("m.user_id <> v_owner"), "pruning must never remove the owner");
must(mig.includes("interval '7 days'"), "strategy sweeps must spare joins younger than 7 days");
must(mig.includes("p_dry_run"), "pruning must support dry_run previews");
must(mig.includes("p_user_ids"), "creators must be able to prune targeted members");
must(mig.includes("9000") && mig.includes("90000"), "auto-prune must arm at 9000 org / 90000 clan members");
must(mig.includes("grant execute on function public.run_org_auto_prune() to service_role"), "org auto-prune must be service_role-only");
must(mig.includes("grant execute on function public.run_clan_auto_prune() to service_role"), "clan auto-prune must be service_role-only");
must(mig.includes("coalesce(s.auto_enabled, true)"), "clan auto-prune must default ON for clans without settings rows");

// 4. Headroom: simple flat prices, 25% cut included, receipts.
for (const token of ["buy_org_headroom", "buy_clan_headroom", "scale_purchases", "org_scale_status", "clan_scale_status"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("v_slots * 0.10") && mig.includes("v_slots * 0.01"), "headroom must price 10 coins / 100 org slots and / 1000 clan slots");
must(mig.includes("round(v_gross * 25 / 100.0, 2)"), "headroom must include the 25% cut");

// 5. Donations + vintages: receipts, mixed lots, expiry-tied.
for (const token of ["clan_donations", "clan_donation_vintages", "coin_lot_spends", "eligible_at", "donate_clan_upkeep", "fund_clan_wallet"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("eligible_at = donated_at + interval '6 months'"), "vintages must age 6 months before tribute");
must(mig.includes("returning id into v_debit_id"), "donate/fund must capture the debit to split mixed lots");

// 6. Supporter status + tiers.
for (const token of ["clan_supporter_status", "clan_supporter_tier", "Ember", "Spark", "Beacon", "Patron", "Legend"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("2500") && mig.includes("500") && mig.includes("100") && mig.includes("25"), "supporter tiers must be 1/25/100/500/2500");

// 7. Tribute commons: kinds, reserve, ledger, 50% cap, 1%/day, phases.
for (const token of ["tribute-in", "tribute-out", "globalized", "reserve-rescue-in", "global_clan_reserve", "tribute_ledger", "clan_tribute_totals", "run_clan_tribute_sweep", "clan_tribute_status"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
must(mig.includes("* 0.5") || mig.includes("*0.5"), "tribute must cap at 50% of all donated coins");
must(mig.includes("* 0.01"), "tribute must move ~1% of the eligible surplus per day");
must(mig.includes("interval '12 months'"), "coins older than 12 months must globalize");
must(mig.includes("0.70") && mig.includes("0.20"), "tribute must split 70% poor clans / 20% reserve / 10% people");
must(mig.includes("status = 'expired'"), "expired lots must be marked expired and stay home");
must(mig.includes("grant execute on function public.run_clan_tribute_sweep() to service_role"), "tribute sweep must be service_role-only");

// 8. Money-table discipline: reads/writes via existing triggers only —
// no DDL on the coin tables, ever.
must(!/alter table public\.coin_ledger|alter table public\.coin_lots|create table .*coin_ledger|create table .*coin_lots|drop .*coin_lots/i.test(mig), "scale migration must never ALTER/CREATE/DROP coin tables");

// 9. Routes.
const orgScale = read("app/api/orgs/[id]/scale/route.ts");
for (const token of ["org_scale_status", "prune_org_members", "buy_org_headroom", "set_org_prune_settings", "dry_run"]) {
  must(orgScale.includes(token), `org scale route must include ${token}`);
}
const clanScale = read("app/api/clans/[slug]/scale/route.ts");
for (const token of ["clan_scale_status", "clan_supporter_status", "clan_tribute_status", "prune_clan_members", "buy_clan_headroom", "set_clan_prune_settings"]) {
  must(clanScale.includes(token), `clan scale route must include ${token}`);
}
const tributeCron = read("app/api/cron/clan-tribute/route.ts");
must(tributeCron.includes("run_clan_tribute_sweep") && tributeCron.includes("CRON_SECRET"), "tribute cron must sweep secret-gated");
const sweepCron = read("app/api/cron/scale-sweep/route.ts");
must(sweepCron.includes("run_org_auto_prune") && sweepCron.includes("run_clan_auto_prune") && sweepCron.includes("CRON_SECRET"), "scale sweep must prune both kinds secret-gated");
const members = read("app/api/orgs/[id]/members/route.ts");
must(members.includes("org_roster_page") && members.includes("paged") && members.includes("has_more"), "members route must serve keyset pages");
const detail = read("app/api/clans/[slug]/route.ts");
must(detail.includes("clan_roster_page") && detail.includes("member_count"), "clan detail must use the cached count + roster page");
const channels = read("app/api/clans/[slug]/channels/route.ts");
must(channels.includes("member_total"), "channels route must report the cached member total");
const join = read("app/api/clans/[slug]/route.ts");
must(join.includes("member limit reached") && join.includes("409"), "clan join must map full clans to 409");
const redeem = read("app/api/orgs/invites/redeem/route.ts");
must(redeem.includes("member limit reached"), "org redeem must map full orgs to 409");
const econ = read("app/api/clans/[slug]/economy/route.ts");
must(econ.includes("clan_supporter_status") && econ.includes("clan_tribute_status"), "economy must carry supporters + tribute");
const vercel = read("vercel.json");
must(vercel.includes("/api/cron/clan-tribute") && vercel.includes("/api/cron/scale-sweep"), "vercel.json must schedule both sweeps");

// 10. Shared cost constants mirror the SQL.
const costs = read("lib/clan-costs.ts");
for (const token of ["ORG_MEMBER_BASE_CAP = 10000", "CLAN_MEMBER_BASE_CAP = 100000", "ORG_PRUNE_THRESHOLD = 9000", "CLAN_PRUNE_THRESHOLD = 90000", "ORG_HEADROOM_COINS_PER_100_SLOTS = 10", "CLAN_HEADROOM_COINS_PER_1000_SLOTS = 10", "TRIBUTE_LIFETIME_CAP_PCT = 50", "TRIBUTE_DAILY_RATE_PCT = 1", "tributeHalfLifeDays", "orgHeadroomPrice", "clanHeadroomPrice"]) {
  must(costs.includes(token), `clan-costs.ts must define ${token}`);
}

// 11. UI mounts.
const workspace = read("components/teams/team-workspace.tsx");
must(workspace.includes("OrgScale"), "workspace must mount OrgScale");
const ranks = read("components/teams/org-ranks.tsx");
must(ranks.includes("paged") && ranks.includes("hasMore") && ranks.includes("Load 100 more"), "OrgRanks must page the roster");
const support = read("components/clans/clan-support.tsx");
for (const token of ["ClanSupport", "/api/clans/", "/scale", "Supporter Status", "Globalized", "Given as Tribute", "Prune now", "Buy slots"]) {
  must(support.includes(token), `clan-support must include ${token}`);
}
const clanPage = read("components/clans/clan-page.tsx");
must(clanPage.includes("ClanSupport"), "ClanPage must mount ClanSupport");
const clanChat = read("components/clans/clan-chat.tsx");
must(clanChat.includes("member_total") && clanChat.includes("showing"), "ClanChat must show the cached total");

// 12. Pricing + LICENSE move together (the rule: pricing updates update the license).
const pricing = read("app/pricing/page.tsx");
for (const token of ["10,000", "100,000", "purchased seats", "10 coins per 100", "10 coins per 1,000", "69-day half-life", "globalize", "Tribute commons"]) {
  must(pricing.includes(token), `pricing must explain ${token}`);
}
const license = read("../../LICENSE");
must(license.includes("v1.1"), "LICENSE must bump to v1.1 with the pricing update");
for (const token of ["10,000 members", "100,000 members", "purchased seats", "10 coins per 100 slots", "10 coins per 1,000 slots", "69-day half-life", "Globalized", "Given as Tribute", "50% of all donated"]) {
  must(license.includes(token), `LICENSE must mirror ${token}`);
}
const terms = read("app/terms/page.tsx");
must(terms.includes("8D. Big communities"), "terms must carry the 8D commons clause");
for (const token of ["10,000 members", "100,000 members", "Pruning consent", "Globalized", "Given as Tribute", "50% of all donated"]) {
  must(terms.includes(token), `terms must include ${token}`);
}

// 13. No sexual content in the new surfaces.
for (const [path, body] of [["clan-support", support], ["org-scale", read("components/teams/org-scale.tsx")], ["scale-migration", mig]]) {
  must(!/porn|hentai|nsfw|erotic|sex game/i.test(body), `${path} must not describe sexual content`);
}

console.log("Scale+tribute checks OK: 10k orgs / 100k clans, pruning, headroom, supporters, tribute commons.");
