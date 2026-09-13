// vcwcode-body-cap-note.js — 1MB JSON body cap + 413 handling.
// Policy: POST/PUT/PATCH JSON bodies larger than 1 MiB (1_048_576 bytes)
// are rejected with HTTP 413 (Payload Too Large).
// Client rule: check byte length before sending; split or shrink payloads.
'use strict';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

function bodyByteLength(body) {
  if (body == null) return 0;
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return Buffer.byteLength(s, 'utf8');
}

function assertBodyFits(body) {
  const n = bodyByteLength(body);
  if (n > MAX_BODY_BYTES) {
    const err = new Error('body too large: ' + n + ' bytes > 1MB cap');
    err.code = 413;
    err.bytes = n;
    throw err;
  }
  return n;
}

function isBodyTooLargeError(errOrRes) {
  if (!errOrRes) return false;
  if (errOrRes.code === 413 || errOrRes.status === 413) return true;
  const msg = String((errOrRes && errOrRes.message) || errOrRes);
  return /413|too large|payload/i.test(msg);
}

module.exports = { MAX_BODY_BYTES, bodyByteLength, assertBodyFits, isBodyTooLargeError };
