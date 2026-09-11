// Verifier: Buddy presence — mic/VAD/barge-in memory, 3 avatars, camera.
// Static contract checks + REAL execution of lib/buddy-voice.ts (transpiled
// with the repo typescript into a temp dir, then asserted under node).
// Run: node scripts/verify-buddy-presence.mjs (no keys, no network).
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const fail = (msg) => { console.error(`VERIFY_FAIL: ${msg}`); process.exit(1); };
const assert = (cond, msg) => { if (!cond) fail(msg); };
const has = (file, ...needles) => {
  assert(existsSync(join(root, file)), `missing file ${file}`);
  const src = read(file);
  for (const n of needles) assert(src.includes(n), `${file} missing: ${n}`);
  return src;
};

// 1. Pure voice module: VAD + barge-in memory, zero imports (transpile-safe).
const voice = has(
  "lib/buddy-voice.ts",
  "frameEnergy", "updateVad", "mergePartialTranscript",
  "resumptionPrefix", "buildInterruptionSnapshot", "snapshotToPrompt",
  "pruneHistoryWithInterruptions",
);
assert(!voice.includes("from \"") && !voice.includes("from '") && !voice.includes("require("), "buddy-voice must stay import-free");

// 2. Engine: interruption flags + camera observation.
has(
  "lib/buddy-engine.ts",
  "interrupted", "hasCamera",
  "cleanBuddyHistory", "summarizeBuddyMemory", "smartBuddySystemPrompt",
);

// 3. Chat route takes camera frames as first-class image input.
has("app/api/buddy/chat/route.ts", "camera_image", "hasCamera", "cleanScreenImage");

// 4. Presence metering: route + quotes + migration.
has("app/api/buddy/presence/route.ts", "buddy-avatar", "buddy-camera", "heartbeat", "pendingMigration", "quoteAvatarMinutes");
const gameAi = has("lib/game-ai.ts", "buddy-avatar", "buddy-camera", "quoteAvatarMinutes", "quoteCameraFrames", "AVATAR_COINS_PER_MIN", "CAMERA_COINS_PER_FRAME");
assert(gameAi.includes('"min"') && gameAi.includes('"frame"'), "presence rates need min/frame units");
has(
  "supabase/migrations/20260918010000_buddy_presence_kinds.sql",
  "buddy-avatar", "buddy-camera", "0.08", "0.03", "heartbeat",
  "drop constraint if exists",
);

// 5. Avatars: one .tsx per type + shared rig factories, composed in buddy-avatar.
has(
  "components/buddy/avatars/types.ts",
  "AvatarKind", "RigUserData", "T3",
);
has(
  "components/buddy/avatars/parts.ts",
  "makeEye", "makeBrow", "makeMouth", "makeBlush", "makeStar", "markPaint",
);
has(
  "components/buddy/avatars/cube-avatar.tsx",
  "buildCubeAvatar", "markPaint", "userData",
);
has(
  "components/buddy/avatars/cloud-avatar.tsx",
  "buildCloudAvatar", "wingL", "wingR", "userData",
);
has(
  "components/buddy/avatars/anime-avatar.tsx",
  "buildAnimeAvatar", "ahoge", "fringe", "armL", "armR", "userData",
);
has(
  "components/buddy/buddy-avatar.tsx",
  "buildCubeAvatar", "buildCloudAvatar", "buildAnimeAvatar",
  "shadowMap", "castShadow", "receiveShadow",
  "cdn.jsdelivr.net/npm/three",
  "currentWord", "vowelOpenness",
  "BuddyAvatarFallback", "micStream", "outputEl",
);

// 6. Widget: mic + camera + avatar panels, barge-in wiring, cost copy.
const widget = has(
  "components/buddy/gaming-buddy.tsx",
  "Enable mic", "Mute me", "Unmute me", "Smart speech detection",
  "handleBargeIn", "updateVad", "getUserMedia",
  "Enable camera", "Camera off", "Read my vibe", "camera_image",
  "Show avatar", "Avatar color", "BuddyAvatar", "/api/buddy/presence",
  "centicentcoins", "cut in",
);
// Prior guarantees must survive (game-ai integrity script pins these).
for (const token of [
  'if (r.fallback) {',
  'shareMode === "off" ? null : captureSnapshot()',
  "!text.trim() || busy",
  "Ask for tactics",
  "Hail enemy AI",
  "counter-tactic",
  "data-buddy",
  'closest("[data-buddy]")',
  "TRUSTED_GAME_ORIGINS",
  "stopVoice",
  "BUDDY_DEFAULT_VOICE",
  "/api/my/usage",
  "lastCost",
]) {
  assert(widget.includes(token), `widget lost required token: ${token}`);
}

// 7. REAL execution: transpile buddy-voice.ts -> temp -> require -> assert.
// (tsc is invoked as a node script — no shell/`npx` resolution involved.)
const tmp = mkdtempSync(join(tmpdir(), "buddy-voice-"));
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
assert(existsSync(tscBin), "repo typescript is required to execute pure-module tests");
execFileSync(process.execPath, [tscBin, join(root, "lib", "buddy-voice.ts"), "--outDir", tmp, "--module", "commonjs", "--target", "es2020", "--skipLibCheck"], { cwd: root, stdio: "pipe" });
const bv = createRequire(join(root, "scripts", "x.mjs"))(join(tmp, "buddy-voice.js"));

// VAD: quiet stays quiet, loud starts, hangover bridges word gaps, then ends.
let s = { speaking: false, hang: 0 };
let r = bv.updateVad(s, 0.0);
assert(r.event === "none" && !r.state.speaking, "quiet must not start speech");
r = bv.updateVad(r.state, 0.5);
assert(r.event === "started" && r.state.speaking, "loud must start speech");
for (let i = 0; i < 7; i += 1) {
  r = bv.updateVad(r.state, 0.0);
  assert(r.state.speaking && r.event === "none", `hangover must bridge gap (frame ${i})`);
}
r = bv.updateVad(r.state, 0.0);
assert(r.event === "ended" && !r.state.speaking, "hangover expiry must end speech");
assert(bv.frameEnergy([0, 0, 0]) === 0, "silence energy must be 0");
assert(Math.abs(bv.frameEnergy([1, -1, 1, -1]) - 1) < 1e-9, "full-scale energy must be 1");

// Interruption memory: partial + progress survive into the next prompt.
assert(bv.mergePartialTranscript("hello", "hello there") === "hello there", "interim must extend the partial");
const snap = bv.buildInterruptionSnapshot({ partialUserText: "wait stop", buddyReplySoFar: "As I was saying", gameTitle: "Gravegain" });
const note = bv.snapshotToPrompt(snap);
assert(note.includes("wait stop") && note.includes("As I was saying") && note.includes("barge-in"), "resumption must carry both sides");
const turns = Array.from({ length: 10 }, (_, i) => ({ text: `t${i}`, interrupted: i === 1 }));
const pruned = bv.pruneHistoryWithInterruptions(turns, 8);
assert(pruned.length === 8, "prune must cap length");
assert(pruned.some((t) => t.text === "t1"), "prune must keep the interrupted turn");

console.log("VERIFY_OK: buddy presence (mic/VAD/barge-in, 3 avatars, camera) — static + executed pure tests pass.");
