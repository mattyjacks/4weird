// Verifies the GraveGain4D swarm (lanes gg4d-01..08, DS-GG4D envelopes).
// gg4d-09 (infra lane) owns this file; sibling builders land concurrently,
// so EVERY check is order-independent: a missing sibling file reports
// FAIL (never throws/crashes). Exit 0 only when all present.
//
// Asserts (static text asserts, no JS execution needed):
//   1. Each GG4D lane file exists under public/games/html/.
//   2. Each lane file passes `node --check` (syntax valid, vanilla JS).
//   3. Each lane file exposes its window flag (idempotent guard pattern
//      `if (window.<Flag>) return;` or an assignment `window.<Flag> =`).
//   4. Each lane file registers via `GraveGainMods` + `.push({`.
//   5. Graphics (gg4d-02) reuses 3D models by reference
//      (GraveGainGraphics3D / GraveGain3DModels) and defines no new
//      enemy BoxGeometry (no fork).
//   6. Bundle dir public/games/gravegain4d/{game.json,index.html,game.js}
//      exists (gg4d-05).
//   7. Content modules content/gravegain4d-modes.ts + content/gravegain4d-lore.ts
//      exist and carry canon names (Angel Good, Mirathiel, Groknak, Hades)
//      (gg4d-06).
//
// Run from v2/vcw4w: `node scripts/verify-gravegain4d.mjs`.
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

// lane -> { file (under public/games/html), flag (window.<flag>), envelope }
const LANES = [
  { lane: "gg4d-01", file: "gravegain4d-math.js", flag: "GraveGain4DMath" },
  { lane: "gg4d-02", file: "gravegain4d-graphics.js", flag: "GraveGain4DGraphics" },
  { lane: "gg4d-03", file: "gravegain4d-worlds.js", flag: "GraveGain4DWorlds" },
  { lane: "gg4d-04", file: "gravegain4d-missions.js", flag: "GraveGain4DMissions" },
];

function syntaxOk(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("GG4D lane files (gg4d-01..04):");
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

// ---- gg4d-02 reuse: no forked enemy art ----
console.log("GG4D graphics reuse (gg4d-02, read-only):");
const gfxAbs = join(html, "gravegain4d-graphics.js");
const gfx = existsSync(gfxAbs) ? readAbs(gfxAbs) : "";
if (!existsSync(gfxAbs)) {
  check("graphics reuses GraveGainGraphics3D/GraveGain3DModels", false, "skipped: file missing");
  check("graphics defines no enemy BoxGeometry (no fork)", false, "skipped: file missing");
} else {
  check(
    "graphics reuses GraveGainGraphics3D/GraveGain3DModels",
    gfx.includes("GraveGainGraphics3D") && gfx.includes("GraveGain3DModels"),
    "expected delegation to window.GraveGainGraphics3D + window.GraveGain3DModels, zero new art"
  );
  check(
    "graphics defines no enemy BoxGeometry (no fork)",
    !/BoxGeometry/.test(gfx),
    "BoxGeometry found in graphics module — reuse 3D models by reference, never redefine enemy geometry"
  );
}

// ---- gg4d-05 bundle dir ----
console.log("GG4D bundle (gg4d-05, read-only):");
const bundle = join(root, "public", "games", "gravegain4d");
for (const f of ["game.json", "index.html", "game.js"]) {
  const abs = join(bundle, f);
  check(
    `bundle public/games/gravegain4d/${f} exists`,
    existsSync(abs),
    "gg4d-05 bundle not landed yet"
  );
}

// ---- gg4d-06 content modules ----
console.log("GG4D content (gg4d-06, read-only):");
const modesRel = join("content", "gravegain4d-modes.ts");
const loreRel = join("content", "gravegain4d-lore.ts");
const modesAbs = join(root, modesRel);
const loreAbs = join(root, loreRel);
const modesOk = existsSync(modesAbs);
const loreOk = existsSync(loreAbs);
check(`${modesRel} exists`, modesOk, modesOk ? "" : "gg4d-06 modes not landed yet");
check(`${loreRel} exists`, loreOk, loreOk ? "" : "gg4d-06 lore not landed yet");
const contentSrc = `${modesOk ? readAbs(modesAbs) : ""}\n${loreOk ? readAbs(loreAbs) : ""}`;
for (const name of ["Angel Good", "Mirathiel", "Groknak", "Hades"]) {
  const bothMissing = !modesOk && !loreOk;
  check(
    `content carries canon ${name}`,
    contentSrc.includes(name),
    bothMissing
      ? "gg4d-06 content not landed yet"
      : `canon name '${name}' not found in gravegain4d-modes.ts / gravegain4d-lore.ts`
  );
}

if (failures) {
  console.error(`verify-gravegain4d FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-gravegain4d OK: ${passes} checks passed (gg4d-01..06 landed, reuse + bundle + canon green).`);
