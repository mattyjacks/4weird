import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const throttle = rateLimit(`logout:${clientIp(req)}`, 30);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  try {
    const supabase = await createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Server sign-out is best-effort; clearing cookies logs out regardless.
    }
  } finally {
    // The @supabase/ssr server client clears the session cookies on sign-out;
    // nothing extra to do here.
  }
  return ok({});
}
