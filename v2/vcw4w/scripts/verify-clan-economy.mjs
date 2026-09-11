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
for (const token of ["accrue_clan_upkeep", "clan_leaderboard", "clan_bots", "clan_wallets"]) {
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
for (const token of ["fund_clan_wallet", "add_clan_channel", "set_clan_type", "credit_clan_channel_revenue"]) {
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

console.log("Clan economy integrity OK.");
