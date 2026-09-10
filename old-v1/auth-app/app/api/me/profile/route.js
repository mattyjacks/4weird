import { preflight, ok, fail, methodOnly } from '../../../../lib/http.js';
import { cleanDisplayName, cleanHandle } from '../../../../lib/validate.js';
import { userClient } from '../../../../lib/supabase.js';
import { requireUser } from '../../../../lib/session.js';

export async function GET(req) {
  const pre = preflight(req) || methodOnly(req, ['GET']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  const { data, error } = await userClient(me.accessToken)
    .from('profiles').select('display_name,public_handle,email,created_at').eq('id', me.user.id).maybeSingle();
  if (error) return fail(req, 500, 'internal error');
  return ok(req, { success: true, profile: data || null });
}

export async function PATCH(req) {
  const pre = preflight(req) || methodOnly(req, ['PATCH']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(req, 400, 'Invalid JSON body.');
  }
  const name = cleanDisplayName(body?.display_name);
  const handle = body?.public_handle === undefined ? undefined : cleanHandle(body?.public_handle);
  if (!name) return fail(req, 400, 'Display name needs 2-40 characters.');
  if (body?.public_handle !== undefined && !handle) return fail(req, 400, 'Handle needs 3-40 letters, numbers, _ or -.');
  // user_id is forced from the session; RLS re-checks it. A client-supplied
  // id field is ignored entirely.
  const { error } = await userClient(me.accessToken)
    .from('profiles').update({ display_name: name, ...(handle !== undefined ? { public_handle: handle } : {}) }).eq('id', me.user.id);
  if (error) return fail(req, 409, 'That public handle is unavailable.');
  return ok(req, { success: true });
}
