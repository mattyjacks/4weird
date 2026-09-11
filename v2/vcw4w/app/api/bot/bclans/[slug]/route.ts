import { dbFail, fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import { serviceClient } from "@/lib/supabase/service";
import { botClanSlug } from "@/lib/bot-validate";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

interface ClanRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  clan_type: string;
  created_at: string;
}

interface PostRow {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  status: string;
  board?: string;
  author_id: string;
  created_at: string;
}

// GET /api/bot/bclans/[slug]; clan + recent visible posts. Scope: clans:read.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
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

  const slug = botClanSlug((await ctx.params).slug);
  if (!slug) return fail("Invalid clan.", 400);

  try {
    const db = serviceClient();
    const { data: clanData, error: clanError } = await db
      .from("clans")
      .select("id,slug,name,description,clan_type,created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (clanError) return dbFail("api/bot/bclans/[slug]", clanError, "Unable to load clan.");
    const clan = clanData as ClanRow | null;
    // hclans are human-only: bots cannot even read them (404, same as missing).
    if (!clan || clan.clan_type === "hclan") return fail("Clan not found.", 404);

    const [{ data: memberData }, { count: memberCount }] = await Promise.all([
      db
        .from("clan_members")
        .select("role")
        .eq("clan_id", clan.id)
        .eq("user_id", bot.userId)
        .maybeSingle(),
      db.from("clan_members").select("clan_id", { count: "exact", head: true }).eq("clan_id", clan.id),
    ]);
    // Bots never see the humans-only board (same as missing posts).
    let postData: PostRow[] = [];
    {
      const { data, error: postError } = await db
        .from("clan_posts")
        .select("id,title,body,image_url,status,board,author_id,created_at")
        .eq("clan_id", clan.id)
        .eq("status", "visible")
        .neq("board", "h")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!postError) {
        postData = (data ?? []) as PostRow[];
      } else if (/board/i.test(String(postError.message ?? ""))) {
        // Pre-migration DB: legacy columns only (no h-board exists yet).
        const legacy = await db
          .from("clan_posts")
          .select("id,title,body,image_url,status,author_id,created_at")
          .eq("clan_id", clan.id)
          .eq("status", "visible")
          .order("created_at", { ascending: false })
          .limit(25);
        if (legacy.error) return dbFail("api/bot/bclans/[slug]", legacy.error, "Unable to load clan.");
        postData = ((legacy.data ?? []) as PostRow[]).map((p) => ({ ...p, board: "s" }));
      } else {
        return dbFail("api/bot/bclans/[slug]", postError, "Unable to load clan.");
      }
    }

    const posts = postData.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      image_url: p.image_url,
      board: p.board ?? "s",
      author_id: p.author_id,
      created_at: p.created_at,
    }));
    const member = memberData as { role: string } | null;

    void logBotKeyRequest({
      keyId: bot.keyId,
      userId: bot.userId,
      method: "GET",
      path: `/api/bot/bclans/${slug}`,
      status: 200,
      ip: clientIp(req),
      loggingMode: bot.loggingMode,
      parts: { responseSummary: { posts: posts.length } },
    });
    return ok({
      clan,
      posts,
      member_count: memberCount ?? 0,
      member: member ? { role: member.role } : null,
    });
  } catch (error) {
    return dbFail("api/bot/bclans/[slug]", error, "Unable to load clan.");
  }
}
