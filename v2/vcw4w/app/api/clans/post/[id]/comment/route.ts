import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";

export const dynamic = "force-dynamic";

// POST /api/clans/post/[id]/comment — member-only, Luna-moderated.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid post.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-comment:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const text = String(((body ?? {}) as Record<string, unknown>).body ?? "").trim().slice(0, 2000);
  if (!text) return fail("Comment body required.", 400);
  const mod = await moderateText(text);
  const status = mod.allowed && !mod.heuristicHit ? "visible" : "pending";
  const { data: rpcData, error } = await supabase.rpc("create_comment", {
    p_post_id: id,
    p_body: text,
    p_status: status,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/not found/i.test(msg)) return fail("Post not found.", 404);
    if (/invalid/i.test(msg)) return fail("Invalid comment.", 400);
    return fail("Unable to comment.", 500);
  }
  const commentId = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as string;
  return ok({ id: commentId, status }, 201);
}
