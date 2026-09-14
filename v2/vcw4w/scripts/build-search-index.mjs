// scripts/build-search-index.mjs — DS-SEARCH-01 (owner: srch-1)
// Build-time static site index: cheap, scalable to 100k pages.
//
// READ-ONLY sources (never written):
//   - lib/site-nav.ts        (SITE_NAV_GROUPS: href / label / quick / detail)
//   - content/games.ts       (catalog: slug / title / desc / genre / tags)
//   - public/music/seeds/*.json (filenames + titles)
//   - app/docs manifest      (if present, else skip fail-open)
//
// OUTPUT (rerunnable — overwritten each run):
//   - public/search/index.json        { generated, count, entries: [{ id, href, title, quick, tags[], kind, updated }] }
//   - public/search/shard-NNN.json    500 entries each (100k pages = 200 lazy shards)
//
// Zero deps (node:fs, node:path, node:url only). Client cost zero, scales free.
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHARD_SIZE = 500;

const wordsOf = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
const uniq = (arr) => [...new Set(arr.map((t) => String(t).toLowerCase()).filter(Boolean))];

/** Parse SITE_NAV_GROUPS links from source text (read-only regex — never imports the .ts). */
function parseSiteNav(src) {
  const groups = [];
  const groupRe = /label:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?links:\s*\[([\s\S]*?)\n\s*\]/g;
  const linkRe = /\{\s*href:\s*("[^"]*"|[A-Z_]+)[\s\S]*?label:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?quick:\s*"((?:[^"\\]|\\.)*)"/g;
  // Resolve same-file href constants (e.g. GITHUB_HREF = "https://...") so no link is skipped.
  const constRe = /export const ([A-Z_]+)\s*=\s*"([^"]*)"/g;
  const consts = {};
  let c;
  while ((c = constRe.exec(src)) !== null) consts[c[1]] = c[2];
  let g;
  while ((g = groupRe.exec(src)) !== null) {
    const label = g[1];
    const links = [];
    let m;
    linkRe.lastIndex = 0;
    const block = g[2];
    while ((m = linkRe.exec(block)) !== null) {
      const rawHref = m[1];
      const href = rawHref.startsWith('"') ? rawHref.slice(1, -1) : consts[rawHref];
      if (!href) continue; // unknown constant — skip rather than emit a dead href
      links.push({ href, label: m[2], quick: m[3] });
    }
    groups.push({ label, links });
  }
  return groups;
}

/** Parse game tuples from content/games.ts source text (read-only regex). */
function parseGames(src) {
  const out = [];
  // Matches both base entries (7 fields) and nested entries (7 fields, legacyPath last).
  const re = /\[\s*'([^']+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'([^']+)'\s*,\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, slug, title, desc, genre, tagsInner] = m;
    const tags = [];
    const tagRe = /'([^']+)'/g;
    let t;
    while ((t = tagRe.exec(tagsInner)) !== null) tags.push(t[1]);
    out.push({ slug, title, desc, genre, tags });
  }
  return out;
}

/** Try known docs-manifest locations; return entries or [] fail-open. */
function parseDocsManifest() {
  const candidates = [
    "components/docs/docs-data.ts",
    "app/docs/manifest.json",
    "app/docs/manifest.ts",
    "lib/docs-data.ts",
    "content/docs.ts",
    "lib/docs.ts",
  ];
  for (const rel of candidates) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    const entries = [];
    // DOCS_DATA shape { href, label, blurb } (+ generic href/title/slug/path fallbacks).
    const re =
      /\{\s*href:\s*["']([^"']+)["']\s*,\s*label:\s*"((?:[^"\\]|\\.)*)"\s*,\s*blurb:\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(src)) !== null) entries.push({ href: m[1], title: m[2], quick: m[3] });
    if (entries.length === 0) {
      const re2 =
        /\{\s*(?:href|slug|path):\s*["']([^"']+)["'][\s\S]{0,300}?(?:title|label):\s*["']((?:[^"'\\]|\\.)*)["']/g;
      while ((m = re2.exec(src)) !== null) entries.push({ href: m[1], title: m[2], quick: "" });
    }
    if (entries.length > 0) return { file: rel, entries };
    return { file: rel, entries: [], note: "parsed 0 entries" };
  }
  return { file: null, entries: [], note: "no manifest found" };
}

function main() {
  const generated = new Date().toISOString();
  const entries = [];
  const counts = { nav: 0, games: 0, music: 0, docs: 0 };

  // 1) Nav groups (read-only).
  const navSrc = readFileSync(join(ROOT, "lib", "site-nav.ts"), "utf8");
  const seenIds = new Map(); // hrefs repeat across groups (/squads, /pricing) — keep ids unique
  const uniqueId = (base) => {
    const n = (seenIds.get(base) ?? 0) + 1;
    seenIds.set(base, n);
    return n === 1 ? base : `${base}~${n}`;
  };
  for (const group of parseSiteNav(navSrc)) {
    const groupWords = wordsOf(group.label);
    for (const link of group.links) {
      entries.push({
        id: uniqueId(`nav:${link.href}`),
        href: link.href,
        title: link.label,
        quick: link.quick,
        tags: uniq([...groupWords, ...wordsOf(link.label), ...wordsOf(link.quick), "nav"]),
        kind: "nav",
        updated: generated,
      });
      counts.nav++;
    }
  }

  // 2) Games catalog (read-only).
  const gamesSrc = readFileSync(join(ROOT, "content", "games.ts"), "utf8");
  for (const g of parseGames(gamesSrc)) {
    entries.push({
      id: `game:${g.slug}`,
      href: `/games/${g.slug}`,
      title: g.title,
      quick: g.desc,
      tags: uniq([g.genre, ...g.tags, ...wordsOf(g.title), "game"]),
      kind: "game",
      updated: generated,
    });
    counts.games++;
  }

  // 3) Music seeds (read-only; fail-open per file).
  const seedsDir = join(ROOT, "public", "music", "seeds");
  if (existsSync(seedsDir)) {
    for (const file of readdirSync(seedsDir).filter((f) => f.endsWith(".json")).sort()) {
      let title = basename(file, ".json");
      let kindHint = "music";
      try {
        const data = JSON.parse(readFileSync(join(seedsDir, file), "utf8"));
        if (typeof data.title === "string" && data.title.trim()) title = data.title.trim();
        if (typeof data.kind === "string" && data.kind.trim()) kindHint = data.kind.trim().toLowerCase();
      } catch {
        // keep filename-derived title; never fail the build on one bad seed
      }
      entries.push({
        id: `music:${basename(file, ".json")}`,
        href: "/music/all",
        title,
        quick: `${kindHint} seed ${basename(file, ".json")}`,
        tags: uniq([...wordsOf(title), ...wordsOf(basename(file, ".json")), "music", kindHint]),
        kind: "music",
        updated: generated,
      });
      counts.music++;
    }
  }

  // 4) Docs manifest (fail-open).
  const docs = parseDocsManifest();
  for (const d of docs.entries) {
    entries.push({
      id: `docs:${d.href}`,
      href: d.href,
      title: d.title,
      quick: d.quick,
      tags: uniq([...wordsOf(d.title), "docs"]),
      kind: "docs",
      updated: generated,
    });
    counts.docs++;
  }

  // 5) Emit index + shards (overwrite = rerunnable).
  const outDir = join(ROOT, "public", "search");
  mkdirSync(outDir, { recursive: true });
  const index = { generated, count: entries.length, entries };
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n", "utf8");

  const shardCount = Math.max(1, Math.ceil(entries.length / SHARD_SIZE));
  for (let i = 0; i < shardCount; i++) {
    const slice = entries.slice(i * SHARD_SIZE, (i + 1) * SHARD_SIZE);
    const shard = { generated, shard: i, shards: shardCount, count: slice.length, entries: slice };
    writeFileSync(join(outDir, `shard-${String(i).padStart(3, "0")}.json`), JSON.stringify(shard) + "\n", "utf8");
  }

  console.log(
    `search-index: nav=${counts.nav} games=${counts.games} music=${counts.music} docs=${counts.docs} ` +
      `total=${entries.length} shards=${shardCount} (shard size ${SHARD_SIZE})` +
      (docs.file ? ` docs-manifest=${docs.file}` : ` docs-manifest=absent skip (${docs.note})`)
  );
  console.log(`search-index: wrote public/search/index.json + ${shardCount} shard file(s)`);
}

main();
