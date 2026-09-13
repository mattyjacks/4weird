import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getJobStatus, runEndpointJob, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

function isEndpointId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(v);
}

function isJobId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
}

// Alternate route name for serverless job execution. The dashboard submits
// to POST /api/agents/runpod-jobs first and falls back here on 404; it also
// polls status here (GET ?jobId=&endpointId=) when the primary status read
// fails. Both verbs share that route's contract exactly — same validation,
// same response keys — so the fallback is behavior-identical, not a second
// implementation to drift.
async function submitJob(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-run-submit:${data.user.id}`, 10, 60_000);
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
    if (/not set/i.test(res.error)) return fail(res.error, 503);
    console.error("[runpod-run] run failed");
    return fail(res.error, 502);
  }
  return ok({ configured: true, started: true, jobId: res.jobId, id: res.jobId, status: res.status });
}

async function readJobStatus(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-run-status:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!runpodConfigured()) return fail("RUNPOD_API_KEY is not set on the server.", 503);
  const params = new URL(req.url).searchParams;
  const jobId = params.get("jobId") ?? "";
  const endpointId = params.get("endpointId") ?? "";
  if (!isJobId(jobId)) return fail("Invalid jobId.", 400);
  if (!isEndpointId(endpointId)) return fail("Invalid endpointId.", 400);
  const res = await getJobStatus(endpointId, jobId);
  if (!res.ok) {
    if (/not set/i.test(res.error)) return fail(res.error, 503);
    console.error("[runpod-run] status failed");
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
}

// POST /api/agents/runpod-run { endpointId, input?: object }; submit a REAL
// async serverless job. Login required.
export async function POST(req: Request) {
  try {
    return await submitJob(req);
  } catch (err) {
    console.error(
      "[runpod-run] run failed",
      err instanceof Error ? err.message.slice(0, 120) : "fetch failed",
    );
    return fail("RunPod job submission failed. Try again shortly.", 502);
  }
}

// GET /api/agents/runpod-run?jobId=&endpointId=; poll one REAL serverless
// job. Login required.
export async function GET(req: Request) {
  try {
    return await readJobStatus(req);
  } catch (err) {
    console.error(
      "[runpod-run] status failed",
      err instanceof Error ? err.message.slice(0, 120) : "fetch failed",
    );
    return fail("RunPod job status lookup failed. Try again shortly.", 502);
  }
}
