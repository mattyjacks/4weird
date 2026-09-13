import { type NextRequest } from "next/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { clearKidSessionCookie, hashKidToken, hashKidTokenLegacy } from "@/lib/kid-session";

export const dynamic = "force-dynamic";

/** POST /api/family/kid-logout; destroy this child session + clear cookie. */
export async function POST(req: NextRequest) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const rl = rateLimit(`kid-logout:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return fail("Too many requests.", 429, { "Retry-After": String(rl.retryAfter) });
  const token = req.cookies.get("kid_session")?.value ?? "";
  if (/^[0-9a-f]{64}$/.test(token)) {
    try {
      const service = serviceClient();
      // Delete both hash forms: pre-hardening sessions live under the
      // legacy unpeppered hash and stay valid via fallback until expiry.
      const legacy = hashKidTokenLegacy(token);
      const peppered = hashKidToken(token);
      const { error } = await service
        .from("kid_sessions")
        .delete()
        .in("token_hash", legacy === peppered ? [peppered] : [peppered, legacy]);
      if (error) return dbFail("api/family/kid-logout", error, "Logout hiccup; try again.");
    } catch {
      return fail("Server misconfigured.", 500);
    }
  }
  const res = ok({});
  const cookie = clearKidSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
