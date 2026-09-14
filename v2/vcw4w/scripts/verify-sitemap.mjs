import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

// Sitemap <-> routes parity: every sitemap path must resolve to a real
// surface, and every indexable static route must be listed. Stale entries
// 404 (crawl-budget burn); missing entries hide pages from crawlers and
// answer engines that seed from the sitemap.

const sitemap = read("../app/sitemap.ts");

// 1. Banned entries: gated, API, noindex, debug, or trailing-slash URLs
// must never list. Google Search Console flags every submitted noindex URL
// ("Submitted URL marked 'noindex'"), so the sitemap stays indexable-only.
for (const bad of ['"/my/', '"/api/', '"/auth/', '"/account']) {
  if (sitemap.includes(bad)) throw new Error(`Sitemap must not list gated/API paths (${bad}).`);
}
// Noindex shells / gated consoles / debug surfaces (metadata robots:false
// or X-Robots-Tag: noindex). Keep in sync with the EXCLUDED list in
// app/sitemap.ts header.
// Matched against `path: "..."` entries (and the play URL template), so the
// EXCLUDED documentation list in the sitemap header never trips the check.
const NOINDEX_BANNED = [
  "}/play",
  'path: "/games/gravegain4d/play"',
  'path: "/games/gravegain5d/play"',
  'path: "/feedback/admin"',
  'path: "/chat"',
  'path: "/business/invoices/trash"',
  'path: "/boss"',
  'path: "/it"',
  'path: "/gamestudio/debugplay"',
  'path: "/vibecodeworker/debug-play"',
  'path: "/swarm/control"',
  'path: "/vocrehab/export"',
  'path: "/vocrehab/pro',
];
for (const bad of NOINDEX_BANNED) {
  if (sitemap.includes(bad)) throw new Error(`Sitemap must not list noindex/gated/debug paths (${bad}).`);
}
for (const m of sitemap.matchAll(/path:\s*"([^"]+)"/g)) {
  if (m[1] !== "" && m[1].endsWith("/")) throw new Error(`Sitemap path must not trail-slash: ${m[1]}.`);
}

// 2. Every static sitemap path must resolve: app route, public file,
// public directory index (e.g. /vcw/desktop), or game URL template.
const quoted = [...sitemap.matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
const statics = [...new Set(quoted)].filter((p) => !p.includes("game.slug") && !p.startsWith("/games/"));
for (const p of statics) {
  const rel = p === "" ? "" : p.replace(/^\//, "");
  const page = rel === "" ? "../app/page.tsx" : `../app/${rel}/page.tsx`;
  const pubFile = `../public/${rel}`;
  const pubIndex = `../public/${rel}/index.html`;
  const ok = exists(page) || exists(pubFile) || exists(pubIndex) || p === "";
  if (!ok) throw new Error(`Sitemap path resolves nowhere (no route, file, or index): ${p || "/"} .`);
}

// 3. Every indexable static route must be listed (gated/noindex/debug
// routes are excluded by policy and must stay OUT; as is /runpods, a
// login-gated noindex dashboard per verify-runpod-dashboard + skill.md).
const GATED = new Set(["account", "auth", "my", "family", "runpods"]);
// Exact indexable-looking routes that are noindex/gated/debug by policy.
const SKIP_ROUTES = new Set([
  "/boss",
  "/it",
  "/chat",
  "/business/invoices/trash",
  "/feedback/admin",
  "/games/gravegain4d/play",
  "/games/gravegain5d/play",
  "/gamestudio/debugplay",
  "/vibecodeworker/debug-play",
  "/swarm/control",
  "/vocrehab/export",
  "/vocrehab/pro",
  "/vocrehab/pro/measures",
  "/vocrehab/pro/outreach",
  "/vocrehab/pro/sessions",
]);
function walk(dir, base) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith("[") || GATED.has(e.name)) continue;
      walk(`${dir}/${e.name}`, `${base}/${e.name}`);
    } else if (e.name === "page.tsx") {
      if (SKIP_ROUTES.has(base)) continue;
      const want = `"${base}"`;
      // Dynamic course modules expand template-driven off the catalog
      // (vocrehabCourseCatalog), like games below; the [module] dir itself
      // is already skipped as a bracket dir.
      if (!sitemap.includes(want)) throw new Error(`Indexable route missing from sitemap: ${base || "/"} .`);
    }
  }
}
walk("../app", "");
if (!sitemap.includes('path: ""')) throw new Error("Sitemap must list the homepage root.");

// 4. Dynamic game + course URLs must stay template-driven off the live catalogs.
if (!sitemap.includes("game.slug")) {
  throw new Error("Sitemap must derive per-game URLs from the games catalog.");
}
// Closed course catalog: every catalog slug must be listed (slugs are
// inlined as literals in app/sitemap.ts to keep zero inbound vocrehab
// imports; see the COURSE_MODULES comment there).
const catalog = read("../app/vocrehab/course/vocrehab-course-catalog.ts");
for (const m of catalog.matchAll(/vocrehabSlug:\s*"([^"]+)"/g)) {
  // Slugs are inlined as quoted literals in the COURSE_MODULES array and
  // expanded via the /vocrehab/course/${module} template (same pattern as
  // games: game.slug template + catalog slugs present).
  if (!sitemap.includes(`"${m[1]}"`)) {
    throw new Error(`Sitemap missing course module: /vocrehab/course/${m[1]}.`);
  }
}
if (!sitemap.includes("/vocrehab/course/${module}")) {
  throw new Error("Sitemap must expand course modules via the /vocrehab/course template.");
}
console.log("Sitemap parity checks OK.");
