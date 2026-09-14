/**
 * verify-vocrehab-api-contract.mjs — VocRehab Appendix-C API contract verifier.
 *
 * Enforces the plan Appendix C table (plan lines ~2007-2023) against
 * v2/vcw4w/app/api/vocrehab/** route files:
 *  1. each contracted route.ts exists (missing file = FAIL, named);
 *  2. per present file: contracted methods exported (`export async function
 *     GET/POST`), ok()/fail() `{success}` envelope via @/lib/api-respond,
 *     zero coin_ledger|coin_lots mentions, @/ imports within the allowlist,
 *     and a 401/Authentication-required branch on every non-guest route
 *     (guest-ok: ssi, disclosure, roleplay/feedback only).
 *
 * Exit 0 + OK line only when every present file passes; otherwise exit 1
 * naming each failure. Missing C5-owned files (roleplay/documents/feedback)
 * are reported, never created.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, ".."); // v2/vcw4w

const failures = [];
function fail(msg) {
  failures.push(msg);
  console.log(`[vocrehab-api-contract] FAIL: ${msg}`);
}
function must(cond, msg) {
  if (!cond) fail(msg);
  return Boolean(cond);
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// Appendix C contract table (plan lines 2011-2023): route dir -> methods.
const CONTRACT = [
  ["games", ["POST"]],
  ["assessments", ["GET", "POST"]],
  ["documents", ["GET", "POST"]],
  ["roleplay", ["POST"]],
  ["roleplay/feedback", ["POST"]],
  ["ssi", ["POST"]],
  ["disclosure", ["POST"]],
  ["pro/sessions", ["POST"]],
  ["pro/approve", ["POST"]],
  ["pro/outreach", ["POST"]],
  ["export", ["GET"]],
];

// Anonymous access lives ONLY here; every other route must 401 anonymous.
// (Roleplay's ephemeral guest mode still needs its save-path 401 branch, so
// it stays in the must-401 set; its current absence is owning-crew drift.)
const GUEST_OK = new Set(["ssi", "disclosure", "roleplay/feedback"]);

function atImports(src) {
  const out = [];
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) out.push(m[1]);
  return out;
}
function atImportAllowed(spec) {
  if (!spec.startsWith("@/")) return true; // next/server, node:, relative: out of scope
  if (spec.startsWith("@/lib/vocrehab-")) return true;
  if (spec.startsWith("@/lib/supabase/")) return true;
  if (spec === "@/lib/api-respond") return true;
  if (spec === "@/lib/rate-limit") return true; // rate-limit helper
  if (spec === "@/lib/validate") return true; // clientIp for rate-limit keys
  if (/same-?origin|valleynet/i.test(spec)) return true; // sameOrigin/valleynet helpers
  return false;
}

for (const [dir, methods] of CONTRACT) {
  const rel = `app/api/vocrehab/${dir}/route.ts`;
  if (!must(exists(rel), `${rel} MISSING (likely C5-owned, still being built — report only)`)) continue;
  const src = read(rel);
  for (const m of methods) {
    must(
      new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(src),
      `${rel} missing contracted export async function ${m}`,
    );
  }
  must(
    src.includes("@/lib/api-respond") && /\b(ok|fail|dbFail)\s*\(/.test(src),
    `${rel} must use the ok()/fail() {success} envelope via @/lib/api-respond`,
  );
  must(!/coin_ledger|coin_lots/.test(src), `${rel} mentions coin_ledger/coin_lots (forbidden)`);
  const bad = atImports(src).filter((s) => !atImportAllowed(s));
  must(bad.length === 0, `${rel} non-allowlisted @/ import(s): ${bad.join(", ")}`);
  if (!GUEST_OK.has(dir)) {
    must(/401|Authentication-required/.test(src), `${rel} must 401 anonymous (no 401/Authentication-required branch)`);
  }
}

if (failures.length) {
  console.error(`[vocrehab-api-contract] FAILING CHECKS (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`[vocrehab-api-contract] OK: all ${CONTRACT.length} contracted routes present and contract-clean.`);
