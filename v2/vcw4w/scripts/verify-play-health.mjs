import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// verify-play-health: reload guards + 500-proof play surfaces (read-only).
// (a) runtime-bridge.js cloud-save reloads stay bounded (once-per-document,
//     fingerprint, auto-reload slot); the only other reload is the explicit
//     user-confirmed "reset" case — never an unconditional load-path reload.
// (b) presence + daily claim/status routes log structurally server-side and
//     tolerate missing tables (42P01 / PGRST205) instead of 500ing.
// (c) game_presence + daily_claims migrations exist with sequenced versions.

const root = process.cwd();
function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}
function fail(msg) {
  throw new Error(`verify-play-health: ${msg}`);
}

// ─── (a) runtime-bridge reload guards ──────────────────────────────
const bridge = read("public/games/html/runtime-bridge.js");
for (const token of ["cloudReloadedThisDocument", "claimAutoReloadSlot", "fourweird-cloud-applied:"]) {
  if (!bridge.includes(token)) fail(`runtime-bridge.js missing reload guard token ${token}.`);
}
const lines = bridge.split("\n");
const reloadAt = lines
  .map((text, i) => ({ text, line: i + 1 }))
  .filter(({ text }) => text.includes("location.reload()"));
if (reloadAt.length !== 2) fail(`runtime-bridge.js has ${reloadAt.length} location.reload() calls, expected exactly 2 (reset case + guarded cloud-load).`);
// One reload must sit inside the explicit `case "reset":` block.
const resetIdx = lines.findIndex((t) => t.trim() === 'case "reset":');
if (resetIdx < 0) fail(`runtime-bridge.js lost its case "reset" block.`);
const resetReload = reloadAt.find(({ line }) => line > resetIdx + 1 && line < resetIdx + 8);
if (!resetReload) fail(`runtime-bridge.js reset reload is not inside the case "reset" block.`);
// The other reload must be the guarded cloud-load one: once-flag set just
// above it plus fingerprint + slot-claim conditions in the window before it.
const loadReload = reloadAt.find((r) => r !== resetReload);
const windowBefore = lines.slice(Math.max(0, loadReload.line - 25), loadReload.line - 1).join("\n");
for (const token of ["cloudReloadedThisDocument = true", "claimAutoReloadSlot()", "sessionStorage"]) {
  if (!windowBefore.includes(token)) fail(`cloud-load reload at line ${loadReload.line} lost guard ${token} in its window.`);
}

// ─── (b) routes: structured logging + missing-table tolerance ───────
const routes = [
  "app/api/presence/route.ts",
  "app/api/coins/daily/route.ts",
  "app/api/coins/daily/status/route.ts",
];
for (const rel of routes) {
  const src = read(rel);
  if (!src.includes("console.error(\"[api]")) fail(`${rel} missing structured server logging (console.error("[api] ...)).`);
  for (const token of ["42P01", "PGRST205"]) {
    if (!src.includes(token)) fail(`${rel} missing missing-table tolerance token ${token}.`);
  }
}

// ─── (c) migrations exist and are sequenced ─────────────────────────
const migs = readdirSync(path.join(root, "supabase", "migrations")).filter((f) => f.endsWith(".sql"));
const versioned = (f) => /^\d{14}_.*\.sql$/.test(f);
const creator = (table) =>
  migs.find((f) => {
    const sql = read(path.join("supabase", "migrations", f));
    return new RegExp(`create table[^;]*public\\.${table}\\b`, "is").test(sql);
  });
const presenceMig = creator("game_presence");
const claimsMig = creator("daily_claims");
if (!presenceMig) fail(`no migration creates public.game_presence.`);
if (!claimsMig) fail(`no migration creates public.daily_claims.`);
for (const f of [presenceMig, claimsMig]) {
  if (!versioned(f)) fail(`migration ${f} breaks the 14-digit version sequence.`);
}

console.log("Play health checks OK.");
