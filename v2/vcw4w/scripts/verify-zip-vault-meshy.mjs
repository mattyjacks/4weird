import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => { throw new Error(msg); };

// Game .zip submissions + Weird Vault + Meshy.ai + AI autosave integrity.
const zip = read("../lib/zip-submit.ts");
const vault = read("../lib/blob-vault.ts");
const meshy = read("../lib/meshy.ts");
const autosave = read("../lib/ai-autosave.ts");
const mig = read("../supabase/migrations/20261013000000_zip_vault_meshy.sql");
const zipRoute = read("../app/api/code/zip/route.ts");
const auditRoute = read("../app/api/code/[id]/audit/route.ts");
const codeGet = read("../app/api/code/[id]/route.ts");
const vaultRoute = read("../app/api/vault/blobs/route.ts");
const vaultOne = read("../app/api/vault/blobs/[id]/route.ts");
const shares = read("../app/api/vault/shares/route.ts");
const meshyOpsRoute = read("../app/api/meshy/ops/route.ts");
const meshyGen = read("../app/api/meshy/generate/route.ts");
const meshyStatus = read("../app/api/meshy/status/route.ts");
const autosaveRoute = read("../app/api/ai/autosave/route.ts");
const artifacts = read("../app/api/ai/artifacts/route.ts");

// 1. Lib constants: 50 MB cap, project game root, 4 verdicts, 25% cuts.
for (const [name, src, token] of [
  ["zip-submit", zip, "ZIP_MAX_BYTES = 50 * 1024 * 1024"],
  ["zip-submit", zip, "cleanGameRoot"],
  ["zip-submit", zip, "auditZipPackage"],
  ["zip-submit", zip, "SUBMIT_CUT_PCT = SERVICE_CUT_PCT"],
  ["zip-submit", zip, "STORAGE_CUT_PCT = SERVICE_CUT_PCT"],
  ["zip-submit", zip, "AUDIT_CUT_PCT = SERVICE_CUT_PCT"],
  ["blob-vault", vault, "VAULT_CUT_PCT = SERVICE_CUT_PCT"],
  ["blob-vault", vault, "VAULT_BUCKET = \"game-blobs\""],
  ["blob-vault", vault, "VAULT_MAX_BLOB_BYTES = 50 * 1024 * 1024"],
  ["blob-vault", vault, "isVaultScope"],
  ["blob-vault", vault, "vaultObjectKey"],
  ["meshy", meshy, "MESHY_CUT_PCT = SERVICE_CUT_PCT"],
  ["meshy", meshy, "MESHY_OPS"],
  ["meshy", meshy, "meshyConfigured"],
  ["meshy", meshy, "MESHY_API_KEY"],
  ["meshy", meshy, "quoteMeshySplit"],
  ["ai-autosave", autosave, "AUTOSAVE_CUT_PCT = SERVICE_CUT_PCT"],
  ["ai-autosave", autosave, "planAutosave"],
  ["ai-autosave", autosave, "LOG_TIERS"],
]) {
  if (!src.includes(token)) fail(`${name} lib missing ${token}.`);
}
for (const v of ['"safe"', '"warning"', '"unsafe"', '"denied"']) {
  if (!zip.includes(v)) fail(`zip-submit lib missing verdict ${v}.`);
}
// Hard-deny signals present; automatic IP-to-authorities pipeline absent.
for (const sig of ["keylog", "EICAR", "mimikatz", "ransomware"]) {
  if (!zip.toLowerCase().includes(sig.toLowerCase())) fail(`zip-submit lib missing deny signal ${sig}.`);
}
if (/report.*authorit.*automatically|auto.*report.*\bip\b/i.test(zip)) {
  fail("zip-submit lib must not promise automatic IP reporting (human-only by law).");
}
// Vault paths must store everyday screenshot names: dot-runs ("...") collapse
// instead of rejecting, and the allowlist accepts @/+ (the upload form preserves them).
if (!vault.includes("@:+")) fail("blob-vault allowlist must accept @/+ (upload form preserves them).");
if (!vault.includes("\\.\\.+/g")) fail('blob-vault must collapse dot-runs so "..." screenshot names store.');

// 2. Scopes: strictly separated, registered in both bot modules.
const policy = read("../lib/bot-key-policy.ts");
const auth = read("../lib/bot-auth.ts");
for (const scope of [
  "code:submit", "code:audit", "code:review",
  "vault:read", "vault:write", "vault:share", "vault:quarantine",
  "meshy:generate", "meshy:read", "ai:autosave", "ai:read",
]) {
  if (!policy.includes(`"${scope}"`)) fail(`bot-key-policy missing scope ${scope}.`);
  if (!auth.includes(`"${scope}"`)) fail(`bot-auth missing scope ${scope}.`);
}
// Routes enforce their scope.
for (const [name, src, scope] of [
  ["code/zip", zipRoute, "code:submit"],
  ["code audit", auditRoute, "code:audit"],
  ["vault blobs", vaultRoute, "vault:write"],
  ["vault blob", vaultOne, "vault:write"],
  ["vault shares", shares, "vault:share"],
  ["meshy generate", meshyGen, "meshy:generate"],
  ["meshy status", meshyStatus, "meshy:read"],
  ["ai autosave", autosaveRoute, "ai:autosave"],
  ["ai artifacts", artifacts, "ai:read"],
]) {
  if (!src.includes(scope)) fail(`${name} route must enforce scope ${scope}.`);
}

// 3. Quarantine guarantees: denied/unsafe never served.
if (!zipRoute.includes("quarantined") || !zipRoute.includes("rejected")) {
  fail("zip route must quarantine denied/unsafe packages.");
}
if (!zipRoute.includes("safety_reports")) fail("zip route must file quarantined packages for human review.");
if (!zipRoute.includes("only on valid legal process") && !zipRoute.includes("valid legal process")) {
  fail("zip route must state the lawful IP-disclosure rule.");
}
if (!codeGet.includes("!r.quarantined") && !codeGet.includes("quarantined")) {
  fail("code GET must withhold downloads for quarantined rows.");
}
if (!vaultOne.includes("quarantined")) fail("vault row route must hide quarantined downloads.");
if (!shares.includes("Quarantined files cannot be shared")) fail("shares route must refuse quarantined files.");

// 4. Money: meter-before-service + 25% notes + usage rollups.
for (const [name, src] of [
  ["zip", zipRoute], ["audit", auditRoute], ["meshy generate", meshyGen], ["vault ready", vaultOne],
]) {
  if (!src.includes("meter_")) fail(`${name} route must meter through a guarded RPC.`);
}
if (!meshyGen.includes("started:false") && !meshyGen.includes("started: false")) {
  fail("meshy generate must degrade honestly without MESHY_API_KEY.");
}
if (!meshyOpsRoute.includes("MESHY_OPS") || !meshyOpsRoute.includes("configured")) {
  fail("meshy ops route must serve the catalog + configured flag.");
}
if (!mig.includes("25") || !mig.includes("meter_submission_charge") || !mig.includes("meter_meshy_usage") || !mig.includes("meter_vault_storage")) {
  fail("migration must define the three meter RPCs with the 25% cut.");
}
for (const rpc of ["my_submission_spend", "my_meshy_spend", "my_vault_spend"]) {
  if (!mig.includes(rpc)) fail(`migration missing ${rpc}.`);
}
const usage = read("../app/api/my/usage/route.ts");
for (const token of ["my_submission_spend", "my_meshy_spend", "my_vault_spend"]) {
  if (!usage.includes(token)) fail(`usage API must roll up ${token}.`);
}

// 5. Vault scope separation in the migration (exactly-one-scope CHECK).
if (!mig.includes("vault_scope_check") && !mig.includes("(scope = 'personal' and owner_id is not null")) {
  fail("migration must enforce exactly-one-scope per vault file.");
}

// 6. UI surfaces exist + are linked.
for (const [name, file, token] of [
  ["zip form", "../components/submit/zip-submit-form.tsx", "/api/code/zip"],
  ["code viewer", "../components/code/code-viewer.tsx", "CodeViewer"],
  ["vault browser", "../components/vault/vault-browser.tsx", "/api/vault/blobs"],
  ["meshy studio", "../components/meshy/meshy-studio.tsx", "/api/meshy/generate"],
  ["submit page", "../app/submit/page.tsx", "ZipSubmitForm"],
  ["vault page", "../app/vault/page.tsx", "VaultBrowser"],
  ["meshy page", "../app/meshy/page.tsx", "MeshyStudio"],
  ["code page", "../app/code/[id]/page.tsx", "CodeDetail"],
]) {
  const src = read(file);
  if (!src.includes(token)) fail(`${name} must reference ${token}.`);
  void name;
}
if (!read("../components/site/site-header.tsx").includes('"/vault"')) fail("Site nav must link to /vault.");
if (!read("../components/site/site-header.tsx").includes('"/meshy"')) fail("Site nav must link to /meshy.");
if (!read("../components/site/site-header.tsx").includes('"/submit"')) fail("Site nav must link to /submit.");
const env = read("../.env.example");
if (!env.includes("MESHY_API_KEY=")) fail(".env.example must document MESHY_API_KEY.");
if (!env.includes("game-blobs")) fail(".env.example must document the game-blobs bucket.");
const terms = read("../app/terms/page.tsx");
if (!terms.includes("50 MB") || !terms.includes("quarantined")) fail("Terms must disclose the .zip cap + quarantine.");
if (!terms.includes("only on valid legal process")) fail("Terms must state human-only referrals + lawful IP disclosure.");

// 7. Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:zip-vault-meshy")) fail("package.json must wire verify:zip-vault-meshy.");
if (!/"test": "[^"]*verify:zip-vault-meshy/.test(pkg)) fail("npm test must run verify:zip-vault-meshy.");

// 8. 50 MB fast-load cap: every game-blobs write path enforces it.
const capMig = read("../supabase/migrations/20261015000000_game_blobs_50mb.sql");
if (!capMig.includes("52428800")) fail("50 MB migration must enforce 52428800 bytes.");
const vaultRegister = read("../app/api/vault/blobs/route.ts");
if (!vaultRegister.includes("VAULT_MAX_BLOB_BYTES")) fail("vault blobs route must enforce VAULT_MAX_BLOB_BYTES.");
const submitPage = read("../app/submit/page.tsx");
if (!submitPage.includes("50 MB")) fail("Submit page must disclose the 50 MB fast-load cap.");

// 9. Vault file lifecycle: upsert arbiter, trash, folders, shares, usage.
const upsertMig = read("../supabase/migrations/20261107000000_vault_path_upsert_trash.sql");
for (const token of ["vault_files_scope_path_uniq", "nulls not distinct", "deleted_at", "trg_vault_files_touch"]) {
  if (!upsertMig.includes(token)) fail(`vault upsert/trash migration missing ${token}.`);
}
// 42501 hotfix: service_role must hold explicit grants on every vault table
// (prod log: "permission denied for table vault_blobs" -> 500 on register).
const grantsMig = read("../supabase/migrations/20261108000000_vault_service_grants.sql");
for (const token of ["grant all on public.vault_blobs to service_role", "grant all on public.vault_files to service_role", "grant all on public.vault_usage to service_role"]) {
  if (!grantsMig.includes(token)) fail(`vault grants migration missing ${token}.`);
}
const vaultRow = read("../app/api/vault/blobs/[id]/route.ts");
for (const token of ["Unable to rename file.", "Unable to delete file.", "A file already has that name in this folder.", "loadOwnedFile"]) {
  if (!vaultRow.includes(token)) fail(`vault row route missing ${token}.`);
}
const folders = read("../app/api/vault/folders/route.ts");
for (const token of ["Cannot move a folder inside itself.", "Folder too large; split it first.", "Unable to delete folder."]) {
  if (!folders.includes(token)) fail(`vault folders route missing ${token}.`);
}
const redeem = read("../app/api/vault/s/[token]/route.ts");
for (const token of ["Link expired.", "302"]) {
  if (!redeem.includes(token)) fail(`vault share redeem route missing ${token}.`);
}
const usageApi = read("../app/api/vault/usage/route.ts");
if (!usageApi.includes("freeBytesPersonal")) fail("vault usage route must report freeBytesPersonal.");
const browser = read("../components/vault/vault-browser.tsx");
for (const token of ["500 MB", "50 MB", "quarantine", 'sandbox=""', 'role="status"', "/api/vault/usage", "/api/vault/shares", "Pick a squad above", "Pick an org above"]) {
  if (!browser.includes(token)) fail(`vault browser missing ${token}.`);
}
if (!vaultRegister.includes("isMissingTrashColumn")) fail("vault blobs route must retry without the trash filter on pre-migration DBs.");
if (!vault.includes("sanitizeVaultFilter")) fail("blob-vault lib must sanitize LIKE filters.");

// 10. Vault security guarantees (locked after the 2026 hardening pass).
for (const token of ["Content mismatch; re-upload.", "createSignedUrl(storagePath, 300", "vault-read:", "readyScopeId"]) {
  if (!vaultRow.includes(token)) fail(`vault row route missing ${token}.`);
}
for (const token of ["xml-dtd", "xhtm|dhtml", "isMissingTrashColumn", "vault-read:"]) {
  if (!vaultRegister.includes(token)) fail(`vault blobs route missing ${token}.`);
}
const autosaveVault = read("../app/api/ai/autosave/route.ts");
if (!autosaveVault.includes("VAULT_BLOCKED_EXT")) fail("autosave route must enforce the extension blocklist.");
if (autosaveVault.includes('onConflict: "sha256"')) fail("autosave route must not repoint shared blob rows (insert-only).");
const meshyVault = read("../app/api/meshy/status/route.ts");
if (meshyVault.includes('onConflict: "sha256"')) fail("meshy status route must not repoint shared blob rows (insert-only).");
const meterMig = read("../supabase/migrations/20261109000000_vault_meter_ownership.sql");
if (!meterMig.includes("not your file")) fail("meter ownership migration must refuse foreign files.");
const purgeRoute = read("../app/api/vault/blobs/[id]/purge/route.ts");
if (!purgeRoute.includes("under safety review")) fail("purge route must hold files under safety review.");
const redeemRoute = read("../app/api/vault/s/[token]/route.ts");
if (!redeemRoute.includes("vault-share:")) fail("share redeem route must throttle by IP.");
for (const token of ["VAULT_BLOCKED_EXT", 'seg !== "."']) {
  if (!vault.includes(token)) fail(`blob-vault lib missing ${token}.`);
}

console.log("zip + vault + meshy integrity OK - 50 MB, 4 verdicts, strict scopes, 25% included, human-only referrals.");
