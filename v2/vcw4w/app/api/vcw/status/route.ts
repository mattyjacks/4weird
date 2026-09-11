import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { gameSlugs } from "@/content/games";
import { FAL_FAST_OPS, FAL_OPS, VCW_FAL_HOWTO, falConfigured, falOpsForVcwPhase } from "@/lib/fal";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/status; agent control-plane status (authenticated).
 *
 * The v1 worker's `GET /api/status` equivalent for the cloud API: service
 * health (same coarse probe as /api/vcw/health, never forwards upstream
 * bodies), catalog size, and the caller's own run/bug counts. Proves the
 * agent loop is usable before a run starts.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:status:${data.user.id}`, 60, 60_000);
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

  const [{ count: runCount, error: runError }, { count: bugCount, error: bugError }] = await Promise.all([
    supabase.from("vcw_runs").select("id", { count: "exact", head: true }).eq("user_id", data.user.id),
    supabase.from("vcw_bugs").select("id", { count: "exact", head: true }).eq("user_id", data.user.id),
  ]);
  if (runError) return dbFail("vcw/status runs", runError, "Unable to load run status.");
  if (bugError) return dbFail("vcw/status bugs", bugError, "Unable to load run status.");

  return ok({
    service,
    catalog_games: gameSlugs.length,
    runs: runCount ?? 0,
    bugs: bugCount ?? 0,
    fal_ops: FAL_OPS.length,
    fal_configured: falConfigured(),
    fal_studio: "/fal",
    fal_fast_ops: FAL_FAST_OPS,
    fal_by_phase: {
      observe: falOpsForVcwPhase("observe"),
      reason: falOpsForVcwPhase("reason"),
      act: falOpsForVcwPhase("act"),
    },
    fal_howto: VCW_FAL_HOWTO,
    swarm: { tools: ["vcw.open_run", "vcw.file_finding", "fal.generate", "deepseek.orchestrate", "swarm.delegate"], hint: "Plan multi-agent QA with POST /api/swarm/sessions + /chat (auto/lead/round-robin); NewGamePlus fans out the same way." },
    filters: {
      runs: "GET /api/vcw/runs?game_slug=&status=open|completed&limit=1..100&before=<ISO>",
      bugs: "GET /api/vcw/bugs?severity=&game_slug=&run_id=&limit=1..100&before=<ISO>",
      run_detail: "GET /api/vcw/runs/[id]?steps_limit=1..200&bugs_limit=1..100",
    },
  });
}
