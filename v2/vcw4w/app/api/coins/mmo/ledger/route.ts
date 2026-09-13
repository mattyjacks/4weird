import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { clampLimit } from "@/lib/validate";
import { cleanMatchId } from "@/lib/mmo-meter-quote";

/** Escape PostgREST LIKE wildcards so a match id can only match itself. */
function escapeIlikeLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * GET /api/coins/mmo/ledger?matchId=<server-or-match-id>[&limit=<n>]
 *
 * Per-match charge history (economy lane, DS-MMO-05). Reads the caller's
 * OWN `coin_ledger` rows for one match: DS-MMO-14's landed
 * `settle_mmo_minute()` RPC (DONE) writes reasons
 * `MMO minute <match>#<minute>` (player debit) and
 * `MMO host payout <match>#<minute>` (host credit), so filtering on the
 * `<match>` substring returns both legs of every settled minute the caller
 * took part in (debit when they played, credit when they hosted).
 *
 * - Login required: rows are scoped to the caller by RLS
 *   (`coin_ledger_select_own`) — a player sees only their own charges.
 * - READ-ONLY: SELECTs only. Zero INSERT/UPDATE/DELETE/RPC-write calls.
 *   All coin writes belong to DS-MMO-14; this route converges retries by
 *   reading, never by repairing.
 * - No balance column is invented: totals below are SUM(delta) over the
 *   returned ledger rows only (the same ledger every coin movement flows
 *   through). Deltas are numeric(12,2) coins (centicentcoin precision).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Authentication required.", 401);

  const params = new URL(req.url).searchParams;
  const matchId = cleanMatchId(params.get("matchId"));
  if (!matchId) return fail("Valid matchId required.", 400);
  const limit = clampLimit(params.get("limit"), 25, 100);

  const tag = escapeIlikeLiteral(matchId);
  const { data, error } = await supabase
    .from("coin_ledger")
    .select("id,delta,reason,created_at")
    .eq("user_id", user.id)
    .ilike("reason", `%${tag}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return dbFail("api/coins/mmo/ledger", error, "Unable to load match charges.");

  const rows = (
    (data as { id: string; delta: number | string; reason: string; created_at: string }[] | null) ?? []
  ).map((row) => ({ ...row, delta: Number(row.delta) || 0 }));
  const chargedCoins = Math.round(rows.reduce((sum, r) => sum + Math.min(0, r.delta), 0) * 100) / 100;
  const creditedCoins = Math.round(rows.reduce((sum, r) => sum + Math.max(0, r.delta), 0) * 100) / 100;

  return ok({ matchId, rows, rowCount: rows.length, chargedCoins, creditedCoins });
}
