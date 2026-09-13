import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => {
  try {
    return fs.existsSync(new URL(file, import.meta.url));
  } catch {
    return false;
  }
};
const fail = (msg) => { throw new Error(msg); };

const skips = [];
const skip = (msg) => {
  skips.push(msg);
  console.log(`SKIP: ${msg}`);
};

const OPENROUTER_MIGRATION = "../supabase/migrations/20261201000000_openrouter_metering.sql";
const OUTSCRAPER_MIGRATION = "../supabase/migrations/20261201000001_outscraper_metering.sql";
const REFUND_MIGRATION = "../supabase/migrations/20261202000000_vendor_usage_refunds.sql";

// The 7 metered vendor lib modules (openrouter-plays excluded: prompt-packs,
// not metered ops; the vendor generate route loads chat/agent/meta only).
const OPENROUTER_LIBS = [
  "../lib/openrouter-chat.ts",
  "../lib/openrouter-agent.ts",
  "../lib/openrouter-meta.ts",
];
const OUTSCRAPER_LIBS = [
  "../lib/outscraper-maps.ts",
  "../lib/outscraper-leads.ts",
  "../lib/outscraper-search.ts",
  "../lib/outscraper-reviews.ts",
];

// 1. Migrations exist with the full metering surface. SKIP per missing file
// since sibling agents write them in parallel.
function checkMigration(path, tokens, label) {
  if (!exists(path)) {
    skip(`${label} migration not yet present (${path}).`);
    return null;
  }
  const sql = read(path);
  for (const token of tokens) {
    if (!sql.includes(token)) fail(`${label} migration missing ${token}.`);
  }
  const lower = sql.toLowerCase();
  for (const token of ["revoke", "grant", "insert"]) {
    if (!lower.includes(token)) fail(`${label} migration missing ${token} line.`);
  }
  return sql;
}

const openrouterSql = checkMigration(
  OPENROUTER_MIGRATION,
  [
    "openrouter_usage",
    "meter_openrouter_usage",
    "openrouter_compute_split",
    "my_openrouter_usage",
    "v_openrouter_spend",
    "25 / 100",
    "IF NOT EXISTS",
    "coin_ledger",
  ],
  "openrouter",
);
const outscraperSql = checkMigration(
  OUTSCRAPER_MIGRATION,
  [
    "outscraper_usage",
    "meter_outscraper_usage",
    "outscraper_compute_split",
    "my_outscraper_usage",
    "v_outscraper_spend",
    "25 / 100",
    "IF NOT EXISTS",
    "coin_ledger",
  ],
  "outscraper",
);

// 2. Vendor generate routes meter through the RPC with no metering TODO left.
function checkRoute(path, rpc, label) {
  if (!exists(path)) {
    skip(`${label} route not yet present (${path}).`);
    return;
  }
  const src = read(path);
  if (!src.includes(rpc)) fail(`${label} route must call ${rpc}.`);
  if (src.includes("TODO(metering)")) fail(`${label} route must not contain TODO(metering).`);
}

checkRoute(
  "../app/api/openrouter-vendor/generate/route.ts",
  "meter_openrouter_usage",
  "openrouter-vendor generate",
);
checkRoute(
  "../app/api/outscraper/search/route.ts",
  "meter_outscraper_usage",
  "outscraper search",
);

// 2b. Refund path: migration defines the credit RPC, both routes call it on
// provider failure, and no TODO(refund) stubs remain.
const refundSql = checkMigration(
  REFUND_MIGRATION,
  [
    "refund_vendor_usage",
    "refunded_at",
    "usage_id",
    "refunded_charges",
    "refunded_coins",
    "IF NOT EXISTS",
    "coin_ledger",
  ],
  "vendor-refund",
);

function checkRefundRoute(path, label) {
  if (!exists(path)) {
    skip(`${label} route not yet present (${path}).`);
    return;
  }
  const src = read(path);
  if (!src.includes("refund_vendor_usage")) fail(`${label} route must call refund_vendor_usage.`);
  if (!src.includes("meterUsageId")) fail(`${label} route must extract usage_id for refunds.`);
  if (src.includes("TODO(refund)")) fail(`${label} route must not contain TODO(refund).`);
}

checkRefundRoute("../app/api/openrouter-vendor/generate/route.ts", "openrouter-vendor generate");
checkRefundRoute("../app/api/outscraper/search/route.ts", "outscraper search");

// 3. Every op key in the lib OP_KEYS/OPS entries has a CASE arm in SQL.
// SKIP the whole check if any lib or either migration is missing.
function extractOpKeys(src) {
  const keys = new Set();
  const block = src.match(/_OP_KEYS\s*=\s*\[([\s\S]*?)\]/);
  const scope = block ? block[1] : src;
  for (const m of scope.matchAll(/"([A-Za-z0-9][A-Za-z0-9_-]*)"/g)) keys.add(m[1]);
  for (const m of src.matchAll(/\bop:\s*"([A-Za-z0-9][A-Za-z0-9_-]*)"/g)) keys.add(m[1]);
  return [...keys];
}

{
  const allLibs = [...OPENROUTER_LIBS, ...OUTSCRAPER_LIBS];
  const missingLib = allLibs.find((f) => !exists(f));
  if (missingLib) {
    skip(`op-key coverage skipped; lib not yet present (${missingLib}).`);
  } else if (!openrouterSql || !outscraperSql) {
    skip("op-key coverage skipped; a metering migration is not yet present.");
  } else {
    for (const f of OPENROUTER_LIBS) {
      for (const op of extractOpKeys(read(f))) {
        if (!openrouterSql.includes(`'${op}'`)) fail(`openrouter migration missing op '${op}' (from ${f}).`);
      }
    }
    for (const f of OUTSCRAPER_LIBS) {
      for (const op of extractOpKeys(read(f))) {
        if (!outscraperSql.includes(`'${op}'`)) fail(`outscraper migration missing op '${op}' (from ${f}).`);
      }
    }
  }
}

// 4. Every lib coinsPerUnit rate has a matching ceil(<rate> * p_qty)-style
// arm in SQL (approximate text match per rate). SKIP per missing side.
function extractRates(src) {
  const rates = new Set();
  for (const m of src.matchAll(/coinsPerUnit:\s*(\d+(?:\.\d+)?)/g)) rates.add(m[1]);
  return [...rates];
}

function rateCovered(sql, rate) {
  const num = rate.replace(/\.0+$/, "");
  if (new RegExp(`ceil\\s*\\(\\s*${num}(?:\\.0+)?\\s*\\*\\s*p_qty`, "i").test(sql)) return true;
  return sql.includes(`${num} * p_qty`);
}

function checkRates(libs, sql, path, label) {
  const missingLib = libs.find((f) => !exists(f));
  if (missingLib) {
    skip(`${label} rate check skipped; lib not yet present (${missingLib}).`);
    return;
  }
  if (!sql) {
    skip(`${label} rate check skipped; migration not yet present (${path}).`);
    return;
  }
  const rates = new Set();
  for (const f of libs) {
    for (const r of extractRates(read(f))) rates.add(r);
  }
  const mismatches = [...rates].filter((r) => !rateCovered(sql, r));
  if (mismatches.length > 0) {
    fail(`${label} migration missing ceil(<rate> * p_qty) arms for rates: ${mismatches.sort((a, b) => Number(a) - Number(b)).join(", ")}.`);
  }
}

checkRates(OPENROUTER_LIBS, openrouterSql, OPENROUTER_MIGRATION, "openrouter");
checkRates(OUTSCRAPER_LIBS, outscraperSql, OUTSCRAPER_MIGRATION, "outscraper");

console.log(
  `vendor metering integrity OK - openrouter + outscraper metered, 25% included.${skips.length ? ` (${skips.length} skipped)` : ""}`,
);
