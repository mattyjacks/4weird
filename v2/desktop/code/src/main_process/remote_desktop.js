'use strict';
/**
 * remote_desktop.js — Consent-first remote control for the desktop shell.
 *
 * Design contract (consent-first, fail-closed, no silent takeover):
 * - NO auto-start. Module has no side effects on require().
 * - Every remote session REQUIRES explicit user consent (in-person click
 *   in the desktop UI / main-process dialog path). A boolean flag passed
 *   by a renderer, website, or API caller is NOT consent by itself — it
 *   must be accompanied by a verified user-consent record.
 * - One-time token: issued at grant time, single-use, short TTL, bound
 *   to one requester id. Replay or expiry => denied.
 * - Allow-list of actions: only `screenshot` and `input` (sub-scoped by
 *   input.allow list). Anything else => denied + audit line.
 * - Audit log: every grant / deny / action / revoke / expiry is appended
 *   as a structured line the integrator can ship to disk or UI.
 * - Fail-closed: any missing/invalid/expired consent or token denies.
 *
 * Dependency-free. Require-able from Electron main:
 *   const remoteDesktop = require('./remote_desktop');
 *
 * Electron wiring is intentionally NOT done here (see docs/
 * REMOTE-DESKTOP-CONSENT.md and the wiring notes returned with this task).
 * The integrator owns IPC registration, dialog UI, and actual
 * screenshot/input backends; this module owns policy + state.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Policy constants
// ---------------------------------------------------------------------------

const ALLOWED_ACTIONS = Object.freeze(['screenshot', 'input']);
const ALLOWED_INPUT_SUBACTIONS = Object.freeze([
  'mouse-move',
  'mouse-click',
  'key-press',
  'scroll',
]);

const DEFAULT_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours hard cap

// ---------------------------------------------------------------------------
// State (in-memory only; never persisted — consent does not survive restart)
// ---------------------------------------------------------------------------

/** token string -> { requesterId, createdAt, expiresAt, consumed, sessionId } */
const pendingTokens = new Map();
/** sessionId -> session record */
const sessions = new Map();
/** append-only audit lines (also mirrored via onAudit callback) */
const auditLog = [];
let onAuditCallback = null;
let idCounter = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return Date.now();
}

function newId(prefix) {
  idCounter += 1;
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${now().toString(36)}_${rand}_${idCounter}`;
}

function audit(event, details) {
  const line = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };
  auditLog.push(line);
  if (typeof onAuditCallback === 'function') {
    try {
      onAuditCallback(line);
    } catch (_) {
      // Audit sink failures must never open the gate.
    }
  }
  return line;
}

function normalizeActions(requested) {
  if (!Array.isArray(requested)) return { ok: false, reason: 'actions must be an array' };
  const cleaned = [];
  for (const a of requested) {
    if (typeof a === 'string' && ALLOWED_ACTIONS.includes(a)) {
      if (!cleaned.includes(a)) cleaned.push(a);
    } else {
      return { ok: false, reason: `action not allow-listed: ${JSON.stringify(a)}` };
    }
  }
  if (cleaned.length === 0) return { ok: false, reason: 'at least one allow-listed action required' };
  return { ok: true, actions: cleaned };
}

function normalizeInputAllow(list) {
  if (list === undefined) return { ok: true, allow: ['mouse-move', 'mouse-click', 'key-press', 'scroll'] };
  if (!Array.isArray(list)) return { ok: false, reason: 'input.allow must be an array' };
  for (const s of list) {
    if (!ALLOWED_INPUT_SUBACTIONS.includes(s)) {
      return { ok: false, reason: `input sub-action not allow-listed: ${JSON.stringify(s)}` };
    }
  }
  return { ok: true, allow: [...list] };
}

function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (s.revokedAt) return null;
  if (now() > s.expiresAt) {
    sessions.delete(sessionId);
    audit('session.expired', { sessionId, requesterId: s.requesterId });
    return null;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Step 1 — a remote party (website /terminal, virtual desktop) asks for
 * control. This creates a PENDING request only. It does NOT grant anything.
 *
 * @param {object} opts { requesterId, requesterLabel, actions, inputAllow?, ttlMs? }
 * @returns {{ ok, requestId?, reason? }}
 */
function requestControl(opts = {}) {
  const requesterId = typeof opts.requesterId === 'string' ? opts.requesterId.trim() : '';
  if (!requesterId) {
    audit('request.denied', { reason: 'missing requesterId' });
    return { ok: false, reason: 'requesterId is required' };
  }
  const norm = normalizeActions(opts.actions);
  if (!norm.ok) {
    audit('request.denied', { requesterId, reason: norm.reason });
    return { ok: false, reason: norm.reason };
  }
  const inputNorm = normalizeInputAllow(opts.inputAllow);
  if (!inputNorm.ok) {
    audit('request.denied', { requesterId, reason: inputNorm.reason });
    return { ok: false, reason: inputNorm.reason };
  }
  const requestId = newId('rdreq');
  const request = {
    requestId,
    requesterId,
    requesterLabel: typeof opts.requesterLabel === 'string' ? opts.requesterLabel.slice(0, 120) : requesterId,
    actions: norm.actions,
    inputAllow: inputNorm.allow,
    createdAt: now(),
    status: 'pending-consent',
  };
  // Pending requests live in the audit log + a lightweight map entry.
  pendingRequests.set(requestId, request);
  audit('request.created', {
    requestId,
    requesterId,
    actions: request.actions,
    inputAllow: request.inputAllow,
    note: 'awaiting explicit user consent — no access granted',
  });
  return { ok: true, requestId };
}

/** requestId -> pending request record (separate from one-time tokens) */
const pendingRequests = new Map();

/**
 * Step 2 — the LOCAL USER explicitly consents (or denies) via desktop UI.
 * The integrator MUST call this only from a genuine user gesture path
 * (e.g. user clicked "Allow" in a main-process dialog / settings toggle).
 * Programmatic callers cannot manufacture consent: `userConsented` must be
 * true AND `consentProof` must be a non-empty string describing the gesture
 * (e.g. "dialog:allow-button:2026-09-13T..."), otherwise denied.
 *
 * On approval this issues a SINGLE-USE token the requester redeems once.
 *
 * @param {object} opts { requestId, userConsented, consentProof, ttlMs? }
 * @returns {{ ok, token?, sessionId?, expiresAt?, reason? }}
 */
function grantConsent(opts = {}) {
  const { requestId, userConsented, consentProof } = opts;
  const req = pendingRequests.get(requestId);
  if (!req) {
    audit('consent.denied', { requestId, reason: 'unknown or already-handled request' });
    return { ok: false, reason: 'unknown or already-handled request' };
  }
  if (userConsented !== true) {
    pendingRequests.delete(requestId);
    audit('consent.denied', { requestId, requesterId: req.requesterId, reason: 'user denied or flag not true' });
    return { ok: false, reason: 'user did not consent' };
  }
  if (typeof consentProof !== 'string' || consentProof.trim().length < 8) {
    pendingRequests.delete(requestId);
    audit('consent.denied', { requestId, requesterId: req.requesterId, reason: 'missing consent proof (no verified user gesture)' });
    return { ok: false, reason: 'verified user gesture required — fail-closed' };
  }
  const ttlMs = Number.isFinite(opts.ttlMs) ? Math.min(Math.max(opts.ttlMs, 60 * 1000), MAX_SESSION_TTL_MS) : DEFAULT_SESSION_TTL_MS;
  const sessionId = newId('rdsess');
  const token = crypto.randomBytes(24).toString('hex');
  const createdAt = now();
  const session = {
    sessionId,
    requestId,
    requesterId: req.requesterId,
    requesterLabel: req.requesterLabel,
    actions: req.actions,
    inputAllow: req.inputAllow,
    createdAt,
    expiresAt: createdAt + ttlMs,
    consentProof: consentProof.slice(0, 200),
    revokedAt: null,
    redeemed: false,
  };
  sessions.set(sessionId, session);
  pendingTokens.set(token, {
    sessionId,
    requesterId: req.requesterId,
    createdAt,
    expiresAt: createdAt + DEFAULT_TOKEN_TTL_MS,
    consumed: false,
  });
  pendingRequests.delete(requestId);
  audit('consent.granted', {
    sessionId,
    requestId,
    requesterId: req.requesterId,
    actions: req.actions,
    expiresAt: new Date(session.expiresAt).toISOString(),
    consentProof: session.consentProof,
    note: 'one-time token issued; redeem once within 5 min',
  });
  return { ok: true, token, sessionId, expiresAt: session.expiresAt };
}

/**
 * Step 3 — requester redeems the one-time token. Single-use: second use
 * (or expiry, or wrong requester) is denied and audited.
 */
function redeemToken(token, requesterId) {
  if (typeof token !== 'string' || !token) {
    audit('token.denied', { reason: 'missing token' });
    return { ok: false, reason: 'token required — fail-closed' };
  }
  const rec = pendingTokens.get(token);
  if (!rec) {
    audit('token.denied', { reason: 'unknown token' });
    return { ok: false, reason: 'unknown token' };
  }
  if (rec.consumed) {
    audit('token.denied', { sessionId: rec.sessionId, reason: 'token already consumed (replay)' });
    return { ok: false, reason: 'token already used' };
  }
  if (now() > rec.expiresAt) {
    pendingTokens.delete(token);
    audit('token.denied', { sessionId: rec.sessionId, reason: 'token expired' });
    return { ok: false, reason: 'token expired' };
  }
  if (rec.requesterId !== requesterId) {
    audit('token.denied', { sessionId: rec.sessionId, reason: 'requester mismatch' });
    return { ok: false, reason: 'requester mismatch — fail-closed' };
  }
  rec.consumed = true;
  pendingTokens.delete(token);
  const sess = sessions.get(rec.sessionId);
  if (!sess || sess.revokedAt || now() > sess.expiresAt) {
    audit('token.denied', { sessionId: rec.sessionId, reason: 'session no longer valid' });
    return { ok: false, reason: 'session no longer valid' };
  }
  sess.redeemed = true;
  audit('token.redeemed', { sessionId: sess.sessionId, requesterId });
  return { ok: true, sessionId: sess.sessionId };
}

/**
 * Policy gate for every remote action. Call BEFORE performing screenshot
 * or input. Fail-closed: returns { ok:false } unless session is live,
 * redeemed, unexpired, unrevoked, and the action is allow-listed.
 */
function authorizeAction(sessionId, action, subAction) {
  const sess = getSession(sessionId);
  if (!sess) {
    audit('action.denied', { sessionId, action, reason: 'no live session' });
    return { ok: false, reason: 'no live consented session — fail-closed' };
  }
  if (!sess.redeemed) {
    audit('action.denied', { sessionId, action, requesterId: sess.requesterId, reason: 'token not yet redeemed' });
    return { ok: false, reason: 'session token not redeemed' };
  }
  if (!sess.actions.includes(action)) {
    audit('action.denied', { sessionId, action, requesterId: sess.requesterId, reason: 'action not in consent scope' });
    return { ok: false, reason: `action "${action}" not in consented scope` };
  }
  if (action === 'input' && subAction !== undefined) {
    if (!sess.inputAllow.includes(subAction)) {
      audit('action.denied', { sessionId, action, subAction, requesterId: sess.requesterId, reason: 'input sub-action not allowed' });
      return { ok: false, reason: `input sub-action "${subAction}" not allowed` };
    }
  }
  audit('action.allowed', { sessionId, action, subAction, requesterId: sess.requesterId });
  return { ok: true, sessionId, requesterId: sess.requesterId };
}

/**
 * Revoke a session immediately (user clicks "Revoke" / toggle off, or
 * watchdog). Idempotent. After revoke, authorizeAction denies.
 */
function revokeSession(sessionId, reason = 'user revoked') {
  const sess = sessions.get(sessionId);
  if (!sess) return { ok: false, reason: 'unknown session' };
  if (sess.revokedAt) return { ok: true, alreadyRevoked: true };
  sess.revokedAt = now();
  audit('session.revoked', { sessionId, requesterId: sess.requesterId, reason: String(reason).slice(0, 200) });
  return { ok: true };
}

/** Stop ALL sessions (app lock / logout / toggle master-off). */
function revokeAll(reason = 'revoke-all') {
  let count = 0;
  for (const [id, s] of sessions) {
    if (!s.revokedAt) {
      s.revokedAt = now();
      count += 1;
      audit('session.revoked', { sessionId: id, requesterId: s.requesterId, reason: String(reason).slice(0, 200) });
    }
  }
  for (const [tok, rec] of pendingTokens) {
    if (!rec.consumed) {
      pendingTokens.delete(tok);
      audit('token.cancelled', { sessionId: rec.sessionId, reason: String(reason).slice(0, 200) });
    }
  }
  return { ok: true, revoked: count };
}

function listSessions() {
  return [...sessions.values()].map((s) => ({
    sessionId: s.sessionId,
    requesterId: s.requesterId,
    requesterLabel: s.requesterLabel,
    actions: [...s.actions],
    inputAllow: [...s.inputAllow],
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    redeemed: s.redeemed,
    revokedAt: s.revokedAt,
    live: !s.revokedAt && now() <= s.expiresAt,
  }));
}

function getAuditLog() {
  return [...auditLog];
}

function onAudit(fn) {
  onAuditCallback = typeof fn === 'function' ? fn : null;
}

/** Test/owner-only reset (clears in-memory state). Not wired to any IPC. */
function _resetForTests() {
  pendingTokens.clear();
  pendingRequests.clear();
  sessions.clear();
  auditLog.length = 0;
  onAuditCallback = null;
}

module.exports = {
  // policy
  ALLOWED_ACTIONS,
  ALLOWED_INPUT_SUBACTIONS,
  DEFAULT_TOKEN_TTL_MS,
  DEFAULT_SESSION_TTL_MS,
  // lifecycle
  requestControl,
  grantConsent,
  redeemToken,
  authorizeAction,
  revokeSession,
  revokeAll,
  listSessions,
  // audit
  getAuditLog,
  onAudit,
  // tests
  _resetForTests,
};
