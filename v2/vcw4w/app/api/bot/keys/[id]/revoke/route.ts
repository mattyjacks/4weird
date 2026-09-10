import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

// POST /api/bot/keys/[id]/revoke — revoke one of the caller's own keys.
// Takes effect immediately. Supabase-login auth (NOT a bot key).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const throttle = rateLimit(`bot-keys-revoke:${data.user.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const keyId = (await ctx.params).id;
  if (!isUuid(keyId)) return fail("Invalid key.", 400);
  const { data: rpcData, error } = await supabase.rpc("revoke_bot_key", {
    p_key_id: keyId,
  });
  if (error) return fail("Unable to revoke key.", 500);
  if (rpcData !== true) return fail("Key not found.", 404);
  return ok({ revoked: true });
}
