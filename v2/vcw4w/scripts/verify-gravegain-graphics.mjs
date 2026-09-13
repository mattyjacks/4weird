// Verifies the GraveGain graphics swarm (lanes G1–G9) plus the G10
// settings/QA augmentation. G10 lane owns this file; E20 owns manifests
// (**/game.json, **/index.html, scripts/sync-game-bundles.mjs) and the
// swarm verifier — this script asserts static mod contracts only:
//
//   1. Each G1–G9 lane file exists under public/games/html/.
//   2. Each lane file passes `node --check` (syntax valid, vanilla JS).
//   3. Each lane file exposes its window flag (idempotent guard pattern
//      `if (window.<Flag>) return;` or an assignment `window.<Flag> =`).
//   4. Each lane file registers via `window.GraveGainMods` + `.push({`.
//   5. G10: gravegain3d/engine/graphics-settings.js exposes
//      window.GraveGainGraphicsSettings, the sibling-hook fan-out
//      (voxel density, 2.5D lights, emoji particles, tuner governor),
//      the content-mode (kid|teen|all) selector, and its own mods push.
//   6. Spot checks: gravegain2d/game.js settings block + gravegain1d/game.js
//      settings (mode/speed) still present (read-only asserts, no edits).
//
// Static text asserts (no JS execution needed) + `node --check` per file.
// A missing lane file FAILS with the lane number so the queue owner is
// obvious — unlanded lanes are expected to fail until they land.
// Run from v2/vcw4w: `node scripts/verify-gravegain-graphics.mjs`.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const html = join(root, "public", "games", "html");
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

function readAbs(path) {
  return readFileSync(path, "utf8");
}

// lane -> { file (under public/games/html), flag (window.<flag>) }
const LANES = [
  { lane: "G1", file: "voxel-gore-3d.js", flag: "VoxelGore3D" },
  { lane: "G2", file: "gravegain3d-models.js", flag: "GraveGain3DModels" },
  { lane: "G3", file: "gravegain-thread-tuner.js", flag: "GraveGainThreadTuner" },
  { lane: "G4", file: "gravegain2d-25d.js", flag: "GraveGain2D25D", altFlag: "GraveGain2D_25D" },
  { lane: "G5", file: "gravegain2d-sprites.js", flag: "GraveGain2DSprites" },
  { lane: "G6", file: "gravegain1d-art.js", flag: "GraveGain1DArt" },
  { lane: "G7", file: "gravegain-agebands.js", flag: "GraveGainAgeBands" },
  { lane: "G8", file: "gravegain3d-arsenal.js", flag: "GraveGain3DArsenal" },
  { lane: "G9", file: "gravegain-arsenal-2d1d.js", flag: "GraveGainArsenal2D1D" },
];

function syntaxOk(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("G1–G9 lane files:");
for (const { lane, file, flag, altFlag } of LANES) {
  const abs = join(html, file);
  const present = existsSync(abs);
  check(`${lane} ${file} exists`, present, present ? "" : `${lane} lane not landed yet`);
  if (!present) {
    check(`${lane} ${file} node --check`, false, "skipped: file missing");
    check(`${lane} window.${flag} exposed`, false, "skipped: file missing");
    check(`${lane} GraveGainMods.push registered`, false, "skipped: file missing");
    continue;
  }
  const src = readAbs(abs);
  check(`${lane} ${file} node --check`, syntaxOk(abs), "syntax error — run node --check on the file");
  const flagRe = new RegExp(`window\\.${flag}\\b`);
  const altRe = altFlag ? new RegExp(`window\\.${altFlag}\\b`) : null;
  const guardRe = new RegExp(`if\\s*\\(\\s*window\\.${flag}\\s*\\)`);
  const altGuardRe = altFlag ? new RegExp(`if\\s*\\(\\s*window\\.${altFlag}\\s*\\)`) : null;
  check(
    `${lane} window.${flag} exposed${altFlag ? ` (or ${altFlag})` : ""}`,
    flagRe.test(src) || (altRe !== null && altRe.test(src)),
    altFlag
      ? `expected window.${flag} or window.${altFlag} assignment`
      : `expected window.${flag} assignment`
  );
  check(
    `${lane} window.${flag} idempotent guard`,
    guardRe.test(src) || (altGuardRe !== null && altGuardRe.test(src)) || /GraveGainMods/.test(src),
    `expected if (window.${flag}) return; (or registry-only mod)`
  );
  check(
    `${lane} GraveGainMods.push registered`,
    src.includes("GraveGainMods") && /\.push\s*\(\s*\{/.test(src),
    "expected window.GraveGainMods.push({ name, ... })"
  );
}

// ---- G10: settings augmentation (diverged dir, editable) ----
console.log("G10 settings + QA:");
const settingsRel = join("gravegain3d", "engine", "graphics-settings.js");
const settingsAbs = join(html, settingsRel);
check(
  `gravegain3d/engine/graphics-settings.js exists`,
  existsSync(settingsAbs),
  "G10 settings file missing"
);
const settings = existsSync(settingsAbs) ? readAbs(settingsAbs) : "";
if (settings) {
  check("settings node --check", syntaxOk(settingsAbs), "syntax error in G10-edited file");
  check(
    "settings exposes window.GraveGainGraphicsSettings",
    settings.includes("window.GraveGainGraphicsSettings"),
    "pre-existing export must keep working"
  );
  for (const token of [
    "applyPreset",
    "benchmarkAndApply",
    "autoDetect",
    "autoDegrade",
    "getCurrent",
  ]) {
    check(`settings keeps export ${token}`, settings.includes(token));
  }
  for (const token of [
    "applySiblingHooks",
    "VoxelGore3D",
    "GraveGain2D25D",
    "GraveGain1DArt",
    "GraveGainThreadTuner",
    "setContentMode",
    "getContentMode",
    "fourweird-content-mode",
  ]) {
    check(`settings G10 addition references ${token}`, settings.includes(token));
  }
  check(
    "settings content modes kid|teen|all",
    settings.includes("CONTENT_MODES") &&
      /content=\(kid\|teen\|all\)/.test(settings) &&
      /\bkid\b/.test(settings) &&
      /\bteen\b/.test(settings) &&
      /\ball\b/.test(settings),
    "kid|teen|all selector incomplete"
  );
  check(
    "settings G10 idempotent guard",
    settings.includes("window.__GraveGainG10"),
    "expected window.__GraveGainG10 append-only guard"
  );
  check(
    "settings G10 GraveGainMods.push registered",
    settings.includes("gravegain-graphics-settings-g10") && /\.push\s*\(\s*\{/.test(settings),
    "expected mods push for QA detection"
  );
}

// ---- read-only spot checks: 2D/1D settings sections untouched ----
console.log("2D/1D settings spot checks (read-only):");
const game2d = join(html, "gravegain2d", "game.js");
const game1d = join(html, "gravegain1d", "game.js");
check("gravegain2d/game.js exists", existsSync(game2d));
if (existsSync(game2d)) {
  const src = readAbs(game2d);
  check("2D settings block present", src.includes("settings: {") && src.includes("difficulty"));
}
check("gravegain1d/game.js exists", existsSync(game1d));
if (existsSync(game1d)) {
  const src = readAbs(game1d);
  check(
    "1D settings (mode/speed) present",
    src.includes("settings:") && src.includes("'turn'") && src.includes("speed")
  );
}

if (failures) {
  console.error(`verify-gravegain-graphics FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-gravegain-graphics OK: ${passes} checks passed (G1–G9 landed, G10 settings+QA green).`);
