import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const mig = read("../supabase/migrations/20261019000000_crowns_earn_ledger.sql");
const lib = read("../lib/crowns.ts");

// Tables: earn-only ledger + time-locked lots + payout audit, no coin rewrites.
for (const token of [
  "public.crown_ledger",
  "public.crown_lots",
  "public.crown_payouts",
  "public.crown_lot_payouts",
  "unlocks_at",
  "received_at + interval '30 days'",
  "received_at + interval '1 year'",
  "mint_crown",
  "get_my_crown_balances",
  "get_my_eligible_crown_lots",
  "request_crown_payout",
  "clawback_crown",
  "crown_pairing_check",
  "minimum payout is 5000 crowns",
  "insufficient eligible crowns",
]) {
  if (!mig.includes(token)) throw new Error(`Crowns migration missing ${token}.`);
}
// Time-lock invariants must be CHECK constraints, not comments.
if (!mig.includes("unlocks_at = received_at + interval '30 days'"))
  throw new Error("Crown lots must enforce 30-day unlock.");
if (!mig.includes("expires_at = received_at + interval '1 year'"))
  throw new Error("Crown lots must enforce 1-year expiry.");
// No coin-table rewrites: the split is inserts/selects only on coin tables.
if (mig.includes("alter table public.coin_ledger") || mig.includes("alter table public.coin_lots"))
  throw new Error("Crowns migration must never ALTER coin tables.");
// Rerunnable + deny-by-default.
if (!mig.includes("if not exists") || !mig.includes("or replace"))
  throw new Error("Crowns migration must be rerunnable.");
for (const fn of ["mint_crown", "request_crown_payout", "clawback_crown"]) {
  if (!mig.includes(`revoke all on function public.${fn}`))
    throw new Error(`Crowns migration must revoke ${fn}.`);
}
// Earnings reroute: user recipients mint Crowns, clan wallets untouched.
if (!mig.includes("mint_crown(p_recipient_user") || !mig.includes("mint_crown(v_camp.creator_id"))
  throw new Error("Support + launch user earnings must mint Crowns.");
if (!mig.includes("mint_crown(v_owner, v_provider"))
  throw new Error("Compute escrow provider share must mint Crowns.");
if (!mig.includes("clan_wallets"))
  throw new Error("Clan-wallet path must be preserved.");
// No retroactive port: old coin support credits stay as Coins (no SELECT-mint).
if (/insert\s+into\s+public\.crown_(ledger|lots)\s+select/is.test(mig))
  throw new Error("Crowns must not port old coin credits into Crowns.");

// Lib constants mirror the SQL locks.
for (const token of [
  "CROWN_UNLOCK_DAYS = 30",
  "CROWN_EXPIRY_DAYS = 365",
  "CROWN_PAYOUT_MIN = 5000",
  "CROWN_USD_CENTS_EACH = 1",
  "CROWN_CONVERT_MIN = 1",
  "isConvertAmount",
]) {
  if (!lib.includes(token)) throw new Error(`lib/crowns.ts missing ${token}.`);
}

// Convert legality: eligible-only, 1:1, own-account, serialized, audited.
for (const token of [
  "convert_crown_to_coins",
  "public.crown_converts",
  "public.crown_lot_converts",
  "converted_crowns",
  "crown_lots_spent_cap",
  "minimum convert is 1 crown",
  "crowns = coins",
  "Crown convert to Coins",
  "Crown conversion",
  "crown-payout-v1",
  "get_my_crown_converts",
  "crown_converts_without_ledgers",
  "crown_converts_off_par",
]) {
  if (!mig.includes(token)) throw new Error(`Crowns migration missing convert leg ${token}.`);
}
// No second cut on convert: 1:1 par is a CHECK constraint, not a comment.
if (!mig.includes("check (crowns = coins)"))
  throw new Error("Crown converts must enforce 1:1 par.");
if (!mig.includes("revoke all on function public.convert_crown_to_coins"))
  throw new Error("Crowns migration must revoke convert_crown_to_coins.");

console.log("Crowns integrity OK.");
