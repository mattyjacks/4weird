import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import {
  assertPricingInvariants,
  coinsToUsdCents,
  formatUsdCents,
  MAX_SQUAD_BUDGET_CAP_COINS,
  USD_CENTS_PER_COIN,
} from "@/lib/remastery-pricing";


const UUID_RE = /^[0-9a-f-]{36}$/i;
/** Bounded ledger pages so one org with deep history can't burst the route. */
const LEDGER_PAGE_SIZE = 1000;
const LEDGER_MAX_PAGES = 20;
/** Bounded team-attribution read for the month-to-date spend context. */
const CUTS_ROW_CAP = 1000;
/** Bounded roster read for the member-count context. */
const ROSTER_ROW_CAP = 1000;

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * GET /api/budgets/squad-pools?squadId=<team uuid>
 *
 * Squad pooled-balance QUOTE (Remastery Wave 1 economy slice, README §4.1).
 * Squads are invite-only private workspaces (`teams` + `team_members`); the
 * shared pool backing a squad is the org wallet, so the balance is
 * SUM(delta) over the paired `org_wallet_ledger` for the squad's org —
 * the same ledger every coin movement flows through (LANES.md coin-table
 * rules). There is NO parallel balance column anywhere on this path:
 * `org_wallets.balance_cached` is never read and nothing is written.
 *
 * Pricing runs through `@/lib/remastery-pricing` (100 coins = exactly
 * $1.00, 75/25 creator/platform included in listed prices, never on top).
 *
 * Invariants preserved:
 * - Read-only: zero INSERT/UPDATE/DELETE/RPC-write calls. The cheated-save
 *   invariant holds trivially — `game_saves` is never touched.
 * - No age-band bypass is introduced: login + invite-only squad membership
 *   gate the read, and kids-mode page gating (`lib/age-gate.ts`) stays
 *   authoritative for who may open squad surfaces at all.
 */
export async function GET(req: Request) {
  assertPricingInvariants();
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);

  const squadId = new URL(req.url).searchParams.get("squadId") ?? "";
  if (!UUID_RE.test(squadId)) return fail("Invalid squad.", 400);

  // Invite-only membership gate before revealing pool existence/values.
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", squadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this squad.", 403);

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id,org_id")
    .eq("id", squadId)
    .maybeSingle();
  if (teamError) return dbFail("GET /api/budgets/squad-pools", teamError, "Unable to load squad.");
  if (!team) return fail("Squad not found.", 404);
  const orgId = (team as { org_id: string }).org_id;

  // Pooled balance QUOTE: paged SUM(delta) over the paired ledger.
  // (RLS `wallet_ledger_read` scopes rows to org.billing.view holders;
  // anything beyond that perm stays invisible by design, never invented.)
  let balanceCoins = 0;
  let ledgerRows = 0;
  let balanceRowsCapped = false;
  for (let page = 0; page < LEDGER_MAX_PAGES; page += 1) {
    const { data: rows, error: ledgerError } = await supabase
      .from("org_wallet_ledger")
      .select("delta")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true })
      .range(page * LEDGER_PAGE_SIZE, (page + 1) * LEDGER_PAGE_SIZE - 1);
    if (ledgerError)
      return dbFail("GET /api/budgets/squad-pools", ledgerError, "Unable to quote squad pool.");
    const batch = (rows as { delta: number }[] | null) ?? [];
    ledgerRows += batch.length;
    for (const row of batch) balanceCoins += Number(row.delta) || 0;
    if (batch.length < LEDGER_PAGE_SIZE) break;
    if (page === LEDGER_MAX_PAGES - 1) balanceRowsCapped = true;
  }

  // Parity surfacing: 100 coins = exactly $1.00 (1 coin = 1 cent, no float).
  const wholeCoins =
    Number.isInteger(balanceCoins) && balanceCoins >= 0 && balanceCoins <= MAX_SQUAD_BUDGET_CAP_COINS;
  const usdCents = wholeCoins
    ? coinsToUsdCents(balanceCoins)
    : Math.round(balanceCoins * USD_CENTS_PER_COIN);

  // Team-attributed month-to-date compute spend (paired cut ledger context).
  const { data: cuts, error: cutsError } = await supabase
    .from("platform_compute_cuts")
    .select("gross_coins")
    .eq("team_id", squadId)
    .gte("created_at", monthStart())
    .limit(CUTS_ROW_CAP);
  if (cutsError)
    return dbFail("GET /api/budgets/squad-pools", cutsError, "Unable to load squad spend.");
  const cutRows = (cuts as { gross_coins: number }[] | null) ?? [];
  const spentMonthCoins = cutRows.reduce((sum, r) => sum + (Number(r.gross_coins) || 0), 0);

  // Roster size context (RLS `team_members_read` scopes to team viewers).
  const { data: roster, error: rosterError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", squadId)
    .limit(ROSTER_ROW_CAP);
  if (rosterError)
    return dbFail("GET /api/budgets/squad-pools", rosterError, "Unable to load squad roster.");

  return ok({
    squadId,
    balanceCoins,
    usdEquivalent: formatUsdCents(usdCents),
    usdCents,
    quotedFrom: "org_wallet_ledger",
    members: ((roster as { user_id: string }[] | null) ?? []).length,
    spentMonthCoins,
    spentMonthUsd: formatUsdCents(
      Number.isInteger(spentMonthCoins) && spentMonthCoins >= 0 && spentMonthCoins <= MAX_SQUAD_BUDGET_CAP_COINS
        ? coinsToUsdCents(spentMonthCoins)
        : Math.round(spentMonthCoins * USD_CENTS_PER_COIN),
    ),
    ledgerRows,
    balanceRowsCapped,
  });
}
