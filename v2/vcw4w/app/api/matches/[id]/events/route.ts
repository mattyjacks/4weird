import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clampLimit, isUuid } from "@/lib/validate";


const KINDS = new Set([
  "join", "leave", "kill", "boss", "loot", "chat", "emote", "win", "seed",
]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid match.", 400);
  // Defense in depth over the read_mp_events RPC + mp_events_select RLS
  // policy: never render a match feed to a non-participant, even if the RPC
  // or policies are later relaxed. Mirrors GET /api/matches/[id]
  // (DS-SEC-GAMES-01): non-participants see 404, never confirm existence.
  // (DS-SECHUNT-04)
  const { data: match, error: matchError } = await supabase
    .from("game_matches")
    .select("id,phone_id,desktop_id")
    .eq("id", id)
    .maybeSingle();
  if (matchError) return dbFail("api/matches/[id]/events", matchError, "Match not found.", 404);
  if (!match) return fail("Match not found.", 404);
  const m = match as { phone_id?: string; desktop_id?: string };
  if (m.phone_id !== u.id && m.desktop_id !== u.id) return fail("Match not found.", 404);
  const q = new URL(req.url).searchParams;
  const limit = clampLimit(q.get("limit"), 50, 100);
  const since = (q.get("since") ?? "").trim().slice(0, 64) || null;
  const { data: rpcData, error } = await supabase.rpc("read_mp_events", {
    p_match: id,
    p_since: since,
    p_limit: limit,
  });
  if (error) return rpcFail("api/matches/[id]/events", error, () => 403, "Event history denied.");
  const rows = (Array.isArray(rpcData) ? rpcData : []) as Record<string, unknown>[];
  const events = rows.map((e) => ({
    id: String(e.id ?? ""),
    user_id: String(e.user_id ?? ""),
    kind: String(e.kind ?? ""),
    text: String(e.text ?? ""),
    created_at: String(e.created_at ?? ""),
  }));
  return ok({ events });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`match-events:${u.id}`, 60);
  if (!throttle.allowed) {
    return fail("Too many match events. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid match.", 400);
  // Mirror the PUT /api/matches/[id] participant/active checks before
  // touching state: the post_mp_event RPC enforces the same predicates at
  // the DB layer (defense in depth), but the API must fail closed with the
  // same semantics — non-participants see 404 (never confirm the match
  // exists), finished/abandoned matches see 403. (DS-SECHUNT-04)
  const { data: match, error: matchError } = await supabase
    .from("game_matches")
    .select("id,phone_id,desktop_id,status")
    .eq("id", id)
    .maybeSingle();
  if (matchError) return dbFail("api/matches/[id]/events", matchError, "Match not found.", 404);
  if (!match) return fail("Match not found.", 404);
  const m = match as { phone_id?: string; desktop_id?: string; status?: string };
  if (m.phone_id !== u.id && m.desktop_id !== u.id) return fail("Match not found.", 404);
  if (m.status !== "active") return fail("Match is no longer active.", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const kind = String(input.kind ?? "").trim().toLowerCase();
  if (!KINDS.has(kind)) return fail("Invalid event kind.", 400);
  const text = String(input.text ?? "").trim();
  if (text.length < 1 || text.length > 140) return fail("Invalid event text.", 400);
  const { error } = await supabase.rpc("post_mp_event", {
    p_match: id,
    p_kind: kind,
    p_text: text,
  });
  if (error) return rpcFail("api/matches/[id]/events", error, () => 403, "Event denied.");
  return ok({ posted: true });
}
