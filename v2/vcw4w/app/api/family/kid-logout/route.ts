import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clearKidSessionCookie, hashKidToken } from "@/lib/kid-session";

export const dynamic = "force-dynamic";

/** POST /api/family/kid-logout — destroy this child session + clear cookie. */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const token = req.cookies.get("kid_session")?.value ?? "";
  if (/^[0-9a-f]{64}$/.test(token)) {
    try {
      const service = serviceClient();
      const { error } = await service.from("kid_sessions").delete().eq("token_hash", hashKidToken(token));
      if (error) return dbFail("api/family/kid-logout", error, "Logout hiccup — try again.");
    } catch {
      return fail("Server misconfigured.", 500);
    }
  }
  const res = ok({});
  const cookie = clearKidSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
