import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

/**
 * POST /api/ghost/contracts {org_id, title, worker_id, payer_id, rate_ghost}
 *; open a Ghost Cash work contract (hypothetical IOUs only, never money).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`ghost-contract:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const org = isUuid(input.org_id);
  const worker = isUuid(input.worker_id);
  const payer = isUuid(input.payer_id);
  const title = String(input.title ?? "").trim().slice(0, 120);
  const rate = Number(input.rate_ghost);
  if (!org || !worker || !payer) return fail("org_id, worker_id, and payer_id are required.", 400);
  if (title.length < 2) return fail("Title needs 2+ characters.", 400);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100000000) return fail("Invalid Ghost rate.", 400);
  const { data: contract, error } = await supabase.rpc("ghost_create_contract", {
    p_org: org,
    p_title: title,
    p_worker: worker,
    p_payer: payer,
    p_rate: rate,
  });
  if (error) return rpcFail("api/ghost/contracts", error, rpcStatus, "Unable to create contract.");
  return ok({ contract }, 201);
}
