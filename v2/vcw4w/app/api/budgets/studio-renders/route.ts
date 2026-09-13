import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import {
  assertStudioPricingInvariants,
  cleanStudioRenderSeconds,
  normalizeStudioPreset,
  quoteStudioRender,
} from "@/lib/studio-pricing";


const UUID_RE = /^[0-9a-f-]{36}$/i;
/** Bounded ledger pages so one org with deep history can't burst the route. */
const LEDGER_PAGE_SIZE = 1000;
const LEDGER_MAX_PAGES = 20;

/**
 * GET /api/budgets/studio-renders?seconds=<int>[&preset=<name>][&orgId=<uuid>]
 *
 * Studio cloud-render QUOTE (Remastery Wave-3 economy slice, README §7.3).
 * Pure rate-card math from `@/lib/studio-pricing` (100 coins = exactly
 * $1.00, 75/25 creator/platform included in the listed price, never on top).
 *
 * Invariants preserved:
 * - Read-only: zero INSERT/UPDATE/DELETE/RPC-write calls. With `orgId` the
 *   route READS the paired `org_wallet_ledger` (paged SUM(delta) — the same
 *   ledger every coin movement flows through) for an affordability hint and
 *   nothing else; without `orgId` it touches no tables at all. There is NO
 *   parallel balance column anywhere on this path.
 * - Fail-open: the price quote is public rate-card info, so it is returned
 *   even when Supabase/auth/the ledger read is unavailable (balance fields
 *   come back null with `ledgerUnavailable: true`). A dead backend never
 *   bricks the quote surface.
 * - Login gates the private part only: `orgId` balances require a session
 *   (RLS `wallet_ledger_read` further scopes rows); the bare quote needs
 *   none.
 */
export async function GET(req: Request) {
  assertStudioPricingInvariants();
  const params = new URL(req.url).searchParams;
  const seconds = cleanStudioRenderSeconds(params.get("seconds"));
  if (seconds < 0) return fail("Invalid timeline: seconds must be a whole-second integer.", 400);
  const { preset, estimated } = normalizeStudioPreset(params.get("preset"));

  let quote;
  try {
    quote = quoteStudioRender(seconds, preset);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to quote render.", 400);
  }

  const orgId = (params.get("orgId") ?? "").trim();
  if (!orgId) {
    return ok({
      ...quote,
      quotedFrom: "studio-pricing",
      writes: 0,
    });
  }
  if (!UUID_RE.test(orgId)) return fail("Invalid org.", 400);

  // Private affordability context: login required, ledger READ-ONLY.
  if (!hasServerSupabase()) {
    return ok({ ...quote, quotedFrom: "studio-pricing", writes: 0, orgId, balanceCoins: null, affordable: null, ledgerUnavailable: true });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);

  // Paged SUM(delta) over the paired ledger. RLS `wallet_ledger_read` scopes
  // rows to org.billing.view holders; anything beyond that perm stays
  // invisible by design, never invented. On ANY ledger fault, fail open:
  // the quote still returns with the balance marked unavailable.
  let balanceCoins = 0;
  try {
    for (let page = 0; page < LEDGER_MAX_PAGES; page += 1) {
      const { data: rows, error: ledgerError } = await supabase
        .from("org_wallet_ledger")
        .select("delta")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true })
        .range(page * LEDGER_PAGE_SIZE, (page + 1) * LEDGER_PAGE_SIZE - 1);
      if (ledgerError) throw ledgerError;
      const batch = (rows as { delta: number }[] | null) ?? [];
      for (const row of batch) balanceCoins += Number(row.delta) || 0;
      if (batch.length < LEDGER_PAGE_SIZE) break;
    }
  } catch {
    return ok({
      ...quote,
      quotedFrom: "studio-pricing",
      writes: 0,
      orgId,
      balanceCoins: null,
      affordable: null,
      ledgerUnavailable: true,
    });
  }

  return ok({
    ...quote,
    quotedFrom: "studio-pricing",
    writes: 0,
    orgId,
    balanceCoins,
    affordable: Number.isFinite(balanceCoins) ? balanceCoins >= quote.coins : null,
    ledgerUnavailable: false,
  });
}
