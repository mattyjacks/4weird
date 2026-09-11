import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const economy = read("../lib/economy.ts");
const signup = read("../app/api/auth/signup/route.ts");
const checkout = read("../app/api/coins/checkout/route.ts");
const edge = read("../supabase/functions/shopify-coins/index.ts");
const pricing = read("../app/pricing/page.tsx");
const daily = read("../app/api/coins/daily/route.ts");
const alpha = read("../app/api/coins/alpha/route.ts");
const referrals = read("../app/api/referrals/route.ts");
const leaderboard = read("../app/api/leaderboard/route.ts");
const mig = read("../supabase/migrations/20260910070000_daily_and_referrals.sql");
const rewardMig = read("../supabase/migrations/20260910200000_alpha_bonus_and_daily_hardening.sql");

// Single source of truth for the coin economy.
if (!economy.includes("SERVICE_CUT_PCT = 25")) throw new Error("Service cut must be 25%.");
if (!economy.includes("TRIAL_COINS_DEFAULT = 100")) throw new Error("Trial default must be 100 coins.");
if (economy.includes("VIBE-COINS-100") || economy.includes('"100"')) throw new Error("No 100-coin pack: 100 coins is the trial.");
for (const pack of ["500", "1500", "5000", "25000"]) {
  if (!economy.includes(`key: "${pack}"`)) throw new Error(`Pack ${pack} missing from economy.`);
}
if (!economy.includes("CUSTOM_COINS_MIN = 500")) throw new Error("Custom minimum must be 500 coins.");

// Trial plumbing honors the constant.
if (!signup.includes("TRIAL_COINS_DEFAULT")) throw new Error("Signup must use the trial constant.");

// Checkout supports custom-amount quantities on the custom variant only.
if (!checkout.includes("COIN_CUSTOM_VARIANT") || !checkout.includes("CUSTOM_COINS_MIN")) throw new Error("Checkout must support custom amounts.");

// Edge function sells the same packs, no legacy SKUs, custom from paid totals.
for (const sku of ["VIBE-COINS-500", "VIBE-COINS-1500", "VIBE-COINS-5000", "VIBE-COINS-25000", "VIBE-COINS-CUSTOM"]) {
  if (!edge.includes(`'${sku}'`) && !edge.includes(`${sku}`)) throw new Error(`Edge function missing ${sku}.`);
}
for (const legacy of ["VIBE-COINS-100", "VIBE-COINS-550", "VIBE-COINS-1300"]) {
  if (edge.includes(legacy)) throw new Error(`Edge function still sells legacy ${legacy}.`);
}

// Pricing page states the $1/25% terms.
if (!pricing.includes("25%") || !pricing.includes("$1.00")) throw new Error("Pricing must state the $1.00 / 25% terms.");

// Feature routes exist and use guarded RPCs, not direct writes.
if (!daily.includes("claim_daily_bonus")) throw new Error("Daily route must use the claim RPC.");
if (!alpha.includes("claim_alpha_tester_bonus") || !alpha.includes("sameOrigin")) throw new Error("Alpha bonus must use a CSRF-protected claim RPC.");
if (!referrals.includes("apply_referral") || !referrals.includes("get_or_create_referral_code")) throw new Error("Referral route must use the referral RPCs.");
if (!leaderboard.includes("leaderboard_top")) throw new Error("Leaderboard must use the leaderboard RPC.");
if (!mig.includes("claim_daily_bonus") || !mig.includes("apply_referral") || !mig.includes("leaderboard_top")) throw new Error("Migration must define the feature RPCs.");
if (!rewardMig.includes("alpha_tester_claims") || !rewardMig.includes("claim_alpha_tester_bonus") || !rewardMig.includes("pg_advisory_xact_lock")) throw new Error("Alpha and daily rewards must be idempotent and race-safe.");

// Centicentcoins fractional spending (0.01 coins = 0.01 cent = $0.0001 USD)
if (!economy.includes("CENTICENTCOINS_PER_COIN = 100")) throw new Error("Centicentcoins must be 100 per coin.");
if (!economy.includes("CENTICENTCOIN_USD = 0.0001")) throw new Error("Centicentcoin USD value must be $0.0001.");
if (!economy.includes("MIN_SPENDABLE_COINS = 0.01")) throw new Error("Minimum spendable coins must be 0.01.");

const fractionalMig = read("../supabase/migrations/20260910180000_fractional_centicentcoins.sql");
if (!fractionalMig.includes("numeric(12, 2)") || !fractionalMig.includes("greatest(0.01")) {
  throw new Error("Fractional migration must support numeric(12, 2) and 0.01 minimum coin spending.");
}

console.log("Economy integrity OK.");
