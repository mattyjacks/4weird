/**
 * 4weird Games - auth-app client (no build step, vanilla JS).
 *
 * All login + user-data traffic goes to the 4weird-auth Next.js service,
 * which holds every Supabase key server-side and keeps the session in
 * httpOnly cookies. Page JavaScript never sees tokens or keys, so XSS
 * cannot steal a session the way localStorage tokens would allow.
 *
 * Requires auth/config.js (AUTH_APP_URL + shop settings) before this file.
 * Sets window.FourWeirdServer. Every method returns { ..., error } with
 * error as plain text (render with textContent, never innerHTML).
 */
(function () {
  'use strict';

  function getConfig() {
    return window.FourWeirdAuthConfig || null;
  }

  // Base URL of the auth service. '' = same-origin proxy mode (the static
  // host rewrites /auth-api/* to the service). Otherwise a bare https
  // origin. Anything else (placeholders, paths, other schemes) is refused
  // so a bad config can never aim logins at an attacker's host.
  function getBase() {
    var cfg = getConfig();
    if (!cfg) return { base: '', error: 'Auth is not configured (missing auth/config.js).' };
    var raw = String(cfg.AUTH_APP_URL || '').trim();
    if (raw === '') return { base: '/auth-api', error: '' };
    if (/^https:\/\/[a-z0-9][a-z0-9.-]*(:[0-9]{1,5})?$/i.test(raw) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$/i.test(raw)) {
      return { base: raw.replace(/\/+$/, ''), error: '' };
    }
    if (raw.indexOf('REPLACE') !== -1 || raw.indexOf('YOUR-') !== -1 || raw.indexOf('example.com') !== -1) {
      return { base: '', error: 'Auth service URL is still a placeholder. Deploy auth-app and set AUTH_APP_URL in auth/config.js (see auth-app/README.md).' };
    }
    return { base: '', error: 'AUTH_APP_URL must be a bare https origin (or empty for same-origin proxy mode).' };
  }

  async function api(path, opts) {
    var gate = getBase();
    if (gate.error) return { status: 0, data: null, error: gate.error };
    var o = opts || {};
    try {
      var res = await fetch(gate.base + path, {
        method: o.method || 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: o.body !== undefined ? JSON.stringify(o.body) : undefined
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) return { status: res.status, data: data, error: String(data.error || ('HTTP ' + res.status)).slice(0, 200) };
      return { status: res.status, data: data, error: '' };
    } catch (e) {
      return { status: 0, data: null, error: 'Auth service unreachable. ' + String((e && e.message) || e).slice(0, 120) };
    }
  }

  function isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
  }

  async function signUp(email, password) {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!isEmail(email)) return { user: null, error: 'Enter a valid email address.' };
    if (password.length < 8 || password.length > 128) return { user: null, error: 'Password must be 8-128 characters.' };
    var r = await api('/api/auth/signup', { method: 'POST', body: { email: email, password: password } });
    if (r.error) return { user: null, error: r.error };
    return { user: (r.data && r.data.user) || null, note: (r.data && (r.data.note || (r.data.needsConfirmation ? 'Check your email to confirm.' : ''))) || '', error: '' };
  }

  async function signIn(email, password) {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!isEmail(email) || !password) return { user: null, error: 'Enter your email and password.' };
    var r = await api('/api/auth/login', { method: 'POST', body: { email: email, password: password } });
    if (r.error) return { user: null, error: r.error };
    return { user: (r.data && r.data.user) || null, error: '' };
  }

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST', body: {} });
  }

  async function getSession() {
    var r = await api('/api/auth/session');
    if (r.error) return { user: null, error: r.error };
    return { user: (r.data && r.data.user) || null, error: '' };
  }

  async function getProfile() {
    var r = await api('/api/me/profile');
    if (r.error) return { profile: null, error: r.error };
    return { profile: (r.data && r.data.profile) || null, error: '' };
  }

  async function setDisplayName(name) {
    var clean = String(name || '').trim().slice(0, 40);
    if (clean.length < 2) return { error: 'Display name needs at least 2 characters.' };
    var r = await api('/api/me/profile', { method: 'PATCH', body: { display_name: clean } });
    return { error: r.error };
  }

  async function getBalance() {
    var r = await api('/api/coins/balance');
    if (r.error) return { balance: 0, error: r.error };
    return { balance: Number(r.data && r.data.balance) || 0, error: '' };
  }

  async function getHistory(limit) {
    var n = Math.max(1, Math.min(Number(limit) || 25, 100));
    var r = await api('/api/coins/history?limit=' + n);
    if (r.error) return { rows: [], error: r.error };
    return { rows: (r.data && r.data.rows) || [], error: '' };
  }

  function getPacks() {
    var cfg = getConfig();
    var packs = (cfg && Array.isArray(cfg.COIN_PACKS)) ? cfg.COIN_PACKS : [];
    return packs.filter(function (p) {
      return p && typeof p.name === 'string' && Number.isInteger(Number(p.coins)) &&
        Number(p.coins) > 0 && /^[0-9]+$/.test(String(p.variantId || ''));
    });
  }

  function buildCheckoutUrl(pack) {
    var cfg = getConfig();
    if (!cfg) return { url: '', error: 'Shop not configured.' };
    var ok = getPacks().some(function (p) { return p.id === pack.id && String(p.variantId) === String(pack.variantId); });
    if (!ok) return { url: '', error: 'This pack is not available yet.' };
    var store = String(cfg.SHOPIFY_STORE_DOMAIN || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(store)) return { url: '', error: 'Shop not configured.' };
    // Buyer identity is resolved server-side from the paid-order email after
    // checkout; attributes are support hints only. Login is still required
    // first so coins have an account waiting (or are claimable by email).
    return { url: 'https://' + store + '/cart/' + encodeURIComponent(String(pack.variantId)) + ':1', error: '' };
  }

  async function claimCoins() {
    var r = await api('/api/coins/claim', { method: 'POST', body: {} });
    if (r.error) return { claimed: 0, error: r.error };
    return { claimed: Number(r.data && r.data.claimed) || 0, error: '' };
  }

  async function getSaves(game, slot) {
    var q = '';
    if (game) q += (q ? '&' : '?') + 'game=' + encodeURIComponent(String(game));
    if (slot) q += (q ? '&' : '?') + 'slot=' + encodeURIComponent(String(slot));
    var r = await api('/api/saves' + q);
    if (r.error) return { saves: [], error: r.error };
    return { saves: (r.data && r.data.saves) || [], error: '' };
  }

  async function putSave(gameSlug, slot, data) {
    var r = await api('/api/saves', { method: 'PUT', body: { game_slug: gameSlug, slot: slot, data: data } });
    return { error: r.error };
  }

  window.FourWeirdServer = {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    getProfile: getProfile,
    setDisplayName: setDisplayName,
    getBalance: getBalance,
    getHistory: getHistory,
    getPacks: getPacks,
    buildCheckoutUrl: buildCheckoutUrl,
    claimCoins: claimCoins,
    getSaves: getSaves,
    putSave: putSave
  };
})();
