import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clampLimit } from "@/lib/validate";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";
import {
  cleanGameSlug,
  cleanPartyBody,
  isPartyId,
  isPartyKind,
} from "@/lib/parties";

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

// GET /api/parties/feed?limit= — public town square, newest first.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const limit = clampLimit(new URL(req.url).searchParams.get("limit"), 25, 100);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("party_feed", { p_limit: limit });
  if (error) return rpcFail("GET /api/parties/feed", error, statusOf, "Unable to load feed.");
  return ok({ posts: data ?? [] });
}

// POST /api/parties/feed {actor:{kind,id}, target?:{kind,id}, body,
// game_slug?} — post as any party you can speak for, optionally @ another
// party. Valley Net screens every write (blocked refuses, suspicious held
// as pending); posting is coin-free.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`party-post:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const actor = partyOf(input.actor);
  if (!actor) return fail("actor {kind,id} is required.", 400);
  const rawTarget = input.target;
  const target =
    rawTarget === undefined || rawTarget === null ? null : partyOf(rawTarget);
  if (rawTarget !== undefined && rawTarget !== null && !target) {
    return fail("target must be {kind,id}.", 400);
  }
  const text = cleanPartyBody(input.body).trim();
  if (!text) return fail("Body required (1-2000 chars).", 400);
  const gameSlug = cleanGameSlug(input.game_slug);

  const valley = await valleynetCheck(text);
  if (valley.verdict === "block") {
    await logValleynetAction({
      targetType: "post",
      verdict: "block",
      reasons: valley.reasons,
      actorId: u.id,
    });
    return fail("Valley Net blocked this post (spam shield).", 403);
  }
  const status = valley.verdict === "quarantine" ? "pending" : "visible";
  if (status === "pending") {
    await logValleynetAction({
      targetType: "post",
      verdict: "quarantine",
      reasons: valley.reasons.length ? valley.reasons : ["luna-review"],
      actorId: u.id,
    });
  }

  const { data: post, error } = await supabase.rpc("party_post_create", {
    p_actor_kind: actor.kind,
    p_actor_id: actor.id,
    p_target_kind: target?.kind ?? null,
    p_target_id: target?.id ?? null,
    p_body: text,
    p_game_slug: gameSlug,
    p_status: status,
  });
  if (error) return rpcFail("POST /api/parties/feed", error, statusOf, "Unable to create post.");
  return ok({ post, status }, 201);
}
