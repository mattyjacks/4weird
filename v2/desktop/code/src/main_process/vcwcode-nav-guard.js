'use strict';

/**
 * vcwcode-nav-guard.js — pure will-navigate / will-redirect allow-list.
 *
 * Main-process helper: decide whether a navigation URL is allowed inside
 * the desktop shell. Allows local content only:
 *   - file: URLs (bundled UI)
 *   - http(s) URLs whose host is a loopback (localhost, 127.0.0.1, [::1])
 * Everything else (external http(s), custom schemes, etc.) is denied so
 * the shell never silently browses the open web.
 *
 * Pure: no Electron imports, no side effects — safe to unit-test with node.
 */

/**
 * @param {string} url — candidate navigation URL.
 * @returns {boolean} true when navigation may proceed.
 */
function isAllowedNav(url) {
  if (typeof url !== 'string' || url.length === 0) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return false;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol === 'file:') return true;
  if (protocol !== 'http:' && protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

module.exports = { isAllowedNav };

// Assert cases (run: node -e "const g=require('./vcwcode-nav-guard.js'); ..."):
//   1. g.isAllowedNav('file:///C:/app/index.html') === true
//   2. g.isAllowedNav('http://localhost:3000/dash') === true
//      g.isAllowedNav('http://127.0.0.1:8080/game') === true
//      g.isAllowedNav('http://[::1]:3000/') === true
//   3. g.isAllowedNav('https://example.com/') === false
//      g.isAllowedNav('data:text/html,hi') === false
//      g.isAllowedNav('not a url') === false
