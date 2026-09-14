/**
 * verify-vocrehab-routes.mjs — VocRehab route-manifest + href integrity verifier (D1).
 *
 * Two gates, no retries: 1-manifest, every file listed in Appendix A.1
 * (public/swarm/vocrehab-IMPLEMENTATION-PLAN.md, ```text block under
 * "### A.1 Routes") exists on disk; 2-hrefs, every static
 * href="/vocrehab...|/api/vocrehab...|/docs/vocrehab..." found under
 * app/vocrehab/** and components/vocrehab/** resolves to an existing
 * route (pages: app/.../page.tsx segment match incl. [param] dirs;
 * APIs: app/api/.../route.ts). Exit 0 + OK line only when both pass;
 * otherwise FAIL lines name the missing file / dead href (file:line)
 * and the run throws.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, ".."); // v2/vcw4w

const failures = [];
function fail(msg) {
  failures.push(msg);
  console.log(`[vocrehab-routes] FAIL: ${msg}`);
}
function must(cond, msg) {
  if (!cond) fail(msg);
  return Boolean(cond);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(root, p).replace(/\\/g, "/");

// ---------- Gate 1: Appendix A.1 manifest existence ----------
let manifestCount = 0;
{
  const planRel = "public/swarm/vocrehab-IMPLEMENTATION-PLAN.md";
  const planPath = path.join(root, planRel);
  if (must(fs.existsSync(planPath), `route manifest ${planRel} MISSING`)) {
    const md = fs.readFileSync(planPath, "utf8");
    const anchor = md.indexOf("### A.1 Routes");
    must(anchor !== -1, "Appendix A.1 anchor '### A.1 Routes' not found in plan");
    let listed = [];
    if (anchor !== -1) {
      const fenceOpen = md.indexOf("```text", anchor);
      const fenceClose = fenceOpen !== -1 ? md.indexOf("```", fenceOpen + 7) : -1;
      if (must(fenceOpen !== -1 && fenceClose !== -1, "A.1 routes ```text block not found")) {
        listed = md
          .slice(fenceOpen + 7, fenceClose)
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("v2/vcw4w/"))
          .map((l) => l.replace(/^v2\/vcw4w\//, ""));
      }
    }
    manifestCount = listed.length;
    console.log(`[vocrehab-routes] manifest lists ${listed.length} route files`);
    must(listed.length > 0, "A.1 route list parsed empty — manifest parse broken");
    const missing = listed.filter((f) => !fs.existsSync(path.join(root, f)));
    for (const f of missing) fail(`missing manifest file: ${f}`);
    if (!missing.length && listed.length) {
      console.log(`[vocrehab-routes] gate 1 PASS: all ${listed.length} manifest files exist`);
    }
  }
}

// ---------- Gate 2: href integrity ----------
// Route table from disk: page URLs (with [param] placeholders kept) + API URLs.
function buildRoutes() {
  const pages = [];
  const apis = [];
  for (const base of ["app/vocrehab", "app/docs/vocrehab"]) {
    const dir = path.join(root, ...base.split("/"));
    if (!fs.existsSync(dir)) continue;
    for (const p of walk(dir).filter((f) => f.endsWith("page.tsx"))) {
      const r = rel(p); // app/vocrehab/pro/sessions/[id]/page.tsx
      const url = "/" + r.replace(/^app\//, "").replace(/\/page\.tsx$/, "");
      pages.push(url);
    }
  }
  const apiDir = path.join(root, "app", "api", "vocrehab");
  if (fs.existsSync(apiDir)) {
    for (const p of walk(apiDir).filter((f) => f.endsWith("route.ts"))) {
      const r = rel(p); // app/api/vocrehab/roleplay/feedback/route.ts
      const url = "/" + r.replace(/^app\//, "").replace(/\/route\.ts$/, "");
      apis.push(url);
    }
  }
  return { pages, apis };
}

function matchesRoute(hrefPath, routes) {
  const hs = hrefPath.split("/").filter(Boolean);
  for (const r of routes) {
    const rs = r.split("/").filter(Boolean);
    if (rs.length !== hs.length) continue;
    let ok = true;
    for (let i = 0; i < rs.length; i++) {
      if (/^\[.+\]$/.test(rs[i])) continue; // [id]/[module] match any segment
      if (rs[i] !== hs[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

{
  const { pages, apis } = buildRoutes();
  console.log(`[vocrehab-routes] route table: ${pages.length} pages, ${apis.length} apis`);
  const scanDirs = ["app/vocrehab", "components/vocrehab"].filter((d) =>
    fs.existsSync(path.join(root, ...d.split("/")))
  );
  const files = scanDirs.flatMap((d) => walk(path.join(root, ...d.split("/")))).filter((p) =>
    /\.(tsx|ts)$/.test(p)
  );
  const hrefRe =
    /href\s*=\s*(?:\{\s*["'](\/(?:vocrehab|api\/vocrehab|docs\/vocrehab)[^"'`\s{}]*)["']\s*\}|["'](\/(?:vocrehab|api\/vocrehab|docs\/vocrehab)[^"'`\s{}]*)["'])/g;
  let checked = 0;
  let skipped = 0;
  const dead = [];
  for (const p of files) {
    const src = fs.readFileSync(p, "utf8");
    const lines = src.split("\n");
    // Byte offsets of each line start for file:line mapping.
    const starts = [];
    let acc = 0;
    for (const l of lines) {
      starts.push(acc);
      acc += l.length + 1;
    }
    const lineOf = (idx) => {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= idx) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    };
    for (const m of src.matchAll(hrefRe)) {
      const raw = m[1] ?? m[2];
      if (/[{}$*<>]/.test(raw)) {
        skipped++;
        continue;
      }
      const clean = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
      checked++;
      const table = clean.startsWith("/api/") ? apis : pages;
      if (!matchesRoute(clean, table)) {
        dead.push(`${rel(p)}:${lineOf(m.index)} dead href "${raw}"`);
      }
    }
  }
  console.log(
    `[vocrehab-routes] scanned ${files.length} file(s), ${checked} static href(s)${skipped ? ` (${skipped} dynamic skipped)` : ""}`
  );
  for (const d of dead) fail(d);
  if (!dead.length) {
    console.log(`[vocrehab-routes] gate 2 PASS: all ${checked} href(s) resolve`);
  }
}

if (failures.length) {
  console.error(`[vocrehab-routes] ${failures.length} failure(s), manifest files listed: ${manifestCount}`);
  throw new Error(`[vocrehab-routes] FAILED: ${failures.slice(0, 5).join(" | ")}${failures.length > 5 ? ` (+${failures.length - 5} more)` : ""}`);
}
console.log(
  `[vocrehab-routes] OK: ${manifestCount} manifest files exist, href integrity holds`
);
