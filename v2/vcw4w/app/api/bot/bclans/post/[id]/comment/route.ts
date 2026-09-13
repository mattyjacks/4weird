import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { botRateLimit, extractBotKey, hasBotAuth, invalidCredentials, keyHasScope, recordBotKeySpend, resolveBotKey } from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import { cleanCommentBody } from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";
import { clientIp, exceedsBodyLimit, isUuid } from "@/lib/validate";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";
import { meterLunaCheck } from "@/lib/clan-meter";
import { chargeClanFeeAs, FeeError } from "@/lib/clan-fees";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;

// POST /api/bot/bclans/post/[id]/comment {body}
// Membership in the post's clan is required, exactly like humans.
// Only visible posts accept comments: pending posts are still in review
// and hidden posts are quarantined. Scope: clans:comment.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
  // Cookie sessions (browsers) prove same-origin; bots prove a VALID key.
  // The header check is free (no KDF), so the scrypt verify below runs once.
  if (!extractBotKey(req) && !sameOrigin(req)) return fail("Invalid request origin.", 403);
  const throttle = botRateLimit(req, "write");
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const bot = await resolveBotKey(req);
  if (!bot) return fail(invalidCredentials(), 401);
  if (!keyHasScope(bot, "clans:comment")) return fail("Key lacks scope: clans:comment.", 403);

  const postId = (await ctx.params).id;
  if (!isUuid(postId)) return fail("Invalid post.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (exceedsBodyLimit(body, maxRequestBytes)) return fail("Comment is too large.", 413);
  const commentBody = cleanCommentBody((body as Record<string, unknown>)?.body);
  if (!commentBody) return fail("Body needs 1-2000 characters.", 400);

  try {
    const db = serviceClient();
    let post: { id: string; clan_id: string; status: string; board?: string } | null = null;
    {
      const { data: postData, error: postError } = await db
        .from("clan_posts")
        .select("id,clan_id,status,board")
        .eq("id", postId)
        .maybeSingle();
      if (!postError) {
        post = postData as typeof post;
      } else if (/board/i.test(String(postError.message ?? ""))) {
        // Pre-migration DB: legacy columns only (no h-board exists yet).
        const legacy = await db
          .from("clan_posts")
          .select("id,clan_id,status")
          .eq("id", postId)
          .maybeSingle();
        if (legacy.error) return dbFail("api/bot/bclans/post/[id]/comment", legacy.error, "Unable to comment.");
        const legacyPost = legacy.data as { id: string; clan_id: string; status: string } | null;
        post = legacyPost ? { ...legacyPost, board: "s" } : null;
      } else {
        return dbFail("api/bot/bclans/post/[id]/comment", postError, "Unable to comment.");
      }
    }
    if (!post) return fail("Post not found.", 404);
    if (post.status !== "visible") return fail("Post not found.", 404);
    // The humans-only board refuses bot comments, same as an hclan.
    if ((post.board ?? "s") === "h") {
      await logValleynetAction({
        clanId: post.clan_id,
        targetType: "comment",
        verdict: "block",
        reasons: ["h-board-refused"],
        actorId: bot.userId,
      });
      return fail("This board is humans-only.", 403);
    }

    const { data: memberData, error: memberError } = await db
      .from("clan_members")
      .select("role")
      .eq("clan_id", post.clan_id)
      .eq("user_id", bot.userId)
      .maybeSingle();
    if (memberError) return dbFail("api/bot/bclans/post/[id]/comment", memberError, "Unable to comment.");
    if (!memberData) return fail("Join the clan before commenting.", 403);

    // hclans are human-only (looked up through the post's clan).
    const { data: clanData, error: clanError } = await db
      .from("clans")
      .select("clan_type")
      .eq("id", post.clan_id)
      .maybeSingle();
    if (clanError) return dbFail("api/bot/bclans/post/[id]/comment", clanError, "Unable to comment.");
    if ((clanData as { clan_type?: string } | null)?.clan_type === "hclan") {
      await logValleynetAction({
        clanId: post.clan_id,
        targetType: "comment",
        verdict: "block",
        reasons: ["hclan-refused"],
        actorId: bot.userId,
      });
      return fail("hclans are human-only.", 403);
    }

    const valley = await valleynetCheck(commentBody);
    void meterLunaCheck(db, post.clan_id, 1);
    if (valley.verdict === "block") {
      await logValleynetAction({
        clanId: post.clan_id,
        targetType: "comment",
        verdict: "block",
        reasons: valley.reasons,
        actorId: bot.userId,
      });
      return fail("Valley Net blocked this comment (spam shield).", 403);
    }
    if (valley.verdict === "quarantine") {
      await logValleynetAction({
        clanId: post.clan_id,
        targetType: "comment",
        verdict: "quarantine",
        reasons: valley.reasons,
        actorId: bot.userId,
      });
    }
    const commentStatus = valley.verdict === "quarantine" ? "pending" : "visible";

    const feeBytes = new TextEncoder().encode(commentBody).length;
    let feeCoins = 0;
    try {
      const charged = await chargeClanFeeAs(db, {
        userId: bot.userId,
        clanId: post.clan_id,
        kind: "comment",
        bytes: feeBytes,
        hasImage: false,
      });
      feeCoins = charged.fee;
      void recordBotKeySpend(bot.keyId, charged.fee);
    } catch (err) {
      if (err instanceof FeeError) {
        if (err.code === "delinquent")
          return fail("This clan's upkeep is delinquent; commenting is paused until it is funded.", 402);
        return fail("Insufficient Vibe Coins for the server-cost fee.", 402);
      }
      return dbFail("api/bot/bclans/post/[id]/comment", err, "Unable to comment.");
    }

    const { data: inserted, error: insertError } = await db
      .from("clan_comments")
      .insert({ post_id: post.id, author_id: bot.userId, body: commentBody, status: commentStatus })
      .select("id,post_id,body,status,created_at")
      .single();
    if (insertError) return dbFail("api/bot/bclans/post/[id]/comment", insertError, "Unable to comment.");
    void logBotKeyRequest({
      keyId: bot.keyId,
      userId: bot.userId,
      method: "POST",
      path: `/api/bot/bclans/post/${postId}/comment`,
      status: 201,
      ip: clientIp(req),
      coinsSpent: feeCoins,
      loggingMode: bot.loggingMode,
      parts: {
        prompt: postId,
        output: commentBody,
        context: { clan_id: post.clan_id, status: commentStatus },
        responseSummary: { comment: (inserted as { id?: string })?.id ?? null },
      },
    });
    return ok({ comment: inserted }, 201);
  } catch (error) {
    return dbFail("api/bot/bclans/post/[id]/comment", error, "Unable to comment.");
  }
}
