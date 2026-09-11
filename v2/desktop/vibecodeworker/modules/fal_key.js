/* ==========================================================================
   4WEIRD VIBECODEWORKER // fal.ai API KEY
   --------------------------------------------------------------------------
   - Lets the operator paste a fal.ai key (from https://fal.ai/dashboard/keys)
     so the desktop app can queue real fal.ai media runs straight from the hub.
   - Tauri runtime: the secret is stored in a local-only OS app-data file
     via the Rust `save_fal_key` / `get_fal_key` / `clear_fal_key`
     commands; never logged, never rendered back.
   - Plain browser fallback: localStorage `vcw_fal_key` (same shape key).
   - VERIFY is FREE: it polls a nil-UUID queue status with the key. A valid
     key answers 404 (no such request); 401/403 means the key is bad. No
     model ever runs, so $0.00 is spent.
   - CHEAP TEST spends real money on purpose: one 512px FLUX schnell image
     (fal's cheapest image tier, fractions of a cent), polled to completion
     and rendered inline. One click, one image, then it stops.
   ========================================================================== */

import { el, synth, isTauriRuntime, invokeTauriCommand } from './core_state.js';
import { log } from './telemetry_logger.js';

export const FAL_QUEUE_BASE = 'https://queue.fal.run';
export const FAL_CHEAP_MODEL = 'fal-ai/flux/schnell';
const FAL_KEY_LS_KEY = 'vcw_fal_key';
const NIL_REQUEST_ID = '00000000-0000-0000-0000-000000000000';

export function isFalKeyShape(value) {
  const t = String(value || '').trim();
  if (t.length < 8 || t.length > 512) return false;
  return !/(your-|paste|example|placeholder|xxx|\*\*\*\*|key-here)/i.test(t);
}

function maskKey(key) {
  const t = String(key || '');
  if (t.length < 8) return '••••';
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function setStatus(message, kind) {
  if (!el.falKeyStatus) return;
  el.falKeyStatus.textContent = message;
  el.falKeyStatus.dataset.kind = kind || 'info';
}

function setPreview(html) {
  if (!el.falKeyPreview) return;
  el.falKeyPreview.innerHTML = html;
}

async function readStoredKey() {
  if (isTauriRuntime()) {
    try {
      const key = await invokeTauriCommand('get_fal_key');
      if (typeof key === 'string' && isFalKeyShape(key)) return key.trim();
    } catch (e) { /* none stored; fall through */ }
    return '';
  }
  try {
    const key = window.localStorage.getItem(FAL_KEY_LS_KEY) || '';
    return isFalKeyShape(key) ? key.trim() : '';
  } catch (e) {
    return '';
  }
}

/** Resolve the stored fal key for other modules ('' when none). */
export async function getFalKey() {
  return readStoredKey();
}

async function refreshKeyBadge() {
  let configured = false;
  if (isTauriRuntime()) {
    try {
      const status = await invokeTauriCommand('get_fal_key_status');
      configured = !!(status && status.configured);
    } catch (e) { configured = false; }
  } else {
    configured = (await readStoredKey()) !== '';
  }
  if (el.btnFalKey) el.btnFalKey.textContent = configured ? 'FAL: ON' : 'FAL KEY';
  return configured;
}

export function openFalKeyDrawer() {
  synth.playClick();
  if (!el.falKeyDrawer) return;
  el.falKeyDrawer.classList.remove('hidden');
  void refreshKeyBadge().then((configured) => {
    if (configured) setStatus('A fal.ai key is stored. VERIFY is free; CHEAP TEST renders one tiny image.', 'ok');
    else setStatus('No fal.ai key stored. Grab one at fal.ai/dashboard/keys, then paste it below.', 'info');
  });
}

async function saveFalKeyFromInput() {
  synth.playClick();
  const raw = el.falKeyInput ? el.falKeyInput.value : '';
  const key = String(raw || '').trim();
  if (!isFalKeyShape(key)) {
    setStatus('That does not look like a fal.ai key; paste the real key from fal.ai/dashboard/keys.', 'error');
    synth.playFail();
    return;
  }
  try {
    if (isTauriRuntime()) {
      const res = await invokeTauriCommand('save_fal_key', { key });
      if (!res || res.success === false) throw new Error('Desktop refused the key.');
    } else {
      window.localStorage.setItem(FAL_KEY_LS_KEY, key);
    }
    if (el.falKeyInput) el.falKeyInput.value = '';
    setStatus(`Saved ${maskKey(key)} locally. VERIFY checks it for $0.00.`, 'ok');
    synth.playSuccess();
    log('[FAL KEY] fal.ai key saved locally (secret never logged).', 'success');
  } catch (e) {
    setStatus(`Save failed: ${(e && e.message) || e}`, 'error');
    synth.playFail();
  }
  void refreshKeyBadge();
}

/** FREE key check: a nil-UUID status poll. 401/403 = bad key, anything else = accepted. */
async function verifyFalKey() {
  synth.playClick();
  const key = (el.falKeyInput && el.falKeyInput.value.trim()) || (await readStoredKey());
  if (!isFalKeyShape(key)) {
    setStatus('Paste a fal.ai key first, or save one and VERIFY the stored key.', 'error');
    synth.playFail();
    return;
  }
  setStatus('Checking the key against queue.fal.run (free probe, nothing runs)…', 'info');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${FAL_QUEUE_BASE}/${FAL_CHEAP_MODEL}/requests/${NIL_REQUEST_ID}/status`, {
      headers: { Authorization: `Key ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.status === 401 || res.status === 403) {
      setStatus(`Rejected (${res.status}): bad key. Nothing was spent.`, 'error');
      synth.playFail();
    } else {
      setStatus(`Key accepted (probe answered ${res.status}, expected 404 for a fake id). $0.00 spent.`, 'ok');
      synth.playSuccess();
      log('[FAL KEY] Verified live against the fal queue (free probe).', 'success');
    }
  } catch (e) {
    setStatus('Verify failed: could not reach queue.fal.run.', 'error');
    synth.playFail();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * CHEAP TEST: one 512px FLUX schnell image, polled to completion, rendered
 * inline. This is the cheapest real fal call in the drawer; fractions of a
 * cent; and it stops after one image.
 */
async function cheapTestFal() {
  synth.playClick();
  const key = (el.falKeyInput && el.falKeyInput.value.trim()) || (await readStoredKey());
  if (!isFalKeyShape(key)) {
    setStatus('Paste a fal.ai key first - CHEAP TEST spends a fraction of a cent.', 'error');
    synth.playFail();
    return;
  }
  const prompt = (el.falTestPrompt && el.falTestPrompt.value.trim()) || 'a tiny neon arcade cabinet, pixel sticker';
  setStatus('Queuing one 512px FLUX schnell image (cheapest tier)…', 'info');
  setPreview('');
  try {
    const submit = await fetch(`${FAL_QUEUE_BASE}/${FAL_CHEAP_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_size: { width: 512, height: 512 },
        num_inference_steps: 4,
        num_images: 1,
        output_format: 'png',
      }),
    });
    if (submit.status === 401 || submit.status === 403) {
      setStatus(`Rejected (${submit.status}): bad key. Nothing was spent.`, 'error');
      synth.playFail();
      return;
    }
    if (!submit.ok) throw new Error(`queue answered ${submit.status}`);
    const queued = await submit.json();
    const requestId = String(queued.request_id || queued.requestId || '');
    if (!requestId) throw new Error('queue returned no request id');
    setStatus(`Queued ${requestId}; polling for the image…`, 'info');
    const deadline = Date.now() + 180000;
    for (;;) {
      await sleep(4000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      let statusBody = {};
      try {
        const s = await fetch(`${FAL_QUEUE_BASE}/${FAL_CHEAP_MODEL}/requests/${requestId}/status`, {
          headers: { Authorization: `Key ${key}` },
          signal: controller.signal,
        });
        statusBody = await s.json().catch(() => ({}));
      } finally {
        clearTimeout(timeoutId);
      }
      const st = String(statusBody.status || '').toUpperCase();
      if (st === 'COMPLETED') break;
      if (st === 'FAILED' || st === 'CANCELLED') throw new Error(`run ${st.toLowerCase()}`);
      if (Date.now() > deadline) throw new Error('timed out waiting (3 min); check fal.ai/dashboard');
      setStatus(`Queued ${requestId}; status: ${st || 'working'}…`, 'info');
    }
    const r = await fetch(`${FAL_QUEUE_BASE}/${FAL_CHEAP_MODEL}/requests/${requestId}`, {
      headers: { Authorization: `Key ${key}` },
    });
    if (!r.ok) throw new Error(`result fetch answered ${r.status}`);
    const result = await r.json();
    const images = Array.isArray(result.images) ? result.images : [];
    const url = images.length && images[0].url ? String(images[0].url) : '';
    if (!url) throw new Error('run finished but returned no image url');
    setPreview(`<a href="${url}" target="_blank" rel="noreferrer"><img src="${url}" alt="fal.ai cheap test render" style="max-width:100%;border-radius:8px"></a>`);
    setStatus(`Done; one 512px image for fractions of a cent. Billed by fal.ai, 4weird coins untouched.`, 'ok');
    synth.playSuccess();
    log('[FAL KEY] Cheap test render completed (1 image, cheapest tier).', 'success');
  } catch (e) {
    setStatus(`Cheap test failed: ${(e && e.message) || e}`, 'error');
    synth.playFail();
  }
}

async function clearFalKey() {
  synth.playClick();
  try {
    if (isTauriRuntime()) {
      await invokeTauriCommand('clear_fal_key');
    } else {
      window.localStorage.removeItem(FAL_KEY_LS_KEY);
    }
    if (el.falKeyInput) el.falKeyInput.value = '';
    setPreview('');
    setStatus('fal.ai key removed from this machine.', 'info');
    synth.playSuccess();
    log('[FAL KEY] Stored fal.ai key cleared.', 'warning');
  } catch (e) {
    setStatus(`Clear failed: ${(e && e.message) || e}`, 'error');
  }
  void refreshKeyBadge();
}

export function initFalKey() {
  if (el.btnFalKey) el.btnFalKey.addEventListener('click', openFalKeyDrawer);
  if (el.btnCloseFalDrawer && el.falKeyDrawer) {
    el.btnCloseFalDrawer.addEventListener('click', () => el.falKeyDrawer.classList.add('hidden'));
  }
  if (el.btnSaveFalKey) el.btnSaveFalKey.addEventListener('click', () => { saveFalKeyFromInput(); });
  if (el.btnVerifyFalKey) el.btnVerifyFalKey.addEventListener('click', () => { verifyFalKey(); });
  if (el.btnCheapTestFalKey) el.btnCheapTestFalKey.addEventListener('click', () => { cheapTestFal(); });
  if (el.btnClearFalKey) el.btnClearFalKey.addEventListener('click', () => { clearFalKey(); });
  void refreshKeyBadge();
}
