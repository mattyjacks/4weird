import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanPartyMessage, isPartyId, isPartyKind } from "@/lib/parties";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("login required")) return 401;
  if (m.includes("forbidden")) return 403;
  if (m.includes("not found")) return 404;
  if (m.includes("already")) return 409;
  return 400;
}

function partyOf(v: unknown): { kind: string; id: string } | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const kind = isPartyKind(o.kind);
  const id = isPartyId(o.id);
  if (!kind || !id) return null;
  return { kind, id };
}

// GET /api/parties/invites — my pending inbox + outbox across every party
// I can speak for (squads, clans, orgs) plus my own individual inbox.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { data: invites, error } = await supabase.rpc("party_my_invites");
  if (error) return rpcFail("GET /api/parties/invites", error, statusOf, "Unable to load invites.");
  return ok({ ...(invites as Record<string, unknown> | null) });
}

// POST /api/parties/invites {from:{kind,id}, to:{kind,id}, message?}
// — propose a join or alliance. Accepting lands the real membership
// (team_members / clan_members / org_members) plus an ally badge.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`party-invite:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const from = partyOf(input.from);
  const to = partyOf(input.to);
  if (!from || !to) return fail("from {kind,id} and to {kind,id} are required.", 400);
  const message = cleanPartyMessage(input.message);
  const { data: invite, error } = await supabase.rpc("party_invite_create", {
    p_from_kind: from.kind,
    p_from_id: from.id,
    p_to_kind: to.kind,
    p_to_id: to.id,
    p_message: message,
  });
  if (error) return rpcFail("POST /api/parties/invites", error, statusOf, "Unable to create invite.");
  return ok({ invite }, 201);
}
