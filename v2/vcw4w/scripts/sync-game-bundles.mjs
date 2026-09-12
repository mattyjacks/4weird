// Syncs preserved v1 game bundles (public/games/html/<legacyPath>/) into the
// canonical runtime paths the app serves (public/games/<slug>/).
//
// Why this exists: content/games.ts points every game's runtimePath at
// /games/<slug>/index.html, but only public/games/html/** is tracked in git.
// Without this step a fresh clone or a Linux deploy (case-sensitive FS)
// serves 404s inside every /games/<slug>/play iframe. Running the sync as
// `prebuild`/`pretest` keeps the generated dirs reproducible instead of
// committing ~8 MB of duplicated bundles.
//
// Idempotent: destinations are removed and re-copied on every run.
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// slug -> legacy path under public/games/html/
const bundles = [
  ["lastwordszombies", "lastwordszombies"],
  ["venturemechanically", "venturemechanically"],
  ["financialfreedom", "financialfreedom"],
  ["serversavershield", "serversavershield"],
  ["overtake", "overtake"],
  ["assassinanimals", "assassinanimals"],
  ["battlesharks2", "battlesharks2"],
  ["gravegain2d", "gravegain2d"],
  ["gravegain3d", "gravegain3d"],
  ["demolichdom", "demolichdom"],
  ["fridgesimulator", "fridgesimulator"],
  // NOTE: source dir keeps its v1 capitalisation; the destination slug is
  // lowercase so the runtime URL works on case-sensitive filesystems.
  ["discoveramerica", "DiscoverAmerica"],
  ["orbitaldrift", "orbitaldrift"],
  ["aiwhackamole", "aiwhackamole"],
  ["soundpainter2", "soundpainter2"],
  ["soundpainter", "soundpainter"],
  ["friendslop", "friendslop"],
  ["semester-survival", "semester-survival"],
  ["neonbreaker", "kouzi/neonbreaker"],
  ["neoninvaders", "kouzi/neoninvaders"],
  ["neonracer", "kouzi/neonracer"],
  ["neonsnake", "kouzi/neonsnake"],
  ["neonvoidrunner", "kouzi/neonvoidrunner"],
  ["temple-of-lost-revenue", "madi/temple-of-lost-revenue"],
  ["the-ai-expedition", "madi/the-ai-expedition"],
  ["the-cave-of-bottlenecks", "madi/the-cave-of-bottlenecks"],
  ["the-lost-city-of-customers", "madi/the-lost-city-of-customers"],
  ["the-madi-ai-universe", "madi/the-madi-ai-universe"],
  ["the-pipeline-mountain", "madi/the-pipeline-mountain"],
  ["the-revenue-dragon", "madi/the-revenue-dragon"],
  ["the-revenue-jungle", "madi/the-revenue-jungle"],
  ["the-speed-portal", "madi/the-speed-portal"],
  ["treasure-hunters", "madi/treasure-hunters"],
  ["platform-wars", "platform-wars"],
];

const root = process.cwd();
const missing = [];
let synced = 0;

// Content-mode games ship the v2-native content-mode bridge (plus an
// optional per-game gore overlay) inside the generated bundle.
const CONTENT_MODE_SLUGS = new Set(["gravegain2d", "gravegain3d", "lastwordszombies"]);

// Post-copy fixups applied ONLY to the generated bundle (the tracked source
// under public/games/html/ stays byte-identical for old-v1 parity):
//  1. game-meta.js is referenced relatively ("../game-meta.js" or, from the
//     nested kouzi/madi trees, "../../game-meta.js"). That resolves inside
//     public/games/html/ but 404s once the bundle is served one level higher
//     at /games/<slug>/. Rewrite to the absolute canonical path.
//  2. Strip the legacy v1 site chrome so the iframe is JUST the game window:
//     nav/footer placeholders, starfield backdrop, game header bar, info
//     panel, credits/bio/more-games promos, kouzi/madi promo sections, the
//     site-wide styles.css + components.js. Game code, game.css, and game.js
//     are untouched. Prefix-agnostic (TEMPLATE-4weird-*, friendslop-4weird-*,
//     ...) so future prefixed templates are covered too.
//  3. Inject embed CSS (belt-and-braces hide for any chrome the regexes miss
//     + full-viewport game layout) and the v2 runtime bridge so the play
//     shell's ready/save/error handshake works in every game.
const CHROME_PATTERNS = [
  /<link[^>]*href=["'][^"']*styles\.css["'][^>]*>\s*/gi,
  /<link[^>]*href=["'][^"']*_TEMPLATE\/[^"']*["'][^>]*>\s*/gi,
  /<script[^>]*src=["'][^"']*components\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
  /<canvas[^>]*id=["'][^"']*starfield[^"']*["'][^>]*>\s*<\/canvas>\s*/gi,
  /<div[^>]*id=["'][^"']*nav-placeholder[^"']*["'][^>]*>\s*<\/div>\s*/gi,
  /<div[^>]*id=["'][^"']*footer-placeholder[^"']*["'][^>]*>\s*<\/div>\s*/gi,
  /<header[^>]*class=["'][^"']*game-header[^"']*["'][^>]*>[\s\S]*?<\/header>\s*/gi,
  /<aside[^>]*class=["'][^"']*game-info-panel[^"']*["'][^>]*>[\s\S]*?<\/aside>\s*/gi,
  /<section[^>]*class=["'][^"']*credits-section[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,
  /<section[^>]*class=["'][^"']*bio-section[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,
  /<section[^>]*class=["'][^"']*more-games[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,
  /<section[^>]*class=["'][^"']*more-kouzi-games[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,
  /<section[^>]*class=["'][^"']*kouzi-cta[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,
  /<section[^>]*class=["'][^"']*madi-cta[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,
  /<!--[\s\S]*?placeholder[\s\S]*?-->\s*/gi,
];

const EMBED_CSS = `<style id="fourweird-game-only">
/* Generated by sync-game-bundles: game-only runtime. The v1 site chrome
   (nav, header, info panel, credits, bio, promos, footer) is stripped at
   build time; these rules hide any remnant and make the game fill the frame. */
html,body{margin:0!important;padding:0!important;min-height:100%!important;background:#000!important}
body{display:block!important}
[id*="nav-placeholder"],[id*="footer-placeholder"],[id*="starfield"],
[class*="game-header"],[class*="game-info-panel"],[class*="credits-section"],
[class*="bio-section"],[class*="more-games"],[class*="more-kouzi"],
[kouzi-cta],[class*="kouzi-cta"],[class*="madi-cta"]{display:none!important}
[class*="game-page"],[class*="game-main"]{margin:0!important;padding:0!important;max-width:none!important;min-height:100%!important}
[class*="game-frame"],.game-wrapper,.game-container{width:100%!important;max-width:none!important;margin:0!important;border-radius:0!important}
</style>`;

function stripSiteChrome(html) {
  let out = html;
  let removed = 0;
  for (const pattern of CHROME_PATTERNS) {
    pattern.lastIndex = 0;
    const before = out.length;
    out = out.replace(pattern, "");
    if (out.length !== before) removed += 1;
  }
  return { html: out, removed };
}

function normalizeRuntime(indexFile, slug) {
  let html = readFileSync(indexFile, "utf8");
  html = html.split('src="../game-meta.js"').join('src="/games/html/game-meta.js"');
  html = html.split("src='../game-meta.js'").join("src='/games/html/game-meta.js'");
  html = html.split('src="../../game-meta.js"').join('src="/games/html/game-meta.js"');
  html = html.split("src='../../game-meta.js'").join("src='/games/html/game-meta.js'");
  html = html.split('src="../../../game-meta.js"').join('src="/games/html/game-meta.js"');
  html = html.split("src='../../../game-meta.js'").join("src='/games/html/game-meta.js'");
  const stripped = stripSiteChrome(html);
  html = stripped.html;
  if (!html.includes('id="fourweird-game-only"')) {
    if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${EMBED_CSS}</head>`);
    else html = `${EMBED_CSS}${html}`;
  }
  if (!html.includes("runtime-bridge.js")) {
    const tag = `<script src="/games/html/runtime-bridge.js" data-slug="${slug}"></script>`;
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
    else html += tag;
  }
  // Shared worker pool (EVERY game): offloads pure-math tasks (seeded RNG,
  // steering batches, particle integration, timing aggregation) with a
  // synchronous fallback. Source lives at public/games/html/fourweird-workers.js
  // (v2-native, outside every parity-locked tree). existsSync-guarded.
  if (!html.includes("fourweird-workers.js")) {
    const poolSrc = join(root, "public", "games", "html", "fourweird-workers.js");
    if (existsSync(poolSrc)) {
      const tag = `<script src="/games/html/fourweird-workers.js" data-slug="${slug}"></script>`;
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
      else html += tag;
    }
  }
  // V2 per-game gore layer (lastwordszombies ONLY): inject the shared-root
  // gore script into the generated bundle when absent. The source lives at
  // public/games/html/gore-lastwordszombies.js (outside the parity-locked
  // lastwordszombies/ dir, so cpSync never carries it) and is referenced by
  // absolute canonical path, mirroring game-meta.js above. existsSync guard
  // keeps old checkouts (no gore file yet) syncing cleanly.
  if (slug === "lastwordszombies" && !html.includes("gore-lastwordszombies.js")) {
    const goreSrc = join(root, "public", "games", "html", "gore-lastwordszombies.js");
    if (existsSync(goreSrc)) {
      const goreTag = `<script src="/games/html/gore-lastwordszombies.js"></script>`;
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${goreTag}</body>`);
      else html += goreTag;
    }
  }
  // Per-game gore injection — gravegain3d ONLY. The v2 gore overlay lives at
  // public/games/html/gore-gravegain3d.js (outside the parity-locked
  // gravegain3d/ tree). Inject by reference into the generated bundle only,
  // and only when the source file exists and no sibling already injected it
  // (existsSync guard avoids clobbering another agent's injection).
  if (slug === "gravegain3d") {
    const goreSrc = join(root, "public", "games", "html", "gore-gravegain3d.js");
    if (existsSync(goreSrc) && !html.includes("gore-gravegain3d.js")) {
      const tag = `<script src="/games/html/gore-gravegain3d.js"></script>`;
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
      else html += tag;
    }
  }
  // v2-native per-game gore engine (GraveGain2D only): the source file lives at
  // public/games/html/gore-gravegain2d.js and is served as
  // /games/html/gore-gravegain2d.js. existsSync-guarded so a missing file never
  // breaks the sync; tracked bundle sources stay byte-identical.
  if (slug === "gravegain2d" && !html.includes("gore-gravegain2d.js")) {
    const goreSrc = join(root, "public", "games", "html", "gore-gravegain2d.js");
    if (existsSync(goreSrc)) {
      const tag = `<script src="/games/html/gore-gravegain2d.js" data-slug="gravegain2d"></script>`;
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
      else html += tag;
    }
  }
  // GraveGain epic layer (gravegain2d + gravegain3d ONLY): saga data ->
  // cutscene engine -> graphics-plus -> worker tasks, in dependency order.
  // All sources live at public/games/html/*.js (v2-native, outside the
  // parity-locked gravegain2d/ + gravegain3d/ trees). existsSync-guarded,
  // injected only when absent; tracked bundle sources stay byte-identical.
  if ((slug === "gravegain2d" || slug === "gravegain3d") ) {
    const epicFiles = [
      "gravegain-epic-saga.js",
      "gravegain-cutscenes.js",
      "gravegain-graphics-plus.js",
      "gravegain-workers.js",
    ];
    for (const file of epicFiles) {
      if (html.includes(file)) continue;
      const src = join(root, "public", "games", "html", file);
      if (!existsSync(src)) continue;
      const tag = `<script src="/games/html/${file}" data-slug="${slug}"></script>`;
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
      else html += tag;
    }
  }
  // Content-mode bridge (v2-native extra): shared gore/drugs/profanity
  // gating for the kid-safe horror titles (per-game gore overlays are
  // injected by the per-slug blocks above). Parity sources are untouched —
  // only the generated bundle gains this tag.
  if (CONTENT_MODE_SLUGS.has(slug) && !html.includes("content-mode-bridge.js")) {
    const tag = `<script src="/games/html/content-mode-bridge.js" data-slug="${slug}"></script>`;
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
    else html += tag;
  }
  writeFileSync(indexFile, html);
  return stripped.removed;
}

for (const [slug, legacyPath] of bundles) {
  const source = join(root, "public", "games", "html", ...legacyPath.split("/"));
  const dest = join(root, "public", "games", slug);
  if (!existsSync(join(source, "index.html"))) {
    missing.push(`${slug} (no index.html under games/html/${legacyPath}/)`);
    continue;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(join(root, "public", "games"), { recursive: true });
  cpSync(source, dest, { recursive: true });
  const chromeHits = normalizeRuntime(join(dest, "index.html"), slug);
  if (chromeHits === 0) console.warn(`Note: ${slug} had no recognizable site chrome to strip (already game-only?).`);
  synced += 1;
}

if (missing.length) {
  console.error(`Game bundle sync failed:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`Game bundle sync OK: ${synced} canonical slug bundles.`);
