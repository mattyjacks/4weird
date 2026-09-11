import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isRunUuid, isVcwVerdict } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/runs/[id]/complete; close an open run with a summary
 * (authenticated, owner only).
 *
 * Body: { summary, verdict: pass|fail|inconclusive }.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid run id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:run:complete:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (!isVcwVerdict(input.verdict)) {
    return fail("Invalid verdict. Use pass, fail, or inconclusive.", 400);
  }
  const summary = String(input.summary ?? "").trim().slice(0, 5000);
  if (!summary) return fail("A summary is required (1-5000 chars).", 400);

  const { data: run, error } = await supabase
    .from("vcw_runs")
    .update({ status: "completed", verdict: input.verdict, summary })
    .eq("id", id)
    .eq("user_id", data.user.id)
    .eq("status", "open")
    .select("id,game_slug,goal,status,verdict,summary,created_at,updated_at")
    .single();
  if (error) return dbFail("vcw/run complete", error, "Unable to complete the run.");
  if (!run) return fail("Run not found or already completed.", 404);
  return ok({ run });
}
