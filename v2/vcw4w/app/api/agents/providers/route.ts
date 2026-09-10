import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { providerStatus } from "@/lib/compute";

export const dynamic = "force-dynamic";

/** Provider catalog with server-side configured flags (booleans only — no
 *  keys ever leave the server). Powers the configured/unconfigured badges. */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  return ok({ providers: providerStatus() });
}
