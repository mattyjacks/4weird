import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  if (/forbidden/i.test(message)) return 403;
  if (/already a member/i.test(message)) return 409;
  if (/expired|fully used|already used|revoked/i.test(message)) return 410;
  return rpcStatus(message);
}

/**
 * POST /api/orgs/invites/redeem {token}; join an org via an invite link.
 * Links carry the inviter's chosen role and may be capped (max_uses) and
 * expirable (expires_at). Joining moves 0 coins.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`org-redeem:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const token = String((body as Record<string, unknown> | null)?.token ?? "").trim();
  if (!/^[a-f0-9]{32}$/i.test(token)) return fail("Invalid invite token.", 400);
  const { data: orgId, error } = await supabase.rpc("redeem_org_invite", { p_token: token });
  if (error) return rpcFail("api/orgs/invites/redeem", error, statusOf, "Unable to redeem invite.");
  return ok({ org_id: orgId }, 201);
}
