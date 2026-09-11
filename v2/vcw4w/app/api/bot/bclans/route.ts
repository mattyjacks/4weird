import { dbFail, fail, ok } from "@/lib/api-respond";
import { BOT_SCOPES, botRateLimit, hasBotAuth, invalidCredentials, keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import { serviceClient } from "@/lib/supabase/service";
import { clampLimit, clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

interface ClanRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  clan_type: string;
  created_at: string;
  clan_members?: { count: number }[];
}

// GET /api/bot/bclans — list clans. Scope: clans:read.
// hclans are human-only: hidden from bot listings entirely.
export async function GET(req: Request) {
  if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
  const throttle = botRateLimit(req, "read");
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const bot = await resolveBotKey(req);
  if (!bot) return fail(invalidCredentials(), 401);
  if (!keyHasScope(bot, "clans:read")) return fail("Key lacks scope: clans:read.", 403);

  const q = new URL(req.url).searchParams;
  const limit = clampLimit(q.get("limit"), 25, 50);
  const rawOffset = Math.floor(Number(q.get("offset")) || 0);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.min(rawOffset, 1000)) : 0;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("clans")
      .select("id,slug,name,description,clan_type,created_at,clan_members(count)")
      .neq("clan_type", "hclan")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return dbFail("api/bot/bclans", error, "Unable to load clans.");
    const clans = ((data ?? []) as ClanRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      clan_type: row.clan_type ?? "sclan",
      created_at: row.created_at,
      member_count: row.clan_members?.[0]?.count ?? 0,
    }));
    void logBotKeyRequest({
      keyId: bot.keyId,
      userId: bot.userId,
      method: "GET",
      path: "/api/bot/bclans",
      status: 200,
      ip: clientIp(req),
      loggingMode: bot.loggingMode,
      parts: { responseSummary: { count: clans.length } },
    });
    return ok({ clans, scopes: [...BOT_SCOPES] });
  } catch (error) {
    return dbFail("api/bot/bclans", error, "Unable to load clans.");
  }
}
