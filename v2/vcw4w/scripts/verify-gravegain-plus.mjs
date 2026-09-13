// Verifies the GraveGain plus-upgrade overlay layer (v2 layer only).
//
// Scope: parity-locked bundles (public/games/html/gravegain2d/**,
// gravegain3d/**) and old-v1/ are never asserted here beyond "untouched"
// (see verify-game-bundles.mjs + verify-legacy-parity.mjs). This script asserts:
//   1. The 8 v2-native overlay files exist at public/games/html/*.js, each
//      exposing its window global with an idempotency guard
//      (`if (window.X) ... return`, per aiorch-01.md protocol).
//   2. None of the 8 overlays live inside the parity-locked gravegain2d/ or
//      gravegain3d/ trees (v2-native siblings only).
//   3. Content mirrors exist: content/gravegain-emergent.ts,
//      content/gravegain-arsenal.ts, content/gravegain-saga-plus.ts.
//   4. scripts/sync-game-bundles.mjs references all 8 files (existsSync +
//      only-when-absent guards, slug-routed) without touching parity sources.
//   5. No `gore-gravegain1d` string anywhere in the new layer (1D stays
//      teen-clean by design; see verify-gravegain1d.mjs).
//
// Static text asserts (no JS execution needed).
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

function exists(rel) {
  return existsSync(join(root, ...rel.split("/")));
}

// ---- 1. overlay files: existence + window global + idempotency guard ----
const overlays = [
  { file: "gravegain-models-3d.js", global: "window.GraveGainModels3D" },
  { file: "gravegain-2p5d.js", global: "window.GraveGain25D", globalRe: /window\.GraveGain2[Pp]?5[Dd]/ },
  { file: "gravegain-voxel-gore.js", global: "window.GraveGainVoxelGore" },
  { file: "gravegain-perf.js", global: "window.GraveGainPerf" },
  { file: "gravegain-emergent.js", global: "window.GraveGainEmergent" },
  { file: "gravegain-arsenal.js", global: "window.GraveGainArsenal" },
  { file: "gravegain-enemies.js", global: "window.GraveGainEnemies" },
  { file: "gravegain1d-art.js", global: "window.GraveGain1DArt" },
];

const sources = {};
for (const { file, global, globalRe } of overlays) {
  const rel = `public/games/html/${file}`;
  const ok = exists(rel);
  check(`${rel} exists`, ok);
  const src = ok ? read(rel) : "";
  sources[file] = src;
  if (globalRe) check(`${file} exposes 2.5D global (${global})`, globalRe.test(src));
  else check(`${file} exposes ${global}`, src.includes(global));
  check(`${file} idempotent (if (window.X) guard)`, /if\s*\(\s*window\.[\w$]+\s*\)\s*(\{|return)/.test(src));
}

// ---- 2. parity trees untouched ----
const plusNames = overlays.map((o) => o.file);
for (const tree of ["gravegain2d", "gravegain3d"]) {
  check(`no plus overlays inside parity-locked ${tree}/ tree`, (() => {
    try {
      const walk = (dir) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          if (e.isDirectory()) { if (walk(p)) return true; }
          else if (plusNames.includes(e.name)) return true;
        }
        return false;
      };
      return !walk(join(root, "public", "games", "html", tree));
    } catch { return false; }
  })());
}

// ---- 3. content mirrors ----
const mirrors = [
  "content/gravegain-emergent.ts",
  "content/gravegain-arsenal.ts",
  "content/gravegain-saga-plus.ts",
];
for (const rel of mirrors) {
  const ok = exists(rel);
  check(`${rel} exists`, ok);
  check(`${rel} non-empty`, ok && read(rel).trim().length > 0);
}

// ---- 4. sync injection references ----
const sync = exists("scripts/sync-game-bundles.mjs") ? read("scripts/sync-game-bundles.mjs") : "";
for (const { file } of overlays) {
  check(`sync injects ${file}`, sync.includes(file));
}
check("sync keeps gravegain2d+gravegain3d scoping", /gravegain2d.*gravegain3d|gravegain3d.*gravegain2d/s.test(sync));
check("sync keeps only-when-absent guards", /html\.includes\(/.test(sync));
check("sync keeps existsSync guards", /existsSync\((poolSrc|src|goreSrc)\)/.test(sync));

// ---- 5. no gore-gravegain1d anywhere in the new layer ----
const scanned = [sync, ...Object.values(sources)];
if (exists("public/games/html/gravegain1d/game.js")) scanned.push(read("public/games/html/gravegain1d/game.js"));
for (const rel of mirrors) if (exists(rel)) scanned.push(read(rel));
check("no gore-gravegain1d references anywhere", scanned.every((s) => !s.includes("gore-gravegain1d")));

if (failures) {
  console.error(`verify-gravegain-plus FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-gravegain-plus OK: 8 overlays + content mirrors + sync wiring, parity-safe.");
