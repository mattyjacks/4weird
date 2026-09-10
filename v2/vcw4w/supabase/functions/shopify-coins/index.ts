/**
 * 4weird Vibe Coins - Shopify fulfillment Edge Function (Deno, Supabase).
 *
 * Deploy:  supabase functions deploy shopify-coins --no-verify-jwt
 * Secrets: supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... \
 *            SUPABASE_SERVICE_ROLE_KEY=... SHOPIFY_WEBHOOK_SECRET=... \
 *            SITE_ORIGINS="https://4weird.com,https://www.4weird.com"
 *
 * Why --no-verify-jwt: Shopify cannot sign Supabase JWTs. Auth here is:
 *   - /webhook : Shopify HMAC-SHA256 (X-Shopify-Hmac-Sha256) over the RAW
 *     body using SHOPIFY_WEBHOOK_SECRET. No HMAC, no coins. Ever.
 *   - /claim   : the caller's Supabase user JWT, validated via auth.getUser.
 *
 * Money rules:
 *   - Buyer price is $0.01 per coin (100 coins = exactly $1.00). That $1.00
 *     already includes the 25% platform service cut ($0.25 cut, $0.75 coin
 *     value) — the cut is never added on top of a price.
 *   - Fixed-pack SKU -> coin amounts live ONLY in COIN_SKU_MAP below.
 *     Prices, cart attributes, and line-item titles from Shopify are never
 *     trusted for fixed packs.
 *   - VIBE-COINS-CUSTOM mints from the VERIFIED PAID line total instead:
 *     coins = round(line price x quantity in dollars x 100), floored at
 *     CUSTOM_COINS_MIN and capped at MAX_COINS_PER_ORDER. The HMAC-verified
 *     Shopify payment is the authority, never the browser.
 *   - shopify_order_id is UNIQUE: retries/redeliveries cannot double-mint.
 *   - coin_ledger.grant_id is UNIQUE: one grant mints exactly one row, even
 *     under concurrent webhook deliveries (second insert fails safe).
 *   - Authority is the PAID order email. Cart attributes are hints only.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

// No 100-coin pack: 100 coins is the free signup trial.
const COIN_SKU_MAP: Record<string, number> = {
  'VIBE-COINS-500': 500,
  'VIBE-COINS-1500': 1500,
  'VIBE-COINS-5000': 5000,
  'VIBE-COINS-25000': 25000,
};
const CUSTOM_SKU = 'VIBE-COINS-CUSTOM';
const CUSTOM_COINS_MIN = 500;
const MAX_COINS_PER_ORDER = 100000;

function siteOrigins(): string[] {
  const raw = Deno.env.get('SITE_ORIGINS') ?? 'https://4weird.com,https://www.4weird.com';
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get('origin') || '').toLowerCase();
  const headers: Record<string, string> = { 'Vary': 'Origin' };
  if (origin && siteOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = req.headers.get('origin') as string;
  }
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  return headers;
}

function json(req: Request, status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });
}

// Shopify sends the HMAC base64-encoded. Compare in (practically)
// constant time so a remote timing oracle cannot nibble the secret.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyShopifyHmac(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
    let bin = '';
    for (let i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
    return timingSafeEqual(btoa(bin), header.trim());
  } catch {
    return false;
  }
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) throw new Error('Server misconfigured');
  return createClient(url, key);
}

async function handleWebhook(req: Request): Promise<Response> {
  const secret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') ?? '';
  const rawBody = await req.text();
  const ok = await verifyShopifyHmac(rawBody, req.headers.get('x-shopify-hmac-sha256'), secret);
  if (!ok) return json(req, 401, { success: false, error: 'Invalid webhook signature' });

  const topic = req.headers.get('x-shopify-topic') || '';
  if (topic !== 'orders/paid') return json(req, 200, { success: true, skipped: 'topic ' + topic });

  let order: Record<string, unknown>;
  try {
    order = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json(req, 400, { success: false, error: 'Malformed payload' });
  }

  const financial = String((order as { financial_status?: unknown }).financial_status ?? '');
  if (!financial.includes('paid')) return json(req, 200, { success: true, skipped: 'unpaid' });

  const orderId = String((order as { id?: unknown }).id ?? '');
  const orderName = String((order as { name?: unknown }).name ?? '');
  const customer = (order as { customer?: { email?: unknown } }).customer;
  const email = String((order as { email?: unknown }).email ?? customer?.email ?? '').trim().toLowerCase();
  if (!orderId || !email || email.length > 254) {
    return json(req, 200, { success: true, granted: 0, skipped: 'no buyer email' });
  }

  const items = (order as { line_items?: Array<{ sku?: unknown; quantity?: unknown; price?: unknown }> }).line_items ?? [];
  let coins = 0;
  const skus: string[] = [];
  for (const item of items) {
    const sku = String(item?.sku ?? '');
    const qty = Math.max(1, Math.min(Number(item?.quantity) || 1, 99));
    if (sku === CUSTOM_SKU) {
      // Custom amount: mint from the verified paid line total at $0.01/coin.
      // Unit price x quantity comes from HMAC-verified Shopify, not the buyer.
      const unit = Number(item?.price);
      if (!Number.isFinite(unit) || unit <= 0) continue;
      const custom = Math.round(unit * qty * 100);
      if (custom < CUSTOM_COINS_MIN || custom > MAX_COINS_PER_ORDER) continue;
      coins += custom;
      skus.push(sku + 'x' + qty + '=' + custom);
      continue;
    }
    const per = COIN_SKU_MAP[sku];
    if (!per) continue; // unknown SKU: not ours, never minted
    coins += per * qty;
    skus.push(sku + 'x' + qty);
  }
  if (coins <= 0) return json(req, 200, { success: true, granted: 0, skipped: 'no Vibe Coins SKUs' });
  if (coins > MAX_COINS_PER_ORDER) return json(req, 200, { success: true, granted: 0, skipped: 'amount cap' });

  const db = serviceClient();
  const { data: profile } = await db.from('profiles').select('id').ilike('email', email).maybeSingle();
  const userId: string | null = (profile as { id?: string } | null)?.id ?? null;

  // Idempotency first: a redelivered webhook hits the UNIQUE constraint and
  // returns the already-processed result without minting again.
  const { data: grant, error: grantErr } = await db.from('coin_grants').insert({
    user_id: userId,
    email,
    shopify_order_id: orderId,
    shopify_order_name: orderName.slice(0, 32),
    sku: skus.join(',').slice(0, 120),
    coins,
    claimed: userId !== null,
  }).select('id').single();

  if (grantErr) {
    if ((grantErr as { code?: string }).code === '23505') {
      return json(req, 200, { success: true, granted: 0, already: true });
    }
    console.error('grant insert failed', (grantErr as Error).message);
    return json(req, 500, { success: false, error: 'internal error' });
  }

  if (userId === null) {
    // Paid, but no account with this email yet: parked for /claim.
    return json(req, 200, { success: true, granted: 0, parked: true });
  }

  const { error: ledgerErr } = await db.from('coin_ledger').insert({
    user_id: userId,
    delta: coins,
    reason: ('Shopify order ' + orderName).slice(0, 120),
    grant_id: (grant as { id: string }).id,
  });
  if (ledgerErr) {
    // UNIQUE(grant_id) means a concurrent delivery already minted it.
    if ((ledgerErr as { code?: string }).code === '23505') {
      return json(req, 200, { success: true, granted: 0, already: true });
    }
    console.error('ledger insert failed', (ledgerErr as Error).message);
    return json(req, 500, { success: false, error: 'internal error' });
  }
  return json(req, 200, { success: true, granted: coins });
}

async function handleClaim(req: Request): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ') || !url || !anon) {
    return json(req, 401, { success: false, error: 'Login required' });
  }
  const gate = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await gate.auth.getUser();
  if (userErr || !user?.email) return json(req, 401, { success: false, error: 'Login required' });
  const email = user.email.toLowerCase();

  const db = serviceClient();
  const { data: pending } = await db.from('coin_grants')
    .select('id,coins,shopify_order_name')
    .ilike('email', email)
    .eq('claimed', false);
  let claimed = 0;
  for (const g of (pending ?? []) as Array<{ id: string; coins: number; shopify_order_name: string | null }>) {
    // Conditional update: only the first concurrent claimer wins the row.
    const { data: won } = await db.from('coin_grants')
      .update({ user_id: user.id, claimed: true })
      .eq('id', g.id)
      .eq('claimed', false)
      .select('id');
    if (!won || (won as unknown[]).length === 0) continue;
    const { error: ledgerErr } = await db.from('coin_ledger').insert({
      user_id: user.id,
      delta: g.coins,
      reason: ('Shopify order ' + (g.shopify_order_name ?? '')).slice(0, 120),
      grant_id: g.id,
    });
    if (!ledgerErr) claimed += 1;
  }
  return json(req, 200, { success: true, claimed });
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }
    if (req.method !== 'POST') return json(req, 405, { success: false, error: 'Method Not Allowed' });
    const path = new URL(req.url).pathname;
    if (path.endsWith('/claim')) return await handleClaim(req);
    return await handleWebhook(req);
  } catch (e) {
    console.error('shopify-coins fatal', String((e as Error)?.message ?? e));
    return json(req, 500, { success: false, error: 'internal error' });
  }
});
