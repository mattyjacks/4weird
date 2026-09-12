// Verifier: Buddy opt-in cross-session memory; static contract checks + REAL
// execution of lib/buddy-memory.ts (transpiled with the repo typescript into
// a temp dir via a paths-aware tsconfig, then asserted under node).
// Run: node scripts/verify-buddy-memory.mjs (no keys, no network).
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

// 1. Pure memory module: extractive rolling buffer, zero model calls.
const mem = has(
  "lib/buddy-memory.ts",
  "mergeBuddyMemory", "memoryPromptSection",
);
assert(!mem.includes("fetch(") && !mem.includes("OPENAI") && !mem.includes("openrouter"), "buddy-memory must never call AI (extractive only)");

// 2. Route: explicit opt-in, auth, no AI.
has(
  "app/api/buddy/memory/route.ts",
  "consent", "Memory needs explicit opt-in", "Authentication required",
  "buddy_get_memory", "buddy_save_memory",
);
assert(!read("app/api/buddy/memory/route.ts").includes("api.openai.com"), "memory route must never call AI");

// 3. Migration: per-user table + SECURITY DEFINER RPCs, rerunnable.
has(
  "supabase/migrations/20261101000000_buddy_memory.sql",
  "buddy_memory", "buddy_get_memory", "buddy_save_memory",
  "row level security",
);

// 4. Chat route honors memory:true without breaking the default (off).
const chat = has("app/api/buddy/chat/route.ts", "memoryPromptSection", "mergeBuddyMemory", "buddy_get_memory", "buddy_save_memory");
assert(chat.includes("input.memory === true"), "memory must stay opt-in (default off)");

// 5. Widget exposes the Remember-me toggle and sends the flag.
const widget = has("components/buddy/gaming-buddy.tsx", "rememberMe", "Remember me across sessions", "memory: true");
assert(widget.includes("Memory on"), "widget must surface memory state");

// 6. REAL execution: transpile memory + its import chain -> temp -> assert.
const tmp = mkdtempSync(join(tmpdir(), "buddy-memory-"));
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
assert(existsSync(tscBin), "repo typescript is required to execute pure-module tests");
const tsconfigPath = join(tmp, "tsconfig.verify.json");
writeFileSync(tsconfigPath, JSON.stringify({
  compilerOptions: {
    module: "commonjs",
    target: "es2020",
    skipLibCheck: true,
    // game-ai.ts reads process.env: pull @types/node from the repo even
    // though this tsconfig lives in the temp dir.
    types: ["node"],
    typeRoots: [join(root, "node_modules", "@types").replace(/\\/g, "/")],
    baseUrl: root,
    paths: { "@/*": ["./*"] },
    outDir: join(tmp, "out"),
  },
  files: [
    join(root, "lib", "economy.ts"),
    join(root, "lib", "game-ai.ts"),
    join(root, "lib", "buddy-engine.ts"),
    join(root, "lib", "buddy-memory.ts"),
  ],
}));
const { execFileSync } = await import("node:child_process");
execFileSync(process.execPath, [tscBin, "-p", tsconfigPath], { cwd: root, stdio: "pipe" });
const outDir = join(tmp, "out");
const need = createRequire(join(root, "scripts", "x.mjs"));
const { Module } = await import("node:module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = join(outDir, request.slice(2));
  }
  return origResolve.call(this, request, ...rest);
};
// lib-only inputs emit flat into outDir (no lib/ prefix).
const bm = need(join(outDir, "buddy-memory.js"));

// Merge: appends labelled lines, trims oldest first, honors the cap.
const merged = bm.mergeBuddyMemory("", [{ role: "user", text: "hello" }, { role: "buddy", text: "hi there" }]);
assert(merged.includes("Player: hello") && merged.includes("Buddy: hi there"), "merge must append labelled lines");
const capped = bm.mergeBuddyMemory("old line that should fall away", [{ role: "user", text: "new" }], 20);
assert(capped.length <= 20, "merge must honor maxChars");
assert(bm.mergeBuddyMemory("keep", "not-an-array") === "keep", "bad turns must not clobber memory");
assert(bm.mergeBuddyMemory("", []) === "", "empty merge must stay empty");

// Prompt section: empty in, empty out; bounded block otherwise.
assert(bm.memoryPromptSection("") === "", "empty memory must yield no prompt section");
assert(bm.memoryPromptSection("   ") === "", "blank memory must yield no prompt section");
const section = bm.memoryPromptSection("Player: likes zombies");
assert(section.includes("likes zombies") && section.length <= 600, "prompt section must carry memory within 600 chars");

console.log("VERIFY_OK: buddy opt-in memory (extractive buffer, route, migration, widget toggle); static + executed pure tests pass.");
