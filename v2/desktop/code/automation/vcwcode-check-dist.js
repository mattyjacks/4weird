// vcwcode-check-dist: report dist/ vs dist-current/ sizes + prune note (never delete).
// Usage: node automation/vcwcode-check-dist.js (always exits 0)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DIST_CURRENT = path.join(ROOT, 'dist-current');

function dirSizeBytes(dir) {
  let total = 0;
  let files = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch (_) {
      return null; // missing/unreadable
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        try {
          total += fs.statSync(full).size;
          files += 1;
        } catch (_) { /* skip racing deletes */ }
      }
    }
  }
  return { bytes: total, files };
}

function fmt(bytes) {
  if (bytes === null || bytes === undefined) return 'absent';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GiB`;
  return `${mb.toFixed(2)} MiB`;
}

const dist = fs.existsSync(DIST) ? dirSizeBytes(DIST) : null;
const current = fs.existsSync(DIST_CURRENT) ? dirSizeBytes(DIST_CURRENT) : null;
const line = (label, info) => (info === null
  ? `${label}=absent`
  : `${label}=${fmt(info.bytes)} (${info.files} files)`);

console.log(`PASS vcwcode-check-dist: ${line('dist', dist)} vs ${line('dist-current', current)} | NOTE: prune candidates only - never delete automatically; move stale bundles to archive by hand.`);
process.exit(0);
