/**
 * NGP serverless Chromium dispatcher (RunPod Serverless, CPU workers).
 *
 * SERVER-ONLY: reads RUNPOD_API_KEY (+ optional RUNPOD_API_BASE) via
 * lib/runpod.ts and NGP_PLAYTEST_ENDPOINT_ID. Never import this module in a
 * client component; the key must never reach a browser.
 *
 * Strategy: runsync-first (25s wait covers warm workers + most jobs), then
 * async-run + short poll. Total deadline ~50s (Vercel-safe). Anything
 * slower/missing degrades to { ok:false, error, fallback:"local-headless" }
 * so callers fall back to the in-process executePlaytest — never fail a
 * build on infra. Every failure returns { ok:false, error } with the
 * upstream status; nothing is synthesized.
 */

import { runpodApiBase, runpodConfigured } from "@/lib/runpod";

export const NGP_PLAYTEST_SOURCE_MAX = 262144;
const RUNSYNC_WAIT_MS = 25_000;
const CALL_TIMEOUT_MS = 30_000;
const POLL_ROUNDS = 3;
const POLL_GAP_MS = 8_000;
const TOTAL_DEADLINE_MS = 50_000;

export type NgpRemoteCheck = { id: string; passed: boolean; detail: string };

export type NgpRemoteResult = {
  verdict: "pass" | "fail" | "inconclusive";
  checks: NgpRemoteCheck[];
  hud: string;
  frames: number;
  errors: string[];
  screenshotPng: string | null;
  elapsedMs: number;
};

export type NgpDispatchResult =
  | { ok: true; result: NgpRemoteResult }
  | { ok: false; error: string; fallback: "local-headless" };

export function ngpPlaytestEndpointId(): string {
  return (process.env.NGP_PLAYTEST_ENDPOINT_ID ?? "").trim();
}

export function ngpPlaytestConfigured(): boolean {
  return runpodConfigured() && Boolean(ngpPlaytestEndpointId());
}

function fail(error: string): NgpDispatchResult {
  return { ok: false, error, fallback: "local-headless" };
}

async function postJson(url: string, key: string, body: Record<string, unknown>, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url: string, key: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function cleanCheck(c: unknown): NgpRemoteCheck | null {
  const o = (c ?? {}) as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  return { id: o.id.slice(0, 64), passed: o.passed === true, detail: String(o.detail ?? "").slice(0, 300) };
}

function cleanResult(out: unknown, elapsedMs: number): NgpRemoteResult | null {
  const o = (out ?? {}) as Record<string, unknown>;
  const verdict = o.verdict;
  if (verdict !== "pass" && verdict !== "fail" && verdict !== "inconclusive") return null;
  if (!Array.isArray(o.checks) || !o.checks.length) return null;
  const checks = (o.checks as unknown[]).map(cleanCheck).filter((c): c is NgpRemoteCheck => c !== null);
  if (!checks.length) return null;
  const shot = typeof o.screenshotPng === "string" ? o.screenshotPng : null;
  return {
    verdict,
    checks,
    hud: String(o.hud ?? "").slice(0, 120),
    frames: Number.isFinite(Number(o.frames)) ? Math.floor(Number(o.frames)) : 0,
    errors: Array.isArray(o.errors) ? (o.errors as unknown[]).map((e) => String(e).slice(0, 200)).slice(0, 10) : [],
    screenshotPng: shot && shot.length <= 2_000_000 ? shot : null,
    elapsedMs,
  };
}

/**
 * Run one playtest job on the CPU serverless endpoint. Resolves within the
 * total deadline or returns a local-headless fallback signal.
 */
export async function submitNgpPlaytest(source: string, quality: number): Promise<NgpDispatchResult> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  const endpointId = ngpPlaytestEndpointId();
  if (!key || !endpointId) return fail("NGP_PLAYTEST_ENDPOINT_ID/RUNPOD_API_KEY is not set.");
  if (!source || Buffer.byteLength(source, "utf8") > NGP_PLAYTEST_SOURCE_MAX) {
    return fail("Source is empty or over the 256KB cap.");
  }
  const started = Date.now();
  const base = runpodApiBase();
  const input = { source, quality };
  try {
    // Fast path: runsync waits up to 25s (warm workers answer inline).
    const syncRes = await postJson(`${base}/v2/${endpointId}/runsync`, key, { input, wait: RUNSYNC_WAIT_MS }, CALL_TIMEOUT_MS);
    if (syncRes.ok) {
      const payload: unknown = await syncRes.json().catch(() => null);
      const out = (payload as { output?: unknown } | null)?.output;
      const cleaned = cleanResult(out, Date.now() - started);
      if (cleaned) return { ok: true, result: cleaned };
      // Terminal non-shaped answer (e.g. worker fault object) — surface it.
      const status = String((payload as { status?: unknown } | null)?.status ?? "");
      if (status === "FAILED") return fail("Worker reported FAILED with an unreadable payload.");
    } else if (syncRes.status === 404 || syncRes.status === 401 || syncRes.status === 403) {
      return fail(`RunPod playtest endpoint HTTP ${syncRes.status}.`);
    }
    // Slow path: async run + short poll (cold starts, queue delay).
    if (Date.now() - started > TOTAL_DEADLINE_MS - POLL_GAP_MS) return fail("Deadline exceeded waiting for a warm worker.");
    const runRes = await postJson(`${base}/v2/${endpointId}/run`, key, { input }, CALL_TIMEOUT_MS);
    if (!runRes.ok) return fail(`RunPod playtest submit HTTP ${runRes.status}.`);
    const runBody = (await runRes.json().catch(() => null)) as { id?: unknown } | null;
    const jobId = typeof runBody?.id === "string" ? runBody.id : "";
    if (!jobId) return fail("RunPod playtest returned an unexpected shape.");
    for (let i = 0; i < POLL_ROUNDS; i++) {
      if (Date.now() - started > TOTAL_DEADLINE_MS) return fail("Deadline exceeded polling the playtest job.");
      await new Promise((r) => setTimeout(r, POLL_GAP_MS));
      const stRes = await getJson(`${base}/v2/${endpointId}/status/${jobId}`, key, CALL_TIMEOUT_MS);
      if (!stRes.ok) continue;
      const stBody = (await stRes.json().catch(() => null)) as { status?: unknown; output?: unknown } | null;
      if (stBody?.status === "COMPLETED") {
        const cleaned = cleanResult(stBody.output, Date.now() - started);
        return cleaned ? { ok: true, result: cleaned } : fail("Worker returned an unexpected shape.");
      }
      if (stBody?.status === "FAILED") return fail("Worker reported FAILED.");
    }
    return fail("Deadline exceeded polling the playtest job.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    if (/abort/i.test(msg)) return fail("RunPod request timed out.");
    return fail(`RunPod request failed: ${msg.slice(0, 120)}`);
  }
}
