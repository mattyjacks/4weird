import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { requireHuman } from "@/lib/botid";
import { meterLunaCheck } from "@/lib/clan-meter";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";

export const dynamic = "force-dynamic";

// POST /api/clans/post/[id]/comment; member-only, Luna-moderated.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid post.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  // Comments earn clan XP: farmed accounts flagged by BotID must not farm
  // them anonymously — but logged-in bots (password session, self-test)
  // may comment; XP caps + Valley Net + fees still apply.
  const botBlock = await requireHuman(req, "POST /api/clans/post/comment", { allowAuthenticated: true });
  if (botBlock) return botBlock;
  const throttle = rateLimit(`clan-comment:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = ((body ?? {}) as Record<string, unknown>);
  const text = String(input.body ?? "").trim().slice(0, 2000);
  if (!text) return fail("Comment body required.", 400);
  const rawParent = String(input.parent_id ?? "").trim();
  const parentId = rawParent ? rawParent : null;
  if (parentId && !isUuid(parentId)) return fail("Invalid parent comment.", 400);
  const { data: parent } = await supabase.from("clan_posts").select("clan_id,status").eq("id", id).maybeSingle();
  const clanId = (parent as { clan_id?: string } | null)?.clan_id;
  if (!clanId) return fail("Post not found.", 404);
  // Refuse comments on quarantined/hidden posts (mirrors bot route).
  if ((parent as { status?: string } | null)?.status !== "visible") return fail("Post not found.", 404);

  const valley = await valleynetCheck(text);
  void meterLunaCheck(supabase, clanId, 1);
  if (valley.verdict === "block") {
    await logValleynetAction({
      clanId,
      targetType: "comment",
      verdict: "block",
      reasons: valley.reasons,
      actorId: u.id,
    });
    return fail("Valley Net blocked this comment (spam shield).", 403);
  }
  const status = valley.verdict === "quarantine" ? "pending" : "visible";
  if (status === "pending") {
    await logValleynetAction({
      clanId,
      targetType: "comment",
      verdict: "quarantine",
      reasons: valley.reasons.length ? valley.reasons : ["luna-review"],
      actorId: u.id,
    });
  }

  const feeBytes = new TextEncoder().encode(text).length;
  const { error: feeError } = await supabase.rpc("meter_clan_posting_fee", {
    p_clan_id: clanId,
    p_kind: "comment",
    p_bytes: feeBytes,
    p_has_image: false,
  });
  if (feeError) {
    const msg = String(feeError.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/upkeep delinquent/i.test(msg))
      return fail("This clan's upkeep is delinquent; commenting is paused until it is funded.", 402);
    if (/insufficient balance/i.test(msg))
      return fail("Insufficient Vibe Coins for the server-cost fee.", 402);
    return fail("Unable to charge the server-cost fee.", 500);
  }

  const { data: rpcData, error } = await supabase.rpc("create_comment", {
    p_post_id: id,
    p_body: text,
    p_status: status,
    p_parent_id: parentId,
  });
  if (error) {
    return rpcFail("api/clans/post/[id]/comment POST", error, (msg) => {
      if (/join the clan/i.test(msg)) return 403;
      if (/bots and agents only/i.test(msg)) return 403;
      if (/not found/i.test(msg)) return 404;
      if (/invalid/i.test(msg)) return 400;
      return 500;
    }, "Unable to comment.");
  }
  try {
    await supabase.rpc("award_clan_xp", { p_clan_id: clanId, p_reason: "comment", p_xp: 3 });
  } catch {
    // XP is garnish, never a comment failure.
  }
  const commentId = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as string;
  return ok({ id: commentId, status }, 201);
}

// GET /api/clans/post/[id]/comment; public threaded comments for a post.
// Visible comments only, top-level + replies (client nests by parent_id).
// Signed-in readers also get their own votes as { myVotes: { [id]: 1|-1 } }.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid post.", 400);
  const supabase = await createClient();
  let rows: Record<string, unknown>[] | null = null;
  {
    const { data, error } = await supabase
      .from("clan_comments")
      .select("id,post_id,author_id,body,parent_id,score,upvotes,downvotes,created_at")
      .eq("post_id", id)
      .eq("status", "visible")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(500);
    if (!error) {
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (/parent_id|score|upvotes|downvotes/i.test(String(error.message ?? ""))) {
      // Pre-migration DB: legacy columns only, zeroed vote fields.
      const legacy = await supabase
        .from("clan_comments")
        .select("id,post_id,author_id,body,created_at")
        .eq("post_id", id)
        .eq("status", "visible")
        .order("created_at", { ascending: true })
        .limit(500);
      if (legacy.error) {
        return dbFail("api/clans/post/[id]/comment GET", legacy.error, "Unable to load comments.");
      }
      rows = ((legacy.data ?? []) as Record<string, unknown>[]).map((c) => ({
        ...c,
        parent_id: null,
        score: 0,
        upvotes: 0,
        downvotes: 0,
      }));
    } else {
      return dbFail("api/clans/post/[id]/comment GET", error, "Unable to load comments.");
    }
  }
  const comments = rows ?? [];
  let myVotes: Record<string, number> = {};
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user && comments.length > 0) {
      const ids = comments.map((c) => String(c.id));
      const { data: votes } = await supabase
        .from("clan_votes")
        .select("target_id,value")
        .eq("target_type", "comment")
        .eq("user_id", auth.user.id)
        .in("target_id", ids);
      for (const v of ((votes ?? []) as { target_id: string; value: number }[])) {
        myVotes[v.target_id] = Number(v.value) || 0;
      }
    }
  } catch {
    myVotes = {};
  }
  return ok({ comments, myVotes });
}
