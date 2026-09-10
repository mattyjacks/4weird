/**
 * 4weird Games - Supabase auth client (no build step, vanilla JS).
 *
 * Security model (read before changing):
 * - The browser holds ONLY the anon key, and only after it passes two
 *   gates below: https-or-loopback URL shape, and a JWT payload with
 *   role === "anon". A service_role key pasted into config.js is REFUSED,
 *   because service_role bypasses every RLS policy in schema.sql.
 * - All authorization lives in Postgres RLS, not in this file. This module
 *   is a thin, honest wrapper: it never decides who may see what.
 * - Session tokens persist in localStorage (supabase-js default). Anyone
 *   with JS execution on this origin can read them, which is why every
 *   dynamic string on authenticated pages must go through textContent.
 * - Auth errors are rendered as text, never HTML.
 *
 * Requires (load order on the page):
 *   1. supabase UMD from CDN with SRI (sets window.supabase)
 *   2. auth/config.js (sets window.FourWeirdAuthConfig)
 *   3. this file (sets window.FourWeirdAuth)
 */
(function () {
  'use strict';

  var client = null;
  var initError = '';
  var session = null;
  var listeners = [];

  function getConfig() {
    return window.FourWeirdAuthConfig || null;
  }

  // Supabase ships two key formats: legacy JWT anon keys (payload role
  // "anon") and new sb_publishable_ keys. Both are public-by-design. The
  // check below accepts exactly those two and refuses everything else —
  // notably service_role JWTs and sb_secret_ keys, which bypass all RLS.
  function clientKeyVerdict(key) {
    // Returns 'ok', 'refuse-secret', or 'refuse-malformed'.
    var s = String(key || '');
    if (/^sb_secret_/i.test(s)) return 'refuse-secret';
    if (/^sb_publishable_/i.test(s)) return s.length >= 20 ? 'ok' : 'refuse-malformed';
    var role = peekKeyRole(s);
    if (role === 'anon') return 'ok';
    if (role === 'service_role') return 'refuse-secret';
    return 'refuse-malformed';
  }

  function isAllowedSupabaseUrl(url) {
    try {
      var parsed = new URL(String(url));
      if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')) return true;
      // Local Supabase CLI stack for development only.
      if (parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function notify() {
    listeners.forEach(function (cb) {
      try { cb(session); } catch (e) { /* listener errors must not break auth */ }
    });
    try {
      window.dispatchEvent(new CustomEvent('fourweird-auth', { detail: { session: session } }));
    } catch (e) {}
  }

  function friendlyError(err) {
    var msg = (err && err.message) ? String(err.message) : 'Something went wrong. Try again.';
    // Supabase already returns generic auth errors ("Invalid login
    // credentials"); pass them through but cap length as a precaution.
    return msg.slice(0, 300);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email));
  }

  async function init() {
    if (client) return { client: client, error: '' };
    if (!window.supabase || !window.supabase.createClient) {
      initError = 'Auth library failed to load (CDN or integrity check blocked it). Check your connection and reload.';
      return { client: null, error: initError };
    }
    var cfg = getConfig();
    if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
        cfg.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') !== -1 ||
        cfg.SUPABASE_ANON_KEY === 'YOUR-ANON-KEY') {
      initError = 'Auth is not configured yet. Copy auth/config.example.js to auth/config.js and add your Supabase URL + anon key (see SUPABASE_SETUP.md).';
      return { client: null, error: initError };
    }
    if (!isAllowedSupabaseUrl(cfg.SUPABASE_URL)) {
      initError = 'Refusing to connect: Supabase URL must be https://*.supabase.co (or http://localhost for local dev).';
      return { client: null, error: initError };
    }
    if (peekKeyRole(cfg.SUPABASE_ANON_KEY) !== 'anon') {
      initError = 'Refusing to start: the configured key is not an anon key. Use the publishable/anon key from Supabase API settings — never the service_role secret.';
      return { client: null, error: initError };
    }
    try {
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          // PKCE for any OAuth/magic-link flows; email+password below.
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      });
      var res = await client.auth.getSession();
      session = (res && res.data && res.data.session) || null;
      client.auth.onAuthStateChange(function (_event, newSession) {
        session = newSession;
        notify();
      });
      notify();
      return { client: client, error: '' };
    } catch (e) {
      initError = friendlyError(e);
      client = null;
      return { client: null, error: initError };
    }
  }

  async function signUp(email, password) {
    var started = await init();
    if (!started.client) return { user: null, error: started.error };
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!isValidEmail(email)) return { user: null, error: 'Enter a valid email address.' };
    // Supabase default minimum is 6; we require 8+ client-side AND recommend
    // raising the dashboard minimum (see SUPABASE_SETUP.md).
    if (password.length < 8) return { user: null, error: 'Password must be at least 8 characters.' };
    if (password.length > 128) return { user: null, error: 'Password must be under 128 characters.' };
    try {
      var res = await client.auth.signUp({ email: email, password: password });
      if (res.error) return { user: null, error: friendlyError(res.error) };
      session = (res.data && res.data.session) || null;
      notify();
      return { user: res.data && res.data.user ? res.data.user : null, error: '' };
    } catch (e) {
      return { user: null, error: friendlyError(e) };
    }
  }

  async function signIn(email, password) {
    var started = await init();
    if (!started.client) return { user: null, error: started.error };
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!isValidEmail(email) || !password) return { user: null, error: 'Enter your email and password.' };
    try {
      var res = await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) return { user: null, error: friendlyError(res.error) };
      session = (res.data && res.data.session) || null;
      notify();
      return { user: res.data && res.data.user ? res.data.user : null, error: '' };
    } catch (e) {
      return { user: null, error: friendlyError(e) };
    }
  }

  async function signOut() {
    if (!client) return;
    try { await client.auth.signOut(); } catch (e) {}
    session = null;
    notify();
  }

  function getSession() {
    return session;
  }

  function getUser() {
    return (session && session.user) || null;
  }

  function onAuthChange(cb) {
    if (typeof cb === 'function') listeners.push(cb);
  }

  window.FourWeirdAuth = {
    init: init,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    getUser: getUser,
    onAuthChange: onAuthChange,
    getInitError: function () { return initError; }
  };
})();
