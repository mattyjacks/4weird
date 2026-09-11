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
const idleLib = read("../lib/pod-idle.ts");
const idleWatch = read("../components/runpod/pod-idle-watch.tsx");
const autoplayMine = read("../app/api/vcw/autoplay/mine/route.ts");
const autoplayPod = read("../app/api/vcw/autoplay/[id]/pod/route.ts");
const autoplayBeat = read("../app/api/vcw/autoplay/[id]/heartbeat/route.ts");
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

// Remote must boot a loadable desktop: Kasm GUI image on 6901 (base images
// serve nothing on 6901, so the stream could never load), with a VNC
// password + locked target URL in env.
if (!compute.includes("DESKTOP_IMAGE_GUI")) throw new Error("autoplay compute must boot the Kasm GUI desktop image (loadable 6901).");
if (!compute.includes("VCW_TARGET_URL") || !compute.includes("VNC_PW")) {
  throw new Error("autoplay compute must plant VCW_TARGET_URL + VNC_PW in env.");
}
// Recorded + controllable + idle-guarded like desktops (never fire-and-forget).
for (const token of ["vcw_autoplay_remotes", "idle_policy", "heartbeat_url", "pod_url", "vncPassword"]) {
  if (!route.includes(token)) throw new Error(`autoplay route missing ${token}.`);
}
for (const token of ["vcw_autoplay_remotes", "Authentication required", "getPodLive"]) {
  if (!autoplayMine.includes(token)) throw new Error(`autoplay mine route missing ${token}.`);
}
for (const token of ["Authentication required", "runPodLifecycle", "terminate", "delete", "user_id"]) {
  if (!autoplayPod.includes(token)) throw new Error(`autoplay pod route missing ${token}.`);
}
if (autoplayPod.includes("process.env.RUNPOD_API_KEY")) {
  throw new Error("autoplay pod route must not touch RUNPOD_API_KEY directly (compute owns the key).");
}
for (const token of ["Authentication required", "last_activity_at", "user_id"]) {
  if (!autoplayBeat.includes(token)) throw new Error(`autoplay heartbeat route missing ${token}.`);
}
if (!widget.includes("PodIdleWatch") || !widget.includes("vncPassword")) {
  throw new Error("autoplay widget must render PodIdleWatch + the one-time VNC password.");
}
if (widget.includes("55 min") || widget.includes("55-min")) {
  throw new Error("autoplay widget must not quote the old 55-minute cap (idle policy is 60-chime/+15-stop/24h-terminate).");
}
if (!idleLib.includes("getPodIdlePolicy") || !idleWatch.includes("PodIdleWatch")) {
  throw new Error("autoplay idle lifecycle must share lib/pod-idle + PodIdleWatch.");
}

console.log("VCW autoplay integrity OK.");
