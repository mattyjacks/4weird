'use strict';

/**
 * Website bug checker for VibeCodeWorker.
 *
 * Paste-a-URL debugging: fetch one page (caps below) and run a read-only
 * markup audit, then optionally load it in headless Chromium (playwright or
 * puppeteer-core when installed) to capture console errors and failed
 * requests. No deps required: markup audit is regex based, browser pass is
 * best effort and reported honestly when unavailable.
 *
 * SECURITY:
 * - http/https only. URLs with credentials, non-web schemes, or overlong
 *   input are rejected. Fail closed.
 * - Fetch is bounded: 15s timeout, 2MB body cap. Bodies are used for the
 *   audit only, never logged, never executed.
 * - Localhost targets are allowed on purpose: this server is a desktop
 *   loopback tool and debugging a local dev server is a core use. The route
 *   layer gates non-local origins (see api_server.js EXECUTION_PATHS).
 */

const MAX_URL_LEN = 2048;
const FETCH_TIMEOUT_MS = 15000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SLOW_MS = 8000;
const BIG_BYTES = 1.5 * 1024 * 1024;
const BROWSER_TIMEOUT_MS = 30000;

function tryRequire(name) {
  try {
    return require(name);
  } catch (_) {
    return null;
  }
}

/** Normalize and validate a pasted target. Throws on anything unsafe. */
function normalizeTargetUrl(raw) {
  if (typeof raw !== 'string') throw new Error('Provide a url string');
  const s = raw.trim().slice(0, MAX_URL_LEN);
  if (!s) throw new Error('Provide a url');
  if (/[\s<>\\]/.test(s)) throw new Error('URL contains invalid characters');
  let u = null;
  try {
    u = new URL(s);
  } catch (_) {
    // Bare host without scheme: assume https.
    try {
      u = new URL('https://' + s);
    } catch (_) {
      throw new Error('URL is not parseable');
    }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http and https targets');
  if (u.username || u.password) throw new Error('URLs with credentials are rejected');
  if (!u.hostname) throw new Error('URL has no host');
  return u.toString();
}

function countMatches(html, re) {
  const m = html.match(re);
  return m ? m.length : 0;
}

function sampleMatches(html, re, cap) {
  const out = [];
  let m = null;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while (out.length < cap && (m = rx.exec(html)) !== null) {
    out.push((m[1] || m[0]).slice(0, 80));
    if (m[0].length === 0) rx.lastIndex += 1;
  }
  return out;
}

/**
 * Read-only markup audit. Returns issues [{ code, severity, detail }].
 * Severity: high (likely user-visible breakage), medium (quality/SEO/a11y),
 * low/info (hygiene notes).
 */
function auditMarkup(html, pageUrl) {
  const issues = [];
  const src = String(html || '');
  const isHttps = /^https:/i.test(pageUrl || '');

  const titleM = src.match(/<title[^>]*>([\s\S]{0,300})<\/title\s*>/i);
  if (!titleM) {
    issues.push({ code: 'missing-title', severity: 'medium', detail: 'No <title> tag. Tab shows the URL, SEO title is empty.' });
  } else if (!titleM[1].trim()) {
    issues.push({ code: 'empty-title', severity: 'medium', detail: '<title> tag is empty.' });
  }

  if (!/<meta[^>]+name=["']description["'][^>]*>/i.test(src)) {
    issues.push({ code: 'missing-meta-description', severity: 'low', detail: 'No meta description. Search previews fall back to page text.' });
  }
  if (!/<meta[^>]+name=["']viewport["'][^>]*>/i.test(src)) {
    issues.push({ code: 'missing-viewport', severity: 'medium', detail: 'No viewport meta tag. Mobile browsers render at desktop width.' });
  }
  if (!/<html[^>]+lang=["'][a-z-]+["']/i.test(src)) {
    issues.push({ code: 'missing-lang', severity: 'low', detail: 'No lang attribute on <html>. Screen readers guess pronunciation.' });
  }

  const imgs = src.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt\s*=/i.test(t));
  if (noAlt.length > 0) {
    const samples = noAlt.slice(0, 3).map((t) => (t.match(/\bsrc=["']([^"']{0,60})/i) || [])[1] || 'unknown src');
    issues.push({ code: 'images-missing-alt', severity: 'medium', detail: `${noAlt.length} of ${imgs.length} images missing alt text (e.g. ${samples.join(' | ')}).` });
  }
  const brokenSrc = imgs.filter((t) => /\bsrc=["']\s*["']/i.test(t) || /\bsrc\s*=\s*[^"'\s>]/i.test(t) === false && !/\bsrc=/i.test(t));
  if (brokenSrc.length > 0) {
    issues.push({ code: 'images-empty-src', severity: 'high', detail: `${brokenSrc.length} image tag(s) with missing or empty src.` });
  }

  if (isHttps) {
    const mixed = countMatches(src, /<(img|script|link|source|video|audio|iframe)\b[^>]*(src|href)=["']http:\/\//gi);
    if (mixed > 0) {
      issues.push({ code: 'mixed-content', severity: 'high', detail: `${mixed} subresource(s) loaded over http on an https page. Browsers block these.` });
    }
  }

  const buttons = src.match(/<button\b[^>]*>([\s\S]{0,120})<\/button\s*>/gi) || [];
  const unnamed = buttons.filter((t) => {
    const inner = ((t.match(/<button\b[^>]*>([\s\S]{0,120})<\/button\s*>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
    return !inner && !/\baria-label\s*=/i.test(t);
  });
  if (unnamed.length > 0) {
    issues.push({ code: 'unlabeled-buttons', severity: 'medium', detail: `${unnamed.length} button(s) with no text or aria-label. Unusable by screen readers.` });
  }

  const noLabelWrap = src.replace(/<label\b[\s\S]*?<\/label\s*>/gi, '');
  const inputs = noLabelWrap.match(/<input\b[^>]*>/gi) || [];
  const bareInputs = inputs.filter((t) => !/\b(aria-label|aria-labelledby|placeholder|id)\s*=/i.test(t) && !/\btype=["']?(hidden|submit|button|reset|image)["']?/i.test(t));
  if (bareInputs.length > 0) {
    issues.push({ code: 'unlabeled-inputs', severity: 'medium', detail: `${bareInputs.length} form input(s) with no label, id, or placeholder.` });
  }

  const anchors = src.match(/<a\b[^>]*>/gi) || [];
  const placeholders = anchors.filter((t) => /\bhref=["'](#|javascript:\s*void\(0\)|javascript:;?)["']/i.test(t) || !/\bhref=/i.test(t));
  if (placeholders.length > 0) {
    issues.push({ code: 'placeholder-links', severity: 'low', detail: `${placeholders.length} link(s) with placeholder or missing href. Dead ends for keyboard users.` });
  }

  const inlineHandlers = countMatches(src, /\son(click|submit|load|error|change|input|mouseover|keydown)=["']/gi);
  if (inlineHandlers > 0) {
    issues.push({ code: 'inline-handlers', severity: 'info', detail: `${inlineHandlers} inline on* handler(s). Works, but blocks strict CSP and is harder to debug.` });
  }

  if (/document\.write\s*\(/i.test(src)) {
    issues.push({ code: 'document-write', severity: 'medium', detail: 'document.write present. Blocks parsing and hurts load on slow networks.' });
  }

  if (/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>(?!\s*<\/script>)/i.test(src) === false) {
    const blocking = (src.match(/<script\b(?![^>]*(src=|async|defer|type=["']module["']))[^>]*>/gi) || []).length;
    if (blocking > 0) {
      issues.push({ code: 'render-blocking-scripts', severity: 'low', detail: `${blocking} inline/parser-blocking script(s) without async, defer, or module type.` });
    }
  }

  return issues;
}

/** Score 0-100 plus letter from an issue list. High 15, medium 5, low 2, info 0. */
function gradeFor(issues) {
  const weights = { high: 15, medium: 5, low: 2, info: 0 };
  let score = 100;
  for (const i of issues || []) score -= weights[i.severity] || 0;
  score = Math.max(0, score);
  const letter = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F';
  return { score, letter };
}

async function fetchWithCaps(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 4Weird-VibeCodeWorker/2.0 site-check', Accept: 'text/html,application/xhtml+xml' }
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const ms = Date.now() - start;
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url || url,
      contentType: res.headers.get('content-type') || '',
      bytes: buf.length,
      truncated: buf.length >= MAX_BODY_BYTES,
      ms,
      html: buf.slice(0, MAX_BODY_BYTES).toString('utf8')
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort live pass: load the page in headless Chromium and collect
 * console errors plus failed requests. Returns null when no automation
 * backend is installed. Never throws.
 */
async function liveBrowserPass(url) {
  let engine = null;
  try {
    const mod = tryRequire('../src/runtime/chromium_engine');
    if (!mod) return null;
    engine = new mod.ChromiumEngine({ headless: true });
    if (engine.detectBackend() === 'compat') return null;
    const nav = await engine.navigate(url);
    if (!nav.success) return { consoleErrors: [], networkFailures: [], note: 'page did not finish loading: ' + String(nav.error || 'unknown').slice(0, 120) };
    await new Promise((r) => setTimeout(r, 2500));
    const consoleErrors = engine.consoleLogs
      .filter((l) => l.level === 'error')
      .slice(0, 10)
      .map((l) => String(l.message).slice(0, 200));
    const networkFailures = engine.networkRequests
      .filter((r) => r.status >= 400)
      .slice(0, 10)
      .map((r) => `${r.status} ${String(r.url).slice(0, 120)}`);
    return { consoleErrors, networkFailures, note: null };
  } catch (_) {
    return null;
  } finally {
    try { if (engine) await engine.close(); } catch (_) {}
  }
}

/**
 * Full check: validate, fetch with caps, markup audit, fetch-level issues,
 * optional live browser pass. Resolves a report object, throws only on
 * invalid input or unreachable page.
 */
async function checkWebsite(rawUrl, opts = {}) {
  const url = normalizeTargetUrl(rawUrl);
  let page = null;
  try {
    page = await fetchWithCaps(url);
  } catch (e) {
    throw new Error('Page unreachable: ' + String((e && e.message) || e).slice(0, 140));
  }
  // Re-validate after redirects (fail closed on scheme downgrade tricks).
  normalizeTargetUrl(page.finalUrl);

  const issues = [];
  if (!page.ok) {
    issues.push({ code: 'http-error', severity: 'high', detail: `Server answered HTTP ${page.status}. Fix serving before anything else.` });
  }
  if (page.ms >= SLOW_MS) {
    issues.push({ code: 'slow-response', severity: 'medium', detail: `First byte plus body took ${(page.ms / 1000).toFixed(1)}s. Users bounce after ~3s.` });
  }
  if (page.bytes >= BIG_BYTES) {
    issues.push({ code: 'heavy-page', severity: 'low', detail: `${Math.round(page.bytes / 1024)}KB of HTML. Large DOMs parse slowly on low spec devices.` });
  }

  const isHtml = /text\/html|application\/xhtml/i.test(page.contentType) || /^\s*</.test(page.html.slice(0, 500));
  if (isHtml) {
    issues.push(...auditMarkup(page.html, page.finalUrl));
  } else {
    issues.push({ code: 'non-html', severity: 'info', detail: `Content-Type is ${page.contentType || 'unknown'}. Markup checks skipped.` });
  }

  let consoleErrors = [];
  let networkFailures = [];
  let browser = false;
  let browserNote = 'Headless browser not installed here (npm install --save playwright). Static checks only.';
  if (opts.live !== false && isHtml && page.ok) {
    const live = await liveBrowserPass(page.finalUrl);
    if (live) {
      browser = true;
      browserNote = live.note;
      consoleErrors = live.consoleErrors;
      networkFailures = live.networkFailures;
      live.consoleErrors.forEach((m) => issues.push({ code: 'console-error', severity: 'high', detail: m }));
      live.networkFailures.forEach((m) => issues.push({ code: 'failed-request', severity: 'medium', detail: m }));
    }
  }

  const grade = gradeFor(issues);
  return {
    success: true,
    url: page.finalUrl,
    httpStatus: page.status,
    fetchMs: page.ms,
    bytes: page.bytes,
    truncated: page.truncated,
    browser,
    browserNote,
    consoleErrors,
    networkFailures,
    issues: issues.slice(0, 40),
    issueCount: issues.length,
    grade
  };
}

module.exports = {
  normalizeTargetUrl,
  auditMarkup,
  gradeFor,
  checkWebsite,
  MAX_URL_LEN,
  FETCH_TIMEOUT_MS,
  MAX_BODY_BYTES
};
