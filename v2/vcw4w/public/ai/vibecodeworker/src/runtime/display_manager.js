/**
 * Display Manager: full-HD dashboard/game windows + smart game framing.
 *
 * Two jobs:
 *  1. Display modes (windowed / fullscreen dashboard, windowed / fullscreen
 *     separate game window) — seeded by CLI flags (--window-size,
 *     --fullscreen, --display-mode, --game-window-size, --game-fullscreen)
 *     and switchable at runtime by the operator OR the runner brain via
 *     window.setDisplayMode() -> 'set-display-mode' IPC.
 *  2. ensureGameVisible(): the "AI sees a sliver" fix. The agent's eyes are
 *     a capturePage of the visible webview region, so this finds the real
 *     play area inside the guest page (known game-root ids, the button
 *     cluster that forms the playfield, or the largest gameplay canvas) and
 *     scrolls it to the centre of the guest viewport. Returns metrics the
 *     runner brain can read via window.getGameViewMetrics().
 */
let ipc = null;
try {
  ipc = require('electron').ipcRenderer;
} catch (_) {
  ipc = null; // plain-node (unit tests): pure helpers below still work.
}

const HD_WIDTH = 1920;
const HD_HEIGHT = 1080;

// Pure: builds the guest-side framing script. Kept string-only (no Electron)
// so unit tests can assert on its behaviour contract.
function buildEnsureVisibleScript() {
  return `(() => {
    const vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    const inRange = (r) => r && r.width > 40 && r.height > 40
      && r.bottom > -vh && r.right > -vw && r.top < vh * 3 && r.left < vw * 3;
    const rectOf = (el) => { try { return el.getBoundingClientRect(); } catch (e) { return null; } };
    const isBgCanvas = (el, r) => {
      if (!el || el.tagName !== 'CANVAS' || !r) return false;
      let cs = null;
      try { cs = window.getComputedStyle(el); } catch (e) { return false; }
      return cs && cs.position === 'fixed' && r.width >= vw * 0.95 && r.height >= vh * 0.95;
    };
    const cands = [];
    const consider = (kind, el, boost) => {
      const r = el ? rectOf(el) : null;
      if (!el || !inRange(r)) return;
      if (kind === 'canvas' && isBgCanvas(el, r)) return; // fullscreen fx layer, not the game
      cands.push({ kind, el, area: r.width * r.height, score: r.width * r.height * (boost || 1), rect: r });
    };
    // 1. Known game-root ids (game authors put the playfield here).
    ['game-root','game-board','game','game-container','board','play-area','app'].forEach((id) => {
      try {
        const el = document.getElementById(id);
        if (el) consider('game-root', el, id === 'game-root' || id === 'game-board' ? 2 : 1.4);
      } catch (e) {}
    });
    // 2. The interactive cluster: the union box of visible buttons/links.
    //    (e.g. a whack-a-mole hole grid is 60 buttons — its union IS the playfield.)
    try {
      const clickables = Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .map(rectOf).filter(inRange);
      if (clickables.length >= 2) {
        const u = clickables.reduce((a, r) => ({
          left: Math.min(a.left, r.left), top: Math.min(a.top, r.top),
          right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom)
        }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
        const w = u.right - u.left, h = u.bottom - u.top;
        if (w > 60 && h > 60) {
          cands.push({ kind: 'button-cluster', el: null, area: w * h, score: w * h * 1.5,
            rect: { left: u.left, top: u.top, width: w, height: h }, count: clickables.length });
        }
      }
    } catch (e) {}
    // 3. Largest gameplay canvas.
    try {
      Array.from(document.querySelectorAll('canvas')).forEach((c) => consider('canvas', c, 1));
    } catch (e) {}
    cands.sort((a, b) => b.score - a.score);
    const best = cands[0] || null;
    const out = { ok: true, guestW: vw, guestH: vh,
      scrollX: window.scrollX || 0, scrollY: window.scrollY || 0,
      scrolled: false, method: 'none', play: null, kind: null };
    const centerRect = (r) => {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const wantX = cx - vw / 2, wantY = cy - vh / 2;
      if (Math.abs(wantX - out.scrollX) > 8 || Math.abs(wantY - out.scrollY) > 8) {
        window.scrollTo(Math.max(0, Math.round(wantX)), Math.max(0, Math.round(wantY)));
        out.scrolled = true;
      }
    };
    if (best && best.el) {
      const r = rectOf(best.el);
      const fullyVisible = r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;
      out.method = fullyVisible ? 'already-visible' : 'scrollIntoView';
      if (!fullyVisible) {
        try { best.el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); out.scrolled = true; }
        catch (e) { centerRect(r); out.method = 'scrollTo'; }
      }
      const r2 = rectOf(best.el);
      out.kind = best.kind;
      out.play = { x: Math.round(r2.left), y: Math.round(r2.top),
        width: Math.round(r2.width), height: Math.round(r2.height) };
    } else if (best && best.kind === 'button-cluster') {
      out.method = 'cluster-scroll';
      centerRect({ left: best.rect.left, top: best.rect.top, width: best.rect.width, height: best.rect.height });
      out.kind = 'button-cluster(' + (best.count || 0) + ')';
      out.play = { x: Math.round(best.rect.left), y: Math.round(best.rect.top),
        width: Math.round(best.rect.width), height: Math.round(best.rect.height) };
    } else {
      // Last resort: middle of the page (long single-column game pages).
      const max = Math.max(0, (document.documentElement.scrollHeight || vh) - vh);
      window.scrollTo(0, Math.round(max / 2));
      out.method = 'page-center';
      out.scrolled = true;
    }
    out.scrollX = window.scrollX || 0;
    out.scrollY = window.scrollY || 0;
    return out;
  })()`;
}

function currentMetrics() {
  try {
    if (typeof window !== 'undefined' && window.__gameViewMetrics) return window.__gameViewMetrics;
  } catch (_) {}
  return null;
}

function rememberMetrics(m) {
  try {
    if (typeof window !== 'undefined' && m && typeof m === 'object') window.__gameViewMetrics = m;
  } catch (_) {}
  return m;
}

async function getDisplayConfig() {
  if (ipc && typeof ipc.invoke === 'function') {
    try {
      const cfg = await ipc.invoke('get-display-config');
      if (cfg && typeof cfg === 'object') return cfg;
    } catch (_) {}
  }
  return { mode: 'windowed', width: HD_WIDTH, height: HD_HEIGHT, fullscreen: false, gameWindowActive: false, gameWindow: null };
}

// Ask the main process to switch the dashboard / game window between
// windowed and fullscreen (or an explicit HD size). Callable by the
// operator (viewport toolbar) and by the runner brain:
//   await window.setDisplayMode('fullscreen')
//   await window.setDisplayMode('game-focus')     // webview takes the dashboard
//   await window.setDisplayMode('game-fullscreen')
//   await window.setDisplayMode('windowed', { width: 1920, height: 1080 })
async function setDisplayMode(mode, opts = {}) {
  const m = String(mode || 'windowed').toLowerCase();
  try {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('game-focus', m === 'game-focus');
    }
  } catch (_) {}
  if (m === 'game-focus') return { success: true, mode: 'game-focus' };
  if (ipc && typeof ipc.invoke === 'function') {
    try {
      return await ipc.invoke('set-display-mode', { mode: m, ...(opts || {}) });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'No main-process bridge available' };
}

// Centre the real play area in the guest viewport so the agent's next
// screenshot shows the GAME, not the page header. Best-effort: never throws.
async function ensureGameVisible(deps = {}) {
  const doc = (typeof document !== 'undefined') ? document : null;
  const webview = deps.webviewElement || (doc ? doc.getElementById('game-webview') : null);
  const log = typeof deps.log === 'function' ? deps.log : null;
  if (ipc && typeof ipc.invoke === 'function') {
    try {
      if (await ipc.invoke('is-game-window-active')) {
        let focus = null;
        try { focus = await ipc.invoke('focus-game-window'); } catch (_) {}
        const m = { target: 'game-window', ok: true, method: 'focus', ...(focus || {}) };
        if (log) log(`Game view: separate test window focused${m.width ? ` (${m.width}x${m.height})` : ''}.`);
        return rememberMetrics(m);
      }
    } catch (_) { /* embedded webview path below */ }
  }
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return rememberMetrics({ target: 'none', ok: false, error: 'No game viewport loaded' });
  }
  try {
    const exec = (deps.gameController && typeof deps.gameController.executeJS === 'function')
      ? (code) => deps.gameController.executeJS(webview, code)
      : (code) => webview.executeJavaScript(code);
    const m = await exec(buildEnsureVisibleScript());
    let webviewRect = null;
    try {
      const r = webview.getBoundingClientRect();
      if (r) webviewRect = { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    } catch (_) {}
    const metrics = { target: 'webview', ok: !!(m && m.ok), ...(m || {}), webviewRect };
    // The guest viewport resizes a frame behind the webview element (e.g.
    // right after game-focus mode grows it). If the webview rect moved, give
    // Chromium a beat and re-read the true guest size so the readout and the
    // runner brain never report a stale sliver.
    try {
      const prev = currentMetrics();
      const prevH = prev && prev.webviewRect ? prev.webviewRect.height : 0;
      if (metrics.ok && prevH && webviewRect && Math.abs(webviewRect.height - prevH) > 50) {
        await new Promise((r) => setTimeout(r, 250));
        const fresh = await exec('({ w: window.innerWidth || 0, h: window.innerHeight || 0, sx: window.scrollX || 0, sy: window.scrollY || 0 })');
        if (fresh && fresh.w > 0 && fresh.h > 0) {
          metrics.guestW = fresh.w;
          metrics.guestH = fresh.h;
          metrics.scrollX = fresh.sx;
          metrics.scrollY = fresh.sy;
          metrics.resized = true;
        }
      }
    } catch (_) { /* stale metrics are still usable */ }
    if (log && metrics.ok) {
      const play = metrics.play ? `${metrics.play.width}x${metrics.play.height} (${metrics.kind})` : 'n/a';
      log(`Game view: guest ${metrics.guestW}x${metrics.guestH}, play area ${play}, ${metrics.scrolled ? 'centered' : 'already centered'} (${metrics.method}).`);
    }
    return rememberMetrics(metrics);
  } catch (e) {
    return rememberMetrics({ target: 'webview', ok: false, error: String((e && e.message) || e) });
  }
}

module.exports = {
  HD_WIDTH,
  HD_HEIGHT,
  buildEnsureVisibleScript,
  getDisplayConfig,
  setDisplayMode,
  ensureGameVisible,
  currentMetrics
};
