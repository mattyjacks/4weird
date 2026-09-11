'use strict';

/**
 * Secure /api/debug/* handlers.
 *
 * POST /api/debug/website { url } fetches one page server side and audits it,
 * so it is gated like the mutating endpoints: loopback/local origins only
 * (see EXECUTION_PATHS in api_server.js), POST only, tiny rate brake.
 * Bodies are audited, never logged, never executed.
 */

const checker = require('../website_check');

let windowStart = Date.now();
let windowCount = 0;

function rateLimitOk() {
  const now = Date.now();
  if (now - windowStart > 60000) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount <= 10;
}

async function handleDebugRequest(pathname, req, readBody, sendJSON, sendText) {
  if (pathname === '/api/debug/website') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    if (!rateLimitOk()) return sendJSON(429, { success: false, error: 'Rate limited, try again in a minute' });
    const body = await readBody();
    const rawUrl = body && (body.url || body.target);
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return sendJSON(400, { success: false, error: 'Provide a url string' });
    }
    if (rawUrl.length > checker.MAX_URL_LEN) {
      return sendJSON(400, { success: false, error: 'URL too long' });
    }
    try {
      const live = body.live !== false;
      const report = await checker.checkWebsite(rawUrl, { live });
      return sendJSON(200, report);
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/Only http|credentials|parseable|invalid|No host|Provide a url/i.test(msg)) {
        return sendJSON(400, { success: false, error: msg.slice(0, 160) });
      }
      return sendJSON(502, { success: false, error: msg.slice(0, 200) });
    }
  }
  return null;
}

module.exports = { handleDebugRequest };
