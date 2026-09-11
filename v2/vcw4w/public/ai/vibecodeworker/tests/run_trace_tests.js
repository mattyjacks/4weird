/**
 * Trace-test runner: executes every self-generated takeover regression test.
 *
 * Runs `tests/generated/trace-*.js` only — the sibling `*.test.json` files
 * are RUNTIME-ONLY fixtures (loaded from disk by the tests, never pasted
 * into model context). Zero generated tests yet is a pass with a hint.
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'generated');

function main() {
  if (!fs.existsSync(dir)) {
    console.log('=== TRACE TESTS: none yet — take over a game and press 🧪 Generate test ===');
    return 0;
  }
  const files = fs.readdirSync(dir)
    .filter((f) => /^trace-.*\.js$/.test(f) && !f.endsWith('.test.json'))
    .sort();
  if (!files.length) {
    console.log('=== TRACE TESTS: none yet — take over a game and press 🧪 Generate test ===');
    return 0;
  }
  console.log(`=== RUNNING ${files.length} SELF-GENERATED TRACE TEST(S) ===`);
  let failed = 0;
  for (const f of files) {
    const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
    if (r.status !== 0) { failed++; console.error(`❌ ${f} FAILED`); }
    else console.log(`✅ ${f} passed`);
  }
  console.log(failed ? `=== TRACE TESTS: ${failed}/${files.length} FAILED ===` : `=== TRACE TESTS: ${files.length}/${files.length} PASSED ===`);
  return failed ? 1 : 0;
}

process.exit(main());
