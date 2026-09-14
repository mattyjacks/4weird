/**
 * DS-DTOP-09: Desktop-opencode integrity gate (READ-ONLY, never throws).
 *
 * Green only when every desktop-opencode sibling has landed:
 *   - CLI bridge  (v2/desktop/code/src/modules/opencode-cli-bridge.js)
 *   - terminal panel (v2/desktop/code/src/components/terminal-opencode.js)
 *   - MCP coins tool (v2/desktop/code/server/vcw_mcp_coins.js)
 *   all exist and are node --check clean;
 *   - /terminal route (v2/vcw4w/app/terminal/page.tsx),
 *   - heal-quote route (v2/vcw4w/app/api/budgets/heal-quote/route.ts),
 *   - heal-loop lib (v2/vcw4w/lib/vcw-heal-loop.ts)
 *   all exist, with the heal loop carrying budget-cap tokens;
 *   - no secrets (bot4weird_ / sk- live keys / private keys) in any of them.
 *
 * Order-independent and MISSING-tolerant: a sibling that has not landed yet
 * is reported as `MISSING: <path> not landed yet` and fails the run with
 * exit 1 (blocked, not broken). Every check runs; nothing throws — an
 * unexpected internal error is reported as INTERNAL and exits 1.
 *
 * Usage:
 *   node scripts/verify-desktop-opencode.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const VCW_DIR = path.resolve(SCRIPTS_DIR, ".."); // v2/vcw4w
const DESKTOP_CODE_DIR = path.resolve(VCW_DIR, "..", "desktop", "code"); // v2/desktop/code

const failures = [];
const passes = [];

function ok(msg) {
  passes.push(`PASS: ${msg}`);
}

function missing(rel) {
  failures.push(`MISSING: ${rel} not landed yet`);
}

function bad(kind, msg) {
  failures.push(`${kind}: ${msg}`);
}

// JS files that must exist AND be node --check clean, with content tokens.
const JS_FILES = [
  {
    rel: "v2/desktop/code/src/modules/opencode-cli-bridge.js",
    abs: path.join(DESKTOP_CODE_DIR, "src", "modules", "opencode-cli-bridge.js"),
    tokens: ["detectOpencode", "runSession", "cancel", "opencode run"],
  },
  {
    rel: "v2/desktop/code/src/components/terminal-opencode.js",
    abs: path.join(DESKTOP_CODE_DIR, "src", "components", "terminal-opencode.js"),
    tokens: ["opencode"],
  },
  {
    rel: "v2/desktop/code/server/vcw_mcp_coins.js",
    abs: path.join(DESKTOP_CODE_DIR, "server", "vcw_mcp_coins.js"),
    tokens: ["heal_quote"],
  },
];

// Route/lib files that must exist with content tokens (no node --check:
// TS/TSX gates belong to their owning lanes' tsc+eslint).
const TEXT_FILES = [
  {
    rel: "v2/vcw4w/app/terminal/page.tsx",
    abs: path.join(VCW_DIR, "app", "terminal", "page.tsx"),
    tokens: ["terminal"],
  },
  {
    rel: "v2/vcw4w/app/api/budgets/heal-quote/route.ts",
    abs: path.join(VCW_DIR, "app", "api", "budgets", "heal-quote", "route.ts"),
    tokens: ["quote", "tokens"],
  },
  {
    rel: "v2/vcw4w/lib/vcw-heal-loop.ts",
    abs: path.join(VCW_DIR, "lib", "vcw-heal-loop.ts"),
    tokens: ["maxRounds", "budget"],
  },
];

// Secret classes that must appear in NONE of the checked files.
const SECRET_PATTERNS = [
  { name: "bot4weird_ key", re: /bot4weird_[A-Za-z0-9_-]{8,}/ },
  { name: "sk- live key", re: /sk-[A-Za-z0-9_-]{16,}/ },
  { name: "private key block", re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
];

function checkNodeSyntax(abs, rel) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    ok(`${rel} node --check clean`);
    return true;
  } catch (err) {
    const detail = err && err.stderr ? String(err.stderr).split("\n").slice(0, 3).join(" | ") : String((err && err.message) || err);
    bad("SYNTAX", `${rel} node --check failed: ${detail}`);
    return false;
  }
}

function checkTokens(content, abs, rel, tokens) {
  const lowered = content.toLowerCase();
  let allFound = true;
  for (const token of tokens) {
    if (!lowered.includes(String(token).toLowerCase())) {
      bad("CONTENT", `${rel} missing token ${JSON.stringify(token)}`);
      allFound = false;
    }
  }
  if (allFound) ok(`${rel} carries tokens [${tokens.join(", ")}]`);
}

function checkSecrets(content, rel) {
  let clean = true;
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(content)) {
      bad("SECRET", `${rel} contains a ${name} pattern`);
      clean = false;
    }
  }
  if (clean) ok(`${rel} secret scan clean`);
}

function checkFile(entry, syntaxCheck) {
  let content;
  try {
    content = fs.readFileSync(entry.abs, "utf8");
  } catch {
    missing(entry.rel);
    return;
  }
  ok(`${entry.rel} exists`);
  if (syntaxCheck) checkNodeSyntax(entry.abs, entry.rel);
  checkTokens(content, entry.abs, entry.rel, entry.tokens);
  checkSecrets(content, entry.rel);
}

function main() {
  for (const entry of JS_FILES) checkFile(entry, true);
  for (const entry of TEXT_FILES) checkFile(entry, false);

  for (const line of passes) console.log(line);
  for (const line of failures) console.log(line);

  if (failures.length > 0) {
    const missingCount = failures.filter((f) => f.startsWith("MISSING")).length;
    console.log(
      `Desktop-opencode verifier RED: ${failures.length} failure(s) (${missingCount} MISSING-class, siblings not landed yet).`
    );
    process.exitCode = 1;
    return;
  }
  console.log("Desktop-opencode integrity OK.");
}

try {
  main();
} catch (err) {
  console.log(`INTERNAL: verifier crashed (never-throw guard): ${String((err && err.message) || err)}`);
  process.exitCode = 1;
}
