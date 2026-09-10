/**
 * VibeCodeWorker shared utilities.
 * Zero dependencies. Every helper is pure, bounded, and never throws on bad input.
 */

'use strict';

const crypto = require('crypto');

function clamp(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sleep(ms) {
  const wait = clamp(ms, 0, 60000, 0);
  return new Promise((resolve) => setTimeout(resolve, wait));
}

function withTimeout(promise, ms, label = 'operation') {
  const wait = clamp(ms, 1, 120000, 8000);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${wait}ms`)), wait);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

async function retryAsync(fn, { retries = 3, delayMs = 500, factor = 2, label = 'retryable' } = {}) {
  const attempts = Math.round(clamp(retries, 0, 10, 3)) + 1;
  let delay = clamp(delayMs, 0, 30000, 500);
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      await sleep(delay);
      delay = Math.min(30000, delay * (Number.isFinite(factor) && factor > 0 ? factor : 2));
    }
  }
  throw new Error(`${label} failed after ${attempts} attempt(s): ${lastErr && lastErr.message ? lastErr.message : lastErr}`);
}

function safeJsonParse(text, fallback = null) {
  try {
    if (typeof text !== 'string' || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function safeJsonStringify(value, maxLen = 100000) {
  try {
    const s = JSON.stringify(value);
    if (typeof s !== 'string') return '';
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  } catch (_) {
    return '';
  }
}

function newRequestId(prefix = 'vcw') {
  try {
    const rand = crypto.randomBytes(6).toString('hex');
    return `${prefix}_${Date.now().toString(36)}_${rand}`;
  } catch (_) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

function isValidUrl(s, { allowHttp = true } = {}) {
  if (typeof s !== 'string' || s.length > 2048) return false;
  try {
    const u = new URL(s);
    if (allowHttp) return u.protocol === 'http:' || u.protocol === 'https:';
    return u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isValidPort(n) {
  const p = Number(n);
  return Number.isInteger(p) && p >= 1 && p <= 65535;
}

function truncate(s, maxLen = 4000) {
  const str = String(s == null ? '' : s);
  const cap = Math.round(clamp(maxLen, 1, 100000, 4000));
  return str.length > cap ? str.slice(0, cap) : str;
}

function debounce(fn, waitMs = 200) {
  let t = null;
  const wait = clamp(waitMs, 0, 10000, 200);
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .slice(0, 20000);
}

module.exports = {
  clamp,
  sleep,
  withTimeout,
  retryAsync,
  safeJsonParse,
  safeJsonStringify,
  newRequestId,
  isValidUrl,
  isValidPort,
  truncate,
  debounce,
  escapeHtml
};
