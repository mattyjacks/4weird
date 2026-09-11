import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanGameSlug, cleanPartyMessage, isPartyId, isPartyKind } from "@/lib/parties";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("login required")) return 401;
  if (m.includes("forbidden")) return 403;
  if (m.includes("not found")) return 404;
  return 400;
}

function partyOf(v: unknown): { kind: string; id: string } | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const kind = isPartyKind(o.kind);
  const id = isPartyId(o.id);
  if (!kind || !id) return null;
  return { kind, id };
}

// GET /api/parties/challenges?kind=&id=&status=; open challenges touching a
// party (default: every open challenge, newest first).
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const url = new URL(req.url);
  const kind = isPartyKind(url.searchParams.get("kind"));
  const id = isPartyId(url.searchParams.get("id"));
  const status = String(url.searchParams.get("status") ?? "open").trim().toLowerCase() || "open";
  if (!["open", "accepted", "declined", "cancelled", "completed"].includes(status)) {
    return fail("Invalid status.", 400);
  }
  const supabase = await createClient();
  let query = supabase
    .from("party_challenges")
    .select("id,challenger_kind,challenger_id,opponent_kind,opponent_id,game_slug,message,status,winner_kind,winner_id,created_at,decided_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (kind && id) {
    query = query.or(
      `and(challenger_kind.eq.${kind},challenger_id.eq.${id}),and(opponent_kind.eq.${kind},opponent_id.eq.${id})`,
    );
  }
  const { data, error } = await query;
  if (error) return dbFail("GET /api/parties/challenges", error, "Unable to load challenges.");
  return ok({ challenges: data ?? [] });
}

// POST /api/parties/challenges {challenger:{kind,id}, opponent:{kind,id},
// game_slug?, message?}; any party challenges any other party.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`party-challenge:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const challenger = partyOf(input.challenger);
  const opponent = partyOf(input.opponent);
  if (!challenger || !opponent) return fail("challenger {kind,id} and opponent {kind,id} are required.", 400);
  const gameSlug = cleanGameSlug(input.game_slug);
  const message = cleanPartyMessage(input.message);
  const { data: challenge, error } = await supabase.rpc("party_challenge_create", {
    p_challenger_kind: challenger.kind,
    p_challenger_id: challenger.id,
    p_opponent_kind: opponent.kind,
    p_opponent_id: opponent.id,
    p_game_slug: gameSlug,
    p_message: message,
  });
  if (error) return rpcFail("POST /api/parties/challenges", error, statusOf, "Unable to create challenge.");
  return ok({ challenge }, 201);
}
