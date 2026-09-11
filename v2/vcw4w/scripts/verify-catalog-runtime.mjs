import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
async function files(root, current = root) { const output = []; for (const entry of await readdir(current, { withFileTypes: true })) { const full = join(current, entry.name); if (entry.isDirectory()) output.push(...await files(root, full)); else output.push(full.slice(root.length + 1).replaceAll("\\", "/")); } return output; }
const source = await readFile(join(process.cwd(), "content", "games.ts"), "utf8");
if (!source.includes("/games/${slug}/index.html")) { console.error("Catalog does not define canonical game runtime paths."); process.exit(1); }
const paths = [...source.matchAll(/runtimePath:\s*`([^`]+)`/g)].map((match) => match[1]).filter((path) => !path.includes("${"));
const missing = [];
for (const path of paths) { const file = join(process.cwd(), "public", path.replace(/^\//, "")); try { await readFile(file); } catch { missing.push(path); } }
if (missing.length) { console.error(`Missing catalog runtimes:\n${missing.join("\n")}`); process.exit(1); }
const indexCount = (await files(join(process.cwd(), "public", "games", "html"))).filter((name) => name.endsWith("/index.html")).length;
if (indexCount < 1) { console.error("No static game entrypoints found."); process.exit(1); }
const canonicalCount = (await files(join(process.cwd(), "public", "games"))).filter((name) => /^([^/]+)\/index\.html$/.test(name)).length;
if (canonicalCount < 33) { console.error(`Expected at least 33 canonical slug bundles, found ${canonicalCount}.`); process.exit(1); }
// The sync step injects the v2 runtime bridge and absolutizes game-meta.js
// into the generated canonical bundles (the tracked sources stay relative so
// old-v1 parity holds). Every canonical entrypoint must carry the bridge and
// must not contain a relative game-meta reference, which 404s at
// /games/<slug>/ and leaves the play shell stuck on "Loading...".
const canonicalShells = (await files(join(process.cwd(), "public", "games"))).filter((name) => /^([^/]+)\/index\.html$/.test(name));
const unbridged = []; const relativeMeta = [];
for (const name of canonicalShells) {
  const html = await readFile(join(process.cwd(), "public", "games", name), "utf8");
  if (!html.includes("/games/html/runtime-bridge.js")) unbridged.push(name);
  if (html.includes('"../game-meta.js"') || html.includes("'../game-meta.js") || html.includes('"../../game-meta.js"') || html.includes("'../../game-meta.js")) relativeMeta.push(name);
}
if (unbridged.length || relativeMeta.length) { console.error(JSON.stringify({ unbridged, relativeMeta }, null, 2)); process.exit(1); }
// Closed catalogs: unknown slugs/sections must 404 with a real 404 status,
// not render the not-found UI with a 200 (soft-404 leaks crawl budget and
// misleads players). generateStaticParams + dynamicParams=false does that.
for (const page of ["app/games/[slug]/page.tsx", "app/games/[slug]/play/page.tsx", "app/vibecodeworker/[section]/page.tsx"]) {
  const src = await readFile(join(process.cwd(), page), "utf8");
  if (!src.includes("generateStaticParams") || !src.includes("dynamicParams = false") || !src.includes("notFound()")) {
    console.error(`${page} must be a closed static catalog (generateStaticParams + dynamicParams=false + notFound).`);
    process.exit(1);
  }
}
console.log(`Catalog runtime integrity OK: ${indexCount} legacy entrypoints, ${canonicalCount} canonical bundles; ${paths.length} literal paths checked.`);
