/** Input validation. Every request-influenced value passes through here. */

export function isEmail(s) {
  const v = String(s || '').trim().toLowerCase();
  if (v.length < 3 || v.length > 254) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return '';
  return v;
}

export function isPassword(s) {
  const v = String(s || '');
  if (v.length < 8 || v.length > 128) return '';
  return v;
}

export function cleanDisplayName(s) {
  const v = String(s || '').trim().slice(0, 40);
  return v.length >= 2 ? v : '';
}

export function cleanHandle(s) {
  const v = String(s || '').trim().toLowerCase();
  return /^[a-z0-9_-]{3,40}$/.test(v) ? v : '';
}

export function isSlug(s) {
  const v = String(s || '');
  return /^[a-z0-9-]{1,64}$/.test(v) ? v : '';
}

export function isSlot(n) {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 3 ? v : 0;
}

export function clampLimit(n, def = 25, max = 100) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(1, Math.min(Math.floor(v), max));
}

/** Byte size of a JSON value; saves are capped at 1 MiB (mirrors SQL CHECK). */
export function jsonBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}
