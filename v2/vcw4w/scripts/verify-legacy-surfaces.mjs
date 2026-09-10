import { access, readdir } from "node:fs/promises";
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

console.log(`Legacy surface integrity OK: ${required.length} required assets and ${modules.length} worker modules.`);
