import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { runpodApiBase, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15_000;
// Execution plane for serverless jobs (management plane lists endpoints,
// jobs run on api.runpod.ai). Fixed host: the Bearer key must never follow
// a caller-supplied URL.
const RUNPOD_RUN_BASE = "https://api.runpod.ai/v2";

function isEndpointId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(v);
}

async function upstreamGet(url: string, key: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/agents/runpod-endpoints; list REAL serverless endpoints owned by
// the RUNPOD_API_KEY account (GET /v2/serverless). Login required. When the
// server key is missing, report honestly: started:false/unconfigured with an
// empty list — never synthetic endpoints.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-endpoints:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!runpodConfigured()) {
    return ok({
      configured: false,
      started: false,
      endpoints: [],
      hint: "Set RUNPOD_API_KEY (RunPod console → Settings → API Keys) as a server environment variable.",
    });
  }
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  let res: Response;
  try {
    res = await upstreamGet(`${runpodApiBase()}/serverless`, key);
  } catch (err) {
    console.error("[runpod-endpoints] list failed", err instanceof Error ? err.message.slice(0, 120) : "fetch failed");
    return fail("RunPod endpoint lookup failed. Try again shortly.", 502);
  }
  if (!res.ok) {
    console.error("[runpod-endpoints] list failed");
    return fail("RunPod endpoint lookup failed. Try again shortly.", 502);
  }
  let data2: unknown;
  try {
    data2 = await res.json();
  } catch {
    return fail("RunPod endpoint lookup failed. Try again shortly.", 502);
  }
  const endpoints = Array.isArray(data2)
    ? data2
    : Array.isArray((data2 as { endpoints?: unknown })?.endpoints)
      ? (data2 as { endpoints: unknown[] }).endpoints
      : null;
  if (!endpoints) return fail("RunPod endpoint lookup failed. Try again shortly.", 502);
  return ok({ configured: true, started: true, endpoints });
}

// POST /api/agents/runpod-endpoints { endpointId, input?: object }; submit a
// REAL async job (POST https://api.runpod.ai/v2/{endpointId}/run). Returns
// the upstream job id for polling. Never invents a job id.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-endpoints-run:${data.user.id}`, 10, 60_000);
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
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${RUNPOD_RUN_BASE}/${input.endpointId}/run`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: jobInput }),
    });
  } catch (err) {
    console.error("[runpod-endpoints] run failed", err instanceof Error ? err.message.slice(0, 120) : "fetch failed");
    return fail("RunPod job submission failed. Try again shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    console.error("[runpod-endpoints] run failed");
    return fail("RunPod job submission failed. Try again shortly.", 502);
  }
  let job: unknown;
  try {
    job = await res.json();
  } catch {
    return fail("RunPod job submission failed. Try again shortly.", 502);
  }
  return ok({ configured: true, started: true, job });
}
