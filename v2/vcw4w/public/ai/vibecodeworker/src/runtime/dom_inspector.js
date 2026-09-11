/**
 * Viewport DOM and Performance Metrics Inspector
 * Optimized: targeted selectors instead of querySelectorAll('*'), single
 * getComputedStyle per element, early exit after 40 hits.
 */

async function getInteractiveDOM(controller, webview) {
  const code = `
    (() => {
      const out = [];
      // Targeted selectors cover buttons/links/inputs + ARIA buttons.
      // The old '*' scan + double getComputedStyle was O(N) over the whole
      // DOM on every agent step (seconds on large pages).
      const candidates = document.querySelectorAll(
        'button, a, input, select, textarea, canvas, [role="button"], [onclick], [data-captcha], [tabindex]:not([tabindex="-1"])'
      );
      const vw = window.innerWidth || 1, vh = window.innerHeight || 1;
      const onScreen = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      for (let i = 0; i < candidates.length && out.length < 40; i++) {
        const el = candidates[i];
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        // Skip fully off-viewport elements (hidden carousel items etc):
        // their centers become garbage click coords like -9888,38.
        if (!onScreen(rect)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        // PATCH-GUARD: normalized nx/ny coords.
        // Normalized 0-1000 coords: the agent (LLM + heuristics) always speaks
        // 0-1000, the dispatcher converts back to CSS pixels. Storing nx/ny
        // here fixes the old page-pixel vs normalized mismatch that made the
        // offline fallback click the wrong spot (e.g. logo loop at 111,30).
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        out.push({
          tagName: el.tagName,
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className : '',
          innerText: (el.innerText || '').slice(0, 50).trim(),
          placeholder: el.placeholder || '',
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          nx: Math.max(0, Math.min(1000, Math.round((cx / vw) * 1000))),
          ny: Math.max(0, Math.min(1000, Math.round((cy / vh) * 1000)))
        });
      }
      // Cheap fallback: if nothing matched (e.g. canvas-only game), report
      // at most a few pointer-cursor elements without scanning everything.
      if (out.length === 0) {
        const all = document.querySelectorAll('div, span');
        for (let i = 0; i < all.length && out.length < 10; i++) {
          const el = all[i];
          if (el.onclick == null && el.getAttribute('role') !== 'button') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          if (!onScreen(rect)) continue;
          out.push({
            tagName: el.tagName,
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            innerText: (el.innerText || '').slice(0, 50).trim(),
            placeholder: '',
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        }
      }
      return out;
    })()
  `;

  try {
    return await controller.executeJS(webview, code);
  } catch (e) {
    console.error("Failed to query interactive DOM elements:", e);
    return [];
  }
}

async function getPerformanceMetrics(controller, webview) {
  const code = `
    (() => {
      return {
        heapLimit: window.performance && window.performance.memory ? window.performance.memory.jsHeapSizeLimit : 0,
        heapUsed: window.performance && window.performance.memory ? window.performance.memory.usedJSHeapSize : 0,
        heapTotal: window.performance && window.performance.memory ? window.performance.memory.totalJSHeapSize : 0
      };
    })()
  `;
  try {
    return await controller.executeJS(webview, code);
  } catch (e) {
    return { heapLimit: 0, heapUsed: 0, heapTotal: 0 };
  }
}

module.exports = {
  getInteractiveDOM,
  getPerformanceMetrics
};
