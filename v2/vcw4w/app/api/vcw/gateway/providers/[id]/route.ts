import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/vcw/gateway/providers/[id]; remove one BYOK ref.
 *
 * Auth: Supabase session (owner only) + sameOrigin. Refs carry no secrets,
 * so deletion is just unlinking a routing pointer; dispatches already
 * recorded keep their quote rows (provider_id SET NULL via FK).
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:gateway:providers:del:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const { id } = await ctx.params;
  if (!isUuid(id)) return fail("Invalid provider id.", 400);

  try {
    const db = serviceClient();
    const { data: row, error } = await db
      .from("vcw_byok_providers")
      .delete()
      .eq("id", id)
      .eq("user_id", data.user.id)
      .select("id")
      .maybeSingle();
    if (error) return dbFail("vcw/gateway/providers delete", error, "Unable to delete provider.");
    if (!row) return fail("Provider not found.", 404);
    return ok({ deleted: true, id });
  } catch (error) {
    return dbFail("vcw/gateway/providers delete", error, "Unable to delete provider.");
  }
}
