import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { LOVE_AWARD_TIERS, isLoveAwardTier } from "@/lib/love-letters";

export const dynamic = "force-dynamic";

function mapErr(msg: string) {
  if (/login required/i.test(msg)) return fail("Login required.", 401);
  if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
  if (/own post/i.test(msg)) return fail("You cannot award your own post.", 400);
  if (/not enough/i.test(msg)) return fail("Not enough 💌 for that award. Earn more via daily bonus + clan quests + loved posts.", 402);
  if (/invalid award/i.test(msg)) return fail("Invalid award tier.", 400);
  if (/not found/i.test(msg)) return fail("Post not found.", 404);
  if (/not available|invalid/i.test(msg)) return fail("Post not available for awards.", 400);
  return fail("Unable to award 💌.", 500);
}

// POST /api/love/award {post_id, tier: spotlight|superstar|legend}
// Advanced awards cost 2/5/10 💌, all moving giver -> author. Never coins.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`love-award:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const postId = String(input.post_id ?? "").trim();
  const tier = String(input.tier ?? "").trim().toLowerCase();
  if (!postId) return fail("post_id required.", 400);
  if (!isLoveAwardTier(tier)) return fail("Invalid award tier.", 400);
  const { error } = await supabase.rpc("award_love_letter", { p_post_id: postId, p_tier: tier });
  if (error) return mapErr(String(error.message ?? ""));
  return ok({ post_id: postId, tier, cost: LOVE_AWARD_TIERS[tier].cost }, 201);
}
