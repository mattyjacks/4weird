#!/usr/bin/env node
/*
 * Reproducible controller benchmark. It measures the decision engines that
 * can run without spending provider credits; the report intentionally labels
 * unconfigured cloud models as unavailable instead of inventing a speed.
 */
const { performance } = require('perf_hooks');
const { decideOvertake } = require('../../lib/brain/overtake_reflex');
const { runHeuristicFallback } = require('../../lib/brain/llm_caller');

const frames = Array.from({ length: 6000 }, (_, i) => ({
  mode: 'race', playerX: ((i * 17) % 201 - 100) / 140,
  nitro: (i % 100) / 100,
  traffic: [
    { x: ((i * 7) % 201 - 100) / 100, distanceAhead: 25 + (i % 170), kind: 'rival' },
    { x: ((i * 13) % 201 - 100) / 100, distanceAhead: 35 + (i % 240), kind: 'powerup' }
  ]
}));

function bench(name, fn) {
  const started = performance.now();
  let checksum = 0;
  for (const frame of frames) {
    const result = fn(frame);
    checksum ^= String(result.action.type + result.action.target).length;
  }
  const elapsed = performance.now() - started;
  return { name, samples: frames.length, elapsedMs: +elapsed.toFixed(3), avgUs: +(elapsed * 1000 / frames.length).toFixed(3), checksum };
}

const results = [
  bench('Overtake bitwise reflex (local)', decideOvertake),
  (() => {
    // The legacy fallback logs each invocation for interactive debugging;
    // suppress that diagnostic during the tight benchmark only.
    const log = console.log;
    console.log = () => {};
    try { return bench('Generic offline heuristic', () => runHeuristicFallback([], [{ tagName: 'CANVAS', nx: 500, ny: 500 }])); }
    finally { console.log = log; }
  })()
];
const modelCandidates = [
  ['OpenAI Responses / Chat', !!process.env.OPENAI_API_KEY],
  ['DeepSeek harness', !!process.env.DEEPSEEK_API_KEY],
  ['Gemini Flash', !!process.env.GEMINI_API_KEY],
  ['Meta / OpenRouter harness', !!(process.env.META_API_KEY || process.env.OPENROUTER_API_KEY)],
  ['Ollama local harness', false]
].map(([name, configured]) => ({ name, configured, note: configured ? 'Configured: run a live provider benchmark explicitly from the dashboard.' : 'Not configured in this process; no request sent.' }));

console.log(JSON.stringify({ schema: 'vibecodeworker.overtake-benchmark.v1', results, providerHarnesses: modelCandidates }, null, 2));
