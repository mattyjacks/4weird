import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "public/v1-legacy/index.html",
  "public/v1-legacy/academy/index.html",
  "public/v1-legacy/pricing/index.html",
  "public/images/4weird aiplay 1 - Screenshot 2026-06-10 163239.jpg",
  "public/games/index.html",
  "public/spaceships.html",
  "public/manifest.json",
  "public/sw.js",
  "public/script.js",
  "public/components.js",
  "public/accessibility.js",
  "public/guide-layout.js",
  "public/guide-style.css",
  "public/vcw/agent/index.html",
  "public/vcw/desktop/index.html",
  "public/vcw/web/hub/index.html",
  "public/vibecodeworker-legacy/index.html",
  "public/vibecodeworker-legacy/overview.html",
  "public/vibecodeworker-legacy/hub.html",
  "public/vibecodeworker-legacy/run.html",
  "public/vibecodeworker-legacy/full.html",
  "public/vibecodeworker-legacy/phone.html",
  "public/vibecodeworker-legacy/docs/index.html",
  "public/vibecodeworker-legacy/demo/index.html",
  "public/games/html/template-demo/index.html",
  "public/games/html/demolichdom/guide.html",
  "public/games/html/DiscoverAmerica/guide.html",
  "public/games/html/fridgesimulator/guide.html",
  "public/games/html/serversavershield/guide.html",
];

const missing = [];
for (const relative of required) {
  try {
    await access(join(root, relative));
  } catch {
    missing.push(relative);
  }
}

if (missing.length) {
  console.error(`Missing preserved v1 surfaces:\n${missing.join("\n")}`);
  process.exit(1);
}

const modules = await readdir(join(root, "public/vibecodeworker-legacy/modules"));
if (modules.filter((name) => name.endsWith(".js")).length < 12) {
  console.error("Incomplete preserved VibeCodeWorker module set.");
  process.exit(1);
}

// The Full Web surface (public/vibecodeworker-legacy/full.html via full.js)
// loads /ai/manifest.json same-origin first: public/ai must mirror every
// manifest-listed file from old-v1/website/v1/ai (manifest sizes excluded,
// local CRLF may differ from the recorded GitHub sizes).
const aiManifestRaw = await readFile(join(root, "public/ai/manifest.json"), "utf8").catch(() => null);
if (!aiManifestRaw) {
  console.error("Missing public/ai/manifest.json (Full Web surface needs its same-origin /ai mirror).");
  process.exit(1);
}
const aiManifest = JSON.parse(aiManifestRaw);
const aiFiles = Array.isArray(aiManifest.files) ? aiManifest.files : [];
if (aiManifest.count !== aiFiles.length || aiFiles.length < 100) {
  console.error(`Suspect public/ai/manifest.json (count=${aiManifest.count}, files=${aiFiles.length}).`);
  process.exit(1);
}
const aiMissing = [];
for (const entry of aiFiles) {
  if (typeof entry?.path !== "string" || entry.path.includes("..")) {
    aiMissing.push(String(entry?.path));
    continue;
  }
  try {
    await access(join(root, "public/ai", entry.path));
  } catch {
    aiMissing.push(entry.path);
  }
}
if (aiMissing.length) {
  console.error(`Missing /ai mirror files (Full Web surface breaks same-origin):\n${aiMissing.slice(0, 20).join("\n")}${aiMissing.length > 20 ? `\n...and ${aiMissing.length - 20} more` : ""}`);
  process.exit(1);
}

// VibeCodeWorker section pages embed their live legacy surface in an iframe:
// every frameSrc in app/vibecodeworker/[section]/page.tsx must exist on disk,
// every /vibecodeworker/* asset rewrite destination must exist, and the
// slash-less /vcw/agent + /vcw/desktop static pages must redirect to their
// trailing-slash files (public/ serves exact paths only).
const sectionPage = await readFile(join(root, "app/vibecodeworker/[section]/page.tsx"), "utf8");
const frameSrcs = [...sectionPage.matchAll(/"(\/vibecodeworker-legacy\/[^"]+)"/g)].map((m) => m[1]);
if (frameSrcs.length < 7) {
  console.error(`Expected 7 legacy iframe sources, found ${frameSrcs.length}.`);
  process.exit(1);
}
const frameMissing = [];
for (const src of new Set(frameSrcs)) {
  try {
    await access(join(root, "public", src));
  } catch {
    frameMissing.push(src);
  }
}
if (frameMissing.length) {
  console.error(`Missing legacy iframe sources:\n${frameMissing.join("\n")}`);
  process.exit(1);
}
const nextConfig = await readFile(join(root, "next.config.ts"), "utf8");
for (const token of [
  'source: "/vcw/agent", destination: "/vcw/agent/"',
  'source: "/vcw/desktop", destination: "/vcw/desktop/"',
  'source: "/vcw/web/demo", destination: "/vibecodeworker/demo"',
  'source: "/vibecodeworker/style.css", destination: "/vibecodeworker-legacy/style.css"',
  'source: "/vibecodeworker/modules/:path*", destination: "/vibecodeworker-legacy/modules/:path*"',
]) {
  if (!nextConfig.includes(token)) {
    console.error(`next.config missing VibeCodeWorker mapping: ${token}`);
    process.exit(1);
  }
}

console.log(`Legacy surface integrity OK: ${required.length} required assets and ${modules.length} worker modules.`);
