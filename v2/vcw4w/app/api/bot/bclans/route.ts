import { dbFail, fail, ok } from "@/lib/api-respond";
import { BOT_SCOPES, botRateLimit, hasBotAuth, invalidCredentials, resolveBotKey } from "@/lib/bot-auth";
import { serviceClient } from "@/lib/supabase/service";
import { clampLimit } from "@/lib/validate";

export const dynamic = "force-dynamic";

interface ClanRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  clan_members?: { count: number }[];
}

// GET /api/bot/bclans — list clans. Scope: clans:read.
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

  const q = new URL(req.url).searchParams;
  const limit = clampLimit(q.get("limit"), 25, 50);
  const rawOffset = Math.floor(Number(q.get("offset")) || 0);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.min(rawOffset, 1000)) : 0;

  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("clans")
      .select("id,slug,name,description,created_at,clan_members(count)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return dbFail("api/bot/bclans", error, "Unable to load clans.");
    const clans = ((data ?? []) as ClanRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      member_count: row.clan_members?.[0]?.count ?? 0,
    }));
    return ok({ clans, scopes: [...BOT_SCOPES] });
  } catch (error) {
    return dbFail("api/bot/bclans", error, "Unable to load clans.");
  }
}
