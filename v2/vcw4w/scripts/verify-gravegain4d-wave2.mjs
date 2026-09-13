// Verifies the GraveGain4D wave-2 swarm (DS-G4D2 envelopes).
// g4d2-09 (infra lane) owns this file; sibling builders land concurrently,
// so EVERY check is order-independent: a missing sibling file reports
// FAIL (never throws/crashes). Exit 0 only when all present.
//
// Asserts (static text asserts, no JS execution needed):
//   1. Each wave-2 lane file exists under public/games/html/.
//   2. Each lane file passes `node --check` (syntax valid, vanilla JS).
//   3. Each lane file exposes its window flag (idempotent guard pattern
//      `if (window.<Flag>) return;` or an assignment `window.<Flag> =`).
//   4. Each lane file registers via `GraveGainMods` + `.push({`.
//   5. TS modules content/gravegain4d-holes.ts + content/gravegain4d-saga.ts
//      + content/gravegain4d-guide.ts exist (presence only, never executed).
//   6. Holes sanity via regex on file text: 18 par entries, every par in
//      3-5, 4+ distinct worldIds.
//   7. Visual/physics modules (golf/geometry/time/trippy) define no new
//      BoxGeometry (comments stripped before matching, so a comment that
//      says "no BoxGeometry" does not trip the check).
//   8. Saga/guide/holes carry canon names (Angel Good, Mirathiel, Groknak,
//      Hades).
//
// Run from v2/vcw4w: `node scripts/verify-gravegain4d-wave2.mjs`.
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
  { lane: "wave2-golf", file: "gravegain4d-golf.js", flag: "GraveGain4DGolf" },
  { lane: "wave2-geometry", file: "gravegain4d-geometry.js", flag: "GraveGain4DGeometry" },
  { lane: "wave2-time", file: "gravegain4d-time.js", flag: "GraveGain4DTime" },
  { lane: "wave2-trippy", file: "gravegain4d-trippy.js", flag: "GraveGain4DTrippy" },
  { lane: "wave2-mods", file: "gravegain4d-mods.js", flag: "GraveGain4DMods" },
];

function syntaxOk(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("GG4D wave-2 lane files (golf/geometry/time/trippy/mods):");
for (const { lane, file, flag } of LANES) {
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
  const guardRe = new RegExp(`if\\s*\\(\\s*window\\.${flag}\\s*\\)`);
  check(
    `${lane} window.${flag} exposed`,
    flagRe.test(src),
    `expected window.${flag} assignment`
  );
  check(
    `${lane} window.${flag} idempotent guard`,
    guardRe.test(src) || /GraveGainMods/.test(src),
    `expected if (window.${flag}) return; (or registry-only mod)`
  );
  check(
    `${lane} GraveGainMods.push registered`,
    src.includes("GraveGainMods") && /\.push\s*\(\s*\{/.test(src),
    "expected GraveGainMods.push({ name, ... })"
  );
}

// ---- wave-2 visual/physics: no forked geometry ----
console.log("GG4D wave-2 geometry reuse (golf/geometry/time/trippy, read-only):");
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^\S:])\/\/[^\n]*/g, "$1");
}
for (const file of [
  "gravegain4d-golf.js",
  "gravegain4d-geometry.js",
  "gravegain4d-time.js",
  "gravegain4d-trippy.js",
]) {
  const abs = join(html, file);
  if (!existsSync(abs)) {
    check(`${file} defines no BoxGeometry (no fork)`, false, "skipped: file missing");
    continue;
  }
  const code = stripComments(readAbs(abs));
  check(
    `${file} defines no BoxGeometry (no fork)`,
    !/BoxGeometry/.test(code),
    "BoxGeometry found in wave-2 module — reuse 3D models by reference, never redefine geometry"
  );
}

// ---- wave-2 content modules (presence only, never executed) ----
console.log("GG4D wave-2 content (holes/saga/guide, read-only):");
const holesRel = join("content", "gravegain4d-holes.ts");
const sagaRel = join("content", "gravegain4d-saga.ts");
const guideRel = join("content", "gravegain4d-guide.ts");
const holesAbs = join(root, holesRel);
const sagaAbs = join(root, sagaRel);
const guideAbs = join(root, guideRel);
const holesOk = existsSync(holesAbs);
const sagaOk = existsSync(sagaAbs);
const guideOk = existsSync(guideAbs);
check(`${holesRel} exists`, holesOk, holesOk ? "" : "wave-2 holes not landed yet");
check(`${sagaRel} exists`, sagaOk, sagaOk ? "" : "wave-2 saga not landed yet");
check(`${guideRel} exists`, guideOk, guideOk ? "" : "wave-2 guide not landed yet");

// ---- holes sanity via regex on file text (no TS execution) ----
console.log("GG4D wave-2 holes sanity (regex on file text, read-only):");
if (!holesOk) {
  check("holes carry 18 par entries", false, "skipped: file missing");
  check("holes pars all in range 3-5", false, "skipped: file missing");
  check("holes span 4+ worldIds", false, "skipped: file missing");
} else {
  const src = readAbs(holesAbs);
  const pars = [...src.matchAll(/par\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  check(
    "holes carry 18 par entries",
    pars.length === 18,
    `found ${pars.length} par entries, expected 18`
  );
  check(
    "holes pars all in range 3-5",
    pars.length > 0 && pars.every((p) => p >= 3 && p <= 5),
    pars.length
      ? `out-of-range par values: ${pars.filter((p) => p < 3 || p > 5).join(", ")}`
      : "no par entries found"
  );
  const worldIds = new Set(
    [...src.matchAll(/worldId\s*:\s*["']([^"']+)["']/g)].map((m) => m[1])
  );
  check(
    "holes span 4+ worldIds",
    worldIds.size >= 4,
    `found ${worldIds.size} distinct worldId(s): ${[...worldIds].join(", ") || "none"}`
  );
}

// ---- canon names across saga/guide/holes ----
console.log("GG4D wave-2 canon (saga/guide/holes, read-only):");
const canonSrc = `${holesOk ? readAbs(holesAbs) : ""}\n${sagaOk ? readAbs(sagaAbs) : ""}\n${guideOk ? readAbs(guideAbs) : ""}`;
for (const name of ["Angel Good", "Mirathiel", "Groknak", "Hades"]) {
  const allMissing = !holesOk && !sagaOk && !guideOk;
  check(
    `wave-2 content carries canon ${name}`,
    canonSrc.includes(name),
    allMissing
      ? "wave-2 content not landed yet"
      : `canon name '${name}' not found in gravegain4d-holes.ts / gravegain4d-saga.ts / gravegain4d-guide.ts`
  );
}

if (failures) {
  console.error(`verify-gravegain4d-wave2 FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-gravegain4d-wave2 OK: ${passes} checks passed (wave-2 lanes + holes sanity + canon green).`);
