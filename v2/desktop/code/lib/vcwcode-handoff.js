'use strict';
// vcwcode handoff helper — fail-open handoff file writer (never throws).
const fs = require('fs');
const path = require('path');

function writeHandoff(dir, reason) {
  try {
    if (typeof dir !== 'string' || dir.length === 0) {
      return { success: false, path: null, error: 'missing dir' };
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = 'handoff-' + stamp + '.json';
    const fullPath = path.join(dir, file);
    fs.mkdirSync(dir, { recursive: true });
    const payload = {
      reason: typeof reason === 'string' ? reason : String(reason),
      at: new Date().toISOString(),
    };
    fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, path: fullPath };
  } catch (err) {
    return {
      success: false,
      path: null,
      error: err && err.message ? err.message : String(err),
    };
  }
}

module.exports = { writeHandoff };
