import { fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, resolveBotKey } from "@/lib/bot-auth";
import { isSlug } from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const maxRequestBytes = 4096;

// POST /api/bot/clans/join {slug} — join a clan as the linked human account.
// Idempotent: joining twice still returns { joined: true }. Scope: clans:join.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Request is too large.", 413);
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
  const slug = isSlug((body as Record<string, unknown>)?.slug);
  if (!slug) return fail("Invalid clan.", 400);

  try {
    const db = serviceClient();
    const { data: clanData, error: clanError } = await db
      .from("clans")
      .select("id,slug,name")
      .eq("slug", slug)
      .maybeSingle();
    if (clanError) return fail("Unable to join clan.", 500);
    const clan = clanData as { id: string; slug: string; name: string } | null;
    if (!clan) return fail("Clan not found.", 404);

    const { error: joinError } = await db.from("clan_members").upsert(
      { clan_id: clan.id, user_id: bot.userId, role: "member" },
      { onConflict: "clan_id,user_id", ignoreDuplicates: true },
    );
    if (joinError) return fail("Unable to join clan.", 500);

    const { data: memberData } = await db
      .from("clan_members")
      .select("role,joined_at")
      .eq("clan_id", clan.id)
      .eq("user_id", bot.userId)
      .maybeSingle();
    const member = memberData as { role: string; joined_at: string } | null;
    return ok({ joined: true, clan, member });
  } catch {
    return fail("Unable to join clan.", 500);
  }
}
