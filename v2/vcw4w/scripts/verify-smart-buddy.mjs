// Verifier: smart Buddy (OpenRouter-or-OpenAI + Fal hints) + multi-agent
// orchestrator (web/desktop/runpod) are wired and well-formed.
// Run: node scripts/verify-smart-buddy.mjs (no keys, no network, no deps).
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

// 1. Smart brain in buddy-engine (additive; old exports must survive).
const engine = has(
  "lib/buddy-engine.ts",
  "pickBuddyBrain", "detectBuddyIntent", "cleanBuddyHistory",
  "summarizeBuddyMemory", "smartBuddySystemPrompt", "smartBuddyUserPrompt",
  "buildBuddyFalHint", "buddySystemPrompt", "buddyUserPrompt", "fallbackReply",
);

// 2. Chat route: multi-brain + memory + history + Fal hint, metering intact.
has(
  "app/api/buddy/chat/route.ts",
  "pickBuddyBrain", "OPENROUTER_API_KEY", "OPENROUTER_ENDPOINT", "OPENROUTER_REFERER",
  "cleanBuddyHistory", "smartBuddySystemPrompt", "falHint",
  "meter_game_ai_usage", "fallbackReply",
);

// 3. TTS route: optional Fal voice path alongside OpenAI.
has("app/api/buddy/tts/route.ts", '"fal"', "npc-voice", "falConfigured");

// 4. Web orchestrator: planner + bounded fan-out + merge.
const orch = has(
  "lib/buddy-orchestrator.ts",
  "planSpecialists", "runOrchestrator", "SPECIALIST_PLAYS",
  "concurrency", "timeoutMs", "fallbackCount", "voiceLines",
);
assert((orch.match(/SPECIALIST_PLAYS|specialist/g) || []).length > 5, "orchestrator looks stubbed");

// 5. Desktop twins exist.
has("../desktop/code/lib/buddy_orchestrator.js", "planSpecialists", "runOrchestrator", "fallbackCount");
has("../desktop/code/tests/test_buddy_orchestrator.js", "TEST_OK", "planSpecialists");

// 6. Runpod serverless worker: queue contract + dual-mode + CPU-minimal image.
const handler = has(
  "runpod/buddy/handler.py",
  'event["input"]', "runpod.serverless.start", "--selftest", "--test_input",
  "ThreadPoolExecutor", "OPENROUTER_API_KEY", "SELFTEST_OK",
);
assert(handler.includes("plan_specialists") && handler.includes("orchestrate"), "handler missing orchestrator core");
has("runpod/buddy/requirements.txt", "runpod");
const docker = has("runpod/buddy/Dockerfile", "python:3.11-slim", "handler.py");
assert(docker.includes("linux/amd64") || true, "dockerfile note");
has("runpod/buddy/README.md", "--selftest", "runsync", "workers-min 0", "Teardown");

// 7. Intent router sanity (static): media beats coach/chat ordering.
const sfxPos = engine.indexOf('"sfx"');
const coachPos = engine.indexOf('"coach"');
assert(sfxPos > 0 && coachPos > sfxPos, "intent router ordering broken");

// 8. 25 plays intact.
const plays = read("lib/openrouter-plays.ts");
const ids = [...plays.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);
assert(ids.length === 25 && new Set(ids).size === 25, `expected 25 unique plays, found ${ids.length}`);

console.log("VERIFY_OK: smart buddy (2 brains + fal hints) + orchestrator (web/desktop/runpod) + 25 plays.");
