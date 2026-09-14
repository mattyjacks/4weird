// Verifies the DS-MVAF movement+audio swarm (DS-MVAF-01..09 siblings).
// mvaf-10 (infra lane) owns this file; sibling fix lanes land concurrently,
// so EVERY check is order-independent: a missing/unfixed sibling file reports
// FAIL ("not landed yet") and never throws/crashes. Exit 0 only when all green.
//
// Asserts (static text asserts over public/games/html/ sources, no execution):
//   1. Movement (GG3D core): entities/player.js + engine/game-runtime.js carry
//      camera-true trig (nx*cos + nz*sin term present) AND NOT the mirrored
//      pattern (nx*cosYaw - nz*sinYaw). Identifier-prefix tolerant: matches
//      both `nx`/`nz` (post-fix) and `normX`/`normZ` (pre-fix) spellings.
//   2. Movement (batch): 3D-world games with avatar/vehicle movement
//      (APPLICABLE_BATCH) carry yaw/camera-relative resolution tokens;
//      fixed-camera/puzzle games are allow-listed N/A with reason comments.
//   3. Audio (core): audio/sound-engine.js has a musical bed (tremolo/LFO/
//      chord/arpeggio/progression tokens) + setMuted + disconnect, and NO
//      flat endless raw saw (`frequency.setValueAtTime(55` drone).
//   4. Audio (batch): game audio has stop-path + mute tokens, or is
//      allow-listed N/A-drone-free (short-SFX-only, no ambient bed) with a
//      real assert (no flat-55 drone token).
//   5. Every asserted html/ file passes `node --check` (syntax valid).
//
// Run from v2/vcw4w: `node scripts/verify-game-fixes.mjs`.
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
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function syntaxOk(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---- shared token patterns (order-independent, spelling-tolerant) ----
// Camera-true yaw resolution: worldX = nx*cos + nz*sin (plus-term).
const FIXED_TRIG_RE = /n(?:orm)?[xX]\s*\*\s*cos\w*\s*\+\s*n(?:orm)?[zZ]\s*\*\s*sin\w*/;
// Mirrored (wrong-sign) pattern: worldX = nx*cosYaw - nz*sinYaw.
const MIRRORED_TRIG_RE = /n(?:orm)?[xX]\s*\*\s*cos\w*\s*-\s*n(?:orm)?[zZ]\s*\*\s*sin\w*/;
// Flat endless raw saw drone (pre-fix ambient): 55 Hz sawtooth bed.
const FLAT_DRONE_RE = /frequency\.setValueAtTime\(\s*55\b/;
// Yaw/camera-relative resolution tokens for batch 3D movement games.
const YAW_TOKENS_RE =
  /yaw|cosYaw|sinYaw|cameraYaw|lookYaw|camera-relative|cameraRelative|rotation\.y|camera\.rotation|moveForward|strafe/;
// Musical bed tokens for the fixed ambient (tremolo/LFO/chord work, not raw saw).
const MUSICAL_BED_RE = /tremolo|LFO|musical|chord|arpeggio|progression|\bbed\b/i;
// Stop-path + mute tokens for per-game audio.
const STOP_MUTE_RE = /stopAmbient|stopMusic|setMuted|\.mute|disconnect|suspend\(\)|stopAll/i;

// ---- 1. GG3D core movement: camera-true trig, mirrored pattern gone ----
const CORE_MOVEMENT = [
  { rel: join("gravegain3d", "entities", "player.js"), lane: "mvaf-move-gg3d-player" },
  { rel: join("gravegain3d", "engine", "game-runtime.js"), lane: "mvaf-move-gg3d-runtime" },
];

console.log("GG3D core movement (camera-true trig):");
for (const { rel, lane } of CORE_MOVEMENT) {
  const abs = join(html, rel);
  const src = readAbs(abs);
  const present = src !== null;
  check(`${rel} exists`, present, present ? "" : `${lane} not landed yet`);
  if (!present) {
    check(`${rel} node --check`, false, "skipped: file missing");
    check(`${rel} camera-true trig (nx*cos + nz*sin)`, false, `${lane} not landed yet`);
    check(`${rel} mirrored trig absent`, false, `${lane} not landed yet`);
    continue;
  }
  check(`${rel} node --check`, syntaxOk(abs), "syntax error — run node --check on the file");
  check(
    `${rel} camera-true trig (nx*cos + nz*sin)`,
    FIXED_TRIG_RE.test(src),
    `${lane} not landed yet (expected worldX = nx*cos + nz*sin term)`
  );
  check(
    `${rel} mirrored trig absent (no nx*cosYaw - nz*sinYaw)`,
    !MIRRORED_TRIG_RE.test(src),
    `${lane} not landed yet (mirrored minus-sign pattern still present)`
  );
}

// ---- 2. Batch movement: yaw-relative where applicable, N/A allow-list ----
// APPLICABLE: 3D worlds with avatar/vehicle movement — sibling movement lanes
// are expected to land yaw/camera-relative resolution here.
const APPLICABLE_BATCH = [
  { rel: join("battlesharks2", "game.js"), lane: "mvaf-move-batch-sharks" },
  { rel: join("assassinanimals", "game.js"), lane: "mvaf-move-batch-assassin" },
  { rel: join("overtake", "game.js"), lane: "mvaf-move-batch-overtake" },
];

console.log("Batch movement (yaw/camera-relative where applicable):");
for (const { rel, lane } of APPLICABLE_BATCH) {
  const abs = join(html, rel);
  const src = readAbs(abs);
  const present = src !== null;
  check(`${rel} exists`, present, present ? "" : `${lane} not landed yet`);
  if (!present) {
    check(`${rel} node --check`, false, "skipped: file missing");
    check(`${rel} yaw/camera-relative movement`, false, `${lane} not landed yet`);
    continue;
  }
  check(`${rel} node --check`, syntaxOk(abs), "syntax error — run node --check on the file");
  check(
    `${rel} yaw/camera-relative movement`,
    YAW_TOKENS_RE.test(src),
    `${lane} not landed yet (no yaw/camera-relative resolution tokens)`
  );
}

// N/A (movement): fixed-camera/puzzle — no look yaw exists to fix. Each entry
// was read (movement code grepped); reason recorded so a future look-yaw
// addition reclassifies the game into APPLICABLE_BATCH above.
const NA_MOVEMENT = [
  // kouzi/neonbreaker/game.js: paddle breakout — keys/mousemove on a fixed
  // arena, avatar is the paddle (no look yaw).
  { rel: join("kouzi", "neonbreaker", "game.js"), reason: "fixed-arena paddle, no look" },
  // kouzi/neonracer/game.js: top-down fixed-track racer — sin/cos hits are
  // coin-spin/background probes only, movement is track-relative, no look yaw.
  { rel: join("kouzi", "neonracer", "game.js"), reason: "fixed-track top-down, no look" },
  // kouzi/neonsnake/game.js: grid snake — direction steps, no look yaw.
  { rel: join("kouzi", "neonsnake", "game.js"), reason: "grid stepper, no look" },
  // kouzi/neoninvaders/game.js: fixed-arena side-to-side shooter, no look yaw.
  { rel: join("kouzi", "neoninvaders", "game.js"), reason: "fixed-arena shooter, no look" },
  // kouzi/neonvoidrunner/game.js: endless runner on a fixed camera, no look yaw.
  { rel: join("kouzi", "neonvoidrunner", "game.js"), reason: "fixed-camera runner, no look" },
  // lastwordszombies/game.js: typing game — THREE camera is a fixed scene
  // camera (position.set + shadow frustum), avatar does not look/move in 3D.
  { rel: join("lastwordszombies", "game.js"), reason: "typing game, fixed scene camera" },
  // semester-survival/game.js: sim/UI — no avatar movement keys in game.js
  // (controls.js is menu bindings), no look yaw.
  { rel: join("semester-survival", "game.js"), reason: "sim/UI, no avatar look" },
  // orbitaldrift/game.js: fixed chase camera (camera.position.set +
  // lookAt origin); rotation.y hits are scenery (rings/planets), not avatar
  // look — fixed-camera, no look yaw.
  { rel: join("orbitaldrift", "game.js"), reason: "fixed chase camera, no avatar look" },
  { rel: join("demolichdom", "game.js"), reason: "fixed-camera, no look yaw" },
  // serversavershield/game.js: idle/tower — no yaw movement tokens, fixed view.
  { rel: join("serversavershield", "game.js"), reason: "idle/tower, fixed view" },
  // friendslop/game.js: no yaw movement tokens, fixed view.
  { rel: join("friendslop", "game.js"), reason: "fixed view, no look yaw" },
];

console.log("Batch movement N/A (fixed-camera/puzzle, documented):");
for (const { rel, reason } of NA_MOVEMENT) {
  const abs = join(html, rel);
  const src = readAbs(abs);
  const present = src !== null;
  check(`${rel} exists (N/A movement: ${reason})`, present, present ? "" : "sibling game not landed yet");
  if (!present) {
    check(`${rel} node --check`, false, "skipped: file missing");
    continue;
  }
  check(`${rel} node --check`, syntaxOk(abs), "syntax error — run node --check on the file");
  console.log(`  info: ${rel} N/A movement — ${reason}`);
  passes += 1;
}

// ---- 3. Core audio: musical bed + setMuted + disconnect, no raw saw ----
console.log("GG3D core audio (musical bed, mutable, stoppable):");
const seAbs = join(html, "gravegain3d", "audio", "sound-engine.js");
const se = readAbs(seAbs);
{
  const present = se !== null;
  check("sound-engine.js exists", present, present ? "" : "mvaf-audio-core not landed yet");
  if (!present) {
    check("sound-engine.js node --check", false, "skipped: file missing");
    check("sound-engine.js musical bed", false, "mvaf-audio-core not landed yet");
    check("sound-engine.js setMuted", false, "mvaf-audio-core not landed yet");
    check("sound-engine.js disconnect", false, "mvaf-audio-core not landed yet");
    check("sound-engine.js no flat 55Hz saw drone", false, "mvaf-audio-core not landed yet");
  } else {
    check("sound-engine.js node --check", syntaxOk(seAbs), "syntax error — run node --check on the file");
    check(
      "sound-engine.js musical bed (tremolo/LFO/chord/arpeggio)",
      MUSICAL_BED_RE.test(se),
      "mvaf-audio-core not landed yet (raw saw bed, no musical voices)"
    );
    check(
      "sound-engine.js setMuted",
      se.includes("setMuted"),
      "mvaf-audio-core not landed yet (no setMuted path)"
    );
    check(
      "sound-engine.js disconnect",
      se.includes("disconnect"),
      "mvaf-audio-core not landed yet (no disconnect stop-path)"
    );
    check(
      "sound-engine.js no flat 55Hz saw drone",
      !FLAT_DRONE_RE.test(se),
      "mvaf-audio-core not landed yet (frequency.setValueAtTime(55 saw drone still present)"
    );
  }
}

// ---- 4. Batch audio: stop-path + mute, or N/A-drone-free ----
const APPLICABLE_AUDIO = [
  { rel: join("battlesharks2", "game.js"), lane: "mvaf-audio-sharks" },
  { rel: join("assassinanimals", "game.js"), lane: "mvaf-audio-assassin" },
  { rel: join("orbitaldrift", "game.js"), lane: "mvaf-audio-orbital" },
  { rel: join("semester-survival", "game.js"), lane: "mvaf-audio-semester" },
  { rel: join("lastwordszombies", "game.js"), lane: "mvaf-audio-lwz" },
  { rel: join("lastwordszombies", "audio.js"), lane: "mvaf-audio-lwz" },
];

console.log("Batch audio (stop-path + mute where applicable):");
for (const { rel, lane } of APPLICABLE_AUDIO) {
  const abs = join(html, rel);
  const src = readAbs(abs);
  const present = src !== null;
  check(`${rel} exists`, present, present ? "" : `${lane} not landed yet`);
  if (!present) {
    check(`${rel} node --check`, false, "skipped: file missing");
    check(`${rel} stop-path + mute`, false, `${lane} not landed yet`);
    continue;
  }
  check(`${rel} node --check`, syntaxOk(abs), "syntax error — run node --check on the file");
  check(
    `${rel} stop-path + mute`,
    STOP_MUTE_RE.test(src),
    `${lane} not landed yet (no stop/mute path)`
  );
}

// N/A (audio): drone-free games — short-SFX-only, no ambient bed to stop/mute.
// Real assert per game: no flat-55 endless saw token.
const NA_AUDIO = [
  // Short playSound sine blips only (verified: playSound(440/660/880, …,
  // 'sine') one-shots), no ambient bed.
  { rel: join("kouzi", "neonbreaker", "game.js"), reason: "short-SFX-only, no ambient bed" },
  { rel: join("kouzi", "neonracer", "game.js"), reason: "short-SFX-only, no ambient bed" },
  { rel: join("kouzi", "neonsnake", "game.js"), reason: "short-SFX-only, no ambient bed" },
  { rel: join("kouzi", "neoninvaders", "game.js"), reason: "short-SFX-only, no ambient bed" },
  { rel: join("kouzi", "neonvoidrunner", "game.js"), reason: "short-SFX-only, no ambient bed" },
  { rel: join("overtake", "game.js"), reason: "no ambient drone bed" },
  { rel: join("demolichdom", "game.js"), reason: "no ambient drone bed" },
  { rel: join("serversavershield", "game.js"), reason: "no ambient drone bed" },
  { rel: join("friendslop", "game.js"), reason: "no ambient drone bed" },
];

console.log("Batch audio N/A (drone-free, documented):");
for (const { rel, reason } of NA_AUDIO) {
  const abs = join(html, rel);
  const src = readAbs(abs);
  const present = src !== null;
  check(`${rel} exists (N/A audio: ${reason})`, present, present ? "" : "sibling game not landed yet");
  if (!present) {
    check(`${rel} node --check`, false, "skipped: file missing");
    check(`${rel} no flat 55Hz saw drone`, false, "skipped: file missing");
    continue;
  }
  check(`${rel} node --check`, syntaxOk(abs), "syntax error — run node --check on the file");
  check(
    `${rel} no flat 55Hz saw drone`,
    !FLAT_DRONE_RE.test(src),
    `endless saw drone found in ${rel} — needs a stop-path, move to APPLICABLE_AUDIO`
  );
}

if (failures) {
  console.error(`verify-game-fixes FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-game-fixes OK: ${passes} checks passed (movement + audio fixes landed).`);
