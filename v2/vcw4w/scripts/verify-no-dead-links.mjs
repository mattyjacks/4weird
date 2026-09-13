import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

// Regression gate: no dead internal links. Every internal href in source
// must resolve to a real surface (app route, API handler, public file,
// metadata route, or a next.config redirect/rewrite) so menu/link 404s
// fail CI instead of shipping. Static only: no network, zero deps.

// ---------- pattern model ----------
// A target pattern is a segment array: "*" matches one segment ([param]),
// "**" matches zero or more segments ([...slug], :path*).
function appSegToPattern(seg) {
  if (seg.startsWith("[...") && seg.endsWith("]")) return "**";
  if (seg.startsWith("[") && seg.endsWith("]")) return "*";
  return seg;
}

function urlToParts(url) {
  const clean = url === "/" ? "/" : url.replace(/\/+$/, "");
  if (clean === "/") return [];
  return clean.slice(1).split("/");
}

function configSourceToPattern(src) {
  // "/squad/:path*" -> ["squad", "**"]; "/me" -> ["me"].
  const clean = src === "/" ? "/" : src.replace(/\/+$/, "");
  if (clean === "/") return [];
  return clean
    .slice(1)
    .split("/")
    .map((s) => (s.startsWith(":") ? "**" : s));
}

function matches(pattern, parts) {
  let pi = 0;
  let si = 0;
  while (pi < pattern.length) {
    if (pattern[pi] === "**") return true;
    if (si >= parts.length) return false;
    if (pattern[pi] !== "*" && pattern[pi] !== parts[si]) return false;
    pi += 1;
    si += 1;
  }
  return si === parts.length;
}

// Synthetic matcher checks (run on every invocation: a broken matcher
// must fail the gate, not silently pass the tree).
// 1. static: ["games"] matches /games.
// 2. [param]: ["games","*"] matches /games/doom but not bare /games.
// 3. catch-all: ["squad","**"] matches deep /squad/a/b.
// 4. negative: ["pricing"] does not match /login.
// 5. trailing slash: "/pricing/" resolves like "/pricing".
function selfTestMatcher() {
  const t = (pattern, url, want) => {
    const got = matches(pattern, urlToParts(url));
    if (got !== want) {
      throw new Error(`matcher self-test failed: [${pattern}] vs ${url} = ${got}, want ${want}.`);
    }
  };
  t(["games"], "/games", true);
  t(["games", "*"], "/games/doom", true);
  t(["games", "*"], "/games", false);
  t(["squad", "**"], "/squad/a/b", true);
  t(["pricing"], "/login", false);
  t(["pricing"], "/pricing/", true);
}
selfTestMatcher();

// ---------- 1. collect VALID targets ----------
const targets = [];
const addTarget = (pattern, via) => targets.push({ pattern, via });

function walkApp(dir, segs) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      // Route groups (foo) + parallel slots @slot never appear in URLs.
      if (e.name.startsWith("(") || e.name.startsWith("@")) walkApp(full, segs);
      else walkApp(full, [...segs, appSegToPattern(e.name)]);
    } else if (e.name === "page.tsx" || e.name === "route.ts") {
      addTarget(segs, full);
    }
  }
}
walkApp("../app", []);

// Next metadata routes (file convention -> served path).
if (exists("../app/sitemap.ts")) addTarget(["sitemap.xml"], "../app/sitemap.ts");
if (exists("../app/robots.ts")) addTarget(["robots.txt"], "../app/robots.ts");
if (exists("../app/manifest.ts")) addTarget(["manifest.webmanifest"], "../app/manifest.ts");

// public/** files -> exact served paths; foo/index.html also serves foo/.
function walkPublic(dir, base) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    const rel = base === "" ? `/${e.name}` : `${base}/${e.name}`;
    if (e.isDirectory()) {
      walkPublic(full, rel);
    } else {
      addTarget(urlToParts(rel), full);
      if (e.name === "index.html" && base !== "") addTarget(urlToParts(base), `${full} (dir index)`);
    }
  }
}
walkPublic("../public", "");

// Redirect + rewrite sources serve (redirect) or resolve (rewrite), so
// they are valid link targets; internal destinations must resolve too.
// Slice from redirects() onward so headers() sources (e.g. /games/:path*,
// /swarm/:path* cache entries) are NOT treated as valid targets.
const cfg = read("../next.config.ts");
const tailFrom = cfg.indexOf("redirects()");
if (tailFrom === -1) throw new Error("next.config.ts: redirects() block not found; refusing to pass blind.");
const tail = cfg.slice(tailFrom);
for (const m of tail.matchAll(/source:\s*"([^"]+)"/g)) {
  addTarget(configSourceToPattern(m[1]), `next.config source ${m[1]}`);
}
for (const m of tail.matchAll(/destination:\s*"([^"]+)"/g)) {
  if (!m[1].startsWith("/")) continue;
  addTarget(configSourceToPattern(m[1]), `next.config destination ${m[1]}`);
}

// ---------- 2. extract internal hrefs ----------
const SCAN_DIRS = ["../app", "../components", "../lib", "../content"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md", ".mdx", ".json"]);
const HREF_RES = [
  /href\s*=\s*(?:\{\s*)?["'](\/[^"'`\s{}]*)["']/g,
  /(?:\.push|\.replace|redirect|navigate)\s*\(\s*["'](\/[^"'`\s{}]*)["']/g,
  /href\s*:\s*["'](\/[^"'`\s{}]*)["']/g,
];
// Asset-like extensions are never page routes; skip them so <link>/<img>
// leftovers can't false-fail. Kept checkable: .html/.md/.txt/.xml/.json.
const ASSET_EXT = new Set(
  "css,js,mjs,cjs,map,png,jpg,jpeg,gif,webp,avif,svg,ico,bmp,woff,woff2,ttf,otf,eot,mp3,wav,ogg,flac,mp4,webm,mov,pdf,zip,gz,tgz,tar,glb,gltf,fbx,obj,wasm".split(","),
);

function normalizeHref(raw) {
  if (raw.startsWith("//")) return null; // protocol-relative: external.
  if (raw.includes("${") || raw.includes("<") || raw.includes(" ")) return null; // dynamic: can't check statically.
  const cut = raw.split("#")[0].split("?")[0];
  if (!cut || cut === "/") return cut === "/" ? "/" : null;
  const clean = cut.replace(/\/+$/, "");
  if (!clean) return null;
  const slash = clean.lastIndexOf("/");
  const dot = clean.lastIndexOf(".");
  if (dot > slash && ASSET_EXT.has(clean.slice(dot + 1).toLowerCase())) return null;
  return clean;
}

function scanFiles(dir, out) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      scanFiles(full, out);
    } else if (SCAN_EXTS.has(path.extname(e.name))) {
      out.push(full);
    }
  }
}

const refs = new Map(); // href -> Set(files)
let refCount = 0;
const files = [];
for (const d of SCAN_DIRS) scanFiles(d, files);
for (const f of files) {
  const text = fs.readFileSync(path.join(root, f), "utf8");
  for (const re of HREF_RES) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const href = normalizeHref(m[1]);
      if (!href) continue;
      refCount += 1;
      if (!refs.has(href)) refs.set(href, new Set());
      refs.get(href).add(f);
    }
  }
}

// ---------- 3. resolve + report ----------
const dead = [];
for (const [href, from] of refs) {
  const parts = urlToParts(href);
  if (!targets.some((t) => matches(t.pattern, parts))) dead.push({ href, from: [...from].sort() });
}

if (dead.length > 0) {
  dead.sort((a, b) => (a.href < b.href ? -1 : 1));
  const lines = dead.map((d) => `  ${d.href}\n${d.from.map((f) => `    - ${f}`).join("\n")}`);
  throw new Error(`Dead internal links: ${dead.length} href(s) resolve nowhere.\n${lines.join("\n")}`);
}

console.log(`No dead internal links OK (targets: ${targets.length}, hrefs: ${refs.size} unique / ${refCount} refs).`);
