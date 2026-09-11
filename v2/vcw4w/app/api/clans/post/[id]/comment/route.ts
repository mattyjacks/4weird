import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";

export const dynamic = "force-dynamic";

// POST /api/clans/post/[id]/comment — member-only, Luna-moderated.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid post.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-comment:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const text = String(((body ?? {}) as Record<string, unknown>).body ?? "").trim().slice(0, 2000);
  if (!text) return fail("Comment body required.", 400);
  const { data: parent } = await supabase.from("clan_posts").select("clan_id").eq("id", id).maybeSingle();
  const clanId = (parent as { clan_id?: string } | null)?.clan_id;
  if (!clanId) return fail("Post not found.", 404);

  const valley = await valleynetCheck(text);
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
  const mod = await moderateText(text);
  const status = valley.verdict === "quarantine" || !mod.allowed || mod.heuristicHit ? "pending" : "visible";
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
      return fail("This clan's upkeep is delinquent — commenting is paused until it is funded.", 402);
    if (/insufficient balance/i.test(msg))
      return fail("Insufficient Vibe Coins for the server-cost fee.", 402);
    return fail("Unable to charge the server-cost fee.", 500);
  }

  const { data: rpcData, error } = await supabase.rpc("create_comment", {
    p_post_id: id,
    p_body: text,
    p_status: status,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/not found/i.test(msg)) return fail("Post not found.", 404);
    if (/invalid/i.test(msg)) return fail("Invalid comment.", 400);
    return fail("Unable to comment.", 500);
  }
  try {
    await supabase.rpc("award_clan_xp", { p_clan_id: clanId, p_reason: "comment", p_xp: 3 });
  } catch {
    // XP is garnish, never a comment failure.
  }
  const commentId = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as string;
  return ok({ id: commentId, status }, 201);
}
