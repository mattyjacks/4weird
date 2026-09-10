import { preflight, ok, fail, methodOnly } from '../../../lib/http.js';
import { isSlug, isSlot, jsonBytes } from '../../../lib/validate.js';
import { userClient } from '../../../lib/supabase.js';
import { requireUser } from '../../../lib/session.js';

export async function GET(req) {
  const pre = preflight(req) || methodOnly(req, ['GET']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  const q = new URL(req.url).searchParams;
  const game = q.get('game');
  const slot = q.get('slot');
  let query = userClient(me.accessToken).from('game_saves')
    .select('game_slug,slot,data,updated_at').order('updated_at', { ascending: false }).limit(50);
  if (game) {
    const slug = isSlug(game);
    if (!slug) return fail(req, 400, 'Invalid game slug.');
    query = query.eq('game_slug', slug);
  }
  if (slot) {
    const s = isSlot(slot);
    if (!s) return fail(req, 400, 'Invalid slot.');
    query = query.eq('slot', s);
  }
  const { data, error } = await query;
  if (error) return fail(req, 500, 'internal error');
  return ok(req, { success: true, saves: data || [] });
}

export async function PUT(req) {
  const pre = preflight(req) || methodOnly(req, ['PUT']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(req, 400, 'Invalid JSON body.');
  }
  const slug = isSlug(body?.game_slug);
  const slot = isSlot(body?.slot);
  if (!slug) return fail(req, 400, 'Invalid game slug.');
  if (!slot) return fail(req, 400, 'Slot must be 1-3.');
  const data = (body && typeof body.data === 'object' && body.data !== null) ? body.data : null;
  if (!data) return fail(req, 400, 'data must be a JSON object.');
  if (jsonBytes(data) > 1048576) return fail(req, 413, 'Save data exceeds 1 MiB.');
  // Cheat marking is irreversible per save slot. A later client save cannot
  // erase it after a cheat was used, even if the browser was tampered with.
  const client = userClient(me.accessToken);
  const { data: existing, error: existingError } = await client.from('game_saves')
    .select('data').eq('user_id', me.user.id).eq('game_slug', slug).eq('slot', slot).maybeSingle();
  if (existingError) return fail(req, 500, 'internal error');
  if (existing?.data?.cheat_mode) data.cheat_mode = true;
  // user_id comes from the session, never the body; RLS re-checks it.
  const { error } = await client.from('game_saves').upsert(
    { user_id: me.user.id, game_slug: slug, slot, data },
    { onConflict: 'user_id,game_slug,slot' }
  );
  if (error) return fail(req, 500, 'internal error');
  return ok(req, { success: true });
}
