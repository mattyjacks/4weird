// Verifier: Buddy proactive score reactions (opt-in auto /react on big jumps).
// Static contract checks + REAL execution of lib/buddy-proactive.ts (transpiled
// with the repo typescript into a temp dir, then asserted under node).
// Run: node scripts/verify-buddy-proactive.mjs (no keys, no network).
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

// 1. Pure proactive module: state + four helpers, zero imports (transpile-safe).
const proactive = has(
  "lib/buddy-proactive.ts",
  "ProactiveState",
  "shouldAutoReactScore",
  "cooldownReady",
  "autoReactPrompt",
  "capAutos",
);
assert(!proactive.includes("from \"") && !proactive.includes("from '") && !proactive.includes("require("), "buddy-proactive must stay import-free");
assert(!proactive.includes("document.") && !proactive.includes("window."), "buddy-proactive must stay DOM-free");

// 2. REAL execution: transpile buddy-proactive.ts -> temp -> require -> assert.
const tmp = mkdtempSync(join(tmpdir(), "buddy-proactive-"));
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
assert(existsSync(tscBin), "repo typescript is required to execute pure-module tests");
execFileSync(process.execPath, [tscBin, join(root, "lib", "buddy-proactive.ts"), "--outDir", tmp, "--module", "commonjs", "--target", "es2020", "--skipLibCheck"], { cwd: root, stdio: "pipe" });
const bp = createRequire(join(root, "scripts", "x.mjs"))(join(tmp, "buddy-proactive.js"));

const NOW = 1700000000000;

// Jump triggers, tiny change does not, equal does not.
assert(bp.shouldAutoReactScore(100, 130, NOW) === true, "jump of 30 must trigger");
assert(bp.shouldAutoReactScore(100, 105, NOW) === false, "tiny change of 5 must not trigger");
assert(bp.shouldAutoReactScore(100, 100, NOW) === false, "equal scores must not trigger");
// Crossing from null triggers; null/NaN next never triggers, never throws.
assert(bp.shouldAutoReactScore(null, 50, NOW) === true, "first real score (null -> n) must trigger");
assert(bp.shouldAutoReactScore(100, null, NOW) === false, "null next must not trigger");
assert(bp.shouldAutoReactScore(null, null, NOW) === false, "null -> null must not trigger");
assert(bp.shouldAutoReactScore(100, NaN, NOW) === false, "NaN next must not trigger");
assert(bp.shouldAutoReactScore(NaN, 130, NOW) === true, "NaN prev crossing to real score must trigger");
assert(bp.shouldAutoReactScore(undefined, undefined, NOW) === false, "undefined must be safe");
assert(bp.shouldAutoReactScore("x", "y", NOW) === false, "garbage input must be safe");

// Cooldown blocks rapid re-fire; readiness gates it.
assert(bp.cooldownReady(0, NOW) === true, "never-fired (0) must be ready");
assert(bp.cooldownReady(NOW, NOW) === false, "immediate re-fire must not be ready");
assert(bp.cooldownReady(NOW - 61000, NOW) === true, "elapsed cooldown must be ready");
assert(bp.shouldAutoReactScore(0, 100, NOW, { lastAutoAt: NOW }) === false, "cooldown must block rapid re-fire via opts");
assert(bp.shouldAutoReactScore(0, 100, NOW, { lastAutoAt: NOW - 61000 }) === true, "elapsed cooldown must allow a real jump");

// Prompt reuses the /react phrasing so server normalization matches manual react.
const prompt = bp.autoReactPrompt(130, "boss fight");
assert(typeof prompt === "string" && prompt.includes("React"), "auto prompt must contain React phrasing");
assert(prompt.includes("130"), "auto prompt must carry the score");
assert(bp.autoReactPrompt(null, "boss fight").includes("React"), "null-score prompt must still contain React phrasing");

// Session cap blocks at max.
assert(bp.capAutos(0) === true, "fresh session must allow autos");
assert(bp.capAutos(9) === true, "9/10 must allow autos");
assert(bp.capAutos(10) === false, "10/10 must block autos");
assert(bp.capAutos(11) === false, "over max must block autos");

console.log("VERIFY_OK: buddy proactive (score jumps, cooldown, prompt, cap); static + executed pure tests pass.");
