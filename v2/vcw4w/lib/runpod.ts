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
    return { ok: false, error: `RunPod request failed: ${scrubRunpodText(msg).slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

/** USD → Vibe Coin display equivalent (100 coins = $1.00). Informational. */
export function runpodUsdToCoins(usd: number): number {
  return Math.round(Number(usd) * 100 * 100) / 100;
}

/**
 * Workload split: RunPod = SHORT GPU/serverless work (GPU pods, bursty
 * renders/remotes, per-second serverless jobs — provision, run, tear down,
 * nothing parked longer than ~24h). DigitalOcean = LONG-TERM servers
 * (droplets that stay up for days/weeks, attached volumes, snapshots).
 * Cost rule mirrored from lib/digitalocean.ts: pick RunPod when the job is
 * GPU-shaped or under 24h; pick DigitalOcean when the box must persist.
 */
export const RUNPOD_SHORT_TASKS_NOTE =
  "RunPod = short GPU + serverless work (GPU pods, bursty renders/remotes, " +
  "per-second serverless jobs; tear down within ~24h). DigitalOcean = " +
  "long-term servers (droplets up for days/weeks, volumes, snapshots).";

/** Timeout (ms) for every read/write below — matches fetchRunpodBilling. */
export const RUNPOD_REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Read/write helpers (pods, serverless endpoints, templates, catalog, volumes)
// ---------------------------------------------------------------------------

export type RunpodPod = {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
};

export type RunpodEndpoint = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export type RunpodTemplate = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export type RunpodGpuType = {
  id: string;
  [key: string]: unknown;
};

export type RunpodNetworkVolume = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export type RunpodPodsResult = { ok: true; pods: RunpodPod[] } | { ok: false; error: string };
export type RunpodPodResult = { ok: true; pod: RunpodPod } | { ok: false; error: string };
export type RunpodEndpointsResult =
  | { ok: true; endpoints: RunpodEndpoint[] }
  | { ok: false; error: string };
export type RunpodEndpointResult =
  | { ok: true; endpoint: RunpodEndpoint }
  | { ok: false; error: string };
export type RunpodJobSubmitResult =
  | { ok: true; jobId: string; status: string }
  | { ok: false; error: string };
export type RunpodJobStatusResult =
  | { ok: true; status: string; output: unknown }
  | { ok: false; error: string };
export type RunpodTemplatesResult =
  | { ok: true; templates: RunpodTemplate[] }
  | { ok: false; error: string };
export type RunpodGpuTypesResult =
  | { ok: true; gpuTypes: RunpodGpuType[] }
  | { ok: false; error: string };
export type RunpodVolumesResult =
  | { ok: true; volumes: RunpodNetworkVolume[] }
  | { ok: false; error: string };

export type RunpodBillingSummary = {
  days: number;
  startTime: string;
  endTime: string;
  podsUsd: number;
  serverlessUsd: number;
  volumesUsd: number;
  totalUsd: number;
  rowCounts: { pods: number; serverless: number; volumes: number };
};

export type RunpodBillingSummaryResult =
  | { ok: true; summary: RunpodBillingSummary }
  | { ok: false; error: string };

function runpodKey(): string {
  return (process.env.RUNPOD_API_KEY ?? "").trim();
}

/** Truncate text and redact the API key so errors never leak it. */
function scrubRunpodText(text: string): string {
  let out = String(text ?? "");
  const key = runpodKey();
  if (key && out.includes(key)) out = out.split(key).join("[redacted]");
  return out.slice(0, 160);
}

function runpodAuthHeaders(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

function runpodErr(err: unknown): string {
  const msg = err instanceof Error ? err.message : "fetch failed";
  return `RunPod request failed: ${scrubRunpodText(msg).slice(0, 120)}`;
}

/** Unwrap a list payload: bare array or one of the known envelope keys. */
function toArray(data: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of keys) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function cleanPod(v: unknown): RunpodPod | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return {
    ...o,
    id,
    name: typeof o.name === "string" ? o.name : id,
    status: String(o.status ?? o.desiredStatus ?? "UNKNOWN"),
  };
}

function cleanEndpoint(v: unknown): RunpodEndpoint | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return { ...o, id, name: typeof o.name === "string" ? o.name : id };
}

function cleanTemplate(v: unknown): RunpodTemplate | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return { ...o, id, name: typeof o.name === "string" ? o.name : id };
}

function cleanGpuType(v: unknown): RunpodGpuType | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return { ...o, id };
}

function cleanVolume(v: unknown): RunpodNetworkVolume | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return { ...o, id, name: typeof o.name === "string" ? o.name : id };
}

async function runpodGet(path: string): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const key = runpodKey();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const base = runpodApiBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUNPOD_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      signal: controller.signal,
      headers: runpodAuthHeaders(key),
    });
    if (!res.ok) return { ok: false, error: `RunPod ${path} HTTP ${res.status}.` };
    return { ok: true, data: (await res.json().catch(() => null)) as unknown };
  } catch (err) {
    return { ok: false, error: runpodErr(err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Serverless job-execution host. Job run/status lives on api.runpod.ai while
 * the management plane (base) may be api.runpod.io — derive the exec base
 * from runpodApiBase() so a custom base keeps working and the path never
 * doubles the /v2 prefix.
 */
function runpodExecBase(): string {
  const base = runpodApiBase().replace(/\/+$/, "");
  return base.replace("://api.runpod.io/", "://api.runpod.ai/");
}

/** GET /pods — every pod on this key. Never synthesized. */
export async function listPods(): Promise<RunpodPodsResult> {
  const res = await runpodGet("/pods");
  if (!res.ok) return res;
  const pods: RunpodPod[] = [];
  for (const v of toArray(res.data, ["pods", "data"])) {
    const p = cleanPod(v);
    if (p) pods.push(p);
  }
  return { ok: true, pods };
}

/** GET /pods/:id — one pod or an upstream-status error. */
export async function getPod(id: string): Promise<RunpodPodResult> {
  const pid = String(id ?? "").trim();
  if (!pid) return { ok: false, error: "Missing pod id." };
  const res = await runpodGet(`/pods/${encodeURIComponent(pid)}`);
  if (!res.ok) return res;
  const raw =
    res.data && typeof res.data === "object" && !Array.isArray(res.data) && "pod" in res.data
      ? (res.data as Record<string, unknown>).pod
      : res.data;
  const pod = cleanPod(raw);
  if (!pod) return { ok: false, error: "RunPod pod returned an unexpected shape." };
  return { ok: true, pod };
}

/** GET /serverless — every serverless endpoint on this key. */
export async function listEndpoints(): Promise<RunpodEndpointsResult> {
  const res = await runpodGet("/serverless");
  if (!res.ok) return res;
  const endpoints: RunpodEndpoint[] = [];
  for (const v of toArray(res.data, ["endpoints", "data"])) {
    const e = cleanEndpoint(v);
    if (e) endpoints.push(e);
  }
  return { ok: true, endpoints };
}

/** GET /serverless/:id — one endpoint or an upstream-status error. */
export async function getEndpoint(id: string): Promise<RunpodEndpointResult> {
  const eid = String(id ?? "").trim();
  if (!eid) return { ok: false, error: "Missing endpoint id." };
  const res = await runpodGet(`/serverless/${encodeURIComponent(eid)}`);
  if (!res.ok) return res;
  const endpoint = cleanEndpoint(res.data);
  if (!endpoint) return { ok: false, error: "RunPod endpoint returned an unexpected shape." };
  return { ok: true, endpoint };
}

/**
 * POST {exec}/:endpointId/run — submit an async serverless job.
 * Returns the job id immediately; poll with getJobStatus().
 */
export async function runEndpointJob(endpointId: string, input: unknown): Promise<RunpodJobSubmitResult> {
  const key = runpodKey();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const eid = String(endpointId ?? "").trim();
  if (!eid) return { ok: false, error: "Missing endpoint id." };
  const base = runpodExecBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUNPOD_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/${encodeURIComponent(eid)}/run`, {
      method: "POST",
      signal: controller.signal,
      headers: { ...runpodAuthHeaders(key), "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) return { ok: false, error: `RunPod endpoint run HTTP ${res.status}.` };
    const data = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const jobId = typeof data.id === "string" ? data.id : "";
    if (!jobId) return { ok: false, error: "RunPod run returned an unexpected shape." };
    return { ok: true, jobId, status: String(data.status ?? "IN_QUEUE") };
  } catch (err) {
    return { ok: false, error: runpodErr(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** GET {exec}/:endpointId/status/:jobId — poll one serverless job. */
export async function getJobStatus(endpointId: string, jobId: string): Promise<RunpodJobStatusResult> {
  const key = runpodKey();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const eid = String(endpointId ?? "").trim();
  if (!eid) return { ok: false, error: "Missing endpoint id." };
  const jid = String(jobId ?? "").trim();
  if (!jid) return { ok: false, error: "Missing job id." };
  const base = runpodExecBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUNPOD_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/${encodeURIComponent(eid)}/status/${encodeURIComponent(jid)}`, {
      signal: controller.signal,
      headers: runpodAuthHeaders(key),
    });
    if (!res.ok) return { ok: false, error: `RunPod job status HTTP ${res.status}.` };
    const data = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const status = typeof data.status === "string" ? data.status : "";
    if (!status) return { ok: false, error: "RunPod job status returned an unexpected shape." };
    return { ok: true, status, output: data.output ?? null };
  } catch (err) {
    return { ok: false, error: runpodErr(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** GET /templates — templates visible to this key. */
export async function listTemplates(): Promise<RunpodTemplatesResult> {
  const res = await runpodGet("/templates");
  if (!res.ok) return res;
  const templates: RunpodTemplate[] = [];
  for (const v of toArray(res.data, ["templates", "data"])) {
    const t = cleanTemplate(v);
    if (t) templates.push(t);
  }
  return { ok: true, templates };
}

/** GET /catalog/gpus — GPU catalog (no availability expansion). */
export async function listGpuTypes(): Promise<RunpodGpuTypesResult> {
  const res = await runpodGet("/catalog/gpus");
  if (!res.ok) return res;
  const gpuTypes: RunpodGpuType[] = [];
  for (const v of toArray(res.data, ["gpus", "data"])) {
    const g = cleanGpuType(v);
    if (g) gpuTypes.push(g);
  }
  return { ok: true, gpuTypes };
}

/** GET /network-volumes — every network volume on this key. */
export async function listNetworkVolumes(): Promise<RunpodVolumesResult> {
  const res = await runpodGet("/network-volumes");
  if (!res.ok) return res;
  const volumes: RunpodNetworkVolume[] = [];
  for (const v of toArray(res.data, ["volumes", "networkVolumes", "data"])) {
    const vol = cleanVolume(v);
    if (vol) volumes.push(vol);
  }
  return { ok: true, volumes };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * REAL spend over the last `days` (1–90, default 30): sums the same three
 * fetchRunpodBilling lanes the usage mirror uses. Any lane failure fails
 * the whole summary — never a partial number presented as a total.
 */
export async function getBillingSummary(days: number): Promise<RunpodBillingSummaryResult> {
  const key = runpodKey();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const d = Number.isFinite(Number(days)) ? Math.floor(Number(days)) : 30;
  const clamped = Math.min(90, Math.max(1, d));
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - clamped * 86_400_000).toISOString();
  const [pods, serverless, volumes] = await Promise.all([
    fetchRunpodBilling("pods", { startTime, endTime, bucketSize: "day" }),
    fetchRunpodBilling("serverless", { startTime, endTime, bucketSize: "day" }),
    fetchRunpodBilling("network-volumes", { startTime, endTime, bucketSize: "day" }),
  ]);
  const failed: string[] = [];
  if (!pods.ok) failed.push(`pods: ${pods.error}`);
  if (!serverless.ok) failed.push(`serverless: ${serverless.error}`);
  if (!volumes.ok) failed.push(`network-volumes: ${volumes.error}`);
  if (failed.length > 0) return { ok: false, error: `RunPod billing summary failed — ${failed.join("; ")}` };
  const sum = (r: RunpodFetchResult): number =>
    r.ok ? r.rows.reduce((acc, row) => acc + row.amountUsd, 0) : 0;
  const count = (r: RunpodFetchResult): number => (r.ok ? r.rows.length : 0);
  const podsUsd = round4(sum(pods));
  const serverlessUsd = round4(sum(serverless));
  const volumesUsd = round4(sum(volumes));
  return {
    ok: true,
    summary: {
      days: clamped,
      startTime,
      endTime,
      podsUsd,
      serverlessUsd,
      volumesUsd,
      totalUsd: round4(podsUsd + serverlessUsd + volumesUsd),
      rowCounts: { pods: count(pods), serverless: count(serverless), volumes: count(volumes) },
    },
  };
}
