import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const lib = read("../lib/blender-render.ts");
const compute = read("../lib/compute.ts");
const jobsRoute = read("../app/api/blender/jobs/route.ts");
const jobRoute = read("../app/api/blender/jobs/[id]/route.ts");
const readyRoute = read("../app/api/blender/jobs/[id]/ready/route.ts");
const startRoute = read("../app/api/blender/jobs/[id]/start/route.ts");
const stopRoute = read("../app/api/blender/jobs/[id]/stop/route.ts");
const progressRoute = read("../app/api/blender/progress/route.ts");
const page = read("../app/blender/page.tsx");
const widget = read("../components/blender/blender-studio.tsx");
const migration = read("../supabase/migrations/20260919000000_blender_render.sql");
const sitemap = read("../app/sitemap.ts");
const pkg = read("../package.json");

// Lib: pinned Blender LTS, caps, quotes reuse the 25% split, 4090 anchors.
for (const token of [
  "BLENDER_VERSION",
  "5.2.1",
  "download.blender.org",
  "BLENDER_MAX_SCENE_BYTES",
  "BLENDER_MAX_FRAMES",
  "cleanBlenderSpan",
  "quoteBlenderCap",
  "buildBlenderBootstrap",
  "blenderCoinsPerMinute",
  "BLENDER_CUT_NOTE",
  "NVIDIA GeForce RTX 4090",
]) {
  if (!lib.includes(token)) throw new Error(`blender lib missing ${token}.`);
}
if (!lib.includes("gameAiSplit") || !lib.includes("0.75")) {
  throw new Error("blender quotes must reuse the 25% game-AI split (provider / 0.75).");
}
if (!lib.includes("--cycles-device") && !lib.includes("OPTIX")) {
  throw new Error("bootstrap must drive Cycles on OptiX/CUDA.");
}
if (!lib.includes("sleep infinity") || !lib.includes("done_unstored")) {
  throw new Error("bootstrap must keep failed-upload output servable until the user stops the pod.");
}

// Compute: 4090-pinned provisioner + pod stop/status helpers, never faked.
for (const token of ["provisionBlenderWorker", "pickBoostedGpu", "stopPodAction", "getPodLive", "BLENDER_BOOTSTRAP", "/action"]) {
  if (!compute.includes(token)) throw new Error(`compute missing ${token}.`);
}
if (!compute.includes("args")) throw new Error("compute must pass the start-command override to pod create.");

// API: auth everywhere a browser calls, token auth for the pod callback,
// honest started:false, no RunPod key outside compute.
for (const [name, src] of [["jobs", jobsRoute], ["job", jobRoute], ["ready", readyRoute], ["start", startRoute], ["stop", stopRoute]]) {
  if (!src.includes("Authentication required")) throw new Error(`blender ${name} route must require login.`);
}
if (!progressRoute.includes("callback_token")) throw new Error("progress route must auth the worker by job token.");
if (/sameOrigin\s*\(/.test(progressRoute)) throw new Error("progress route must not require Origin (pods have none).");
if (!startRoute.includes("started") || !startRoute.includes("provisionBlenderWorker")) {
  throw new Error("start route must provision honestly with started:false states.");
}
for (const src of [jobsRoute, jobRoute, readyRoute, startRoute, stopRoute, progressRoute]) {
  if (src.includes("process.env.RUNPOD_API_KEY")) throw new Error("blender routes must not touch RUNPOD_API_KEY directly (compute owns the key).");
}
if (jobsRoute.includes("callback_token") && jobsRoute.includes("publicRow")) {
  // listing must strip the token: assert the select omits it.
  const m = jobsRoute.match(/\.select\("([^"]+)"\)/);
  if (m && m[1].includes("callback_token")) throw new Error("job listing must never select the callback token.");
}

// Page + widget: beginner guide, demo files, direct upload, live status.
for (const token of ["BlenderStudio", "BLENDER_DEMO_FILES_URL", ".blend", "RTX 4090"]) {
  if (!page.includes(token)) throw new Error(`blender page missing ${token}.`);
}
for (const token of ["BlenderStudio", "/api/blender/jobs", "Upload scene", "Render on RTX 4090", "Download render.mp4"]) {
  if (!widget.includes(token)) throw new Error(`blender widget missing ${token}.`);
}

// Migration: private bucket + service-role-only job table, rerunnable.
for (const token of ["blender-scenes", "blender_renders", "callback_token", "on conflict", "enable row level security"]) {
  if (!migration.includes(token)) throw new Error(`blender migration missing ${token}.`);
}
if (/create policy/i.test(migration)) throw new Error("blender migration must create no client policies (service_role only).");

// Wiring: sitemap + package gate.
if (!sitemap.includes("/blender")) throw new Error("sitemap must include /blender.");
if (!pkg.includes("verify:blender-render")) throw new Error("package.json must wire verify:blender-render.");
if (!/"test": "[^"]*verify:blender-render/.test(pkg)) {
  throw new Error("npm test must run verify:blender-render.");
}

console.log("Blender render integrity OK.");
