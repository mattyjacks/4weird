// Verifies the GraveGain5D scaffold (slug gravegain5d).
//
// Scope: the standalone bundle public/games/gravegain5d/** (game.json,
// index.html, game.js, game.css) + the multiverse lane module
// public/games/html/gravegain5d-universes.js + content/gravegain5d-modes.ts
// and content/gravegain5d-lore.ts. old-v1/ is never asserted here.
// This script asserts:
//   1. Bundle files exist: index.html, game.js, game.css, game.json.
//   2. game.js exposes window.GraveGain5D with newRun/tick/score/hop +
//      UNIVERSES (6) + CLASSES (3) + HOLES (10) + SAVE_KEY.
//   3. Tick-core purity: no document./canvas/localStorage/fetch/eval in the
//      rules core (tick function body must not contain them).
//   4. No vendored three.js copy under gravegain5d/ (CDN only).
//   5. Lane module exposes window.GraveGain5DUniverses + GraveGainMods.push.
//   6. Content modules exist and carry canon names.
//   7. game.json slug gravegain5d + versioned save key present.
//
// Static text asserts (no JS execution needed).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;
let passes = 0;

function check(label, cond, hint = "") {
  if (cond) {
    passes += 1;
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}${hint ? ` — ${hint}` : ""}`);
  }
}

function read(rel) {
  return readFileSync(join(root, ...rel.split("/")), "utf8");
}

function syntaxOk(rel) {
  try {
    execFileSync(process.execPath, ["--check", join(root, ...rel.split("/"))], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---- 1. bundle files ----
const dir = "public/games/gravegain5d";
for (const f of ["index.html", "game.js", "game.css", "game.json"]) {
  check(`${dir}/${f} exists`, existsSync(join(root, "public", "games", "gravegain5d", f)));
}
const game = existsSync(join(root, dir, "game.js")) ? read(`${dir}/game.js`) : "";
const index = existsSync(join(root, dir, "index.html")) ? read(`${dir}/index.html`) : "";

// ---- 2. engine API ----
check("game exposes window.GraveGain5D", game.includes("window.GraveGain5D"));
for (const token of ["newRun", "tick: tick", "hop", "score: score", "UNIVERSES", "CLASSES", "HOLES", "SAVE_KEY"]) {
  check(`game exposes ${token}`, game.includes(token));
}
check("6 universes defined", (game.match(/id: '(prime|echo|dream|void|bloom|static)'/g) || []).length === 6);
check("3 classes defined", ["putter:", "warden:", "drifter:"].every((t) => game.includes(t)));
check("10 holes defined", (game.match(/name: '/g) || []).length >= 10);
check("victory + collapse + paradox", game.includes("victory") && game.includes("collapse") && game.includes("paradox"));
check("game.js node --check", existsSync(join(root, dir, "game.js")) && syntaxOk(`${dir}/game.js`));
check("source index has no site chrome", !/nav-placeholder|footer-placeholder|starfield|game-header|components\.js|styles\.css/.test(index));

// ---- 3. tick-core purity ----
const tickBody = (() => {
  const start = game.indexOf("function tick(s, action)");
  if (start === -1) return "";
  const next = game.indexOf("function nextUniverse", start);
  return next === -1 ? game.slice(start) : game.slice(start, next);
})();
for (const token of ["document.", "canvas.getContext", "localStorage", "fetch(", "eval(", "AudioContext", "requestAnimationFrame"]) {
  check(`tick core has no ${token}`, !tickBody.includes(token));
}
check("game.js has no eval anywhere", !/\beval\s*\(/.test(game));

// ---- 4. no vendored three.js ----
check("no vendored three.min.js under gravegain5d/", (() => {
  try {
    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    return !walk(join(root, "public", "games", "gravegain5d")).some((f) => /three(\.min)?\.js$/i.test(f));
  } catch {
    return false;
  }
})(), "three.js must load via CDN, never vendored");
check("three via CDN in index", index.includes("cdnjs.cloudflare.com/ajax/libs/three.js") || index.includes("cdn.jsdelivr.net/npm/three"));

// ---- 5. lane module ----
const laneRel = "public/games/html/gravegain5d-universes.js";
check(`${laneRel} exists`, existsSync(join(root, "public", "games", "html", "gravegain5d-universes.js")));
const lane = existsSync(join(root, laneRel)) ? read(laneRel) : "";
check("lane exposes window.GraveGain5DUniverses", lane.includes("window.GraveGain5DUniverses"));
check("lane idempotent guard", /if\s*\(\s*window\.GraveGain5DUniverses/.test(lane));
check("lane GraveGainMods.push registered", lane.includes("GraveGainMods") && /\.push\s*\(\s*\{/.test(lane));
check("lane node --check", existsSync(join(root, laneRel)) && syntaxOk(laneRel));

// ---- 6. content modules ----
const modesOk = existsSync(join(root, "content", "gravegain5d-modes.ts"));
const loreOk = existsSync(join(root, "content", "gravegain5d-lore.ts"));
check("content/gravegain5d-modes.ts exists", modesOk);
check("content/gravegain5d-lore.ts exists", loreOk);
const contentSrc = `${modesOk ? read("content/gravegain5d-modes.ts") : ""}\n${loreOk ? read("content/gravegain5d-lore.ts") : ""}`;
for (const name of ["Angel Good", "Mirathiel", "Groknak", "Hades"]) {
  check(`content carries canon ${name}`, contentSrc.includes(name));
}

// ---- 7. game.json + save key ----
let meta = null;
try {
  meta = existsSync(join(root, dir, "game.json")) ? JSON.parse(read(`${dir}/game.json`)) : null;
} catch {
  meta = null;
}
check("game.json slug gravegain5d", !!meta && meta.slug === "gravegain5d");
check("game.json title non-empty", !!meta && typeof meta.title === "string" && meta.title.trim().length > 0);
check("versioned save key gravegain5d_save_v1", game.includes("gravegain5d_save_v1"));

if (failures) {
  console.error(`verify-gravegain5d FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-gravegain5d OK: ${passes} checks passed (5D multiverse scaffold green).`);
