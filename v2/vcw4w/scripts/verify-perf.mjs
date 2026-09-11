import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-perf: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Static workers exist and speak the perf protocol.
const search = read("public/workers/search-worker.js");
must(search.includes('"filter-games"') || search.includes("'filter-games'") || search.includes("filter-games"), "search-worker must handle filter-games");
must(search.includes("sort-ping"), "search-worker must handle sort-ping");
must(search.includes("self.onmessage"), "search-worker must register onmessage");
must(search.includes("ok: true") || search.includes("ok:true"), "workers must reply with { ok } envelopes");

const markdown = read("public/workers/markdown-worker.js");
must(markdown.includes('"render"') || markdown.includes("'render'") || markdown.includes("render"), "markdown-worker must handle render");
must(markdown.includes("escapeHtml"), "markdown-worker must escape HTML first (parity with lib/markdown.ts)");
must(markdown.includes("blockquote"), "markdown-worker must cover block rendering");

const telemetry = read("public/workers/telemetry-worker.js");
must(telemetry.includes('"segments"') || telemetry.includes("segments"), "telemetry-worker must handle segments");
must(telemetry.includes("segmentTicks") || telemetry.includes("buildThreatHeat"), "telemetry-worker must mirror vcw-frame-analysis math");
must(telemetry.includes("rank"), "telemetry-worker must handle leaderboard ranking");

// 2. Client pool + typed helpers.
const client = read("lib/perf-client.ts");
for (const token of ["filterGamesAsync", "sortByPingAsync", "renderMarkdownAsync", "analyzeTelemetryAsync", "warmPerfWorkers", "getPerfTier", "onIdle", "/workers/search-worker.js", "/workers/markdown-worker.js", "/workers/telemetry-worker.js"]) {
  must(client.includes(token), `lib/perf-client.ts must export/reference ${token}`);
}
must(client.includes("fallback"), "perf-client must degrade to main-thread fallbacks");

// 3. Bootstrap mounted in the root layout (idle-deferred, once per load).
const layout = read("app/layout.tsx");
must(layout.includes("PerfBootstrap"), "app/layout.tsx must mount <PerfBootstrap />");

// 4. GPU / low-resource CSS layer.
const css = read("app/globals.css");
for (const token of ["perf-gpu", "perf-list", "perf-frame", "content-visibility", "translateZ(0)", "perf-low-power"]) {
  must(css.includes(token), `globals.css perf layer must include ${token}`);
}

// 5. Workers are long-cached immutable statics.
const nextConfig = read("next.config.ts");
must(nextConfig.includes("/workers/"), "next.config.ts must add a /workers/* cache header");

// 6. Heavy surfaces actually use the pool (no dead workers).
const catalog = read("components/games/game-catalog.tsx");
must(catalog.includes("filterGamesAsync"), "game-catalog must filter via filterGamesAsync");
const mdView = read("components/clans/markdown-view.tsx");
must(mdView.includes("renderMarkdownAsync"), "markdown-view must upgrade long bodies via renderMarkdownAsync");
const lobbies = read("components/lobbies/lobbies-browser.tsx");
must(lobbies.includes("sortByPingAsync"), "lobbies-browser must sort via sortByPingAsync");
const clanChat = read("components/clans/clan-chat.tsx");
must(clanChat.includes("reactionsByMessage"), "clan-chat must group reactions once (O(1) lookup)");
must(clanChat.includes("document.hidden"), "clan-chat must skip polls when the tab is hidden");
const buddy = read("components/buddy/gaming-buddy.tsx");
must(buddy.includes("screenCache") || buddy.includes("document.hidden"), "gaming-buddy must cache screen reads / skip hidden polls");
const ships = read("components/spaceships/spaceship-runtime.tsx");
must(ships.includes("document.hidden"), "spaceship-runtime must skip readiness polls when hidden");

console.log("Perf checks OK: workers + GPU layer + component fan-out.");
