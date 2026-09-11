import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { getPodLive, runPodLifecycle } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/agents/bookings/[id]/pod {action: stop|start|restart|terminate|delete} -
 * control the RunPod behind YOUR rental. Only the renter who created the
 * booking (or the listing owner hosting it) may act; anyone else gets 404
 * (never confirm the booking exists). stop releases GPU/CPU (disk kept);
 * start boots a stopped pod; restart reboots in place; terminate/delete ends
 * billing permanently (disk lost). Ending the booking itself stays on
 * POST /api/agents/bookings/[id]/end (escrow refund); this route only moves
 * the pod.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:pod:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Booking not found.", 404);

  let action: string;
  try {
    action = String(((await req.json()) as Record<string, unknown> | null)?.action ?? "").toLowerCase();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (!["stop", "start", "restart", "terminate", "delete"].includes(action)) {
    return fail("Invalid action. Use stop, start, restart, terminate, or delete.", 400);
  }

  const { data: booking, error } = await supabase
    .from("rental_bookings")
    .select("id,renter_id,pod_id,agent_listings(id,owner_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("Unable to load booking.", 500);
  if (!booking) return fail("Booking not found.", 404);
  const row = booking as unknown as {
    id: string;
    renter_id: string;
    pod_id: string;
    agent_listings: { owner_id: string } | { owner_id: string }[] | null;
  };
  const isRenter = row.renter_id === data.user.id;
  const listing = Array.isArray(row.agent_listings) ? row.agent_listings[0] : row.agent_listings;
  const isOwner = listing?.owner_id === data.user.id;
  if (!isRenter && !isOwner) return fail("Booking not found.", 404);
  if (!row.pod_id) return fail("No pod on this booking; it never provisioned a RunPod.", 409);

  const result = await runPodLifecycle(row.pod_id, action);
  if (!result.ok) {
    const live = await getPodLive(row.pod_id);
    const gone = !live.ok || /EXITED|TERMINATED|UNKNOWN/i.test(live.status);
    if (gone && (action === "stop" || action === "terminate" || action === "delete")) {
      return ok({ ok: true, action, podStatus: live.ok ? live.status : "UNKNOWN", note: "Pod already exited; billing already ended." });
    }
    return fail(`Unable to ${action} the pod (${result.error}). It may still bill; retry or stop it from the RunPod console.`, 502);
  }
  return ok({ ok: true, action, podStatus: result.status });
}
