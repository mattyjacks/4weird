import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive } from "@/lib/compute";

export const dynamic = "force-dynamic";

// Full column set, including the idle-lifecycle columns
// (last_activity_at, warn_*, terminate_hours, image) added by a later
// migration. BASE_COLUMNS mirrors the original desktop_pods migration so a
// database that predates the idle-lifecycle migration still returns rows
// instead of 500ing the whole dashboard lane.
const FULL_COLUMNS =
  "id,pod_id,kind,interface,endpoint_url,gpu_id,cpu_id,image,hourly_usd,status,created_at,updated_at,last_activity_at,warn_chimed_at,warn_minutes,stop_grace_minutes,terminate_hours";
const BASE_COLUMNS =
  "id,pod_id,kind,interface,endpoint_url,gpu_id,cpu_id,hourly_usd,status,created_at,updated_at";

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
  try {
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
    let rows: DesktopRow[] | null = null;
    let queryError: unknown = null;
    const full = await svc
      .from("desktop_pods")
      .select(FULL_COLUMNS)
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!full.error) {
      rows = (full.data ?? []) as DesktopRow[];
    } else {
      queryError = full.error;
      // Column drift (older DB without the idle-lifecycle columns): retry
      // with the base columns rather than failing the whole lane.
      const base = await svc
        .from("desktop_pods")
        .select(BASE_COLUMNS)
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!base.error) {
        rows = (base.data ?? []) as DesktopRow[];
        queryError = null;
      }
    }
    if (queryError || !rows) return dbFail("GET /api/desktop/mine", queryError, "Unable to list desktops.");
    // Best-effort liveness: a failed probe leaves podStatus null (never proof).
    // Each probe is guarded so one bad pod can never fail the whole lane.
    const withLive = await Promise.all(
      rows.map(async (d) => {
        let podStatus: string | null = null;
        if (d.pod_id && d.status !== "deleted" && d.status !== "terminated") {
          try {
            const live = await getPodLive(d.pod_id);
            if (live.ok) podStatus = live.status;
          } catch {
            // Probe failure leaves podStatus null.
          }
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
          lastActivityAt: d.last_activity_at ?? null,
          warnChimedAt: d.warn_chimed_at ?? null,
          policy: {
            warnMinutes: d.warn_minutes ?? null,
            stopGraceMinutes: d.stop_grace_minutes ?? null,
            terminateHours: d.terminate_hours ?? null,
          },
        };
      }),
    );
    return ok({ desktops: withLive });
  } catch (err) {
    console.error(
      "[api] GET /api/desktop/mine unhandled",
      err instanceof Error ? err.message.slice(0, 200) : "unknown",
    );
    return fail("Unable to list desktops.", 500);
  }
}
