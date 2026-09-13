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

// 7. A02 (Next 16 instrumentation-client + Turbopack gate, steward-owned).
// instrumentation-client.ts is the Next 16 client bootstrap (runs before
// hydration; keep it synchronous + lightweight per instrumentation-client.md).
const instrumentation = read("instrumentation-client.ts");
must(instrumentation.length > 0, "instrumentation-client.ts must exist (Next 16 client bootstrap).");
// Turbopack is the Next 16 DEFAULT bundler (turbopack.md): `next dev` /
// `next build` need no --turbo flag (removed), --webpack opts OUT. So the
// repo must carry no webpack-only config and scripts stay flag-free.
must(!nextConfig.includes("webpack(") && !nextConfig.includes("config.webpack"), "next.config.ts must not carry webpack() config (Turbopack is the Next 16 default)");
const pkg = read("package.json");
must(pkg.includes('"dev": "next dev"'), 'package.json dev script must be bare `next dev` (Turbopack default, no --turbo flag in Next 16)');
must(pkg.includes('"build": "next build"'), 'package.json build script must be bare `next build` (Turbopack default)');
must(!pkg.includes("--turbo"), "package.json must not use the removed --turbo flag (Next 16 defaults to Turbopack)");
// Web Vitals/perf bootstrap inside instrumentation-client.ts (onRouterTransitionStart
// / performance marks) is tracked as a QUEUE A02 wiring request to infra;
// the PerfBootstrap layout mount above stays the enforced perf invariant.

// 8. DS-SPEED-08 (additive): immutable long-cache covers more versioned statics.
// Existing /workers/* assert above is untouched; these only widen coverage.
for (const src of ["/workers/:path*", "/_next/static/:path*", "/og/:path*", "/images/:path*"]) {
  must(nextConfig.includes(src), `next.config.ts must long-cache versioned static ${src}`);
}
must(nextConfig.includes("max-age=31536000, immutable"), "next.config.ts immutable statics must use max-age=31536000, immutable");
must(!nextConfig.includes('source: "/sw.js"'), "next.config.ts must not long-cache /sw.js (service workers must revalidate)");

// 9. DS-SPEED-08 (additive): optimizePackageImports widened, Turbopack-default kept.
// Existing entries are re-asserted (never removed); new entries are additive.
for (const token of ["lucide-react", "next-themes", "@radix-ui/react-checkbox", "@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-slot", "class-variance-authority", "clsx", "tailwind-merge", "@supabase/supabase-js", "@supabase/ssr", "@vercel/analytics"]) {
  must(nextConfig.includes(token), `next.config.ts optimizePackageImports must include ${token}`);
}
must(nextConfig.includes("optimizePackageImports"), "next.config.ts must keep experimental.optimizePackageImports");

// 10. DS-SPEED-08 follow-up (additive only): wider immutable statics + imports.
// Extends sections 8-9 without touching them; Turbopack-default + no-/sw.js
// invariants are re-asserted, never relaxed.
for (const src of ["/fonts/:path*", "/icons/:path*"]) {
  must(nextConfig.includes(src), `next.config.ts must long-cache versioned static ${src}`);
}
for (const token of ["@radix-ui/react-dialog", "@radix-ui/react-tabs", "@radix-ui/react-tooltip", "@radix-ui/react-avatar", "date-fns"]) {
  must(nextConfig.includes(token), `next.config.ts optimizePackageImports must include ${token}`);
}
must(!nextConfig.includes('source: "/sw.js"'), "next.config.ts must still not long-cache /sw.js");
must(!nextConfig.includes("webpack(") && !nextConfig.includes("config.webpack"), "next.config.ts must keep Turbopack default (no webpack() config)");

// 11. DS-SPEED-08 second follow-up (additive only): flag/camo immutable
// statics + botid imports. Extends sections 8-10 without touching them;
// Turbopack-default + no-/sw.js invariants are re-asserted, never relaxed.
for (const src of ["/flags/:path*", "/camo/:path*"]) {
  must(nextConfig.includes(src), `next.config.ts must long-cache versioned static ${src}`);
}
must(nextConfig.includes("botid"), "next.config.ts optimizePackageImports must include botid");
must(!nextConfig.includes('source: "/sw.js"'), "next.config.ts must still not long-cache /sw.js (second follow-up)");
must(!nextConfig.includes("webpack(") && !nextConfig.includes("config.webpack"), "next.config.ts must keep Turbopack default (no webpack() config, second follow-up)");

console.log("Perf checks OK: workers + GPU layer + component fan-out + DS-SPEED-08 immutable statics/imports.");
