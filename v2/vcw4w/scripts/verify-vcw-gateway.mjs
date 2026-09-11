import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

// Migration: rerunnable gateway tables + RLS + metering helpers. The other
// agent owns the migration filename, so scan the migrations dir for the file
// carrying the gateway tables instead of hardcoding a timestamp.
const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
let migration = "";
let migrationFile = "";
for (const f of migrationFiles) {
  const src = read(`../supabase/migrations/${f}`);
  if (src.includes("vcw_api_keys")) {
    migration = src;
    migrationFile = f;
    break;
  }
}
if (!migration) throw new Error("vcw gateway migration missing (no migration contains vcw_api_keys).");
for (const token of [
  "vcw_api_keys",
  "vcw_byok_providers",
  "vcw_usage",
  "vcw_dispatches",
  "meter_vcw_usage",
  "meter_vcw_usage_for",
  "my_vcw_usage",
  "if not exists",
  "enable row level security",
]) {
  if (!migration.includes(token)) throw new Error(`${migrationFile} missing ${token}.`);
}

// Hosted gateway lib: key tag + ops + markup quoting (15% hosted / 9% BYOK cut).
const gateway = read("../lib/vcw-gateway.ts");
for (const token of [
  "VCW_GATEWAY_KEY_TAG",
  "vcw_live_",
  "VCW_GATEWAY_OPS",
  "quoteVcwGateway",
  "hostedQuoteWithMarkup",
  "15",
  "9",
]) {
  if (!gateway.includes(token)) throw new Error(`vcw-gateway lib missing ${token}.`);
}

// BYOK lib: provider kinds + secret redaction + routing decision.
const byok = read("../lib/vcw-byok.ts");
for (const token of ["VCW_BYOK_KINDS", "redactSecrets", "decideRoute", "last4Of"]) {
  if (!byok.includes(token)) throw new Error(`vcw-byok lib missing ${token}.`);
}

// Gateway auth: caller resolution + write-scope gate + pepper fail-closed.
const auth = read("../lib/vcw-gateway-auth.ts");
for (const token of ["resolveVcwCaller", "vcwWriteScope", "botPepperConfigured"]) {
  if (!auth.includes(token)) throw new Error(`vcw-gateway-auth lib missing ${token}.`);
}
// Keygen must avoid modulo bias (rejection sampling like bot keys).
if (!read("../lib/vcw-gateway.ts").includes("modulo bias")) {
  throw new Error("vcw-gateway keygen must avoid modulo bias.");
}

// Gateway routes: keys/usage/dispatch/providers are authenticated +
// rate limited with dbFail; status is the public-status exception.
const authedRoutes = [
  "../app/api/vcw/gateway/keys/route.ts",
  "../app/api/vcw/gateway/keys/[id]/route.ts",
  "../app/api/vcw/gateway/usage/route.ts",
  "../app/api/vcw/gateway/dispatch/route.ts",
  "../app/api/vcw/gateway/providers/route.ts",
  "../app/api/vcw/gateway/providers/[id]/route.ts",
];
for (const file of authedRoutes) {
  const src = read(file);
  if (!src.includes("Authentication required")) throw new Error(`${file} must require auth.`);
  if (!src.includes("rateLimit")) throw new Error(`${file} must rate limit.`);
  if (!src.includes("dbFail")) throw new Error(`${file} must route DB errors through dbFail.`);
}
const status = read("../app/api/vcw/gateway/status/route.ts");
if (!status.includes("rateLimit")) {
  throw new Error("../app/api/vcw/gateway/status/route.ts must rate limit.");
}
if (!status.includes("dbFail")) {
  throw new Error("../app/api/vcw/gateway/status/route.ts must route DB errors through dbFail.");
}
if (!status.includes("Authentication required") && !status.toLowerCase().includes("public")) {
  throw new Error(
    "../app/api/vcw/gateway/status/route.ts must require auth or be the documented public-status exception.",
  );
}
// Status must not trust raw x-forwarded-for (spoofable); use clientIp().
if (status.includes('headers.get("x-forwarded-for")')) {
  throw new Error("../app/api/vcw/gateway/status/route.ts must use clientIp(), not raw x-forwarded-for.");
}
// Revocation must exist and take effect immediately (revoked flag checked per request).
const revoke = read("../app/api/vcw/gateway/keys/[id]/route.ts");
if (!revoke.includes("revoked: true") || !revoke.includes("sameOrigin")) {
  throw new Error("gateway keys/[id] must revoke owner-only with sameOrigin.");
}
if (!auth.includes("matched.revoked") && !auth.includes("matched || matched.revoked")) {
  throw new Error("vcw-gateway-auth must enforce revoked on every request.");
}
// BYOK refs must never accept secrets (last4 only).
const providers = read("../app/api/vcw/gateway/providers/route.ts");
for (const token of ["Never send API keys", "last4", "https:"]) {
  if (!providers.includes(token)) throw new Error(`gateway providers route missing ${token}.`);
}
// Spend view must not leak cross-user aggregates (security_invoker + revoke).
if (!migration.includes("security_invoker") || !migration.includes("v_vcw_spend")) {
  throw new Error(`${migrationFile} must lock v_vcw_spend with security_invoker.`);
}

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:vcw-gateway")) throw new Error("package.json must wire verify:vcw-gateway.");
if (!pkg.includes('"verify:vcw-gateway": "node scripts/verify-vcw-gateway.mjs"')) {
  throw new Error('package.json must add "verify:vcw-gateway": "node scripts/verify-vcw-gateway.mjs".');
}
if (!/"test": "[^"]*verify:vcw-gateway/.test(pkg)) {
  throw new Error("npm test must run verify:vcw-gateway.");
}
if (!/"test": "[^"]*verify:vcw-runs && npm run verify:vcw-gateway/.test(pkg)) {
  throw new Error("npm test must run verify:vcw-gateway right after verify:vcw-runs.");
}

console.log("VCW gateway integrity OK.");
