// vcwcode-check-icon: assert src/icon.png exists (referenced by app/main.js).
// Usage: node automation/vcwcode-check-icon.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ICON_PATH = path.join(ROOT, 'src', 'icon.png');

if (fs.existsSync(ICON_PATH)) {
  console.log(`PASS vcwcode-check-icon: src/icon.png exists (used by app/main.js)`);
  process.exit(0);
}
console.log(`FAIL vcwcode-check-icon: missing src/icon.png (expected by app/main.js) at ${ICON_PATH}`);
process.exit(1);
