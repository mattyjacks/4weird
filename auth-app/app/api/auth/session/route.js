import { preflight, ok, fail, methodOnly } from '../../../../lib/http.js';
import { requireUser } from '../../../../lib/session.js';

export async function GET(req) {
  const pre = preflight(req) || methodOnly(req, ['GET']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  return ok(req, { success: true, user: me.user });
}
