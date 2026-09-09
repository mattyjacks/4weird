'use strict';

/**
 * Secure /api/cloud/* handlers.
 *
 * Trust model:
 * - Estimate + model ladder are public, no key needed.
 * - Launch, status, stop are LOOPBACK ONLY unless VIBE_API_TOKEN is set and
 *   presented. External web origins are blocked one layer up in api_server.js
 *   via EXECUTION_PATHS. The public page calls the user's loopback VCW API,
 *   which forwards the key directly to Runpod without persistence.
 * - Runpod key arrives via x-runpod-key header only. Never query params
 *   (they land in logs), never persisted, never echoed back.
 */

const cloud = require('../runpod_cloud');
const openSourceGames = require('../open_source_games');

// Tiny in memory brake: max 10 cloud mutating calls per minute per process.
let windowStart = Date.now();
let windowCount = 0;

function rateLimitOk() {
  const now = Date.now();
  if (now - windowStart > 60000) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount <= 10;
}

function readRunpodKey(req) {
  const h = req.headers && (req.headers['x-runpod-key'] || req.headers['x-runpodkey']);
  if (typeof h === 'string' && h.trim().length >= 10) return h.trim();
  return null;
}

async function handleCloudRequest(pathname, req, readBody, sendJSON, sendText) {
  if (pathname === '/api/cloud/games') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    return sendJSON(200, { success: true, games: openSourceGames.OPEN_SOURCE_GAMES });
  }

  if (pathname === '/api/cloud/games/download') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    try {
      const result = await openSourceGames.downloadOpenSourceGame(body.gameId);
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(400, { success: false, error: String(e.message || e).slice(0, 200) });
    }
  }

  // The browser calls this local endpoint instead of api.runpod.io directly.
  // It is deliberately key-gated even though it is read-only, because catalog
  // availability is an authenticated Runpod resource.
  if (pathname === '/api/cloud/catalog') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    const runpodKey = readRunpodKey(req);
    if (!runpodKey) return sendJSON(401, { success: false, error: 'Missing x-runpod-key header' });
    try {
      const gpus = await cloud.getCloudGpuCatalog({ runpodKey });
      return sendJSON(200, { success: true, gpus });
    } catch (e) {
      return sendJSON(502, { success: false, error: String(e.message || e).slice(0, 200) });
    }
  }

  // Public: biggest fitting model for a VRAM size. No key needed.
  if (pathname === '/api/cloud/models') {
    const mem = Number((await readBody()).gpuMemoryGB || 24);
    return sendJSON(200, {
      success: true,
      maxMinutes: cloud.MAX_RUN_MINUTES,
      billing: 'per-second, auto terminate at 55 minutes',
      pick: cloud.selectCloudModel(mem)
    });
  }

  if (pathname === '/api/cloud/estimate') {
    const body = await readBody();
    const pick = cloud.pickCheapestAvailableGpu(body.gpus || [], { minGB: body.minGB });
    const secs = Math.min(Number(body.seconds) || 600, cloud.MAX_RUN_SECONDS);
    return sendJSON(200, {
      success: true,
      cheapest: pick,
      model: cloud.selectCloudModel(pick.memory),
      seconds: secs,
      estCost: cloud.estimateCost(pick.price, secs),
      maxCost: cloud.maxBillableCost(pick.price),
      maxMinutes: cloud.MAX_RUN_MINUTES,
      billing: 'per-second'
    });
  }

  // Mutating below: brake + key required. Origin gating lives in api_server.js.
  if (pathname === '/api/cloud/launch' || pathname === '/api/cloud/stop' || pathname === '/api/cloud/status') {
    if (req.method === 'GET' && pathname !== '/api/cloud/status') return sendText(405, 'Method Not Allowed');
    if (!rateLimitOk()) return sendJSON(429, { success: false, error: 'Rate limited, try again in a minute' });
    const runpodKey = readRunpodKey(req);
    if (!runpodKey) return sendJSON(401, { success: false, error: 'Missing x-runpod-key header' });
    try {
      if (pathname === '/api/cloud/launch') {
        if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
        const body = await readBody();
        let gpus = Array.isArray(body.gpus) ? body.gpus : null;
        let gpuPick = null;
        if (!body.gpuId && gpus) {
          gpuPick = cloud.pickCheapestAvailableGpu(gpus, { minGB: body.minGB });
          body.gpuId = gpuPick.id;
          body.gpuMemoryGB = gpuPick.memory;
        }
        const result = await cloud.startCloudRun({ ...body, runpodKey });
        return sendJSON(200, { ...result, gpu: gpuPick });
      }
      if (pathname === '/api/cloud/status') {
        const body = req.method === 'POST' ? await readBody() : {};
        const url = require('url');
        const qs = new url.URL(req.url, 'http://localhost').searchParams;
        const podId = body.podId || qs.get('podId');
        const status = await cloud.getCloudRunStatus(podId, { runpodKey });
        return sendJSON(200, { success: true, podId, status: status && (status.status || status) });
      }
      const body = await readBody();
      const stopped = await cloud.stopCloudRun(body.podId, { runpodKey });
      return sendJSON(200, stopped);
    } catch (e) {
      return sendJSON(500, { success: false, error: String(e.message || e).slice(0, 200) });
    }
  }

  return null;
}

module.exports = { handleCloudRequest };
