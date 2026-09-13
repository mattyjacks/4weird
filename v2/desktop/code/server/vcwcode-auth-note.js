// vcwcode-auth-note.js — VIBE_API_TOKEN auth pattern (docs + header builder).
// No real tokens here: pass your token in from env (process.env.VIBE_API_TOKEN).
// Convention: send EITHER header `X-Vibe-Auth: <token>` OR
// `Authorization: Bearer <token>`. Never commit tokens or log them.
'use strict';

function buildAuthHeaders(token) {
  const t = String(token || '').trim();
  if (!t) throw new Error('buildAuthHeaders: token required (set VIBE_API_TOKEN env)');
  return {
    'X-Vibe-Auth': t,
    Authorization: 'Bearer ' + t,
  };
}

// Example (do not run with a fake token against prod):
// const headers = buildAuthHeaders(process.env.VIBE_API_TOKEN);
// const res = await fetch('http://127.0.0.1:42069/api/status', { headers });

function hasAuthHeader(headers) {
  if (!headers || typeof headers !== 'object') return false;
  const lower = {};
  for (const k of Object.keys(headers)) lower[String(k).toLowerCase()] = headers[k];
  return Boolean(lower['x-vibe-auth'] || lower['authorization']);
}

module.exports = { buildAuthHeaders, hasAuthHeader };
