import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clientIp } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { providerStatus } from "@/lib/compute";

export const dynamic = "force-dynamic";

/** Provider catalog with server-side configured flags (booleans only; no
 *  keys ever leave the server). Powers the configured/unconfigured badges. */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`agents:providers:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  return ok({ providers: providerStatus() });
}
