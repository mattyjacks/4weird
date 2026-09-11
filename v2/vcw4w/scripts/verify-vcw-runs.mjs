import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

// Migration: rerunnable tables + RLS for the agent run lifecycle.
const migration = read("../supabase/migrations/20260918000000_vcw_runs.sql");
for (const token of ["vcw_runs", "vcw_run_steps", "vcw_bugs", "enable row level security", "vcw_runs_owner_all", "vcw_run_steps_owner_all", "vcw_bugs_owner_all", "if not exists"]) {
  if (!migration.includes(token)) throw new Error(`vcw runs migration missing ${token}.`);
}

// Shared lib: pure validation + handoff builder.
const lib = read("../lib/vcw-runs.ts");
for (const token of ["isVcwRunKind", "isVcwSeverity", "isVcwVerdict", "cleanGameSlug", "isRunUuid", "buildRunHandoff", "observation", "describeFalStep", "cleanBatchSteps"]) {
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
  "../app/api/vcw/runs/[id]/actions/batch/route.ts",
  "../app/api/vcw/runs/[id]/complete/route.ts",
  "../app/api/vcw/runs/[id]/export/route.ts",
  "../app/api/vcw/runs/compare/route.ts",
  "../app/api/vcw/bugs/route.ts",
  "../app/api/vcw/bugs/[id]/route.ts",
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
  "../app/api/vcw/runs/[id]/actions/batch/route.ts",
  "../app/api/vcw/runs/[id]/complete/route.ts",
  "../app/api/vcw/runs/[id]/export/route.ts",
  "../app/api/vcw/runs/compare/route.ts",
  "../app/api/vcw/bugs/route.ts",
  "../app/api/vcw/bugs/[id]/route.ts",
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
// Runs list filters by verdict too (pass|fail|inconclusive), sharing the
// complete-route validator so the two can never disagree.
if (!runs.includes("isVcwVerdict") || !runs.includes("verdict")) {
  throw new Error("runs route must support the ?verdict= filter via isVcwVerdict.");
}
// Dashboard aggregates verdict counts alongside severity counts, and its
// hint advertises the verdict filter.
const dashboard = read("../app/api/vcw/dashboard/route.ts");
if (!dashboard.includes("runs_by_verdict") || !dashboard.includes("verdict=")) {
  throw new Error("dashboard must aggregate runs_by_verdict and advertise ?verdict=.");
}

// Power endpoints: batch-append (all-or-nothing metering), run compare,
// full-fidelity export, and bug retraction (ledger untouched by design).
const batch = read("../app/api/vcw/runs/[id]/actions/batch/route.ts");
for (const token of ["cleanBatchSteps", "meter_vcw_usage", "Insufficient Vibe Coin balance"]) {
  if (!batch.includes(token)) throw new Error(`batch actions route missing ${token}.`);
}
if (!batch.includes("all-or-nothing")) throw new Error("batch actions must document all-or-nothing rollback.");
const compare = read("../app/api/vcw/runs/compare/route.ts");
for (const token of ["same_game", "kind", "severity"]) {
  if (!compare.includes(token)) throw new Error(`compare route missing ${token}.`);
}
const exprt = read("../app/api/vcw/runs/[id]/export/route.ts");
if (!exprt.includes("vcw-run-export/1") || !exprt.includes("2000")) {
  throw new Error("export route must stamp vcw-run-export/1 with the uncapped trail.");
}
const retract = read("../app/api/vcw/bugs/[id]/route.ts");
if (!retract.includes("retracted") || !retract.includes("sameOrigin")) {
  throw new Error("bug retract route must be same-origin gated and return the retraction.");
}

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:vcw-runs")) throw new Error("package.json must wire verify:vcw-runs.");
if (!/"test": "[^"]*verify:vcw-runs/.test(pkg)) {
  throw new Error("npm test must run verify:vcw-runs.");
}

console.log("VCW runs integrity OK.");
