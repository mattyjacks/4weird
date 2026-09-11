/**
 * Website debugging: guest error hook + on-page site audit.
 *
 * Games get played; websites get DEBUGGED. Two pieces:
 *
 * 1. Guest error hook (injected into the webview guest on did-finish-load,
 *    next to the user-action tracker). It forwards what the host would
 *    otherwise never see as first-class log lines through console.error, so
 *    the existing webview `console-message` pipeline picks them up:
 *      [4weird-guest-error]    window.onerror + unhandled promise rejections
 *      [4weird-resource-error] failed img/script/link loads (capture phase)
 *      [4weird-net-error]      fetch/XHR responses >= 400 + network failures
 *
 * 2. One-shot site audit (runs inside the guest via executeJS, throttled by
 *    maybeAuditWebsite): broken images, dead links, unlabeled inputs,
 *    forms with no submit, missing title/meta, mixed content, horizontal
 *    overflow. Findings are appended to consoleLogs as
 *    `[4weird-site-audit] CODE: detail` lines so lib/brain/bug_scanner.js
 *    files them through the normal bug pipeline (cooldown + dedupe included).
 *
 * Plain-node testable: builders return strings, parsers take values.
 * Nothing here reads game sources — it only observes the live DOM.
 */

// Marker lines the bug scanner treats as fileable (see bug_scanner.js).
const GUEST_ERROR_MARK = '[4weird-guest-error]';
const RESOURCE_ERROR_MARK = '[4weird-resource-error]';
const NET_ERROR_MARK = '[4weird-net-error]';
const SITE_AUDIT_MARK = '[4weird-site-audit]';

// Cap forwarded errors per hook install so a chatty page can never spam the
// host log loop (the hook reinstalls on every guest navigation anyway).
const MAX_HOOK_ERRORS = 25;

/**
 * JS source to executeJS() into the guest. Idempotent (window.__vibeDebugHook
 * guard), self-contained, returns a status string. Never throws out.
 */
function buildGuestErrorHookScript() {
  return `(() => {
    try {
      if (window.__vibeDebugHook && window.__vibeDebugHook.active) return 'already-hooked';
      const seen = [];
      const report = (kind, msg) => {
        try {
          if (seen.length >= ${MAX_HOOK_ERRORS}) return;
          const line = '[' + kind + '] ' + String(msg).slice(0, 300);
          if (seen.indexOf(line) !== -1) return;
          seen.push(line);
          console.error(line);
        } catch (_) {}
      };
      // JS exceptions (uncaught) — message + location, no stack spam.
      window.addEventListener('error', (e) => {
        try {
          if (e.target && e.target !== window && (e.target.src || e.target.href)) {
            const tag = e.target.tagName || 'resource';
            const url = e.target.src || e.target.href || '';
            report('4weird-resource-error', 'Failed to load ' + tag + ' ' + String(url).slice(0, 220));
          } else if (e.message) {
            report('4weird-guest-error', String(e.message).slice(0, 220) + ' @' + (e.filename || '') + ':' + (e.lineno || 0));
          }
        } catch (_) {}
      }, true);
      // Unhandled promise rejections (async failures never hit window.onerror).
      window.addEventListener('unhandledrejection', (e) => {
        try {
          const r = e.reason;
          const txt = r && r.stack ? String(r.stack).split('\\n').slice(0, 2).join(' ') : String(r);
          report('4weird-guest-error', 'Unhandled rejection: ' + txt.slice(0, 240));
        } catch (_) {}
      });
      // fetch: HTTP >= 400 + network failures. Response passes through untouched.
      try {
        if (typeof window.fetch === 'function' && !window.fetch.__vibeWrapped) {
          const rawFetch = window.fetch.bind(window);
          const wrapped = function () {
            let url = '';
            try { const a = arguments[0]; url = typeof a === 'string' ? a : (a && a.url) || ''; } catch (_) {}
            return rawFetch.apply(null, arguments).then(
              (res) => {
                try { if (res && res.status >= 400) report('4weird-net-error', 'fetch ' + String(url).slice(0, 200) + ' -> HTTP ' + res.status); } catch (_) {}
                return res;
              },
              (err) => {
                report('4weird-net-error', 'fetch ' + String(url).slice(0, 200) + ' failed: ' + String((err && err.message) || err).slice(0, 160));
                throw err;
              }
            );
          };
          wrapped.__vibeWrapped = true;
          window.fetch = wrapped;
        }
      } catch (_) {}
      // XHR: same coverage for legacy stacks (jQuery-era sites).
      try {
        const proto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
        if (proto && !proto.open.__vibeWrapped) {
          const rawOpen = proto.open;
          const wrappedOpen = function (method, url) {
            try { this.__vibeUrl = String(url || '').slice(0, 200); this.__vibeMethod = String(method || 'GET'); } catch (_) {}
            return rawOpen.apply(this, arguments);
          };
          wrappedOpen.__vibeWrapped = true;
          proto.open = wrappedOpen;
          if (!proto.send.__vibeWrapped) {
            const rawSend = proto.send;
            const wrappedSend = function () {
              try {
                this.addEventListener('load', function () {
                  try { if (this.status >= 400) report('4weird-net-error', 'xhr ' + (this.__vibeUrl || '') + ' -> HTTP ' + this.status); } catch (_) {}
                });
                this.addEventListener('error', function () {
                  report('4weird-net-error', 'xhr ' + (this.__vibeUrl || '') + ' network failure');
                });
              } catch (_) {}
              return rawSend.apply(this, arguments);
            };
            wrappedSend.__vibeWrapped = true;
            proto.send = wrappedSend;
          }
        }
      } catch (_) {}
      window.__vibeDebugHook = { active: true, at: Date.now() };
      return 'debug-hook-installed';
    } catch (err) {
      return 'debug-hook-failed';
    }
  })()`;
}

/**
 * JS source for a one-shot site audit. Returns a plain-JSON object:
 * { url, title, counts, issues: [{ code, severity, detail }] }.
 * Read-only: never clicks, types, or mutates the page.
 */
function buildWebsiteAuditScript() {
  return `(() => {
    try {
      const issues = [];
      const cap = (arr) => arr.slice(0, 5);
      // -- document basics --
      const title = (document.title || '').trim();
      if (!title) issues.push({ code: 'missing-title', severity: 'medium', detail: 'Page has no <title> (tab label + SEO).' });
      const metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc || !(metaDesc.getAttribute('content') || '').trim()) {
        issues.push({ code: 'missing-meta-description', severity: 'low', detail: 'No usable meta description tag.' });
      }
      // -- broken images (fully client-side: naturalWidth is layout truth) --
      const imgs = Array.from(document.images || []);
      const broken = imgs.filter((img) => {
        try { return !img.complete || img.naturalWidth === 0; } catch (_) { return false; }
      });
      if (broken.length) {
        issues.push({ code: 'broken-images', severity: 'high',
          detail: broken.length + ' image(s) failed to render: ' + cap(broken.map((i) => i.currentSrc || i.src || '(no src)')).join(' | ') });
      }
      // -- dead links --
      const anchors = Array.from(document.querySelectorAll('a'));
      const dead = anchors.filter((a) => {
        const h = a.getAttribute('href');
        return h === null || h.trim() === '' || h.trim() === '#' || /^javascript:\\s*void/i.test(h.trim());
      });
      if (dead.length) {
        const label = (a) => (a.innerText || a.textContent || a.getAttribute('aria-label') || '(no text)').trim().slice(0, 40);
        issues.push({ code: 'dead-links', severity: 'medium',
          detail: dead.length + ' anchor(s) go nowhere: ' + cap(dead.map((a) => '"' + label(a) + '"')).join(' | ') });
      }
      // -- forms with no way to submit --
      const forms = Array.from(document.forms || []);
      const unsubmittable = forms.filter((f) => {
        try {
          return !f.querySelector('button[type="submit"], input[type="submit"], button:not([type]), input[type="image"]');
        } catch (_) { return false; }
      });
      if (unsubmittable.length) {
        issues.push({ code: 'form-no-submit', severity: 'medium',
          detail: unsubmittable.length + ' form(s) have no submit control.' });
      }
      // -- unlabeled inputs (a11y: screen readers + click targets) --
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).filter((el) => {
        try {
          const t = (el.getAttribute('type') || 'text').toLowerCase();
          if (['hidden', 'submit', 'button', 'reset', 'image'].includes(t)) return false;
          if ((el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') || '').trim()) return false;
          if (el.id && document.querySelector('label[for="' + el.id + '"]')) return false;
          if (el.closest && el.closest('label')) return false;
          if ((el.getAttribute('placeholder') || '').trim()) return false;
          return true;
        } catch (_) { return false; }
      });
      if (inputs.length) {
        const name = (el) => el.name || el.id || el.getAttribute('type') || el.tagName;
        issues.push({ code: 'unlabeled-inputs', severity: 'low',
          detail: inputs.length + ' input(s) have no label: ' + cap(inputs.map(name)).join(', ') });
      }
      // -- mixed content --
      let mixed = 0;
      try {
        if (window.location.protocol === 'https:') {
          const urls = [];
          imgs.forEach((i) => urls.push(i.currentSrc || i.src || ''));
          Array.from(document.querySelectorAll('script[src], link[href]')).forEach((el) => urls.push(el.src || el.href || ''));
          mixed = urls.filter((u) => /^http:\\/\\//i.test(u)).length;
        }
      } catch (_) {}
      if (mixed) issues.push({ code: 'mixed-content', severity: 'high', detail: mixed + ' http:// subresource(s) on an https:// page.' });
      // -- horizontal overflow (broken layout signal) --
      try {
        const de = document.documentElement;
        if (de && de.scrollWidth > window.innerWidth + 1) {
          issues.push({ code: 'horizontal-overflow', severity: 'low',
            detail: 'Page overflows horizontally by ' + (de.scrollWidth - window.innerWidth) + 'px.' });
        }
      } catch (_) {}
      return {
        url: String(window.location.href).slice(0, 200),
        title: title.slice(0, 120),
        counts: { images: imgs.length, brokenImages: broken.length, links: anchors.length, deadLinks: dead.length, forms: forms.length },
        issues
      };
    } catch (err) {
      return { url: '', title: '', counts: {}, issues: [], error: String((err && err.message) || err).slice(0, 160) };
    }
  })()`;
}

/** Audit website-ish targets: http(s) pages. Local game files keep the error hook only. */
function shouldAuditTarget(url) {
  if (!url || typeof url !== 'string') return false;
  return /^\s*https?:\/\//i.test(url);
}

// Throttle: one audit per target per minute so the step loop stays fast.
const lastAuditAtByUrl = new Map();
const AUDIT_COOLDOWN_MS = 60 * 1000;

function shouldRunAudit(url, now = Date.now()) {
  if (!shouldAuditTarget(url)) return false;
  const last = lastAuditAtByUrl.get(url) || 0;
  if (now - last < AUDIT_COOLDOWN_MS) return false;
  lastAuditAtByUrl.set(url, now);
  return true;
}

function clearAuditThrottle() {
  lastAuditAtByUrl.clear();
}

/** Normalize one audit issue into the marker log line the scanner files. */
function issueToLogLine(issue) {
  const code = (issue && issue.code) || 'unknown';
  const detail = (issue && issue.detail) || '';
  return `${SITE_AUDIT_MARK} ${code}: ${detail}`.slice(0, 300);
}

/**
 * Run the audit when due and fold findings into consoleLogs (same array the
 * brain scans). All guest calls are best-effort — failures just skip.
 * Returns the issues array (empty when skipped or clean).
 */
async function maybeAuditWebsite({ gameController, webviewElement, url, consoleLogs, logSystemMessage }) {
  if (!shouldRunAudit(url)) return [];
  let audit = null;
  try {
    if (!gameController || typeof gameController.executeJS !== 'function') return [];
    audit = await gameController.executeJS(webviewElement, buildWebsiteAuditScript());
  } catch (_) {
    return [];
  }
  if (!audit || !Array.isArray(audit.issues)) return [];
  try {
    const c = audit.counts || {};
    if (logSystemMessage) {
      logSystemMessage(`Site audit: "${audit.title || url}" — ${c.images || 0} imgs (${c.brokenImages || 0} broken), ${c.links || 0} links (${c.deadLinks || 0} dead), ${c.forms || 0} forms, ${audit.issues.length} issue(s).`);
    }
  } catch (_) {}
  for (const issue of audit.issues) {
    const line = issueToLogLine(issue);
    try {
      if (Array.isArray(consoleLogs)) consoleLogs.push(line);
      if (logSystemMessage) logSystemMessage(`[Site Audit] ${line}`, 'warning');
    } catch (_) {}
  }
  return audit.issues;
}

module.exports = {
  GUEST_ERROR_MARK,
  RESOURCE_ERROR_MARK,
  NET_ERROR_MARK,
  SITE_AUDIT_MARK,
  MAX_HOOK_ERRORS,
  buildGuestErrorHookScript,
  buildWebsiteAuditScript,
  shouldAuditTarget,
  shouldRunAudit,
  clearAuditThrottle,
  issueToLogLine,
  maybeAuditWebsite,
};
