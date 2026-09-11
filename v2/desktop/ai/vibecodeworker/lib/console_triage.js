'use strict';

/**
 * Classify browser console output for universal QA runs.
 *
 * A browser page is routinely surrounded by ad-tech, browser capability, and
 * GPU-driver warnings. Reporting all of that as a product bug makes evidence
 * unusable. This module preserves those messages as context while filing only
 * errors that plausibly belong to the target application.
 */

const ENVIRONMENT_NOISE = [
  /electron security warning/i,
  /gpu stall due to readpixels/i,
  /no available adapters/i,
  /unrecognized feature:/i,
  /allow attribute will take precedence/i,
  /safeframeconfig is deprecated/i,
  /slot\.gettargeting is deprecated/i,
  /fedcm .*notsupportederror/i,
  /domnodeinserted.*deprecated/i,
  /sandbox attribute can escape its sandboxing/i,
];

function hostFor(value) {
  try { return new URL(value).hostname.toLowerCase(); } catch (_) { return ''; }
}

function sameSite(left, right) {
  const a = hostFor(left), b = hostFor(right);
  if (!a || !b) return false;
  if (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) return true;
  // Browser bundles frequently live at a sibling subdomain (for example
  // builds.crazygames.com beside www.crazygames.com). A small registrable
  // domain approximation is enough here; this is evidence triage, never an
  // authorization decision.
  const base = (host) => host.split('.').slice(-2).join('.');
  return base(a) === base(b);
}

function triageConsoleMessage({ level = 0, message = '', sourceId = '', targetUrl = '' } = {}) {
  const text = String(message || '');
  const isError = Number(level) >= 3 || /\b(uncaught|typeerror|referenceerror|syntaxerror|network error|failed to fetch)\b/i.test(text);
  const sourceMatchesTarget = sameSite(sourceId, targetUrl);
  if (ENVIRONMENT_NOISE.some((pattern) => pattern.test(text))) {
    return { category: 'environment', actionable: false, sourceMatchesTarget };
  }
  if (!sourceMatchesTarget && sourceId && /^https?:/i.test(sourceId)) {
    return { category: 'third-party', actionable: false, sourceMatchesTarget };
  }
  return { category: isError ? 'target-error' : 'target-warning', actionable: isError, sourceMatchesTarget };
}

module.exports = { ENVIRONMENT_NOISE, hostFor, sameSite, triageConsoleMessage };
