// Verifier: unified cosmetics shop + guarded dev charges + monetization policy.
// Static contract checks + REAL execution of lib/cosmetics.ts,
// lib/dev-charges.ts, lib/monetization-policy.ts (transpiled with the repo
// typescript into a temp dir, then asserted under node).
// Run: node scripts/verify-cosmetics.mjs (no keys, no network).
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const fail = (msg) => { console.error(`VERIFY_FAIL: ${msg}`); process.exit(1); };
const assert = (cond, msg) => { if (!cond) fail(msg); };
const has = (file, ...needles) => {
  assert(existsSync(join(root, file)), `missing file ${file}`);
  const src = read(file);
  for (const n of needles) assert(src.includes(n), `${file} missing: ${n}`);
  return src;
};

// 1. Economy fairness rules (single source of truth).
has(
  "lib/economy.ts",
  "COSMETIC_PRICE_COINS = 10", "MAX_SINGLE_PURCHASE_COINS = 10000",
  "DEV_GAME_DAILY_CAP_COINS", "SELLABLE_CATEGORIES", "cleanPurchaseAmount",
);

// 2. Standardized catalog: every look 10 coins, looks-only.
has(
  "lib/cosmetics.ts",
  "COSMETIC_CATALOG", "validateLoadout", "AvatarLoadout", "EMPTY_LOADOUT", "OUTFIT_COLORS",
);

// 3. Dev-charge + policy libs.
has("lib/dev-charges.ts", "isMultiplayerGame", "validateDevCharge", "dailyAllowanceLeft", "cleanIdemKey");
has(
  "lib/monetization-policy.ts",
  "MONETIZATION_PROFILES", "profileForGame", "validateGameMonetization",
  "resolveRegion", "resolveRegionFromHeaders", "checkChargeLegality",
  "CHANCE_BANNED_COUNTRIES", "EU_WAIVER_LINE", "priceLine",
);

// 4. Migration: inventory + loadouts + audited charges + atomic RPCs.
has(
  "supabase/migrations/20260921000000_shop_cosmetics_dev_charges.sql",
  "user_cosmetics", "user_loadouts", "dev_charges",
  "purchase_cosmetic_item", "charge_dev_action",
  "invalid category", "10000",
);

// 5. Routes: catalog / inventory / buy / equip / dev-charges.
has("app/api/cosmetics/catalog/route.ts", "COSMETIC_CATALOG", "priceGuide");
has("app/api/cosmetics/inventory/route.ts", "user_cosmetics", "user_loadouts", "pendingMigration");
has("app/api/cosmetics/buy/route.ts", "acceptedQuote", "purchase_cosmetic_item", "pendingMigration", "already owned", "checkChargeLegality");
has("app/api/cosmetics/equip/route.ts", "validateLoadout", "upsert", "user_loadouts");
has(
  "app/api/dev-charges/route.ts",
  "validateDevCharge", "checkChargeLegality", "dailyAllowanceLeft",
  "charge_dev_action", "acceptedQuote", "duplicate",
);

// 6. Avatar wardrobe rendering + widget shop UI.
has("components/buddy/avatars/parts.ts", "applyCosmetics", "hat-crown", "glasses-shades", "acc-scarf", "fx-sparkles");
has("components/buddy/buddy-avatar.tsx", "loadout", "applyCosmetics", "effectSpin");
has(
  "components/buddy/gaming-buddy.tsx",
  "Wardrobe", "buyCosmetic", "toggleEquip", "/api/cosmetics/buy",
  "/api/cosmetics/equip", "outfitColor", "10 coins",
);

// 7. REAL execution: transpile the pure libs -> temp -> require -> assert.
const tmp = mkdtempSync(join(tmpdir(), "shop-"));
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
assert(existsSync(tscBin), "repo typescript is required to execute pure-module tests");
const { execFileSync } = await import("node:child_process");
execFileSync(process.execPath, [
  tscBin,
  join(root, "lib", "economy.ts"),
  join(root, "lib", "cosmetics.ts"),
  join(root, "lib", "dev-charges.ts"),
  join(root, "lib", "monetization-policy.ts"),
  join(root, "content", "games.ts"),
  "--outDir", tmp, "--module", "commonjs", "--target", "es2020", "--skipLibCheck",
], { cwd: root, stdio: "pipe" });
const need = createRequire(join(root, "scripts", "x.mjs"));
const cosmetics = need(join(tmp, "lib", "cosmetics.js"));
const dev = need(join(tmp, "lib", "dev-charges.js"));
const policy = need(join(tmp, "lib", "monetization-policy.js"));

// Catalog: 24 looks, every one exactly 10 coins, unique well-formed ids.
assert(cosmetics.COSMETIC_CATALOG.length === 24, `catalog must hold 24 items, got ${cosmetics.COSMETIC_CATALOG.length}`);
{
  const ids = new Set();
  for (const c of cosmetics.COSMETIC_CATALOG) {
    assert(c.price === 10, `${c.id} must cost exactly 10 coins`);
    assert(/^[a-z0-9-]{1,32}$/.test(c.id), `bad cosmetic id ${c.id}`);
    assert(!ids.has(c.id), `duplicate cosmetic id ${c.id}`);
    ids.add(c.id);
    assert(["hat", "glasses", "outfit", "accessory", "effect"].includes(c.slot), `bad slot ${c.slot}`);
    assert(c.kinds.length > 0 && c.kinds.every((k) => ["cube", "cloud", "anime"].includes(k)), `bad kinds for ${c.id}`);
  }
}

// Loadout validation: owned+fitting passes; strangers/unknown/misfits fail.
assert(cosmetics.validateLoadout({ hat: "hat-crown" }, ["hat-crown"], "cube").ok === true, "owned fitting hat must equip");
assert(cosmetics.validateLoadout({ hat: "hat-nope" }, ["hat-nope"], "cube").ok === false, "unknown item must fail");
assert(cosmetics.validateLoadout({ hat: "hat-crown" }, [], "cube").ok === false, "unowned item must fail");
assert(cosmetics.validateLoadout({ hat: "hat-viking" }, ["hat-viking"], "cloud").ok === false, "misfit kind must fail");

// Multiplayer detection: tag-driven, unknown fails closed.
assert(dev.isMultiplayerGame("platform-wars") === true, "platform-wars is multiplayer");
assert(dev.isMultiplayerGame("gravegain2d") === false, "gravegain2d is singleplayer");
assert(dev.isMultiplayerGame("no-such-game") === true, "unknown games fail closed to multiplayer");

// Dev charges: bans + caps + consent, all enforced pure.
const quote = "Revive x3 - 90 coins ($0.90)";
const base = { gameSlug: "gravegain2d", amountCoins: 90, label: "Revive x3", idemKey: "abc12345", acceptedQuote: quote, expectedQuote: quote };
assert(dev.validateDevCharge({ ...base, category: "singleplayer-boost" }).ok === true, "singleplayer boost must pass");
assert(dev.validateDevCharge({ ...base, category: "multiplayer-boost" }).ok === false, "multiplayer-boost banned everywhere");
assert(dev.validateDevCharge({ ...base, gameSlug: "platform-wars", category: "singleplayer-boost" }).ok === false, "boosts banned in multiplayer");
assert(dev.validateDevCharge({ ...base, gameSlug: "platform-wars", category: "cosmetic" }).ok === true, "cosmetics fine in multiplayer");
assert(dev.validateDevCharge({ ...base, amountCoins: 10001 }).ok === false, "10k cap enforced");
assert(dev.validateDevCharge({ ...base, acceptedQuote: "tampered" }).ok === false, "consent mismatch rejected");
assert(dev.validateDevCharge({ ...base, idemKey: "x" }).ok === false, "bad idem rejected");
assert(dev.dailyAllowanceLeft(950) === 50, "daily allowance math");

// Policy: profiles, regions, legality gates.
assert(policy.profileForGame("platform-wars") === "cosmetics-only", "multiplayer defaults cosmetics-only");
assert(policy.profileForGame("gravegain2d") === "singleplayer-boosts", "singleplayer allows boosts");
assert(policy.profileForGame("no-such-game") === "cosmetics-only", "unknown fails closed");
assert(policy.resolveRegion("DE", "").class === "EU", "DE is EU");
assert(policy.resolveRegion("US", "NH").class === "US-NH", "NH resolves");
assert(policy.resolveRegion("US", "CA").class === "US", "CA is US");
assert(policy.resolveRegion("GB", "").class === "UK", "GB is UK");
assert(policy.resolveRegion("", "").class === "UNKNOWN", "missing geo is UNKNOWN");
const ctx = (over) => ({ profile: "singleplayer-boosts", audience: "general", kidsMode: false, region: policy.resolveRegion("US", "CA"), category: "singleplayer-boost", chanceBased: false, oddsDisclosed: false, ...over });
assert(policy.checkChargeLegality(ctx({})).ok === true, "plain boost passes");
assert(policy.checkChargeLegality(ctx({ kidsMode: true })).ok === false, "kids blocked");
assert(policy.checkChargeLegality(ctx({ chanceBased: true })).ok === false, "chance needs odds");
assert(policy.checkChargeLegality(ctx({ chanceBased: true, oddsDisclosed: true, region: policy.resolveRegion("BE", "") })).ok === false, "chance banned BE");
assert(policy.checkChargeLegality({ ...ctx({ category: "cosmetic" }), profile: "no-monetization" }).ok === false, "no-monetization sells nothing");
{
  const eu = policy.checkChargeLegality({ ...ctx({ category: "cosmetic" }), profile: "cosmetics-only", region: policy.resolveRegion("FR", "") });
  assert(eu.ok === true && typeof eu.receipt.euWaiver === "string", "EU receipt carries the waiver");
}
assert(policy.validateGameMonetization({ profile: "singleplayer-boosts", multiplayer: true }).ok === false, "upload: multiplayer can't declare boosts");
assert(policy.validateGameMonetization({ profile: "chance-based", multiplayer: false, chanceBased: true, oddsDisclosed: false }).ok === false, "upload: chance needs odds");
assert(policy.validateGameMonetization({ profile: "battle-pass", multiplayer: false, seasonLabel: "" }).ok === false, "upload: pass needs season");
assert(policy.validateGameMonetization({ profile: "cosmetics-only", multiplayer: true }).ok === true, "upload: multiplayer cosmetics-only passes");
assert(policy.priceLine(10) === "10 coins ($0.10)", "price line format");

console.log("VERIFY_OK: unified cosmetics shop (24 x 10c) + guarded dev charges + universal monetization policy; static + executed pure tests pass.");
