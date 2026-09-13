import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { runEndpointJob, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

function isEndpointId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(v);
}

// POST /api/agents/runpod-jobs { endpointId, input?: object }; submit a REAL
// async serverless job (POST https://api.runpod.ai/v2/{endpointId}/run).
// Returns the upstream job id for polling via
// GET /api/agents/runpod-jobs/[jobId]?endpointId=. Login required. Never
// invents a job id.
export async function POST(req: Request) {
  try {
    if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
    if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Authentication required.", 401);
    const rl = rateLimit(`runpod-jobs-submit:${data.user.id}`, 10, 60_000);
    if (!rl.allowed) return fail("Rate limited.", 429);
    if (!runpodConfigured()) return fail("RUNPOD_API_KEY is not set on the server.", 503);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON body.", 400);
    }
    const input = (body ?? {}) as Record<string, unknown>;
    if (!isEndpointId(input.endpointId)) return fail("Invalid endpointId.", 400);
    const jobInput = input.input ?? {};
    if (typeof jobInput !== "object" || jobInput === null || Array.isArray(jobInput)) {
      return fail("Invalid input: must be a JSON object.", 400);
    }
    const res = await runEndpointJob(input.endpointId, jobInput);
    if (!res.ok) {
      const missingKey = /not set/i.test(res.error);
      if (missingKey) return fail(res.error, 503);
      console.error("[runpod-jobs] run failed");
      return fail(res.error, 502);
    }
    // Both keys: the dashboard reads `jobId ?? id`.
    return ok({ configured: true, started: true, jobId: res.jobId, id: res.jobId, status: res.status });
  } catch (err) {
    console.error(
      "[runpod-jobs] run failed",
      err instanceof Error ? err.message.slice(0, 120) : "fetch failed",
    );
    return fail("RunPod job submission failed. Try again shortly.", 502);
  }
}

// GET /api/agents/runpod-jobs is not a valid status read (no job id); the
// per-job read lives at /api/agents/runpod-jobs/[jobId]?endpointId=.
export async function GET() {
  return fail("Missing job id. Poll GET /api/agents/runpod-jobs/[jobId]?endpointId=.", 400);
}
