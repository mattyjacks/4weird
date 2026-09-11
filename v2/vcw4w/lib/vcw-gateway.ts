/**
 * VCW gateway pricing + key helpers (Option C Hybrid: hosted coins + BYOK).
 *
 * Money law (rules as code; counsel reviews the mapping):
 * - Closed-loop Vibe Coins only: coins are earned/spent in-app, there is NO
 *   cash-out anywhere in this app, so no money-transmission.
 * - LICENSE §4 commercial terms: $420/mo platform fee; hosted GPU routes
 *   carry a 15% markup over provider cost (VCW_GATEWAY_MARKUP_HOSTED_PCT)
 *   and enterprise/org routes carry 9% (VCW_GATEWAY_MARKUP_ENTERPRISE_PCT).
 * - Every metered gross INCLUDES the 25% platform cut (cut + provider =
 *   gross, never added on top), same as every other compute surface.
 * - New Hampshire law governs; receipts show coins + USD before consent.
 *
 * CLIENT-SAFE pure module: no server imports, no env access, no fetch, no
 * Supabase. Key generation uses globalThis.crypto (Web Crypto: browsers +
 * Node 18+) so this file renders in the browser with no credentials.
 * Mirrors supabase/migrations/20261020000000_vcw_gateway_byok.sql
 * (meter_vcw_usage rates + 25% cut) -- keep the two in sync.
 */

/** Tag prefix for gateway secrets; the DB stores only prefix + hash. */
export const VCW_GATEWAY_KEY_TAG = "vcw_live_" as const;

/** Random suffix length (alphanumeric chars) after the tag. */
export const VCW_GATEWAY_KEY_LEN = 32 as const;

export const VCW_GATEWAY_SCOPES = ["vcw:read", "vcw:write", "vcw:admin"] as const;
export type VcwGatewayScope = (typeof VCW_GATEWAY_SCOPES)[number];

export const VCW_GATEWAY_OPS = [
  "run-open",
  "action-step",
  "bug-file",
  "handoff",
  "worker-min",
  "byok-route",
] as const;
export type VcwGatewayOp = (typeof VCW_GATEWAY_OPS)[number];

/** Gross coins per unit, cut INCLUDED (mirrors meter_vcw_usage). */
export const VCW_GATEWAY_RATES: Record<VcwGatewayOp, number> = {
  "run-open": 10,
  "action-step": 1,
  "bug-file": 2,
  handoff: 5,
  "worker-min": 6,
  "byok-route": 2,
};

/** Same 25% as every other compute surface; one rule. */
export const VCW_GATEWAY_CUT_PCT = 25 as const;

/** Smallest billable amount: one centicentcoin. */
export const VCW_GATEWAY_FLOOR_COINS = 0.01 as const;

/** Hosted GPU markup over provider cost (LICENSE §4 standard). */
export const VCW_GATEWAY_MARKUP_HOSTED_PCT = 15 as const;

/** Enterprise/org markup over provider cost (LICENSE §4 enterprise). */
export const VCW_GATEWAY_MARKUP_ENTERPRISE_PCT = 9 as const;

export const VCW_GATEWAY_MODES = ["hosted", "byok"] as const;
export type VcwGatewayMode = (typeof VCW_GATEWAY_MODES)[number];

export function isVcwGatewayOp(value: unknown): value is VcwGatewayOp {
  return typeof value === "string" && (VCW_GATEWAY_OPS as readonly string[]).includes(value);
}

export function isVcwGatewayMode(value: unknown): value is VcwGatewayMode {
  return typeof value === "string" && (VCW_GATEWAY_MODES as readonly string[]).includes(value);
}

/** Gross coin quote for an op x qty (cut included, floor 0.01). Throws on bad input. */
export function quoteVcwGateway(op: string, qty: number): number {
  if (!isVcwGatewayOp(op)) throw new Error(`unknown VCW gateway op: ${String(op)}`);
  const q = Number(qty);
  if (!Number.isFinite(q) || q < 0 || q > 100000000) {
    throw new Error("qty must be a number in 0..100000000");
  }
  const gross = Math.round(VCW_GATEWAY_RATES[op] * q * 100) / 100;
  return Math.max(VCW_GATEWAY_FLOOR_COINS, gross);
}

/** Split a gross into the 25% platform cut + 75% provider share. */
export function vcwGatewaySplit(gross: number): { gross: number; cut: number; provider: number } {
  const g = Math.round(Number(gross) * 100) / 100;
  if (!Number.isFinite(g) || g < 0) throw new Error("gross must be a non-negative number");
  const cut = Math.round((g * VCW_GATEWAY_CUT_PCT) / 100 * 100) / 100;
  const provider = Math.round((g - cut) * 100) / 100;
  return { gross: g, cut, provider };
}

/** Hosted/enterprise quote: provider-cost gross plus a % markup on top. */
export function hostedQuoteWithMarkup(
  gross: number,
  pct: number = VCW_GATEWAY_MARKUP_HOSTED_PCT,
): number {
  const g = Number(gross);
  const p = Number(pct);
  if (!Number.isFinite(g) || g < 0) throw new Error("gross must be a non-negative number");
  if (!Number.isFinite(p) || p < 0 || p > 100) throw new Error("markup pct must be 0..100");
  return Math.round(g * (1 + p / 100) * 100) / 100;
}

const GATEWAY_KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** New random gateway secret: tag + 32 alphanumeric chars. Show once, hash, never store. */
export function generateVcwGatewayKey(): string {
  const bytes = new Uint8Array(VCW_GATEWAY_KEY_LEN);
  globalThis.crypto.getRandomValues(bytes);
  let suffix = "";
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += GATEWAY_KEY_ALPHABET[bytes[i] % GATEWAY_KEY_ALPHABET.length];
  }
  return `${VCW_GATEWAY_KEY_TAG}${suffix}`;
}

/** DB prefix for key lookup: first 8 chars of the suffix (after the tag). */
export function gatewayKeyPrefix(key: unknown): string {
  const s = String(key ?? "");
  const suffix = s.startsWith(VCW_GATEWAY_KEY_TAG) ? s.slice(VCW_GATEWAY_KEY_TAG.length) : s;
  return suffix.slice(0, 8);
}

/** Human price line: "8 coins ($0.08)"; shown before AND on every receipt. */
export function priceLineCoins(coins: number): string {
  const c = Math.round(Number(coins) * 100) / 100;
  return `${c} coins ($${(c / 100).toFixed(2)})`;
}
