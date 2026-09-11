import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF egress guard for server-side fetches of caller-supplied URLs.
 * Blocks: non-https schemes, credentials in URL, private/loopback/link-local/
 * reserved IPs, DNS that resolves to such IPs, and protocol-downgrade
 * redirects. Use with fetch(..., { redirect: "error" }).
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
  return { url };
}

/** Validate + DNS-pin a caller-supplied https URL. Returns the URL or "" when blocked. */
export async function checkEgressUrl(raw: string): Promise<{ url: URL } | { error: string }> {
  const basic = basicUrlChecks(raw);
  if ("error" in basic) return basic;
  try {
    const records = await lookup(basic.url.hostname, { all: true });
    if (!records.length) return { error: "Host does not resolve." };
    for (const r of records) {
      if (isBlockedIp(r.address)) return { error: "That host is not allowed." };
    }
    return basic;
  } catch {
    return { error: "Host does not resolve." };
  }
}
