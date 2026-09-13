'use strict';

/**
 * vcwcode-permission-guard.js — permission request deny-list.
 *
 * Main-process helper documenting the desktop shell's permission policy:
 * deny everything by default. Electron's `setPermissionRequestHandler`
 * should consult `shouldGrant()` and never grant.
 *
 * Pure: no Electron imports, no side effects — safe to unit-test with node.
 */

// Every permission Electron may ask about. Kept as an explicit list so a
// newly-added Chromium permission type fails closed (unknown => denied).
const PERMISSION_DENY_ALL = Object.freeze([
  'media', // camera + microphone
  'geolocation',
  'notifications',
  'midiSysex',
  'pointerLock',
  'fullscreen',
  'openExternal',
  'clipboard-read',
  'clipboard-sanitized-write',
  'mediaKeySystem',
  'unknown',
]);

/**
 * @param {string} permission — the permission being requested.
 * @returns {boolean} always false: the shell grants no permissions.
 */
function shouldGrant(permission) {
  void permission;
  return false;
}

module.exports = { PERMISSION_DENY_ALL, shouldGrant };
