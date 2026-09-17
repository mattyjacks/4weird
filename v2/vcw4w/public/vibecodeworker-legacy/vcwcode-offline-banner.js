/* vcwcode-offline-banner.js — banner when /api/status unreachable (fetch probe + DOM toggle), no deps.
 * Framework-free. Does NOT import existing app code.
 * Usage (integrator): <div id="vcwcode-offline-banner" hidden>…</div><script src="vcwcode-offline-banner.js"></script>
 * Exposes window.vcwcodeOfflineProbe for tests/manual re-probe.
 */
(function () {
  'use strict';

  var BANNER_ID = 'vcwcode-offline-banner';
  var ENDPOINT = '/api/status';
  var INTERVAL_MS = 30000;
  var TIMEOUT_MS = 8000;

  function ensureBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.setAttribute('role', 'alert');
    el.hidden = true;
    el.style.cssText = 'position:sticky;top:0;z-index:9999;padding:8px 12px;' +
      'background:#7f1d1d;color:#fff;font:13px system-ui,sans-serif;text-align:center;';
    el.textContent = 'Offline — cannot reach /api/status. Retrying…';
    if (document.body) document.body.prepend(el);
    return el;
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = null;
    if (ctrl) timer = setTimeout(function () { ctrl.abort(); }, ms);
    var opts = ctrl ? { signal: ctrl.signal, cache: 'no-store' } : { cache: 'no-store' };
    return fetch(url, opts).finally(function () { if (timer) clearTimeout(timer); });
  }

  function setOffline(offline) {
    var el = ensureBanner();
    el.hidden = !offline;
    el.setAttribute('aria-hidden', offline ? 'false' : 'true');
    document.documentElement.classList.toggle('vcwcode-offline', offline);
  }

  function probe() {
    return fetchWithTimeout(ENDPOINT, TIMEOUT_MS).then(
      function (res) { setOffline(!res.ok && res.status >= 500 ? true : false); return res; },
      function () { setOffline(true); return null; }
    );
  }

  window.vcwcodeOfflineProbe = probe;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ensureBanner(); probe(); });
  } else {
    ensureBanner();
    probe();
  }
  setInterval(probe, INTERVAL_MS);
})();
