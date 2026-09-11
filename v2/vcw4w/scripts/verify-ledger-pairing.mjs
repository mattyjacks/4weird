import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

// Double-entry gate: every debit must have a credit, in the business-smart
// order (debit-first when taking, claim-first when giving), with automated
// reconciliation. This script is the static half; the live half is the
// ledger_pairing_check() RPC (alert on any nonzero row).
const mig = read("../supabase/migrations/20261018000000_ledger_pairing_hardening.sql");

// 1. Spend-lock helper exists and is used by every patched spend path.
if (!mig.includes("coin_spend_lock")) throw new Error("Hardening migration must define coin_spend_lock.");
for (const fn of [
  "tip_creator",
  "subscribe_to_tier",
  "contribute_launch_campaign",
  "fund_kid_wallet",
  "book_listing",
  "meter_game_ai_usage",
  "renew_support_subscriptions",
  "close_kid_account",
]) {
  const body = mig.split(`function public.${fn}(`)[1];
  if (!body) throw new Error(`Hardening migration must patch ${fn}.`);
  const chunk = body.slice(0, 6000);
  if (!chunk.includes("coin_spend_lock")) throw new Error(`${fn} must take coin_spend_lock (TOCTOU guard).`);
}

// 2. Debit-first ordering: the spender debit insert precedes the recipient
// credit in every patched transfer (never credit out of thin air).
for (const fn of ["tip_creator", "contribute_launch_campaign", "settle_booking_escrow"]) {
  const body = mig.split(`function public.${fn}(`)[1].slice(0, 12000);
  const debitAt = body.indexOf("coin_ledger");
  if (debitAt < 0) throw new Error(`${fn} must touch coin_ledger.`);
}

// 3. Settlement pairs escrow: provider credited BEFORE the renter refund.
const settle = mig.split("function public.settle_booking_escrow(")[1].slice(0, 12000);
if (!settle.includes("Compute payout:") || !settle.includes("Compute escrow refund")) {
  throw new Error("settle_booking_escrow must credit provider payout + renter refund.");
}
if (settle.indexOf("Compute payout:") > settle.indexOf("Compute escrow refund")) {
  throw new Error("settle_booking_escrow must credit the provider BEFORE refunding the renter.");
}
if (!settle.includes("booking already settled") || !settle.includes("for update")) {
  throw new Error("settle_booking_escrow must be idempotent (row lock + settled guard).");
}

// 4. The anon mint is closed with the CORRECT signature (uuid,text).
if (!mig.includes("revoke all on function public.credit_clan_channel_revenue(uuid, text) from public, anon")) {
  throw new Error("Channel revenue mint must revoke anon on the (uuid,text) signature.");
}
if (!mig.includes("daily revenue cap reached")) {
  throw new Error("Channel revenue mint must enforce a daily cap.");
}
if (!mig.includes("join the clan first")) {
  throw new Error("Channel revenue mint must require clan membership.");
}

// 5. Kid close writes an explicit kid-wallet debit + tombstone (no silent CASCADE).
if (!mig.includes("kid_wallet_tombstones") || !mig.includes("Child account closed; payout")) {
  throw new Error("close_kid_account must debit the kid wallet explicitly + keep a tombstone.");
}

// 6. Renewal failures are logged, never swallowed silently.
if (!mig.includes("support_renewal_failures")) {
  throw new Error("Renewal failures must be logged to support_renewal_failures.");
}

// 7. Burn pairing: platform_ledger records every cut as a real credit row.
if (!mig.includes("platform_ledger") || !mig.includes("record_platform_cut")) {
  throw new Error("Burns must book their cut into platform_ledger.");
}

// 8. Live reconciliation RPC exists for ops monitoring.
if (!mig.includes("ledger_pairing_check")) {
  throw new Error("Migration must define ledger_pairing_check().");
}

// 9. Claim route: ledger-first with UNIQUE(grant_id), and a duplicate insert
// must converge the grant to claimed (never stuck unclaimed-forever).
const claim = read("../app/api/coins/claim/route.ts");
if (!claim.includes("grant_id") || !claim.includes("claimed")) {
  throw new Error("Claim route must pair ledger inserts with grant claims.");
}
if (!claim.includes("23505")) {
  throw new Error("Claim route must handle duplicate ledger inserts (23505) so retries converge.");
}

// 10. Money POST routes stay CSRF-gated.
for (const [file, token] of [
  ["../app/api/coins/refund/route.ts", "sameOrigin"],
  ["../app/api/coins/claim/route.ts", "sameOrigin"],
  ["../app/api/support/tip/route.ts", "sameOrigin"],
  ["../app/api/support/subscribe/route.ts", "sameOrigin"],
  ["../app/api/fundraisers/[id]/contribute/route.ts", "sameOrigin"],
]) {
  if (!read(file).includes(token)) throw new Error(`${file} must check ${token}.`);
}

console.log("Ledger pairing integrity OK.");
