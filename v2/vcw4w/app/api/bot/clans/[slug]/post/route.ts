import { fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, resolveBotKey } from "@/lib/bot-auth";
import { cleanPostBody, cleanPostTitle, isImageUrl, isSlug, looksSpammy } from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const maxRequestBytes = 16384;

// POST /api/bot/clans/[slug]/post {title, body, image_url?}
// The bot acts AS the linked human account (author_id = linked user).
// Membership is required, exactly like humans. Spammy content lands in
// `pending` for human review instead of auto-publishing. Scope: clans:post.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Post is too large.", 413);
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

  const slug = isSlug((await ctx.params).slug);
  if (!slug) return fail("Invalid clan.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const title = cleanPostTitle(input.title);
  const postBody = cleanPostBody(input.body);
  if (!title) return fail("Title needs 1-120 characters.", 400);
  if (!postBody) return fail("Body needs 1-5000 characters.", 400);
  let imageUrl: string | null = null;
  if (input.image_url !== undefined && input.image_url !== null && input.image_url !== "") {
    if (!isImageUrl(input.image_url)) return fail("image_url must be an http(s) URL.", 400);
    imageUrl = String(input.image_url).trim();
  }

  try {
    const db = serviceClient();
    const { data: clanData, error: clanError } = await db
      .from("clans")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clanError) return fail("Unable to post.", 500);
    const clan = clanData as { id: string } | null;
    if (!clan) return fail("Clan not found.", 404);

    const { data: memberData } = await db
      .from("clan_members")
      .select("role")
      .eq("clan_id", clan.id)
      .eq("user_id", bot.userId)
      .maybeSingle();
    if (!memberData) return fail("Join the clan before posting.", 403);

    const status = looksSpammy(title, postBody) ? "pending" : "published";
    const { data: inserted, error: insertError } = await db
      .from("clan_posts")
      .insert({
        clan_id: clan.id,
        author_id: bot.userId,
        title,
        body: postBody,
        image_url: imageUrl,
        status,
      })
      .select("id,title,body,image_url,status,created_at")
      .single();
    if (insertError) return fail("Unable to post.", 500);
    return ok({ post: inserted }, 201);
  } catch {
    return fail("Unable to post.", 500);
  }
}
