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
  // Minimum strength for NEW passwords: require 3 of 4 classes to resist
  // credential stuffing with trivial passwords like "password" or "aaaaaaaa".
  // Signup and password-change routes use this; the LOGIN route must use
  // isLoginPassword below so pre-rule accounts are never locked out.
  let classes = 0;
  if (/[a-z]/.test(v)) classes += 1;
  if (/[A-Z]/.test(v)) classes += 1;
  if (/[0-9]/.test(v)) classes += 1;
  if (/[^A-Za-z0-9]/.test(v)) classes += 1;
  if (classes < 3) return "";
  return v;
}

/** Login-shape check: length-bounded only, NO strength classes. Strength is
 *  enforced when a password is CHOSEN (signup/change), never when it is
 *  presented — otherwise accounts created before the rule could not log in. */
export function isLoginPassword(value: unknown): string {
  const v = String(value ?? "");
  if (v.length < 1 || v.length > 128) return "";
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ""));
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

/**
 * Best-effort client IP for rate limiting and trial-credit hashing.
 * Trusts ONLY the platform-provided leftmost unspoofable headers in order:
 * x-real-ip, then the FIRST x-forwarded-for entry (client-supplied chain
 * head is still spoofable, so all abuse decisions MUST also have a
 * server-side Postgres guard: UNIQUE ip_hash trial credit, advisory locks,
 * per-account limits). The previous "LAST entry" logic broke when the
 * platform preserved client-first ordering with infra IPs appended.
 */
export function clientIp(request: Request): string {
  const real = (request.headers.get("x-real-ip") ?? "").trim();
  if (real && /^[A-Za-z0-9:.]{1,64}$/.test(real)) return real;
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const parts = fwd
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Prefer Vercel's documented forwarded header when present.
  const vercelForwarded = (request.headers.get("x-vercel-forwarded-for") ?? "").trim().split(",")[0]?.trim() ?? "";
  const ip = vercelForwarded || parts[0] || "unknown";
  if (!/^[A-Za-z0-9:.]{1,64}$/.test(ip)) return "unknown";
  return ip;
}

/** Actual POST body byte size — never trust Content-Length (missing on chunked). */
export function bodyByteSize(value: unknown): number {
  try {
    return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Enforce max body bytes on the already-parsed value (chunked-safe). */
export function exceedsBodyLimit(value: unknown, maxBytes: number): boolean {
  return bodyByteSize(value) > maxBytes;
}
