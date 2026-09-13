/**
 * Shared UseBouncer email-verification client (server-only).
 *
 * Server-only: reads `BOUNCER_API_KEY` (primary) / `USEBOUNCER_API_KEY`
 * (alias) from process env. Never import from client components and never
 * persist `NEXT_PUBLIC_*` keys here. Dependency-free except global fetch.
 *
 * API: GET {BOUNCER_API_BASE}/email/verify?email=<email>&timeout=<secs>
 * with header `x-api-key: <key>`. Rate limit ~1000 req/min.
 */

export const BOUNCER_API_BASE = "https://api.usebouncer.com/v1.1";
export const BOUNCER_TIMEOUT_DEFAULT = 10;

export type BouncerStatus = "deliverable" | "risky" | "undeliverable" | "unknown";

export type BouncerRiskLevel = "low" | "medium" | "high";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_STATUSES: readonly BouncerStatus[] = [
  "deliverable",
  "risky",
  "undeliverable",
  "unknown",
];

/**
 * Resolve the Bouncer API key (server-only).
 * Primary: BOUNCER_API_KEY, alias: USEBOUNCER_API_KEY, '' when unset.
 */
export function resolveBouncerKey(): string {
  const primary = process.env.BOUNCER_API_KEY;
  if (primary && primary.trim().length > 0) return primary.trim();
  const alias = process.env.USEBOUNCER_API_KEY;
  if (alias && alias.trim().length > 0) return alias.trim();
  return "";
}

/**
 * Normalize a raw status string to the Bouncer status union.
 * Anything unrecognized maps to "unknown".
 */
export function normalizeBouncerStatus(raw: unknown): BouncerStatus {
  if (typeof raw !== "string") return "unknown";
  const v = raw.trim().toLowerCase();
  return (VALID_STATUSES as readonly string[]).includes(v)
    ? (v as BouncerStatus)
    : "unknown";
}

/**
 * True when the address looks like a spam-trap / low-quality risk:
 * toxicity >= 3 or reason is "low_quality".
 */
export function isSpamTrapRisk(toxicity: unknown, reason: unknown): boolean {
  const t = typeof toxicity === "number" && Number.isFinite(toxicity) ? toxicity : 0;
  if (t >= 3) return true;
  return typeof reason === "string" && reason.trim().toLowerCase() === "low_quality";
}

/**
 * Derive low|medium|high from status + score (0-100, higher is better)
 * + toxicity (0-5, higher is worse).
 */
export function deriveRiskLevel(
  status: BouncerStatus,
  score: number,
  toxicity: number,
): BouncerRiskLevel {
  const s = Number.isFinite(score) ? score : 0;
  const t = Number.isFinite(toxicity) ? toxicity : 0;
  if (status === "undeliverable" || t >= 3 || s < 40) return "high";
  if (status === "risky" || status === "unknown" || s < 70 || t >= 1) return "medium";
  return "low";
}

export interface BouncerResult {
  email: string;
  status: BouncerStatus;
  reason: string;
  score: number;
  toxicity: number;
  toxic: boolean;
  didYouMean?: string;
  domainName: string;
  isAcceptAll: boolean;
  isDisposable: boolean;
  isFree: boolean;
  isRole: boolean;
  provider: string;
  /** True when toxicity >= 3 or reason is low_quality. */
  isSpamTrapRisk: boolean;
  riskLevel: BouncerRiskLevel;
}

interface BouncerApiResponse {
  email?: unknown;
  status?: unknown;
  reason?: unknown;
  score?: unknown;
  toxicity?: unknown;
  toxic?: unknown;
  didYouMean?: unknown;
  domain?: {
    name?: unknown;
    acceptAll?: unknown;
    disposable?: unknown;
    free?: unknown;
  };
  account?: {
    role?: unknown;
  };
  provider?: unknown;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toBool(value: unknown): boolean {
  return value === true;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Verify a single email via UseBouncer.
 * Throws a descriptive Error on invalid input, missing key, network,
 * non-2xx, or bad JSON (fail-open: callers catch and treat as unknown).
 */
export async function verifySingleEmail(
  email: string,
  apiKey?: string,
  timeoutMs: number = BOUNCER_TIMEOUT_DEFAULT,
): Promise<BouncerResult> {
  const candidate = typeof email === "string" ? email.trim() : "";
  if (!EMAIL_RE.test(candidate)) {
    throw new Error(`Invalid email address: "${toText(email).slice(0, 120)}".`);
  }

  const key = (typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey.trim() : resolveBouncerKey());
  if (!key) {
    throw new Error(
      "Bouncer API key is not configured. Set BOUNCER_API_KEY (or USEBOUNCER_API_KEY).",
    );
  }

  const url =
    `${BOUNCER_API_BASE}/email/verify` +
    `?email=${encodeURIComponent(candidate)}` +
    `&timeout=${encodeURIComponent(String(timeoutMs))}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": key, accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new Error(
      `Bouncer verify request failed for "${candidate}": ${(err as Error).message ?? String(err)}`,
    );
  }

  if (!res.ok) {
    throw new Error(`Bouncer verify failed: HTTP ${res.status} for "${candidate}".`);
  }

  let data: BouncerApiResponse;
  try {
    data = (await res.json()) as BouncerApiResponse;
  } catch {
    throw new Error(`Bouncer verify returned non-JSON for "${candidate}".`);
  }

  const status = normalizeBouncerStatus(data.status);
  const reason = toText(data.reason);
  const score = toNumber(data.score, 0);
  const toxicity = toNumber(data.toxicity, 0);

  return {
    email: toText(data.email) || candidate,
    status,
    reason,
    score,
    toxicity,
    toxic: toBool(data.toxic),
    ...(typeof data.didYouMean === "string" && data.didYouMean.length > 0
      ? { didYouMean: data.didYouMean }
      : {}),
    domainName: toText(data.domain?.name),
    isAcceptAll: toBool(data.domain?.acceptAll),
    isDisposable: toBool(data.domain?.disposable),
    isFree: toBool(data.domain?.free),
    isRole: toBool(data.account?.role),
    provider: toText(data.provider),
    isSpamTrapRisk: isSpamTrapRisk(toxicity, reason),
    riskLevel: deriveRiskLevel(status, score, toxicity),
  };
}
