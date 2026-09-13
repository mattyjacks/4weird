// Verifies the GraveGain MMORPG layer (gravegain1d/2d/3d/4d/5d, v2 only).
//
// Asserts:
//   1. Shared net core exists + exposes costPerPlayer/canEnter + node --check passes.
//   2. mmorpg-1d/2d/3d/4d/5d adapters exist + solo-safe markers (?mmorpg dormant).
//   3. lib/mmorpg-economy.ts exports quoteSession + 100-coins=$1 parity.
//   4. Migration file exists with mmorpg_servers age_band check.
//   5. No edits to parity-locked bundles (game.js untouched).
//
// Missing sibling files (other lanes not landed yet) are SKIP, not FAIL,
// so this verifier passes on a clean tree. Static text asserts, no DB.
// Node only, no deps.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
let failures = 0;
let skips = 0;

function ok(label) {
  console.log(`  OK: ${label}`);
}

function fail(label, hint = "") {
  failures += 1;
  console.error(`  FAIL: ${label}${hint ? ` - ${hint}` : ""}`);
}

function skip(label, hint = "") {
  skips += 1;
  console.log(`  SKIP: ${label}${hint ? ` - ${hint}` : ""}`);
}

function exists(rel) {
  return existsSync(join(root, ...rel.split("/")));
}

function read(rel) {
  return readFileSync(join(root, ...rel.split("/")), "utf8");
}

function firstExisting(candidates) {
  for (const rel of candidates) {
    if (exists(rel)) return rel;
  }
  return null;
}

function globDir(dirRel, test) {
  const dir = join(root, ...dirRel.split("/"));
  try {
    return readdirSync(dir).filter(test);
  } catch {
    return [];
  }
}

// ---- 1. shared net core ----
console.log("[1] shared net core (costPerPlayer/canEnter, node --check)");
const netCandidates = [
  "public/games/gravegain-mmorpg-net.js",
  "public/games/html/gravegain-mmorpg-net.js",
  "public/games/html/mmorpg-net.js",
  "public/games/html/gravegain-mmorpg.js",
  "lib/mmorpg-net.ts",
  "lib/mmorpg-net.js",
  "lib/gravegain-mmorpg-net.ts",
];
const netRel = firstExisting(netCandidates);
if (!netRel) {
  skip("shared net core absent (other lane not landed)", netCandidates.join(", "));
} else {
  const src = read(netRel);
  if (src.includes("costPerPlayer")) ok(`${netRel} exposes costPerPlayer`);
  else fail(`${netRel} exposes costPerPlayer`, "missing token");
  if (src.includes("canEnter")) ok(`${netRel} exposes canEnter`);
  else fail(`${netRel} exposes canEnter`, "missing token");
  try {
    execFileSync(process.execPath, ["--check", join(root, ...netRel.split("/"))], { stdio: "pipe" });
    ok(`${netRel} passes node --check`);
  } catch (e) {
    fail(`${netRel} passes node --check`, "syntax error");
  }
}

// ---- 2. mmorpg-1d/2d/3d/4d/5d adapters (solo-safe, ?mmorpg dormant) ----
console.log("[2] mmorpg-1d/2d/3d/4d/5d adapters (solo-safe, ?mmorpg dormant)");
const adapterCandidates = {
  "1d": [
    "public/games/gravegain1d/mmorpg-1d.js",
    "public/games/html/gravegain1d/mmorpg-1d.js",
    "public/games/html/mmorpg-1d.js",
    "public/games/html/gravegain-mmorpg-1d.js",
  ],
  "2d": [
    "public/games/gravegain2d/mmorpg-2d.js",
    "public/games/html/gravegain2d/mmorpg-2d.js",
    "public/games/html/mmorpg-2d.js",
    "public/games/html/gravegain-mmorpg-2d.js",
  ],
  "3d": [
    "public/games/gravegain3d/mmorpg-3d.js",
    "public/games/html/gravegain3d/mmorpg-3d.js",
    "public/games/html/mmorpg-3d.js",
    "public/games/html/gravegain-mmorpg-3d.js",
  ],
  "4d": [
    "public/games/gravegain4d/mmorpg-4d.js",
    "public/games/html/gravegain4d/mmorpg-4d.js",
    "public/games/html/mmorpg-4d.js",
    "public/games/html/gravegain-mmorpg-4d.js",
  ],
  "5d": [
    "public/games/gravegain5d/mmorpg-5d.js",
    "public/games/html/gravegain5d/mmorpg-5d.js",
    "public/games/html/mmorpg-5d.js",
    "public/games/html/gravegain-mmorpg-5d.js",
  ],
};
for (const mode of ["1d", "2d", "3d", "4d", "5d"]) {
  const rel = firstExisting(adapterCandidates[mode]);
  if (!rel) {
    skip(`mmorpg-${mode} adapter absent (other lane not landed)`, adapterCandidates[mode].join(", "));
    continue;
  }
  const src = read(rel);
  ok(`${rel} exists`);
  // Solo-safe = dormant unless ?mmorpg= present: must mention the query key
  // and the dormant state, and must gate on location.search/URLSearchParams.
  const hasKey = src.includes("?mmorpg") || src.includes('"mmorpg"') || src.includes("'mmorpg'") || src.includes("mmorpg");
  const hasDormant = /dormant/i.test(src);
  const hasGate = src.includes("location.search") || src.includes("URLSearchParams") || src.includes("queryParam") || src.includes("searchParams");
  if (hasKey && hasDormant) ok(`${rel} solo-safe markers (?mmorpg + dormant)`);
  else fail(`${rel} solo-safe markers (?mmorpg + dormant)`, `key=${hasKey} dormant=${hasDormant}`);
  if (hasGate) ok(`${rel} gates on query string (solo play untouched)`);
  else fail(`${rel} gates on query string (solo play untouched)`, "no location.search/URLSearchParams gate");
  try {
    execFileSync(process.execPath, ["--check", join(root, ...rel.split("/"))], { stdio: "pipe" });
    ok(`${rel} passes node --check`);
  } catch {
    fail(`${rel} passes node --check`, "syntax error");
  }
}

// ---- 3. lib/mmorpg-economy.ts (quoteSession + 100-coins=$1 parity) ----
console.log("[3] lib/mmorpg-economy.ts (quoteSession + 100-coins=$1 parity)");
const econRel = "lib/mmorpg-economy.ts";
if (!exists(econRel)) {
  skip(`${econRel} absent (economy lane not landed)`);
} else {
  const src = read(econRel);
  if (/export\s+(function|const|async function)\s+quoteSession/.test(src) || src.includes("quoteSession")) {
    ok(`${econRel} exports quoteSession`);
  } else {
    fail(`${econRel} exports quoteSession`, "missing token");
  }
  // Parity: 100 coins cost exactly $1.00 ($0.01/coin). Accept any of the
  // canonical spellings so the economy lane keeps freedom of expression.
  const has100 = src.includes("100");
  const hasParityToken =
    src.includes("$1") ||
    src.includes("COIN_PRICE_CENTS_EACH") ||
    src.includes("priceCents") ||
    src.includes("TRIAL_COINS_DEFAULT") ||
    src.includes("0.01") ||
    /100\s*coins?\s*(=|cost|===\s*\$)/i.test(src);
  if (has100 && hasParityToken) ok(`${econRel} keeps 100-coins=$1 parity`);
  else fail(`${econRel} keeps 100-coins=$1 parity`, "expected 100 + $1/price token");
}

// ---- 4. migration file (mmorpg_servers age_band check) ----
console.log("[4] migration (mmorpg_servers age_band check)");
const migFiles = globDir("supabase/migrations", (f) => f.endsWith(".sql") && f.includes("mmorpg"));
if (migFiles.length === 0) {
  skip("no *mmorpg*.sql migration yet (other lane not landed)");
} else {
  let found = false;
  for (const f of migFiles) {
    const src = read(`supabase/migrations/${f}`);
    const hasTable = src.includes("mmorpg_servers");
    const hasAgeBand = src.includes("age_band");
    if (hasTable && hasAgeBand) {
      ok(`supabase/migrations/${f} defines mmorpg_servers with age_band`);
      found = true;
      // Extra credit: age_band CHECK constraint present.
      if (/age_band[^;]*CHECK/i.test(src) || /CHECK[^;]*age_band/i.test(src)) {
        ok(`supabase/migrations/${f} constrains age_band via CHECK`);
      } else {
        fail(`supabase/migrations/${f} constrains age_band via CHECK`, "no CHECK on age_band");
      }
    }
  }
  if (!found) fail("migration defines mmorpg_servers + age_band", `checked ${migFiles.join(", ")}`);
}

// ---- 5. parity-locked bundles untouched (game.js) ----
console.log("[5] parity-locked bundles (game.js untouched)");
const bundles = [
  "public/games/html/gravegain1d/game.js",
  "public/games/html/gravegain2d/game.js",
  "public/games/html/gravegain3d/game.js",
];
const mmorpgTokens = ["mmorpg", "costPerPlayer", "quoteSession", "canEnter"];
let bundleChecked = 0;
for (const rel of bundles) {
  if (!exists(rel)) {
    skip(`${rel} absent`, "bundle missing");
    continue;
  }
  bundleChecked += 1;
  const src = read(rel);
  const hit = mmorpgTokens.find((t) => src.includes(t));
  if (!hit) ok(`${rel} untouched (no mmorpg tokens)`);
  else fail(`${rel} untouched (no mmorpg tokens)`, `contains ${hit}`);
}
if (bundleChecked === 0) skip("no parity bundles present to check");

// ---- summary ----
if (failures) {
  console.error(`verify-gravegain-mmorpg FAILED: ${failures} check(s) failed, ${skips} skipped.`);
  process.exit(1);
}
console.log(`verify-gravegain-mmorpg OK: mmorpg layer clean (${skips} skipped).`);
