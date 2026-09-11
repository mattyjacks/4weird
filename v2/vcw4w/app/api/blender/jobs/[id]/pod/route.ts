import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive, runPodLifecycle } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/blender/jobs/[id]/pod {action: stop|start|restart|terminate|delete} -
 * control YOUR render worker. Only the user who created the job may act;
 * anyone else gets 404 (never confirm the job exists). stop/terminate/delete
 * end GPU billing now (the job is marked stopped); start/restart revive the
 * worker to retry a render. Ending billing without reviving stays on
 * POST /api/blender/jobs/[id]/stop.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`blender:pod:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await ctx.params;

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
    return fail("Render lookup unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("blender_renders")
    .select("id,status,pod_id")
    .eq("id", String(id))
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("POST /api/blender/jobs/[id]/pod", error, "Unable to load render job.");
  if (!row) return fail("Render job not found.", 404);
  const job = row as { id: string; status: string; pod_id: string };
  if (!job.pod_id) return fail("No worker on this job; it never provisioned a pod.", 409);

  const result = await runPodLifecycle(job.pod_id, action);
  if (!result.ok) {
    const live = await getPodLive(job.pod_id);
    const gone = !live.ok || /EXITED|TERMINATED|UNKNOWN/i.test(live.status);
    if (gone && (action === "stop" || action === "terminate" || action === "delete")) {
      await svc.from("blender_renders").update({ status: "stopped" }).eq("id", job.id);
      return ok({ ok: true, action, podStatus: live.ok ? live.status : "UNKNOWN", note: "Worker already exited; billing already ended." });
    }
    return fail(`Unable to ${action} the worker (${result.error}). It may still bill; retry or stop it from the RunPod console.`, 502);
  }
  if (action === "stop" || action === "terminate" || action === "delete") {
    await svc.from("blender_renders").update({ status: "stopped" }).eq("id", job.id);
  }
  return ok({ ok: true, action, podStatus: result.status });
}
