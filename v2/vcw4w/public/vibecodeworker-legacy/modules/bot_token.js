/* ==========================================================================
   4WEIRD VIBECODEWORKER // BOT API TOKEN (4weird bot key)
   --------------------------------------------------------------------------
   - Lets the operator paste a `bot4weird_...` key (generated once at
     https://4weird.games/bot/setup) so the desktop app can act as their bot.
   - Tauri runtime: the secret is stored in a local-only OS app-data file
     via the Rust `save_bot_token` / `get_bot_token` / `clear_bot_token`
     commands — never logged, never rendered back.
   - Plain browser fallback: sessionStorage `vcw_bot_token` (tab-scoped, so
     the bearer credential never persists in the profile and any XSS has a
     smaller window than localStorage).
   - VERIFY performs a live read-only check: GET /api/bot/me with the
     `x-bot-key` header and shows the linked username / human_id / scopes.
   ========================================================================== */

import { el, synth, isTauriRuntime, invokeTauriCommand } from './core_state.js';
import { log } from './telemetry_logger.js';

export const BOT_KEY_RE = /^bot4weird_[A-Za-z0-9]{20}$/;
export const BOT_API_BASE = 'https://4weird.games';
const BOT_TOKEN_LS_KEY = 'vcw_bot_token';

export function isBotKeyShape(value) {
  return BOT_KEY_RE.test(String(value || '').trim());
}

function maskToken(token) {
  const t = String(token || '');
  if (t.length < 8) return '••••';
  return `${t.slice(0, 10)}…${t.slice(-4)}`;
}

function setStatus(message, kind) {
  if (!el.botTokenStatus) return;
  el.botTokenStatus.textContent = message;
  el.botTokenStatus.dataset.kind = kind || 'info';
}

async function readStoredToken() {
  if (isTauriRuntime()) {
    try {
      const token = await invokeTauriCommand('get_bot_token');
      if (typeof token === 'string' && isBotKeyShape(token)) return token;
    } catch (e) { /* none stored — fall through */ }
    return '';
  }
  try {
    const token = window.sessionStorage.getItem(BOT_TOKEN_LS_KEY) || window.localStorage.getItem(BOT_TOKEN_LS_KEY) || '';
    // One-time migration: drop any legacy persistent copy.
    try { window.localStorage.removeItem(BOT_TOKEN_LS_KEY); } catch (e) { /* ignore */ }
    return isBotKeyShape(token) ? token : '';
  } catch (e) {
    return '';
  }
}

/** Resolve the stored bot token for other modules ('' when none). */
export async function getBotToken() {
  return readStoredToken();
}

async function refreshTokenBadge() {
  let configured = false;
  if (isTauriRuntime()) {
    try {
      const status = await invokeTauriCommand('get_bot_token_status');
      configured = !!(status && status.configured);
    } catch (e) { configured = false; }
  } else {
    configured = (await readStoredToken()) !== '';
  }
  if (el.btnBotToken) el.btnBotToken.textContent = configured ? 'BOT: ON' : 'BOT TOKEN';
  return configured;
}

export function openBotTokenDrawer() {
  synth.playClick();
  if (!el.botTokenDrawer) return;
  el.botTokenDrawer.classList.remove('hidden');
  void refreshTokenBadge().then((configured) => {
    if (configured) setStatus('A bot token is stored. VERIFY checks it live, CLEAR removes it.', 'ok');
    else setStatus('No bot token stored. Generate one at 4weird.games/bot/setup, then paste it below.', 'info');
  });
}

async function saveBotTokenFromInput() {
  synth.playClick();
  const raw = el.botTokenInput ? el.botTokenInput.value : '';
  const token = String(raw || '').trim();
  if (!isBotKeyShape(token)) {
    setStatus('That does not look like a 4weird bot key (bot4weird_ + 20 letters/digits).', 'error');
    synth.playFail();
    return;
  }
  try {
    if (isTauriRuntime()) {
      const res = await invokeTauriCommand('save_bot_token', { token });
      if (!res || res.success === false) throw new Error('Desktop refused the token.');
    } else {
      window.sessionStorage.setItem(BOT_TOKEN_LS_KEY, token);
      try { window.localStorage.removeItem(BOT_TOKEN_LS_KEY); } catch (e) { /* ignore */ }
    }
    if (el.botTokenInput) el.botTokenInput.value = '';
    setStatus(`Saved ${maskToken(token)} locally. VERIFY checks it against 4weird.games.`, 'ok');
    synth.playSuccess();
    log('[BOT TOKEN] Bot API token saved locally (secret never logged).', 'success');
  } catch (e) {
    setStatus(`Save failed: ${(e && e.message) || e}`, 'error');
    synth.playFail();
  }
  void refreshTokenBadge();
}

async function verifyBotToken() {
  synth.playClick();
  const token = (el.botTokenInput && el.botTokenInput.value.trim()) || (await readStoredToken());
  if (!isBotKeyShape(token)) {
    setStatus('Paste a bot key first, or save one and VERIFY the stored token.', 'error');
    synth.playFail();
    return;
  }
  setStatus('Checking the token against 4weird.games…', 'info');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${BOT_API_BASE}/api/bot/me`, {
      headers: { 'x-bot-key': token },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await res.json().catch(() => ({}));
    if (res.ok && body && body.success) {
      const who = body.username ? `@${body.username}` : (body.human_id || 'valid key');
      const scopes = Array.isArray(body.scopes) ? body.scopes.join(', ') : '';
      setStatus(`Verified live: ${who}${scopes ? ` — scopes: ${scopes}` : ''}`, 'ok');
      if (el.botTokenIdentity) {
        el.botTokenIdentity.textContent = `Linked identity: ${who}${body.human_id ? ` (${body.human_id})` : ''}`;
      }
      synth.playSuccess();
      log(`[BOT TOKEN] Verified live as ${who}.`, 'success');
    } else {
      setStatus(`Rejected (${res.status}): ${(body && body.error) || 'invalid key.'}`, 'error');
      synth.playFail();
    }
  } catch (e) {
    setStatus('Verify failed: could not reach 4weird.games.', 'error');
    synth.playFail();
  }
}

async function clearBotToken() {
  synth.playClick();
  try {
    if (isTauriRuntime()) {
      await invokeTauriCommand('clear_bot_token');
    } else {
      window.sessionStorage.removeItem(BOT_TOKEN_LS_KEY);
      try { window.localStorage.removeItem(BOT_TOKEN_LS_KEY); } catch (e) { /* ignore */ }
    }
    if (el.botTokenInput) el.botTokenInput.value = '';
    if (el.botTokenIdentity) el.botTokenIdentity.textContent = '';
    setStatus('Bot token removed from this machine.', 'info');
    synth.playSuccess();
    log('[BOT TOKEN] Stored bot token cleared.', 'warning');
  } catch (e) {
    setStatus(`Clear failed: ${(e && e.message) || e}`, 'error');
  }
  void refreshTokenBadge();
}

export function initBotToken() {
  if (el.btnBotToken) el.btnBotToken.addEventListener('click', openBotTokenDrawer);
  if (el.btnCloseBotDrawer && el.botTokenDrawer) {
    el.btnCloseBotDrawer.addEventListener('click', () => el.botTokenDrawer.classList.add('hidden'));
  }
  if (el.btnSaveBotToken) el.btnSaveBotToken.addEventListener('click', () => { saveBotTokenFromInput(); });
  if (el.btnVerifyBotToken) el.btnVerifyBotToken.addEventListener('click', () => { verifyBotToken(); });
  if (el.btnClearBotToken) el.btnClearBotToken.addEventListener('click', () => { clearBotToken(); });
  void refreshTokenBadge();
}
