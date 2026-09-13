// verify-menu-404.mjs — DS-404-06
// Audits every lib/site-nav.ts href against app/ routes + public/ + next.config.ts.
// ESM, zero deps. Exit 0 when zero missing, exit 1 listing missing targets.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here); // v2/vcw4w
const siteNavPath = join(root, "lib", "site-nav.ts");
const appDir = join(root, "app");
const publicDir = join(root, "public");
const nextConfigPath = join(root, "next.config.ts");

function fail(msg) {
  console.error(`verify-menu-404: ${msg}`);
  process.exit(2);
}

if (!existsSync(siteNavPath)) fail(`site-nav not found: ${siteNavPath}`);

const siteNav = readFileSync(siteNavPath, "utf8");
const nextConfig = existsSync(nextConfigPath) ? readFileSync(nextConfigPath, "utf8") : "";
const sourceLines = nextConfig.split("\n").filter((l) => l.includes("source:"));

// Extract href="..." / href='...' AND href: "..." / href: '...' targets.
const hrefRe = /href\s*[:=]\s*["']([^"']+)["']/g;
const seen = new Set();
const targets = [];
let m;
while ((m = hrefRe.exec(siteNav)) !== null) {
  const raw = m[1].trim();
  if (!raw.startsWith("/")) continue; // per spec: only "/" targets
  const clean = raw.split(/[?#]/)[0].trim(); // strip ?query and #anchor
  if (!clean.startsWith("/")) continue;
  const norm = clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  if (!seen.has(norm)) {
    seen.add(norm);
    targets.push(norm);
  }
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Direct + dynamic-segment ([id], [...slug]) aware app-route check.
function appRouteExists(target) {
  const rel = target.replace(/^\/+/, "");
  // Direct hits: app/<path>/page.tsx or app/<path>/route.ts
  if (isFile(join(appDir, rel, "page.tsx"))) return true;
  if (isFile(join(appDir, rel, "route.ts"))) return true;
  // Dynamic walk: a concrete segment may satisfy a [param] dir.
  if (rel === "") return isFile(join(appDir, "page.tsx"));
  const segs = rel.split("/").filter(Boolean);
  let cur = appDir;
  for (const seg of segs) {
    const exact = join(cur, seg);
    if (isDir(exact)) {
      cur = exact;
      continue;
    }
    // Treat /squads/[id] style as OK when parent + bracket dir exist:
    // match the concrete menu segment against a sibling [param] dir.
    let bracket = null;
    try {
      for (const name of readdirSync(cur)) {
        if (name.startsWith("[") && isDir(join(cur, name))) {
          bracket = name;
          break;
        }
      }
    } catch {
      return false;
    }
    if (bracket) {
      cur = join(cur, bracket);
      continue;
    }
    return false;
  }
  return isFile(join(cur, "page.tsx")) || isFile(join(cur, "route.ts"));
}

function publicExists(target) {
  const rel = target.replace(/^\/+/, "");
  if (rel === "") return isFile(join(publicDir, "index.html"));
  const abs = join(publicDir, rel);
  if (isFile(abs)) return true; // public/<path> as a file
  if (isDir(abs) && isFile(join(abs, "index.html"))) return true; // dir index
  return false;
}

function configCovers(target) {
  // Simple substring match on "source:" lines (redirects/rewrites/headers).
  for (const line of sourceLines) {
    if (line.includes(target)) return true;
  }
  return false;
}

const ok = [];
const missing = [];

for (const t of targets) {
  // External / anchor / query leftovers: strip already applied; http never
  // starts with "/" so unreachable, but kept for forward-compat.
  if (t.startsWith("http") || t.startsWith("#") || t === "") {
    ok.push(t);
    continue;
  }
  if (appRouteExists(t) || publicExists(t) || configCovers(t)) {
    ok.push(t);
  } else {
    missing.push(t);
  }
}

for (const t of ok) console.log(`OK ${t}`);
for (const t of missing) console.log(`MISSING ${t}`);
console.log(`menu-404: ${targets.length} checked, ${missing.length} missing`);

if (missing.length > 0) {
  console.log("Missing targets:");
  for (const t of missing) console.log(` - ${t}`);
  process.exit(1);
} else {
  process.exit(0);
}
