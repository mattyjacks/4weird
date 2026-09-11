import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { falApiBase, falConfigured, falKey, isFalOp, modelForOp, opByKey } from "@/lib/fal";

export const dynamic = "force-dynamic";

/**
 * GET /api/fal/status?op=<op>&id=<request_id> — poll a queued fal.ai run.
 * Authenticated; proxies the live fal queue status (never synthesized).
 * Without FAL_KEY returns honest configured:false.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`fal:status:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const q = new URL(req.url).searchParams;
  const opRaw = String(q.get("op") ?? "");
  const id = String(q.get("id") ?? q.get("request_id") ?? "").slice(0, 128);
  if (!isFalOp(opRaw)) return fail("Invalid op.", 400);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return fail("Invalid id.", 400);
  if (!falConfigured()) return ok({ configured: false, op: opRaw, request_id: id, status: "unconfigured" });

  const model = modelForOp(opRaw);
  void opByKey(opRaw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${falApiBase()}/${model}/requests/${encodeURIComponent(id)}/status`, {
      signal: controller.signal,
      headers: { Authorization: `Key ${falKey()}`, Accept: "application/json" },
    });
    if (!res.ok) return fail(`fal.ai status HTTP ${res.status}.`, 502);
    const status = (await res.json()) as Record<string, unknown>;
    return ok({ configured: true, op: opRaw, model, request_id: id, status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "fetch failed";
    return fail(`fal.ai status failed: ${msg.slice(0, 120)}`, 502);
  } finally {
    clearTimeout(timer);
  }
}
