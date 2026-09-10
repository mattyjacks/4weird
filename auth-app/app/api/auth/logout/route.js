import { preflight, ok, methodOnly } from '../../../../lib/http.js';
import { anonClient } from '../../../../lib/supabase.js';
import { readTokens, clearAuthCookies } from '../../../../lib/session.js';

export async function POST(req) {
  const pre = preflight(req) || methodOnly(req, ['POST']);
  if (pre) return pre;
  try {
    const { access, refresh } = await readTokens();
    try {
      if (access || refresh) {
        await anonClient().auth.signOut();
      }
    } catch {
      // Server sign-out is best-effort; clearing cookies logs out regardless.
    }
  } finally {
    await clearAuthCookies();
  }
  return ok(req, { success: true });
}
