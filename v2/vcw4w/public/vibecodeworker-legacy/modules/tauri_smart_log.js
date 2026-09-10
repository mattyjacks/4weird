/* ==========================================================================
   TAURI SMART-LOG FORWARDER + CLI/HEADFULL CONTROL
   --------------------------------------------------------------------------
   - Mirrors every telemetry row (via state.logs.push) into the exe's file log
     (%APPDATA%/vibecodeworker/logs/vibe-YYYY-MM-DD.jsonl) through Rust.
   - Captures window errors + unhandled rejections the telemetry misses.
   - Applies Tauri CLI args: --headfull/--show, --hidden, --game <id|url>,
     --autoplay, --handoff  →  e.g. `vibecodeworker-4weird.exe --headfull
     --game gravegain3d --autoplay`
   - Floating 📋 Handoff button = MANUAL feed (writes smart-handoff-*.md +
     latest-handoff.md via Rust, shows the path to paste into any vibecoding
     tool). AUTO feed: feedHandoffToOpenCode() POSTs it to a local/remote
     VibeCodeWorker's /api/opencode/handoff + starts a heal run.
   ========================================================================== */

import { state, el, isTauriRuntime, invokeTauriCommand } from './core_state.js';
import { log } from './telemetry_logger.js';

let booted = false;
let cliArgs = [];

function fireAndForget(promise) {
  if (promise && typeof promise.catch === 'function') promise.catch(() => {});
}

export function smartFileLog(level, category, message) {
  if (!isTauriRuntime()) return;
  fireAndForget(invokeTauriCommand('append_smart_log', {
    level: String(level || 'info'),
    category: String(category || 'frontend'),
    message: String(message == null ? '' : message).slice(0, 2000),
  }));
}

function hookTelemetryMirror() {
  try {
    const arr = state.logs;
    if (!arr || arr.__smartHooked) return;
    const origPush = arr.push.bind(arr);
    arr.push = (...items) => {
      for (const row of items) {
        try {
          const type = (row && row.type) || 'system';
          if (type === 'error' || type === 'warning' || type === 'warn') {
            smartFileLog(type === 'warning' || type === 'warn' ? 'warn' : 'error', 'frontend',
              `${row.message || ''}`);
          }
        } catch (e) { /* never break telemetry */ }
      }
      return origPush(...items);
    };
    arr.__smartHooked = true;
  } catch (e) { /* state not ready */ }
}

function hookWindowErrors() {
  window.addEventListener('error', (ev) => {
    smartFileLog('error', 'frontend',
      `window.onerror: ${ev.message || ''} @ ${ev.filename || ''}:${ev.lineno || ''}:${ev.colno || ''}`);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason;
    smartFileLog('error', 'frontend',
      `unhandledrejection: ${(r && (r.stack || r.message)) || String(r)}`.slice(0, 2000));
  });
}

function parseCli(argv) {
  const out = { headfull: false, hidden: false, game: null, autoplay: false, handoff: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--headfull' || a === '--show') out.headfull = true;
    else if (a === '--hidden' || a === '--headless' || a === '--minimized') out.hidden = true;
    else if (a === '--game' && argv[i + 1]) out.game = argv[++i];
    else if (a === '--autoplay' || a === '--start-agent') out.autoplay = true;
    else if (a === '--handoff') out.handoff = true;
  }
  if (out.headfull) out.hidden = false; // --headfull always wins
  return out;
}

function resolveGameTarget(game) {
  if (!game) return null;
  if (/^https?:\/\//.test(game) || game.includes('/')) return game;
  const id = game.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Hub game ids map to website/v1/games/html/<id>/index.html
  return `../games/html/${id}/index.html`;
}

async function applyCli(loadGameTarget, initiateTesting) {
  let args = [];
  try {
    args = (await invokeTauriCommand('get_cli_args')) || [];
  } catch (e) { args = []; }
  cliArgs = args;
  const cli = parseCli(args);
  smartFileLog('info', 'lifecycle', `Tauri frontend boot args: ${JSON.stringify(args)}`);
  if (cli.headfull) log('🖥️ CLI --headfull: running with visible window.', 'system');

  if (cli.game && el.gameTarget) {
    const target = resolveGameTarget(cli.game);
    el.gameTarget.value = target;
    log(`🎯 CLI --game: loading ${target}`, 'system');
    smartFileLog('info', 'game', `CLI --game loading ${target}`);
    try { loadGameTarget(); } catch (e) { smartFileLog('error', 'game', `CLI --game failed: ${e.message}`); }
  }
  if (cli.autoplay) {
    log('▶️ CLI --autoplay: starting agent in 2s…', 'system');
    setTimeout(() => {
      try { initiateTesting(); } catch (e) { smartFileLog('error', 'game', `CLI --autoplay failed: ${e.message}`); }
    }, 2000);
  }
  if (cli.handoff) {
    setTimeout(() => writeHandoffFile('cli --handoff boot run'), 4000);
  }
  return cli;
}

/* ---------- handoff (manual + auto feed) ---------- */

function normalizeMsg(m) {
  return String(m || '').replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<ts>')
    .replace(/\b\d{4,}\b/g, '<n>').slice(0, 160);
}

export function buildHandoffMarkdown(reason) {
  const rows = (state.logs || []).slice(-500);
  const bad = rows.filter(r => r.type === 'error' || r.type === 'warning' || r.type === 'warn');
  const clusters = new Map();
  for (const r of bad) {
    const key = `${r.type}:${normalizeMsg(r.message)}`;
    if (!clusters.has(key)) clusters.set(key, { type: r.type, title: normalizeMsg(r.message), count: 0, first: r.time, last: r.time });
    const c = clusters.get(key);
    c.count++; c.last = r.time;
  }
  const L = [];
    L.push(`# VibeCodeWorker smart-log handoff (Tauri exe) - ${new Date().toISOString()}`);
  L.push('');
  L.push(`- **Reason:** ${reason || 'manual handoff'}`);
  L.push(`- **Rows scanned:** ${rows.length} (frontend telemetry mirror; full JSONL lives beside this file)`);
  L.push(`- **Perf:** ${JSON.stringify(state.performance || state.metrics || {}).slice(0, 400)}`);
  L.push('');
  const list = [...clusters.values()].sort((a, b) => b.count - a.count);
  if (list.length === 0) {
    L.push('## Error clusters\n_None in this session — worker looks healthy._');
  } else {
    L.push(`## Error clusters (${list.length})`);
    list.slice(0, 15).forEach((c, i) => {
      L.push(`### ${i + 1}. x${c.count} [${c.type}] ${c.title}`);
      L.push(`- First: ${c.first} · Last: ${c.last}`);
    });
  }
  L.push('');
  L.push('## Recent log tail (last 30)');
  rows.slice(-30).forEach(r => L.push(`- [${r.time}] [${r.type}] ${String(r.message).slice(0, 220)}`));
  L.push('');
  L.push('## Suggested next step for the coding agent');
  L.push(list.length > 0
    ? `Reproduce cluster #1 ("${list[0].title}"), add a regression test, fix, re-run.`
    : 'No failures - extend playtest coverage, then re-run the suite.');
  return L.join('\n').replace(/—/g, '-').replace(/→/g, '->').replace(/[“”]/g, '"');
}

export async function writeHandoffFile(reason) {
  const md = buildHandoffMarkdown(reason);
  if (!isTauriRuntime()) {
    // Browser fallback: download the file (still a valid manual feed).
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'smart-handoff.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return { success: true, path: 'smart-handoff.md (downloaded)' };
  }
  const res = await invokeTauriCommand('save_handoff_file', { content: md });
  if (res) log(`📋 Handoff written: <code>${res.path}</code> — paste it into any vibecoding tool.`, 'success');
  smartFileLog('info', 'handoff', `handoff written: ${res && res.path}`);
  return res;
}

export async function copyHandoffToClipboard() {
  const res = await invokeTauriCommand('read_latest_handoff');
  if (res && res.success && navigator.clipboard) {
    await navigator.clipboard.writeText(res.markdown);
    log('📋 Latest handoff copied to clipboard.', 'success');
    return true;
  }
  log('⚠️ No handoff yet — press 📋 Handoff first.', 'warning');
  return false;
}

/** AUTO feed: push the handoff into a VibeCodeWorker (local or remote) and start healing. */
export async function feedHandoffToOpenCode(workerUrl, gameId, maxIterations) {
  const base = (workerUrl || 'http://127.0.0.1:42069').replace(/\/$/, '');
  const md = buildHandoffMarkdown('auto-feed to OpenCode heal');
  await invokeTauriCommand('save_handoff_file', { content: md });
  const gen = await fetch(`${base}/api/opencode/handoff`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'tauri exe auto-feed', includeBugs: true }),
  }).then(r => r.json()).catch(e => ({ success: false, error: e.message }));
  if (!gen.success) {
    log(`⚠️ Auto-feed failed (is a VibeCodeWorker running at ${base}?): ${gen.error || ''}`, 'warning');
    return gen;
  }
  const heal = await fetch(`${base}/api/opencode/heal`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId: gameId || 'tauri-session', maxIterations: maxIterations || 3, instance: 'fresh' }),
  }).then(r => r.json()).catch(e => ({ success: false, error: e.message }));
  if (heal.success) log(`🤖 Heal run started: <code>${heal.runId}</code> — watch it at ${base}/api/opencode/heal/${heal.runId}`, 'success');
  else log(`⚠️ Heal start failed: ${heal.error || ''}`, 'warning');
  return heal;
}

function injectHandoffButton() {
  if (document.getElementById('btn-tauri-handoff')) return;
  const btn = document.createElement('button');
  btn.id = 'btn-tauri-handoff';
  btn.title = 'Write smart-log handoff file (manual feed for vibecoding tools). Shift+click copies latest to clipboard.';
  btn.textContent = '📋 Handoff';
  btn.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;padding:10px 14px;border-radius:10px;border:1px solid #38bdf8;background:rgba(2,132,199,.9);color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.45);';
  btn.addEventListener('click', async (ev) => {
    if (ev.shiftKey) { await copyHandoffToClipboard(); return; }
    await writeHandoffFile('floating 📋 button');
  });
  document.body.appendChild(btn);
}

export async function initTauriSmartLog({ loadGameTarget, initiateTesting } = {}) {
  if (booted) return cliArgs;
  booted = true;
  if (!isTauriRuntime()) return cliArgs; // plain browser: nothing to mirror into
  hookTelemetryMirror();
  hookWindowErrors();
  injectHandoffButton();
  try {
    const dir = await invokeTauriCommand('get_log_dir');
    smartFileLog('info', 'lifecycle', `Tauri smart-log forwarder on. Log dir: ${dir}`);
  } catch (e) { /* file logging best-effort */ }
  return applyCli(loadGameTarget, initiateTesting);
}
