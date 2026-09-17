import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";

/**
 * Legacy URL retained for old clients. Children never hold coins, so wallet
 * funding is permanently disabled. Authorized play charges parent funds
 * directly through the metering RPC.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  return fail("Child accounts do not hold coins. Parent coins are charged directly for authorized play.", 410);
}
