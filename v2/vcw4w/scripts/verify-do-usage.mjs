import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => { throw new Error(msg); };

// 1. Migration: rerunnable DigitalOcean spend mirror, service_role-only RLS,
// inserts/selects only, coin tables untouched.
const mig = read("../supabase/migrations/20261022000200_do_usage_mirror.sql");
const migCode = mig
  .split("\n")
  .map((line) => {
    const cut = line.indexOf("--");
    return cut === -1 ? line : line.slice(0, cut);
  })
  .join("\n");
for (const token of [
  "do_usage",
  "IF NOT EXISTS",
  "user_id",
  "remote_id",
  "kind",
  "amount_usd",
  "time_bucket",
  "enable row level security",
  "revoke all",
  "service_role",
]) {
  if (!mig.toLowerCase().includes(token.toLowerCase())) fail(`do_usage migration missing ${token}.`);
}
for (const banned of ["coin_ledger", "coin_lots", "coin_spends", "coin_spend_lock"]) {
  if (migCode.includes(banned)) fail(`do_usage migration must not touch coin tables (found ${banned}).`);
}
if (/create\s+table\s+(?!if\s+not\s+exists)/i.test(migCode)) fail("do_usage migration CREATE TABLE without IF NOT EXISTS.");
if (/create\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists)/i.test(migCode)) fail("do_usage migration CREATE INDEX without IF NOT EXISTS.");
if (/insert\s+into\s+public\.do_usage/i.test(migCode)) fail("do_usage migration must not seed rows (inserts belong to the service writer).");
if (/update\s+public\.do_usage|delete\s+from\s+public\.do_usage/i.test(migCode)) {
  fail("do_usage migration must not UPDATE/DELETE (inserts/selects only).");
}

// 2. Route: SELECT-only doUsage summary, graceful when the table is missing
// or RLS denies the caller; coin tables unaltered by this change.
const route = read("../app/api/my/usage/route.ts");
for (const token of ['from("do_usage")', "doUsage", "totalUsd", "byKind", "lastSync"]) {
  if (!route.includes(token)) fail(`usage route missing ${token} (doUsage summary).`);
}
if (!route.includes("try") || !route.includes("catch")) fail("usage route must wrap do_usage in try/catch.");
if (!route.includes("Pre-migration") && !route.includes("pre-migration")) {
  fail("usage route must degrade gracefully pre-migration.");
}
for (const banned of ["insert", "update", "delete"]) {
  const re = new RegExp(`${banned}\\s+(into|public\\.do_usage|from\\s+public\\.do_usage)`, "i");
  if (re.test(route)) fail(`usage route must stay SELECT-only for do_usage (found ${banned}).`);
}

// 3. Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:do-usage")) fail("package.json must wire verify:do-usage.");

console.log("DigitalOcean usage mirror integrity OK.");
