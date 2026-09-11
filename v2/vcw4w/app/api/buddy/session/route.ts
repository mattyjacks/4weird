import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { BUDDY_DEFAULT_VOICE, cleanBuddyVoice } from "@/lib/game-ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/buddy/session; open/close a universal Gaming Buddy session.
 * Body: { action: "start", game_slug?, voice? } | { action: "end", session_id }.
 * Sessions group metered turns so the widget + /my/usage show live session
 * spend. Uses the start_buddy_session / end_buddy_session RPCs (writes only).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:session:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");
  if (action === "start") {
    const game = String(input.game_slug ?? input.game ?? "lobby").toLowerCase();
    const voice = cleanBuddyVoice(input.voice ?? BUDDY_DEFAULT_VOICE);
    if (!/^[a-z0-9-]{1,64}$/.test(game)) return fail("Invalid game_slug.", 400);
    try {
      const { data: session, error } = await supabase.rpc("start_buddy_session", {
        p_game: game,
        p_voice: voice,
      });
      if (error) return rpcFail("api/buddy/session:start", error, rpcStatus, "Unable to start session.");
      return ok({ session });
    } catch (error) {
      return dbFail("api/buddy/session:start", error, "Unable to start session.");
    }
  }
  if (action === "end") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    try {
      const { data: session, error } = await supabase.rpc("end_buddy_session", {
        p_session: sid,
      });
      if (error) return rpcFail("api/buddy/session:end", error, rpcStatus, "Unable to end session.");
      return ok({ session });
    } catch (error) {
      return dbFail("api/buddy/session:end", error, "Unable to end session.");
    }
  }
  return fail("Action must be start or end.", 400);
}
