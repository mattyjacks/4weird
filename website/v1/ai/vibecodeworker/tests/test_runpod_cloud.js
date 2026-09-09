'use strict';
const assert = require('assert');
const cloud = require('../lib/runpod_cloud');

async function run() {
  console.log('=== runpod cloud tests ===');
  // 55 minute hard cap.
  assert.strictEqual(cloud.MAX_RUN_MINUTES, 55);
  assert.strictEqual(cloud.MAX_RUN_SECONDS, 3300);
  // Per second billing math + cap clamp.
  assert.strictEqual(cloud.estimateCost(3.6, 3600), 3.3);
  assert.strictEqual(cloud.estimateCost(0.74, 3600), cloud.maxBillableCost(0.74));
  // Model autoscale accounts for game VRAM.
  const small = cloud.selectCloudModel(16);
  assert.ok(['qwen2.5vl:3b', 'qwen2.5vl:7b', 'llava:7b', 'ministral-3-vision:latest'].includes(small.tag), 'small gpu gets small vision model');
  const big = cloud.selectCloudModel(96);
  assert.strictEqual(big.tag, 'qwen2.5vl:72b');
  const mid = cloud.selectCloudModel(24);
  assert.strictEqual(mid.tag, 'qwen2.5vl:14b');
  // Cheapest AVAILABLE default: skips NONE stock, insecure, tiny, free.
  const catalog = [
    { id: 'NVIDIA RTX 5090', memory: 32, price: { secure: 0.99 }, availability: 'NONE', secure: true },
    { id: 'NVIDIA RTX A4000', memory: 16, price: { secure: 0.25 }, availability: 'LOW', secure: true },
    { id: 'NVIDIA RTX 2000 Ada Generation', memory: 16, price: { secure: 0.24 }, availability: 'LOW', secure: true },
    { id: 'NVIDIA GeForce RTX 4090', memory: 24, price: { secure: 0.74 }, availability: 'HIGH', secure: true },
    { id: 'Bad;DROP', memory: 99, price: { secure: 0.01 }, availability: 'HIGH', secure: true },
    { id: 'NVIDIA RTX A2000', memory: 6, price: { secure: 0.12 }, availability: 'LOW', secure: true }
  ];
  const cheap = cloud.pickCheapestAvailableGpu(catalog);
  assert.strictEqual(cheap.id, 'NVIDIA RTX 2000 Ada Generation');
  assert.strictEqual(cheap.source, 'live-catalog');
  // Empty catalog falls back safely, never throws.
  const fb = cloud.pickCheapestAvailableGpu([]);
  assert.ok(cloud.isSafeGpuId(fb.id));
  // Validators fail closed.
  assert.strictEqual(cloud.isSafePodId('abc-123_X'), true);
  assert.strictEqual(cloud.isSafePodId('../../etc'), false);
  assert.strictEqual(cloud.isSafeGpuId('NVIDIA GeForce RTX 4090'), true);
  assert.strictEqual(cloud.isSafeGpuId('x; rm -rf'), false);
  // Pod spec carries the 55 min cap, per second billing, no SSH port.
  const spec = cloud.buildPodSpec({ gpuId: 'NVIDIA GeForce RTX 4090', gpuMemoryGB: 24, gameId: 'snake-canvas', openSourceGameId: 'snake-canvas' });
  assert.strictEqual(spec.maxMinutes, 55);
  assert.strictEqual(spec.billing, 'per-second');
  assert.strictEqual(spec.body.env.VIBE_MAX_MINUTES, '55');
  assert.strictEqual(spec.body.env.VIBE_MODEL, 'qwen2.5vl:14b');
  const layoutSpec = cloud.buildPodSpec({ gpuId: 'NVIDIA GeForce RTX 4090', gpuMemoryGB: 24, gameId: 'snake-canvas', inputMode: 'mobile', videoLayout: 'both' });
  assert.strictEqual(layoutSpec.body.env.VCW_INPUT_MODE, 'mobile');
  assert.strictEqual(layoutSpec.body.env.VCW_VIDEO_LAYOUT, 'both');
  assert.strictEqual(layoutSpec.body.env.VCW_AUTO_RECORD, '1');
  assert.strictEqual(spec.body.env.VIBE_OPEN_SOURCE_GAME_ID, 'snake-canvas');
  assert.strictEqual(spec.openSourceGame.license, 'MIT');
  assert.ok(spec.body.ports.includes('6901/http') && spec.body.ports.includes('6902/http'), 'dual desktop ports are exposed');
  assert.ok(!spec.body.ports.includes('22/tcp'), 'no SSH exposed by default');
  const xonoticDesktop = cloud.buildPodSpec({ gpuId: 'NVIDIA RTX 4090', gpuMemoryGB: 24, openSourceGameId: 'xonotic', xonoticMode: 'desktop' });
  assert.strictEqual(xonoticDesktop.body.env.VIBE_XONOTIC_MODE, 'desktop');
  const xonoticWeb = cloud.buildPodSpec({ gpuId: 'NVIDIA RTX 4090', gpuMemoryGB: 24, openSourceGameId: 'xonotic', xonoticMode: 'web' });
  assert.strictEqual(xonoticWeb.body.env.VIBE_XONOTIC_MODE, 'web');
  assert.strictEqual(xonoticWeb.openSourceGame.kind, 'desktop+browser');
  assert.throws(() => cloud.buildPodSpec({ gpuId: 'NVIDIA RTX 4090', openSourceGameId: 'xonotic', xonoticMode: 'arbitrary-url' }), /Invalid xonoticMode/);
  assert.throws(() => cloud.buildPodSpec({ gpuId: 'bad;id' }), /Invalid gpuId/);
  assert.throws(() => cloud.buildPodSpec({ gpuId: 'NVIDIA RTX A4000', openSourceGameId: 'arbitrary-url' }), /Unsupported/);
  // Cloud routes exist and never echo keys.
  const routes = require('../lib/api/cloud_routes');
  assert.strictEqual(typeof routes.handleCloudRequest, 'function');
  const seen = [];
  const fakeSend = (code, data) => { seen.push([code, data]); };
  await routes.handleCloudRequest('/api/cloud/estimate', {}, async () => ({ gpus: catalog }), fakeSend, fakeSend);
  assert.strictEqual(seen[0][0], 200);
  assert.strictEqual(seen[0][1].cheapest.id, 'NVIDIA RTX 2000 Ada Generation');
  assert.ok(!JSON.stringify(seen[0][1]).includes('rpa-'), 'no key material in estimate');
  console.log('ALL CLOUD TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('CLOUD TESTS FAILED', e); process.exit(1); });
}
module.exports = { run };
