import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const catalog = read("../lib/desktop.ts");
const compute = read("../lib/compute.ts");
const route = read("../app/api/desktop/provision/route.ts");
const widget = read("../components/desktop/desktop-rental.tsx");
const page = read("../app/desktop/page.tsx");
const header = read("../components/site/site-header.tsx");
const footer = read("../components/site/site-footer.tsx");
const sitemap = read("../app/sitemap.ts");
const home = read("../app/page.tsx");
const agentsPage = read("../app/agents/page.tsx");
const pkg = read("../package.json");

// Catalog: two plans on official RunPod images, honest billing (no Vibe cut).
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
  "DESKTOP_PORT_GPU",
  "DESKTOP_PORT_CPU",
]) {
  if (!catalog.includes(token)) throw new Error(`desktop catalog missing ${token}.`);
}
if (!catalog.includes("6901")) throw new Error("desktop catalog must expose the Kasm port 6901.");
if (!catalog.includes("no Vibe cut")) throw new Error("desktop catalog must state direct RunPod spend carries no Vibe cut.");

// Compute: real provisioning for both kinds, never faked.
for (const token of [
  "desktopWorkloadFor",
  "provisionDesktopWorker",
  "runpodProxyUrl",
  "proxy.runpod.net",
  "no_stock",
  "over_budget",
  "unconfigured",
]) {
  if (!compute.includes(token)) throw new Error(`compute missing ${token}.`);
}
if (!compute.includes("runpod/kasm-docker:cuda11")) throw new Error("compute must provision the official Kasm desktop image for GPU.");
if (!compute.includes("VNC_PW")) throw new Error("compute must set the Kasm VNC password env.");
if (!compute.includes("diskGb: workload.diskGb")) throw new Error("desktop CPU provision must honor the advertised disk size.");

// API: auth, rate limit, shared validation, honest provision states, no key handling.
for (const token of [
  "Authentication required",
  "rateLimit",
  "isDesktopKind",
  "provisionDesktopWorker",
  "started",
  "runpod_configured",
]) {
  if (!route.includes(token)) throw new Error(`desktop route missing ${token}.`);
}
if (route.includes("process.env.RUNPOD_API_KEY")) {
  throw new Error("route must not touch RUNPOD_API_KEY directly (compute owns the key).");
}
if (!route.includes("per") || !route.includes("second")) throw new Error("route must state per-second RunPod billing.");
if (!route.includes("no Vibe cut") && !route.includes("No Vibe cut")) {
  throw new Error("route must state direct RunPod spend carries no Vibe cut.");
}

// Widget: plan picker, provision call, login gate, live connection display.
for (const token of ["/api/desktop/provision", "DesktopRental", "needsLogin", "endpointUrl", "podId"]) {
  if (!widget.includes(token)) throw new Error(`desktop widget missing ${token}.`);
}
if (!widget.includes("/auth/login") || !widget.includes("/auth/sign-up")) {
  throw new Error("widget must guide signed-out renters to login/sign-up.");
}

// Wiring: page, nav, sitemap, homepage, agents cross-link.
if (!page.includes("DesktopRental")) throw new Error("desktop page must render DesktopRental.");
if (!page.includes("/agents") || !page.includes("/my/usage")) {
  throw new Error("desktop page must link agents + usage.");
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

console.log("Virtual Desktop integrity OK.");
