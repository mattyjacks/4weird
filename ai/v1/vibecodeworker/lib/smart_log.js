/**
 * SmartLog — file-backed structured logging for VibeCodeWorker (all runtimes).
 *
 * Every process (Electron main, headless API server, heal_worker, Tauri via
 * the Rust mirror in src-tauri) appends JSONL rows to a daily log file under
 * the OS-appropriate log dir:
 *   win32:  %APPDATA%/vibecodeworker/logs/vibe-YYYY-MM-DD.jsonl
 *   darwin: ~/Library/Logs/vibecodeworker/vibe-YYYY-MM-DD.jsonl
 *   linux:  ~/.local/share/vibecodeworker/logs/vibe-YYYY-MM-DD.jsonl
 *   (override with VIBE_LOG_DIR)
 *
 * "Smart" part: `writeHandoff()` distills the raw stream into a compact
 * markdown brief (error clusters, bugs, recent actions, environment) that can
 * be fed MANUALLY (copy the file into any vibecoding tool) or AUTOMATICALLY
 * (the OpenCode bridge attaches it to heal/fix prompts; /api/opencode/handoff
 * serves it). Zero dependencies, never throws.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function getLogDir() {
  if (process.env.VIBE_LOG_DIR) return process.env.VIBE_LOG_DIR;
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'vibecodeworker', 'logs');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Logs', 'vibecodeworker');
  }
  return path.join(os.homedir(), '.local', 'share', 'vibecodeworker', 'logs');
}

function dayStamp(d) {
  const t = d || new Date();
  return t.toISOString().slice(0, 10);
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const KEEP_DAYS = 14;

class SmartLog {
  constructor(opts) {
    opts = opts || {};
    this.dir = opts.dir || getLogDir();
    this.source = opts.source || 'vibecodeworker';
    this.sessionId = opts.sessionId || ('sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
    this.ring = []; // in-memory tail for handoffs (cap 500)
    this._warned = false;
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    } catch (e) { this._dead = true; }
  }

  _fileFor(date) {
    return path.join(this.dir, `vibe-${dayStamp(date)}.jsonl`);
  }

  log(level, category, message, extra) {
    const row = {
      ts: new Date().toISOString(),
      session: this.sessionId,
      source: this.source,
      level: level || 'info',
      category: category || 'general',
      message: String(message == null ? '' : message).slice(0, 4000),
      ...(extra && typeof extra === 'object' ? { extra: JSON.parse(JSON.stringify(extra).slice(0, 4000)) } : {}),
    };
    this.ring.push(row);
    if (this.ring.length > 500) this.ring.splice(0, this.ring.length - 500);
    if (this._dead) return row;
    try {
      const file = this._fileFor();
      try {
        const st = fs.statSync(file);
        if (st.size > MAX_FILE_BYTES) {
          fs.renameSync(file, file.replace(/\.jsonl$/, `-${Date.now()}.jsonl`));
          this._prune();
        }
      } catch (e) { /* file doesn't exist yet */ }
      fs.appendFileSync(file, JSON.stringify(row) + '\n', 'utf8');
    } catch (e) {
      if (!this._warned) { this._warned = true; try { console.error('[SmartLog] file write failed:', e.message); } catch (e2) {} }
    }
    return row;
  }

  info(msg, extra) { return this.log('info', (extra && extra.category) || 'general', msg, extra); }
  warn(msg, extra) { return this.log('warn', (extra && extra.category) || 'general', msg, extra); }
  error(msg, extra) { return this.log('error', (extra && extra.category) || 'general', msg, extra); }

  _prune() {
    try {
      const cutoff = Date.now() - KEEP_DAYS * 86400000;
      for (const f of fs.readdirSync(this.dir)) {
        if (!/^vibe-.*\.jsonl$/.test(f)) continue;
        const p = path.join(this.dir, f);
        try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch (e) {}
      }
    } catch (e) {}
  }

  /** Read today's rows (plus yesterday's if today is thin). Cap 2000 rows. */
  readRecent(maxRows) {
    const cap = maxRows || 2000;
    const rows = [];
    try {
      const files = [this._fileFor(), this._fileFor(new Date(Date.now() - 86400000))].filter(f => fs.existsSync(f));
      for (const f of files) {
        const lines = fs.readFileSync(f, 'utf8').split('\n');
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try { rows.push(JSON.parse(t)); } catch (e) {}
          if (rows.length >= cap) return rows.slice(-cap);
        }
      }
    } catch (e) {}
    // Include this session's in-memory rows not yet flushed (already flushed, but dedupe-safe).
    return rows.slice(-cap);
  }

  /**
   * Distill recent logs into an AI-handoff brief. Returns { success, path, markdown }.
   * Clustering: group errors/warnings by normalized message, count, first/last seen,
   * keep one example stack. Designed to fit in a single LLM context window.
   */
  writeHandoff(opts) {
    opts = opts || {};
    try {
      const rows = this.readRecent(2000);
      const pool = rows.length > 0 ? rows : this.ring;
      const errors = pool.filter(r => r.level === 'error');
      const warns = pool.filter(r => r.level === 'warn');
      const clusters = clusterRows([...errors, ...warns]);
      const bugs = pickBugs(opts.bugs);
      const actions = pool.filter(r => r.category === 'action' || r.category === 'api').slice(-25);

      const L = [];
      L.push(`# VibeCodeWorker smart-log handoff - ${new Date().toISOString()}`);
      L.push('');
      L.push(`- **Reason:** ${opts.reason || 'manual handoff'}`);
      L.push(`- **Source:** ${this.source} / session \`${this.sessionId}\``);
      L.push(`- **Log dir:** \`${this.dir}\` (${pool.length} rows scanned)`);
      L.push(`- **App:** ${opts.appVersion || 'vibecodeworker-4weird 2.0.0'} on ${process.platform}/${process.arch} (node ${process.version})`);
      L.push('');
      if (clusters.length === 0) {
        L.push('## Error clusters');
        L.push('_No errors or warnings in the scanned window — the worker looks healthy._');
      } else {
        L.push(`## Error clusters (${clusters.length})`);
        clusters.slice(0, 15).forEach((c, i) => {
          L.push(`### ${i + 1}. x${c.count} [${c.level}] ${c.title}`);
          L.push(`- First: ${c.first} · Last: ${c.last} · Source: ${c.source}`);
          if (c.stack) { L.push('```'); L.push(c.stack.split('\n').slice(0, 12).join('\n')); L.push('```'); }
        });
      }
      L.push('');
      if (bugs.length > 0) {
        L.push(`## Open bugs (${bugs.length})`);
        bugs.slice(0, 20).forEach((b, i) => {
          L.push(`${i + 1}. [${(b.severity || 'medium').toUpperCase()}] ${b.title || b.description || b.id} (\`${b.id || 'n/a'}\`)`);
        });
        L.push('');
      }
      if (actions.length > 0) {
        L.push('## Recent actions (last 25)');
        actions.forEach(a => L.push(`- ${a.ts} [${a.source}] ${a.message}`.slice(0, 220)));
        L.push('');
      }
      L.push('## Suggested next step for the coding agent');
      if (clusters.length > 0) {
        L.push(`Reproduce cluster #1 (“${clusters[0].title}”), add a regression test to \`test_vibecodeworker.js\`, fix, and re-run the suite.`);
      } else if (bugs.length > 0) {
        L.push('Pick the highest-severity open bug above, fix it with a regression test, and re-run the suite.');
      } else {
        L.push('No failures observed — run a full playtest + suite and extend coverage for untested modules.');
      }
      // ASCII-safe: Windows consoles and naive log viewers render UTF-8
      // dashes/arrows as mojibake, which then confuses the AI reading them.
      const markdown = L.join('\n').replace(/—/g, '-').replace(/→/g, '->').replace(/[“”]/g, '"');
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(this.dir, `smart-handoff-${stamp}.md`);
      fs.writeFileSync(file, markdown, 'utf8');
      try { fs.writeFileSync(path.join(this.dir, 'latest-handoff.md'), markdown, 'utf8'); } catch (e) {}
      return { success: true, path: file, markdown };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  readLatestHandoff() {
    try {
      const p = path.join(this.dir, 'latest-handoff.md');
      if (fs.existsSync(p)) return { success: true, path: p, markdown: fs.readFileSync(p, 'utf8') };
      return { success: false, error: 'No handoff written yet.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

function normalizeMessage(m) {
  return String(m || '')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<ts>')
    .replace(/\b\d{4,}\b/g, '<n>')
    .replace(/(0x[0-9a-fA-F]+)/g, '<hex>')
    .replace(/(['"])(?:(?!\1).){0,80}\1/g, '<str>')
    .slice(0, 160);
}

function clusterRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.level}:${r.category}:${normalizeMessage(r.message)}`;
    let c = map.get(key);
    if (!c) {
      c = { level: r.level, title: normalizeMessage(r.message), count: 0, first: r.ts, last: r.ts, source: r.source, stack: null };
      map.set(key, c);
    }
    c.count++;
    if (r.ts < c.first) c.first = r.ts;
    if (r.ts > c.last) { c.last = r.ts; c.source = r.source; }
    if (!c.stack && r.extra && (r.extra.stack || r.extra.error)) {
      c.stack = String(r.extra.stack || r.extra.error).slice(0, 1500);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function pickBugs(bugs) {
  if (Array.isArray(bugs)) return bugs;
  // Fall back to the API bug store file if no live list was passed.
  try {
    const candidates = [
      path.join(__dirname, '..', 'data', 'bugs_log.json'),
      path.join(getLogDir(), '..', 'bugs_log.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(arr)) return arr.filter(b => !b || b.status !== 'fixed');
      }
    }
  } catch (e) {}
  return [];
}

/** Parse the headfull/CLI flags shared by Electron main + headless server. */
function parseDisplaySize(raw) {
  // Accepts "1920x1080", "1920,1080", "1920 1080". Returns {width,height} or null.
  const m = String(raw || '').trim().match(/(\d{3,5})\s*[x,\s]\s*(\d{3,5})/);
  if (!m) return null;
  const width = Math.max(800, Math.min(7680, parseInt(m[1], 10)));
  const height = Math.max(600, Math.min(4320, parseInt(m[2], 10)));
  return { width, height };
}
function parseWorkerArgs(argv) {
  const args = Array.isArray(argv) ? argv : process.argv;
  const out = {
    headless: false,
    headfull: false, // explicit visible-window request (overrides --headless)
    game: null,
    autoplay: false,
    handoffOnExit: false,
    handoffReason: 'exit handoff',
    heal: false,
    healIterations: 3,
    maxTicks: 0, // --max-ticks N: auto-pause the agent after N steps (0 = unlimited)
    handoffOnly: false, // --handoff: print latest/generate handoff and exit
    enableGpu: false,
    // Display controls (dashboard + separate game window). The runner brain
    // and the viewport toolbar can change these at runtime via the
    // set-display-mode IPC channel; CLI just seeds the first paint.
    windowSize: null, // --window-size 1920x1080 (dashboard outer size)
    fullscreen: false, // --fullscreen (dashboard fullscreen)
    displayMode: 'windowed', // windowed | fullscreen | split (legacy half-width) | game-focus
    gameWindowSize: null, // --game-window-size 1920x1080 (separate test window)
    gameFullscreen: false, // --game-fullscreen (separate test window fullscreen)
    extra: [],
  };
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--headless') out.headless = true;
    else if (a === '--headfull') { out.headfull = true; out.headless = false; }
    else if (a === '--game' && args[i + 1]) out.game = args[++i];
    else if (a === '--autoplay' || a === '--start-agent') out.autoplay = true;
    else if (a === '--handoff-on-exit') out.handoffOnExit = true;
    else if (a === '--handoff') out.handoffOnly = true;
    else if (a === '--heal') out.heal = true;
    else if (a === '--heal-iterations' && args[i + 1]) out.healIterations = parseInt(args[++i], 10) || 3;
    else if ((a === '--max-ticks' || a === '--ticks') && args[i + 1]) out.maxTicks = Math.max(0, parseInt(args[++i], 10) || 0);
    else if (a === '--enable-gpu') out.enableGpu = true;
    else if ((a === '--window-size' || a === '--window') && args[i + 1]) out.windowSize = parseDisplaySize(args[++i]);
    else if (a === '--fullscreen') { out.fullscreen = true; out.displayMode = 'fullscreen'; }
    else if (a === '--display-mode' && args[i + 1]) {
      const m = String(args[++i]).toLowerCase();
      if (m === 'windowed' || m === 'fullscreen' || m === 'split' || m === 'game-focus') {
        out.displayMode = m;
        if (m === 'fullscreen') out.fullscreen = true;
      }
    }
    else if (a === '--split') out.displayMode = 'split';
    else if (a === '--game-window-size' && args[i + 1]) out.gameWindowSize = parseDisplaySize(args[++i]);
    else if (a === '--game-fullscreen') out.gameFullscreen = true;
    else out.extra.push(a);
  }
  return out;
}

// Shared singleton per process (lazy).
let _shared = null;
function getSharedLog(source) {
  if (!_shared) _shared = new SmartLog({ source: source || 'vibecodeworker' });
  return _shared;
}

/** Tee console.* into the smart log (call once at process boot). Returns restore fn. */
function teeConsole(smartlog, opts) {
  const log = smartlog || getSharedLog((opts && opts.source) || 'vibecodeworker');
  const levels = { log: 'info', info: 'info', warn: 'warn', error: 'error', debug: 'info' };
  const originals = {};
  for (const [method, level] of Object.entries(levels)) {
    originals[method] = console[method];
    console[method] = (...a) => {
      try {
        const msg = a.map(x => (typeof x === 'string' ? x : safeStringify(x))).join(' ');
        if (!/^\[SmartLog\]/.test(msg)) log.log(level, 'console', msg.slice(0, 2000));
      } catch (e) {}
      originals[method](...a);
    };
  }
  const onUncaught = (err) => {
    try { log.error('Uncaught exception: ' + (err && err.message ? err.message : err), { category: 'lifecycle', stack: err && err.stack }); } catch (e) {}
  };
  const onUnhandled = (reason) => {
    try { log.error('Unhandled rejection: ' + (reason && reason.message ? reason.message : safeStringify(reason)), { category: 'lifecycle', stack: reason && reason.stack }); } catch (e) {}
  };
  process.on('uncaughtException', onUncaught);
  process.on('unhandledRejection', onUnhandled);
  return () => {
    for (const [method, fn] of Object.entries(originals)) console[method] = fn;
    process.removeListener('uncaughtException', onUncaught);
    process.removeListener('unhandledRejection', onUnhandled);
  };
}

function safeStringify(x) {
  try {
    if (x instanceof Error) return x.stack || `${x.name}: ${x.message}`;
    return typeof x === 'string' ? x : JSON.stringify(x);
  } catch (e) { return String(x); }
}

module.exports = {
  SmartLog,
  getLogDir,
  getSharedLog,
  teeConsole,
  parseWorkerArgs,
  normalizeMessage,
  clusterRows,
};
