import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { mergeBuddyMemory } from "@/lib/buddy-memory";

export const dynamic = "force-dynamic";

const GAME_RE = /^[a-z0-9-]{1,64}$/;

/**
 * GET /api/buddy/memory?game_slug= - read your own opt-in memory for one game.
 * POST /api/buddy/memory - merge new lines into it (extractive only).
 * Body: { game_slug, session_id?, consent: true, text }.
 *
 * Explicit opt-in: POST without consent:true is rejected and stores nothing.
 * Never calls any AI: the merge is a plain-text rolling buffer
 * (lib/buddy-memory.ts); persistence goes through the SECURITY DEFINER RPCs
 * buddy_get_memory / buddy_save_memory (migration 20261101000000).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:memory:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, { "Retry-After": String(rl.retryAfter) });
  const game = new URL(req.url).searchParams.get("game_slug") ?? "lobby";
  if (!GAME_RE.test(game)) return fail("Invalid game_slug.", 400);
  try {
    const { data: memory, error } = await supabase.rpc("buddy_get_memory", { p_game: game });
    if (error) return rpcFail("api/buddy/memory:get", error, rpcStatus, "Unable to read memory.");
    return ok({ game_slug: game, memory: typeof memory === "string" ? memory : "" });
  } catch (error) {
    return dbFail("api/buddy/memory:get", error, "Unable to read memory.");
  }
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:memory:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const game = String(input.game_slug ?? input.game ?? "lobby");
  if (!GAME_RE.test(game)) return fail("Invalid game_slug.", 400);
  if (input.consent !== true) return fail("Memory needs explicit opt-in.", 400);
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);
  const text = String(input.text ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!text) return fail("Empty memory text.", 400);
  try {
    const { data: existing, error: readError } = await supabase.rpc("buddy_get_memory", {
      p_game: game,
    });
    if (readError) return rpcFail("api/buddy/memory:get", readError, rpcStatus, "Unable to read memory.");
    const merged = mergeBuddyMemory(typeof existing === "string" ? existing : "", [
      { role: "user", text },
    ]);
    const { data: saved, error: saveError } = await supabase.rpc("buddy_save_memory", {
      p_game: game,
      p_text: merged,
    });
    if (saveError) return rpcFail("api/buddy/memory:save", saveError, rpcStatus, "Unable to save memory.");
    return ok({ game_slug: game, memory: typeof saved === "string" ? saved : merged });
  } catch (error) {
    return dbFail("api/buddy/memory:save", error, "Unable to save memory.");
  }
}
