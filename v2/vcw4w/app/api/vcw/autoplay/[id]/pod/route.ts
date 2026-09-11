import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive, runPodLifecycle } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/autoplay/[id]/pod {action: stop|start|restart|terminate|
 * delete} — control YOUR autoplay remote. Only the creator
 * (vcw_autoplay_remotes.user_id) may act; anyone else gets 404. Any action
 * counts as tending the pod (resets the idle clock).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:autoplay-pod:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Autoplay remote not found.", 404);

  let action: string;
  try {
    action = String(((await req.json()) as Record<string, unknown> | null)?.action ?? "").toLowerCase();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (!["stop", "start", "restart", "terminate", "delete"].includes(action)) {
    return fail("Invalid action. Use stop, start, restart, terminate, or delete.", 400);
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Autoplay lookup unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("vcw_autoplay_remotes")
    .select("id,pod_id,status")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("POST /api/vcw/autoplay/[id]/pod", error, "Unable to load remote.");
  if (!row) return fail("Autoplay remote not found.", 404);
  const remote = row as { id: string; pod_id: string; status: string };
  if (!remote.pod_id) return fail("This remote never provisioned a pod.", 409);
  if (remote.status === "deleted" || remote.status === "terminated") {
    return fail(`Remote is already ${remote.status}.`, 409);
  }

  const result = await runPodLifecycle(remote.pod_id, action);
  if (!result.ok) {
    const live = await getPodLive(remote.pod_id);
    const gone = !live.ok || /EXITED|TERMINATED|UNKNOWN/i.test(live.status);
    if (gone && (action === "stop" || action === "terminate" || action === "delete")) {
      const status = action === "stop" ? "stopped" : action === "delete" ? "deleted" : "terminated";
      await svc.from("vcw_autoplay_remotes").update({ status, last_activity_at: new Date().toISOString() }).eq("id", remote.id);
      return ok({ ok: true, action, podStatus: live.ok ? live.status : "UNKNOWN", note: "Pod already exited; billing already ended." });
    }
    return fail(`Unable to ${action} the pod (${result.error}). It may still bill; retry or stop it from the RunPod console.`, 502);
  }

  const status =
    action === "stop" ? "stopped" : action === "start" || action === "restart" ? "running" : action === "delete" ? "deleted" : "terminated";
  await svc.from("vcw_autoplay_remotes").update({ status, last_activity_at: new Date().toISOString() }).eq("id", remote.id);
  return ok({ ok: true, action, podStatus: result.status });
}
