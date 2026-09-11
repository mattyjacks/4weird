import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-abuse-limits: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Migration: shared buckets, advisory-locked RPC, service_role only.
const mig = read("supabase/migrations/20261017000000_abuse_limits.sql");
for (const token of [
  "abuse_buckets",
  "check_abuse_bucket",
  "pg_advisory_xact_lock",
  "enable row level security",
  "jsonb_build_object",
  "'allowed'",
  "'retry_after'",
  "'hits'",
]) {
  must(mig.includes(token), `abuse migration must include ${token}`);
}
// No client access: revoked, never granted, no policies.
must(/revoke all on function public\.check_abuse_bucket.*from public, anon, authenticated/.test(mig), "RPC must revoke public/anon/authenticated");
must(/revoke all on table public\.abuse_buckets from public, anon, authenticated/.test(mig), "table must revoke public/anon/authenticated");
must(!/create policy/i.test(mig), "abuse migration must create no client policies (service_role only)");
must(!/grant execute on function public\.check_abuse_bucket/i.test(mig), "RPC must grant nobody (service_role calls need no grant)");
// Bounded windows + bounded prune (no bloat, no billion-second windows).
must(/least\(coalesce\(p_window_seconds, 60\), 86400\)/.test(mig), "window must be clamped to <= 86400s");
must(/limit 25/.test(mig), "prune must be bounded");

// 2. Helper: two-layer (memory + shared), salted IP keys, degraded fallback.
const helper = read("lib/abuse-limit.ts");
for (const token of [
  "globalBucket",
  "ipBucketKey",
  "acctBucketKey",
  "throttleHeaders",
  "serviceClient",
  "check_abuse_bucket",
  "SIGNUP_IP_HASH_SALT",
  "Retry-After",
]) {
  must(helper.includes(token), `lib/abuse-limit.ts must include ${token}`);
}
must(/return null/.test(helper), "helper must degrade to memory-only when the shared store is unreachable");

// 3. Anonymous surfaces enforce shared buckets (instance-spray proof).
const signup = read("app/api/auth/signup/route.ts");
must(signup.includes("globalBucket") && signup.includes("signup-hour") && signup.includes("signup-day"), "signup must enforce shared hour+day IP buckets");
const login = read("app/api/auth/login/route.ts");
must(login.includes("globalBucket") && login.includes("login-hour"), "login must enforce shared IP + per-account buckets");
const kidLogin = read("app/api/family/kid-login/route.ts");
must(kidLogin.includes("globalBucket") && kidLogin.includes("kid-login-hour"), "kid-login must enforce shared IP + per-handle buckets");
// Guest quota: shared count is authoritative (N instances must not mean N x free loads).
const guest = read("app/api/games/guest-pass/route.ts");
must(guest.includes("globalBucket") && guest.includes("guest-day"), "guest-pass must enforce a shared daily bucket");
must(/sharedDay \? sharedDay\.hits/.test(guest), "guest-pass loads_used must come from the shared count when available");

// 4. High-value authed endpoints enforce shared per-account buckets.
for (const [path, scope] of [
  ["app/api/coins/daily/route.ts", "daily-hour"],
  ["app/api/coins/claim/route.ts", "claim-hour"],
  ["app/api/referrals/route.ts", "referral-hour"],
  ["app/api/code/zip/route.ts", "zip-hour"],
  ["app/api/vault/blobs/route.ts", "vault-write-hour"],
  ["app/api/clans/upload/route.ts", "clan-upload-hour"],
]) {
  const src = read(path);
  must(src.includes("globalBucket") && src.includes(scope), `${path} must enforce shared bucket ${scope}`);
}

// 5. Layer-1 docs point at layer 2 (no stale Redis-only note).
const rl = read("lib/rate-limit.ts");
must(rl.includes("abuse-limit"), "rate-limit.ts must document the shared backstop");

// 6. Package wiring.
const pkg = read("package.json");
must(pkg.includes("verify:abuse-limits"), "package.json must wire verify:abuse-limits.");
must(/"test": "[^"]*verify:abuse-limits/.test(pkg), "npm test must run verify:abuse-limits.");

console.log("abuse-limit integrity OK - shared Postgres buckets back every anonymous + money-adjacent throttle.");
