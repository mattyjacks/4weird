import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { botRateLimit, extractBotKey, hasBotAuth, invalidCredentials, keyHasScope, recordBotKeySpend, resolveBotKey } from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import { botClanSlug, cleanPostBody, cleanPostTitle, isOwnClanImageUrl, looksSpammy } from "@/lib/bot-validate";
import { isClanBoard } from "@/lib/clan-forum";
import { clientIp, exceedsBodyLimit } from "@/lib/validate";
import { serviceClient, supabaseUrl } from "@/lib/supabase/service";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";
import { meterLunaCheck } from "@/lib/clan-meter";
import { chargeClanFeeAs, FeeError } from "@/lib/clan-fees";

export const dynamic = "force-dynamic";

const maxRequestBytes = 16384;

// POST /api/bot/bclans/[slug]/post {title, body, image_url?}
// The bot acts AS the linked human account (author_id = linked user).
// Membership is required, exactly like humans. Spammy content lands in
// `pending` for human review instead of auto-publishing. Scope: clans:post.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
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
  if (!keyHasScope(bot, "clans:post")) return fail("Key lacks scope: clans:post.", 403);

  const slug = botClanSlug((await ctx.params).slug);
  if (!slug) return fail("Invalid clan.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (exceedsBodyLimit(body, maxRequestBytes)) return fail("Post is too large.", 413);
  const input = (body ?? {}) as Record<string, unknown>;
  const title = cleanPostTitle(input.title);
  const postBody = cleanPostBody(input.body);
  if (!title) return fail("Title needs 1-120 characters.", 400);
  if (!postBody) return fail("Body needs 1-5000 characters.", 400);
  // Board pick: bots post to s/b/a (default shared). The humans-only board
  // refuses bot authors before any fee or moderation spend happens.
  const rawBoard = String(input.board ?? "s").trim().toLowerCase();
  if (!isClanBoard(rawBoard)) return fail("Invalid board.", 400);
  let imageUrl: string | null = null;
  if (input.image_url !== undefined && input.image_url !== null && input.image_url !== "") {
    // Same rule as the human clan UI: only our own upload URLs render in
    // <img> tags. External URLs would be tracking beacons.
    if (!isOwnClanImageUrl(input.image_url, supabaseUrl())) {
      return fail("image_url must come from /api/clans/upload.", 400);
    }
    imageUrl = String(input.image_url).trim();
  }

  try {
    const db = serviceClient();
    const { data: clanData, error: clanError } = await db
      .from("clans")
      .select("id,clan_type")
      .eq("slug", slug)
      .maybeSingle();
    if (clanError) return dbFail("api/bot/bclans/[slug]/post", clanError, "Unable to post.");
    const clan = clanData as { id: string; clan_type?: string } | null;
    if (!clan) return fail("Clan not found.", 404);
    // hclans are human-only: bot writes are refused + logged by Valley Net.
    if (clan.clan_type === "hclan") {
      await logValleynetAction({
        clanId: clan.id,
        targetType: "post",
        verdict: "block",
        reasons: ["hclan-refused"],
        actorId: bot.userId,
      });
      return fail("hclans are human-only.", 403);
    }
    // The humans-only board refuses bot authors, same as an hclan.
    if (rawBoard === "h") {
      await logValleynetAction({
        clanId: clan.id,
        targetType: "post",
        verdict: "block",
        reasons: ["h-board-refused"],
        actorId: bot.userId,
      });
      return fail("This board is humans-only.", 403);
    }

    const { data: memberData, error: memberError } = await db
      .from("clan_members")
      .select("role")
      .eq("clan_id", clan.id)
      .eq("user_id", bot.userId)
      .maybeSingle();
    if (memberError) return dbFail("api/bot/bclans/[slug]/post", memberError, "Unable to post.");
    if (!memberData) return fail("Join the clan before posting.", 403);

    // Valley Net automod: block refuses + logs, quarantine forces pending.
    const valley = await valleynetCheck(`${title}\n${postBody}`);
    void meterLunaCheck(db, clan.id, 1);
    if (valley.verdict === "block") {
      await logValleynetAction({
        clanId: clan.id,
        targetType: "post",
        verdict: "block",
        reasons: valley.reasons,
        actorId: bot.userId,
      });
      return fail("Valley Net blocked this post (spam shield).", 403);
    }
    const status =
      valley.verdict === "quarantine" || looksSpammy(title, postBody) ? "pending" : "visible";
    if (status === "pending") {
      await logValleynetAction({
        clanId: clan.id,
        targetType: "post",
        verdict: "quarantine",
        reasons: valley.reasons.length ? valley.reasons : ["spam-triage"],
        actorId: bot.userId,
      });
    }

    // Server-cost fee on the linked human's coins (min 1 centicentcoin).
    // The fee also meters against this key's lifetime/daily budgets.
    const feeBytes = new TextEncoder().encode(`${title}\n${postBody}`).length;
    let feeCoins = 0;
    try {
      const charged = await chargeClanFeeAs(db, {
        userId: bot.userId,
        clanId: clan.id,
        kind: "post",
        bytes: feeBytes,
        hasImage: Boolean(imageUrl),
      });
      feeCoins = charged.fee;
      void recordBotKeySpend(bot.keyId, charged.fee);
    } catch (err) {
      if (err instanceof FeeError) {
        if (err.code === "delinquent")
          return fail("This clan's upkeep is delinquent; posting is paused until it is funded.", 402);
        return fail("Insufficient Vibe Coins for the server-cost fee.", 402);
      }
      return dbFail("api/bot/bclans/[slug]/post", err, "Unable to post.");
    }

    const row = {
      clan_id: clan.id,
      author_id: bot.userId,
      title,
      body: postBody,
      image_url: imageUrl,
      status,
      board: rawBoard,
    };
    let inserted: unknown = null;
    {
      const { data, error: insertError } = await db
        .from("clan_posts")
        .insert(row)
        .select("id,title,body,image_url,board,status,created_at")
        .single();
      if (!insertError) {
        inserted = data;
      } else if (/board/i.test(String(insertError.message ?? ""))) {
        // Pre-migration DB: retry without the board column.
        const { board: _dropped, ...legacyRow } = row;
        void _dropped;
        const retry = await db
          .from("clan_posts")
          .insert(legacyRow)
          .select("id,title,body,image_url,status,created_at")
          .single();
        if (retry.error) return dbFail("api/bot/bclans/[slug]/post", retry.error, "Unable to post.");
        inserted = retry.data;
      } else {
        return dbFail("api/bot/bclans/[slug]/post", insertError, "Unable to post.");
      }
    }
    void logBotKeyRequest({
      keyId: bot.keyId,
      userId: bot.userId,
      method: "POST",
      path: `/api/bot/bclans/${slug}/post`,
      status: 201,
      ip: clientIp(req),
      coinsSpent: feeCoins,
      loggingMode: bot.loggingMode,
      parts: {
        prompt: title,
        output: postBody,
        context: { clan: slug, status, board: rawBoard, image: Boolean(imageUrl) },
        responseSummary: { post: (inserted as { id?: string })?.id ?? null },
      },
    });
    return ok({ post: inserted }, 201);
  } catch (error) {
    return dbFail("api/bot/bclans/[slug]/post", error, "Unable to post.");
  }
}
