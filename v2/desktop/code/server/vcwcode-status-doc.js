// vcwcode-status-doc.js — documents the REAL shape of GET /api/status
// observed live on 2026-09-13 via GET http://127.0.0.1:42069/api/status.
// Do not invent fields: anything not seen below is marked UNPROBED.
// This file is docs + a shape constant only; it does not start a server
// and does not edit lib/api_server.js.
'use strict';

// Observed live response (values vary run to run; keys are stable):
// {
//   "success": true,
//   "system": "4weird VibeCodeWorker Local API Server",
//   "version": "2.0.0",
//   "uptimeSeconds": 134,
//   "runtimeMode": "electron",
//   "activeGame": null,
//   "activeGameUrl": null,
//   "totalBugs": 32,
//   "totalApiRequests": 1,
//   "memoryUsage": { "rss": 160722944, "heapTotal": 6451200,
//     "heapUsed": 5546396, "external": 3187071, "arrayBuffers": 0 }
// }
const STATUS_SHAPE = {
  success: 'boolean // true on healthy server (observed: true)',
  system: 'string // observed: "4weird VibeCodeWorker Local API Server"',
  version: 'string // observed: "2.0.0"',
  uptimeSeconds: 'number // seconds since server start (observed: 134)',
  runtimeMode: 'string // observed: "electron"; other values: UNPROBED',
  activeGame: 'string|null // observed: null; non-null shape: UNPROBED',
  activeGameUrl: 'string|null // observed: null; non-null shape: UNPROBED',
  totalBugs: 'number // observed: 32',
  totalApiRequests: 'number // observed: 1 (counter since boot)',
  memoryUsage: {
    rss: 'number // process.memoryUsage().rss',
    heapTotal: 'number',
    heapUsed: 'number',
    external: 'number',
    arrayBuffers: 'number // observed: 0',
  },
  // UNPROBED (not present in observed response; do not rely on these):
  // error, code, data envelope, timestamp, pid, port, auth fields.
};

function summarizeStatus(s) {
  if (!s || typeof s !== 'object') return 'invalid status payload';
  const keys = Object.keys(STATUS_SHAPE).filter((k) => k !== 'memoryUsage');
  const missing = keys.filter((k) => !(k in s));
  const base = String(s.system || 'unknown') + ' v' + String(s.version || '?') +
    ' up=' + String(s.uptimeSeconds) + 's bugs=' + String(s.totalBugs);
  return missing.length ? base + ' MISSING[' + missing.join(',') + ']' : base;
}

module.exports = { STATUS_SHAPE, summarizeStatus };
