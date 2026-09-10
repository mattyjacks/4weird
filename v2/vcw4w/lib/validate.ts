/**
 * Input validation for API routes. Ported from the legacy auth-app
 * (auth-app/lib/validate.js) so the single Vercel deploy enforces the same
 * request shapes. Every request-influenced value passes through here.
 */

export function isEmail(value: unknown): string {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v.length < 3 || v.length > 254) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "";
  return v;
}

export function isPassword(value: unknown): string {
  const v = String(value ?? "");
  if (v.length < 8 || v.length > 128) return "";
  return v;
}

export function cleanDisplayName(value: unknown): string {
  const v = String(value ?? "")
    .trim()
    .slice(0, 40);
  return v.length >= 2 ? v : "";
}

export function cleanHandle(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9_-]{3,40}$/.test(v) ? v : "";
}

export function isSlug(value: unknown): string {
  const v = String(value ?? "");
  return /^[a-z0-9-]{1,64}$/.test(v) ? v : "";
}

export function isSlot(value: unknown): number {
  const v = Number(value);
  return Number.isInteger(v) && v >= 1 && v <= 3 ? v : 0;
}

export function isUuid(value: unknown): boolean {
  return /^[0-9a-f-]{36}$/i.test(String(value ?? ""));
}

export function clampLimit(value: unknown, def = 25, max = 100): number {
  const v = Number(value);
  if (!Number.isFinite(v)) return def;
  return Math.max(1, Math.min(Math.floor(v), max));
}

/** Byte size of a JSON value; saves are capped at 1 MiB (mirrors SQL CHECK). */
export function jsonBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Best-effort client IP (Vercel sets x-forwarded-for). For rate limiting. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || "unknown";
  return ip.slice(0, 64);
}
