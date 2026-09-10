import { preflight, ok, fail, methodOnly, clientIp } from '../../../../lib/http.js';
import { isEmail, isPassword } from '../../../../lib/validate.js';
import { anonClient } from '../../../../lib/supabase.js';
import { setAuthCookies, publicUser } from '../../../../lib/session.js';
import { overLimit } from '../../../../lib/ratelimit.js';

export async function POST(req) {
  const pre = preflight(req) || methodOnly(req, ['POST']);
  if (pre) return pre;
  if (overLimit('login:' + clientIp(req), 10)) {
    return fail(req, 429, 'Too many attempts. Wait a minute and retry.');
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(req, 400, 'Invalid JSON body.');
  }
  const email = isEmail(body?.email);
  const password = isPassword(body?.password);
  // Generic message either way: no oracle for which half was wrong.
  if (!email || !password) return fail(req, 401, 'Invalid login credentials.');
  try {
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    if (error || !data?.session?.user) {
      return fail(req, 401, 'Invalid login credentials.');
    }
    await setAuthCookies(data.session);
    return ok(req, { success: true, user: publicUser(data.session.user) });
  } catch (e) {
    return fail(req, 500, 'internal error');
  }
}
