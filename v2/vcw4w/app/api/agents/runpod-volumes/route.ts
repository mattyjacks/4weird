import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { listNetworkVolumes, runpodConfigured } from "@/lib/runpod";


// GET /api/agents/runpod-volumes; list REAL network volumes owned by the
// RUNPOD_API_KEY account (GET /v2/network-volumes). Login required.
// Unconfigured key → honest started:false with an empty list, never fake
// volumes.
//
// The upstream payload may be a bare array or an envelope object
// ({ volumes: [...] }, { networkVolumes: [...] }, { data: [...] }); parsing
// goes through lib/runpod so an envelope shape is never misread as a
// failure.
export async function GET() {
  try {
    if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Authentication required.", 401);
  const providerAge = await checkAuthenticatedVendorEligibility(supabase, data.user.id, "runpod");
  if (!providerAge.allowed) return fail(providerAge.reason, 403);
    const rl = rateLimit(`runpod-volumes:${data.user.id}`, 20, 60_000);
    if (!rl.allowed) return fail("Rate limited.", 429);
    if (!runpodConfigured()) {
      return ok({
        configured: false,
        started: false,
        volumes: [],
        networkVolumes: [],
        hint: "Set RUNPOD_API_KEY (RunPod console → Settings → API Keys) as a server environment variable.",
      });
    }
    const res = await listNetworkVolumes();
    if (!res.ok) {
      console.error("[runpod-volumes] lookup failed");
      return fail("RunPod volume lookup failed. Try again shortly.", 502);
    }
    // Both keys: the dashboard reads `volumes ?? networkVolumes`.
    return ok({ configured: true, started: true, volumes: res.volumes, networkVolumes: res.volumes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    // Build-time prerender has no request cookies; that probe always fails
    // here. Stay quiet for exactly that case so real failures stand out.
    if (!msg.includes("During prerendering")) {
      console.error("[runpod-volumes] lookup failed", msg.slice(0, 120));
    }
    return fail("RunPod volume lookup failed. Try again shortly.", 502);
  }
}
