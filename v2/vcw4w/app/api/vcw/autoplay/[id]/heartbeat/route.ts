import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/autoplay/[id]/heartbeat - the test-watchdog reports input
 * so the idle clock restarts. Creator-only (404 otherwise). Body { warned? }
 * stamps warn_chimed_at once when the client just chimed.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:autoplay-heartbeat:${data.user.id}`, 120, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Autoplay remote not found.", 404);

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
    return fail("Autoplay lookup unavailable.", 503);
  }
  const now = new Date().toISOString();
  const patch: Record<string, string> = { last_activity_at: now };
  if (warned) patch.warn_chimed_at = now;
  const { data: row, error } = await svc
    .from("vcw_autoplay_remotes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", data.user.id)
    .select("id,status,hourly_usd,created_at,last_metered_at")
    .maybeSingle();
  if (error) return dbFail("POST /api/vcw/autoplay/[id]/heartbeat", error, "Unable to record activity.");
  if (!row) return fail("Autoplay remote not found.", 404);

  // Coin metering: bill whole elapsed worker-minutes since the last debit
  // (first debit bills from creation). The window gross mirrors
  // quoteAutoplayForUsd (provider USD -> gross, 25% cut included) and rides
  // meter_vcw_usage worker-min as qty = gross/6; the RPC's 2dp qty rounding
  // drifts ±3 centicentcoins per debit, inside the quote's ceiling. Capped
  // at 60 min per call so a long-silent remote cannot take one huge debit
  // (the idle sweep should have stopped it; the unbilled tail is bounded).
  // last_metered_at advances only on success, so failed debits retry.
  // Stopped/terminated remotes stamp activity only - nothing accrues.
  const typed = row as {
    id: string;
    status?: string;
    hourly_usd?: number;
    created_at?: string;
    last_metered_at?: string | null;
  };
  if (typed.status === "running") {
    const hourly = Number(typed.hourly_usd);
    const since = Date.parse(String(typed.last_metered_at ?? typed.created_at ?? now));
    if (Number.isFinite(hourly) && hourly > 0 && Number.isFinite(since)) {
      const mins = Math.max(0, Math.min(60, Math.floor((Date.parse(now) - since) / 60000)));
      if (mins >= 1) {
        const gross = Math.ceil(((hourly / 0.75) * 100 * mins) / 60) / 100;
        const qty = Math.max(0.01, Math.round((gross / 6) * 100) / 100);
        const { error: meterError } = await supabase.rpc("meter_vcw_usage", {
          p_op: "worker-min",
          p_qty: qty,
          p_run: null,
          p_source: "vcw",
        });
        if (meterError) {
          const message = String(
            (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
          );
          if (/insufficient|balance|funds/i.test(message)) {
            return fail("Insufficient Vibe Coin balance for autoplay. Top up or stop the remote from /runpods.", 402);
          }
          return ok({ ok: true, at: now, metered: false, meterError: "Unable to meter this window; it retries on the next heartbeat." });
        }
        try {
          await svc
            .from("vcw_autoplay_remotes")
            .update({ last_metered_at: now })
            .eq("id", id)
            .eq("user_id", data.user.id);
        } catch {
          /* cursor best-effort; the next window simply overlaps by cents */
        }
        return ok({ ok: true, at: now, metered: true, minutes: mins });
      }
    }
  }
  return ok({ ok: true, at: now });
}
