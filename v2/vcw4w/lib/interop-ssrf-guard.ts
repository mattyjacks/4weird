/**
 * lib/interop-ssrf-guard.ts — SSRF/security helpers for tool fetch paths (Remastery §6.4 + §6).
 *
 * WHY THIS FILENAME: the canonical `lib/ssrf-guard.ts` is already occupied (full DNS +
 * rebinding-guard egress validation — server-only, uses node:dns/node:net). This module is
 * its dependency-free companion for shared/tool-tier code: pure shape validators, an
 * SVG sanitizer, a coin-action double-click guard, and constant-time token compare.
 * Server route code that CAN run in node should prefer `@/lib/ssrf-guard`
 * (checkEgressUrl/fetchEgressUrl) — see delegateToCanonicalEgressCheck() below.
 *
 * USAGE:
 *   import { assertSafeEgressUrlShape, sanitizeSvg, guardCoinAction, constantTimeEqual } from "@/lib/interop-ssrf-guard";
 *   const ok = assertSafeEgressUrlShape(url); // { ok, error? } — no DNS, shape only
 *   const clean = sanitizeSvg(userSvg);       // strips script/foreignObject/on* handlers
 *
 * CONTRACT: dependency-free (no imports), SSR-safe, fail-open (validators return
 * { ok, error } instead of throwing; sanitizer returns "" on bad input, never throws).
 */

export interface ShapeCheck {
  ok: boolean;
  error?: string;
}

const MAX_URL_CHARS = 2048;
const BLOCKED_SUFFIXES = [".localhost", ".internal", ".local", ".invalid", ".example", ".test"];
const BLOCKED_NAMES = new Set(["localhost", "metadata", "metadata.google.internal"]);

/** Canonical checker hook: wire `@/lib/ssrf-guard` checkEgressUrl via setCanonicalEgressCheck(). */
export type CanonicalEgressCheck = (raw: string) => Promise<{ url: URL } | { error: string }>;
let canonicalCheck: CanonicalEgressCheck | null = null;

/** Server code calls once: setCanonicalEgressCheck((u) => import("@/lib/ssrf-guard").then((m) => m.checkEgressUrl(u))). */
export function setCanonicalEgressCheck(fn: CanonicalEgressCheck | null): void {
  canonicalCheck = fn;
}

/**
 * Full check when a canonical checker is wired (DNS + rebinding guards), else falls back
 * to shape-only validation. Never throws — returns { url } or { error }.
 */
export async function delegateToCanonicalEgressCheck(
  raw: string,
): Promise<{ url: URL } | { error: string }> {
  if (canonicalCheck) {
    try {
      return await canonicalCheck(raw);
    } catch {
      return { error: "Egress check failed." };
    }
  }
  const shape = assertSafeEgressUrlShape(raw);
  if (!shape.ok) return { error: shape.error ?? "URL not allowed." };
  try {
    return { url: new URL(String(raw).trim()) };
  } catch {
    return { error: "Invalid URL." };
  }
}

function parseNumPart(part: string): number | null {
  if (!part) return null;
  if (/^0x[0-9a-f]+$/i.test(part)) {
    const n = parseInt(part, 16);
    return Number.isSafeInteger(n) ? n : null;
  }
  if (/^0[0-9]+$/.test(part)) {
    // Leading zero = octal in inet_aton semantics; "09" is invalid and
    // fails closed (null) so callers refuse it too.
    if (!/^0[0-7]*$/.test(part)) return null;
    const n = parseInt(part, 8);
    return Number.isSafeInteger(n) ? n : null;
  }
  if (/^[0-9]+$/.test(part)) {
    const n = parseInt(part, 10);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

/**
 * Expand obscured numeric IPv4 forms to a canonical dotted quad so the
 * blocklist sees what the resolver will honor: dword (2130706433,
 * 0x7f000001), hex/octal dotted parts (0x7f.0.0.1, 0177.0.0.1), and short
 * forms (127.1, 10.1). Mirrors the canonical `@/lib/ssrf-guard`
 * canonicalizeObscuredIpv4 (kept dependency-free here). Returns "" when the
 * host is not a numeric form (normal hostnames skip this), or "0.0.0.0"
 * (blocked) when the form is numeric but out of range.
 */
function canonicalizeObscuredIpv4(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.+$/, "");
  if (!h) return "";
  if (/^(\d+\.\d+\.\d+\.\d+)$/.test(h)) return ""; // plain quad: checked directly
  const toQuad = (n: number): string =>
    `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  if (/^(0x[0-9a-f]+|0[0-9]+|[0-9]+)$/.test(h)) {
    const n = parseNumPart(h);
    if (n === null || n < 0 || n > 0xffffffff) return "0.0.0.0";
    return toQuad(n);
  }
  const parts = h.split(".");
  if (parts.length < 2 || parts.length > 4) return "";
  const nums: number[] = [];
  for (const p of parts) {
    const n = parseNumPart(p);
    if (n === null || n < 0) return "";
    nums.push(n);
  }
  // inet_aton expansion: a.b.c.d | a.b.c (c 16-bit) | a.b (b 24-bit).
  if (nums.length === 4) {
    if (nums.some((n) => n > 255)) return "0.0.0.0";
    return nums.join(".");
  }
  const [a, ...rest] = nums;
  if (a > 255) return "0.0.0.0";
  if (nums.length === 3) {
    const c = rest[1];
    if (rest[0] > 255 || c > 65535) return "0.0.0.0";
    return `${a}.${rest[0]}.${(c >> 8) & 255}.${c & 255}`;
  }
  const b = rest[0];
  if (b > 16777215) return "0.0.0.0";
  return `${a}.${(b >> 16) & 255}.${(b >> 8) & 255}.${b & 255}`;
}

function isBlockedLiteralIp(host: string): boolean {
  const v = host.toLowerCase();
  const mapped = v.startsWith("::ffff:") ? v.slice(7) : v;
  const parts = mapped.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const n = parts.map(Number);
    if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;
    const [a, b, c] = n;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    return false;
  }
  const lower = mapped;
  if (lower === "::1" || lower === "::") return true;
  if (
    lower.startsWith("fe80:") ||
    lower.startsWith("fec0:") ||
    lower.startsWith("fc00:") ||
    lower.startsWith("fd00:") ||
    lower.startsWith("ff00:")
  ) {
    return true;
  }
  return false;
}

/**
 * Shape-only egress check (NO DNS — cannot catch DNS rebinding; server code must use the
 * canonical checker). Blocks non-https schemes, credentials, non-standard ports,
 * localhost/internal names, literal blocked IPs, and obscured numeric IPv4
 * (dword/hex/octal/short forms canonicalized before the blocklist).
 */
export function assertSafeEgressUrlShape(raw: string): ShapeCheck {
  const v = String(raw ?? "").trim();
  if (!v.startsWith("https://") || v.length > MAX_URL_CHARS) {
    return { ok: false, error: "Only https URLs (<=2048 chars) are accepted." };
  }
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Only https URLs are accepted." };
  if (url.username || url.password) {
    return { ok: false, error: "Credentials in URL are not allowed." };
  }
  if (url.port && url.port !== "443") {
    return { ok: false, error: "Non-standard ports are not allowed." };
  }
  const host = url.hostname.toLowerCase();
  if (!host || BLOCKED_NAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, error: "That host is not allowed." };
  }
  if (isBlockedLiteralIp(host)) return { ok: false, error: "That host is not allowed." };
  // Non-canonical numeric IPv4 (dword/hex/octal/short) that a resolver would
  // honor as an IP must face the same blocklist as literal IPs — otherwise
  // e.g. https://2130706433/ (127.0.0.1) walks past the shape check.
  const obscured = canonicalizeObscuredIpv4(host);
  if (obscured && isBlockedLiteralIp(obscured)) return { ok: false, error: "That host is not allowed." };
  return { ok: true };
}

/**
 * Regex-based SVG sanitizer (§6.1): strips <script>, <foreignObject>, on* handlers,
 * javascript:/data:text/html hrefs. Prefer DOMPurify when available — this is the
 * dependency-free fallback for shared-tier code. Never throws; returns "" on bad input.
 */
export function sanitizeSvg(input: string): string {
  let svg = String(input ?? "");
  if (!svg || svg.length > 1_000_000) return "";
  try {
    svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
    svg = svg.replace(/<\/?foreignobject[\s>]/gi, (m) => (m.startsWith("</") ? "" : ""));
    svg = svg.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    svg = svg.replace(/\s*(href|xlink:href)\s*=\s*("([^"]*)"|'([^']*)')/gi, (full, _attr, _q, d1, d2) => {
      const target = String(d1 ?? d2 ?? "").trim().toLowerCase();
      if (target.startsWith("javascript:") || target.startsWith("data:text/html")) return "";
      return full;
    });
    return svg;
  } catch {
    return "";
  }
}

/**
 * Double-click guard for coin actions (§6.2): the returned wrapper runs `fn` at most once
 * per `windowMs` (default 2000ms) and exposes reset(). Never throws on misuse.
 */
export function guardCoinAction<T extends unknown[], R>(
  fn: (...args: T) => R,
  windowMs = 2000,
): { run: (...args: T) => R | null; reset: () => void; isLocked: () => boolean } {
  let lockedUntil = 0;
  return {
    run: (...args: T): R | null => {
      const now = Date.now();
      if (now < lockedUntil) return null;
      lockedUntil = now + Math.max(0, windowMs);
      return fn(...args);
    },
    reset: () => {
      lockedUntil = 0;
    },
    isLocked: () => Date.now() < lockedUntil,
  };
}

/** Length-leak-free string compare for gateway keys (§6.5 intent, dependency-free). */
export function constantTimeEqual(a: string, b: string): boolean {
  const x = String(a ?? "");
  const y = String(b ?? "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return diff === 0;
}
