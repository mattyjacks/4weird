import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { cookies } from "next/headers";
import { BOT_TESTER_COOKIE, FULL_LOGIN_COOKIE } from "@/lib/bot-auth";
import { clearKidSessionCookie } from "@/lib/kid-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  // NOTE: intentionally NO sameOrigin() check here (and the proxy exempts
  // this path too). Logout only destroys the caller's own session cookies —
  // a forged cross-site call can at worst log the victim out, never read or
  // change their data. Requiring Origin/Referer breaks logout for users
  // whose browser/extensions strip those headers, and the server-set
  // session cookies are httpOnly, so this route is the only path that can
  // clear them: blocking it strands the account logged in server-side
  // while the browser already looks logged out.
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
    try {
      // Bot tester sessions end here too: drop the restricted-session marker,
      // the full-login proof, and the kid bearer alongside the Supabase
      // cookies (otherwise they survive logout on shared family devices).
      // Also sweep any residual sb-* session cookies: signOut() above
      // clears what it manages, but an explicit delete guarantees no
      // chunk survives to keep the account logged in server-side.
      const jar = await cookies();
      for (const c of jar.getAll()) {
        if (c.name.startsWith("sb-")) jar.delete(c.name);
      }
      jar.delete(BOT_TESTER_COOKIE);
      jar.delete(FULL_LOGIN_COOKIE);
      try {
        const kid = clearKidSessionCookie();
        jar.set(kid.name, kid.value, { ...kid.options, maxAge: 0 });
      } catch {
        // best-effort
      }
    } catch {
      // best-effort
    }
  } finally {
    // The @supabase/ssr server client clears the session cookies on sign-out;
    // nothing extra to do here.
  }
  return ok({});
}
