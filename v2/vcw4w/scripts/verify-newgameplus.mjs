import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => { throw new Error(msg); };

// Pure lib: exact settings - Quality 0-10 (default 5), Budget 1-10,000
// (default 100), Confirm-the-Amount above 250.
const lib = read("../lib/newgameplus.ts");
for (const token of [
  "QUALITY_DEFAULT = 5",
  "BUDGET_DEFAULT = 100",
  "BUDGET_CONFIRM_THRESHOLD = 250",
  "QUALITY_MIN = 0",
  "QUALITY_MAX = 10",
  "BUDGET_MIN = 1",
  "BUDGET_MAX = 10000",
  "cleanPrompt",
  "cleanQuality",
  "cleanBudget",
  "cleanArchetype",
  "needsAmountConfirm",
  "planBuild",
  "generateGameSource",
  "vcwSelfTest",
  "draftPathFor",
  "DRAFT_PROJECT_SLUG",
  "NEWGAMEPLUS_CUT_NOTE",
  "NEWGAMEPLUS_CUT_PCT = 25",
  "laneForBudget",
  "planSymphony",
  "planFalForBuild",
  "timelineForLane",
  "recommendFalOps",
]) {
  if (!lib.includes(token)) fail(`newgameplus lib missing ${token}.`);
}
if (!lib.includes("≤5 min")) fail("newgameplus lib must promise the ≤5-min fast lane.");
// SECURITY (stored XSS): the themeForPrompt fallback word lands RAW in
// generated game.js string literals + index.html, so it must be whitelisted
// to alphanumerics (a prompt like `'+alert(1)+' ...` must not survive).
if (!lib.includes('replace(/[^a-z0-9]/g, "")')) {
  fail("newgameplus theme fallback must whitelist alphanumerics (stored-XSS guard).");
}
if (!lib.includes("Scout") || !lib.includes("Forge") || !lib.includes("Sage")) {
  fail("newgameplus lib must field the Scout/Forge/Sage symphony cast.");
}

// API: prompt in → tested game out, confirm gate, draft push, honest errors.
const route = read("../app/api/newgameplus/build/route.ts");
for (const token of [
  "Authentication required",
  "rateLimit",
  "hasServerSupabase",
  "dbFail",
  "Confirm the Amount",
  "confirmed",
  "generateGameSource",
  "vcwSelfTest",
  "code_submissions",
  "create_project",
  "push_file",
  "draft-games",
  "Draft/",
  "planSymphony",
  "planFalForBuild",
  "timelineForLane",
  "swarm",
  "timeline",
  "meter_newgameplus_build",
  "insufficient balance",
  "charge",
]) {
  if (!route.includes(token)) fail(`newgameplus build route missing ${token}.`);
}
if (!route.includes("402")) fail("newgameplus build route must 402 short balances (fail closed).");

// Page + builder: prompt, Quality slider, Budget input, confirm modal, preview.
const page = read("../app/newgameplus/page.tsx");
for (const token of ["NewGamePlusBuilder", "/newgameplus", "Quality", "Budget"]) {
  if (!page.includes(token)) fail(`newgameplus page missing ${token}.`);
}
const builder = read("../components/newgameplus/newgameplus-builder.tsx");
for (const token of [
  "Quality",
  "Budget",
  "Confirm the Amount",
  "Completely custom",
  "250",
  "/api/newgameplus/build",
  "/api/fal/generate",
  "srcDoc",
  "Draft",
  "VibeCodeWorker",
  "Symphony",
  "timeline",
  "≤5 min",
  "local-headless",
  "/api/newgameplus/vcw-verify",
]) {
  if (!builder.includes(token)) fail(`newgameplus builder missing ${token}.`);
}
// VCW ledger verify: evidence transcribed into real vcw_runs rows, metered
// at VCW rates, provenance-tagged, cost-governed.
const vcwVerify = read("../app/api/newgameplus/vcw-verify/route.ts");
for (const token of [
  "meter_vcw_usage",
  "local-headless",
  "browser-live",
  "Only the final commit",
  "Already verified",
  "get_my_coin_balance",
]) {
  if (!vcwVerify.includes(token)) fail(`newgameplus vcw-verify missing ${token}.`);
}
// Serverless Chromium playtest: CPU scale-to-zero worker + env-gated
// dispatcher + thin metered route + builder panel. Key hygiene: the
// RUNPOD_API_KEY path stays server-only (route + lib, never the builder,
// which only fetch()es the route).
const ngpDispatcher = read("../lib/ngp-playtest.ts");
for (const token of [
  "NGP_PLAYTEST_ENDPOINT_ID",
  "ngpPlaytestConfigured",
  "local-headless",
  "runsync",
]) {
  if (!ngpDispatcher.includes(token)) fail(`ngp-playtest dispatcher missing ${token}.`);
}
const playtestRemote = read("../app/api/newgameplus/playtest-remote/route.ts");
for (const token of [
  "serverless-chromium",
  "meter_vcw_usage",
  "code_submissions",
  "owner_id",
]) {
  if (!playtestRemote.includes(token)) fail(`newgameplus playtest-remote missing ${token}.`);
}
if (!builder.includes("playtest-remote") || !builder.includes("serverless-chromium")) {
  fail("newgameplus builder missing the serverless Chromium panel.");
}
if (builder.includes("process.env.RUNPOD_API_KEY") || ngpDispatcher.includes("NEXT_PUBLIC_")) {
  fail("RUNPOD_API_KEY must never cross into client bundles.");
}

// Metering: signed-in builds debit the capped spend (25% cut included) via
// guarded RPCs; spend rolls up into /my/usage + coin history.
const mig = read("../supabase/migrations/20261022000000_newgameplus_metering.sql");
for (const token of [
  "newgameplus_builds",
  "meter_newgameplus_build",
  "meter_newgameplus_build_for",
  "my_newgameplus_spend",
  "NewGamePlus ",
  "insufficient balance",
  "coin_spend_lock",
  "25 / 100",
]) {
  if (!mig.includes(token)) fail(`newgameplus metering migration missing ${token}.`);
}
if (!mig.includes("IF NOT EXISTS") && !mig.includes("if not exists") && !mig.includes("or replace")) {
  fail("newgameplus metering migration must be rerunnable.");
}
const usageApi = read("../app/api/my/usage/route.ts");
for (const token of ["my_newgameplus_spend", "newgameplus"]) {
  if (!usageApi.includes(token)) fail(`usage API missing ${token}.`);
}
const usageClient = read("../app/my/usage/usage-client.tsx");
if (!usageClient.includes("NewGamePlus")) fail("usage client must show the NewGamePlus card.");
if (!builder.includes("Billed")) {
  fail("newgameplus builder must show the billed charge.");
}

// Discoverability: site nav links to /newgameplus.
if (!read("../components/site/site-header.tsx").includes('"/newgameplus"')) {
  fail("Site nav must link to /newgameplus.");
}

// Per-processing spend permission: the agent auto-spends up to a configurable
// ceiling (default 20) and asks permission above it. Additive to the 250 gate.
const spendLib = read("../lib/spend-permission.ts");
for (const token of [
  "SPEND_AUTO_APPROVE_DEFAULT_COINS = 20",
  "SPEND_AUTO_APPROVE_MIN_COINS",
  "SPEND_AUTO_APPROVE_MAX_COINS",
  "cleanAutoApproveMax",
  "needsSpendPermission",
]) {
  if (!spendLib.includes(token)) fail(`spend-permission lib missing ${token}.`);
}
if (!route.includes("auto_approve_max")) fail("newgameplus build route must honor auto_approve_max.");
if (!route.includes("confirmed_budget")) fail("newgameplus build route must bind confirmations to confirmed_budget.");
if (!builder.includes("auto_approve_max") || !builder.includes("ngp-auto-approve-v1")) {
  fail("newgameplus builder must send auto_approve_max with on-device persistence.");
}

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:newgameplus")) fail("package.json must wire verify:newgameplus.");
if (!/"test": "[^"]*verify:newgameplus/.test(pkg)) {
  fail("npm test must run verify:newgameplus.");
}

console.log("NewGamePlus integrity OK; prompt in, tested Draft game out.");
