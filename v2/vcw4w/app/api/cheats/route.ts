import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug, isSlot } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const q = new URL(req.url).searchParams;
  if (q.get("scope") === "all") {
    const { data: row, error } = await supabase
      .from("global_cheat_settings")
      .select("enabled")
      .eq("user_id", u.id)
      .maybeSingle();
    if (error) return dbFail("api/cheats", error);
    return ok({ enabled: Boolean((row as { enabled?: boolean } | null)?.enabled) });
  }
  const game = isSlug(q.get("game"));
  const slot = isSlot(q.get("slot"));
  if (!game || !slot) return fail("Invalid cheat setting.", 400);
  const [{ data: row, error }, { data: global }] = await Promise.all([
    supabase
      .from("cheat_settings")
      .select("enabled,cheated_at")
      .eq("user_id", u.id)
      .eq("game_slug", game)
      .eq("slot", slot)
      .maybeSingle(),
    supabase.from("global_cheat_settings").select("enabled").eq("user_id", u.id).maybeSingle(),
  ]);
  if (error) return dbFail("api/cheats", error);
  const typed = row as { enabled?: boolean; cheated_at?: string | null } | null;
  const globalTyped = global as { enabled?: boolean } | null;
  return ok({
    enabled: Boolean(typed?.enabled) || Boolean(globalTyped?.enabled),
    cheat_mode: Boolean(typed?.cheated_at),
  });
}

export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`cheat:${u.id}`, 30);
  if (!throttle.allowed) {
    return fail("Too many cheat-setting updates. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (input.scope === "all") {
    if (typeof input.enabled !== "boolean") return fail("Invalid cheat setting.", 400);
    const { error } = await supabase
      .from("global_cheat_settings")
      .upsert({ user_id: u.id, enabled: input.enabled }, { onConflict: "user_id" });
    if (error) return fail("Unable to update cheat setting.", 500);
    return ok({ global: true });
  }
  const game = isSlug(input.game_slug);
  const slot = isSlot(input.slot);
  if (!game || !slot || typeof input.enabled !== "boolean") return fail("Invalid cheat setting.", 400);
  const { data: rpcData, error } = await supabase.rpc("set_cheat_setting", {
    p_game: game,
    p_slot: slot,
    p_enabled: input.enabled,
  });
  if (error) return fail("Unable to update cheat setting.", 500);
  return ok({ cheat_mode: Boolean(rpcData) });
}
