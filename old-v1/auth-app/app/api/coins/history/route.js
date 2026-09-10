import { preflight, ok, fail, methodOnly } from '../../../../lib/http.js';
import { clampLimit } from '../../../../lib/validate.js';
import { userClient } from '../../../../lib/supabase.js';
import { requireUser } from '../../../../lib/session.js';

export async function GET(req) {
  const pre = preflight(req) || methodOnly(req, ['GET']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  const limit = clampLimit(new URL(req.url).searchParams.get('limit'), 25, 100);
  const { data, error } = await userClient(me.accessToken)
    .from('coin_ledger').select('delta,reason,created_at')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) return fail(req, 500, 'internal error');
  return ok(req, { success: true, rows: data || [] });
}
