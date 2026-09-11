import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { botRateLimit, hasBotAuth, invalidCredentials, keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import {
  botClanSlug,
  cleanReportDetails,
  cleanTargetId,
  isReportCategory,
  isReportTarget,
} from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";
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
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
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
    if (targetType === "clan") {
      if (isUuid(rawTargetId)) {
        const { data, error } = await db
          .from("clans")
          .select("id")
          .eq("id", rawTargetId)
          .maybeSingle();
        if (error) return dbFail("api/bot/bclans/report", error, "Unable to file report.");
        if (!data) return fail("Target not found.", 404);
        targetId = rawTargetId;
      } else {
        const slug = botClanSlug(rawTargetId);
        if (!slug) return fail("Invalid target.", 400);
        const { data, error } = await db
          .from("clans")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (error) return dbFail("api/bot/bclans/report", error, "Unable to file report.");
        const clan = data as { id: string } | null;
        if (!clan) return fail("Target not found.", 404);
        targetId = clan.id;
      }
    } else {
      if (!isUuid(rawTargetId)) return fail("Invalid target.", 400);
      const table =
        targetType === "post" ? "clan_posts" : targetType === "comment" ? "clan_comments" : "clan_images";
      const { data, error } = await db.from(table).select("id").eq("id", rawTargetId).maybeSingle();
      if (error) return dbFail("api/bot/bclans/report", error, "Unable to file report.");
      if (!data) return fail("Target not found.", 404);
      targetId = rawTargetId;
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
