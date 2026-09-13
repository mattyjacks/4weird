import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SERVER-ONLY: uses node:dns + node:net. Never import this module in a
 * client component.
 *
 * SSRF egress guard for server-side fetches of caller-supplied URLs.
 * Blocks: non-https schemes, credentials in URL, private/loopback/link-local/
 * reserved IPs (including non-canonical numeric forms like 2130706433,
 * 0x7f.0.0.1, 0177.0.0.1 that URL parsers and resolvers may still honor),
 * DNS that resolves to such IPs, flapping DNS answers (rebinding race), and
 * protocol-downgrade redirects. Prefer fetchEgressUrl() over raw fetch: it
 * keeps the validation-to-fetch gap to microseconds.
 *
 * Residual risk: without a pinned connection the OS resolver is consulted
 * again at fetch time (TOCTOU). The back-to-back agreement check below
 * shrinks that window to ~milliseconds and refuses flapping names; full
 * pinning needs a custom dispatcher (undici, not a dependency) and is
 * intentionally not hand-rolled here.
 */

function isBlockedIp(ip: string): boolean {
  // IPv4-mapped IPv6 normalization.
  const v = ip.toLowerCase().startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v) === 4) {
    const p = v.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // cloud metadata
    if (a === 0) return true; // current network
    if (a >= 224) return true; // multicast + reserved + broadcast
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && p[2] === 2) return true; // TEST-NET-1
    if (a === 198 && b === 51 && p[2] === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && p[2] === 113) return true; // TEST-NET-3
    if (a === 192 && b === 88 && p[2] === 99) return true; // 6to4 relay
    return false;
  }
  if (isIP(v) === 6) {
    const l = v.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("fe80:") || l.startsWith("fec0:") || l.startsWith("fc00:") || l.startsWith("fd00:")) return true;
    if (l.startsWith("ff00:")) return true;
    if (l === "::ffff:0:0" || l.startsWith("::ffff:0:")) return true;
    return false;
  }
  return true; // not an IP at all -> treat as blocked (callers pass resolved IPs)
}

function parseNumPart(part: string): number | null {
  if (!part) return null;
  if (/^0x[0-9a-f]+$/i.test(part)) {
    const n = parseInt(part, 16);
    return Number.isSafeInteger(n) ? n : null;
  }
  if (/^0[0-9]+$/.test(part)) {
    // Leading zero = octal in inet_aton semantics; "09" is invalid and
    // fails closed (null) so the resolver path refuses it too.
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
 * forms (127.1, 10.1). Returns "" when the host is not a numeric form
 * (normal hostnames fall through to DNS), or "0.0.0.0" (blocked) when the
 * form is numeric but out of range.
 */
function canonicalizeObscuredIpv4(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.+$/, "");
  if (!h || isIP(h)) return "";
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

function basicUrlChecks(raw: string): { url: URL } | { error: string } {
  const v = String(raw ?? "").trim();
  if (!v.startsWith("https://") || v.length > 2048) return { error: "Only https URLs (<=2048 chars) are accepted." };
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return { error: "Invalid URL." };
  }
  if (url.protocol !== "https:") return { error: "Only https URLs are accepted." };
  if (url.username || url.password) return { error: "Credentials in URL are not allowed." };
  if (url.port && !["443", ""].includes(url.port)) {
    // Non-standard ports are a port-scan oracle; deny.
    return { error: "Non-standard ports are not allowed." };
  }
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { error: "That host is not allowed." };
  }
  if (isIP(host)) {
    if (isBlockedIp(host)) return { error: "That host is not allowed." };
    return { url };
  }
  // Non-canonical numeric IPv4 (dword/hex/octal/short) that fetch's resolver
  // would honor as an IP must face the same blocklist as literal IPs.
  const obscured = canonicalizeObscuredIpv4(host);
  if (obscured && isBlockedIp(obscured)) return { error: "That host is not allowed." };
  return { url };
}

function addrSet(records: { address: string; family: number }[]): string {
  return records
    .map((r) => `${r.address}/${r.family}`)
    .sort()
    .join(",");
}

/** Validate + DNS-check a caller-supplied https URL. Returns the URL when allowed. */
export async function checkEgressUrl(raw: string): Promise<{ url: URL } | { error: string }> {
  const basic = basicUrlChecks(raw);
  if ("error" in basic) return basic;
  try {
    const first = await lookup(basic.url.hostname, { all: true });
    if (!first.length) return { error: "Host does not resolve." };
    for (const r of first) {
      if (isBlockedIp(r.address)) return { error: "That host is not allowed." };
    }
    // Re-resolve back-to-back: flapping answers mean someone is racing DNS
    // (rebinding). Refuse unless both resolutions agree.
    const second = await lookup(basic.url.hostname, { all: true });
    if (addrSet(second) !== addrSet(first)) return { error: "Host resolution is unstable." };
    return basic;
  } catch {
    return { error: "Host does not resolve." };
  }
}

/**
 * Validate a caller-supplied URL and fetch it immediately with downgrade
 * redirects refused. Prefer this over check-then-fetch in caller code: no
 * caller logic runs between validation and fetch, minimizing the TOCTOU gap.
 */
export async function fetchEgressUrl(raw: string, init?: RequestInit): Promise<Response> {
  const checked = await checkEgressUrl(raw);
  if ("error" in checked) throw new Error(checked.error);
  return fetch(checked.url.toString(), { ...init, redirect: "error" });
}
