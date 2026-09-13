import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { assertPricingInvariants, cleanSquadCap, quoteSquadBudget } from "@/lib/remastery-pricing";


/**
 * POST /api/budgets/squads/quote
 *
 * Pure pricing preview for a squad budget cap — no database reads or writes.
 * Body: { monthlyCapCoins }. Returns the cap priced at 100 coins = $1.00
 * with the 75/25 creator/platform split. Auth is required (spend-adjacent
 * surface), but the result depends only on the pricing module, so reviewers
 * can verify parity without any ledger state.
 */
export async function POST(req: Request) {
  assertPricingInvariants();
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const cap = cleanSquadCap(body?.monthlyCapCoins);
  if (cap < 0) return fail("Invalid cap: whole-coin integer 0..100000000.", 400);
  return ok({ quote: quoteSquadBudget(cap) });
}
