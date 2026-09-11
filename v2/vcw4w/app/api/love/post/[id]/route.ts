import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/love/post/[id]; public 💌 totals for a post.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await params;
  const postId = String(id ?? "").trim();
  if (!postId) return fail("Invalid post.", 400);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("love_post_totals", { p_post_id: postId });
  if (error) return dbFail("api/love/post", error);
  const row = (data as { gifts: number; awards: number; letters: number }[] | null)?.[0]
    ?? { gifts: 0, awards: 0, letters: 0 };
  return ok({ post_id: postId, gifts: row.gifts, awards: row.awards, letters: row.letters });
}
