// Verifies the Battlesharks 2 LORE + WORLD layer (slug battlesharks2).
//
// Scope: V2 layer only. The parity-locked bundle
// (public/games/html/battlesharks2/**: game.js, game.css, index.html,
// game.json) and old-v1/ are never asserted here beyond "untouched" (see
// verify-game-bundles.mjs + verify-legacy-parity.mjs). Sibling battlesharks2
// lanes (mobile joystick, desktop/perf/a11y, tune, guide, balance) own their
// files and their scripts/verify-battlesharks2.mjs — this script asserts ONLY
// the lore lane and never their overlays. It asserts:
//   1. content/battlesharks2-lore.ts exports the lore bible (BS2_LORE with
//      facility history, 3+ scientist logs, zone guide, 5+ bestiary entries,
//      timeline) plus helpers getBestiary/getLog, stays Teens-safe (family
//      copy, profanity ceiling damn/hell), and proposes BS2_CATALOG_BLURB
//      without editing content/games.ts.
//   2. public/games/html/battlesharks2-lore.js exists: vanilla IIFE codex
//      button + Logs/Bestiary/Zones panel fed from window.BS2_LORE with a
//      built-in fallback, pointer-events scoped to panel only, game input
//      untouched, clears the sibling touch bar.
//   3. scripts/sync-game-bundles.mjs injects battlesharks2-lore.js for the
//      battlesharks2 slug only, existsSync-guarded, only when absent.
//   4. package.json wires verify:battlesharks2-lore.
//   5. No lore/codex files inside the parity-locked battlesharks2/ tree.
//
// Static text asserts (no TS compilation needed): files are read as text
// and checked for the required exports, hooks, and gating expressions.
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

// ---- 1. lore module ----
const modRel = "content/battlesharks2-lore.ts";
check(`${modRel} exists`, existsSync(join(root, "content", "battlesharks2-lore.ts")));
const mod = existsSync(join(root, "content", "battlesharks2-lore.ts")) ? read(modRel) : "";

for (const name of ["BS2_LORE", "BS2_LOGS", "BS2_ZONES", "BS2_BESTIARY", "BS2_TIMELINE", "BS2_FACILITY", "BS2_CATALOG_BLURB"]) {
  check(`lore module exports ${name}`, new RegExp(`export\\s+(const|type)\\s+${name}\\b`).test(mod));
}
for (const name of ["getBestiary", "getLog"]) {
  check(`lore module exports helper ${name}`, new RegExp(`export\\s+function\\s+${name}\\b`).test(mod));
}
check("lore covers BS-07 Aquarium Complex facility history", mod.includes("BS-07 Aquarium Complex") && /foundedBy|history/.test(mod));
for (const log of ["osei-why-we-built-the-tanks", "vega-laser-rig", "park-coral-and-clownfish", "harlow-kraken-warning"]) {
  check(`lore log covers ${log}`, mod.includes(`"${log}"`));
}
const logCount = (mod.match(/id: "[a-z0-9-]+",\n\s*author:/g) || []).length;
check(`lore has 3+ scientist logs (${logCount})`, logCount >= 3);
for (const zone of ["launch-bay", "testing-bay", "kraken-arena"]) {
  check(`lore zone guide covers ${zone}`, mod.includes(`"${zone}"`));
}
check("zone guide names Launch Bay, Testing Bay, Robo-Kraken arena", mod.includes("Launch Bay") && mod.includes("Testing Bay") && mod.includes("Robo-Kraken Arena"));
for (const beast of ["clownfish-fry", "hunter-sub", "naval-mine", "robo-kraken", "mutagen-vent"]) {
  check(`lore bestiary covers ${beast}`, mod.includes(`"${beast}"`));
}
check("bestiary entries carry behavior + counter", mod.includes("behavior:") && mod.includes("counter:"));
check("lore carries a timeline", mod.includes("BS2_TIMELINE") && mod.includes("Today — Your Run"));
check("lore module scoped to slug battlesharks2", mod.includes("battlesharks2"));
check("lore keeps Teens ceiling (no strong profanity)", !/\b(fuck|shit|cunt|bitch|bastard|asshole|dick|pussy|cock)\b/i.test(mod));
check("lore copy is family-safe", !/\b(sexual|erotic|porn|nude|naked|seduc|orgasm)\b/i.test(mod));
check("catalog blurb proposed without touching games.ts description", mod.includes("BS2_CATALOG_BLURB") && mod.includes("games.ts description stays"));

// ---- 2. overlay script ----
const overlayRel = "public/games/html/battlesharks2-lore.js";
check(`${overlayRel} exists`, existsSync(join(root, "public", "games", "html", "battlesharks2-lore.js")));
const overlay = existsSync(join(root, "public", "games", "html", "battlesharks2-lore.js")) ? read(overlayRel) : "";

check("overlay is a vanilla IIFE", /\(function\s*\(\)\s*\{/.test(overlay) && overlay.trimEnd().endsWith("})();"));
check("overlay exposes window.BS2Codex", overlay.includes("window.BS2Codex"));
check("overlay injects 📖 CODEX corner button", overlay.includes("📖 CODEX"));
check("overlay panel has Logs/Bestiary/Zones tabs", overlay.includes('"logs"') && overlay.includes('"bestiary"') && overlay.includes('"zones"'));
check("overlay reads window.BS2_LORE with built-in fallback", overlay.includes("window.BS2_LORE") && overlay.includes("FALLBACK"));
check("overlay fallback matches TS module ids", overlay.includes("osei-why-we-built-the-tanks") && overlay.includes("robo-kraken") && overlay.includes("launch-bay"));
check("overlay root is pointer-events:none, panel opts in", /#bs2-codex-root\{[^}]*pointer-events:none/.test(overlay) && /pointer-events:auto/.test(overlay));
check("overlay uses try/catch defensively", (overlay.match(/try\s*\{/g) || []).length >= 10);
check("overlay adds no keyboard listeners", !/addEventListener\s*\(\s*['"](keydown|keyup|keypress)['"]/.test(overlay));
check("overlay never requests pointer lock", !/requestPointerLock/.test(overlay));
check("overlay never touches locked bundle paths", !overlay.includes("battlesharks2/game.js") && !overlay.includes("battlesharks2/game.css"));
check("overlay is idempotent under double-inject", overlay.includes("if (window.BS2Codex) return;"));
check("overlay clears sibling touch bar (body.bs2-touch offset)", overlay.includes("body.bs2-touch #bs2-codex-btn"));

// ---- 3. sync injection ----
const sync = read("scripts/sync-game-bundles.mjs");
check("sync injects battlesharks2-lore.js", sync.includes("battlesharks2-lore.js"));
check("sync injection scoped to battlesharks2 slug", /slug === "battlesharks2" && !html\.includes\("battlesharks2-lore\.js"\)/.test(sync));
check("sync injection guarded by existsSync", /existsSync\(loreSrc\)/.test(sync));
check("sync lore block leaves sibling injections intact", sync.includes("battlesharks2-mobile.js") && sync.includes("battlesharks2-desktop.js"));

// ---- 4. package.json wiring ----
const pkg = JSON.parse(read("package.json"));
check("package.json wires verify:battlesharks2-lore", pkg.scripts && pkg.scripts["verify:battlesharks2-lore"] === "node scripts/verify-battlesharks2-lore.mjs");

// ---- 5. parity lock: nothing new inside the locked tree ----
check("no lore/codex files inside parity-locked battlesharks2/ tree", (() => {
  try {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (walk(p)) return true; }
        else if (/lore|codex/i.test(e.name)) return true;
      }
      return false;
    };
    return !walk(join(root, "public", "games", "html", "battlesharks2"));
  } catch { return false; }
})());

// ---- 6. generated bundle carries the injection (present after sync:games) ----
check("generated public/games/battlesharks2/index.html carries lore tag (when generated)", (() => {
  try {
    const gen = join(root, "public", "games", "battlesharks2", "index.html");
    if (!existsSync(gen)) return true; // sync not run in this checkout; not a failure
    const html = readFileSync(gen, "utf8");
    return html.includes("battlesharks2-lore.js") && (html.match(/battlesharks2-lore\.js/g) || []).length === 1;
  } catch { return false; }
})());

if (failures) {
  console.error(`verify-battlesharks2-lore FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-battlesharks2-lore OK: lore bible + codex overlay + sync injection gated per spec.");
