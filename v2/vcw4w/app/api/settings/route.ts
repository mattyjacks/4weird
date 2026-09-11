import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const fields = ["allow_friend_requests", "show_playtime", "marketing_email", "kids_mode"] as const;

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { data: row, error } = await supabase
    .from("account_settings")
    .select("allow_friend_requests,show_playtime,marketing_email,kids_mode,updated_at")
    .eq("user_id", u.id)
    .maybeSingle();
  if (error) return dbFail("api/settings", error);
  return ok({
    settings: row ?? { allow_friend_requests: true, show_playtime: true, marketing_email: false, kids_mode: false },
  });
}

export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`settings:${u.id}`, 20);
  if (!throttle.allowed) {
    return fail("Too many settings updates. Try again shortly.", 429, {
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
  const value: Record<string, unknown> = { user_id: u.id };
  for (const k of fields) {
    if (typeof input[k] !== "boolean") return fail("Invalid settings.", 400);
    value[k] = input[k];
  }
  const { error } = await supabase.from("account_settings").upsert(value, { onConflict: "user_id" });
  if (error) return fail("Unable to save settings.", 500);
  return ok({});
}
