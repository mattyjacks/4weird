/**
 * Shared validation + error mapping for the agent-rental marketplace APIs.
 * Prices throughout are GROSS cents and already include the 25% platform
 * cut (SERVICE_CUT_PCT); the cut is never added on top.
 *
 * Buyer model: every hourly figure is a MAXIMUM quote ("up to $X/hr").
 * Metering settles per second from the first second:
 *   gross_cents(seconds) = round(price_cents_per_hour * seconds / 3600),
 * so a partial hour never costs the full hour. Heartbeat rows can never
 * exceed the booking escrow (enforced in heartbeat_usage).
 */

export const RUNTIMES = [
  "openclaw",
  "nanoclaw",
  "vibecodeworker",
  "xonotic-vcw",
  "xonotic-self",
  "custom",
] as const;
export type Runtime = (typeof RUNTIMES)[number];

/** Human-facing labels for the runtime picker (rent side + host side share them). */
export const RUNTIME_LABELS: Record<Runtime, string> = {
  openclaw: "OpenClaw agent",
  nanoclaw: "NanoClaw agent",
  vibecodeworker: "VibeCodeWorker",
  "xonotic-vcw": "Xonotic - VibeCodeWorker plays",
  "xonotic-self": "Xonotic; you play",
  custom: "Custom",
};

export const RUNTIME_DESCRIPTIONS: Record<Runtime, string> = {
  openclaw: "General-purpose OpenClaw-style agent on your rented server.",
  nanoclaw: "Recommended: lightweight NanoClaw agent on your rented server. Serverful (always-on pod) or serverless (scale-to-zero) + website chat + Telegram.",
  vibecodeworker: "Evidence-driven VibeCodeWorker QA loop on your rented server.",
  "xonotic-vcw": "Xonotic game server where VibeCodeWorker plays for you.",
  "xonotic-self": "Xonotic game server where you play yourself.",
  custom: "Your own container / endpoint.",
};

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

/** Sentinel stored when RunPod auto-provisions the default proxy endpoint. */
export const RUNPOD_AUTO_ENDPOINT = "runpod:auto";

export function isStoredEndpoint(value: unknown): boolean {
  const v = String(value ?? "");
  return v === RUNPOD_AUTO_ENDPOINT || isHttpsEndpoint(v);
}

/** Display form of a stored endpoint: the RunPod default proxy, not a raw sentinel. */
export function displayEndpoint(value: unknown): string {
  const v = String(value ?? "");
  if (v === RUNPOD_AUTO_ENDPOINT) return "RunPod default endpoint (auto-provisioned)";
  return v;
}

/**
 * Endpoint rule per provider:
 * - runpod: no URL needed; blank means "use the RunPod default endpoint".
 * - digitalocean: optional (blank also means auto/default).
 * - custom: a real https URL is required (bring your own endpoint).
 */
export function normalizeEndpointForProvider(
  value: unknown,
  provider: string,
): { endpoint: string; error: string } {
  const v = String(value ?? "").trim();
  if (provider === "custom") {
    if (!isHttpsEndpoint(v)) return { endpoint: "", error: "Custom endpoints need an https URL." };
    return { endpoint: v, error: "" };
  }
  if (!v) return { endpoint: RUNPOD_AUTO_ENDPOINT, error: "" };
  if (v === RUNPOD_AUTO_ENDPOINT) return { endpoint: v, error: "" };
  if (!isHttpsEndpoint(v)) return { endpoint: "", error: "Endpoint must be an https URL." };
  return { endpoint: v, error: "" };
}

export function isPriceCentsPerHour(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 100000) return 0;
  return v;
}

/** Price ceiling in USD/hour (gross, includes the 25% cut). */
export const PRICE_USD_MIN = 0.01;
export const PRICE_USD_MAX = 1000;

export function usdToCentsPerHour(usd: unknown): number {
  const v = Number(usd);
  if (!Number.isFinite(v) || v < PRICE_USD_MIN || v > PRICE_USD_MAX) return 0;
  return Math.round(v * 100);
}

export function centsToUsdPerHour(cents: number): number {
  return Math.round(Number(cents)) / 100;
}

/** Accept either `price_usd_per_hour` (preferred) or legacy `price_cents_per_hour`. */
export function parsePriceInput(input: Record<string, unknown>): number {
  const raw =
    input.price_usd_per_hour ?? input.priceUsdPerHour ?? input.price_usd ?? null;
  if (raw !== null && raw !== undefined && String(raw) !== "") {
    return usdToCentsPerHour(raw);
  }
  return isPriceCentsPerHour(
    input.price_cents_per_hour ?? input.priceCentsPerHour ?? input.price,
  );
}

/** Gross cents owed for N seconds at a cents/hour quote (per-second ledger). */
export function grossCentsForSeconds(priceCentsPerHour: number, seconds: number): number {
  const price = Math.max(0, Math.floor(Number(priceCentsPerHour)));
  const secs = Math.max(0, Math.floor(Number(seconds)));
  if (price <= 0 || secs <= 0) return 0;
  return Math.round((price * secs) / 3600);
}

/** Display per-second rate in USD for a cents/hour quote. */
export function perSecondUsd(priceCentsPerHour: number): number {
  return Math.max(0, Math.floor(Number(priceCentsPerHour))) / 100 / 3600;
}

export function formatUsdPerHour(centsPerHour: number): string {
  return `$${(Math.max(0, Math.floor(Number(centsPerHour))) / 100).toFixed(2)}/hr`;
}

export function isHours(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 720) return 0;
  return v;
}

export function isHeartbeatSeconds(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 3600) return 0;
  return v;
}

/** Map a Supabase RPC failure to an HTTP status (all RPC raises are client
 *  errors except unexpected internals). Money and ownership faults get
 *  their honest codes: short funds 402, foreign rows 404 (never a 400
 *  oracle), caps 409. */
export function rpcStatus(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("authentication required") || m.includes("login required"))
    return 401;
  if (m.includes("insufficient"))
    return 402;
  if (m.includes("not authorized")) return 403;
  if (m.includes("not found") || m.includes("not your child")) return 404;
  if (m.includes("limit reached") || m.includes("already subscribed") || m.includes("cap reached"))
    return 409;
  return 400;
}
