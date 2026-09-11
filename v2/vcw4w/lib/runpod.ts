/**
 * RunPod REST client for the 4weird server.
 *
 * SERVER-ONLY: reads RUNPOD_API_KEY (+ optional RUNPOD_API_BASE). Never
 * import this module in a client component; the key must never reach a
 * browser.
 *
 * What it does: pull REAL billing history (pods / serverless endpoints /
 * network volumes) keyed by Bearer token, so /my/usage can show the
 * operator's genuine RunPod spend next to Vibe Coin spend. Rows are an
 * informational mirror - RunPod bills the card directly, so mirrored rows
 * carry NO Vibe cut.
 *
 * What it never does: synthesize rows. Every failure returns
 * { ok: false, error } with the upstream status; callers surface that state.
 */

export const RUNPOD_API_BASE_DEFAULT = "https://api.runpod.io/v2";

const RUNPOD_API_BASE_ALLOW = new Set(["https://api.runpod.io/v2", "https://api.runpod.ai/v2"]);

export function runpodApiBase(): string {
  const raw = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "");
  // Allowlist https bases only: an operator typo (or http) must never send
  // the Bearer key off-domain. Unknown values fail closed to the default.
  if (!raw) return RUNPOD_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return RUNPOD_API_BASE_DEFAULT;
    if (RUNPOD_API_BASE_ALLOW.has(`${u.origin}${u.pathname}`.replace(/\/+$/, ""))) return raw;
    return RUNPOD_API_BASE_DEFAULT;
  } catch {
    return RUNPOD_API_BASE_DEFAULT;
  }
}

export function runpodConfigured(): boolean {
  return Boolean((process.env.RUNPOD_API_KEY ?? "").trim());
}

/**
 * Billing kinds, exactly matching the RunPod v2 REST contract
 * (https://api.runpod.io/v2/openapi.json):
 * - GET /v2/billing/pods            → pod rows ({ podId })
 * - GET /v2/billing/serverless      → serverless rows ({ serverlessId })
 * - GET /v2/billing/network-volumes → volume rows ({ networkVolumeId })
 * The old client sent `billing/endpoints` (the public-endpoint lane, wrong
 * semantic) and `billing/networkvolumes` (missing hyphen → HTTP 404), so
 * runpod-sync always 502d and the usage mirror stayed empty.
 */
export type RunpodBillingKind = "pods" | "serverless" | "network-volumes";

export type RunpodBillingRow = {
  kind: "pod" | "serverless" | "volume";
  remoteId: string;
  timeBucket: string;
  amountUsd: number;
  timeBilledMs: number;
};

export type RunpodFetchResult =
  | { ok: true; rows: RunpodBillingRow[] }
  | { ok: false; error: string };

const KIND_ROW: Record<RunpodBillingKind, "pod" | "serverless" | "volume"> = {
  pods: "pod",
  serverless: "serverless",
  "network-volumes": "volume",
};

function toRow(kind: RunpodBillingKind, r: Record<string, unknown>): RunpodBillingRow | null {
  // Real v2 record: { startTime, endTime, totalAmount, podId|serverlessId|
  // networkVolumeId } (+ cost-component splits). Tolerant fallbacks
  // (amount/time/…) kept so older payloads still parse instead of vanishing.
  const amount = Number(r.totalAmount ?? r.amount);
  const start = String(r.startTime ?? r.time ?? "");
  const end = String(r.endTime ?? "");
  if (!Number.isFinite(amount) || amount < 0 || !start) return null;
  const remoteId = String(
    r.podId ?? r.serverlessId ?? r.networkVolumeId ?? r.endpointId ?? r.gpuTypeId ?? "",
  ).slice(0, 128);
  const t = new Date(start);
  if (Number.isNaN(t.getTime())) return null;
  // Billing records carry no billed-duration field: mirror the bucket window
  // ([startTime, endTime)) so time_billed_ms stays meaningful downstream.
  let ms = Number(r.timeBilledMs ?? 0);
  if (!(Number.isFinite(ms) && ms > 0) && end) {
    const window = new Date(end).getTime() - t.getTime();
    ms = Number.isFinite(window) && window > 0 ? Math.floor(window) : 0;
  }
  return {
    kind: KIND_ROW[kind],
    remoteId,
    timeBucket: t.toISOString(),
    amountUsd: Math.round(amount * 10000) / 10000,
    timeBilledMs: Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0,
  };
}

/**
 * Fetch REAL billing buckets for one resource kind. startTime/endTime are
 * ISO datetimes; bucketSize defaults to day. Never throws synthetic data.
 */
export async function fetchRunpodBilling(
  kind: RunpodBillingKind,
  opts: { startTime: string; endTime: string; bucketSize?: string },
): Promise<RunpodFetchResult> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const base = runpodApiBase();
  const params = new URLSearchParams({
    startTime: opts.startTime,
    endTime: opts.endTime,
    bucketSize: opts.bucketSize ?? "day",
  });
  const url = `${base}/billing/${kind}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, error: `RunPod billing/${kind} HTTP ${res.status}.` };
    }
    const data: unknown = await res.json();
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as { records?: unknown })?.records)
        ? ((data as { records: unknown[] }).records as unknown[])
        : null;
    if (!arr) return { ok: false, error: `RunPod billing/${kind} returned an unexpected shape.` };
    const rows: RunpodBillingRow[] = [];
    for (const r of arr) {
      const row = toRow(kind, (r ?? {}) as Record<string, unknown>);
      if (row) rows.push(row);
    }
    return { ok: true, rows };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

/** USD → Vibe Coin display equivalent (100 coins = $1.00). Informational. */
export function runpodUsdToCoins(usd: number): number {
  return Math.round(Number(usd) * 100 * 100) / 100;
}
