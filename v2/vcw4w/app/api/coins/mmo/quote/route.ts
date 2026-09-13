import { fail, ok } from "@/lib/api-respond";
import { quoteMeter } from "@/lib/mmo-meter-quote";

/**
 * GET /api/coins/mmo/quote?serverCostPerMin=<ccc>&players=<n>
 *   [&dustCarry=<ccc>][&hostFree=true][&minutes=<n>]
 *
 * Per-minute coin metering QUOTE (economy lane, DS-MMO-05). Pure estimator:
 * per-minute share = serverCostPerMin / N players present, integer
 * centicentcoin math with floor 1, dust carry-forward, and 75/25 split
 * reporting with the 25% platform cut INCLUDED in every gross.
 *
 * - Public (no login): quotes carry no balances and touch no tables, so the
 *   server browser can show live per-minute prices to logged-out visitors.
 * - Read-only: zero DB calls, zero ledger writes. All coin writes belong to
 *   DS-MMO-14's settlement path; this route never mints, moves, or burns.
 * - Inputs are sanitized by `quoteMeter` (fail-open: garbage params quote
 *   as 0, never 500). `serverCostPerMin` is caller-supplied until the
 *   DS-MMO-10 `mmo_servers` rate column lands — this route reads no
 *   unlanded tables on purpose.
 * - Units: integer centicentcoins everywhere (100 = 1 Vibe Coin = $0.01;
 *   100 coins = exactly $1.00). No balance column exists or is implied.
 */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const quote = quoteMeter({
      serverCostPerMin: params.get("serverCostPerMin"),
      playerCount: params.get("players") ?? params.get("playerCount"),
      hostFree: params.get("hostFree") === "true" || params.get("hostFree") === "1",
      dustCarry: params.get("dustCarry"),
      minutes: params.get("minutes"),
    });
    return ok({ ...quote });
  } catch {
    return fail("Unable to quote meter.", 500);
  }
}
