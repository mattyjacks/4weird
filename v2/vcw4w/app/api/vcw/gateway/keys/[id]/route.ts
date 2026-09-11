import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/vcw/gateway/keys/[id]; revoke one gateway key.
 *
 * Auth: Supabase session (owner only) + sameOrigin. Revocation is
 * immediate: resolveVcwCaller() reads `revoked` from the database on every
 * request, so a revoked key fails closed on its next use. The secret itself
 * is never needed to revoke (only the row id), and hashes never leave.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:gateway:keys:revoke:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const { id } = await ctx.params;
  if (!isUuid(id)) return fail("Invalid key id.", 400);

  try {
    const db = serviceClient();
    const { data: row, error } = await db
      .from("vcw_api_keys")
      .update({ revoked: true })
      .eq("id", id)
      .eq("user_id", data.user.id)
      .eq("revoked", false)
      .select("id")
      .maybeSingle();
    if (error) return dbFail("vcw/gateway/keys revoke", error, "Unable to revoke key.");
    if (!row) return fail("Key not found or already revoked.", 404);
    return ok({ revoked: true, id });
  } catch (error) {
    return dbFail("vcw/gateway/keys revoke", error, "Unable to revoke key.");
  }
}
