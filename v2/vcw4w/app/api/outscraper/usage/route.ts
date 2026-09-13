import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";


/**
 * GET /api/outscraper/usage; the caller's Outscraper spend rollup.
 * Auth: Supabase login session (same gate as GET /api/my/usage). Reads are
 * free: no metering, no coin movement on this route.
 *
 * Calls the my_outscraper_usage() SECURITY DEFINER RPC (sibling-agent
 * migration; may not exist yet) and passes its { total, byOp, byGame,
 * recent } JSON through with a vendor tag. RPC/thrown errors go to dbFail
 * (stable JSON, never an uncaught 500).
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);

  try {
    // Cast: my_outscraper_usage lands via a sibling migration and is not in
    // the generated RPC type union yet; at runtime the literal name is sent.
    const { data: rollup, error } = await supabase.rpc(
      "my_outscraper_usage" as "my_fal_usage",
    );
    if (error) return dbFail("api/outscraper/usage", error, "Unable to load usage.");
    const r = (rollup ?? {}) as Record<string, unknown>;
    const t = (r.total ?? {}) as {
      gross?: unknown;
      cut?: unknown;
      provider?: unknown;
      charges?: unknown;
    };
    return ok({
      vendor: "outscraper",
      total: {
        gross: Number(t.gross) || 0,
        cut: Number(t.cut) || 0,
        provider: Number(t.provider) || 0,
        charges: Number(t.charges) || 0,
      },
      byOp: Array.isArray(r.byOp) ? r.byOp : [],
      byGame: Array.isArray(r.byGame) ? r.byGame : [],
      recent: Array.isArray(r.recent) ? r.recent : [],
    });
  } catch (error) {
    return dbFail("api/outscraper/usage", error, "Unable to load usage.");
  }
}
