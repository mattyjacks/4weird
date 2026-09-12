// Verifier: Buddy chat SSE streaming; static contract checks + REAL execution
// of lib/buddy-stream.ts (transpiled with the repo typescript into a temp
// dir, then asserted under node).
// Run: node scripts/verify-buddy-stream.mjs (no keys, no network).
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

// 1. Pure SSE module: headers + frame codec + event classifiers, zero imports.
const stream = has(
  "lib/buddy-stream.ts",
  "BUDDY_SSE_HEADERS", "sseEncode", "isBuddyStreamRequested",
  "responsesDeltaFromEvent", "isResponsesCompleted", "isResponsesFailed",
);
assert(!stream.includes("from \"") && !stream.includes("from '") && !stream.includes("require("), "buddy-stream must stay import-free");
assert(stream.includes("text/event-stream"), "buddy-stream must pin the SSE content type");

// 2. Chat route serves both transports: JSON default + opt-in SSE branch.
const chat = has(
  "app/api/buddy/chat/route.ts",
  "isBuddyStreamRequested", "text/event-stream", "response.output_text.delta",
  "Unable to meter this turn.",
);
// The meter-before-done invariant must hold on the stream too, not just JSON.
assert(chat.includes("meter_game_ai_usage"), "chat route must meter streamed turns");

// 3. Widget reads SSE progressively and falls back to JSON.
has(
  "components/buddy/gaming-buddy.tsx",
  "readBuddyStream", "text/event-stream", "updateLiveMessage", "streamingActive",
);

// 4. REAL execution: transpile buddy-stream.ts -> temp -> require -> assert.
const tmp = mkdtempSync(join(tmpdir(), "buddy-stream-"));
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
assert(existsSync(tscBin), "repo typescript is required to execute pure-module tests");
execFileSync(process.execPath, [tscBin, join(root, "lib", "buddy-stream.ts"), "--outDir", tmp, "--module", "commonjs", "--target", "es2020", "--skipLibCheck"], { cwd: root, stdio: "pipe" });
const bs = createRequire(join(root, "scripts", "x.mjs"))(join(tmp, "buddy-stream.js"));

// Frame codec: exact SSE wire shape.
assert(bs.sseEncode({ delta: "hi" }) === 'data: {"delta":"hi"}\n\n', "sseEncode must emit data: <json> + blank line");
assert(bs.isBuddyStreamRequested({ stream: true }) === true, "stream:true must request SSE");
assert(bs.isBuddyStreamRequested({}) === false, "missing flag must stay JSON");
assert(bs.isBuddyStreamRequested({ stream: "true" }) === false, "string flag must not request SSE");

// Event classifiers: deltas flow, completion/failure terminate, noise ignored.
assert(bs.responsesDeltaFromEvent("response.output_text.delta", { delta: "yo" }) === "yo", "delta event must yield text");
assert(bs.responsesDeltaFromEvent("response.output_text.delta", { delta: "" }) === null, "empty delta must yield null");
assert(bs.responsesDeltaFromEvent("other", { delta: "yo" }) === null, "non-delta event must yield null");
assert(bs.isResponsesCompleted("response.completed", {}) === true, "completed event must terminate");
assert(bs.isResponsesCompleted("other", {}) === false, "noise must not terminate");
assert(bs.isResponsesFailed("response.failed", {}) === true, "failed event must terminate as error");
assert(bs.isResponsesFailed("error", {}) === true, "bare error event must terminate as error");
assert(bs.isResponsesFailed("response.completed", {}) === false, "completed must not read as failure");

console.log("VERIFY_OK: buddy SSE streaming (codec, classifiers, dual-transport route + widget); static + executed pure tests pass.");
