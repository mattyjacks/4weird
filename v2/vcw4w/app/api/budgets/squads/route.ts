import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import {
  assertPricingInvariants,
  cleanSquadCap,
  coinsToUsdCents,
  formatUsdCents,
  quoteSquadBudget,
  splitRevenue,
} from "@/lib/remastery-pricing";


const UUID_RE = /^[0-9a-f-]{36}$/i;
/** Bounded ledger read so one squad with deep history can't burst the route. */
const SPEND_ROWS_CAP = 10_000;

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * GET /api/budgets/squads?orgId=<uuid>
 *
 * Squad budget overview. Squads bill through their org: the cap lives in
 * `org_budgets` (written only via the `set_org_budget` RPC) and spend is
 * SUM(delta) over `org_wallet_ledger` — no parallel balance column. Every
 * figure is priced through `@/lib/remastery-pricing` (100 coins = $1.00,
 * 75/25 creator/platform).
 */
export async function GET(req: Request) {
  assertPricingInvariants();
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);

  const orgId = new URL(req.url).searchParams.get("orgId") ?? "";
  if (!UUID_RE.test(orgId)) return fail("Invalid org.", 400);

  // Membership gate before revealing budget existence/values.
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);

  const { data: budget, error: budgetError } = await supabase
    .from("org_budgets")
    .select("monthly_cap_coins,alert_at_pct,hard_stop,updated_at")
    .eq("org_id", orgId)
    .maybeSingle();
  if (budgetError) return dbFail("GET /api/budgets/squads", budgetError, "Unable to load squad budget.");

  const cap = cleanSquadCap(budget?.monthly_cap_coins ?? 0);
  const quote = quoteSquadBudget(cap < 0 ? 0 : cap);

  // Month-to-date spend straight from the paired ledger (negative deltas).
  const { data: spends, error: spendError } = await supabase
    .from("org_wallet_ledger")
    .select("delta")
    .eq("org_id", orgId)
    .lt("delta", 0)
    .gte("created_at", monthStart())
    .limit(SPEND_ROWS_CAP);
  if (spendError) return dbFail("GET /api/budgets/squads", spendError, "Unable to load squad spend.");
  const rows = (spends as { delta: number }[] | null) ?? [];
  const spentCoins = rows.reduce((sum, r) => sum + Math.abs(Number(r.delta) || 0), 0);
  const remainingCoins = quote.monitoringOnly ? null : Math.max(0, quote.capCoins - spentCoins);

  return ok({
    budget: budget ?? { monthly_cap_coins: 0, alert_at_pct: 80, hard_stop: false },
    quote,
    spentMonthCoins: spentCoins,
    spentMonthUsd: formatUsdCents(coinsToUsdCents(spentCoins)),
    remainingCoins,
    remainingUsd: remainingCoins === null ? null : formatUsdCents(coinsToUsdCents(remainingCoins)),
    spentRowsCapped: rows.length >= SPEND_ROWS_CAP,
  });
}

/**
 * POST /api/budgets/squads
 *
 * Set a squad (org) monthly budget cap. Body: { orgId, monthlyCapCoins,
 * alertAtPct, hardStop }. Validation runs through the pricing module; the
 * write goes through the existing `set_org_budget` RPC (which re-checks
 * `org.billing.manage`), so permission logic stays in one place.
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
  const orgId = typeof body?.orgId === "string" ? body.orgId : "";
  const cap = cleanSquadCap(body?.monthlyCapCoins);
  const alert = Number(body?.alertAtPct);
  const hardStop = Boolean(body?.hardStop);
  if (!UUID_RE.test(orgId)) return fail("Invalid org.", 400);
  if (cap < 0 || !Number.isInteger(alert) || alert < 1 || alert > 100) {
    return fail("Invalid squad budget settings.", 400);
  }

  // Membership pre-check for a clean 403 (the RPC re-checks billing.manage).
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);

  const quote = quoteSquadBudget(cap);
  const { data, error } = await supabase.rpc("set_org_budget", {
    p_org: orgId,
    p_cap: cap,
    p_alert: alert,
    p_hard_stop: hardStop,
  });
  if (error) return dbFail("POST /api/budgets/squads", error, "Unable to save squad budget.");
  return ok({ budget: data, quote, split: splitRevenue(cap) });
}
