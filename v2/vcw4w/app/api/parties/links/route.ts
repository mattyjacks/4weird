import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanPartyRef, isPartyId, isPartyKind } from "@/lib/parties";

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

// GET /api/parties/links?kind=&id=; follows/allies/rivals touching a party.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const url = new URL(req.url);
  const kind = isPartyKind(url.searchParams.get("kind"));
  const id = isPartyId(url.searchParams.get("id"));
  if (!kind || !id) return fail("kind and id are required.", 400);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("party_links")
    .select("id,from_kind,from_id,to_kind,to_id,relation,created_at")
    .or(`and(from_kind.eq.${kind},from_id.eq.${id}),and(to_kind.eq.${kind},to_id.eq.${id})`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return dbFail("GET /api/parties/links", error, "Unable to load links.");
  return ok({ links: data ?? [] });
}

// POST /api/parties/links {from:{kind,id}, to:{kind,id}, action:"follow"|"unfollow"}
//; instant public follow badges. Allies/rivals form only through accepted
// invites and completed challenges (never direct-written).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`party-follow:${u.id}`, 30, 60_000);
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
  const action = cleanPartyRef(input.action).toLowerCase() || "follow";
  if (!from || !to) return fail("from {kind,id} and to {kind,id} are required.", 400);
  if (action !== "follow" && action !== "unfollow") return fail("action must be follow or unfollow.", 400);
  const fn = action === "follow" ? "party_follow" : "party_unfollow";
  const { data: result, error } = await supabase.rpc(fn, {
    p_from_kind: from.kind,
    p_from_id: from.id,
    p_to_kind: to.kind,
    p_to_id: to.id,
  });
  if (error) return rpcFail("POST /api/parties/links", error, statusOf, "Unable to update follow.");
  return ok({ link: result ?? null, action }, action === "follow" ? 201 : 200);
}
