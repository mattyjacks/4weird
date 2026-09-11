import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/love/profile?handle=; public 💌 Earned / Received / Given.
// Hidden profiles (shy opt-out) return is_public:false with zeroed counters.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`love-profile:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const handle = new URL(req.url).searchParams.get("handle")?.trim() ?? "";
  if (!handle) return fail("handle required.", 400);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("love_profile_stats", { p_handle: handle });
  if (error) {
    const msg = String(error.message ?? "");
    if (/not found/i.test(msg)) return fail("Player not found.", 404);
    if (/invalid/i.test(msg)) return fail("Invalid handle.", 400);
    return fail("Unable to load 💌 stats.", 500);
  }
  const row = (data as {
    display_name: string | null;
    public_handle: string | null;
    earned: number;
    received: number;
    given: number;
    is_public: boolean;
  }[] | null)?.[0] ?? null;
  if (!row) return fail("Player not found.", 404);
  return ok({ profile: row });
}
