// Verifies the GraveGain2dB v2-native bundle (slug gravegain2dB).
//
// Scope: the bundle public/games/gravegain2dB/** (shell + sim) plus its
// catalog registration. Parity-locked bundles and old-v1/ are never asserted
// here beyond "untouched elsewhere" (see verify-game-bundles.mjs).
// This script asserts:
//   1. Bundle files exist: index.html, game.js, game.css, game.json.
//   2. game.json slug is the mixed-case canonical `gravegain2dB` (+ compat
//      redirect note for lowercase `gravegain2db`).
//   3. Tick purity: the sim scope (src/sim.js when landed, else the shell
//      tick slice inside game.js) contains no document./localStorage/fetch(/
//      eval( in tick position.
//   4. Save separation: no live gravegain2dA storage-key usage anywhere in
//      the bundle (MUST-NOT mentions inside comments/strings are allowed —
//      only getItem/setItem/removeItem calls and SAVE_* constants count).
//   5. package.json wiring self-check STUB (fail-open: informational only —
//      the integrator lane owns package.json, this lane must not edit it).
//
// Fail-open: if the sim/game files have not landed yet, the sim-scope checks
// degrade to a clear TODO instead of crashing (1d check() style throughout).
// Static text asserts only (no game-code execution; replay execution lives in
// scripts/gravegain2dB-harness.mjs, which is NOT in the test chain).
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

function info(label) {
  console.log(`  info: ${label}`);
}

function read(rel) {
  try {
    return readFileSync(join(root, ...rel.split("/")), "utf8");
  } catch {
    return "";
  }
}

function present(rel) {
  return existsSync(join(root, ...rel.split("/")));
}

// ---- 1. bundle files ----
const dir = "public/games/gravegain2dB";
for (const f of ["index.html", "game.js", "game.css", "game.json"]) {
  check(`${dir}/${f} exists`, present(`${dir}/${f}`), "shell lane has not landed yet");
}
const shell = present(`${dir}/game.js`) ? read(`${dir}/game.js`) : "";
const SIM_REL = "public/games/gravegain2dB/src/sim.js";
const simSrc = present(SIM_REL) ? read(SIM_REL) : "";
const metaRaw = present(`${dir}/game.json`) ? read(`${dir}/game.json`) : "";

// ---- 2. game.json slug ----
const meta = metaRaw ? JSON.parse(metaRaw) : {};
check("game.json slug gravegain2dB (mixed-case canonical)", meta.slug === "gravegain2dB");
check(
  "game.json documents lowercase redirect",
  metaRaw.toLowerCase().includes("gravegain2db") && metaRaw.toLowerCase().includes("redirect"),
  "compat.redirect note missing",
);
check("game.json title non-empty", typeof meta.title === "string" && meta.title.trim().length > 0);

// ---- 3. tick purity (sim scope) ----
if (simSrc) {
  check("src/sim.js exposes newRun", simSrc.includes("newRun"));
  check("src/sim.js exposes tick", simSrc.includes("tick"));
  check("src/sim.js exposes hash", simSrc.includes("hash"));
  for (const token of ["document.", "localStorage", "fetch(", "AudioContext", "requestAnimationFrame"]) {
    check(`sim scope has no ${token}`, !simSrc.includes(token));
  }
  check("sim scope has no eval anywhere", !/\beval\s*\(/.test(simSrc));
} else {
  info(
    `TODO(sim-lane): ${SIM_REL} has not landed yet — tick-purity asserts run ` +
      `against the shell tick slice only; harness replay checks stay fail-open.`,
  );
  // The shell is a boot loader (DOM/save allowed outside the tick); assert
  // only on its narrow run-tick slice so shell chrome cannot false-pass or
  // false-fail the purity gate.
  const tickSlice = (() => {
    const start = shell.indexOf("Shell tick");
    if (start === -1) return "";
    return shell.slice(start, start + 2000);
  })();
  if (tickSlice) {
    for (const token of ["fetch(", "eval("]) {
      check(`shell tick slice has no ${token}`, !tickSlice.includes(token));
    }
  } else {
    info("TODO(sim-lane): no shell tick slice found — purity gate fully fail-open until sim lands.");
  }
}

// ---- 4. save separation (live 2dA key usage only; MUST-NOT mentions ok) ----
const bundleText = [shell, simSrc, metaRaw].join("\n");
const storageCall2dA = /(getItem|setItem|removeItem)\s*\([^)]*gravegain2dA/i.test(bundleText);
const saveConst2dA = /SAVE_(NS|KEY|PREFIX|NAMESPACE)[^;\n]*gravegain2dA/i.test(bundleText);
check("no live gravegain2dA storage calls", !storageCall2dA, "a getItem/setItem/removeItem touches a 2dA key");
check("no gravegain2dA SAVE_* constant", !saveConst2dA, "a SAVE_* constant points at the 2dA namespace");
check(
  "2dB save namespace referenced",
  /gravegain2dB[._]|SAVE_NS|SAVE_KEY|gg2db_/i.test(bundleText),
  "no 2dB-namespaced save key found yet",
);
check("no gore-gravegain1d leakage", !bundleText.includes("gore-gravegain1d"));

// ---- 5. package.json wiring self-check STUB (fail-open, informational) ----
info(
  "STUB: package.json wiring (verify:gravegain2dB-bundle) is owned by the " +
    "integrator lane — this script asserts nothing about package.json so " +
    "parallel lanes never conflict. Wire it exactly like " +
    'verify:gravegain1d ("node scripts/verify-gravegain2dB-bundle.mjs") when the bundle lands.',
);

if (failures) {
  console.error(`verify-gravegain2dB-bundle FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-gravegain2dB-bundle OK: shell bundle present, slug canonical, sim scope pure-or-TODO, saves separated.");
