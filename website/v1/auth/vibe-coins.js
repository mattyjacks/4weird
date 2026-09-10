/**
 * 4weird Games - Vibe Coins wallet (no build step, vanilla JS).
 *
 * Money rules (read before changing):
 * - The client READS balances/history through RLS (own rows only) and
 *   BUILDS Shopify checkout links. It never grants, moves, or edits coins.
 * - Grants happen only in the shopify-coins Edge Function, which verifies
 *   the Shopify HMAC webhook and maps SKUs to coin amounts server-side.
 * - Checkout cart attributes carry the account as a HINT for support; the
 *   function credits by paid-order email, never by attribute. Attributes
 *   are forgeable, order emails on paid orders are not.
 *
 * Requires window.FourWeirdAuth (auth/supabase-auth.js) + config with
 * COINS_FUNCTION_URL, SHOPIFY_STORE_DOMAIN, COIN_PACKS.
 */
(function () {
  'use strict';

  function getConfig() {
    return window.FourWeirdAuthConfig || null;
  }

  function getClient() {
    if (!window.FourWeirdAuth) return null;
    // Reuse the initialized client via a fresh init() (idempotent).
    return window.FourWeirdAuth;
  }

  async function getAuthedClient() {
    var auth = getClient();
    if (!auth) return { client: null, error: 'Auth module not loaded.' };
    var started = await auth.init();
    if (!started.client) return { client: null, error: started.error };
    if (!auth.getSession()) return { client: null, error: 'NOT_LOGGED_IN' };
    return { client: started.client, error: '' };
  }

  // Balance = sum of own ledger deltas. RLS guarantees only the caller's
  // rows are visible, so the sum is inherently scoped to the caller.
  async function getBalance() {
    var gate = await getAuthedClient();
    if (!gate.client) return { balance: 0, error: gate.error };
    try {
      var res = await gate.client.from('coin_ledger').select('delta');
      if (res.error) return { balance: 0, error: res.error.message.slice(0, 200) };
      var total = 0;
      (res.data || []).forEach(function (row) {
        var d = Number(row.delta);
        if (Number.isFinite(d)) total += d;
      });
      return { balance: total, error: '' };
    } catch (e) {
      return { balance: 0, error: String((e && e.message) || e).slice(0, 200) };
    }
  }

  async function getHistory(limit) {
    var gate = await getAuthedClient();
    if (!gate.client) return { rows: [], error: gate.error };
    var n = Math.max(1, Math.min(Number(limit) || 25, 100));
    try {
      var res = await gate.client
        .from('coin_ledger')
        .select('delta,reason,created_at')
        .order('created_at', { ascending: false })
        .limit(n);
      if (res.error) return { rows: [], error: res.error.message.slice(0, 200) };
      return { rows: res.data || [], error: '' };
    } catch (e) {
      return { rows: [], error: String((e && e.message) || e).slice(0, 200) };
    }
  }

  function getPacks() {
    var cfg = getConfig();
    var packs = (cfg && Array.isArray(cfg.COIN_PACKS)) ? cfg.COIN_PACKS : [];
    // Only well-formed packs with numeric Shopify variant IDs are offered.
    // A non-numeric variantId (e.g. an unreplaced placeholder) is refused so
    // buyers can never be sent to a malformed checkout URL.
    return packs.filter(function (p) {
      return p && typeof p.name === 'string' && Number.isInteger(Number(p.coins)) &&
        Number(p.coins) > 0 && /^[0-9]+$/.test(String(p.variantId || ''));
    });
  }

  // Hosted checkout on YOUR store. Card data never touches 4weird, so PCI
  // scope stays with Shopify. Cart attributes are support hints only.
  function buildCheckoutUrl(pack) {
    var cfg = getConfig();
    var auth = window.FourWeirdAuth;
    if (!cfg || !auth) return { url: '', error: 'Shop not configured.' };
    var user = auth.getUser();
    if (!user) return { url: '', error: 'Log in first so your Vibe Coins land in your account.' };
    var ok = getPacks().some(function (p) { return p.id === pack.id && String(p.variantId) === String(pack.variantId); });
    if (!ok) return { url: '', error: 'This pack is not available yet.' };
    var store = String(cfg.SHOPIFY_STORE_DOMAIN || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(store)) return { url: '', error: 'Shop not configured.' };
    var attrs = 'attributes[Vibe-Coins-user]=' + encodeURIComponent(String(user.id)) +
      '&attributes[account-email]=' + encodeURIComponent(String(user.email || ''));
    return { url: 'https://' + store + '/cart/' + encodeURIComponent(String(pack.variantId)) + ':1?' + attrs, error: '' };
  }

  // Ask the Edge Function to attach any paid-but-unclaimed orders whose
  // order email matches the logged-in user's email.
  async function claimCoins() {
    var gate = await getAuthedClient();
    if (!gate.client) return { claimed: 0, error: gate.error };
    var cfg = getConfig();
    if (!cfg || !cfg.COINS_FUNCTION_URL || cfg.COINS_FUNCTION_URL.indexOf('YOUR-PROJECT-REF') !== -1) {
      return { claimed: 0, error: 'Coins backend not configured.' };
    }
    try {
      var token = gate.client.auth && gate.client.auth.getSession
        ? (await gate.client.auth.getSession()).data.session.access_token
        : '';
      var res = await fetch(String(cfg.COINS_FUNCTION_URL).replace(/\/$/, '') + '/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: '{}'
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) return { claimed: 0, error: String(data.error || ('HTTP ' + res.status)).slice(0, 200) };
      return { claimed: Number(data.claimed) || 0, error: '' };
    } catch (e) {
      return { claimed: 0, error: String((e && e.message) || e).slice(0, 200) };
    }
  }

  async function getProfile() {
    var gate = await getAuthedClient();
    if (!gate.client) return { profile: null, error: gate.error };
    try {
      var user = window.FourWeirdAuth.getUser();
      var res = await gate.client.from('profiles').select('display_name,email,created_at').eq('id', user.id).maybeSingle();
      if (res.error) return { profile: null, error: res.error.message.slice(0, 200) };
      return { profile: res.data || null, error: '' };
    } catch (e) {
      return { profile: null, error: String((e && e.message) || e).slice(0, 200) };
    }
  }

  async function setDisplayName(name) {
    var gate = await getAuthedClient();
    if (!gate.client) return { error: gate.error };
    var clean = String(name || '').trim().slice(0, 40);
    if (clean.length < 2) return { error: 'Display name needs at least 2 characters.' };
    try {
      var user = window.FourWeirdAuth.getUser();
      var res = await gate.client.from('profiles').update({ display_name: clean }).eq('id', user.id);
      if (res.error) return { error: res.error.message.slice(0, 200) };
      return { error: '' };
    } catch (e) {
      return { error: String((e && e.message) || e).slice(0, 200) };
    }
  }

  window.FourWeirdCoins = {
    getBalance: getBalance,
    getHistory: getHistory,
    getPacks: getPacks,
    buildCheckoutUrl: buildCheckoutUrl,
    claimCoins: claimCoins,
    getProfile: getProfile,
    setDisplayName: setDisplayName
  };
})();
