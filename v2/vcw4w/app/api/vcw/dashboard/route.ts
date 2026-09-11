import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { gameSlugs } from "@/content/games";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/dashboard — consolidated agent view (authenticated).
 * The v1 worker's `GET /api/dashboard` equivalent: service state,
 * recent runs, and recent bugs in one call.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:dashboard:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const base = (process.env.VCW_SERVICE_URL ?? "").replace(/\/$/, "");
  let service = "unconfigured";
  try {
    const target = new URL(`${base}/health`);
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("bad protocol");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(target, { signal: controller.signal, cache: "no-store" });
      await response.arrayBuffer().catch(() => null);
      service = response.ok ? "ok" : "degraded";
    } catch {
      service = "unavailable";
    } finally {
      clearTimeout(timer);
    }
  } catch {
    service = "unconfigured";
  }

  const [{ data: runs, error: runsError }, { data: bugs, error: bugsError }] = await Promise.all([
    supabase
      .from("vcw_runs")
      .select("id,game_slug,goal,status,verdict,created_at,updated_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("vcw_bugs")
      .select("id,run_id,game_slug,title,severity,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (runsError) return dbFail("vcw/dashboard runs", runsError, "Unable to load the dashboard.");
  if (bugsError) return dbFail("vcw/dashboard bugs", bugsError, "Unable to load the dashboard.");

  return ok({
    service,
    catalog_games: gameSlugs.length,
    runs: runs ?? [],
    bugs: bugs ?? [],
  });
}
