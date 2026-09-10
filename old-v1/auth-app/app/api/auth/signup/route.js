import { preflight, ok, fail, methodOnly, clientIp } from '../../../../lib/http.js';
import { isEmail, isPassword } from '../../../../lib/validate.js';
import { anonClient } from '../../../../lib/supabase.js';
import { setAuthCookies, publicUser } from '../../../../lib/session.js';
import { overLimit } from '../../../../lib/ratelimit.js';
import { serviceClient } from '../../../../lib/supabase.js';
import { createHash } from 'node:crypto';

async function awardTrial(user, email, req) {
  const salt = process.env.SIGNUP_IP_HASH_SALT || '';
  // Fail closed: credits are never issued with an unsalted, reusable IP hash.
  if (!salt) return false;
  const hash = createHash('sha256').update(salt + '|' + clientIp(req)).digest('hex');
  const coins = Math.max(1, Math.min(100, Number(process.env.FREE_TRIAL_VCOINS || 20)));
  const { data } = await serviceClient().rpc('award_signup_credit', { p_user: user.id, p_email: email, p_ip_hash: hash, p_coins: coins });
  return !!data;
}

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
      const trialAwarded = await awardTrial(data.session.user, email, req).catch(() => false);
      return ok(req, { success: true, user: publicUser(data.session.user), trialAwarded });
    }
    // Confirm-email mode got enabled later: no session until confirmed.
    if (data?.user) await awardTrial(data.user, email, req).catch(() => false);
    return ok(req, { success: true, user: null, needsConfirmation: true });
  } catch (e) {
    return fail(req, 500, 'internal error');
  }
}
