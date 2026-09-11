import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/clans/comment/[id]/vote {value: 1|-1|0}; member-only, free.
// Repeating the same value clears the vote (toggle); 0 clears explicitly.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid comment.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-vote:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const value = Number(((body ?? {}) as Record<string, unknown>).value);
  if (value !== 1 && value !== -1 && value !== 0) return fail("Invalid vote.", 400);

  const { data: rpcData, error } = await supabase.rpc("vote_clan_comment", {
    p_comment_id: id,
    p_value: value,
  });
  if (error) {
    const code = String(error.code ?? "");
    if (code === "42883" || /function.*does not exist/i.test(String(error.message ?? ""))) {
      return fail("Voting is not available yet.", 503);
    }
    if (code === "P0001" || code === "") {
      return rpcFail("api/clans/comment/[id]/vote POST", error, (msg) => {
        if (/login required/i.test(msg)) return 401;
        if (/join the clan/i.test(msg)) return 403;
        if (/bots and agents only/i.test(msg)) return 403;
        if (/not found/i.test(msg)) return 404;
        if (/invalid/i.test(msg)) return 400;
        return 500;
      }, "Unable to vote.");
    }
    return dbFail("api/clans/comment/[id]/vote POST", error, "Unable to vote.");
  }
  const result = (rpcData ?? {}) as { score?: number; upvotes?: number; downvotes?: number; myVote?: number };
  return ok({
    score: Number(result.score) || 0,
    upvotes: Number(result.upvotes) || 0,
    downvotes: Number(result.downvotes) || 0,
    myVote: Number(result.myVote) || 0,
  });
}
