import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-security-sweep: ${msg}`);
}

function read(p) {
  must(existsSync(p), `missing file ${p}`);
  return readFileSync(p, "utf8");
}

// 1. Sweep migration: exists, policies Wave-2/3 tables only, rerunnable guards,
//    no economy-owned columns, no ghost squad refs, no table creation.
const sweep = read("supabase/migrations/20261116000003_security_sweep.sql");
for (const table of ["dps_nodes", "dps_tasks", "community_mods", "community_themes"]) {
  must(sweep.includes(`on public.${table}`), `sweep migration must police public.${table}`);
}
// Strip -- comments so prose ("every CREATE POLICY is preceded by…") never
// matches the guard rules below (same convention as verify-migration-versions).
const code = sweep
  .split("\n")
  .map((line) => {
    const cut = line.indexOf("--");
    return cut === -1 ? line : line.slice(0, cut);
  })
  .join("\n");
for (const m of code.matchAll(/create\s+policy\s+(\S+)/gi)) {
  const name = m[1].replace(/[";]$/, "");
  must(
    new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${name}`, "i").test(code),
    `policy ${name} without a preceding DROP POLICY IF EXISTS`,
  );
}
must(!/create\s+table/i.test(code), "sweep migration must create no tables (policies only)");
must(!/vibe_coins_earned/i.test(code), "sweep migration must not carry economy-owned vibe_coins_earned");
must(!/coin_ledger|coin_lots/i.test(code), "sweep migration must not touch coin ledger tables");
must(!/squads?/i.test(code), "sweep migration must not reference ghost squads tables");
must(!/squad_members/i.test(code), "sweep migration must not reference ghost squad_members");

// 2. proxy.ts: central CSRF gate with shaped-secret exemption + logout carve-out.
const proxy = read("proxy.ts");
for (const token of ["sameOrigin", "bot4weird_", "vcw_live_", "/api/auth/logout", "Cache-Control"]) {
  must(proxy.includes(token), `proxy.ts must include ${token}`);
}
must(/POST.*PUT.*PATCH.*DELETE/s.test(proxy), "proxy.ts must gate all mutating methods");

// 3. SSRF guards (read-only audit targets): canonical DNS+rebinding checker exists,
//    companion exposes the shape check + canonical-delegation hook.
const canonical = read("lib/ssrf-guard.ts");
for (const token of ["checkEgressUrl", "fetchEgressUrl", "isBlockedIp", "unstable"]) {
  must(canonical.includes(token), `lib/ssrf-guard.ts must include ${token}`);
}
const companion = read("lib/interop-ssrf-guard.ts");
for (const token of ["assertSafeEgressUrlShape", "delegateToCanonicalEgressCheck", "setCanonicalEgressCheck"]) {
  must(companion.includes(token), `lib/interop-ssrf-guard.ts must include ${token}`);
}

// 4. .env.example: secret-freedom — key/secret/pepper/token slots must be empty
//    or obvious placeholders, never assigned values.
const env = read(".env.example");
for (const line of env.split("\n")) {
  const m = /^\s*([A-Za-z0-9_]*?(?:KEY|SECRET|PEPPER|TOKEN))\s*=\s*(.*?)\s*$/.exec(line);
  if (!m) continue;
  const [, name, value] = m;
  must(
    value === "" || /replace-with|your-|placeholder|example|X{4,}/i.test(value),
    `.env.example assigns a real-looking value to ${name}`,
  );
}

// 5. Secret scan over public/swarm/** (same patterns as verify-devswarm).
const SWARM = "public/swarm";
const patterns = [
  /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/,
  /bot4weird_[A-Za-z0-9]{16,}/,
  // PEM-anchored: real key blocks always carry the dash-delimited header
  // (-----BEGIN [RSA ]PRIVATE KEY-----). Bare "BEGIN PRIVATE KEY" prose
  // (e.g. QUEUE.md describing a BEGIN PRIVATE KEY -> BEGIN-PRIVATE-KEY
  // reword) must not trip the scanner. Never weaken to bare words.
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
  /client_secret\s*[:=]\s*['"][^'"]{4,}/i,
];
const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
};
for (const full of walk(SWARM)) {
  let text;
  try {
    text = readFileSync(full, "utf8");
  } catch {
    continue;
  }
  for (const re of patterns) {
    must(!re.test(text), `secret scan hit ${re} in ${full}`);
  }
}

console.log("verify-security-sweep: ok (sweep RLS policies + proxy gate + SSRF guards + env freedom + swarm secrets).");
