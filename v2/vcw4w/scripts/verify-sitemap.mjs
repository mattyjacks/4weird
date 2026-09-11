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

// 1. Banned entries: gated, API, or trailing-slash URLs must never list.
for (const bad of ['"/my/', '"/api/', '"/auth/', '"/account']) {
  if (sitemap.includes(bad)) throw new Error(`Sitemap must not list gated/API paths (${bad}).`);
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

// 3. Every indexable static route must be listed (account/auth/my/family
// are gated-noindex by policy and must stay OUT — as is /runpods, a
// login-gated noindex dashboard per verify-runpod-dashboard + skill.md).
const GATED = new Set(["account", "auth", "my", "family", "runpods"]);
function walk(dir, base) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith("[") || GATED.has(e.name)) continue;
      walk(`${dir}/${e.name}`, `${base}/${e.name}`);
    } else if (e.name === "page.tsx") {
      const want = `"${base}"`;
      if (!sitemap.includes(want)) throw new Error(`Indexable route missing from sitemap: ${base || "/"} .`);
    }
  }
}
walk("../app", "");
if (!sitemap.includes('path: ""')) throw new Error("Sitemap must list the homepage root.");

// 4. Dynamic game URLs must stay template-driven off the live catalog.
if (!sitemap.includes("games.flatMap") && !sitemap.includes("game.slug")) {
  throw new Error("Sitemap must derive per-game URLs from the games catalog.");
}
console.log("Sitemap parity checks OK.");
