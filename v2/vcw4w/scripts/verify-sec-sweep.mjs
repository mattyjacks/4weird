import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// verify-sec-sweep: deny-by-default lock-in (DS-SEC-INFRA-01, sec-infra).
// Asserts the infra sec-sweep locks stay pinned without editing any shipped
// migration, manifest, or STATUS.json:
//   1. coin_lots (+ coin_lot_spends / org_scale_settings / clan_scale_settings)
//      are RLS-enabled with NO policies and explicitly revoked from
//      anon/authenticated in 20261112000000_security_lockdown.sql; direct mint
//      paths (mint_crown / support_credit) are service_role-only.
//   2. every Vercel cron route (vercel.json `crons`) is Bearer CRON_SECRET
//      gated, fail-closed without a configured secret, constant-time
//      compared, with no ?secret= query usage.
//   3. no sk-/service-role secrets in client code (app/** outside app/api/**,
//      components/**); server-only keys stay server-only per .env.example.
//   4. remastery Wave-2+3 tables (dps_nodes / dps_tasks / community_mods /
//      community_themes) are RLS-enabled with ZERO policies — documented
//      access-locked until a NEW migration lands policies.
// Read-only: never writes, never pushes, never edits a shipped file.

const fail = (msg) => {
  throw new Error(`verify-sec-sweep: ${msg}`);
};
const must = (cond, msg) => {
  if (!cond) fail(msg);
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const migDir = path.join(root, "supabase", "migrations");
const read = (p) => fs.readFileSync(p, "utf8");
const stripLineComments = (src) =>
  src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("//");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");

// 1. coin_lots revoked + mint paths service_role-only -------------------------
const LOCKDOWN = "20261112000000_security_lockdown.sql";
const lockdownPath = path.join(migDir, LOCKDOWN);
must(fs.existsSync(lockdownPath), `${LOCKDOWN} missing under supabase/migrations.`);
const lockdown = read(lockdownPath);
const DENY_TABLES = ["coin_lots", "coin_lot_spends", "org_scale_settings", "clan_scale_settings"];
for (const t of DENY_TABLES) {
  must(
    new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, "i").test(lockdown),
    `ROW LEVEL SECURITY not enabled on public.${t} in ${LOCKDOWN}.`,
  );
  must(
    new RegExp(`revoke\\s+all\\s+on\\s+public\\.${t}\\s+from\\s+anon,\\s*authenticated`, "i").test(lockdown),
    `public.${t} not revoked from anon/authenticated in ${LOCKDOWN}.`,
  );
  must(
    !new RegExp(`create\\s+policy\\s+\\S+\\s+on\\s+public\\.${t}\\b`, "i").test(lockdown),
    `public.${t} must carry NO policies in ${LOCKDOWN} (deny by default).`,
  );
}
for (const fn of ["mint_crown", "support_credit"]) {
  must(
    new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${fn}\\b[\\s\\S]*?from\\s+authenticated`, "i").test(lockdown),
    `direct mint path public.${fn} not revoked from authenticated in ${LOCKDOWN}.`,
  );
  must(
    new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\b[\\s\\S]*?to\\s+service_role`, "i").test(lockdown),
    `direct mint path public.${fn} not granted to service_role in ${LOCKDOWN}.`,
  );
}

// 2. cron Bearer gates ---------------------------------------------------------
const vercel = JSON.parse(read(path.join(root, "vercel.json")));
const crons = vercel.crons ?? [];
must(crons.length >= 1, "vercel.json carries no crons to gate.");
for (const cron of crons) {
  must(typeof cron.path === "string" && cron.path.startsWith("/api/cron/"), `cron entry missing /api/cron/ path: ${JSON.stringify(cron)}.`);
  const routeFile = path.join(root, "app", ...cron.path.replace(/^\//, "").split("/"), "route.ts");
  must(fs.existsSync(routeFile), `cron route file missing: app${cron.path}/route.ts.`);
  const src = read(routeFile);
  const code = stripLineComments(src);
  must(src.includes("CRON_SECRET"), `${cron.path} does not reference CRON_SECRET.`);
  must(/authorization/i.test(src), `${cron.path} does not read the Authorization header.`);
  must(/Bearer/i.test(src), `${cron.path} is not Bearer-gated.`);
  must(/if\s*\(\s*!secret\s*\)\s*return\s+false/.test(code), `${cron.path} is not fail-closed without a configured secret.`);
  must(/timingSafeEqual/.test(code), `${cron.path} does not constant-time compare the bearer.`);
  must(
    !/searchParams[^;]*secret/i.test(code) && !/get\(\s*["']secret["']\s*\)/i.test(code),
    `${cron.path} reads a ?secret= query param (must be Authorization: Bearer only).`,
  );
}

// 3. no sk-/service-role in client code ----------------------------------------
const SK_RE = /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/;
const CLIENT_SECRET_RES = [/SUPABASE_SERVICE_ROLE_KEY/, /service_role/, /CRON_SECRET/, /BOT_KEY_PEPPER/];
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?|css|json)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
};
const clientRoots = [path.join(root, "app"), path.join(root, "components")];
const clientFiles = clientRoots
  .filter((d) => fs.existsSync(d))
  .flatMap((d) => walk(d))
  .filter((p) => !p.includes(`${path.sep}api${path.sep}`));
must(clientFiles.length >= 1, "no client files found under app/ + components/.");
for (const f of clientFiles) {
  const src = read(f);
  for (const re of CLIENT_SECRET_RES) {
    must(!re.test(src), `server-only secret ${re} leaked into client file ${path.relative(root, f)}.`);
  }
  must(!SK_RE.test(src), `sk- secret pattern in client file ${path.relative(root, f)}.`);
}
// .env.example keeps server-only keys off the NEXT_PUBLIC_ prefix.
const envExample = read(path.join(root, ".env.example"));
for (const key of ["CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "BOT_KEY_PEPPER", "OPENAI_API_KEY"]) {
  must(new RegExp(`^${key}=`, "m").test(envExample), `.env.example missing server-only ${key}= (documents the server-only contract).`);
  must(!new RegExp(`^NEXT_PUBLIC_.*${key}=`, "m").test(envExample), `${key} shipped under a NEXT_PUBLIC_ prefix in .env.example.`);
}

// 4. remastery Wave-2+3 RLS + the 0003 policy set ------------------------------
// 20261116000002 ships the four tables RLS-enabled with zero policies; the
// sibling-scope 20261116000003_security_sweep.sql (DS-SEC-INFRA, untracked
// until pushed) then lands 12 least-privilege policies. Locked now means:
// RLS on, no GRANTs to anon/authenticated anywhere, and the 0003 set keeps
// its invariants (no self-verify, auth-gated discovery, no ledger hooks, no
// ghost squads). chat_participants (Wave-1 comms) carries self-membership
// policies since 20261219000011 (§5 below).
const allMigFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const allMig = allMigFiles.map((f) => read(path.join(migDir, f))).join("\n");
const stripSqlComments = (src) =>
  src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("--");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");
const wave23Files = fs.readdirSync(migDir).filter((f) => f.endsWith("_remastery_wave23.sql")).sort();
must(wave23Files.length >= 1, "no *_remastery_wave23.sql migration found under supabase/migrations.");
const wave23 = wave23Files.map((f) => read(path.join(migDir, f))).join("\n");
const SWEEP_TABLES = ["dps_nodes", "dps_tasks", "community_mods", "community_themes"];
for (const t of SWEEP_TABLES) {
  must(
    new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, "i").test(wave23),
    `ROW LEVEL SECURITY not enabled on public.${t} in ${wave23Files.join(", ")}.`,
  );
  must(
    !new RegExp(`grant\\s+[^;]*on\\s+(public\\.)?${t}[^;]*to\\s+(anon|authenticated|public)\\b`, "i").test(allMig),
    `public.${t} must carry no GRANT to anon/authenticated in any migration (policies alone open nothing).`,
  );
}
const sweepPath = path.join(migDir, "20261116000003_security_sweep.sql");
must(fs.existsSync(sweepPath), "20261116000003_security_sweep.sql missing (sibling DS-SEC-INFRA scope; this verifier reads it, never edits it).");
const sweep = read(sweepPath);
const sweepCode = stripSqlComments(sweep);
must(!sweepCode.toLowerCase().includes("vibe_coins_earned"), "vibe_coins_earned must not ship in the security_sweep file (economy-lane owned, QUEUE.md).");
must(!sweepCode.toLowerCase().includes("public.squads"), "ghost squads reference forbidden (squads ARE public.teams).");
must(
  /for\s+insert\s+with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*creator_user_id\s+and\s+is_verified\s*=\s*false\s*\)/i.test(sweep),
  "community_mods inserts must force is_verified = false (verification promotion stays service_role-only).",
);
must(
  /for\s+update\s+using\s*\(\s*auth\.uid\(\)\s*=\s*creator_user_id\s*\)\s*with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*creator_user_id\s+and\s+is_verified\s*=\s*false\s*\)/i.test(sweep),
  "community_mods updates must lock verified rows against client edits.",
);
must(
  /auth\.uid\(\)\s+is\s+not\s+null\s+and\s+status\s+in\s*\([^)]*online/i.test(sweep),
  "dps node discovery must stay authenticated-only (anon sees nothing).",
);

// 5. chat_participants: RLS on + self-membership policies (landed gap) -----
// QUEUE.md DS-SEC-INFRA-01 requested its policy in a NEW migration; landed in
// 20261219000011_rls_enabled_no_policy_fix.sql as chat_participants_*_own
// (self-membership: SELECT/INSERT/UPDATE/DELETE own rows). Neighbor policies
// (chat_threads_read, chat_messages_read/insert) gate on EXISTS over this
// table, so self-readable membership is what makes them true for members.
must(
  /alter\s+table\s+public\.chat_participants\s+enable\s+row\s+level\s+security/i.test(allMig),
  "ROW LEVEL SECURITY not enabled on public.chat_participants.",
);
must(
  /create\s+policy\s+chat_participants_select_own\s+on\s+public\.chat_participants\b/i.test(allMig),
  "public.chat_participants missing chat_participants_select_own (self-membership SELECT; see 20261219000011).",
);
must(
  /create\s+policy\s+chat_participants_insert_own\s+on\s+public\.chat_participants\b/i.test(allMig),
  "public.chat_participants missing chat_participants_insert_own (self-membership INSERT; see 20261219000011).",
);

// 6. clan_wallets floor pin (regression guard, not the tighten) ----------------
// Current bound allows negatives to -1000000; the >= 0 tighten is requested
// via QUEUE.md DS-SEC-INFRA-01 (economy/integrator ruling, NEW migration).
// This pin only guards against silent REMOVAL of the floor.
must(
  /create\s+table\s+if\s+not\s+exists\s+public\.clan_wallets[\s\S]*?check\s*\(\s*balance\s*>=/i.test(allMig),
  "clan_wallets balance CHECK floor missing (must keep a floor until the queued tighten lands).",
);

console.log(
  `sec-sweep OK: ${DENY_TABLES.length} deny-by-default tables + 2 service_role-only mint paths pinned in ${LOCKDOWN}; ` +
    `${crons.length} cron routes Bearer-gated + fail-closed; ${clientFiles.length} client files secret-free; ` +
    `${SWEEP_TABLES.length} remastery tables RLS-enabled with no anon/authenticated GRANTs + 0003 invariants pinned; ` +
    `chat_participants RLS-on + self-membership policies; clan_wallets floor pinned.`,
);
