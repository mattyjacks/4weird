import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive, runPodLifecycle } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/desktop/[id]/pod {action: stop|start|restart|terminate|delete} -
 * control YOUR Virtual Desktop. Only the user who created it (desktop_pods
 * owner) may act; anyone else gets 404 (never confirm the row exists).
 * stop releases GPU/CPU (disk kept, storage still bills); start boots a
 * stopped pod; restart reboots in place; terminate/delete ends billing
 * permanently (disk lost).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`desktop:pod:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Desktop not found.", 404);

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
    return fail("Desktop lookup unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("desktop_pods")
    .select("id,pod_id,status")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("POST /api/desktop/[id]/pod", error, "Unable to load desktop.");
  if (!row) return fail("Desktop not found.", 404);
  const desktop = row as { id: string; pod_id: string; status: string };
  if (!desktop.pod_id) return fail("This desktop never provisioned a pod.", 409);
  if (desktop.status === "deleted" || desktop.status === "terminated") {
    return fail(`Desktop is already ${desktop.status}.`, 409);
  }

  const result = await runPodLifecycle(desktop.pod_id, action);
  if (!result.ok) {
    // Already-exited pods bill nothing: treat EXITED/TERMINATED as stopped.
    const live = await getPodLive(desktop.pod_id);
    const gone = !live.ok || /EXITED|TERMINATED|UNKNOWN/i.test(live.status);
    if (gone && (action === "stop" || action === "terminate" || action === "delete")) {
      const status = action === "stop" ? "stopped" : action === "delete" ? "deleted" : "terminated";
      await svc.from("desktop_pods").update({ status }).eq("id", desktop.id);
      return ok({ ok: true, action, podStatus: live.ok ? live.status : "UNKNOWN", note: "Pod already exited; billing already ended." });
    }
    return fail(`Unable to ${action} the pod (${result.error}). It may still bill; retry or stop it from the RunPod console.`, 502);
  }

  const status =
    action === "stop" ? "stopped" : action === "start" || action === "restart" ? "running" : action === "delete" ? "deleted" : "terminated";
  await svc.from("desktop_pods").update({ status }).eq("id", desktop.id);
  return ok({ ok: true, action, podStatus: result.status });
}
