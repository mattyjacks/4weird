import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const market = read("../lib/agent-market.ts");
const compute = read("../lib/compute.ts");
const createRoute = read("../app/api/agents/route.ts");
const bookRoute = read("../app/api/agents/[id]/book/route.ts");
const marketplace = read("../components/agents/marketplace.tsx");
const myCompute = read("../components/agents/my-compute.tsx");
const page = read("../app/agents/page.tsx");
const mig = read("../supabase/migrations/20260914000000_agent_rentals_usd_xonotic.sql");

// Runtimes: agents + VibeCodeWorker + both Xonotic play modes.
for (const runtime of ["vibecodeworker", "xonotic-vcw", "xonotic-self"]) {
  if (!market.includes(`"${runtime}"`)) throw new Error(`agent-market missing runtime ${runtime}.`);
  if (!mig.includes(runtime)) throw new Error(`migration missing runtime ${runtime}.`);
  if (!compute.includes(runtime) && runtime !== "vibecodeworker") {
    // vibecodeworker shares the agent workload path; xonotic modes must branch.
    throw new Error(`compute missing workload for ${runtime}.`);
  }
}
if (!compute.includes("vibecodeworker") && !compute.includes("AGENT_RUNTIME")) {
  throw new Error("compute must map agent runtimes to a workload.");
}

// USD/hr max quotes, billed per second.
for (const token of ["price_usd_per_hour", "usdToCentsPerHour", "grossCentsForSeconds", "perSecondUsd", "PRICE_USD_MAX"]) {
  if (!market.includes(token)) throw new Error(`agent-market missing ${token}.`);
}
if (!market.includes("3600")) throw new Error("agent-market must meter per second over 3600.");
if (!createRoute.includes("price_usd_per_hour")) throw new Error("create route must accept USD/hr.");
if (!bookRoute.includes("Billed per second") && !bookRoute.includes("per second")) {
  throw new Error("book route must state per-second billing.");
}

// No user-supplied https needed for RunPod: auto default endpoint.
for (const token of ["RUNPOD_AUTO_ENDPOINT", "runpod:auto", "normalizeEndpointForProvider"]) {
  if (!market.includes(token)) throw new Error(`agent-market missing ${token}.`);
}
if (!compute.includes("runpodProxyUrl") || !compute.includes("proxy.runpod.net")) {
  throw new Error("compute must hand back the RunPod default proxy endpoint.");
}
if (!compute.includes("pickGpuUnderBudget") || !compute.includes("cheapest")) {
  throw new Error("compute must intelligently pick the cheapest GPU under the max.");
}
if (!bookRoute.includes("runpodProvider") || !bookRoute.includes("provision")) {
  throw new Error("book route must provision RunPod servers on rent.");
}
if (!mig.includes("runpod:auto")) throw new Error("migration must allow the runpod:auto sentinel.");
if (!mig.includes("pod_id") || !mig.includes("gpu_type")) {
  throw new Error("migration must persist provisioned pod connection on bookings.");
}

// Copy: renting (not "renting out"), USD/hr max, per-second quotes.
if (myCompute.includes("Rent out your agent")) throw new Error("my-compute still says 'Rent out your agent'.");
if (!page.includes("Rent an agent")) throw new Error("agents page must lead with 'Rent an agent'.");
if (!myCompute.includes("List your compute")) throw new Error("host side must say 'List your compute'.");
for (const [name, src] of [["marketplace", marketplace], ["my-compute", myCompute], ["agents page", page]]) {
  if (!src.includes("per second")) throw new Error(`${name} must say billing is per second.`);
  if (!src.includes("USD")) throw new Error(`${name} must quote USD/hr.`);
}
if (!marketplace.includes("RunPod default endpoint")) throw new Error("marketplace must mention the RunPod default endpoint.");
if (!myCompute.includes("no URL needed") && !myCompute.includes("No URL needed") && !myCompute.includes("no URL")) {
  throw new Error("host form must tell RunPod hosts no URL is needed.");
}

// Migration + API hygiene: rerunnable, no raw PG leaks, escrow cap respected.
if (!mig.includes("if not exists") && !mig.includes("IF NOT EXISTS") && !mig.includes("if exists")) {
  throw new Error("migration must be rerunnable.");
}
if (!createRoute.includes("rpcFail")) throw new Error("create route must route RPC errors through rpcFail.");
if (!bookRoute.includes("rpcFail")) throw new Error("book route must route RPC errors through rpcFail.");

console.log("Agent rentals integrity OK.");
