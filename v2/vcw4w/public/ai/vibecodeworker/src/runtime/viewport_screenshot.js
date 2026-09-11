/**
 * Viewport Screenshot Utility for Internal & External Windows
 *
 * Foveated mode: one small overview frame + up to 3 tiny high-detail crops
 * (the model steers the crops via "focus" rects — e.g. the FPS crosshair
 * zone). Small crops cost a fraction of full-frame tokens, so decisions and
 * follow-up inputs stay fast.
 */
const { ipcRenderer } = require('electron');

let fovea = null;
try {
  fovea = require('../../lib/brain/foveated_vision');
} catch (_) {
  fovea = null;
}

const OVERVIEW_DEFAULT_WIDTH = 512;
const DETAIL_DEFAULT_WIDTH = 256;

function sanitizeRects(rects) {
  if (!fovea || !Array.isArray(rects)) return [];
  try {
    return fovea.sanitizeFocusRequests(rects, fovea.MAX_DETAILS);
  } catch (_) {
    return [];
  }
}

function rectToPixels(rect, imgW, imgH) {
  const w = Math.max(1, Math.round((rect.w / 1000) * imgW));
  const h = Math.max(1, Math.round((rect.h / 1000) * imgH));
  const x = Math.min(Math.max(0, Math.round((rect.x / 1000) * imgW)), Math.max(0, imgW - w));
  const y = Math.min(Math.max(0, Math.round((rect.y / 1000) * imgH)), Math.max(0, imgH - h));
  return { x, y, width: w, height: h };
}

function cropDetailsFromNativeImage(img, rects, detailWidth = DETAIL_DEFAULT_WIDTH, detailQuality = 60) {
  const out = [];
  if (!img || typeof img.crop !== 'function' || typeof img.getSize !== 'function') return out;
  let size = { width: 0, height: 0 };
  try {
    size = img.getSize();
  } catch (_) {
    return out;
  }
  if (!size.width || !size.height) return out;
  for (const rect of sanitizeRects(rects)) {
    try {
      const box = rectToPixels(rect, size.width, size.height);
      if (box.width < 8 || box.height < 8) continue;
      const cropped = img.crop(box);
      const resized = cropped.resize({ width: Math.min(detailWidth, box.width) });
      out.push({
        label: rect.label || 'detail',
        rect,
        base64: resized.toJPEG(detailQuality).toString('base64'),
      });
    } catch (_) {
      // One bad crop never kills the tick.
    }
  }
  return out;
}

async function captureOverviewBase64(nativeProcessSelect, webviewElement, overviewWidth, overviewQuality) {
  const width = Math.max(256, Math.min(768, Math.round(Number(overviewWidth) || OVERVIEW_DEFAULT_WIDTH)));
  const quality = Math.max(30, Math.min(80, Math.round(Number(overviewQuality) || 50)));
  const nativeProcess = nativeProcessSelect ? nativeProcessSelect.value : null;
  if (nativeProcess) {
    // Native/game-window captures arrive as base64 only (main process owns
    // the pixels), so detail crops are unavailable on this path — overview
    // only. Webview ticks get the full overview + crops treatment.
    const nativeShot = await ipcRenderer.invoke('capture-native-screenshot', nativeProcess);
    if (nativeShot.success) {
      return { base64: nativeShot.base64, cropSource: null, note: 'native-overview-only' };
    }
    return { base64: null, cropSource: null, note: 'native-failed' };
  }

  const { ipcRenderer: ipc } = require('electron');
  const isGameWindowActive = await ipc.invoke('is-game-window-active');
  if (isGameWindowActive) {
    try {
      const shot = await ipc.invoke('capture-game-screenshot');
      return { base64: shot || null, cropSource: null, note: 'game-window-overview-only' };
    } catch (e) {
      console.warn("Failed to capture separate game window", e);
    }
  }

  if (webviewElement) {
    try {
      const img = await webviewElement.capturePage();
      const resized = img.resize({ width });
      return { base64: resized.toJPEG(quality).toString('base64'), cropSource: img, note: 'webview' };
    } catch (e) {
      console.warn("Failed to capture webview page", e);
    }
  }
  return { base64: null, cropSource: null, note: 'no-source' };
}

async function captureViewportScreenshot(nativeProcessSelect, webviewElement) {
  const { base64 } = await captureOverviewBase64(
    nativeProcessSelect, webviewElement, OVERVIEW_DEFAULT_WIDTH, 50
  );
  return base64;
}

/**
 * Capture a foveated frame: small overview + tiny detail crops.
 * opts: { rects, overviewWidth, overviewQuality, detailWidth, detailQuality }
 * Always resolves (never throws): { overview, details, meta }.
 */
async function captureFoveatedFrame(nativeProcessSelect, webviewElement, opts = {}) {
  const rects = sanitizeRects(opts.rects || []);
  const overviewWidth = opts.overviewWidth || OVERVIEW_DEFAULT_WIDTH;
  const overviewQuality = opts.overviewQuality || 50;
  const detailWidth = opts.detailWidth || DETAIL_DEFAULT_WIDTH;
  const detailQuality = opts.detailQuality || 60;
  try {
    const { base64, cropSource, note } = await captureOverviewBase64(
      nativeProcessSelect, webviewElement, overviewWidth, overviewQuality
    );
    const details = cropSource ? cropDetailsFromNativeImage(cropSource, rects, detailWidth, detailQuality) : [];
    return {
      overview: base64,
      details,
      meta: {
        source: note,
        overviewWidth,
        detailWidth,
        requested: rects.length,
        details: details.map((d) => ({ label: d.label, rect: d.rect })),
      },
    };
  } catch (e) {
    console.warn('Foveated capture failed, falling back to overview', e);
    return { overview: null, details: [], meta: { source: 'error', requested: rects.length, details: [] } };
  }
}

module.exports = {
  captureViewportScreenshot,
  captureFoveatedFrame,
  // Test seams (pure, no Electron pixels needed for rect math).
  rectToPixels,
  sanitizeRects,
};
