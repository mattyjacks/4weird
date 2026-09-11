import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive, stopPodAction } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/blender/jobs/[id]/stop — end GPU billing now. Works for
 * starting/rendering/done_unstored jobs with a live pod; a pod that already
 * exited is simply marked stopped (billing already ended with the exit).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(_req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`blender:stop:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await ctx.params;
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
  if (error) return dbFail("POST /api/blender/jobs/[id]/stop", error, "Unable to load render job.");
  if (!row) return fail("Render job not found.", 404);
  const job = row as { id: string; status: string; pod_id: string };
  if (!job.pod_id) return fail("No worker to stop — this job never provisioned a pod.", 409);

  const stopped = await stopPodAction(job.pod_id);
  if (!stopped.ok) {
    const live = await getPodLive(job.pod_id);
    const gone = !live.ok || /EXITED|TERMINATED|UNKNOWN/i.test(live.status);
    if (gone) {
      await svc.from("blender_renders").update({ status: "stopped" }).eq("id", job.id);
      return ok({ stopped: true, note: "Worker already exited — billing already ended." });
    }
    return fail(`Unable to stop the worker (${stopped.error}). It may still bill — retry or stop it from the RunPod console.`, 502);
  }
  await svc.from("blender_renders").update({ status: "stopped" }).eq("id", job.id);
  return ok({ stopped: true, podStatus: stopped.status });
}
