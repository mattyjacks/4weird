import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

// Migration: rerunnable tables + RLS for the agent run lifecycle.
const migration = read("../supabase/migrations/20260918000000_vcw_runs.sql");
for (const token of ["vcw_runs", "vcw_run_steps", "vcw_bugs", "enable row level security", "vcw_runs_owner_all", "vcw_run_steps_owner_all", "vcw_bugs_owner_all", "if not exists"]) {
  if (!migration.includes(token)) throw new Error(`vcw runs migration missing ${token}.`);
}

// Shared lib: pure validation + handoff builder.
const lib = read("../lib/vcw-runs.ts");
for (const token of ["isVcwRunKind", "isVcwSeverity", "isVcwVerdict", "cleanGameSlug", "isRunUuid", "buildRunHandoff", "observation"]) {
  if (!lib.includes(token)) throw new Error(`vcw-runs lib missing ${token}.`);
}

// Every agent action is authenticated + rate limited (proxy also gates
// Frame-analysis loop: segment aggregation + heatmap builders + improve plan.
const analysis = read("../lib/vcw-frame-analysis.ts");
for (const token of ["frameSamplePlan", "segmentTicks", "buildThreatHeat", "buildTrailPath", "buildInputHeat", "buildKeyPath", "improveFromObservations", "laneOf", "targetOf"]) {
  if (!analysis.includes(token)) throw new Error(`vcw-frame-analysis lib missing ${token}.`);
}
// /api/vcw/* except health; routes enforce it themselves too).
const routes = [
  "../app/api/vcw/status/route.ts",
  "../app/api/vcw/games/route.ts",
  "../app/api/vcw/runs/route.ts",
  "../app/api/vcw/runs/[id]/route.ts",
  "../app/api/vcw/runs/[id]/actions/route.ts",
  "../app/api/vcw/runs/[id]/complete/route.ts",
  "../app/api/vcw/bugs/route.ts",
  "../app/api/vcw/handoff/route.ts",
  "../app/api/vcw/dashboard/route.ts",
];
for (const file of routes) {
  const src = read(file);
  if (!src.includes("Authentication required")) throw new Error(`${file} must require auth.`);
  if (!src.includes("rateLimit")) throw new Error(`${file} must rate limit.`);
  if (!src.includes("hasServerSupabase")) throw new Error(`${file} must fail closed without Supabase.`);
}

// DB failures route through dbFail (no raw Postgres text to browsers).
for (const file of [
  "../app/api/vcw/status/route.ts",
  "../app/api/vcw/runs/route.ts",
  "../app/api/vcw/runs/[id]/route.ts",
  "../app/api/vcw/runs/[id]/actions/route.ts",
  "../app/api/vcw/runs/[id]/complete/route.ts",
  "../app/api/vcw/bugs/route.ts",
  "../app/api/vcw/handoff/route.ts",
  "../app/api/vcw/dashboard/route.ts",
]) {
  if (!read(file).includes("dbFail")) throw new Error(`${file} must route DB errors through dbFail.`);
}

// Runs only target catalog games (same on-site rule as autoplay).
const runs = read("../app/api/vcw/runs/route.ts");
if (!runs.includes("gameSlugs") || !runs.includes("/api/vcw/games")) {
  throw new Error("runs route must validate game_slug against the catalog.");
}

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:vcw-runs")) throw new Error("package.json must wire verify:vcw-runs.");
if (!/"test": "[^"]*verify:vcw-runs/.test(pkg)) {
  throw new Error("npm test must run verify:vcw-runs.");
}

console.log("VCW runs integrity OK.");
