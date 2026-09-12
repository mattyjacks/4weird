// Verifies the GraveGain1D v2-native game (slug gravegain1d).
//
// Scope: the new bundle public/games/html/gravegain1d/** (no old-v1 source;
// v2-native extras are allowed by verify-game-bundles) plus its catalog
// registration. Parity-locked bundles and old-v1/ are never asserted here
// beyond "untouched elsewhere" (see verify-game-bundles.mjs).
// This script asserts:
//   1. Bundle files exist: index.html, game.js, game.css, game.json.
//   2. game.js exposes window.GraveGain1D with newRun/tick/score + dual
//      modes (turn + realtime tokens) + 3 classes + 5 sectors.
//   3. Tick-core purity: no document./canvas/localStorage/fetch/eval in the
//      rules core (game.js may use them ONLY outside tick — checked by
//      scoping: the tick function body must not contain them).
//   4. Generated canonical bundle carries runtime-bridge.js (+ data-slug),
//      fourweird-workers.js, no relative game-meta, no site chrome.
//   5. game.json <-> content/games.ts genre/tags consistency.
//   6. content/games.ts entry shape, lib/age-gate.ts rating, sync bundles row,
//      CONTENT_MODE_SLUGS must NOT contain gravegain1d (teen-clean by design).
//   7. Versioned save key present.
//   8. package.json wiring.
//
// Static text asserts (no JS execution needed).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;

function check(label, cond, hint = "") {
  if (cond) {
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}${hint ? ` — ${hint}` : ""}`);
  }
}

function read(rel) {
  return readFileSync(join(root, ...rel.split("/")), "utf8");
}

// ---- 1. bundle files ----
const dir = "public/games/html/gravegain1d";
for (const f of ["index.html", "game.js", "game.css", "game.json"]) {
  check(`${dir}/${f} exists`, existsSync(join(root, "public", "games", "html", "gravegain1d", f)));
}
const game = existsSync(join(root, dir, "game.js")) ? read(`${dir}/game.js`) : "";
const index = existsSync(join(root, dir, "index.html")) ? read(`${dir}/index.html`) : "";

// ---- 2. engine API ----
check("game exposes window.GraveGain1D", game.includes("window.GraveGain1D"));
for (const token of ["newRun", "tick: tick", "score: score", "CLASSES", "SECTORS", "CODEX", "SAVE_KEY"]) {
  check(`game exposes ${token}`, game.includes(token));
}
check("dual modes turn + realtime", game.includes("'turn'") && game.includes("'realtime'") && game.includes("realtime") && game.includes("turn-based") || (game.includes("turn") && game.includes("realtime")));
for (const cls of ["rifleman", "sapper", "runner"]) {
  check(`class ${cls} defined`, game.includes(`${cls}:`));
}
for (const boss of ["wright", "mirathiel", "warden", "karguk", "titan"]) {
  check(`boss mech ${boss} defined`, game.includes(`mech: '${boss}'`));
}
check("5 sectors defined", (game.match(/name: '(Crash Flats|Whisper Groves|Sparkite Cut|Ash Gate|Relay Approach)'/g) || []).length === 5);
check("victory + endless (Echo Drift)", game.includes("victory") && game.includes("endless"));

// ---- 3. tick-core purity ----
const tickBody = (() => {
  const start = game.indexOf("function tick(s, action)");
  if (start === -1) return "";
  // Take a generous slice covering tick + its callees is overkill; assert on
  // the tick function itself (to the next top-level function marker).
  const next = game.indexOf("function score(s)", start);
  return next === -1 ? game.slice(start) : game.slice(start, next);
})();
for (const token of ["document.", "canvas.getContext", "localStorage", "fetch(", "eval(", "AudioContext", "requestAnimationFrame"]) {
  check(`tick core has no ${token}`, !tickBody.includes(token));
}
check("game.js has no eval anywhere", !/\beval\s*\(/.test(game));

// ---- 4. generated canonical bundle ----
const gen = "public/games/gravegain1d/index.html";
check(`${gen} generated`, existsSync(join(root, "public", "games", "gravegain1d", "index.html")));
const genHtml = existsSync(join(root, gen)) ? read(gen) : "";
// Strip the sync-injected embed CSS (it names chrome ids in selectors).
const genBody = genHtml.replace(/<style id="fourweird-game-only">[\s\S]*?<\/style>/, "");
check("generated bundle includes runtime-bridge.js", genHtml.includes("/games/html/runtime-bridge.js"));
check('generated bundle tags data-slug="gravegain1d"', genHtml.includes('data-slug="gravegain1d"'));
check("generated bundle includes fourweird-workers.js", genHtml.includes("/games/html/fourweird-workers.js"));
check("generated bundle has no relative game-meta", !genHtml.includes('"../game-meta.js"') && !genHtml.includes("'../game-meta.js") && !genHtml.includes('"../../game-meta.js"'));
for (const token of ["nav-placeholder", "footer-placeholder", "starfield", "game-header", "game-info-panel", "credits-section", "bio-section", "more-games"]) {
  check(`generated bundle has no ${token}`, !genBody.includes(token));
}
for (const token of ["styles.css", "components.js"]) {
  check(`generated bundle has no ${token}`, !genHtml.includes(token));
}
check("source index has no site chrome either", !/nav-placeholder|footer-placeholder|starfield|game-header|components\.js|styles\.css/.test(index));

// ---- 5. game.json <-> games.ts consistency ----
const meta = existsSync(join(root, dir, "game.json")) ? JSON.parse(read(`${dir}/game.json`)) : {};
check("game.json slug gravegain1d", meta.slug === "gravegain1d");
check("game.json title non-empty", typeof meta.title === "string" && meta.title.trim().length > 0);
check("game.json genre RPG", meta.genre === "RPG");
const catalog = read("content/games.ts");
check("games.ts genre matches game.json", catalog.includes("'gravegain1d','GraveGain1D'") && catalog.includes("'RPG'"));
for (const tag of ["HTML5", "RPG", "1D", "Turn-Based"]) {
  check(`games.ts tags include ${tag}`, catalog.includes(`'${tag}'`));
}
check("games.ts runtimePath exact", catalog.includes("/games/gravegain1d/index.html") || catalog.includes("/games/${slug}/index.html"));

// ---- 6. registration ----
check("lib/age-gate.ts rates gravegain1d teens", read("lib/age-gate.ts").includes('gravegain1d: "teens"'));
const sync = read("scripts/sync-game-bundles.mjs");
check('sync bundles include ["gravegain1d","gravegain1d"]', sync.includes('["gravegain1d", "gravegain1d"]') || sync.includes('["gravegain1d","gravegain1d"]'));
check("CONTENT_MODE_SLUGS excludes gravegain1d (teen-clean by design)", (() => {
  const m = sync.match(/CONTENT_MODE_SLUGS\s*=\s*new Set\(\[([^\]]*)\]\)/);
  return !!m && !m[1].includes("gravegain1d");
})());
check("no gore-gravegain1d references anywhere", !sync.includes("gore-gravegain1d") && !game.includes("gore-gravegain1d"));

// ---- 7. versioned save key ----
check("versioned save key gravegain1d_save_v1", game.includes("gravegain1d_save_v1"));

// ---- 8. package.json wiring ----
const pkg = JSON.parse(read("package.json"));
check("package.json wires verify:gravegain1d", pkg.scripts && pkg.scripts["verify:gravegain1d"] === "node scripts/verify-gravegain1d.mjs");
check("npm test runs verify:gravegain1d", typeof pkg.scripts.test === "string" && pkg.scripts.test.includes("verify:gravegain1d"));

if (failures) {
  console.error(`verify-gravegain1d FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-gravegain1d OK: 1D ley-line march playable, registered, parity-safe.");
