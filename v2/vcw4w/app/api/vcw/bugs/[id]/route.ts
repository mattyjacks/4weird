import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isRunUuid } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/vcw/bugs/[id]; retract one of the caller's bug filings
 * (authenticated, owner only).
 *
 * Misfiled reports happen (wrong slug, duplicated finding, pasted secret
 * in the description). Retraction deletes the bug row; the coin ledger is
 * untouched by design — the filing fee already moved through
 * meter_vcw_usage and stays auditable in /api/coins/history, exactly like
 * a refunded pack keeps its receipt. Handoffs already generated keep
 * their markdown snapshot (they are point-in-time briefs, not live views).
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid bug id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:bugs:delete:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const { data: bug, error } = await supabase
    .from("vcw_bugs")
    .delete()
    .eq("id", id)
    .eq("user_id", data.user.id)
    .select("id")
    .single();
  if (error) return dbFail("vcw/bugs retract", error, "Unable to retract the bug.");
  if (!bug) return fail("Bug not found.", 404);
  return ok({ retracted: bug.id });
}
