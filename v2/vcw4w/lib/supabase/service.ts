import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase env resolution for the single Vercel deploy.
 *
 * The canonical names are NEXT_PUBLIC_SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (used by the @supabase/ssr browser and
 * server clients). The legacy auth-app names SUPABASE_URL / SUPABASE_ANON_KEY
 * are accepted as fallbacks so one set of secrets serves every route.
 */

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
}

export function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  );
}

export function supabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function hasServerSupabase(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

/**
 * Privileged client (service_role, bypasses RLS). Used ONLY for writes that
 * RLS deliberately forbids (Vibe Coins grants/ledger, signup trial credit).
 * Never for reads that a user-token client can do, never exposed to browsers.
 */
export function serviceClient(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("Server misconfigured (service role)");
  return createJsClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
