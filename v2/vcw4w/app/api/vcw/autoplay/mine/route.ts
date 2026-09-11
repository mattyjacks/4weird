import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/autoplay/mine; YOUR autoplay remotes with live pod status.
 * Only rows you created (vcw_autoplay_remotes.user_id) are ever returned —
 * the dashboard merges these with desktops / rentals / renders.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:autoplay-mine:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Autoplay lookup unavailable.", 503);
  }
  const { data: rows, error } = await svc
    .from("vcw_autoplay_remotes")
    .select(
      "id,pod_id,game_slug,compute,site_mode,endpoint_url,gpu_id,cpu_id,image,hourly_usd,status,created_at,last_activity_at,warn_chimed_at",
    )
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return dbFail("GET /api/vcw/autoplay/mine", error, "Unable to list autoplay remotes.");
  const remotes = ((rows ?? []) as Record<string, unknown>[]);
  const withLive = await Promise.all(
    remotes.map(async (r) => {
      let podStatus: string | null = null;
      const podId = String(r.pod_id ?? "");
      const status = String(r.status ?? "");
      if (podId && status !== "deleted" && status !== "terminated") {
        const live = await getPodLive(podId);
        if (live.ok) podStatus = live.status;
      }
      return {
        id: String(r.id ?? ""),
        podId: podId || null,
        gameSlug: String(r.game_slug ?? ""),
        compute: String(r.compute ?? ""),
        siteMode: String(r.site_mode ?? ""),
        endpointUrl: String(r.endpoint_url ?? "") || null,
        gpu: String(r.gpu_id ?? "") || null,
        cpu: String(r.cpu_id ?? "") || null,
        image: String(r.image ?? "") || null,
        hourlyUsd: Number(r.hourly_usd) || 0,
        status,
        podStatus,
        createdAt: String(r.created_at ?? ""),
        lastActivityAt: (r.last_activity_at as string | null) ?? null,
        warnChimedAt: (r.warn_chimed_at as string | null) ?? null,
      };
    }),
  );
  return ok({ remotes: withLive });
}
