import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { clientIp, isEmail, isLoginPassword } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/auth/login");
  if (botBlock) return botBlock;
  const throttle = rateLimit(`login:${clientIp(req)}`, 10);
  if (!throttle.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, {
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
  const email = isEmail(input.email);
  // Length-shape only: strength is enforced at signup/change, and pre-rule
  // accounts must still be able to present their existing password here.
  const password = isLoginPassword(input.password);
  // Generic message either way: no oracle for which half was wrong.
  if (!email || !password) return fail("Invalid login credentials.", 401);
  // Per-account throttle survives IP rotation during credential stuffing.
  const accountThrottle = rateLimit(`login-email:${email}`, 10);
  if (!accountThrottle.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, {
      "Retry-After": String(accountThrottle.retryAfter),
    });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session?.user) return fail("Invalid login credentials.", 401);
    const u = data.session.user;
    return ok({ user: { id: u.id, email: u.email } });
  } catch {
    return fail("internal error", 500);
  }
}
