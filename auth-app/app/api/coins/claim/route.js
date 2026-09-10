/**
 * Attach paid-but-unclaimed Shopify orders (matched by order email) to the
 * logged-in account. Same money rules as the webhook: conditional claim +
 * UNIQUE(grant_id) ledger insert, so concurrent claims cannot double-mint.
 */
import { preflight, ok, fail, methodOnly } from '../../../lib/http.js';
import { serviceClient } from '../../../lib/supabase.js';
import { requireUser } from '../../../lib/session.js';

export async function POST(req) {
  const pre = preflight(req) || methodOnly(req, ['POST']);
  if (pre) return pre;
  const me = await requireUser();
  if (!me) return fail(req, 401, 'Login required.');
  try {
    const db = serviceClient();
    const { data: pending, error: qErr } = await db.from('coin_grants')
      .select('id,coins,shopify_order_name').ilike('email', me.user.email).eq('claimed', false);
    if (qErr) return fail(req, 500, 'internal error');
    let claimed = 0;
    for (const g of pending || []) {
      const { data: won } = await db.from('coin_grants')
        .update({ user_id: me.user.id, claimed: true })
        .eq('id', g.id).eq('claimed', false).select('id');
      if (!won || won.length === 0) continue;
      const { error: ledgerErr } = await db.from('coin_ledger').insert({
        user_id: me.user.id,
        delta: g.coins,
        reason: ('Shopify order ' + (g.shopify_order_name || '')).slice(0, 120),
        grant_id: g.id,
      });
      if (!ledgerErr) claimed += 1;
    }
    return ok(req, { success: true, claimed });
  } catch (e) {
    return fail(req, 500, 'internal error');
  }
}
