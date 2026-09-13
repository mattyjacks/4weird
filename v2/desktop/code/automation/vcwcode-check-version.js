// vcwcode-check-version: assert package.json version matches VERSION file (and tauri.conf.json).
// Usage: node automation/vcwcode-check-version.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const VERSION_PATH = path.join(ROOT, 'VERSION');
const TAURI_PATH = path.join(ROOT, 'src-tauri', 'tauri.conf.json');

let pkgVersion;
try {
  pkgVersion = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version;
} catch (e) {
  console.log(`FAIL vcwcode-check-version: cannot read package.json (${e.message})`);
  process.exit(1);
}
let fileVersion;
try {
  fileVersion = fs.readFileSync(VERSION_PATH, 'utf8').trim();
} catch (e) {
  console.log(`FAIL vcwcode-check-version: cannot read VERSION (${e.message})`);
  process.exit(1);
}
let tauriVersion = null;
try {
  tauriVersion = JSON.parse(fs.readFileSync(TAURI_PATH, 'utf8')).version;
} catch (_) {
  tauriVersion = null;
}
const sync = String(pkgVersion).trim() === String(fileVersion).trim()
  && (tauriVersion === null || String(tauriVersion).trim() === String(pkgVersion).trim());
if (sync) {
  console.log(`PASS vcwcode-check-version: package.json=${pkgVersion} VERSION=${fileVersion} tauri=${tauriVersion}`);
  process.exit(0);
}
console.log(`FAIL vcwcode-check-version: package.json=${pkgVersion} VERSION=${fileVersion} tauri=${tauriVersion}`);
process.exit(1);
