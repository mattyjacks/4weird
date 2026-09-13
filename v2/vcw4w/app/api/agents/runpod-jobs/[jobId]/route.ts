import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { getJobStatus, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

function isEndpointId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(v);
}

function isJobId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
}

// GET /api/agents/runpod-jobs/[jobId]?endpointId=; poll one REAL serverless
// job (GET https://api.runpod.ai/v2/{endpointId}/status/{jobId}). The
// dashboard polls this every 3s until a terminal status (COMPLETED, FAILED,
// CANCELLED, TIMED_OUT). Login required. Response carries every key the
// dashboard reads: `status` (+ `jobStatus` alias) and `output` (+ `result`
// alias).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Authentication required.", 401);
    // Polling-friendly budget: the dashboard polls every 3s per running job.
    const rl = rateLimit(`runpod-jobs-status:${data.user.id}`, 60, 60_000);
    if (!rl.allowed) return fail("Rate limited.", 429);
    if (!runpodConfigured()) return fail("RUNPOD_API_KEY is not set on the server.", 503);
    const { jobId } = await params;
    if (!isJobId(jobId)) return fail("Invalid jobId.", 400);
    const endpointId = new URL(req.url).searchParams.get("endpointId") ?? "";
    if (!isEndpointId(endpointId)) return fail("Invalid endpointId.", 400);
    const res = await getJobStatus(endpointId, jobId);
    if (!res.ok) {
      if (/not set/i.test(res.error)) return fail(res.error, 503);
      console.error("[runpod-jobs] status failed");
      return fail(res.error, 502);
    }
    return ok({
      configured: true,
      started: true,
      status: res.status,
      jobStatus: res.status,
      output: res.output,
      result: res.output,
    });
  } catch (err) {
    console.error(
      "[runpod-jobs] status failed",
      err instanceof Error ? err.message.slice(0, 120) : "fetch failed",
    );
    return fail("RunPod job status lookup failed. Try again shortly.", 502);
  }
}
