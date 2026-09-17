import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";


/**
 * GET /api/openrouter-vendor/usage; the caller's OpenRouter spend rollup.
 * Auth: Supabase login session (same gate as GET /api/my/usage). Reads are
 * free: no metering, no coin movement on this route.
 *
 * Calls the my_openrouter_usage() SECURITY DEFINER RPC (sibling-agent
 * migration; may not exist yet) and passes its { total, byOp, byGame,
 * recent } JSON through with a vendor tag. RPC/thrown errors go to dbFail
 * (stable JSON, never an uncaught 500).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  // This response is scoped to auth.uid() (the parent when both cookies are
  // present). Do not reveal the parent's OpenRouter usage under a child login.
  if (req.headers.get("cookie")?.split(";").some((part) => part.trim().split("=", 1)[0] === "kid_session")) {
    return fail("OpenRouter usage is unavailable during a child session.", 403);
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);

  try {
    // Cast: my_openrouter_usage lands via a sibling migration and is not in
    // the generated RPC type union yet; at runtime the literal name is sent.
    const { data: rollup, error } = await supabase.rpc(
      "my_openrouter_usage" as "my_fal_usage",
    );
    if (error) return dbFail("api/openrouter-vendor/usage", error, "Unable to load usage.");
    const r = (rollup ?? {}) as Record<string, unknown>;
    const t = (r.total ?? {}) as {
      gross?: unknown;
      cut?: unknown;
      provider?: unknown;
      charges?: unknown;
    };
    return ok({
      vendor: "openrouter",
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
    return dbFail("api/openrouter-vendor/usage", error, "Unable to load usage.");
  }
}
