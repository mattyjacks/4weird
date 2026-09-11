import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isPartyId, isPartyKind } from "@/lib/parties";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("login required")) return 401;
  if (m.includes("forbidden")) return 403;
  if (m.includes("not found")) return 404;
  if (m.includes("already decided")) return 409;
  return 400;
}

// POST /api/parties/challenges/[id] {action: accept|decline|cancel|complete,
// winner?: {kind,id}}; advance a challenge. Accept/decline speak for the
// opponent side; cancel for either side; complete for either side with the
// winner set to one of the two parties.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid challenge.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`party-challenge-decide:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "").trim().toLowerCase();
  if (!["accept", "decline", "cancel", "complete"].includes(action)) {
    return fail("action must be accept, decline, cancel, or complete.", 400);
  }
  let winnerKind: string | null = null;
  let winnerId: string | null = null;
  if (action === "complete") {
    const w = (input.winner ?? {}) as Record<string, unknown>;
    const k = isPartyKind(w.kind);
    const wid = isPartyId(w.id);
    if (!k || !wid) return fail("complete needs winner {kind,id}.", 400);
    winnerKind = k;
    winnerId = wid;
  }
  const { data: challenge, error } = await supabase.rpc("party_challenge_decide", {
    p_challenge: id,
    p_action: action,
    p_winner_kind: winnerKind,
    p_winner_id: winnerId,
  });
  if (error) return rpcFail("POST /api/parties/challenges/[id]", error, statusOf, "Unable to decide challenge.");
  return ok({ challenge });
}
