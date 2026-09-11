/**
 * VCW BYOK (bring-your-own-key) helpers: provider kinds, labels, routing.
 *
 * The gateway never stores a full third-party secret: public.vcw_byok_providers
 * keeps only kind + label + last4 + endpoint_url (see
 * supabase/migrations/20261020000000_vcw_gateway_byok.sql). Full keys live
 * server-side only (vault / env), are pasted by the key owner, and must never
 * be logged, returned by an API, or rendered in the browser -- use last4Of()
 * for display and redactSecrets() before logging any object that might carry
 * one.
 *
 * CLIENT-SAFE pure module: no server imports, no env access, no fetch.
 */

export const VCW_BYOK_KINDS = ["runpod", "openai", "fal", "meshy", "custom"] as const;
export type VcwByokKind = (typeof VCW_BYOK_KINDS)[number];

export function isVcwByokKind(value: unknown): value is VcwByokKind {
  return typeof value === "string" && (VCW_BYOK_KINDS as readonly string[]).includes(value);
}

/** Trim + collapse whitespace, cap at 80 chars (may return "" for blank input). */
export function cleanByokLabel(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

/** Last 4 alphanumeric chars of a secret for display; "" when fewer than 4 exist. */
export function last4Of(secret: unknown): string {
  const alnum = String(secret ?? "").replace(/[^A-Za-z0-9]/g, "");
  if (alnum.length < 4) return "";
  return alnum.slice(-4);
}

const SECRET_KEY_PATTERN = /key|token|secret|password/i;

/** Deep-redact any object/array: values under keys matching /key|token|secret|password/i become "[redacted]". */
export function redactSecrets<T>(value: T, seen: Set<unknown> = new Set()): T {
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[circular]" as unknown as T;
    seen.add(value);
    return value.map((entry) => redactSecrets(entry, seen)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return "[circular]" as unknown as T;
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_PATTERN.test(k) ? "[redacted]" : redactSecrets(v, seen);
    }
    return out as unknown as T;
  }
  return value;
}

export type VcwRouteDecision = "hosted" | "byok";

/** Route pick: "byok" iff the caller has a provider configured, else "hosted". */
export function decideRoute(input: { hasProvider: unknown; orgPlan?: unknown }): VcwRouteDecision {
  return input.hasProvider === true ? "byok" : "hosted";
}

/** Per-kind setup hints: where to paste the key. Only the last 4 characters
 * are ever stored -- never log, share, or render the full secret. */
export const BYOK_SETUP_HINTS: Record<VcwByokKind, string> = {
  runpod:
    "Paste a Runpod API key from runpod.ai > Settings > API Keys. Only the last 4 characters are stored; never log or share the full key.",
  openai:
    "Paste an OpenAI API key from platform.openai.com > API keys. Only the last 4 characters are stored; never log or share the full key.",
  fal: "Paste a fal.ai key from fal.ai > dashboard > API Keys (FAL_KEY). Only the last 4 characters are stored; never log or share the full key.",
  meshy:
    "Paste a Meshy API key from meshy.ai > API Keys (MESHY_API_KEY). Only the last 4 characters are stored; never log or share the full key.",
  custom:
    "Paste your provider key plus its HTTPS endpoint URL. Only the last 4 characters are stored; never log or share the full key.",
};
