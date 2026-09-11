import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/desktop/[id]/heartbeat — the browser watchdog reports input
 * activity so the idle clock (60-min warn chime → +15-min stop → 24h
 * terminate) restarts. Creator-only (404 otherwise, never confirm the row).
 * Body: {} (empty OK) or { warned?: boolean } when the client just chimed,
 * which stamps warn_chimed_at once so the sweep + UI agree.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`desktop:heartbeat:${data.user.id}`, 120, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Desktop not found.", 404);

  let warned = false;
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown> | null;
    warned = (body ?? {}).warned === true;
  } catch {
    warned = false;
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Desktop lookup unavailable.", 503);
  }
  const now = new Date().toISOString();
  const patch: Record<string, string> = { last_activity_at: now };
  if (warned) patch.warn_chimed_at = now;
  const { data: row, error } = await svc
    .from("desktop_pods")
    .update(patch)
    .eq("id", id)
    .eq("user_id", data.user.id)
    .select("id")
    .maybeSingle();
  if (error) return dbFail("POST /api/desktop/[id]/heartbeat", error, "Unable to record activity.");
  if (!row) return fail("Desktop not found.", 404);
  return ok({ ok: true, at: now });
}
