/**
 * ssrf-guard.ts — SSRF + rate-limit shield for external media imports.
 *
 * README §6 (Security Hardening & 300-Fix Standard), esp. §6.4 "Rate Limiting
 * & SSRF Protection" (`lib/ssrf-guard.ts`): every external URL passed to a
 * video/image processor must pass through `assertSafeUrl` first. §6.3
 * (concurrency-guard patterns) informs the synchronous atomic check-and-set
 * in `createRateLimiter().tryAcquire`. Axiom 1.2 (fail-open) applies to the
 * *caller*: this guard itself is deny-by-default (it THROWS on unsafe input)
 * but it never performs I/O (no fetch, no DNS, no sockets, no browser APIs),
 * so it can never "fail" at runtime — when the downstream fetch/AI service is
 * unreachable, the caller must fall back to heuristics, never brick navigation.
 *
 * Pure module: only the `URL` global + `Date.now()` are used. No network calls.
 *
 * DOCUMENTED LIMITATION (DNS rebinding): only IP *literals* in the URL are
 * checked here. A hostname such as `evil.example.com` may resolve to a private
 * IP (or re-resolve between check and fetch). Callers MUST resolve DNS at
 * fetch time and re-check every resolved IP with `isIpLiteralBlocked(ip)`
 * (alias: `isBlockedIp`) before opening a socket, follow at most
 * `MAX_REDIRECTS` redirects re-validating each `Location` with
 * `assertSafeUrl` + `redirectAllowed`, and never fetch a hostname that
 * resolves to a blocked literal.
 */
export const MAX_REDIRECTS = 5;
export const BLOCKED_REASONS = {
  EMPTY: "empty-url",
  UNPARSEABLE: "unparseable-url",
  PROTOCOL: "disallowed-protocol",
  USERINFO: "userinfo-present",
  LOCALHOST: "localhost-blocked",
  PRIVATE_IP: "private-ip-blocked",
  METADATA: "metadata-host-blocked",
} as const;

export type BlockedReason =
  (typeof BLOCKED_REASONS)[keyof typeof BLOCKED_REASONS];

export class UnsafeUrlError extends Error {
  readonly reason: BlockedReason;
  readonly host: string;

  constructor(reason: BlockedReason, host: string) {
    super(`Blocked unsafe URL (host="${host}", reason="${reason}")`);
    this.name = "UnsafeUrlError";
    this.reason = reason;
    this.host = host;
  }
}

/** Back-compat alias: identical to {@link UnsafeUrlError}. */
export class SsrfBlockedError extends UnsafeUrlError {
  constructor(reason: BlockedReason, host: string) {
    super(reason, host);
    this.name = "SsrfBlockedError";
  }
}

/** Validated-URL info returned by {@link assertSafeUrl}. */
export interface SafeUrlInfo {
  /** Lowercased hostname without trailing dots (no brackets for IPv6). */
  host: string;
  /** URL protocol including colon, always `"http:"` or `"https:"`. */
  protocol: "http:" | "https:";
  /** Explicit port as written in the URL, `""` when default/unspecified. Non-default ports are allowed. */
  port: string;
  /** Normalized href. */
  href: string;
}

// Strict dotted-quad parser; returns octets or null.
function parseIPv4Octets(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (part.length === 0 || part.length > 3) return null;
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

// Single-integer form (e.g. http://2130706433/ === 127.0.0.1).
function intToIPv4Octets(text: string): number[] | null {
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > 4294967295) return null;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function octetsArePrivate(o: number[]): boolean {
  if (o[0] === 0) return true; // 0.0.0.0/8 "this network" (unspecified)
  if (o[0] === 127) return true; // 127.0.0.0/8 loopback
  if (o[0] === 10) return true; // 10.0.0.0/8
  if (o[0] === 192 && o[1] === 168) return true; // 192.168.0.0/16
  if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true; // 172.16.0.0/12
  if (o[0] === 169 && o[1] === 254) return true; // 169.254.0.0/16 (covers 169.254.169.254)
  return false;
}

export function isPrivateIPv4(ip: string): boolean {
  const text = ip.trim();
  const dotted = parseIPv4Octets(text);
  if (dotted !== null) return octetsArePrivate(dotted);
  const fromInt = intToIPv4Octets(text);
  if (fromInt !== null) return octetsArePrivate(fromInt);
  return false;
}

// First hextet of a bare IPv6 literal (no brackets, no port).
function firstHextet(v6: string): number | null {
  const noZone = v6.split("%")[0] ?? "";
  const head = noZone.split(":")[0] ?? "";
  if (head.length === 0 || head.length > 4) return null;
  if (!/^[0-9a-f]+$/.test(head)) return null;
  return parseInt(head, 16);
}

export function isBlockedIp(ip: string): boolean {
  let text = ip.trim().toLowerCase();
  // Strip one layer of brackets + trailing dots (copy-pasted URLs).
  if (text.startsWith("[") && text.endsWith("]")) text = text.slice(1, -1);
  while (text.endsWith(".")) text = text.slice(0, -1);
  if (text.length === 0) return false;

  // IPv4-mapped IPv6 (e.g. ::ffff:10.0.0.1): judge by the embedded IPv4.
  if (text.includes(".") && text.includes(":")) {
    const embedded = text.slice(text.lastIndexOf(":") + 1);
    return isPrivateIPv4(embedded);
  }
  if (text.includes(".")) return isPrivateIPv4(text);
  if (/^\d+$/.test(text)) return isPrivateIPv4(text); // decimal single-int form
  if (!text.includes(":")) return false;

  // Hex-encoded embedded IPv4: ::ffff:XXXX:XXXX (mapped) or ::XXXX:XXXX
  // (compatible, deprecated). WHATWG URL normalizes dotted forms to these —
  // e.g. http://[::ffff:127.0.0.1]/ has hostname "::ffff:7f00:1" — so judge
  // the embedded 32 bits as IPv4.
  const noZone = text.split("%")[0] ?? "";
  const mapped = noZone.match(/^(?:::|0(?::0){4,5}:)(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const hi = parseInt(mapped[1] ?? "", 16);
    const lo = parseInt(mapped[2] ?? "", 16);
    if (
      octetsArePrivate([(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255])
    ) {
      return true;
    }
  }

  if (text === "::" || text === "::1" || text === "0:0:0:0:0:0:0:0" || text === "0:0:0:0:0:0:0:1") return true;
  const first = firstHextet(text);
  if (first === null) return false;
  if (first >= 0xfe80 && first <= 0xfebf) return true; // fe80::/10 link-local
  if (first >= 0xfc00 && first <= 0xfdff) return true; // fc00::/7 unique-local
  return false;
}

function stripTrailingDots(host: string): string {
  let out = host;
  while (out.endsWith(".")) out = out.slice(0, -1);
  return out;
}

// http/https only; rejects userinfo; returns lowercased hostname or null.
export function parseHostname(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username.length > 0 || parsed.password.length > 0) return null;
  const host = stripTrailingDots(parsed.hostname.toLowerCase());
  if (host.length === 0) return null;
  return host;
}

/**
 * Returns true when an already-resolved IP literal must not be fetched.
 * Hostnames must be DNS-resolved by the caller first (see module docblock),
 * then every resolved address passed here. Alias of `isBlockedIp`.
 */
export function isIpLiteralBlocked(ip: string): boolean {
  return isBlockedIp(ip);
}

/** True while another redirect hop is still within budget. */
export function redirectAllowed(count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count < MAX_REDIRECTS;
}

export interface RateLimiterOptions {
  /** Max acquisitions per window per key. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimiter {
  /** Atomically consume one token for `key` (default shared bucket). Synchronous, so no lock is needed (§6.3). */
  tryAcquire(key?: string): boolean;
  /** Tokens remaining in the current window for `key`. */
  getRemaining(key?: string): number;
  /** Forget all buckets (tests/teardown). */
  reset(): void;
  /**
   * §6.4 explicit-clock take on the default bucket: consumes one token.
   * Fail-closed on a bad clock (non-finite nowMs, or a backwards clock,
   * returns false rather than allowing a burst).
   */
  tryTake(nowMs?: number): boolean;
}

/**
 * Simple in-memory fixed-window rate limiter. Pure (no I/O);
 * not shared across processes — one instance per server instance.
 *
 * Two call shapes (same implementation):
 * - `createRateLimiter(maxRequests, windowMs)` — §6.4 positional form.
 * - `createRateLimiter({ max, windowMs })` — keyed-bucket options form.
 * Both validate finite positive args (throw otherwise).
 */
export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter;
export function createRateLimiter(options: RateLimiterOptions): RateLimiter;
export function createRateLimiter(
  maxRequestsOrOptions: number | RateLimiterOptions,
  windowMsMaybe?: number,
): RateLimiter {
  let maxRaw: unknown;
  let windowRaw: unknown;
  if (typeof maxRequestsOrOptions === "object" && maxRequestsOrOptions !== null) {
    maxRaw = maxRequestsOrOptions.max;
    windowRaw = maxRequestsOrOptions.windowMs;
  } else {
    maxRaw = maxRequestsOrOptions;
    windowRaw = windowMsMaybe;
  }
  if (!Number.isFinite(maxRaw as number) || (maxRaw as number) <= 0) {
    throw new Error(
      `createRateLimiter: maxRequests must be a finite positive number (got ${String(maxRaw)})`,
    );
  }
  if (!Number.isFinite(windowRaw as number) || (windowRaw as number) <= 0) {
    throw new Error(
      `createRateLimiter: windowMs must be a finite positive number (got ${String(windowRaw)})`,
    );
  }
  const max = Math.max(1, Math.floor(maxRaw as number));
  const windowLen = Math.max(1, Math.floor(windowRaw as number));

  interface Bucket {
    count: number;
    start: number | null;
  }
  const buckets = new Map<string, Bucket>();

  function takeFrom(bucket: Bucket, now: number): boolean {
    if (!Number.isFinite(now)) return false; // fail-closed on bad clock
    if (bucket.start === null || now - bucket.start >= windowLen) {
      if (bucket.start !== null && now < bucket.start) return false; // skewed clock: deny
      bucket.start = now;
      bucket.count = 0;
    }
    if (now < (bucket.start as number)) return false;
    if (bucket.count >= max) return false;
    bucket.count += 1;
    return true;
  }

  function bucketFor(key: string, now: number): Bucket {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, start: null };
      buckets.set(key, bucket);
    }
    void now;
    return bucket;
  }

  return {
    tryAcquire(key = "default"): boolean {
      return takeFrom(bucketFor(key, Date.now()), Date.now());
    },
    getRemaining(key = "default"): number {
      const bucket = buckets.get(key);
      if (!bucket || bucket.start === null) return max;
      if (Date.now() - bucket.start >= windowLen) return max;
      return Math.max(0, max - bucket.count);
    },
    reset(): void {
      buckets.clear();
    },
    tryTake(nowMs?: number): boolean {
      const now = nowMs === undefined ? Date.now() : nowMs;
      return takeFrom(bucketFor("default", now), now);
    },
  };
}

export function assertSafeUrl(url: string | URL): SafeUrlInfo {
  const trimmed = typeof url === "string" ? url.trim() : url.href;
  if (trimmed.length === 0) throw new UnsafeUrlError(BLOCKED_REASONS.EMPTY, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UnsafeUrlError(BLOCKED_REASONS.UNPARSEABLE, "");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError(BLOCKED_REASONS.PROTOCOL, parsed.hostname || "");
  }
  // Reject credentials (`user:pass@host`) — phishing + log-poisoning vector.
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new UnsafeUrlError(BLOCKED_REASONS.USERINFO, parsed.hostname || "");
  }
  const host = stripTrailingDots(parsed.hostname.toLowerCase());
  if (host.length === 0) throw new UnsafeUrlError(BLOCKED_REASONS.UNPARSEABLE, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new UnsafeUrlError(BLOCKED_REASONS.LOCALHOST, host);
  }
  if (host === "metadata.google.internal") {
    throw new UnsafeUrlError(BLOCKED_REASONS.METADATA, host);
  }
  if (isBlockedIp(host)) throw new UnsafeUrlError(BLOCKED_REASONS.PRIVATE_IP, host);
  return {
    host,
    protocol: parsed.protocol,
    port: parsed.port,
    href: parsed.href,
  };
}

export function isSafeUrl(raw: string): boolean {
  if (typeof raw !== "string") return false;
  try {
    assertSafeUrl(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * §6.4 required entry point: returns the parsed URL when the target is a
 * safe public http(s) URL, otherwise throws an Error naming the reason
 * (UnsafeUrlError message carries `reason="..."` and `host="..."`).
 * Pure: regex + numeric range checks only, no DNS lookups.
 */
export function assertPublicHttpUrl(raw: string): URL {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new UnsafeUrlError(BLOCKED_REASONS.EMPTY, "");
  }
  const info = assertSafeUrl(raw); // throws with a named reason on unsafe input
  return new URL(info.href);
}

/**
 * Allow only same-origin relative redirect targets: must start with a single
 * "/" (no "//", no backslash, no protocol/colon, no whitespace/controls,
 * no encoded slash/backslash). Returns `fallback` otherwise. Pure.
 */
export function sanitizeRedirectTarget(raw: string, fallback = "/"): string {
  const safeFallback = typeof fallback === "string" && fallback.length > 0 ? fallback : "/";
  if (typeof raw !== "string" || raw.length === 0) return safeFallback;
  if (!raw.startsWith("/")) return safeFallback;
  if (raw.startsWith("//")) return safeFallback;
  if (raw.includes("\\")) return safeFallback;
  if (/[\s\x00-\x1f\x7f]/.test(raw)) return safeFallback;
  if (raw.includes(":")) return safeFallback; // no protocol / scheme tricks
  if (/%2f|%5c/i.test(raw)) return safeFallback; // encoded "/" or "\"
  return raw;
}
