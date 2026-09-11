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

export function runpodApiBase(): string {
  const raw = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "");
  return raw || RUNPOD_API_BASE_DEFAULT;
}

export function runpodConfigured(): boolean {
  return Boolean((process.env.RUNPOD_API_KEY ?? "").trim());
}

export type RunpodBillingKind = "pods" | "endpoints" | "networkvolumes";

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

const KIND_PATH: Record<RunpodBillingKind, "pod" | "serverless" | "volume"> = {
  pods: "pod",
  endpoints: "serverless",
  networkvolumes: "volume",
};

function toRow(kind: RunpodBillingKind, r: Record<string, unknown>): RunpodBillingRow | null {
  const amount = Number(r.amount);
  const time = String(r.time ?? "");
  if (!Number.isFinite(amount) || amount < 0 || !time) return null;
  const ms = Number(r.timeBilledMs ?? 0);
  const remoteId = String(
    r.podId ?? r.endpointId ?? r.networkVolumeId ?? r.gpuTypeId ?? "",
  ).slice(0, 128);
  const t = new Date(time);
  if (Number.isNaN(t.getTime())) return null;
  return {
    kind: KIND_PATH[kind],
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
