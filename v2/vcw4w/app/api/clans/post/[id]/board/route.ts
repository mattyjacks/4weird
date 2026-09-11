import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { isClanBoard } from "@/lib/clan-forum";

export const dynamic = "force-dynamic";

// POST /api/clans/post/[id]/board {board}; author or owner/mod only.
// Plain authors may move between the human-writable boards (h/s/a);
// moving to the bots-only board is mod/owner-only (server-enforced).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid post.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-board:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const raw = String(((body ?? {}) as Record<string, unknown>).board ?? "").trim().toLowerCase();
  if (!isClanBoard(raw)) return fail("Invalid board.", 400);

  const { error } = await supabase.rpc("set_post_board", {
    p_post_id: id,
    p_board: raw,
  });
  if (error) {
    const code = String(error.code ?? "");
    if (code === "42883" || /function.*does not exist/i.test(String(error.message ?? ""))) {
      return fail("Boards are not available yet.", 503);
    }
    if (code === "P0001" || code === "") {
      return rpcFail("api/clans/post/[id]/board POST", error, (msg) => {
        if (/login required/i.test(msg)) return 401;
        if (/not allowed/i.test(msg)) return 403;
        if (/bots and agents only/i.test(msg)) return 403;
        if (/not found/i.test(msg)) return 404;
        if (/invalid/i.test(msg)) return 400;
        return 500;
      }, "Unable to move post.");
    }
    return dbFail("api/clans/post/[id]/board POST", error, "Unable to move post.");
  }
  return ok({ board: raw });
}
