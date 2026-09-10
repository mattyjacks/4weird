import { fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, resolveBotKey } from "@/lib/bot-auth";
import {
  cleanReportDetails,
  cleanTargetId,
  isReportCategory,
  isReportTarget,
} from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;

// POST /api/bot/clans/report {target_type, target_id, category, details?}
// Filed as the linked human account. Scope: clans:report.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Report is too large.", 413);
  }
  if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
  const throttle = botRateLimit(req, "write");
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const bot = await resolveBotKey(req);
  if (!bot) return fail(invalidCredentials(), 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (!isReportTarget(input.target_type)) {
    return fail("target_type must be clan, post, or comment.", 400);
  }
  const targetId = cleanTargetId(input.target_id);
  if (!targetId) return fail("target_id is required.", 400);
  if (!isReportCategory(input.category)) {
    return fail("Invalid category.", 400);
  }
  const details = cleanReportDetails(input.details);

  try {
    const db = serviceClient();
    const { data: inserted, error } = await db
      .from("clan_reports")
      .insert({
        reporter_id: bot.userId,
        target_type: String(input.target_type),
        target_id: targetId,
        category: String(input.category),
        details,
        status: "open",
      })
      .select("id,target_type,target_id,category,created_at")
      .single();
    if (error) return fail("Unable to file report.", 500);
    return ok({ report: inserted }, 201);
  } catch {
    return fail("Unable to file report.", 500);
  }
}
