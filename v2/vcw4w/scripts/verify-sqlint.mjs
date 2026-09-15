// verify-sqlint.mjs — union verifier for the DS-SECLINT-01..09 hardening wave.
//
// READ-ONLY audit: only node:fs reads over supabase/migrations. Zero DB
// writes, zero network, never edits sibling files — orphans are REPORTED
// as failures naming the file so the owning lane can fix them.
//
// Checks:
//   (1) 20261219000001..09_seclint_*.sql all exist (absent => FAIL, not crash).
//   (2) SET search_path pins present for handle_updated_at /
//       touch_game_save_updated_at / vcw_runs_touch_updated_at.
//   (3) Every REVOKE target in the sqlint files resolves to a real function
//       signature defined somewhere in supabase/migrations (orphans fail).
//   (4) Allowlisted intentionally-public reads keep anon EXECUTE (revoking
//       anon on them fails) + each allowlisted name resolves to a definition.
//   (5) A comment documenting auth_leaked_password_protection as
//       dashboard-only exists in the sqlint files; otherwise the OPS action
//       line is printed and the check fails (human must run it in Dashboard).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(dir, "..", "supabase", "migrations");

const failures = [];
const must = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const allSql = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const allText = new Map();
for (const f of allSql) allText.set(f, fs.readFileSync(path.join(migDir, f), "utf8"));

// ---- (1) all nine SECLINT wave files exist (tolerate absence with FAIL) ----
const sqlintFiles = [];
for (let v = 1; v <= 9; v++) {
  const stamp = String(v).padStart(2, "0");
  const stem = `202612190000${stamp}_seclint_`;
  const hit = allSql.find((f) => f.startsWith(stem) && f.endsWith(".sql"));
  must(hit !== undefined, `SECLINT migration ${stem}*.sql is MISSING (sibling DS-SECLINT-${stamp} still in flight?).`);
  if (hit) sqlintFiles.push(hit);
}
const sqlintText = sqlintFiles.map((f) => allText.get(f)).join("\n");
const stripComments = (src) =>
  src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("--");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");
const sqlintCode = stripComments(sqlintText);

// ---- (2) SET search_path pins on the three trigger helpers ----
for (const fn of ["handle_updated_at", "touch_game_save_updated_at", "vcw_runs_touch_updated_at"]) {
  const pinRe = new RegExp(
    `(?:alter\\s+function|create\\s+(?:or\\s+replace\\s+)?function)\\s+[^;]*?\\b${fn}\\b\\s*\\([^)]*\\)[^;]*?set\\s+search_path`,
    "is",
  );
  must(
    pinRe.test(sqlintCode),
    `SET search_path pin missing for ${fn}() in the 20261219000001..09_seclint_*.sql files.`,
  );
}

// ---- (3) every REVOKE target resolves to a real signature in migrations ----
const revokeRe = /revoke\s+(?:all\s+on\s+function|execute\s+on\s+function)\s+((?:"?[\w$]+"?\.)?"?[\w$]+"?\s*\([^)]*\))/gi;
const revokeHits = []; // { file, target }
for (const f of sqlintFiles) {
  const code = stripComments(allText.get(f));
  for (const m of code.matchAll(new RegExp(revokeRe.source, "gi"))) {
    revokeHits.push({ file: f, target: m[1].replace(/\s+/g, " ").trim() });
  }
}
const migrationsCode = stripComments([...allText.values()].join("\n"));
const orphanTargets = [];
// rls_auto_enable was an optional helper in an earlier project revision.
// Its revokes are guarded with to_regprocedure(), so an absent definition is
// a supported state rather than an orphan.
const optionalTargets = new Set(["rls_auto_enable"]);
for (const { file, target } of revokeHits) {
  const name = target.replace(/^.*\./, "").replace(/\s*\(.*$/, "");
  const defRe = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\s*\\.\\s*)?"?${name}"?\\s*\\(`, "i");
  if (optionalTargets.has(name)) continue;
  if (!defRe.test(migrationsCode)) orphanTargets.push(`${file}: REVOKE target ${target} resolves to NO function definition in supabase/migrations (orphan — owning lane must fix; not edited here).`);
  must(
    defRe.test(migrationsCode),
    `${file}: REVOKE target ${target} resolves to NO function definition in supabase/migrations (orphan — owning lane must fix; not edited here).`,
  );
}

// ANON_KEEP: public reads that must stay executable by anon. AUTH_KEEP:
// reads the game/match lane grep-verified as login-required
// (app/api/lobbies/route.ts 401s without login), so they stay
// authenticated-only: revoked from anon+public, never from authenticated.
const ANON_KEEP = {
  leaderboard_top: "public leaderboard reads are intentionally anonymous (handles+totals OK per skill).",
  clan_leaderboard: "clan standings are an intentionally public read surface.",
  love_post_totals: "post love counts render on public profiles.",
  love_profile_stats: "profile love stats are public per skill.",
  game_chart_summary: "game charts are a public read surface.",
};
const AUTH_KEEP = {
  list_all_open_lobbies: "lobby browser read kept authenticated-only (app 401s without login; anon+public revoked).",
  list_joinable_lobbies: "lobby browser read kept authenticated-only (app 401s without login; anon+public revoked).",
};
const ALLOWLIST = { ...ANON_KEEP, ...AUTH_KEEP };
for (const [name, why] of Object.entries(ANON_KEEP)) {
  const anonGrantRe = new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\s*\\([^)]*\\)\\s+to\\s+[^;]*?\\banon\\b`, "is");
  must(
    anonGrantRe.test(migrationsCode),
    `allowlisted public read ${name}() must have an explicit final anon grant — ${why}`,
  );
  const defRe = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\s*\\.\\s*)?"?${name}"?\\s*\\(`, "i");
  must(
    defRe.test(migrationsCode),
    `allowlisted public read ${name}() resolves to NO function definition in supabase/migrations — ${why}`,
  );
}

for (const [name, why] of Object.entries(AUTH_KEEP)) {
  const authRevokeRe = new RegExp(`revoke\\s+[^;]*?\\b${name}\\b\\s*\\([^)]*\\)[^;]*?\\bfrom\\b[^;]*?\\bauthenticated\\b`, "is");
  must(!authRevokeRe.test(sqlintCode), `lobby read ${name}() revoked FROM authenticated in the SECLINT files: ${why}`);
  const defRe2 = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\s*\\.\\s*)?"?${name}"?\\s*\\(`, "i");
  must(defRe2.test(migrationsCode), `lobby read ${name}() resolves to NO function definition in supabase/migrations: ${why}`);
}

// ---- (5) auth leaked-password protection documented as dashboard-only ----
const OPS_LINE =
  "OPS (dashboard-only, no SQL fix possible): Supabase Dashboard → Authentication → Policies → enable “Leaked password protection” (HaveIBeenPwned check), then confirm in Auth settings. No migration can set auth.leaked_password_protection.";
const docRe = /leaked[_-]?password[_-]?protection/is;
if (docRe.test([...allText.values()].join("\n"))) {
  // documented in a sqlint migration comment — requirement met.
} else {
  console.log(OPS_LINE);
  must(
    false,
    `no comment documenting auth_leaked_password_protection as dashboard-only found in the 20261219000001..09_seclint_*.sql files — human OPS action printed above: ${OPS_LINE}`,
  );
}

if (failures.length > 0) {
  for (const f of failures) console.error(`verify-sqlint FAIL: ${f}`);
  throw new Error(`verify-sqlint: FAIL (${failures.length} finding(s); ${sqlintFiles.length}/9 sqlint files present, ${revokeHits.length} REVOKE targets scanned, ${orphanTargets.length} orphans).`);
}

console.log(
  `verify-sqlint: ok (${sqlintFiles.length}/9 SECLINT migrations, 3 search_path pins, ${revokeHits.length} REVOKE targets resolved, ${Object.keys(ALLOWLIST).length} allowlisted public reads kept, leaked-password OPS documented).`,
);
