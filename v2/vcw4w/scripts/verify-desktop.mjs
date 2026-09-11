import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const catalog = read("../lib/desktop.ts");
const compute = read("../lib/compute.ts");
const route = read("../app/api/desktop/provision/route.ts");
const mineRoute = read("../app/api/desktop/mine/route.ts");
const podRoute = read("../app/api/desktop/[id]/pod/route.ts");
const widget = read("../components/desktop/desktop-rental.tsx");
const migration = read("../supabase/migrations/20261011000000_desktop_pods.sql");
const page = read("../app/desktop/page.tsx");
const heartbeatRoute = read("../app/api/desktop/[id]/heartbeat/route.ts");
const policyRoute = read("../app/api/desktop/[id]/policy/route.ts");
const sweepRoute = read("../app/api/cron/pod-sweep/route.ts");
const idleLib = read("../lib/pod-idle.ts");
const idleWatch = read("../components/runpod/pod-idle-watch.tsx");
const autoplayMine = read("../app/api/vcw/autoplay/mine/route.ts");
const idleMigration = read("../supabase/migrations/20261023000000_pod_idle_autoplay.sql");
const vercel = read("../vercel.json");
const header = read("../components/site/site-header.tsx");
const footer = read("../components/site/site-footer.tsx");
const sitemap = read("../app/sitemap.ts");
const home = read("../app/page.tsx");
const agentsPage = read("../app/agents/page.tsx");
const pkg = read("../package.json");

// Catalog: two plans on official RunPod images, honest billing (no Vibe cut).
// GUI desktop by default, Jupyter one click away.
for (const token of [
  "DESKTOP_PLANS",
  "DESKTOP_KINDS",
  "isDesktopKind",
  "planForKind",
  "parseDesktopMaxUsd",
  "desktopUsdToCoins",
  "runpod/kasm-docker:cuda11",
  "runpod/base:1.0.2-ubuntu2204",
  "runpod-desktop",
  "runpod-ubuntu-2204",
  "DESKTOP_PORT_GUI",
  "DESKTOP_PORT_CPU",
  "DESKTOP_INTERFACES",
  "isDesktopInterface",
  "parseDesktopInterface",
  "DESKTOP_IMAGE_GUI",
]) {
  if (!catalog.includes(token)) throw new Error(`desktop catalog missing ${token}.`);
}
if (!catalog.includes("6901")) throw new Error("desktop catalog must expose the Kasm port 6901.");
if (!catalog.includes("no Vibe cut")) throw new Error("desktop catalog must state direct RunPod spend carries no Vibe cut.");

// Compute: real provisioning for both kinds + both interfaces, never faked.
for (const token of [
  "desktopWorkloadFor",
  "provisionDesktopWorker",
  "runpodProxyUrl",
  "proxy.runpod.net",
  "runPodLifecycle",
  "no_stock",
  "over_budget",
  "unconfigured",
]) {
  if (!compute.includes(token)) throw new Error(`compute missing ${token}.`);
}
if (!compute.includes("DESKTOP_IMAGE_GUI") && !catalog.includes("runpod/kasm-docker:cuda11")) {
  throw new Error("compute must provision the Kasm GUI desktop image by default.");
}
// Regression: RunPod caps CPU pod container disks at 20 GB (HTTP 400 above
// it); the CPU GUI desktop must stay at or under that cap.
if (!compute.includes('? 60 : 20')) throw new Error("compute must cap the CPU desktop disk at 20 GB (RunPod CPU limit).");
if (!compute.includes("VNC_PW")) throw new Error("compute must set the Kasm VNC password env.");
if (!compute.includes("diskGb: workload.diskGb")) throw new Error("desktop CPU provision must honor the advertised disk size.");

// API: auth, rate limit, shared validation, honest provision states, no key handling.
// Provision records ownership (desktop_pods); mine + pod routes let the
// creator list and control their desktops.
for (const token of [
  "Authentication required",
  "rateLimit",
  "isDesktopKind",
  "provisionDesktopWorker",
  "started",
  "runpod_configured",
  "desktop_pods",
]) {
  if (!route.includes(token)) throw new Error(`desktop route missing ${token}.`);
}
if (!route.includes("parseDesktopInterface")) throw new Error("desktop route must accept the gui/jupyter interface (gui default).");
for (const token of ["Authentication required", "desktop_pods", "getPodLive"]) {
  if (!mineRoute.includes(token)) throw new Error(`desktop mine route missing ${token}.`);
}
for (const token of ["Authentication required", "runPodLifecycle", "terminate", "delete", "user_id"]) {
  if (!podRoute.includes(token)) throw new Error(`desktop pod route missing ${token}.`);
}
if (podRoute.includes("process.env.RUNPOD_API_KEY")) {
  throw new Error("desktop pod route must not touch RUNPOD_API_KEY directly (compute owns the key).");
}
if (route.includes("process.env.RUNPOD_API_KEY")) {
  throw new Error("route must not touch RUNPOD_API_KEY directly (compute owns the key).");
}
if (!route.includes("per") || !route.includes("second")) throw new Error("route must state per-second RunPod billing.");
if (!route.includes("no Vibe cut") && !route.includes("No Vibe cut")) {
  throw new Error("route must state direct RunPod spend carries no Vibe cut.");
}

// Widget: plan picker, interface picker (GUI default), provision call, login
// gate, clickable live-connection link (a real anchor, never a blue span).
for (const token of ["/api/desktop/provision", "DesktopRental", "needsLogin", "endpointUrl", "podId", "ProxyLink", "desktop-interface", "/runpods"]) {
  if (!widget.includes(token)) throw new Error(`desktop widget missing ${token}.`);
}
if (!widget.includes("/auth/login") || !widget.includes("/auth/sign-up")) {
  throw new Error("widget must guide signed-out renters to login/sign-up.");
}

// Migration: creator-owned desktop rows, rerunnable, service-role only.
for (const token of ["desktop_pods", "user_id", "pod_id", "if not exists", "enable row level security"]) {
  if (!migration.includes(token)) throw new Error(`desktop migration missing ${token}.`);
}
if (/create policy/i.test(migration)) throw new Error("desktop migration must create no client policies (service_role only).");

// Wiring: page, nav, sitemap, homepage, agents cross-link.
if (!page.includes("DesktopRental")) throw new Error("desktop page must render DesktopRental.");
if (!page.includes("/agents") || !page.includes("/my/usage")) {
  throw new Error("desktop page must link agents + usage.");
}
// Control pane: launch + admin + testing on one page (CPU preselected default
// lives in the widget); only the creator's pods ever listed (mine routes).
if (!page.includes("RunpodDashboard")) throw new Error("desktop page must embed RunpodDashboard as the My-pods admin section.");
if (!page.includes("only your pods") && !page.includes("Only your pods") && !page.includes("only yours")) {
  throw new Error("desktop page must state it shows only the creator's pods.");
}
if (!header.includes('href: "/desktop"')) throw new Error("site header must link /desktop.");
if (!footer.includes('href: "/desktop"')) throw new Error("site footer must link /desktop.");
if (!sitemap.includes('"/desktop"')) throw new Error("sitemap must include /desktop.");
if (!home.includes('href="/desktop"')) throw new Error("homepage must link /desktop.");
if (!home.includes("Virtual Desktop")) throw new Error("homepage must name Virtual Desktop.");
if (!agentsPage.includes("/desktop")) throw new Error("agents page must link the virtual desktop.");

// Package gate wiring.
if (!pkg.includes("verify:desktop")) throw new Error("package.json must wire verify:desktop.");
if (!/"test": "[^"]*verify:desktop/.test(pkg)) {
  throw new Error("npm test must run verify:desktop.");
}

// Idle lifecycle (warn chime → stop → terminate, configurable): shared
// policy lib, audible client watchdog, heartbeat + policy routes, server
// sweep on a 15-min cron, activity columns migration.
for (const token of [
  "POD_IDLE_WARN_MINUTES_DEFAULT",
  "POD_IDLE_STOP_GRACE_MINUTES_DEFAULT",
  "POD_TERMINATE_AFTER_HOURS_DEFAULT",
  "getPodIdlePolicy",
  "resolvePodPolicy",
  "podIdlePhase",
  "describePodIdlePolicy",
]) {
  if (!idleLib.includes(token)) throw new Error(`pod-idle lib missing ${token}.`);
}
if (!idleLib.includes("60") || !idleLib.includes("15") || !idleLib.includes("24")) {
  throw new Error("pod-idle lib must default to 60-min warn / 15-min stop grace / 24h terminate.");
}
for (const token of ["PodIdleWatch", "playWarnChime", "AudioContext", "heartbeatUrl", "stopUrl"]) {
  if (!idleWatch.includes(token)) throw new Error(`pod-idle-watch missing ${token}.`);
}
for (const token of ["Authentication required", "heartbeat", "last_activity_at", "user_id"]) {
  if (!heartbeatRoute.includes(token)) throw new Error(`desktop heartbeat route missing ${token}.`);
}
for (const token of ["Authentication required", "validatePodPolicyInput", "warn_minutes", "user_id"]) {
  if (!policyRoute.includes(token)) throw new Error(`desktop policy route missing ${token}.`);
}
for (const token of ["CRON_SECRET", "desktop_pods", "vcw_autoplay_remotes", "terminate", "stop"]) {
  if (!sweepRoute.includes(token)) throw new Error(`pod-sweep route missing ${token}.`);
}
if (!vercel.includes("/api/cron/pod-sweep")) throw new Error("vercel.json must schedule /api/cron/pod-sweep.");
for (const token of ["vcw_autoplay_remotes", "last_activity_at", "warn_minutes", "terminate_hours"]) {
  if (!idleMigration.includes(token)) throw new Error(`idle migration missing ${token}.`);
}
if (/create policy/i.test(idleMigration)) throw new Error("idle migration must create no client policies (service_role only).");

// Launch panel: CPU preselected default, live cheapest-GPU price example
// (real catalog data, never made up), custom image, idle timers.
if (!widget.includes('"cpu"')) throw new Error("desktop widget must preselect the CPU plan (cheapest default).");
for (const token of ["pricing_example", "cheapest_gpu", "PodIdleWatch", "PolicyFields", "customImage", "heartbeat_url", "idle_policy"]) {
  if (!widget.includes(token)) throw new Error(`desktop widget missing ${token}.`);
}
for (const token of ["pricing_example", "idle_policy", "getLiveCheapestQuotes"]) {
  if (!route.includes(token)) throw new Error(`desktop route missing ${token}.`);
}
if (!compute.includes("cleanCustomImage") || !compute.includes("getLiveCheapestQuotes")) {
  throw new Error("compute must expose cleanCustomImage + getLiveCheapestQuotes for the control pane.");
}
if (!mineRoute.includes("last_activity_at") || !mineRoute.includes("image")) {
  throw new Error("desktop mine must return image + activity for the admin cards.");
}
if (!autoplayMine.includes("vcw_autoplay_remotes") || !autoplayMine.includes("Authentication required")) {
  throw new Error("autoplay mine must list the creator's remotes with auth.");
}

console.log("Virtual Desktop integrity OK.");
