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
 * localhost/internal names, and literal blocked IPs.
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
