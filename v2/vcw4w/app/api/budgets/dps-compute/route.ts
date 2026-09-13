import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { assertPricingInvariants, COINS_PER_USD } from "@/lib/remastery-pricing";
import { quoteDpsCompute } from "@/lib/dps-pricing";


/**
 * GET /api/budgets/dps-compute?taskType=<type>&seconds=<duration>
 *
 * DPS compute QUOTE (Remastery Wave 2 economy slice, README §3.4 Feature 04).
 * Prices one DonatePersonalSeconds task execution PURELY through
 * `@/lib/dps-pricing` (100 coins = exactly $1.00, 75/25 donor/platform
 * included in the listed price, never on top) and pairs it with a
 * read-only ledger balance for the caller — so the reviewer sees both the
 * price and whether the wallet covers it.
 *
 * Response: { success, taskType, coinsCost, usdEquivalent,
 * donorShareCoins, platformShareCoins } plus envelope aliases
 * (coins, creatorCoins, platformCoins) and quote context
 * (secondsBilled, usdCents, balanceCoins, quotedFrom).
 *
 * Invariants preserved:
 * - Read-only: zero INSERT/UPDATE/DELETE/RPC-write calls. The only ledger
 *   touch is the read-only `get_my_coin_balance` RPC (SUM(delta) for the
 *   caller, same source as /api/coins/balance). `game_saves` is never
 *   touched, so the cheated-save invariant holds trivially. There is NO
 *   parallel balance column anywhere on this path.
 * - No age-band bypass: login gates the ledger-balance half of the read,
 *   and kids-mode page gating (`lib/age-gate.ts`) stays authoritative for
 *   who may open compute surfaces at all.
 * - Fail-open (README §1.2 axiom 3): the pure quote never depends on the
 *   database — if Supabase is unconfigured, the caller is anonymous, or
 *   the ledger read fails, the route still returns the quote with
 *   `balanceCoins: null` instead of bricking.
 */
export async function GET(req: Request) {
  assertPricingInvariants();

  const params = new URL(req.url).searchParams;
  let quote;
  try {
    quote = quoteDpsCompute(params.get("taskType") ?? "", params.get("seconds") ?? "");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Invalid compute quote.", 400);
  }

  // Ledger-balance half: best-effort read-only context, never a gate on
  // the quote itself (fail-open). Never logged: balances stay server-side.
  let balanceCoins: number | null = null;
  let authenticated = false;
  if (hasServerSupabase()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      authenticated = true;
      const { data, error } = await supabase.rpc("get_my_coin_balance");
      if (error) return dbFail("GET /api/budgets/dps-compute", error, "Unable to read wallet balance.");
      const raw = Number(data);
      balanceCoins = data !== null && Number.isFinite(raw) ? raw : null;
    }
  }

  return ok({
    taskType: quote.taskType,
    coinsCost: quote.coinsCost,
    /** Envelope alias: gross whole-coin price. */
    coins: quote.coinsCost,
    usdEquivalent: quote.usdEquivalent,
    usdCents: quote.usdCents,
    donorShareCoins: quote.donorShareCoins,
    /** Envelope alias: donor == creator/provider side of the 75/25 split. */
    creatorCoins: quote.donorShareCoins,
    platformShareCoins: quote.platformShareCoins,
    /** Envelope alias. */
    platformCoins: quote.platformShareCoins,
    secondsBilled: quote.secondsBilled,
    requestedTaskType: quote.requestedTaskType,
    taskTypeFallback: quote.taskTypeFallback,
    coinsPerUsd: COINS_PER_USD,
    balanceCoins,
    authenticated,
    quotedFrom: "dps-pricing+coin_ledger",
  });
}
