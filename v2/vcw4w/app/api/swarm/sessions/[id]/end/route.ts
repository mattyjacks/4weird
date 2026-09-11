import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** POST /api/swarm/sessions/[id]/end; retire a hired swarm. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`swarm:end:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid session id.", 400);
  try {
    const { data: row, error } = await supabase
      .from("swarm_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", data.user.id)
      .eq("status", "open")
      .select("id,name,status,turns,gross_coins,ended_at")
      .maybeSingle();
    if (error) return dbFail("api/swarm/end", error, "Unable to end the swarm.");
    if (!row) return fail("Swarm not found or already ended.", 404);
    return ok({ session: row });
  } catch (error) {
    return dbFail("api/swarm/end", error, "Unable to end the swarm.");
  }
}
