import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { botTesterBlocked, isBotTester, privilegedSessionBlocked } from "@/lib/bot-auth";
import { clientIp } from "@/lib/validate";


const fields = ["allow_friend_requests", "show_playtime", "marketing_email", "kids_mode"] as const;

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const ipThrottle = rateLimit(`settings-get-ip:${clientIp(req)}`, 60, 60_000);
  if (!ipThrottle.allowed) return fail("Rate limited.", 429);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const userThrottle = rateLimit(`settings-get:${u.id}`, 60, 60_000);
  if (!userThrottle.allowed) {
    return fail("Too many settings reads. Try again shortly.", 429, {
      "Retry-After": String(userThrottle.retryAfter),
    });
  }
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
  // Bot tester sessions (POST /api/bot/login email+password) can play but
  // never change account settings. Mirrors PATCH /api/me/profile:
  // stripping the tester cookie alone does not escalate (full-login proof
  // required).
  if (isBotTester(req)) return fail(botTesterBlocked(), 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  {
    const blocked = privilegedSessionBlocked(req, u.id);
    if (blocked) {
      const status = blocked === botTesterBlocked() ? 403 : 401;
      return fail(blocked, status);
    }
  }
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
