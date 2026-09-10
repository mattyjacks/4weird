import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`monetize:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many updates. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const enabled = (body as Record<string, unknown> | null)?.enabled;
  if (typeof enabled !== "boolean") return fail("Invalid request.", 400);
  const { data: rpcData, error } = await supabase.rpc("set_creator_monetization", {
    p_submission: id,
    p_enabled: enabled,
  });
  if (error || !rpcData) return fail("Only approved projects can enter monetization setup.", 403);
  return ok({ status: enabled ? "ready" : "not_ready" });
}
