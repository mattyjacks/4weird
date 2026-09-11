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
 *  presented; otherwise accounts created before the rule could not log in. */
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

/**
 * Save-slot check: slots are 0, 1, 2, or 3. Slot 0 is the cheat-proof
 * safety slot (it can never carry cheat_mode; see /api/cheats + /api/saves)
 * and sorts first everywhere. Returns null when invalid (slot 0 is valid,
 * so 0 cannot double as the invalid sentinel).
 */
export function isSlot(value: unknown): number | null {
  // Number(null) and Number("") both coerce to 0, so a missing or empty slot
  // would otherwise pass as the valid safety slot. Reject those outright.
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const v = Number(value);
  return Number.isInteger(v) && v >= 0 && v <= 3 ? v : null;
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
 *
 * Header trust order (spoof-resistant first): `x-vercel-forwarded-for` is
 * set by the Vercel edge and cannot be spoofed by clients; the FIRST
 * `x-forwarded-for` entry is next. `x-real-ip` is deliberately NOT trusted:
 * it is client-supplied on most deployments, so trusting it let any caller
 * rotate IPs per request and bypass every IP-keyed throttle (guest quotas,
 * signup/login buckets). IP limits remain defense-in-depth only: all abuse
 * decisions MUST also have a server-side Postgres guard (UNIQUE ip_hash
 * trial credit, advisory locks, per-account limits).
 */
export function clientIp(request: Request): string {
  const vercelForwarded = (request.headers.get("x-vercel-forwarded-for") ?? "").trim().split(",")[0]?.trim() ?? "";
  if (vercelForwarded && /^[A-Za-z0-9:.]{1,64}$/.test(vercelForwarded)) return vercelForwarded;
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",").map((part) => part.trim()).filter(Boolean)[0] ?? "";
  if (first && /^[A-Za-z0-9:.]{1,64}$/.test(first)) return first;
  return "unknown";
}

/** Actual POST body byte size; never trust Content-Length (missing on chunked). */
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
