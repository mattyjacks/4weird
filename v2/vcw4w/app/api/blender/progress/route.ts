import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PHASES = ["starting", "rendering", "done", "done_unstored", "failed"] as const;

/**
 * POST /api/blender/progress {token, status, detail?, uploaded?}; phase
 * callbacks from the render worker. Token-authenticated (the pod has no
 * Origin, so no sameOrigin check here; the 64-hex job token IS the auth).
 * The worker exits itself after a terminal phase, ending GPU billing.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const token = String(input.token ?? "");
  const status = String(input.status ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return fail("Invalid token.", 401);
  if (!(PHASES as readonly string[]).includes(status)) return fail("Invalid status.", 400);
  const rl = rateLimit(`blender-cb:${token}`, 120, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Progress unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("blender_renders")
    .select("id,status")
    .eq("callback_token", token)
    .maybeSingle();
  if (error) return dbFail("POST /api/blender/progress", error, "Unable to record progress.");
  if (!row) return fail("Unknown job.", 404);

  const detail = String(input.detail ?? "").slice(0, 400);
  const patch: Record<string, unknown> = {
    status,
    last_ping_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    error: status === "failed" ? detail || "Worker reported failure." : null,
  };
  const { error: upErr } = await svc.from("blender_renders").update(patch).eq("id", (row as { id: string }).id);
  if (upErr) return dbFail("POST /api/blender/progress", upErr, "Unable to record progress.");
  return ok({ recorded: true, status });
}
