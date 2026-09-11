import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const page = read("../app/runpods/page.tsx");
const dash = read("../components/runpod/runpod-dashboard.tsx");
const link = read("../components/runpod/proxy-link.tsx");
const desktopPod = read("../app/api/desktop/[id]/pod/route.ts");
const bookingPod = read("../app/api/agents/bookings/[id]/pod/route.ts");
const blenderPod = read("../app/api/blender/jobs/[id]/pod/route.ts");
const desktopMine = read("../app/api/desktop/mine/route.ts");
const compute = read("../lib/compute.ts");
const header = read("../components/site/site-header.tsx");
const footer = read("../components/site/site-footer.tsx");
const sitemap = read("../app/sitemap.ts");
const robots = read("../app/robots.ts");
const pkg = read("../package.json");

// ProxyLink: a REAL anchor (clickable), never a blue span.
for (const token of ["<a", "target=\"_blank\"", 'rel="noreferrer', "href={href}"]) {
  if (!link.includes(token)) throw new Error(`proxy-link missing ${token} — links must be real anchors.`);
}
if (link.includes("<span") && link.includes("endpointUrl")) {
  throw new Error("proxy-link must not render the URL as a bare span.");
}

// Dashboard: aggregates the three creator-owned surfaces, clickable links,
// all five lifecycle actions with a destructive confirm.
for (const token of [
  "RunpodDashboard",
  "/api/desktop/mine",
  "/api/agents/bookings/mine",
  "/api/blender/jobs",
  "ProxyLink",
  "stop",
  "start",
  "restart",
  "terminate",
  "delete",
]) {
  if (!dash.includes(token)) throw new Error(`runpod dashboard missing ${token}.`);
}
if (!dash.includes("window.confirm")) throw new Error("dashboard must confirm terminate/delete.");
if (!dash.includes("/desktop") || !dash.includes("/agents") || !dash.includes("/blender")) {
  throw new Error("empty dashboard must link desktop + agents + blender entry points.");
}

// Page: login-gated dashboard — noindex, never in the sitemap.
if (!page.includes("RunpodDashboard")) throw new Error("runpods page must render RunpodDashboard.");
if (!page.includes("index: false")) throw new Error("runpods page must stay noindex (login-gated dashboard).");
if (sitemap.includes("/runpods")) throw new Error("sitemap must exclude /runpods (login-gated, like /account).");
if (robots.includes("/runpods")) throw new Error("robots must not single out /runpods.");

// Control routes: auth + ownership + all five actions, no key handling.
for (const [name, src] of [["desktop-pod", desktopPod], ["booking-pod", bookingPod], ["blender-pod", blenderPod]]) {
  for (const token of ["Authentication required", "runPodLifecycle", "stop", "start", "restart", "terminate", "delete"]) {
    if (!src.includes(token)) throw new Error(`${name} route missing ${token}.`);
  }
  if (src.includes("process.env.RUNPOD_API_KEY")) {
    throw new Error(`${name} route must not touch RUNPOD_API_KEY directly (compute owns the key).`);
  }
}
if (!desktopPod.includes("desktop_pods") || !desktopPod.includes("user_id")) {
  throw new Error("desktop-pod route must enforce creator ownership via desktop_pods.user_id.");
}
if (!bookingPod.includes("renter_id")) throw new Error("booking-pod route must check the renter.");
if (!blenderPod.includes("user_id")) throw new Error("blender-pod route must check the job owner.");
if (!desktopMine.includes("desktop_pods") || !desktopMine.includes("getPodLive")) {
  throw new Error("desktop mine must list owned desktops with live status.");
}

// Compute: shared dispatcher behind all three routes.
for (const token of ["runPodLifecycle", "deleteRunpodPod", "podAction", "startJupyter"]) {
  if (!compute.includes(token)) throw new Error(`compute missing ${token}.`);
}

// Wiring: header + footer link the dashboard.
if (!header.includes('href: "/runpods"')) throw new Error("site header must link /runpods.");
if (!footer.includes('href: "/runpods"')) throw new Error("site footer must link /runpods.");

// Package gate wiring.
if (!pkg.includes("verify:runpod-dashboard")) throw new Error("package.json must wire verify:runpod-dashboard.");
if (!/"test": "[^"]*verify:runpod-dashboard/.test(pkg)) {
  throw new Error("npm test must run verify:runpod-dashboard.");
}

console.log("RunPod dashboard integrity OK.");
