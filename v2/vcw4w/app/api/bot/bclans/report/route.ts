import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { botRateLimit, extractBotKey, hasBotAuth, invalidCredentials, keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import {
  botClanSlug,
  cleanReportDetails,
  cleanTargetId,
  isReportCategory,
  isReportTarget,
} from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";
import { logValleynetAction } from "@/lib/valleynet";
import { clientIp, exceedsBodyLimit, isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;

// POST /api/bot/bclans/report {target_type, target_id, category, details?}
// Filed as the linked human account. Scope: clans:report.
//
// target_type 'clan' accepts a clan slug or uuid (stored as the clan uuid);
// 'post', 'comment', and 'image' require the row uuid and must exist.
// category='csam' quarantines a post/comment target immediately
// (status -> 'hidden', content preserved); the same guarantee the human
// file_report RPC gives. Clans and images have no status column, so the
// report row itself is the evidence record there.
export async function POST(req: Request) {
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
  if (!keyHasScope(bot, "clans:report")) return fail("Key lacks scope: clans:report.", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (exceedsBodyLimit(body, maxRequestBytes)) return fail("Report is too large.", 413);
  const input = (body ?? {}) as Record<string, unknown>;
  if (!isReportTarget(input.target_type)) {
    return fail("target_type must be clan, post, comment, or image.", 400);
  }
  const targetType = String(input.target_type);
  const rawTargetId = cleanTargetId(input.target_id);
  if (!rawTargetId) return fail("target_id is required.", 400);
  if (!isReportCategory(input.category)) {
    return fail("Invalid category.", 400);
  }
  const category = String(input.category);
  const details = cleanReportDetails(input.details);

  try {
    const db = serviceClient();

    // Resolve + verify the target before inserting, so reports against
    // missing rows get a 404 instead of a silent 201.
    let targetId: string;
    // The target's clan + board, for the same hclan/h-board refusal the
    // post and comment routes enforce: bots must not reach into
    // humans-only lanes even through the report path.
    let targetClanId: string | null = null;
    let targetBoard = "s";
    if (targetType === "clan") {
      if (isUuid(rawTargetId)) {
        const { data, error } = await db
          .from("clans")
          .select("id,clan_type")
          .eq("id", rawTargetId)
          .maybeSingle();
        if (error) return dbFail("api/bot/bclans/report", error, "Unable to file report.");
        if (!data) return fail("Target not found.", 404);
        targetId = rawTargetId;
        targetClanId = rawTargetId;
        if ((data as { clan_type?: string }).clan_type === "hclan") {
          await logValleynetAction({
            clanId: rawTargetId,
            targetType: "report",
            verdict: "block",
            reasons: ["hclan-refused"],
            actorId: bot.userId,
          });
          return fail("hclans are human-only.", 403);
        }
      } else {
        const slug = botClanSlug(rawTargetId);
        if (!slug) return fail("Invalid target.", 400);
        const { data, error } = await db
          .from("clans")
          .select("id,clan_type")
          .eq("slug", slug)
          .maybeSingle();
        if (error) return dbFail("api/bot/bclans/report", error, "Unable to file report.");
        const clan = data as { id: string; clan_type?: string } | null;
        if (!clan) return fail("Target not found.", 404);
        targetId = clan.id;
        targetClanId = clan.id;
        if (clan.clan_type === "hclan") {
          await logValleynetAction({
            clanId: clan.id,
            targetType: "report",
            verdict: "block",
            reasons: ["hclan-refused"],
            actorId: bot.userId,
          });
          return fail("hclans are human-only.", 403);
        }
      }
    } else if (targetType === "post") {
      if (!isUuid(rawTargetId)) return fail("Invalid target.", 400);
      const { data: postData, error: postError } = await db
        .from("clan_posts")
        .select("id,clan_id,board")
        .eq("id", rawTargetId)
        .maybeSingle();
      let post = postData as { id: string; clan_id: string; board?: string } | null;
      if (postError && /board/i.test(String(postError.message ?? ""))) {
        // Pre-migration DB: legacy columns only (no h-board exists yet).
        const legacy = await db
          .from("clan_posts")
          .select("id,clan_id")
          .eq("id", rawTargetId)
          .maybeSingle();
        if (legacy.error) return dbFail("api/bot/bclans/report", legacy.error, "Unable to file report.");
        post = (legacy.data as { id: string; clan_id: string } | null)
          ? { ...(legacy.data as { id: string; clan_id: string }), board: "s" }
          : null;
      } else if (postError) {
        return dbFail("api/bot/bclans/report", postError, "Unable to file report.");
      }
      if (!post) return fail("Target not found.", 404);
      targetId = rawTargetId;
      targetClanId = post.clan_id;
      targetBoard = post.board ?? "s";
    } else if (targetType === "comment") {
      if (!isUuid(rawTargetId)) return fail("Invalid target.", 400);
      const { data: commentData, error: commentError } = await db
        .from("clan_comments")
        .select("id,post_id")
        .eq("id", rawTargetId)
        .maybeSingle();
      let comment = commentData as { id: string; post_id?: string } | null;
      if (commentError && /post_id|column/i.test(String(commentError.message ?? ""))) {
        // Older schema without the post link: verify existence only.
        const legacy = await db.from("clan_comments").select("id").eq("id", rawTargetId).maybeSingle();
        if (legacy.error) return dbFail("api/bot/bclans/report", legacy.error, "Unable to file report.");
        comment = (legacy.data as { id: string } | null) ? { ...(legacy.data as { id: string }) } : null;
      } else if (commentError) {
        return dbFail("api/bot/bclans/report", commentError, "Unable to file report.");
      }
      if (!comment) return fail("Target not found.", 404);
      if (!comment.post_id) {
        // No post link to check lanes against: file against the row itself.
        targetId = rawTargetId;
        targetClanId = null;
      } else {
      const { data: parentData, error: parentError } = await db
        .from("clan_posts")
        .select("id,clan_id,board")
        .eq("id", comment.post_id)
        .maybeSingle();
      let parent = parentData as { id: string; clan_id: string; board?: string } | null;
      if (parentError && /board/i.test(String(parentError.message ?? ""))) {
        const legacy = await db
          .from("clan_posts")
          .select("id,clan_id")
          .eq("id", comment.post_id)
          .maybeSingle();
        if (legacy.error) return dbFail("api/bot/bclans/report", legacy.error, "Unable to file report.");
        parent = (legacy.data as { id: string; clan_id: string } | null)
          ? { ...(legacy.data as { id: string; clan_id: string }), board: "s" }
          : null;
      } else if (parentError) {
        return dbFail("api/bot/bclans/report", parentError, "Unable to file report.");
      }
      if (!parent) return fail("Target not found.", 404);
      targetId = rawTargetId;
      targetClanId = parent.clan_id;
      targetBoard = parent.board ?? "s";
      }
    } else {
      if (!isUuid(rawTargetId)) return fail("Invalid target.", 400);
      const { data, error } = await db.from("clan_images").select("id,clan_id").eq("id", rawTargetId).maybeSingle();
      let image = data as { id: string; clan_id?: string } | null;
      if (error && /clan_id|column/i.test(String(error.message ?? ""))) {
        // Older schema without the clan link: verify existence only.
        const legacy = await db.from("clan_images").select("id").eq("id", rawTargetId).maybeSingle();
        if (legacy.error) return dbFail("api/bot/bclans/report", legacy.error, "Unable to file report.");
        image = (legacy.data as { id: string } | null) ? { ...(legacy.data as { id: string }) } : null;
      } else if (error) {
        return dbFail("api/bot/bclans/report", error, "Unable to file report.");
      }
      if (!image) return fail("Target not found.", 404);
      targetId = rawTargetId;
      targetClanId = image.clan_id ?? null;
    }
    // Humans-only lanes refuse bots here exactly like the write routes.
    if (targetBoard === "h" && targetClanId) {
      await logValleynetAction({
        clanId: targetClanId,
        targetType: "report",
        verdict: "block",
        reasons: ["h-board-refused"],
        actorId: bot.userId,
      });
      return fail("This board is humans-only.", 403);
    }
    if (targetClanId) {
      const { data: clanData, error: clanError } = await db
        .from("clans")
        .select("clan_type")
        .eq("id", targetClanId)
        .maybeSingle();
      if (clanError) return dbFail("api/bot/bclans/report", clanError, "Unable to file report.");
      if ((clanData as { clan_type?: string } | null)?.clan_type === "hclan") {
        await logValleynetAction({
          clanId: targetClanId,
          targetType: "report",
          verdict: "block",
          reasons: ["hclan-refused"],
          actorId: bot.userId,
        });
        return fail("hclans are human-only.", 403);
      }
    }

    const { data: inserted, error } = await db
      .from("clan_reports")
      .insert({
        reporter_id: bot.userId,
        target_type: targetType,
        target_id: targetId,
        category,
        details,
        status: "open",
      })
      .select("id,target_type,target_id,category,created_at")
      .single();
    if (error) return dbFail("api/bot/bclans/report", error, "Unable to file report.");

    // CSAM auto-quarantine (mirrors file_report()): hide the target
    // immediately while preserving its content for the authority export.
    let hidden = false;
    if (category === "csam" && (targetType === "post" || targetType === "comment")) {
      const table = targetType === "post" ? "clan_posts" : "clan_comments";
      const { error: hideError } = await db.from(table).update({ status: "hidden" }).eq("id", targetId);
      if (hideError) return dbFail("api/bot/bclans/report", hideError, "Unable to file report.");
      hidden = true;
    }

    void logBotKeyRequest({
      keyId: bot.keyId,
      userId: bot.userId,
      method: "POST",
      path: "/api/bot/bclans/report",
      status: 201,
      ip: clientIp(req),
      loggingMode: bot.loggingMode,
      parts: {
        prompt: `${targetType}:${targetId}`,
        output: `${category}${hidden ? " (quarantined)" : ""}`,
        context: { target_type: targetType, category },
        responseSummary: { report: (inserted as { id?: string })?.id ?? null },
      },
    });
    return ok(
      {
        report: inserted,
        hidden,
        message:
          category === "csam"
            ? "Content quarantined and preserved for authorities."
            : "Report received for review.",
      },
      201,
    );
  } catch (error) {
    return dbFail("api/bot/bclans/report", error, "Unable to file report.");
  }
}
