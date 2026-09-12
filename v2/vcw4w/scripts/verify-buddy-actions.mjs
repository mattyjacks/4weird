// Verifier: Buddy one-click delegation catalog (+ Super-pack orchestrator
// surface); static contract checks + REAL execution of lib/buddy-actions.ts
// (transpiled with the repo typescript into a temp dir via a paths-aware
// tsconfig, then asserted under node).
// Run: node scripts/verify-buddy-actions.mjs (no keys, no network).
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

// 1. Pure action catalog over real specialists (never invented op keys).
has(
  "lib/buddy-actions.ts",
  "catalogForBuddy", "falPayloadFor", "isFalOp",
);

// 2. Orchestrator: deterministic planner + bounded fan-out over real plays.
const orch = has(
  "lib/buddy-orchestrator.ts",
  "planSpecialists", "runOrchestrator", "SPECIALIST_PLAYS",
);
assert(!orch.includes("api.openai.com"), "orchestrator must stay transport-agnostic (runner injected)");

// 3. Widget renders delegations + the Super-pack panel.
has(
  "components/buddy/gaming-buddy.tsx",
  "catalogForBuddy", "falPayloadFor", "fireBuddyAction",
  "runOrchestrator", "fireSuperPack", "Assemble pack",
);

// 4. REAL execution: transpile actions + fal chain -> temp -> assert.
const tmp = mkdtempSync(join(tmpdir(), "buddy-actions-"));
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
assert(existsSync(tscBin), "repo typescript is required to execute pure-module tests");
const tsconfigPath = join(tmp, "tsconfig.verify.json");
writeFileSync(tsconfigPath, JSON.stringify({
  compilerOptions: {
    module: "commonjs",
    target: "es2020",
    skipLibCheck: true,
    // fal.ts reads server env: pull @types/node from the repo even though
    // this tsconfig lives in the temp dir.
    types: ["node"],
    typeRoots: [join(root, "node_modules", "@types").replace(/\\/g, "/")],
    baseUrl: root,
    paths: { "@/*": ["./*"] },
    outDir: join(tmp, "out"),
  },
  files: [
    join(root, "lib", "economy.ts"),
    join(root, "lib", "fal.ts"),
    join(root, "lib", "buddy-actions.ts"),
  ],
}));
const { execFileSync } = await import("node:child_process");
execFileSync(process.execPath, [tscBin, "-p", tsconfigPath], { cwd: root, stdio: "pipe" });
const outDir = join(tmp, "out");
const need = createRequire(join(root, "scripts", "x.mjs"));
const { Module } = await import("node:module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  // lib-only inputs emit flat (no lib/ prefix), so strip it for value imports.
  if (typeof request === "string" && request.startsWith("@/lib/")) {
    request = join(outDir, request.slice("@/lib/".length));
  } else if (typeof request === "string" && request.startsWith("@/")) {
    request = join(outDir, request.slice(2));
  }
  return origResolve.call(this, request, ...rest);
};
// lib-only inputs emit flat into outDir (no lib/ prefix).
const ba = need(join(outDir, "buddy-actions.js"));
const fal = need(join(outDir, "fal.js"));

// Catalog: bounded, unique ids, every fal op key real, lobby fallback safe.
const catalog = ba.catalogForBuddy("gravegain2d", "GraveGain");
assert(Array.isArray(catalog) && catalog.length >= 1 && catalog.length <= 6, "catalog must hold 1-6 actions");
assert(new Set(catalog.map((a) => a.id)).size === catalog.length, "action ids must be unique");
for (const a of catalog) {
  if (a.kind === "fal") assert(fal.isFalOp(a.falOp), `fal action ${a.id} must name a real op`);
}
const lobbyCatalog = ba.catalogForBuddy("no-such-game!!", "");
assert(Array.isArray(lobbyCatalog) && lobbyCatalog.length >= 1, "unknown slugs must fall back, never throw");
assert(ba.catalogForBuddy("x", "y").every((a) => typeof a.label === "string" && a.label), "every action needs a label");

// Payloads: fal builds a generate-ready payload; anything else is null.
const falAction = catalog.find((a) => a.kind === "fal");
if (falAction) {
  const payload = ba.falPayloadFor(falAction, "gravegain2d", "epic theme");
  assert(payload && payload.op === falAction.falOp && payload.game_slug === "gravegain2d", "fal payload must carry op + game");
}
assert(ba.falPayloadFor({ kind: "chat", chatText: "/tactics" }, "x", "y") === null, "chat actions must not build fal payloads");
assert(ba.falPayloadFor({ kind: "fal", falOp: "no-such-op" }, "x", "y") === null, "bogus ops must yield null, never a queue");

console.log("VERIFY_OK: buddy delegations (catalog, payloads, super-pack surface); static + executed pure tests pass.");
