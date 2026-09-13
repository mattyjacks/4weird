import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let failures = 0;
function must(cond, msg) {
  if (!cond) {
    console.error(`FAIL verify-bouncer: ${msg}`);
    failures++;
  } else {
    console.log(`PASS verify-bouncer: ${msg}`);
  }
}
function note(msg) {
  console.log(`NOTE verify-bouncer: ${msg}`);
}
function read(rel) {
  const full = resolve(root, rel);
  must(existsSync(full), `file exists: ${rel}`);
  if (!existsSync(full)) return "";
  return readFileSync(full, "utf8");
}

// 1. Migration has new columns + audit table + RLS + index.
const MIG = "supabase/migrations/20261118000000_bouncer_email_verification.sql";
const mig = read(MIG);
if (mig) {
  for (const col of [
    "bouncer_status",
    "bouncer_score",
    "bouncer_reason",
    "bouncer_toxicity",
    "bouncer_checked_at",
    "bouncer_batch_id",
  ]) {
    must(mig.includes(col), `migration includes column ${col}`);
  }
  must(mig.includes("bouncer_batches"), "migration creates bouncer_batches audit table");
  must(mig.includes("batch_hash"), "bouncer_batches tracks batch_hash");
  must(mig.includes("total_checked"), "bouncer_batches tracks total_checked");
  must(
    mig.includes("total_deliverable") || mig.includes("total_clean"),
    "bouncer_batches tracks result counts",
  );
  must(/row level security/i.test(mig), "migration enables RLS");
  must(/create policy/i.test(mig), "migration creates select-own policy");
  must(
    mig.includes("idx_crm_contacts_bouncer_status"),
    "migration indexes crm_contacts (org_id, bouncer_status)",
  );
  must(
    mig.includes("unverified") &&
      mig.includes("deliverable") &&
      mig.includes("risky") &&
      mig.includes("undeliverable") &&
      mig.includes("unknown"),
    "bouncer_status covers unverified/deliverable/risky/undeliverable/unknown",
  );
  must(
    !/(alter|drop|create)\s+(table\s+)?(public\.)?coin_(ledger|lots|spends)/i.test(mig),
    "migration never touches coin tables",
  );
}

// 2. lib/bouncer.ts: absent-or-present fail-open (warn only, never fail).
const libHit = ["lib/bouncer.ts", "lib/usebouncer.ts", "lib/email-verify.ts"].find((p) =>
  existsSync(resolve(root, p)),
);
if (!libHit) {
  note("lib/bouncer.ts absent (sibling lane not landed yet) — fail-open, warn only.");
} else {
  note(`${libHit} present — fail-open check only (no hard assertions until sibling lands).`);
}

// 3. Routes exist when siblings land (warn, not fail).
const ROUTE_CANDIDATES = [
  "app/api/bouncer/verify/route.ts",
  "app/api/crm/contacts/verify-bouncer/route.ts",
  "app/api/crm/contacts/scrub-bouncer/route.ts",
  "components/crm/bouncer-status-badge.tsx",
];
const routeHits = ROUTE_CANDIDATES.filter((p) => existsSync(resolve(root, p)));
if (routeHits.length === 0) {
  note(`no bouncer routes yet (${ROUTE_CANDIDATES.join(", ")}) — warn only.`);
} else {
  note(`bouncer routes present: ${routeHits.join(", ")}.`);
}

// 4. .env.example documents BOUNCER_API_KEY (server-only).
const envExample = read(".env.example");
if (envExample) {
  must(envExample.includes("BOUNCER_API_KEY="), ".env.example documents BOUNCER_API_KEY=");
  must(envExample.includes("USEBOUNCER_API_KEY"), ".env.example notes USEBOUNCER_API_KEY alias");
  must(envExample.includes("x-api-key"), ".env.example documents x-api-key header");
  must(!/NEXT_PUBLIC_BOUNCER/i.test(envExample), ".env.example never uses NEXT_PUBLIC_BOUNCER");
}

// 5. No secrets in public/swarm (fail on real-looking assignments).
const swarmDir = resolve(root, "public/swarm");
const SECRET_RE =
  /(?<![A-Za-z0-9_-])(BOUNCER_API_KEY|USEBOUNCER_API_KEY)\s*=\s*(['"]?)([A-Za-z0-9_\-./+]{8,})\2/;
let swarmFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(md|json|jsonc|txt|js|mjs|ts|tsx)$/.test(entry)) swarmFiles.push(full);
  }
}
if (existsSync(swarmDir)) {
  walk(swarmDir);
  const hits = [];
  for (const full of swarmFiles) {
    const body = readFileSync(full, "utf8");
    const m = body.match(SECRET_RE);
    if (m) hits.push(`${full.replace(root + "/", "")}: ${m[1]}=<redacted>`);
  }
  must(hits.length === 0, `public/swarm carries no bouncer secrets${hits.length ? ` (${hits.join("; ")})` : ""}`);
  note(`scanned ${swarmFiles.length} public/swarm files for bouncer secrets.`);
} else {
  note("public/swarm absent — secrets scan skipped.");
}

if (failures > 0) {
  console.error(`\nverify-bouncer FAILED: ${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nverify-bouncer OK: migration + env + fail-open siblings + secrets scan.");
}
