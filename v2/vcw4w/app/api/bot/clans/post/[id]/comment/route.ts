import { fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, resolveBotKey } from "@/lib/bot-auth";
import { cleanCommentBody } from "@/lib/bot-validate";
import { serviceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;

// POST /api/bot/clans/post/[id]/comment {body}
// Membership in the post's clan is required, exactly like humans.
// Scope: clans:comment.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Comment is too large.", 413);
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

  const postId = (await ctx.params).id;
  if (!isUuid(postId)) return fail("Invalid post.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const commentBody = cleanCommentBody((body as Record<string, unknown>)?.body);
  if (!commentBody) return fail("Body needs 1-2000 characters.", 400);

  try {
    const db = serviceClient();
    const { data: postData, error: postError } = await db
      .from("clan_posts")
      .select("id,clan_id")
      .eq("id", postId)
      .maybeSingle();
    if (postError) return fail("Unable to comment.", 500);
    const post = postData as { id: string; clan_id: string } | null;
    if (!post) return fail("Post not found.", 404);

    const { data: memberData } = await db
      .from("clan_members")
      .select("role")
      .eq("clan_id", post.clan_id)
      .eq("user_id", bot.userId)
      .maybeSingle();
    if (!memberData) return fail("Join the clan before commenting.", 403);

    const { data: inserted, error: insertError } = await db
      .from("clan_comments")
      .insert({ post_id: post.id, author_id: bot.userId, body: commentBody })
      .select("id,post_id,body,created_at")
      .single();
    if (insertError) return fail("Unable to comment.", 500);
    return ok({ comment: inserted }, 201);
  } catch {
    return fail("Unable to comment.", 500);
  }
}
