/* GraveGain unified age-band gore director (agent A7).
 *
 * One shared mode/gate module for gravegain2d / gravegain3d / gravegain1d.
 * Mirrors the mode-resolution priority of the sibling overlays
 * (gore-gravegain2d.js, gore-gravegain3d.js):
 *   ?content=kid|teen|all > localStorage "4weird-content-mode:<slug>" >
 *   localStorage "FourweirdContentMode" (plain or {mode} JSON) >
 *   window.FourweirdContentMode.mode > per-slug default.
 *
 * Bands: kid = NO blood, praise words instead. teen = blood, minimal gore.
 * all (adults) = full gore + drugs (cannabis/mushroom botany, 'drug' content).
 *
 * Vanilla JS, idempotent, no input listeners, no fetch/eval. All try/catch.
 */
(function () {
  'use strict';
  if (window.GraveGainAgeGore) return;

  var VERSION = '1.0.0';
  var MODES = { kid: 1, teen: 1, all: 1 };
  var DEFAULTS = { gravegain2d: 'all', gravegain3d: 'teen', gravegain1d: 'teen' };
  var SLUGS = ['gravegain2d', 'gravegain3d', 'gravegain1d'];
  var LS_PREFIX = '4weird-content-mode:';
  var LS_LEGACY = 'FourweirdContentMode';
  var EVENT_NAME = 'fourweird-content-mode';
  var PRAISE = ['NICE!', 'POOF!', '+100 BRAVE!', 'SPARKLE DOWN!', '\uD83C\uDF08 RAINBOW!'];

  var botanyBackup = {};

  function isValidMode(m) {
    try { return !!MODES[String(m)]; } catch (e) { return false; }
  }

  function normSlug(s) {
    try {
      s = String(s || '').toLowerCase().trim();
      return s || 'gravegain2d';
    } catch (e) { return 'gravegain2d'; }
  }

  function defaultFor(slug) {
    try { return DEFAULTS[slug] || 'teen'; } catch (e) { return 'teen'; }
  }

  function readUrlMode() {
    try {
      var q = String(window.location && window.location.search || '');
      var m = (new URLSearchParams(q)).get('content');
      return isValidMode(m) ? String(m) : null;
    } catch (e) { return null; }
  }

  function readLsKey(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw == null) return null;
      var s = String(raw).trim();
      if (isValidMode(s)) return s;
      var o = JSON.parse(s);
      if (o && isValidMode(o.mode)) return String(o.mode);
      return null;
    } catch (e) { return null; }
  }

  function getMode(slug) {
    try {
      slug = normSlug(slug);
      var m = readUrlMode();
      if (m) return m;
      m = readLsKey(LS_PREFIX + slug);
      if (m) return m;
      m = readLsKey(LS_LEGACY);
      if (m) return m;
      try {
        var g = window.FourweirdContentMode;
        if (g && isValidMode(g.mode)) return String(g.mode);
      } catch (e) {}
      return defaultFor(slug);
    } catch (e) { return 'teen'; }
  }

  function setMode(slug, mode) {
    try {
      slug = normSlug(slug);
      if (!isValidMode(mode)) return false;
      mode = String(mode);
      try { window.localStorage.setItem(LS_PREFIX + slug, mode); } catch (e) {}
      try {
        var prev = window.FourweirdContentMode;
        if (!prev || typeof prev !== 'object') prev = {};
        var next = {};
        for (var k in prev) {
          try { if (Object.prototype.hasOwnProperty.call(prev, k)) next[k] = prev[k]; } catch (e) {}
        }
        next.mode = mode;
        next.goreEnabled = (mode !== 'kid');
        next.drugsAllowed = (mode === 'all');
        window.FourweirdContentMode = next;
      } catch (e) {}
      try {
        var detail = { mode: mode, slug: slug };
        var ev;
        if (typeof window.CustomEvent === 'function') {
          ev = new window.CustomEvent(EVENT_NAME, { detail: detail });
        } else {
          ev = window.document.createEvent('CustomEvent');
          ev.initCustomEvent(EVENT_NAME, false, false, detail);
        }
        window.dispatchEvent(ev);
      } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  function isBloodAllowed(slug) {
    try { return getMode(slug) !== 'kid'; } catch (e) { return true; }
  }

  function isGibAllowed(slug) {
    try { return getMode(slug) === 'all'; } catch (e) { return false; }
  }

  function isDrugsAllowed(slug) {
    try { return getMode(slug) === 'all'; } catch (e) { return false; }
  }

  function praise() {
    try { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
    catch (e) { return 'NICE!'; }
  }

  function inferSlug() {
    try {
      var q = String(window.location && window.location.search || '');
      var p = new URLSearchParams(q);
      var c = normSlug(p.get('slug') || p.get('game') || '');
      if (DEFAULTS[c]) return c;
    } catch (e) {}
    try {
      var path = String(window.location && window.location.pathname || '').toLowerCase();
      for (var i = 0; i < SLUGS.length; i++) {
        if (path.indexOf(SLUGS[i]) !== -1) return SLUGS[i];
      }
    } catch (e) {}
    try {
      var b = window.document && window.document.body;
      var d = normSlug((b && (b.getAttribute('data-slug') || b.getAttribute('data-game'))) || '');
      if (DEFAULTS[d]) return d;
    } catch (e) {}
    return null;
  }

  function seedKind(s) {
    try {
      var tags = '';
      try { if (s.tags && s.tags.join) tags = s.tags.join(' '); } catch (e) {}
      var hay = [s.id, s.key, s.type, s.name, s.displayName, s.label, tags].join(' ').toLowerCase();
      if (/cannabis|weed|marijuana|ganja|hash/.test(hay)) return 'cannabis';
      if (/mushroom|shroom|psilocybin|mycel/.test(hay)) return 'mushroom';
      try { if (s.drug === true || s.isDrug === true) return 'drug'; } catch (e) {}
      return null;
    } catch (e) { return null; }
  }

  function reskinSeeds(disallowed) {
    try {
      var gd = window.GraveGainGameData;
      if (!gd || !gd.BotanySeeds) return;
      var seeds = gd.BotanySeeds;
      var isArr = Object.prototype.toString.call(seeds) === '[object Array]';
      var keys = null;
      try { keys = isArr ? seeds.map(function (_, i) { return i; }) : Object.keys(seeds); }
      catch (e) { return; }
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        var s = null;
        try { s = seeds[k]; } catch (e) { continue; }
        if (!s || typeof s !== 'object') continue;
        var kind = seedKind(s);
        if (!kind) continue;
        var bkey = String(k);
        if (disallowed) {
          if (!botanyBackup[bkey]) {
            botanyBackup[bkey] = {
              name: s.name, displayName: s.displayName, label: s.label,
              icon: s.icon, emoji: s.emoji
            };
          }
          try {
            if (kind === 'cannabis') {
              if ('name' in s) s.name = 'Sparkite Sprout';
              if ('displayName' in s) s.displayName = 'Sparkite Sprout';
              if ('label' in s) s.label = 'Sparkite Sprout';
              if ('icon' in s) s.icon = '\u26A1';
              if ('emoji' in s) s.emoji = '\u26A1';
            } else {
              if ('name' in s) s.name = 'Grove Cap (Culinary)';
              if ('displayName' in s) s.displayName = 'Grove Cap (Culinary)';
              if ('label' in s) s.label = 'Grove Cap (Culinary)';
            }
          } catch (e) {}
        } else if (botanyBackup[bkey]) {
          var b = botanyBackup[bkey];
          try {
            if (b.name !== undefined && 'name' in s) s.name = b.name;
            if (b.displayName !== undefined && 'displayName' in s) s.displayName = b.displayName;
            if (b.label !== undefined && 'label' in s) s.label = b.label;
            if (b.icon !== undefined && 'icon' in s) s.icon = b.icon;
            if (b.emoji !== undefined && 'emoji' in s) s.emoji = b.emoji;
          } catch (e) {}
          try { delete botanyBackup[bkey]; } catch (e) {}
        }
      }
    } catch (e) {}
  }

  function reskinDom(disallowed) {
    try {
      if (!window.document || !window.document.querySelectorAll) return;
      var els = window.document.querySelectorAll('[data-drug]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        try {
          if (disallowed) {
            if (!el.hasAttribute('data-agegore-hidden')) {
              el.setAttribute('data-agegore-hidden', el.style.display || '');
            }
            el.style.display = 'none';
          } else if (el.hasAttribute('data-agegore-hidden')) {
            el.style.display = el.getAttribute('data-agegore-hidden') || '';
            el.removeAttribute('data-agegore-hidden');
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  function reskinBotany(slug) {
    try {
      var disallowed;
      if (slug != null && String(slug).trim() !== '') {
        disallowed = !isDrugsAllowed(slug);
      } else {
        var inferred = inferSlug();
        if (inferred) {
          disallowed = !isDrugsAllowed(inferred);
        } else {
          disallowed = false;
          for (var i = 0; i < SLUGS.length; i++) {
            try { if (!isDrugsAllowed(SLUGS[i])) { disallowed = true; break; } }
            catch (e) { disallowed = true; break; }
          }
        }
      }
      reskinSeeds(disallowed);
      reskinDom(disallowed);
      return true;
    } catch (e) { return false; }
  }

  window.GraveGainAgeGore = {
    VERSION: VERSION,
    getMode: getMode,
    setMode: setMode,
    isDrugsAllowed: isDrugsAllowed,
    isBloodAllowed: isBloodAllowed,
    isGibAllowed: isGibAllowed,
    reskinBotany: reskinBotany,
    praise: praise
  };

  try {
    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({
      name: 'gravegain-agegore',
      version: VERSION,
      init: function () { try { reskinBotany(); } catch (e) {} }
    });
  } catch (e) {}
})();
