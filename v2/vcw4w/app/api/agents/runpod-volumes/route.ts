import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { runpodApiBase, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15_000;

// GET /api/agents/runpod-volumes; list REAL network volumes owned by the
// RUNPOD_API_KEY account (GET /v2/network-volumes). Login required.
// Unconfigured key → honest started:false with an empty list, never fake
// volumes.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-volumes:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!runpodConfigured()) {
    return ok({
      configured: false,
      started: false,
      volumes: [],
      hint: "Set RUNPOD_API_KEY (RunPod console → Settings → API Keys) as a server environment variable.",
    });
  }
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${runpodApiBase()}/network-volumes`, {
      method: "GET",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
  } catch (err) {
    console.error("[runpod-volumes] lookup failed", err instanceof Error ? err.message.slice(0, 120) : "fetch failed");
    return fail("RunPod volume lookup failed. Try again shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    console.error("[runpod-volumes] lookup failed");
    return fail("RunPod volume lookup failed. Try again shortly.", 502);
  }
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return fail("RunPod volume lookup failed. Try again shortly.", 502);
  }
  const volumes = Array.isArray(payload) ? payload : null;
  if (!volumes) return fail("RunPod volume lookup failed. Try again shortly.", 502);
  return ok({ configured: true, started: true, volumes });
}
