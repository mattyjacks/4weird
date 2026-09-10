import { hasServerSupabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/service";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  try {
    // Public endpoint: use the anon client (no session) so anonymous
    // visitors can read aggregate player counts.
    const anon = createJsClient(supabaseUrl(), supabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await anon.rpc("game_chart_summary");
    if (error) return fail("Unable to load player counts.", 500);
    return ok({ games: data ?? [] });
  } catch {
    return fail("Analytics temporarily unavailable.", 503);
  }
}
