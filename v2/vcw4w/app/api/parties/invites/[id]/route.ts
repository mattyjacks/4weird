import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("login required")) return 401;
  if (m.includes("forbidden")) return 403;
  if (m.includes("not found")) return 404;
  if (m.includes("already decided")) return 409;
  return 400;
}

// POST /api/parties/invites/[id] {accept: boolean}; accept (target side
// speaks: the invitee or an officer of the invited squad/clan/org) or
// decline/cancel (either side). Accepting applies the membership effect.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid invite.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`party-invite-decide:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const accept = Boolean((body as Record<string, unknown> | null)?.accept);
  const { data: invite, error } = await supabase.rpc("party_invite_decide", {
    p_invite: id,
    p_accept: accept,
  });
  if (error) return rpcFail("POST /api/parties/invites/[id]", error, statusOf, "Unable to decide invite.");
  return ok({ invite });
}
