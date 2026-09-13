// vcwcode-check-artifact: assert electron-builder portable artifactName + output dir.
// Usage: node automation/vcwcode-check-artifact.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const EXPECTED_ARTIFACT = 'vibecodeworker-4weird.exe';
const EXPECTED_OUTPUT = 'dist';

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
} catch (e) {
  console.log(`FAIL vcwcode-check-artifact: cannot read package.json (${e.message})`);
  process.exit(1);
}
const artifact = pkg && pkg.build && pkg.build.portable && pkg.build.portable.artifactName;
const output = pkg && pkg.build && pkg.build.directories && pkg.build.directories.output;
if (artifact === EXPECTED_ARTIFACT && output === EXPECTED_OUTPUT) {
  console.log(`PASS vcwcode-check-artifact: artifactName=${artifact} output=${output}`);
  process.exit(0);
}
console.log(`FAIL vcwcode-check-artifact: artifactName=${artifact} (want ${EXPECTED_ARTIFACT}) output=${output} (want ${EXPECTED_OUTPUT})`);
process.exit(1);
