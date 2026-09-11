import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

const mig = read("../supabase/migrations/20260912000000_clan_types_upkeep_valleynet_runpod.sql");
const economy = read("../lib/economy.ts");
const costs = read("../lib/clan-costs.ts");
const types = read("../lib/clan-types.ts");
const markdown = read("../lib/markdown.ts");
const markdownView = read("../components/clans/markdown-view.tsx");
const markdownEditor = read("../components/clans/markdown-editor.tsx");
const clanPage = read("../components/clans/clan-page.tsx");
const clanBrowser = read("../components/clans/clan-browser.tsx");
const valleynet = read("../lib/valleynet.ts");
const xp = read("../lib/clan-xp.ts");
const runpod = read("../lib/runpod.ts");
const fees = read("../lib/clan-fees.ts");
const env = read("../.env.example");

// --- Migration: clan types -------------------------------------------------
for (const t of ["'hclan'", "'sclan'", "'bclan'"]) {
  if (!mig.includes(t)) fail(`Migration must define clan type ${t}.`);
}
if (!mig.includes("clan_type") || !mig.includes("set_clan_type")) {
  fail("Migration must add clan_type and the set_clan_type RPC.");
}
if (!mig.includes("p_description, 'sclan'")) {
  fail("Migration must wrap the legacy 3-arg create_clan overload.");
}

// --- Migration: upkeep economy tables + RPCs --------------------------------
for (const table of [
  "clan_wallets",
  "clan_cost_ledger",
  "clan_monetization",
  "clan_bots",
  "valleynet_actions",
  "clan_xp_ledger",
  "clan_badges",
  "runpod_usage",
]) {
  if (!mig.includes(`create table if not exists public.${table}`)) {
    fail(`Migration must create ${table}.`);
  }
}
for (const rpc of [
  "meter_clan_posting_fee",
  "meter_clan_posting_fee_for",
  "accrue_clan_upkeep",
  "fund_clan_wallet",
  "credit_clan_channel_revenue",
  "award_clan_xp",
  "clan_leaderboard",
  "deploy_clan_bot",
  "remove_clan_bot",
  "add_clan_channel",
]) {
  if (!mig.includes(rpc)) fail(`Migration must define ${rpc}.`);
}
// Minimum fee 1 centicentcoin + 25% cut, mirrored from lib/clan-costs.ts.
if (!mig.includes("greatest(0.01")) fail("Fee RPCs must enforce the 0.01 minimum.");
if (!mig.includes("round(v_fee * 25 / 100.0, 2)")) fail("Fee RPCs must split the 25% cut.");
// hclan deploys refused; delinquent clans refuse writes.
if (!mig.includes("hclans are human-only")) fail("deploy_clan_bot must refuse hclans.");
if (!mig.includes("clan upkeep delinquent")) fail("Fee RPCs must refuse delinquent clans.");
// service_role-only twin (spoof-proof bot fees).
if (!mig.includes("to service_role")) fail("meter_clan_posting_fee_for must be service_role-only.");
// valleynet_actions: no client read policy (admin via service role).
if (/create policy \S+ on public\.valleynet_actions/i.test(mig)) {
  fail("valleynet_actions must have no client read policy.");
}
// runpod_usage: owner-only reads.
if (!mig.includes("runpod_usage_owner_read")) fail("runpod_usage needs the owner-read policy.");

// --- Economy single source ---------------------------------------------------
if (!economy.includes("CLAN_COMPUTE_CUT_PCT = 25")) fail("Clan cut must be 25%.");
if (!economy.includes("clanComputeSplit")) fail("economy.ts must export clanComputeSplit.");

// --- Cost card ---------------------------------------------------------------
if (!costs.includes("CLAN_MIN_POST_FEE_COINS = 0.01")) fail("Min post fee must be 0.01.");
if (!costs.includes("clanPostingFee") || !costs.includes("clanDailyUpkeep")) {
  fail("clan-costs.ts must export the fee + upkeep formulas.");
}
if (!costs.includes("CLAN_AD_VIEW_COINS = 0.01") || !costs.includes("CLAN_AFFILIATE_CLICK_COINS = 0.05")) {
  fail("Revenue rates must be published in clan-costs.ts.");
}

// --- Clan types ----------------------------------------------------------------
if (!types.includes('"hclan"') || !types.includes('"sclan"') || !types.includes('"bclan"')) {
  fail("clan-types.ts must define hclan/sclan/bclan.");
}
if (!types.includes("botsRefused") || !types.includes("botDeploysAllowed")) {
  fail("clan-types.ts must export the bot-access rules.");
}

// --- Markdown (escape-first, no raw HTML) --------------------------------------
if (!markdown.includes("renderMarkdownSafe")) fail("markdown.ts must export renderMarkdownSafe.");
if (!markdown.includes("escapeHtml(part)")) fail("markdown.ts must escape before transforming.");
if (markdown.includes("dangerouslySetInnerHTML")) fail("markdown lib must not touch the DOM.");
if (!markdownView.includes("renderMarkdownSafe")) fail("MarkdownView must render via renderMarkdownSafe.");
if (!markdownEditor.includes("Preview")) fail("MarkdownEditor must have Write/Preview tabs.");
if (clanPage.includes("dangerouslySetInnerHTML")) {
  fail("ClanPage must render bodies via MarkdownView, not raw HTML.");
}
if (!clanPage.includes("MarkdownEditor") || !clanPage.includes("MarkdownView")) {
  fail("ClanPage must use the markdown editor + view.");
}
if (clanPage.includes("whitespace-pre-wrap")) fail("ClanPage must not render plain pre-wrap bodies.");

// --- Valley Net ------------------------------------------------------------------
if (!valleynet.includes('VALLEYNET_NAME = "Valley Net"')) fail("Valley Net must be named.");
if (!valleynet.includes("valleynetCheck") || !valleynet.includes("logValleynetAction")) {
  fail("valleynet.ts must export check + audit log.");
}
for (const v of ["allow", "quarantine", "block"]) {
  if (!valleynet.includes(`"${v}"`)) fail(`Valley Net must define the ${v} verdict.`);
}
if (!clanPage.includes("Valley Net")) fail("ClanPage must show the Valley Net badge.");

// --- XP / gamification -------------------------------------------------------------
if (!xp.includes("CLAN_XP_POST = 10") || !xp.includes("CLAN_XP_COMMENT = 3")) {
  fail("clan-xp.ts must define post/comment XP.");
}
if (!xp.includes("clanLevelForXp") || !xp.includes("Legend of the Weird")) {
  fail("clan-xp.ts must define levels up to Legend of the Weird.");
}
if (!clanPage.includes("leaderboard") && !clanPage.includes("Leaderboard")) {
  fail("ClanPage must show the XP leaderboard.");
}

// --- RunPod (real API, never faked) ---------------------------------------------------
if (!runpod.includes("RUNPOD_API_KEY")) fail("runpod.ts must read RUNPOD_API_KEY.");
if (!runpod.includes("api.runpod.io/v2")) fail("runpod.ts must default to the v2 REST base.");
if (!runpod.includes("/billing/")) fail("runpod.ts must hit the billing endpoints.");
if (!runpod.includes("Bearer")) fail("runpod.ts must use Bearer auth.");
if (!runpod.includes("runpodUsdToCoins")) fail("runpod.ts must export the USD→coin display conversion.");
if (!runpod.includes("ok: false")) fail("runpod.ts must surface failures, never synthesize rows.");
if (!fees.includes("meter_clan_posting_fee_for")) fail("clan-fees.ts must call the service_role twin.");
const status = read("../app/api/agents/runpod-status/route.ts");
const sync = read("../app/api/agents/runpod-sync/route.ts");
if (!status.includes("runpodConfigured") || !status.includes("fetchRunpodBilling")) {
  fail("runpod-status must prove the key live with a read-only billing probe.");
}
if (!sync.includes("runpod_usage") || !sync.includes("POST /api/agents/runpod-sync")) {
  fail("runpod-sync must mirror real billing rows into runpod_usage.");
}
const usage = read("../app/api/my/usage/route.ts");
if (!usage.includes("runpod_usage") || !usage.includes("runpodUsdToCoins")) {
  fail("/api/my/usage must include the RunPod mirror section.");
}
// Every clan cost is tracked: personal fees/funding/donations break out in
// /api/my/usage (never hidden inside generic coin movements).
if (!usage.includes("my_clan_usage") || !usage.includes("byReason") || !usage.includes("Clan %")) {
  fail("/api/my/usage must break out clan fees/funding/donations via my_clan_usage.");
}
const usageClient = read("../app/my/usage/usage-client.tsx");
if (!usageClient.includes("runpod-sync") || !usageClient.includes("Sync from RunPod")) {
  fail("usage-client must offer the RunPod sync + card.");
}
if (!env.includes("RUNPOD_API_KEY=")) fail(".env.example must document RUNPOD_API_KEY.");

// --- Human clan routes ---------------------------------------------------------------
const clansRoute = read("../app/api/clans/route.ts");
if (!clansRoute.includes("clan_type") || !clansRoute.includes("p_clan_type")) {
  fail("Clan list/create must carry clan_type.");
}
const clanDetail = read("../app/api/clans/[slug]/route.ts");
for (const token of ["accrue_clan_minute_upkeep", "clan_leaderboard", "clan_bots", "clan_wallets"]) {
  if (!clanDetail.includes(token)) fail(`Clan detail must include ${token}.`);
}
const humanPost = read("../app/api/clans/[slug]/post/route.ts");
for (const token of ["valleynetCheck", "meter_clan_posting_fee", "award_clan_xp", "logValleynetAction"]) {
  if (!humanPost.includes(token)) fail(`Human post route must use ${token}.`);
}
const humanComment = read("../app/api/clans/post/[id]/comment/route.ts");
for (const token of ["valleynetCheck", "meter_clan_posting_fee", "award_clan_xp"]) {
  if (!humanComment.includes(token)) fail(`Human comment route must use ${token}.`);
}
const botsRoute = read("../app/api/clans/[slug]/bots/route.ts");
if (!botsRoute.includes("deploy_clan_bot") || !botsRoute.includes("remove_clan_bot")) {
  fail("Clan bots route must deploy/remove via RPCs.");
}
if (!botsRoute.includes("hclans are human-only")) fail("Clan bots route must refuse hclans.");
const econRoute = read("../app/api/clans/[slug]/economy/route.ts");
for (const token of ["fund_clan_wallet", "donate_clan_upkeep", "add_clan_channel", "set_clan_type", "credit_clan_channel_revenue"]) {
  if (!econRoute.includes(token)) fail(`Clan economy route must use ${token}.`);
}
if (!clanBrowser.includes('?type=') || !clanBrowser.includes("clan_type")) {
  fail("ClanBrowser must filter + badge by clan type.");
}

// --- Bot routes: hclan hardening ---------------------------------------------------------
const botList = read("../app/api/bot/bclans/route.ts");
if (!botList.includes('neq("clan_type", "hclan")')) fail("Bot list must hide hclans.");
const botDetail = read("../app/api/bot/bclans/[slug]/route.ts");
if (!botDetail.includes('clan_type === "hclan"')) fail("Bot detail must 404 hclans.");
const botJoin = read("../app/api/bot/bclans/join/route.ts");
if (!botJoin.includes("hclans are human-only")) fail("Bot join must refuse hclans.");
const botPost = read("../app/api/bot/bclans/[slug]/post/route.ts");
for (const token of ["hclans are human-only", "valleynetCheck", "chargeClanFeeAs"]) {
  if (!botPost.includes(token)) fail(`Bot post route must include ${token}.`);
}
const botComment = read("../app/api/bot/bclans/post/[id]/comment/route.ts");
for (const token of ["hclans are human-only", "valleynetCheck", "chargeClanFeeAs"]) {
  if (!botComment.includes(token)) fail(`Bot comment route must include ${token}.`);
}

// --- Clans v3: discord social + per-minute upkeep --------------------------------
const mig3 = read("../supabase/migrations/20260916000000_clan_social_perminute.sql");
for (const table of [
  "clan_channels",
  "clan_messages",
  "clan_message_reactions",
  "clan_roles",
  "clan_member_roles",
  "clan_events",
  "clan_channel_reads",
  "clan_ai_usage",
  "clan_transfer_log",
  "clan_upkeep_state",
]) {
  if (!mig3.includes(`create table if not exists public.${table}`)) {
    fail(`v3 migration must create ${table}.`);
  }
}
for (const rpc of [
  "clan_minute_rate",
  "accrue_clan_minute_upkeep",
  "accrue_all_clan_minute_upkeep",
  "donate_clan_upkeep",
  "log_clan_ai_usage",
  "log_clan_transfer",
  "create_clan_channel",
  "post_clan_message",
  "toggle_clan_reaction",
  "set_clan_message_pin",
  "edit_clan_message",
  "delete_clan_message",
  "create_clan_event",
  "create_clan_role",
  "assign_clan_role",
  "set_clan_member_role",
  "mark_channel_read",
  "clan_is_moderator",
]) {
  if (!mig3.includes(rpc)) fail(`v3 migration must define ${rpc}.`);
}
// Prerequisite guard: v3 extends the v2 economy, so it must fail fast with
// an actionable message (not cryptic 42P01) when run before 20260912000000.
if (!mig3.includes("PREREQUISITE MISSING") || !mig3.includes("20260912000000_clan_types_upkeep_valleynet_runpod.sql")) {
  fail("v3 migration must guard on the v2 prerequisite (clan_cost_ledger/clan_wallets).");
}
// substr() takes comma args only — the FROM/FOR truncate form is
// substring()-only, so substr(x from 1 for N) is a 42601 syntax error.
for (const [name, src] of [["v2", mig], ["v3", mig3]]) {
  if (/substr\([^)]*\bfrom\b/i.test(src)) fail(`${name} migration must not use substr() with FROM/FOR (42601).`);
}
// Minute-anchored billing: whole-minute steps from a :00 cursor.
if (!mig3.includes("date_trunc('minute'")) fail("Per-minute upkeep must anchor to :00 minute boundaries.");
if (!mig3.includes("pending_micro")) fail("Sub-cent fractions must park in clan_upkeep_state.");
// Fee RPCs accept message writes.
if (!mig3.includes("'post', 'comment', 'message'")) fail("Fee RPCs must accept the message kind.");
// Grace advances the clock (no 14-day catch-up bill).
if (!mig3.includes("join the clan first")) fail("donate_clan_upkeep must require membership.");
// Per-minute cost card mirrors the SQL rates.
for (const token of [
  "CLAN_PER_MIN_BASE_COINS",
  "CLAN_PER_MIN_PER_MEMBER_COINS",
  "CLAN_PER_MIN_PER_IMAGE_MB_COINS",
  "CLAN_PER_MIN_PER_DB_KB_COINS",
  "CLAN_PER_KB_BANDWIDTH_COINS",
  "CLAN_LUNA_CHECK_COINS",
  "clanMinuteRate",
  "clanBandwidthCost",
]) {
  if (!costs.includes(token)) fail(`clan-costs.ts must define ${token}.`);
}
// Metering helpers + Luna single-check (no duplicate moderateText calls).
const meter = read("../lib/clan-meter.ts");
if (!meter.includes("meterLunaCheck") || !meter.includes("meterTransfer")) {
  fail("clan-meter.ts must export meterLunaCheck + meterTransfer.");
}
if (humanPost.includes("moderateText(")) fail("Human post must not double-call Luna (valleynetCheck meters one check).");
if (!humanPost.includes("meterLunaCheck")) fail("Human post must meter its Luna check.");
const humanCommentRoute = read("../app/api/clans/post/[id]/comment/route.ts");
if (!humanCommentRoute.includes("meterLunaCheck")) fail("Human comment must meter its Luna check.");
// Cron: every minute at :00, secret-gated, service-role fan-out.
const cron = read("../app/api/cron/clan-upkeep/route.ts");
if (!cron.includes("accrue_all_clan_minute_upkeep")) fail("Cron must fan out via accrue_all_clan_minute_upkeep.");
if (!cron.includes("CRON_SECRET")) fail("Cron must be CRON_SECRET-gated.");
const vercel = read("../vercel.json");
if (!vercel.includes("/api/cron/clan-upkeep") || !vercel.includes("* * * * *")) {
  fail("vercel.json must schedule /api/cron/clan-upkeep every minute.");
}
// Discord API surfaces.
const chanRoute = read("../app/api/clans/[slug]/channels/route.ts");
if (!chanRoute.includes("create_clan_channel")) fail("Channels route must create via RPC.");
const msgRoute = read("../app/api/clans/[slug]/channels/[channel]/route.ts");
for (const token of ["valleynetCheck", "meterLunaCheck", "post_clan_message", "meterTransfer"]) {
  if (!msgRoute.includes(token)) fail(`Message route must include ${token}.`);
}
if (!msgRoute.includes('p_kind: "message"')) fail("Message send must charge the message fee kind.");
const msgAct = read("../app/api/clans/[slug]/messages/[id]/route.ts");
for (const token of ["toggle_clan_reaction", "set_clan_message_pin", "edit_clan_message", "delete_clan_message"]) {
  if (!msgAct.includes(token)) fail(`Message actions route must use ${token}.`);
}
const evRoute = read("../app/api/clans/[slug]/events/route.ts");
if (!evRoute.includes("create_clan_event")) fail("Events route must schedule via RPC.");
const roleRoute = read("../app/api/clans/[slug]/roles/route.ts");
for (const token of ["create_clan_role", "assign_clan_role", "set_clan_member_role"]) {
  if (!roleRoute.includes(token)) fail(`Roles route must use ${token}.`);
}
const discord = read("../components/clans/clan-discord.tsx");
for (const token of ["ClanDiscord", "setActiveId", "loadMessages", "5000"]) {
  if (!discord.includes(token)) fail(`ClanDiscord component must include ${token}.`);
}
if (!clanPage.includes("ClanDiscord")) fail("ClanPage must embed the ClanDiscord chat.");
if (!clanPage.includes("donate")) fail("ClanPage must offer member donations.");
if (!clanPage.includes("minuteRate") && !clanPage.includes("per_minute")) {
  fail("ClanPage must show the live per-minute server rate.");
}
if (!env.includes("CRON_SECRET=")) fail(".env.example must document CRON_SECRET.");

console.log("Clan economy integrity OK.");
