import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

const mig = read("../supabase/migrations/20260922000000_support_launch_fundraisers.sql");
const support = read("../lib/support.ts");
const tiers = read("../app/api/support/tiers/route.ts");
const subscribe = read("../app/api/support/subscribe/route.ts");
const tip = read("../app/api/support/tip/route.ts");
const verification = read("../app/api/verification/route.ts");
const fundraisers = read("../app/api/fundraisers/route.ts");
const detail = read("../app/api/fundraisers/[id]/route.ts");
const contribute = read("../app/api/fundraisers/[id]/contribute/route.ts");
const close = read("../app/api/fundraisers/[id]/close/route.ts");
const cron = read("../app/api/cron/support-renewals/route.ts");
const supportPage = read("../app/support/page.tsx");
const supportClient = read("../components/support/support-client.tsx");
const fraisersPage = read("../app/fundraisers/page.tsx");
const browser = read("../components/fundraisers/fundraiser-browser.tsx");
const fraiserDetail = read("../app/fundraisers/[id]/page.tsx");
const detailClient = read("../components/fundraisers/fundraiser-detail.tsx");
const terms = read("../app/terms/page.tsx");
const privacy = read("../app/privacy/page.tsx");
const docs = read("../app/docs/support-launches/page.tsx");
const vercel = read("../vercel.json");

// --- Migration: tables -------------------------------------------------------
for (const table of [
  "verification_requests",
  "support_tiers",
  "support_subscriptions",
  "support_payments",
  "launch_campaigns",
  "launch_contributions",
]) {
  if (!mig.includes(`create table if not exists public.${table}`)) {
    fail(`Migration must create ${table}.`);
  }
}
if (!mig.includes("is_verified")) fail("Migration must add profiles.is_verified.");
if (!mig.includes("verification is admin-set")) fail("Verification flag must be admin-set only.");

// --- Migration: RPCs ----------------------------------------------------------
for (const rpc of [
  "support_split",
  "support_credit",
  "request_verification",
  "tip_creator",
  "create_support_tier",
  "subscribe_to_tier",
  "cancel_subscription",
  "renew_support_subscriptions",
  "create_launch_campaign",
  "contribute_launch_campaign",
  "close_launch_campaign",
  "launch_campaign_progress",
]) {
  if (!mig.includes(rpc)) fail(`Migration must define ${rpc}.`);
}

// --- Money safety --------------------------------------------------------------
// 25% cut included, closed-loop (no cash-out), verified recipients, no self-pay.
if (!mig.includes("round(p_gross * 25 / 100.0, 2)")) fail("Support split must take the 25% cut.");
if (!mig.includes("recipient is not a verified creator")) fail("Personal support must require verification.");
if (!mig.includes("you cannot support yourself")) fail("Support must refuse self-pay.");
if (!mig.includes("you cannot back your own campaign")) fail("Campaigns must refuse self-backing.");
if (!mig.includes("to service_role")) fail("Renewal RPC must be service_role-only.");
if (!mig.includes("past_due")) fail("Renewals must lapse to past_due instead of negative balances.");
// Clan ledger kinds widened for attribution (never hidden inside upkeep).
for (const kind of ["support-tip", "support-subscription", "launch-contribution"]) {
  if (!mig.includes(`'${kind}'`)) fail(`Clan ledger must attribute ${kind}.`);
}
// Creative-projects-only guard: charity/medical/investment language rejected.
for (const token of ["game-launch", "startup", "creative-tech", "charit", "tax[- ]?deduct", "revenue share", "profit share"]) {
  if (!mig.includes(token)) fail(`Campaign guard must cover ${token}.`);
}
// Amount bounds + XOR recipient checks.
if (!mig.includes("1..100000")) fail("Support amounts must be bounded 1..100000.");
if (!mig.includes("one recipient only")) fail("Tips must target exactly one recipient.");
if (!mig.includes("PREREQUISITE MISSING") && mig.includes("clan_cost_ledger")) {
  // Informational only: this migration widens the v2/v3 ledger kinds, so it
  // must run after the clan economy migrations (filename order guarantees it).
}

// --- Shared lib -----------------------------------------------------------------
if (!support.includes("SUPPORT_CUT_PCT")) fail("support.ts must define SUPPORT_CUT_PCT.");
if (!support.includes("supportSplit")) fail("support.ts must export supportSplit.");
if (!support.includes("Not a charity")) fail("support.ts must carry the non-charity disclaimer.");
if (!support.includes("no equity")) fail("support.ts must disclaim investments.");
if (!support.includes("LAUNCH_CATEGORIES")) fail("support.ts must define launch categories.");

// --- API routes -------------------------------------------------------------------
for (const [name, src] of [["tiers", tiers], ["subscribe", subscribe], ["tip", tip], ["verification", verification], ["fundraisers", fundraisers], ["contribute", contribute], ["close", close]]) {
  if (!src.includes('force-dynamic')) fail(`${name} route must be force-dynamic.`);
  if (!src.includes("rateLimit")) fail(`${name} route must rate-limit.`);
}
if (!detail.includes('force-dynamic')) fail("detail route must be force-dynamic.");
// Public GETs (tier catalog, campaign catalog/detail) stay unauthenticated like
// the clan economy GET; every mutation above is authenticated + rate-limited.
if (!tiers.includes("create_support_tier")) fail("Tiers route must create via RPC.");
if (!subscribe.includes("subscribe_to_tier") || !subscribe.includes("cancel_subscription")) {
  fail("Subscribe route must subscribe + cancel via RPCs.");
}
if (!tip.includes("tip_creator")) fail("Tip route must use tip_creator.");
if (!tip.includes("exactly one recipient")) fail("Tip route must enforce one recipient.");
if (!verification.includes("request_verification")) fail("Verification route must use request_verification.");
if (!fundraisers.includes("create_launch_campaign")) fail("Fundraisers route must create via RPC.");
if (!detail.includes("launch_campaign_progress")) fail("Detail route must attach progress.");
if (!contribute.includes("contribute_launch_campaign")) fail("Contribute route must use the contribution RPC.");
if (!close.includes("close_launch_campaign") || !close.includes("only the creator")) {
  fail("Close route must be creator-only via RPC.");
}
// No raw PG text to browsers: RPC errors route through rpcFail/dbFail.
for (const [name, src] of [["tiers", tiers], ["subscribe", subscribe], ["tip", tip], ["fundraisers", fundraisers], ["contribute", contribute]]) {
  if (!src.includes("rpcFail")) fail(`${name} route must route RPC errors through rpcFail.`);
}
// Cron: daily, secret-gated, service_role fan-out.
if (!cron.includes("renew_support_subscriptions")) fail("Cron must fan out via renew_support_subscriptions.");
if (!cron.includes("CRON_SECRET")) fail("Cron must be CRON_SECRET-gated.");
if (!vercel.includes("/api/cron/support-renewals")) fail("vercel.json must schedule support renewals.");

// --- UI: every money page carries the non-charity disclaimer ----------------------
for (const [name, src] of [["support page", supportPage], ["support client", supportClient], ["fundraisers page", fraisersPage], ["browser", browser], ["detail page", fraiserDetail], ["detail client", detailClient]]) {
  if (!src.includes("Not a charity") && !src.includes("not charity") && !src.includes("SUPPORT_DISCLAIMER") && !src.includes("LAUNCH_DISCLAIMER")) {
    fail(`${name} must show the non-charity disclaimer.`);
  }
}
if (!supportClient.includes("Terms of Use")) fail("Support UI must link Terms §8A.");
if (!browser.includes("game-launch") || !browser.includes("startup")) fail("Browser must offer launch categories.");
if (!detailClient.includes("no ownership")) fail("Detail must state backers get no ownership.");

// --- Legal -------------------------------------------------------------------------
if (!terms.includes("8A. Voluntary Support and Launch campaigns")) fail("Terms must add §8A.");
for (const token of ["not a charity", "not tax-deductible", "RSA 7:19", "can never be redeemed, cashed", "no money", "equity", "past-due", "Digital Services Act", "withdrawal right"]) {
  if (!terms.includes(token)) fail(`Terms §8A must cover: ${token}.`);
}
if (!privacy.includes("launch-Campaign")) fail("Privacy must disclose campaign data.");
if (!docs.includes("Terms of Use")) fail("Docs must link the binding Terms.");

// --- Cross-links ----------------------------------------------------------------------
if (!docs.includes("/support") || !docs.includes("/fundraisers")) fail("Docs must link /support + /fundraisers.");

console.log("Support + launch integrity OK.");
