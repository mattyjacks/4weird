import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => { throw new Error(msg); };

const fal = read("../lib/fal.ts");
const catalog = read("../lib/cloud-catalog.ts");
const migration = read("../supabase/migrations/20260920000000_fal_media_compute.sql");
const migration30 = read("../supabase/migrations/20260924000000_fal_30_ops.sql");
const ops = read("../app/api/fal/ops/route.ts");
const generate = read("../app/api/fal/generate/route.ts");
const status = read("../app/api/fal/status/route.ts");
const studio = read("../components/fal/fal-studio.tsx");
const page = read("../app/fal/page.tsx");
const usage = read("../app/api/my/usage/route.ts");
const vcwStatus = read("../app/api/vcw/status/route.ts");
const vcwActions = read("../app/api/vcw/runs/[id]/actions/route.ts");
const vcwRuns = read("../lib/vcw-runs.ts");
const env = read("../.env.example");

// One rule everywhere: the fal cut is 25%, same constant as the economy.
if (!fal.includes("FAL_COMPUTE_CUT_PCT = 25")) fail("fal lib must pin FAL_COMPUTE_CUT_PCT = 25.");
if (!fal.includes("falSplit")) fail("fal lib must export falSplit.");
if (!fal.includes("FAL_CUT_NOTE")) fail("fal lib must export FAL_CUT_NOTE.");
if (!fal.includes("falConfigured")) fail("fal lib must export falConfigured.");
if (!fal.includes("FAL_KEY")) fail("fal lib must read FAL_KEY (FAL_API_KEY alias).");

// Exactly 30 ops, all with model endpoints + pricing.
const expected = ["concept-art","sprite-edit","icon-logo","texture-tile","upscale-hd","remove-bg","render-3d","trailer-clip","animate-sprite","npc-voice","sfx-burst","theme-music","lipsync-take","playtest-notes","app-promo","sprite-sheet","backdrop-wide","character-turn","level-inpaint","depth-map","voxel-prop","text-to-3d","cutscene-veo","motion-loop","monster-voice","ambient-bed","chiptune-loop","quest-dialogue","code-review","capsule-art"];
for (const op of expected) {
  if (!fal.includes(`"${op}"`)) fail(`fal lib missing op ${op}.`);
}
if (!fal.includes("FAL_OPS")) fail("fal lib must export FAL_OPS.");
for (const model of ["fal-ai/flux/schnell","fal-ai/kling-video","fal-ai/whisper","fal-ai/trellis","fal-ai/birefnet","fal-ai/veo3","fal-ai/dia-tts","fal-ai/fast-sdxl"]) {
  if (!fal.includes(model)) fail(`fal lib missing model ${model}.`);
}
if (!fal.includes("quoteFal") || !fal.includes("qtyForInput") || !fal.includes("falInputFor")) {
  fail("fal lib must export quoteFal + qtyForInput + falInputFor.");
}
if (!fal.includes("FAL_FAST_OPS") || !fal.includes("recommendFalOps") || !fal.includes("VCW_FAL_HOWTO") || !fal.includes("falOpsForVcwPhase")) {
  fail("fal lib must export FAL_FAST_OPS + recommendFalOps + VCW_FAL_HOWTO + falOpsForVcwPhase (VCW/NGP meld).");
}
if ((fal.match(/coinsPerUnit/g) ?? []).length < 30) fail("fal lib must price all 30 ops.");

// 30-op expansion migration carries the full CHECK + meter map.
for (const op of expected) {
  if (!migration30.includes(`'${op}'`)) fail(`30-op migration missing op ${op}.`);
}
for (const token of ["fal_usage_op_check", "meter_fal_usage", "25 / 100"]) {
  if (!migration30.includes(token)) fail(`30-op migration missing ${token}.`);
}

// Cloud catalog carries all 30 fal services with the 25% note.
for (const op of expected) {
  if (!catalog.includes(`fal-${op}`)) fail(`Cloud catalog missing fal-${op}.`);
}
if (!catalog.includes("fal.ai Media")) fail("Cloud catalog must have a fal.ai Media category.");

// Base migration meters the original 15 with the 25% cut and never fakes a provision.
for (const token of ["fal_usage","meter_fal_usage","my_fal_usage","fal_compute_split","25 / 100","IF NOT EXISTS"]) {
  if (!migration.includes(token)) fail(`fal migration missing ${token}.`);
}
for (const op of expected.slice(0, 15)) {
  if (!migration.includes(`'${op}'`)) fail(`fal migration missing op ${op}.`);
}

// APIs exist, require auth where spend happens, meter through the RPC,
// degrade honestly without the key, never synthesize URLs.
if (!ops.includes("/api/fal/ops") || !ops.includes("FAL_OPS")) fail("ops API must serve the FAL_OPS catalog.");
if (!generate.includes("Authentication required")) fail("generate API must require auth.");
if (!generate.includes("meter_fal_usage")) fail("generate API must call meter_fal_usage.");
if (!generate.includes("started:false") || !generate.includes("falConfigured")) fail("generate API must degrade honestly without FAL_KEY.");
if (!generate.includes("rpcFail") || !generate.includes("Unable to meter this fal run")) fail("generate API must fail the run when metering fails (no free runs).");
if (!generate.includes("queue.fal.run") && !generate.includes("falApiBase")) fail("generate API must queue via the fal queue base.");
if (!status.includes("Authentication required")) fail("status API must require auth.");
if (!status.includes("falConfigured")) fail("status API must honor falConfigured.");

// GUI: studio renders all 30 tools + honest state; page + nav link exist.
if (!studio.includes("FAL_OPS") || !studio.includes("FAL_CUT_NOTE")) fail("Studio must render FAL_OPS with the 25% note.");
if (!studio.includes("/api/fal/generate") || !studio.includes("/api/fal/ops")) fail("Studio must call the fal APIs.");
if (!page.includes("FalStudio") || !page.includes("/fal")) fail("fal page must render the studio.");
if (!read("../components/site/site-header.tsx").includes('"/fal"')) fail("Site nav must link to /fal.");
if (!read("../components/teams/team-workspace.tsx").includes("/fal")) fail("Team workspace must link to /fal.");

// Standard harness + ledger: VCW status advertises the 30 ops, usage breaks out fal.
if (!vcwStatus.includes("fal_ops") || !vcwStatus.includes("fal_configured")) fail("VCW status must advertise fal_ops + fal_configured.");
if (!vcwStatus.includes("fal_fast_ops") || !vcwStatus.includes("fal_by_phase") || !vcwStatus.includes("fal_howto")) fail("VCW status must advertise fal_fast_ops + fal_by_phase + fal_howto (main-loop meld).");
if (!vcwActions.includes("parseFalToolCall") || !vcwActions.includes("[tool: fal.generate")) fail("VCW actions must detect fal tool calls in the main loop.");
if (!vcwRuns.includes("VCW_FAL_TOOL_ID") || !vcwRuns.includes("parseFalToolCall")) fail("vcw-runs lib must carry the fal meld helpers.");
if (!usage.includes("my_fal_usage") || !usage.includes("falTotalGross")) fail("Usage API must roll up fal spend into combined totals.");
if (!read("../app/my/usage/usage-client.tsx").includes("fal.ai Studio")) fail("Usage client must show the fal.ai section.");
if (!env.includes("FAL_KEY=")) fail(".env.example must document FAL_KEY.");

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:fal")) fail("package.json must wire verify:fal.");
if (!/"test": "[^"]*verify:fal/.test(pkg)) fail("npm test must run verify:fal.");

console.log("fal.ai Studio integrity OK - 30 magical tools, 25% included.");
