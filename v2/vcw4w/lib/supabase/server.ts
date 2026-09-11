import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/service";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Same resolution as lib/supabase/service.ts: the canonical
  // NEXT_PUBLIC_SUPABASE_* names win, the legacy auth-app SUPABASE_URL /
  // SUPABASE_ANON_KEY names are accepted as fallbacks. Without this, a deploy
  // carrying only legacy names builds a client with an undefined key: every
  // getUser() throws, so login-gated routes 401/500 AND the BotID
  // allowAuthenticated bypass silently never fires (flagged signed-in users
  // get 403 on paid work they should reach).
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
              }),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
