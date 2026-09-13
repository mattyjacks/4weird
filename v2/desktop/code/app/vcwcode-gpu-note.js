// WIRING: require from app/main.js GPU opt-in block (before createWindow) — e.g. const { shouldUseSoftware } = require('./vcwcode-gpu-note');
'use strict';

// Opt into native GPU rendering only with --enable-gpu (known-good hosts).
// Otherwise Chromium uses its software renderer so the dashboard and the
// WebGL game preview still open on machines where the GPU subprocess cannot load.
const GPU_FLAGS = ['--enable-gpu'];
const SOFTWARE_FLAGS = ['disable-gpu', 'disable-gpu-compositing', 'in-process-gpu'];

// shouldUseSoftware(argv) -> boolean
// Pure mirror of main.js: `if (!process.argv.includes('--enable-gpu'))`.
// Returns true unless argv explicitly opts into native GPU.
function shouldUseSoftware(argv) {
  const list = Array.isArray(argv) ? argv : [];
  return !list.includes('--enable-gpu');
}

module.exports = { GPU_FLAGS, SOFTWARE_FLAGS, shouldUseSoftware };
