/**
 * Session in httpOnly cookies. Page JS never sees tokens (XSS cannot steal
 * what JS cannot read). Access token is short-lived; the refresh token
 * rotates it server-side on demand.
 */
import { cookies } from 'next/headers';
import { anonClient } from './supabase.js';

const AT = 'fw_at';
const RT = 'fw_rt';

function cookieFlags(maxAge) {
  const secure = process.env.COOKIE_SECURE !== 'false';
  let sameSite = (process.env.COOKIE_SAMESITE || 'none').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) sameSite = 'none';
  // Browsers reject SameSite=None without Secure: fall back to Lax instead
  // of silently dropping the session cookie in local http dev.
  if (sameSite === 'none' && !secure) sameSite = 'lax';
  return { httpOnly: true, secure, sameSite, path: '/', maxAge };
}

export async function setAuthCookies(session) {
  const store = await cookies();
  store.set(AT, session.access_token, cookieFlags(3600));
  if (session.refresh_token) {
    store.set(RT, session.refresh_token, cookieFlags(30 * 24 * 3600));
  }
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(AT);
  store.delete(RT);
}

export async function readTokens() {
  const store = await cookies();
  return {
    access: store.get(AT)?.value || '',
    refresh: store.get(RT)?.value || '',
  };
}

/**
 * Returns { user, accessToken } or null. If the access token expired, tries
 * one refresh-token rotation before giving up (and clears dead cookies).
 */
export async function requireUser() {
  const { access, refresh } = await readTokens();
  // An unauthenticated request must be a clean 401 even while a local
  // deployment has not been given Supabase credentials yet.
  if (!access && !refresh) {
    await clearAuthCookies();
    return null;
  }
  const anon = anonClient();
  if (access) {
    const { data } = await anon.auth.getUser(access);
    if (data?.user?.email) {
      return { user: { id: data.user.id, email: data.user.email, app_metadata: data.user.app_metadata || {} }, accessToken: access };
    }
  }
  if (refresh) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refresh });
    if (!error && data?.session?.user?.email) {
      await setAuthCookies(data.session);
      const u = data.session.user;
      return { user: { id: u.id, email: u.email, app_metadata: u.app_metadata || {} }, accessToken: data.session.access_token };
    }
  }
  await clearAuthCookies();
  return null;
}

export function publicUser(u) {
  return { id: u.id, email: u.email };
}
