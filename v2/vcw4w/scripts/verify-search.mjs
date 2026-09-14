// scripts/verify-search.mjs — DS-SEARCH-07 (owner: srch-7) repo gate: search index builds,
// routes exist, every games-catalog slug indexed, no secrets, Luna key never in client bundle.
// READ-ONLY verifier: static checks only (readdir/readFile/existsSync). No builds, no network, no writes.
// Fail-open: missing in-flight sibling files (DS-SEARCH-01..06, all live at gate time) are
// ADVISORY skips, never crashes. Exit code 1 ONLY on hard violations in present files.
// Promotion note: once DS-SEARCH-01..06 are all done, a follow-up may promote the advisory
// route/index checks to violations.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pass = [];
const warn = [];
const fail = [];
const ok = (msg) => pass.push(msg);
const advisory = (msg) => warn.push(msg);
const violation = (msg) => fail.push(msg);
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
};

// Left-boundary-guarded secret pattern: the naive /sk-[A-Za-z0-9]{8,}/ false-positives
// on words like "task-marketplace" (see MEMORY.md skill-audit lesson), so require a
// non-identifier char before sk- and a realistic key length floor.
const SECRET_RE = /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/;

// 1. public/search/index.json parses (builder: DS-SEARCH-01, in-progress at gate time).
let indexEntries = null;
{
  const raw = read("public/search/index.json");
  if (raw === null) {
    advisory("public/search/index.json: ABSENT (sibling DS-SEARCH-01 in-progress) — index checks SKIP.");
  } else {
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      violation(`public/search/index.json: unparseable JSON (${String(e).slice(0, 120)}).`);
    }
    if (parsed !== null) {
      const entries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(entries)) {
        violation("public/search/index.json: must be an array or {entries: []}.");
      } else {
        indexEntries = entries;
        ok(`index parses: ${entries.length} entries.`);
      }
    }
  }
}

// 2. Every entry carries {id, href, title, tags[], kind}.
if (indexEntries !== null) {
  let bad = 0;
  for (const [i, e] of indexEntries.entries()) {
    const hasAll =
      e !== null &&
      typeof e === "object" &&
      typeof e.id === "string" &&
      typeof e.href === "string" &&
      typeof e.title === "string" &&
      Array.isArray(e.tags) &&
      typeof e.kind === "string";
    if (!hasAll) {
      if (bad < 5) violation(`index[${i}]: missing required {id, href, title, tags[], kind}.`);
      bad += 1;
    }
  }
  if (bad === 0) ok("index entries all carry {id, href, title, tags[], kind}.");
  else if (bad > 5) violation(`index: ${bad - 5} further entries also malformed (showing first 5).`);
}

// 3. Every content/games.ts slug appears in the index (read-only regex over the catalog source).
{
  const gamesSrc = read("content/games.ts");
  if (gamesSrc === null) {
    violation("content/games.ts: MISSING catalog source.");
  } else if (indexEntries === null) {
    advisory("slug coverage: SKIP (no index yet — sibling DS-SEARCH-01 in-progress).");
  } else {
    const slugs = [...new Set([...gamesSrc.matchAll(/\['([a-z0-9-]+)'/g)].map((m) => m[1]))];
    if (slugs.length === 0) {
      violation("content/games.ts: no slugs extracted — catalog shape drifted.");
    } else {
      const hay = indexEntries.map((e) => `${e.id ?? ""} ${e.href ?? ""}`.toLowerCase());
      const missing = slugs.filter((s) => !hay.some((h) => h.includes(s.toLowerCase())));
      if (missing.length === 0) ok(`slug coverage: all ${slugs.length} catalog slugs indexed.`);
      else violation(`slug coverage: ${missing.length} catalog slugs missing from index (${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", …" : ""}).`);
    }
  }
}

// 4. Shards countable to catalog size (builder emits public/search/shard-NNN.json,
// one shard per 500 games, alongside index.json).
{
  const searchDir = path.join(root, "public/search");
  const shards = fs.existsSync(searchDir)
    ? fs.readdirSync(searchDir).filter((f) => /^shard-\d+\.json$/.test(f))
    : [];
  if (shards.length === 0) {
    advisory("shards: none present (builder DS-SEARCH-01 emits shard-NNN.json) — shard count SKIP.");
  } else if (indexEntries === null) {
    advisory("shard count: SKIP (no index to count against).");
  } else {
    let shardTotal = 0;
    let shardBad = 0;
    for (const f of shards) {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(searchDir, f), "utf8"));
        shardTotal += Array.isArray(parsed) ? parsed.length : (parsed.entries?.length ?? 0);
      } catch {
        shardBad += 1;
      }
    }
    if (shardBad > 0) violation(`shards: ${shardBad} shard file(s) unparseable.`);
    if (shardTotal !== indexEntries.length) {
      violation(`shards: countable mismatch (shards sum ${shardTotal} vs index ${indexEntries.length}).`);
    } else {
      ok(`shards countable: ${shards.length} shard(s) sum to index size ${indexEntries.length}.`);
    }
  }
}

// 5. Routes exist: app/search (sibling DS-SEARCH-06), site-header mounts SearchOverlay
// (sibling DS-SEARCH-05), api/search (sibling DS-SEARCH-03). Absent = advisory (in flight);
// present-but-broken = violation.
{
  if (exists("app/search/page.tsx")) ok("route present: app/search/page.tsx.");
  else advisory("route app/search: ABSENT (sibling DS-SEARCH-06 live) — SKIP.");

  const header = read("components/site/site-header.tsx");
  if (header === null) {
    violation("components/site/site-header.tsx: MISSING.");
  } else if (!header.includes("SearchOverlay")) {
    advisory("site-header: no SearchOverlay mount yet (sibling DS-SEARCH-05 live) — SKIP.");
  } else if (!header.includes("<SearchOverlay")) {
    violation("site-header: imports SearchOverlay but never renders <SearchOverlay/>.");
  } else {
    ok("site-header mounts <SearchOverlay/>.");
  }

  if (exists("app/api/search/route.ts")) ok("route present: app/api/search/route.ts.");
  else advisory("route api/search: ABSENT (sibling DS-SEARCH-03 live) — SKIP.");
}

// 6. Luna key absent from the client bundle: scan the overlay (sibling DS-SEARCH-04).
{
  const overlay = read("components/site/search-overlay.tsx");
  if (overlay === null) {
    advisory("client-bundle key scan: SKIP (overlay sibling DS-SEARCH-04 not yet landed).");
  } else {
    if (SECRET_RE.test(overlay)) violation("search-overlay.tsx: looks like an sk- secret literal in client code.");
    else ok("search-overlay.tsx: no sk- secret literal.");
    if (/OPENAI_API_KEY/.test(overlay)) violation("search-overlay.tsx: references OPENAI_API_KEY (server key must never ship to the client).");
    else ok("search-overlay.tsx: no OPENAI_API_KEY reference.");
  }
}

// 7. No secrets in the static index + docs page (both ship to every visitor).
for (const rel of ["public/search/index.json", "app/docs/search/page.tsx"]) {
  const src = read(rel);
  if (src === null) {
    advisory(`${rel}: ABSENT — secret scan SKIP.`);
  } else if (SECRET_RE.test(src)) {
    violation(`${rel}: looks like an sk- secret literal.`);
  } else {
    ok(`${rel}: no sk- secret literal.`);
  }
}

console.log(`Search checks: ${pass.length} pass / ${warn.length} advisory / ${fail.length} fail.`);
for (const m of warn) console.log(`  ADVISORY: ${m}`);
for (const m of fail) console.log(`  FAIL: ${m}`);
if (fail.length > 0) process.exit(1);
console.log("Search checks OK.");
