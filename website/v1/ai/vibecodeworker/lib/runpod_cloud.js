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
 * - Browser callers keep it in sessionStorage and pass it only to their
 *   loopback VCW control plane, which forwards it to Runpod (see run.js).
 * - Base URL is fixed at module load from env, never from request bodies (SSRF).
 * - All ids and tags are allow listed before use. Fail closed on bad input.
 */

// RunPod's current Pod control plane is REST v1 (rest.runpod.io). The older
// api.runpod.io/v2 endpoint accepts a different schema and returns 400 for pod
// creation, so keep the base explicit and overridable for test doubles.
const RUNPOD_API_BASE = String(process.env.RUNPOD_API_BASE || 'https://rest.runpod.io/v1').replace(/\/+$/, '');
const { getOpenSourceGame } = require('./open_source_games');

// Hard cap: 55 minutes. Pods auto terminate at this age.
const MAX_RUN_MINUTES = 55;
const MAX_RUN_SECONDS = MAX_RUN_MINUTES * 60;

// VRAM kept free for the game (Chromium + WebGL + Three.js) and host overhead.
const DEFAULT_GAME_VRAM_GB = 5;
const DEFAULT_OVERHEAD_GB = 2;
const MIN_USABLE_GPU_GB = 16;

// Base image default. Override per call with opts.image.
// Built from deploy/runpod/Dockerfile and pushed by the operator. Override for
// a private registry without accepting an image name from the browser.
const DEFAULT_IMAGE = String(process.env.VIBE_CLOUD_IMAGE || 'ghcr.io/mattyjacks/vibecodeworker-cloud:2.0.0');

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

// RunPod's REST v1 API currently publishes GPU types in its schema, but not a
// live /gpus listing. These are capability estimates used only to order probes;
// the create request is the authority on actual availability and price.
const GPU_CAPABILITY_ORDER = [
  { id: 'NVIDIA B200', memory: 180, price: 4.00 },
  { id: 'NVIDIA H100 80GB HBM3', memory: 80, price: 2.49 },
  { id: 'NVIDIA A100 80GB PCIe', memory: 80, price: 1.64 },
  { id: 'NVIDIA L40S', memory: 48, price: 0.89 },
  { id: 'NVIDIA A40', memory: 48, price: 0.49 },
  { id: 'NVIDIA RTX 6000 Ada Generation', memory: 48, price: 0.89 },
  { id: 'NVIDIA GeForce RTX 4090', memory: 24, price: 0.74 },
  { id: 'NVIDIA RTX 2000 Ada Generation', memory: 16, price: 0.24 },
  { id: 'NVIDIA RTX A4000', memory: 16, price: 0.25 }
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

function isSafeXonoticMode(v) {
  return v === undefined || v === null || v === 'desktop' || v === 'web';
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

/** Pick the most capable currently-rentable GPU, with an optional hourly cap. */
function pickBestAvailableGpu(gpus, opts = {}) {
  const minGB = Number(opts.minGB || MIN_USABLE_GPU_GB);
  const maxHourly = Number(opts.maxHourlyPrice || 0);
  const usable = (Array.isArray(gpus) ? gpus : []).filter((g) => {
    const price = g && g.price && Number(g.price.secure);
    return g && isSafeGpuId(g.id) && g.secure === true && String(g.availability || 'NONE') !== 'NONE' && Number(g.memory) >= minGB && Number.isFinite(price) && price > 0 && (!maxHourly || price <= maxHourly);
  });
  usable.sort((a, b) => Number(b.memory) - Number(a.memory) || Number(a.price.secure) - Number(b.price.secure));
  if (!usable.length) return null;
  const g = usable[0];
  return { id: g.id, memory: Number(g.memory), price: Number(g.price.secure), availability: String(g.availability), source: 'live-catalog-performance' };
}

function rankAvailableGpus(gpus, opts = {}) {
  const minGB = Number(opts.minGB || MIN_USABLE_GPU_GB);
  const maxHourly = Number(opts.maxHourlyPrice || 0);
  return (Array.isArray(gpus) ? gpus : []).filter((g) => {
    const price = g && g.price && Number(g.price.secure);
    return g && isSafeGpuId(g.id) && g.secure === true && String(g.availability || 'NONE') !== 'NONE' && Number(g.memory) >= minGB && Number.isFinite(price) && price > 0 && (!maxHourly || price <= maxHourly);
  }).sort((a, b) => Number(b.memory) - Number(a.memory) || Number(a.price.secure) - Number(b.price.secure));
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
      const rawMsg = data && (data.error || data.message || data.detail);
      const msg = rawMsg && typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : rawMsg;
      if (res.status === 403) {
        throw new Error(`runpod ${pathName} rejected this credential (403). The key can read Runpod resources but is not allowed to create or mutate Pods.`);
      }
      const safeDetail = msg || (data ? JSON.stringify(data) : `HTTP ${res.status}`);
      throw new Error(`runpod ${pathName} failed: ${String(safeDetail).slice(0, 200)}`);
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
  const openSourceGame = args.openSourceGameId ? getOpenSourceGame(args.openSourceGameId) : null;
  if (args.openSourceGameId && !openSourceGame) throw new Error('Unsupported open-source game id');
  let model = null;
  if (args.modelTag) {
    if (!isSafeModelTag(args.modelTag)) throw new Error('Invalid modelTag');
    model = { tag: args.modelTag, label: 'pinned by caller', estGB: 0, gpuMemoryGB: Number(args.gpuMemoryGB) || 0 };
  } else {
    model = selectCloudModel(Number(args.gpuMemoryGB) || 24, { gameVramGB: args.gameVramGB });
  }
  const gpuCount = Math.min(Math.max(parseInt(args.gpuCount, 10) || 1, 1), 8);
  const diskGB = Math.min(Math.max(parseInt(args.diskGB, 10) || 40, 20), 500);
  // Xonotic can run directly from RunPod's public CUDA image, so local Docker
  // is bypassed by default for this workflow. Callers may explicitly disable it.
  const bootstrap = args.bypassDocker === true || (args.openSourceGameId === 'xonotic' && args.bypassDocker !== false);
  const body = {
    name: sanitizeName(args.name),
    imageName: bootstrap ? 'runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04' : (isSafeImage(args.image || '') ? args.image : DEFAULT_IMAGE),
    computeType: 'GPU',
    cloudType: 'SECURE',
    gpuTypeIds: [args.gpuId],
    gpuTypePriority: 'custom',
    gpuCount,
    ports: ['6901/http', '6902/http', '8888/http', '42069/http'],
    containerDiskInGb: diskGB,
    volumeInGb: 20,
    volumeMountPath: '/workspace',
    minVCPUPerGPU: 2,
    minRAMPerGPU: 8,
    supportPublicIp: true,
    env: {
      VIBE_GAME: gameId,
      VIBE_MODEL: model.tag,
      VIBE_MAX_MINUTES: String(MAX_RUN_MINUTES),
      VIBE_MODE: 'cloud-game-plus-model',
      VIBE_GAME_DESKTOP_PORT: '6901',
      VIBE_AGENT_DESKTOP_PORT: '6902',
      VIBE_GPU_MEMORY_GB: String(Number(args.gpuMemoryGB) || 24),
      OLLAMA_URL: 'http://127.0.0.1:11434',
      VCW_CAPTURE_FPS: String(Number(args.gpuMemoryGB || 24) >= 48 ? 60 : Number(args.gpuMemoryGB || 24) >= 24 ? 45 : 30)
    }
  };
  if (bootstrap) {
    body.dockerStartCmd = ['bash', '-lc', 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends xvfb x11vnc novnc websockify git ca-certificates curl unzip xdotool scrot ffmpeg libgl1 libegl1 libxrandr2 libxi6 libxinerama1 libxcursor1 libasound2 fonts-liberation nodejs npm && curl -fsSL https://ollama.com/install.sh | sh && (ollama serve >/tmp/ollama.log 2>&1 &) && for i in $(seq 1 30); do curl -sf http://127.0.0.1:11434/api/tags >/dev/null && break; sleep 2; done && if ! ollama pull "$VIBE_MODEL"; then export VIBE_MODEL=qwen2.5vl:7b; ollama pull "$VIBE_MODEL"; fi && curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb && DEBIAN_FRONTEND=noninteractive apt-get install -y /tmp/chrome.deb && rm -f /tmp/chrome.deb && rm -rf /var/lib/apt/lists/* && rm -rf /opt/vcw && git clone --depth 1 "${VIBE_BOOTSTRAP_REPO:-https://github.com/mattyjacks/4weird.git}" /opt/vcw && if [ -n "${VIBE_BOOTSTRAP_REF:-}" ]; then git -C /opt/vcw fetch --depth 1 origin "$VIBE_BOOTSTRAP_REF" && git -C /opt/vcw checkout FETCH_HEAD; fi && chmod 755 /opt/vcw/website/v1/ai/vibecodeworker/deploy/runpod/start-dual-desktop.sh /opt/vcw/website/v1/ai/vibecodeworker/deploy/runpod/capture_cloud_session.sh && exec /opt/vcw/website/v1/ai/vibecodeworker/deploy/runpod/start-dual-desktop.sh'];
  }
  if (args.inputMode === 'mobile' || args.inputMode === 'desktop') body.env.VCW_INPUT_MODE = args.inputMode;
  if (args.videoLayout === 'testingH' || args.videoLayout === 'testingV' || args.videoLayout === 'both') body.env.VCW_VIDEO_LAYOUT = args.videoLayout;
  if (args.videoLayout) body.env.VCW_AUTO_RECORD = '1';
  if (openSourceGame) {
    body.env.VIBE_OPEN_SOURCE_GAME_ID = openSourceGame.id;
    body.env.VIBE_OPEN_SOURCE_GAME_ENTRY = openSourceGame.entry;
    if (openSourceGame.id === 'xonotic') {
      if (!isSafeXonoticMode(args.xonoticMode)) throw new Error('Invalid xonoticMode');
      body.env.VIBE_XONOTIC_MODE = args.xonoticMode || 'desktop';
    }
  }
  if (args.dataCenterId) {
    if (!isSafeDataCenter(args.dataCenterId)) throw new Error('Invalid dataCenterId');
    body.dataCenterIds = [args.dataCenterId];
  }
  return { body, model, openSourceGame, maxMinutes: MAX_RUN_MINUTES, billing: 'per-second' };
}

/** Start a cloud run: create the pod, return pod id + model pick + cap. */
async function startCloudRun(args = {}) {
  const apiKey = resolveApiKey(args);
  if (!apiKey) throw new Error('Missing Runpod API key (pass runpodKey or set RUNPOD_API_KEY)');
  let launchArgs = { ...args };
  let candidates = [];
  // Resolve live capacity before creating anything. If a requested GPU is
  // unavailable, automatically use the strongest available secure GPU and
  // rescale the open model to its VRAM.
  if (!args.gpuId || args.autoSelectGpu !== false) {
    const catalog = await getCloudGpuCatalog({ runpodKey: apiKey });
    // Keep unattended runs bounded by default; callers may explicitly raise
    // maxHourlyPrice when they want H100/B200-class inference.
    const ranked = rankAvailableGpus(catalog, { minGB: MIN_USABLE_GPU_GB, maxHourlyPrice: args.maxHourlyPrice || 1.0 });
    const requested = ranked.find((g) => g.id === args.gpuId);
    candidates = requested ? [requested, ...ranked.filter((g) => g.id !== requested.id)] : ranked;
    if (!candidates.length) throw new Error('RunPod has no currently available secure GPU with at least 16GB VRAM');
    launchArgs = { ...launchArgs, gpuId: candidates[0].id, gpuMemoryGB: candidates[0].memory };
    if (!args.modelTag) launchArgs.modelTag = selectCloudModel(candidates[0].memory, { gameVramGB: args.gameVramGB }).tag;
  }
  let spec;
  let created;
  for (let i = 0; i < Math.max(1, Math.min(candidates.length || 1, 4)); i += 1) {
    if (candidates[i]) {
      launchArgs = { ...launchArgs, gpuId: candidates[i].id, gpuMemoryGB: candidates[i].memory };
      if (!args.modelTag) launchArgs.modelTag = selectCloudModel(candidates[i].memory, { gameVramGB: args.gameVramGB }).tag;
    }
    spec = buildPodSpec(launchArgs);
    try {
      created = await runpodFetch(apiKey, '/pods', { method: 'POST', body: spec.body });
      break;
    } catch (e) {
      if (!/no instances currently available|no instances available/i.test(String(e.message || e)) || i >= 3 || !candidates[i + 1]) throw e;
    }
  }
  const pod = created && (created.pod || created);
  const podId = pod && (pod.id || pod.podId);
  if (podId && !isSafePodId(String(podId))) throw new Error('Runpod returned an unsafe pod id');
  return {
    success: true,
    podId: podId || null,
    model: spec.model,
    gpu: { id: launchArgs.gpuId, memoryGB: Number(launchArgs.gpuMemoryGB) || null, autoSelected: launchArgs.gpuId !== args.gpuId },
    gameId: String(launchArgs.gameId || 'gravegain3d'),
    openSourceGame: spec.openSourceGame,
    maxMinutes: MAX_RUN_MINUTES,
    maxSeconds: MAX_RUN_SECONDS,
    billing: 'per-second, auto terminate at 55 minutes',
    proxy: podId ? `https://${podId}-8888.proxy.runpod.net` : null,
    desktops: podId ? {
      game: `https://${podId}-6901.proxy.runpod.net/vnc.html?autoconnect=true&resize=scale`,
      agent: `https://${podId}-6902.proxy.runpod.net/vnc.html?autoconnect=true&resize=scale`
    } : null
  };
}

/**
 * Read the live catalog through the local control plane. This keeps Runpod's
 * API out of browser CORS and keeps a BYOK credential in process memory only.
 */
async function getCloudGpuCatalog(opts = {}) {
  const apiKey = resolveApiKey(opts);
  if (!apiKey) throw new Error('Missing Runpod API key');
  let gpus;
  try {
    const data = await runpodFetch(apiKey, '/gpus');
    gpus = Array.isArray(data && data.gpus) ? data.gpus : (Array.isArray(data) ? data : []);
  } catch (e) {
    if (!/path.*does not exist|GET request/i.test(String(e.message || e))) throw e;
    gpus = GPU_CAPABILITY_ORDER.map((g) => ({ ...g, secure: true, availability: 'UNKNOWN', price: { secure: g.price } }));
  }
  return gpus.filter((gpu) => isSafeGpuId(gpu && gpu.id)).map((gpu) => ({
    id: gpu.id,
    memory: Number(gpu.memory) || 0,
    secure: gpu.secure === true,
    availability: String(gpu.availability || 'NONE'),
    price: { secure: Number(gpu.price && gpu.price.secure) || 0 }
  }));
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
  GPU_CAPABILITY_ORDER,
  selectCloudModel,
  pickCheapestAvailableGpu,
  pickBestAvailableGpu,
  rankAvailableGpus,
  estimateCost,
  maxBillableCost,
  getCloudGpuCatalog,
  buildPodSpec,
  startCloudRun,
  getCloudRunStatus,
  stopCloudRun,
  isSafeGpuId,
  isSafePodId,
  isSafeGameId,
  isSafeModelTag,
  isSafeXonoticMode
};
