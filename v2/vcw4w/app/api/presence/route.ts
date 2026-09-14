import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug } from "@/lib/validate";


export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`presence:${u.id}`, 60);
  if (!throttle.allowed) {
    return fail("Too many presence updates. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const game = isSlug((body as Record<string, unknown> | null)?.game_slug);
  if (!game) return fail("Invalid game.", 400);
  const role = (u.app_metadata as Record<string, unknown> | null)?.role;
  const kind = role === "vibecodeworker" ? "vibecodeworker" : "human";
  const { error } = await supabase.from("game_presence").upsert(
    { user_id: u.id, game_slug: game, actor_kind: kind, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id,game_slug" },
  );
  if (error) {
    // Presence is best-effort telemetry (the game_presence table ships in a
    // later migration than this route); a prod DB that hasn't applied it yet
    // (42P01 / PGRST205 / missing-table) should read as recorded:false,
    // not a 500. Real DB faults still 500 via dbFail (server-side evidence,
    // stable public text, no PII).
    const code = String((error as { code?: unknown }).code ?? "");
    const msg = String((error as { message?: unknown }).message ?? "");
    if (code === "42P01" || code === "PGRST205" || /game_presence.*(does not exist|could not find)/i.test(msg)) {
      console.error("[api] api/presence game_presence table missing, returning recorded:false", { code: code.slice(0, 16) });
      return ok({ recorded: false });
    }
    return dbFail("api/presence", error, "Unable to record presence.");
  }
  return ok({ actor_kind: kind });
}
