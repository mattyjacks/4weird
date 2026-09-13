'use strict';

// Cross-platform test orchestrator. npm may use cmd.exe, PowerShell, or sh
// depending on the host; keeping sequencing in Node makes the local desktop
// and Runpod paths execute precisely the same checks.
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const tests = [
  'tests/test_vibecodeworker.js',
  'tests/test_console_triage.js',
  'tests/test_runpod_cloud.js',
  'tests/test_website_debugger.js',
  'tests/test_mediamogul_video_recorder.js',
  'tests/test_foveated_vision.js',
  'tests/test_fovea_overlay.js',
  'tests/test_native_hl2.js',
  'tests/run_trace_tests.js',
];

for (const test of tests) {
  process.stdout.write(`\n=== ${test} ===\n`);
  const result = spawnSync(process.execPath, [test], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) {
    console.error(`Could not start ${test}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('\nALL VIBECODEWORKER TESTS PASSED');
