import { dbFail, fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, resolveBotKey } from "@/lib/bot-auth";
import { botClanSlug } from "@/lib/bot-validate";
import { exceedsBodyLimit } from "@/lib/validate";
import { logValleynetAction } from "@/lib/valleynet";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const maxRequestBytes = 4096;

// POST /api/bot/bclans/join {slug} — join a clan as the linked human account.
// Idempotent: joining twice still returns { joined: true }. Scope: clans:join.
export async function POST(req: Request) {
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
  if (exceedsBodyLimit(body, maxRequestBytes)) return fail("Request is too large.", 413);
  const slug = botClanSlug((body as Record<string, unknown>)?.slug);
  if (!slug) return fail("Invalid clan.", 400);

  try {
    const db = serviceClient();
    const { data: clanData, error: clanError } = await db
      .from("clans")
      .select("id,slug,name,clan_type")
      .eq("slug", slug)
      .maybeSingle();
    if (clanError) return dbFail("api/bot/bclans/join", clanError, "Unable to join clan.");
    const clan = clanData as { id: string; slug: string; name: string; clan_type?: string } | null;
    if (!clan) return fail("Clan not found.", 404);
    // hclans are human-only: bot joins are refused + logged by Valley Net.
    if (clan.clan_type === "hclan") {
      await logValleynetAction({
        clanId: clan.id,
        targetType: "join",
        verdict: "block",
        reasons: ["hclan-refused"],
        actorId: bot.userId,
      });
      return fail("hclans are human-only.", 403);
    }

    const { error: joinError } = await db.from("clan_members").upsert(
      { clan_id: clan.id, user_id: bot.userId, role: "member" },
      { onConflict: "clan_id,user_id", ignoreDuplicates: true },
    );
    if (joinError) return dbFail("api/bot/bclans/join", joinError, "Unable to join clan.");

    const { data: memberData, error: memberError } = await db
      .from("clan_members")
      .select("role,joined_at")
      .eq("clan_id", clan.id)
      .eq("user_id", bot.userId)
      .maybeSingle();
    if (memberError) return dbFail("api/bot/bclans/join", memberError, "Unable to join clan.");
    const member = memberData as { role: string; joined_at: string } | null;
    return ok({ joined: true, clan, member });
  } catch (error) {
    return dbFail("api/bot/bclans/join", error, "Unable to join clan.");
  }
}
