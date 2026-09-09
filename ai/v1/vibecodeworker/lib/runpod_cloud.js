'use strict';

/**
 * Runpod cloud runner for VibeCodeWorker.
 *
 * One pod plays the game AND runs the local multimodal model on the same
 * GPU box. That keeps frames and reasoning on one host for lower latency
 * and lower cost than splitting game + inference across machines.
 *
 * Billing: Runpod bills pods per second. Every run started here carries a
 * hard 55 minute cap (auto terminate) so max billable time is 3300 seconds.
 *
 * SECURITY (BYOK, super secure):
 * - Runpod key comes per call via opts.runpodKey or RUNPOD_API_KEY env only.
 * - Never written to disk, never baked into builds, never logged, never in URL.
 * - Browser callers keep it in sessionStorage only and call api.runpod.io
 *   directly, so the key never touches 4weird servers (see run.js).
 * - Base URL is fixed at module load from env, never from request bodies (SSRF).
 * - All ids and tags are allow listed before use. Fail closed on bad input.
 */

const RUNPOD_API_BASE = String(process.env.RUNPOD_API_BASE || 'https://api.runpod.io/v2').replace(/\/+$/, '');

// Hard cap: 55 minutes. Pods auto terminate at this age.
const MAX_RUN_MINUTES = 55;
const MAX_RUN_SECONDS = MAX_RUN_MINUTES * 60;

// VRAM kept free for the game (Chromium + WebGL + Three.js) and host overhead.
const DEFAULT_GAME_VRAM_GB = 5;
const DEFAULT_OVERHEAD_GB = 2;
const MIN_USABLE_GPU_GB = 16;

// Base image default. Override per call with opts.image.
const DEFAULT_IMAGE = 'runpod/pytorch:2.4.0-py11-cuda12.4.1-devel-ubuntu22.04';

/**
 * Open source multimodal ladder for Ollama, biggest first.
 * gb = approximate Q4 weight size in GB. Vision capable only.
 */
const MODEL_LADDER = [
  { tag: 'qwen2.5vl:72b', gb: 47, label: '72B vision + text reasoning' },
  { tag: 'qwen2.5vl:32b', gb: 20, label: '32B vision + text reasoning' },
  { tag: 'llava:34b', gb: 20, label: '34B vision + text' },
  { tag: 'qwen2.5vl:14b', gb: 9.5, label: '14B vision + text' },
  { tag: 'llava:13b', gb: 8, label: '13B vision + text' },
  { tag: 'ministral-3-vision:latest', gb: 5, label: 'small vision + text' },
  { tag: 'qwen2.5vl:7b', gb: 4.7, label: '7B vision + text' },
  { tag: 'llava:7b', gb: 4.4, label: '7B vision + text' },
  { tag: 'qwen2.5vl:3b', gb: 2, label: '3B vision + text fallback' }
];

// Static safe fallback order when live catalog is unreachable.
// Cheapest usable first (16GB+), verified against live catalog 2026-09-09:
// RTX 2000 Ada 16GB secure $0.24 LOW, RTX A4000 16GB $0.25 LOW,
// RTX 4090 24GB $0.74 HIGH in EU-RO-1, A40 48GB $0.49 HIGH.
const FALLBACK_GPU_ORDER = [
  { id: 'NVIDIA RTX 2000 Ada Generation', memory: 16, price: 0.24 },
  { id: 'NVIDIA RTX A4000', memory: 16, price: 0.25 },
  { id: 'NVIDIA GeForce RTX 4090', memory: 24, price: 0.74 },
  { id: 'NVIDIA A40', memory: 48, price: 0.49 }
];

function isSafeGpuId(v) {
  return typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9 .+_-]{2,80}$/.test(v);
}

function isSafePodId(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{4,80}$/.test(v);
}

function isSafeGameId(v) {
  return typeof v === 'string' && /^[a-z0-9-]{2,60}$/.test(v);
}

function isSafeModelTag(v) {
  return typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/.test(v);
}

function isSafeDataCenter(v) {
  return typeof v === 'string' && /^[A-Z0-9-]{3,20}$/.test(v);
}

function isSafeImage(v) {
  return typeof v === 'string' && /^[a-z0-9][a-z0-9._/:@-]{4,160}$/i.test(v);
}

function sanitizeName(v) {
  const s = String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 48);
  return s || `vibe-cloud-${Date.now().toString(36)}`;
}

/**
 * Pick the biggest multimodal model that fits.
 * usable = gpu - gameReserve - overhead, budget = usable * 0.8 (KV headroom).
 */
function selectCloudModel(gpuMemoryGB, opts = {}) {
  const total = Number(gpuMemoryGB) || 0;
  const gameReserve = Number(opts.gameVramGB ?? DEFAULT_GAME_VRAM_GB);
  const overhead = Number(opts.overheadGB ?? DEFAULT_OVERHEAD_GB);
  const usable = Math.max(0, total - gameReserve - overhead);
  const budget = usable * 0.8;
  const sorted = [...MODEL_LADDER].sort((a, b) => b.gb - a.gb);
  const pick = sorted.find((m) => m.gb <= budget) || sorted[sorted.length - 1];
  return {
    tag: pick.tag,
    label: pick.label,
    estGB: pick.gb,
    gpuMemoryGB: total,
    gameVramGB: gameReserve,
    overheadGB: overhead,
    usableGB: Math.round(usable * 10) / 10,
    budgetGB: Math.round(budget * 10) / 10
  };
}

/**
 * Cheapest AVAILABLE GPU picker. Default policy for all cloud runs.
 * Input: array of catalog entries { id, memory, price: { secure },
 * availability, secure }. Output: cheapest entry with stock, 16GB+,
 * secure cloud, sorted by secure hourly price. Never picks NONE stock.
 */
function pickCheapestAvailableGpu(gpus, opts = {}) {
  const minGB = Number(opts.minGB || MIN_USABLE_GPU_GB);
  const list = Array.isArray(gpus) ? gpus : [];
  const usable = list.filter((g) => {
    if (!g || !isSafeGpuId(g.id)) return false;
    if (g.secure !== true) return false;
    if (String(g.availability || 'NONE') === 'NONE') return false;
    if (Number(g.memory) < minGB) return false;
    const p = g.price && Number(g.price.secure);
    return Number.isFinite(p) && p > 0;
  });
  usable.sort((a, b) => Number(a.price.secure) - Number(b.price.secure));
  if (usable.length > 0) {
    const g = usable[0];
    return {
      id: g.id,
      memory: Number(g.memory),
      price: Number(g.price.secure),
      availability: String(g.availability),
      source: 'live-catalog'
    };
  }
  const fb = FALLBACK_GPU_ORDER[0];
  return { id: fb.id, memory: fb.memory, price: fb.price, availability: 'UNKNOWN', source: 'fallback' };
}

/** Per second cost from an hourly price. Runpod bills per second. */
function estimateCost(hourlyPrice, seconds) {
  const rate = Number(hourlyPrice) || 0;
  const secs = Math.max(0, Math.min(Number(seconds) || 0, MAX_RUN_SECONDS));
  return Math.round((rate / 3600) * secs * 10000) / 10000;
}

function maxBillableCost(hourlyPrice) {
  return estimateCost(hourlyPrice, MAX_RUN_SECONDS);
}

function resolveApiKey(opts = {}) {
  const key = String(opts.runpodKey || process.env.RUNPOD_API_KEY || '').trim();
  return key || null;
}

function redactError(msg) {
  // Never echo key material. Runpod keys are long bearer strings; strip them.
  return String(msg || '').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').slice(0, 300);
}

async function runpodFetch(apiKey, pathName, opts = {}) {
  if (!/^\/(pods|gpus)([/?].*)?$/.test(pathName)) throw new Error('blocked path');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(opts.timeoutMs || 20000));
  try {
    const res = await fetch(`${RUNPOD_API_BASE}${pathName}`, {
      method: opts.method || 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text.slice(0, 200) };
    }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      throw new Error(`runpod ${pathName} failed: ${String(msg).slice(0, 200)}`);
    }
    return data;
  } catch (e) {
    throw new Error(redactError(e.message));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build a Runpod v2 create-pod body for a cloud game + model run.
 * Game and Ollama share the box. Env carries the 55 min cap so the
 * pod start script can self terminate even if the client disconnects.
 */
function buildPodSpec(args = {}) {
  if (!isSafeGpuId(args.gpuId)) throw new Error('Invalid gpuId');
  const gameId = isSafeGameId(args.gameId || 'gravegain3d') ? args.gameId : 'gravegain3d';
  let model = null;
  if (args.modelTag) {
    if (!isSafeModelTag(args.modelTag)) throw new Error('Invalid modelTag');
    model = { tag: args.modelTag, label: 'pinned by caller', estGB: 0, gpuMemoryGB: Number(args.gpuMemoryGB) || 0 };
  } else {
    model = selectCloudModel(Number(args.gpuMemoryGB) || 24, { gameVramGB: args.gameVramGB });
  }
  const gpuCount = Math.min(Math.max(parseInt(args.gpuCount, 10) || 1, 1), 8);
  const diskGB = Math.min(Math.max(parseInt(args.diskGB, 10) || 40, 20), 500);
  const body = {
    name: sanitizeName(args.name),
    image: isSafeImage(args.image || '') ? args.image : DEFAULT_IMAGE,
    gpu: { id: args.gpuId, count: gpuCount },
    ports: ['8888/http', '42069/http'],
    disk: diskGB,
    env: {
      VIBE_GAME: gameId,
      VIBE_MODEL: model.tag,
      VIBE_MAX_MINUTES: String(MAX_RUN_MINUTES),
      VIBE_MODE: 'cloud-game-plus-model'
    }
  };
  if (args.dataCenterId) {
    if (!isSafeDataCenter(args.dataCenterId)) throw new Error('Invalid dataCenterId');
    body.dataCenterIds = [args.dataCenterId];
  }
  return { body, model, maxMinutes: MAX_RUN_MINUTES, billing: 'per-second' };
}

/** Start a cloud run: create the pod, return pod id + model pick + cap. */
async function startCloudRun(args = {}) {
  const apiKey = resolveApiKey(args);
  if (!apiKey) throw new Error('Missing Runpod API key (pass runpodKey or set RUNPOD_API_KEY)');
  const spec = buildPodSpec(args);
  const created = await runpodFetch(apiKey, '/pods', { method: 'POST', body: spec.body });
  const pod = created && (created.pod || created);
  const podId = pod && (pod.id || pod.podId);
  if (podId && !isSafePodId(String(podId))) throw new Error('Runpod returned an unsafe pod id');
  return {
    success: true,
    podId: podId || null,
    model: spec.model,
    gameId: String(args.gameId || 'gravegain3d'),
    maxMinutes: MAX_RUN_MINUTES,
    maxSeconds: MAX_RUN_SECONDS,
    billing: 'per-second, auto terminate at 55 minutes',
    proxy: podId ? `https://${podId}-8888.proxy.runpod.net` : null
  };
}

async function getCloudRunStatus(podId, opts = {}) {
  const apiKey = resolveApiKey(opts);
  if (!apiKey) throw new Error('Missing Runpod API key');
  if (!isSafePodId(podId)) throw new Error('Invalid podId');
  return runpodFetch(apiKey, `/pods/${encodeURIComponent(podId)}`);
}

async function stopCloudRun(podId, opts = {}) {
  const apiKey = resolveApiKey(opts);
  if (!apiKey) throw new Error('Missing Runpod API key');
  if (!isSafePodId(podId)) throw new Error('Invalid podId');
  // Terminate ends per second billing immediately. Container disk is lost.
  await runpodFetch(apiKey, `/pods/${encodeURIComponent(podId)}`, { method: 'DELETE' });
  return { success: true, podId, billing: 'per-second billing stopped' };
}

module.exports = {
  RUNPOD_API_BASE,
  MAX_RUN_MINUTES,
  MAX_RUN_SECONDS,
  DEFAULT_GAME_VRAM_GB,
  DEFAULT_IMAGE,
  MODEL_LADDER,
  FALLBACK_GPU_ORDER,
  selectCloudModel,
  pickCheapestAvailableGpu,
  estimateCost,
  maxBillableCost,
  buildPodSpec,
  startCloudRun,
  getCloudRunStatus,
  stopCloudRun,
  isSafeGpuId,
  isSafePodId,
  isSafeGameId,
  isSafeModelTag
};
