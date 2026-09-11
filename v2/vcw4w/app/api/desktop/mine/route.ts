import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive } from "@/lib/compute";

export const dynamic = "force-dynamic";

type DesktopRow = {
  id: string;
  pod_id: string;
  kind: string;
  interface: string;
  endpoint_url: string;
  gpu_id: string;
  cpu_id: string;
  image: string;
  hourly_usd: number;
  status: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  warn_chimed_at: string | null;
  warn_minutes: number | null;
  stop_grace_minutes: number | null;
  terminate_hours: number | null;
};

/** GET /api/desktop/mine; your Virtual Desktops with live pod status,
 * container image, last activity, and per-pod idle overrides. Only rows
 * you created (desktop_pods.user_id) are ever returned. */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`desktop:mine:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Desktop lookup unavailable.", 503);
  }
  const { data: rows, error } = await svc
    .from("desktop_pods")
    .select(
      "id,pod_id,kind,interface,endpoint_url,gpu_id,cpu_id,image,hourly_usd,status,created_at,updated_at,last_activity_at,warn_chimed_at,warn_minutes,stop_grace_minutes,terminate_hours",
    )
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return dbFail("GET /api/desktop/mine", error, "Unable to list desktops.");
  const desktops = (rows ?? []) as DesktopRow[];
  // Best-effort liveness: a failed probe leaves podStatus null (never proof).
  const withLive = await Promise.all(
    desktops.map(async (d) => {
      let podStatus: string | null = null;
      if (d.pod_id && d.status !== "deleted" && d.status !== "terminated") {
        const live = await getPodLive(d.pod_id);
        if (live.ok) podStatus = live.status;
      }
      return {
        id: d.id,
        podId: d.pod_id || null,
        kind: d.kind,
        interface: d.interface,
        endpointUrl: d.endpoint_url || null,
        gpu: d.gpu_id || null,
        cpu: d.cpu_id || null,
        image: d.image || null,
        hourlyUsd: Number(d.hourly_usd) || 0,
        status: d.status,
        podStatus,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        lastActivityAt: d.last_activity_at,
        warnChimedAt: d.warn_chimed_at,
        policy: {
          warnMinutes: d.warn_minutes,
          stopGraceMinutes: d.stop_grace_minutes,
          terminateHours: d.terminate_hours,
        },
      };
    }),
  );
  return ok({ desktops: withLive });
}
