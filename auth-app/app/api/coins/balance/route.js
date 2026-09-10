import { preflight, ok, fail, methodOnly } from '../../../lib/http.js';
import { userClient } from '../../../lib/supabase.js';
import { requireUser } from '../../../lib/session.js';

export async function GET(req) {
  const pre = preflight(req) || methodOnly(req, ['GET']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  // Fixed-logic SECURITY DEFINER function: returns SUM(delta) for the
  // caller only. No arguments, nothing to inject.
  const { data, error } = await userClient(me.accessToken).rpc('get_my_coin_balance');
  if (error) return fail(req, 500, 'internal error');
  return ok(req, { success: true, balance: Number(data) || 0 });
}
