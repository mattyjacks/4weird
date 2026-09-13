// vcwcode-check-ffmpeg: warn (never fail) when the ffmpeg extraResource source is absent.
// extraResources entry: { "from": "../mediamogul/shotcut/ffmpeg.exe", "to": "mediamogul/ffmpeg.exe" }
// Usage: node automation/vcwcode-check-ffmpeg.js (always exits 0)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// "from" is relative to the project root (v2/desktop/code), i.e. v2/desktop/mediamogul/shotcut/ffmpeg.exe
const FFMPEG_SRC = path.resolve(ROOT, '..', 'mediamogul', 'shotcut', 'ffmpeg.exe');

if (fs.existsSync(FFMPEG_SRC)) {
  console.log(`PASS vcwcode-check-ffmpeg: extraResource source present at ${FFMPEG_SRC}`);
  process.exit(0);
}
console.log(`WARN vcwcode-check-ffmpeg: extraResource source absent at ${FFMPEG_SRC} (portable build will lack bundled ffmpeg; install Shotcut ffmpeg to fix)`);
process.exit(0);
