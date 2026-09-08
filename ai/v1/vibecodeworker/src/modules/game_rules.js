/**
 * Per-game rules resolver: makes the playtest agent aware of each 4weird
 * HTML game's rules in a low-code, adaptable way — no per-game code.
 *
 * Sources, merged in priority order (first hit wins per line):
 *   1. `<gameDir>/game_meta.json` — dedicated QA file:
 *      { name, objective, controls, known_states[], win_condition, avoid, tips }
 *   2. `<gameDir>/game.json` — existing catalog metadata:
 *      { title, description, instructions, controls, genre }
 *   3. On-page rules, scraped from the loaded game (guest-side script):
 *      - `<meta name="game-rules" content="...">` (one-line convention)
 *      - `<a id="game-rules-link" href="...">` (link to a rules page)
 *      - How-to-play / controls sections by id/class or heading text
 *   4. Generic fallback (same default the prompt builder uses).
 *
 * Game authors: copy `_TEMPLATE/game_meta.json` next to your index.html
 * and/or add `<meta name="game-rules" content="...">` to the page head.
 * Either one (or nothing — game.json + on-page How to Play are picked up
 * automatically) is enough for the agent to playtest with rules.
 */
const fs = require('fs');
const path = require('path');

const FALLBACK_RULES = 'Explore the game: find buttons, play, maximize score, look for bugs/errors.';

function findWebsiteV1Dir() {
  const packaged = path.join(process.resourcesPath || '', 'website', 'v1');
  if (process.resourcesPath && fs.existsSync(packaged)) return packaged;
  const dev = path.join(__dirname, '..', '..', '..', '..', '..', 'website', 'v1');
  if (fs.existsSync(dev)) return dev;
  return '';
}

// Map a loaded game URL back to its on-disk directory so file rules can be
// found whether the game was opened via file:// or the catalog http server.
function gameDirFromUrl(url, websiteV1Dir) {
  const site = websiteV1Dir || findWebsiteV1Dir();
  if (!url) return '';
  try {
    if (url.startsWith('file:///')) {
      let p = decodeURIComponent(url.slice('file:///'.length));
      if (process.platform !== 'win32') p = '/' + p;
      else p = p.replace(/\//g, '\\');
      const dir = path.dirname(p);
      return fs.existsSync(dir) ? dir : '';
    }
    const m = url.match(/^https?:\/\/[^/]+(\/[^?#]*)/);
    if (m && site) {
      let rel = decodeURIComponent(m[1]).replace(/^\/+/, '').replace(/\//g, path.sep);
      const full = path.join(site, rel);
      const dir = full.endsWith('index.html') || full.endsWith('.html') ? path.dirname(full) : full;
      return fs.existsSync(dir) ? dir : '';
    }
  } catch (e) { /* unresolvable URL: caller falls back */ }
  return '';
}

function readJsonFile(dir, name) {
  try {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function flattenControls(controls) {
  if (!controls) return '';
  if (typeof controls === 'string') return controls;
  if (Array.isArray(controls)) return controls.filter(Boolean).join('; ');
  if (typeof controls === 'object') {
    const parts = [];
    for (const [group, value] of Object.entries(controls)) {
      if (value === true) { parts.push(group); continue; }
      if (!value) continue;
      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) parts.push(`${k}: ${v}`);
      } else {
        parts.push(`${group}: ${value}`);
      }
    }
    return parts.join('; ');
  }
  return String(controls);
}

function pushUnique(lines, seen, label, value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  const key = text.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  lines.push(label ? `${label}: ${text}` : text);
}

// File-based rules: game_meta.json first, game.json enriches.
function resolveFileGameRules(gameDir) {
  const lines = [];
  const seen = new Set();
  const sources = [];
  if (!gameDir) return { text: '', sources };

  const meta = readJsonFile(gameDir, 'game_meta.json');
  if (meta) {
    sources.push('game_meta.json');
    pushUnique(lines, seen, 'Game', meta.name);
    pushUnique(lines, seen, 'Objective', meta.objective);
    pushUnique(lines, seen, 'Controls', flattenControls(meta.controls));
    if (Array.isArray(meta.known_states) && meta.known_states.length) {
      pushUnique(lines, seen, 'Known states', meta.known_states.join(', '));
    }
    pushUnique(lines, seen, 'Win condition', meta.win_condition);
    pushUnique(lines, seen, 'Avoid', meta.avoid);
    pushUnique(lines, seen, 'Tips', meta.tips);
  }

  const catalog = readJsonFile(gameDir, 'game.json');
  if (catalog) {
    const before = lines.length;
    pushUnique(lines, seen, 'Game', catalog.title);
    if (catalog.genre) pushUnique(lines, seen, 'Genre', catalog.genre);
    pushUnique(lines, seen, 'About', catalog.description);
    pushUnique(lines, seen, 'How to play', catalog.instructions);
    pushUnique(lines, seen, 'Controls', flattenControls(catalog.controls));
    if (lines.length > before && !sources.includes('game.json')) sources.push('game.json');
  }

  return { text: lines.join('\n'), sources };
}

// Guest-side scraper for on-page rules. Runs inside the game webview via
// executeJavaScript; must never throw (guest pages are third-party shaped).
const PAGE_RULES_SCRIPT = `(() => {
  try {
    const out = { meta: '', link: '', sections: [] };
    const clean = (s, n) => String(s || '').replace(/\\s+/g, ' ').trim().slice(0, n || 800);
    const metaTag = document.querySelector('meta[name="game-rules"]');
    if (metaTag && metaTag.content) out.meta = clean(metaTag.content, 600);
    const linkEl = document.querySelector('#game-rules-link, a[data-game-rules]');
    if (linkEl) out.link = clean((linkEl.textContent || '') + ' -> ' + (linkEl.href || ''), 300);
    const picked = new Set();
    const grab = (el) => {
      if (!el || picked.has(el)) return;
      picked.add(el);
      const t = clean(el.innerText || el.textContent);
      if (t && t.length > 20) out.sections.push(t);
    };
    document.querySelectorAll('[id*="how-to-play" i], [id*="howto" i], [class*="how-to-play" i], [data-game-rules]').forEach(grab);
    const heads = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of heads) {
      if (/how to play|game rules|^rules$|instructions|controls/i.test(h.textContent || '')) {
        let sib = h.nextElementSibling;
        let hops = 0;
        while (sib && hops < 3) { grab(sib); sib = sib.nextElementSibling; hops++; }
      }
      if (out.sections.length >= 4) break;
    }
    return out;
  } catch (e) {
    return { meta: '', link: '', sections: [], error: String((e && e.message) || e) };
  }
})()`;

// Convert a scrape result into rules text, skipping anything already covered.
function formatPageRules(scrape, seen) {
  const lines = [];
  const sources = [];
  if (!scrape || typeof scrape !== 'object') return { text: '', sources };
  const known = seen || new Set();
  const before = known.size;
  if (scrape.meta) {
    pushUnique(lines, known, 'Page rules', scrape.meta);
    if (known.size > before) sources.push('on-page <meta name="game-rules">');
  }
  if (scrape.link) {
    pushUnique(lines, known, 'Rules link', scrape.link);
    if (lines.length) sources.push('on-page rules link');
  }
  (scrape.sections || []).forEach((section, i) => {
    const n = lines.length;
    pushUnique(lines, known, i === 0 ? 'How to play (on-page)' : '', section);
    if (lines.length > n && !sources.includes('on-page How to Play')) sources.push('on-page How to Play');
  });
  return { text: lines.join('\n'), sources };
}

// Merge an enrichment block into a base block without duplicating lines.
function mergeRules(base, extra) {
  const seen = new Set(
    String(base || '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean)
  );
  const fresh = String(extra || '').split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !seen.has(l.replace(/\s+/g, ' ').trim().toLowerCase()));
  return [String(base || '').trim(), ...fresh].filter(Boolean).join('\n') || FALLBACK_RULES;
}

module.exports = {
  FALLBACK_RULES,
  findWebsiteV1Dir,
  gameDirFromUrl,
  flattenControls,
  resolveFileGameRules,
  PAGE_RULES_SCRIPT,
  formatPageRules,
  mergeRules
};
