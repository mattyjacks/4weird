// Verifies the aiorch-01 emergent-content swarm wiring (E20 lane).
//
// For every LANDED G1-G9 / E11-E19 overlay file under public/games/html/:
//   1. file exists on disk
//   2. `node --check` passes (vanilla-JS syntax)
//   3. exposes its window flag via regex (window.<Flag> assignment)
//   4. pushes a GraveGainMods registry entry via regex (REGISTRY contract)
//
// Plus routing truth in scripts/sync-game-bundles.mjs:
//   - wired files must be referenced (filename string present)
//   - ruled-out duplicates must be ABSENT (conflict rulings pinned in code)
//
// Open-lane files with no content on disk (E11 sidequests, E12 characters,
// E13 events, E14 loot, E16 drift, E17/E18 endless, E19 codex) report SKIP,
// not FAIL -- do not invent content.
//
// Run from v2/vcw4w: `node scripts/verify-gravegain-swarm.mjs`
// Exit 0 = zero FAILs (SKIPs allowed). Any FAIL -> exit 1.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const htmlDir = join(root, "public", "games", "html");
const syncFile = join(root, "scripts", "sync-game-bundles.mjs");

// file, lane, window flag, wired slugs ("RULED-OUT" = must stay unwired)
const LANDED = [
  { file: "voxel-gore-3d.js", lane: "G1", flag: "VoxelGore3D", slugs: ["gravegain3d"] },
  { file: "gravegain-models-3d.js", lane: "G2", flag: "GraveGainModels3D", slugs: ["gravegain3d"] },
  { file: "gravegain3d-models.js", lane: "G2", flag: "GraveGain3DModels", slugs: "RULED-OUT" },
  { file: "gravegain-thread-tuner.js", lane: "G3", flag: "GraveGainThreadTuner", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-2p5d.js", lane: "G4", flag: "GraveGain25D", slugs: ["gravegain2d"] },
  { file: "gravegain2d-25d.js", lane: "G4", flag: "GraveGain2D_25D", slugs: ["gravegain2d"] },
  { file: "gravegain-25d.js", lane: "G4-extra", flag: "GraveGain25D", slugs: ["gravegain2d"] },
  { file: "gravegain2d-sprites.js", lane: "G5", flag: "GraveGain2DSprites", slugs: ["gravegain2d"] },
  { file: "gravegain1d-art.js", lane: "G6", flag: "GraveGain1DArt", slugs: ["gravegain1d"] },
  { file: "gravegain-1dart.js", lane: "A6-extra", flag: "GraveGain1DArt", slugs: ["gravegain1d"] },
  { file: "gravegain-agebands.js", lane: "G7", flag: "GraveGainAgeBands", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain3d-arsenal.js", lane: "G8", flag: "GraveGain3DArsenal", slugs: ["gravegain3d"] },
  { file: "gravegain-arsenal-2d1d.js", lane: "G9", flag: "GraveGainArsenal2D1D", slugs: ["gravegain1d", "gravegain2d"] },
  { file: "gravegain-voxel-gore.js", lane: "VG", flag: "GraveGainVoxelGore", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-emergent.js", lane: "E11/E12/E13", flag: "GraveGainEmergent", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-enemies.js", lane: "E15", flag: "GraveGainEnemies", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-bestiary.js", lane: "E15", flag: "GraveGainBestiary", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-sidequests.js", lane: "E11", flag: "GraveGainSidequests", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-characters.js", lane: "E12", flag: "GraveGainCharacters", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-events.js", lane: "E13", flag: "GraveGainEvents", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain-loot.js", lane: "E14", flag: "GraveGainLoot", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
  { file: "gravegain1d-drift.js", lane: "E16", flag: "GraveGain1DDrift", slugs: ["gravegain1d"] },
  { file: "gravegain2d-endless.js", lane: "E17", flag: "GraveGain2DEndless", slugs: ["gravegain2d"] },
  { file: "gravegain3d-endless.js", lane: "E18", flag: "GraveGain3DEndless", slugs: ["gravegain3d"] },
  { file: "gravegain-codex.js", lane: "E19", flag: "GraveGainCodex", slugs: ["gravegain1d", "gravegain2d", "gravegain3d"] },
];

// Open lanes: no content landed yet (missing file is expected, not a failure).
const OPEN_LANES = [
];

let pass = 0;
let fail = 0;
let skip = 0;
const failures = [];
function ok(msg) { pass += 1; console.log(`ok: ${msg}`); }
function bad(msg) { fail += 1; failures.push(msg); console.log(`FAIL: ${msg}`); }
function skp(msg) { skip += 1; console.log(`SKIP: ${msg}`); }

const syncSrc = existsSync(syncFile) ? readFileSync(syncFile, "utf8") : null;
if (!syncSrc) bad(`sync-game-bundles.mjs missing at scripts/sync-game-bundles.mjs -- E20 wiring has no host`);
else ok(`sync-game-bundles.mjs present`);

// 1d source must not carry the ruled-out 1dart tag (first-wins collision
// with the canonical gravegain1d-art.js); sync must not route it either.
const idx1d = join(htmlDir, "gravegain1d", "index.html");

for (const entry of LANDED) {
  const p = join(htmlDir, entry.file);
  if (!existsSync(p)) { bad(`${entry.file} MISSING on disk (lane ${entry.lane} claims landed)`); continue; }
  ok(`${entry.file} exists (lane ${entry.lane})`);
  try {
    execFileSync(process.execPath, ["--check", p], { stdio: "pipe" });
    ok(`${entry.file} node --check clean`);
  } catch {
    bad(`${entry.file} node --check FAILED -- lane ${entry.lane} must fix syntax`);
    continue;
  }
  const src = readFileSync(p, "utf8");
  const flagRe = new RegExp(`window\\.${entry.flag}\\s*=`);
  if (flagRe.test(src)) ok(`${entry.file} exposes window.${entry.flag}`);
  else bad(`${entry.file} does NOT expose window.${entry.flag} -- lane ${entry.lane} must add the flag assignment`);
  if (/GraveGainMods\s*\.\s*push\s*\(/.test(src)) ok(`${entry.file} pushes window.GraveGainMods`);
  else bad(`${entry.file} has NO GraveGainMods.push -- lane ${entry.lane} follow-up (REGISTRY contract: push { name, version, init })`);
  if (!syncSrc) continue;
  // Quoted match: routes are double-quoted array strings; comments mention
  // filenames bare, so a bare match would false-positive on ruling comments.
  const quoted = `"${entry.file}"`;
  if (entry.slugs === "RULED-OUT") {
    if (!syncSrc.includes(quoted)) ok(`${entry.file} correctly ABSENT from sync-game-bundles.mjs (conflict ruling)`);
    else bad(`${entry.file} is RULED-OUT but still referenced in sync-game-bundles.mjs -- E20 must remove the route`);
  } else {
    if (syncSrc.includes(quoted)) ok(`${entry.file} routed in sync-game-bundles.mjs (${entry.slugs.join("+")})`);
    else bad(`${entry.file} NOT referenced in sync-game-bundles.mjs -- E20 must add the ${entry.slugs.join("+")} route`);
  }
}

for (const entry of OPEN_LANES) {
  if (existsSync(join(htmlDir, entry.file))) bad(`${entry.file} exists but lane ${entry.lane} is still marked open -- claim it or wire it`);
  else skp(`${entry.file} absent (lane ${entry.lane} open -- follow-up, content not invented)`);
}

// 1D art runs in orchestrator-ruled MERGE mode: both 1dart (source tag) and
// 1d-art (sync route) must be present and union keys (merge guards verified).
if (existsSync(idx1d)) {
  const idx = readFileSync(idx1d, "utf8");
  if (idx.includes("gravegain-1dart.js")) ok(`gravegain1d/index.html carries merge-pair gravegain-1dart.js`);
  else bad(`gravegain1d/index.html LOST the gravegain-1dart.js merge-pair tag -- E20 must restore it (orchestrator MERGE ruling)`);
  if (idx.includes("gravegain1d-art.js") || (syncSrc && syncSrc.includes('"gravegain1d-art.js"'))) ok(`gravegain1d art route present (source tag or sync)`);
  else bad(`gravegain1d has NO 1d-art route anywhere -- E20 must wire gravegain1d-art.js`);
}

console.log(`\nverify-gravegain-swarm: ${pass} passed, ${fail} failed, ${skip} skipped (open lanes).`);
if (fail) {
  console.log(`Failing checks:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`verify-gravegain-swarm OK.`);
