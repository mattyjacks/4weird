import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isGameAiKind, GAME_AI_CUT_NOTE } from "@/lib/game-ai";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/**
 * POST /api/game-ai/meter — meter game AI compute (dialogue bot, AI
 * director, TTS, rented RunPod GPU, inference) with the same 25% cut.
 * Body: { game_slug, kind, qty, session_id?, source? }.
 * The meter_game_ai_usage RPC debits gross coins, splits 25/75, records it.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`game-ai:meter:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const game = String(input.game_slug ?? input.game ?? "").toLowerCase();
  const kind = String(input.kind ?? "");
  const qty = Number(input.qty ?? 0);
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  const sourceRaw = String(input.source ?? "meter");
  if (!/^[a-z0-9-]{1,64}$/.test(game)) return fail("Invalid game_slug.", 400);
  if (!isGameAiKind(kind)) return fail("Invalid kind.", 400);
  if (!Number.isFinite(qty) || qty <= 0 || qty > 100000000) return fail("Invalid qty.", 400);
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);
  if (!["meter", "chat", "tts", "heartbeat", "manual"].includes(sourceRaw)) {
    return fail("Invalid source.", 400);
  }
  const { data: result, error } = await supabase.rpc("meter_game_ai_usage", {
    p_game: game,
    p_kind: kind,
    p_qty: qty,
    p_session: sessionRaw,
    p_source: sourceRaw,
  });
  if (error) return fail(error.message || "Unable to meter game AI.", rpcStatus(error.message));
  return ok({ usage: result, note: GAME_AI_CUT_NOTE });
}
