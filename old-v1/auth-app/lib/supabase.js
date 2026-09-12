/** Supabase clients. RLS still enforces every user-token read. */
import { createClient } from '@supabase/supabase-js';

function env(name) {
  const v = process.env[name] || '';
  if (!v) throw new Error('Server misconfigured (missing ' + name + ')');
  return v;
}

const baseOpts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Anon client: sign-in/sign-up/getUser/refresh. No stored session. */
export function anonClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), baseOpts);
}

/**
 * Client acting AS the user (their access token in Authorization).
 * Postgres RLS policies apply normally - a server bug cannot widen reads.
 */
export function userClient(accessToken) {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    ...baseOpts,
    global: { headers: { Authorization: 'Bearer ' + accessToken } },
  });
}

/**
 * Privileged client (service_role, bypasses RLS). Used ONLY for Vibe Coins
 * grant/ledger writes that RLS deliberately forbids. Never for reads that
 * a user-token client can do, and never exposed to the browser.
 */
export function serviceClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), baseOpts);
}
