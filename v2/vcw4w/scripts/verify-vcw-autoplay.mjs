import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const rules = read("../lib/vcw-autoplay.ts");
const compute = read("../lib/compute.ts");
const route = read("../app/api/vcw/autoplay/route.ts");
const widget = read("../components/games/vcw-autoplay.tsx");
const playPage = read("../app/games/[slug]/play/page.tsx");
const xonoticPage = read("../app/xonotic/page.tsx");
const catalog = read("../lib/cloud-catalog.ts");
const sitemap = read("../app/sitemap.ts");
const agentsPage = read("../app/agents/page.tsx");
const pkg = read("../package.json");

// Rules: on-site locked to 4weird games, off-site only xonotic + gpu-boosted + desktop.
for (const token of [
  "resolveAutoplayPlan",
  "isOnSiteAutoplayUrl",
  "AUTOPLAY_ONSITE_ORIGINS",
  "XONOTIC_SLUG",
  "XONOTIC_WEB_URL",
  "VCW_DESKTOP_PATH",
  "VCW_DESKTOP_INSTALLER",
  "AUTOPLAY_MAX_MINUTES",
  "AUTOPLAY_RATES",
  "AUTOPLAY_CUT_NOTE",
  "gpu-boosted",
  "on-site",
  "off-site",
]) {
  if (!rules.includes(token)) throw new Error(`vcw-autoplay lib missing ${token}.`);
}
if (!rules.includes("4weird games only")) throw new Error("rules must lock browser control to 4weird games on-site.");
if (!rules.includes("desktop")) throw new Error("rules must require the desktop app for off-site Xonotic.");
if (!rules.includes("gameAiSplit") || !rules.includes("25")) {
  throw new Error("autoplay quotes must reuse the 25% game-AI split.");
}

// Compute: CPU + GPU + boosted provisioning, never faked.
for (const token of [
  "autoplayWorkloadFor",
  "provisionAutoplayWorker",
  "VCW_AUTOPLAY_GAME",
  "VCW_AUTOPLAY_SITE",
  "runpodProxyUrl",
  "pickGpuUnderBudget",
  "no_stock",
  "over_budget",
  "unconfigured",
]) {
  if (!compute.includes(token)) throw new Error(`compute missing ${token}.`);
}
if (!compute.includes("cpu:") && !compute.includes("cpu3c")) {
  throw new Error("compute must provision real RunPod CPU pods (cpu3c family).");
}
if (!compute.includes("Xonotic autoplay needs GPU boosted")) {
  throw new Error("compute must refuse non-boosted Xonotic (fail closed).");
}
if (!compute.includes("on-site only")) throw new Error("compute must refuse off-site for catalog games.");
if (!compute.includes("BOOSTED_GPU_PREFERENCE") || !compute.includes("NVIDIA GeForce RTX 4090")) {
  throw new Error("compute must pin boosted autoplay to the RTX 4090 (5090 fallback), never priciest-card.");
}

// API: auth, rate limit, shared plan enforcement, honest provision states.
for (const token of [
  "Authentication required",
  "rateLimit",
  "resolveAutoplayPlan",
  "provisionAutoplayWorker",
  "gameSlugs",
  "desktop_url",
  "started",
]) {
  if (!route.includes(token)) throw new Error(`autoplay route missing ${token}.`);
}
if (route.includes("RUNPOD_API_KEY") && route.includes("process.env.RUNPOD_API_KEY")) {
  throw new Error("route must not touch RUNPOD_API_KEY directly (compute owns the key).");
}
if (!route.includes("55") && !route.includes("AUTOPLAY_MAX_MINUTES")) {
  throw new Error("route must report the 55-minute cap.");
}

// Widget: compute picker, locked site-mode radios, desktop gate, no free-form URL.
for (const token of ["VcwAutoplay", "/api/vcw/autoplay", "On-site", "Off-site", "VCW_DESKTOP_PATH", "Autoplay"]) {
  if (!widget.includes(token)) throw new Error(`autoplay widget missing ${token}.`);
}
if (widget.includes("inputMode") || widget.includes("prompt(") || /https?:\/\/.{0,0}input/.test(widget)) {
  throw new Error("widget must not take arbitrary URLs.");
}
if (!widget.includes("disabled={isXonotic}") || !widget.includes("disabled={!isXonotic}")) {
  throw new Error("widget must lock site-mode radios (on-site for catalog, off-site for xonotic).");
}
if (!widget.includes("gameSlugs") || !widget.includes("resolveAutoplayPlan")) {
  throw new Error("widget must enforce the shared plan client-side.");
}
if (!widget.includes("ProxyLink")) throw new Error("widget must render the live stream URL as a clickable ProxyLink.");

// Wiring: play pages + xonotic station + discoverability.
if (!playPage.includes("VcwAutoplay")) throw new Error("play page must render VcwAutoplay.");
if (!xonoticPage.includes('gameSlug="xonotic"')) throw new Error("xonotic page must drive VcwAutoplay with xonotic.");
if (!xonoticPage.includes("/vcw/desktop") && !xonoticPage.includes("VCW_DESKTOP_PATH")) throw new Error("xonotic page must link the desktop install.");
if (!sitemap.includes("/xonotic")) throw new Error("sitemap must include /xonotic.");
if (!agentsPage.includes("/xonotic")) throw new Error("agents page must link the xonotic autoplay station.");

// Catalog carries the three autoplay tiers with the 25% note intact.
for (const key of ["vcw-autoplay-cpu", "vcw-autoplay-gpu", "vcw-autoplay-gpu-boosted"]) {
  if (!catalog.includes(key)) throw new Error(`cloud catalog missing ${key}.`);
}

// Package gate wiring.
if (!pkg.includes("verify:vcw-autoplay")) throw new Error("package.json must wire verify:vcw-autoplay.");
if (!pkg.includes("verify:vcw-autoplay") || !/"test": "[^"]*verify:vcw-autoplay/.test(pkg)) {
  throw new Error("npm test must run verify:vcw-autoplay.");
}

console.log("VCW autoplay integrity OK.");
