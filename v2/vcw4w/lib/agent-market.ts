/**
 * Shared validation + error mapping for the agent-rental marketplace APIs.
 * Prices throughout are GROSS cents and already include the 25% platform
 * cut (SERVICE_CUT_PCT) — the cut is never added on top.
 */

export const RUNTIMES = ["openclaw", "nanoclaw", "custom"] as const;
export type Runtime = (typeof RUNTIMES)[number];

export const PROVIDER_CODES = ["runpod", "digitalocean", "custom"] as const;
export type ProviderCode = (typeof PROVIDER_CODES)[number];

export function isRuntime(value: unknown): value is Runtime {
  return (
    typeof value === "string" &&
    (RUNTIMES as readonly string[]).includes(value)
  );
}

export function isProviderCode(value: unknown): value is ProviderCode {
  return (
    typeof value === "string" &&
    (PROVIDER_CODES as readonly string[]).includes(value)
  );
}

export function cleanListingName(value: unknown): string {
  return String(value ?? "").trim().slice(0, 80);
}

export function isHttpsEndpoint(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

export function isPriceCentsPerHour(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 100000) return 0;
  return v;
}

export function isHours(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 720) return 0;
  return v;
}

export function isHeartbeatSeconds(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 86400) return 0;
  return v;
}

/** Map a Supabase RPC failure to an HTTP status (all RPC raises are client
 *  errors except unexpected internals). */
export function rpcStatus(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("authentication required") || m.includes("login required"))
    return 401;
  if (m.includes("not authorized")) return 403;
  if (m.includes("not found")) return 404;
  return 400;
}
