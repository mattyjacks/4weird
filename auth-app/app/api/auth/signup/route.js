import { preflight, ok, fail, methodOnly, clientIp } from '../../../../lib/http.js';
import { isEmail, isPassword } from '../../../../lib/validate.js';
import { anonClient } from '../../../../lib/supabase.js';
import { setAuthCookies, publicUser } from '../../../../lib/session.js';
import { overLimit } from '../../../../lib/ratelimit.js';

export async function POST(req) {
  const pre = preflight(req) || methodOnly(req, ['POST']);
  if (pre) return pre;
  if (overLimit('signup:' + clientIp(req), 10)) {
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
  if (!email) return fail(req, 400, 'Enter a valid email address.');
  if (!password) return fail(req, 400, 'Password must be 8-128 characters.');
  try {
    const { data, error } = await anonClient().auth.signUp({ email, password });
    if (error) {
      // Anti-enumeration: an existing address gets the same shape as a new
      // signup, without a session. (No confirmation emails are sent.)
      if (/already registered|already exists/i.test(error.message || '')) {
        return ok(req, { success: true, user: null, note: 'If this email is new, the account was created. Try logging in.' });
      }
      return fail(req, 400, error.message || 'Signup failed.');
    }
    if (data?.session?.user) {
      await setAuthCookies(data.session);
      return ok(req, { success: true, user: publicUser(data.session.user) });
    }
    // Confirm-email mode got enabled later: no session until confirmed.
    return ok(req, { success: true, user: null, needsConfirmation: true });
  } catch (e) {
    return fail(req, 500, 'internal error');
  }
}
