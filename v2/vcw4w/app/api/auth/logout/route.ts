import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  try {
    const supabase = await createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Server sign-out is best-effort; clearing cookies logs out regardless.
    }
  } finally {
    // The @supabase/ssr server client clears the session cookies on sign-out;
    // nothing extra to do here.
  }
  return ok({});
}
