/**
 * End-to-end playtest: AI-whack-a-mole gets launched from the hub catalogue
 * into the real dashboard viewport, its per-game rules auto-resolve into the
 * agent's Test Focus, and the offline heuristic brain plays real steps
 * against the live game (zero LLM cost, zero network quota).
 *
 * Run:  node tests/test_aiwhackamole_e2e.js   (from ai/v1/vibecodeworker)
 * The file re-spawns itself inside Electron, like test_hub_headful.js.
 */
const path = require('path');
const fs = require('fs');

const APP_DIR = path.join(__dirname, '..');
const SHOT_DIR = 'C:/Users/ventu/AppData/Local/Temp/opencode/shots';

const isElectron = !!(process.versions && process.versions.electron);
if (!isElectron) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe'),
    [__filename], { stdio: 'inherit', cwd: APP_DIR });
  process.exit(r.status === null ? 1 : r.status);
}

const { app, BrowserWindow, ipcMain } = require('electron');
const results = { stages: [], errors: [], shots: [], observations: {} };
function stage(name, ok, detail) {
  results.stages.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { scanSourceDirectory } = require(path.join(APP_DIR, 'src', 'main_process', 'file_scanner'));

  ipcMain.handle('test-api-keys', async () => ({ success: true, results: [] }));
  ipcMain.handle('is-game-window-active', () => false);
  ipcMain.handle('open-game-window', async () => ({ success: true, stubbed: true }));
  ipcMain.handle('capture-game-screenshot', async () => ({ success: false }));
  ipcMain.handle('scan-directory', async (_e, d) => scanSourceDirectory(d));
  ipcMain.handle('run-input-sim', async () => ({ success: true }));
  ipcMain.handle('generate-commentary-speech', async () => ({ success: false }));
  // Display IPC (mirrors app/main.js): HD windowed dashboard, game-window stubs.
  ipcMain.handle('get-display-config', async () => {
    const b = win.getBounds();
    return { mode: 'windowed', x: b.x, y: b.y, width: b.width, height: b.height, fullscreen: false, headless: false, gameWindowActive: false, gameWindow: null };
  });
  ipcMain.handle('set-display-mode', async (_e, req = {}) => {
    const mode = String(req.mode || 'windowed').toLowerCase();
    if (mode === 'fullscreen') win.setFullScreen(true);
    else {
      try { win.setFullScreen(false); } catch (_) {}
      win.setBounds({ x: 0, y: 0, width: Number(req.width) || 1920, height: Number(req.height) || 1080 });
    }
    win.show(); win.focus();
    const b = win.getBounds();
    return { success: true, mode, x: b.x, y: b.y, width: b.width, height: b.height };
  });
  ipcMain.handle('focus-game-window', async () => ({ success: false, error: 'Game window is not open' }));

  await app.whenReady();
  const win = new BrowserWindow({
    width: 1920, height: 1080, show: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webviewTag: true }
  });

  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (/Electron Security Warning/.test(message)) return;
    if (level >= 2) {
      results.errors.push(`console[${level}] ${String(message).slice(0, 300)} @${sourceId}:${line}`);
      console.error(`[page-error] ${String(message).slice(0, 300)} @${sourceId}:${line}`);
    }
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => results.errors.push(`did-fail-load ${code} ${desc}`));
  win.webContents.on('render-process-gone', (_e, d) => results.errors.push(`render-process-gone ${d.reason}`));

  const run = (code) => win.webContents.executeJavaScript(code);
  // Execute JS inside the game guest (the <webview>), returning a clone-safe value.
  // Null-safe: a guest mid-reload reports 'guest-busy' instead of killing the run.
  const guest = (code) => run(
    `document.getElementById('game-webview').executeJavaScript(${JSON.stringify(code)}).catch(() => 'guest-busy')`
  );
  const shot = async (name) => {
    const img = await win.capturePage();
    const file = path.join(SHOT_DIR, name);
    fs.writeFileSync(file, img.toPNG());
    results.shots.push(file);
    console.log(`[e2e] shot ${file}`);
  };
  const visible = (id) => run(
    `(() => { const n = document.getElementById('${id}'); if (!n) return 'missing'; ` +
    `return n.classList.contains('hidden') ? 'hidden' : 'visible'; })()`
  );
  const click = (id) => run(
    `(() => { const n = document.getElementById('${id}'); if (!n) return 'missing'; ` +
    `n.scrollIntoView({block:'nearest'}); n.click(); return 'clicked'; })()`
  );

  await win.loadFile(path.join(APP_DIR, 'src', 'index.html'));
  await sleep(6000);

  // --- 1. Boot ---
  stage('boot: no page errors', results.errors.length === 0, `${results.errors.length} errors`);
  stage('boot: hub visible first', (await visible('hub-workspace')) === 'visible');
  await shot('e2e-01-boot.png');

  // --- 2. Catalogue -> launch AI-whack-a-mole ---
  stage('catalogue opens', (await click('card-load-4weird')) === 'clicked');
  await sleep(800);
  const launched = await run(
    `(() => { const cards = Array.from(document.querySelectorAll('#modal-games-list .modal-game-item')); ` +
    `const c = cards.find(x => /whack/i.test(x.innerText)); if (!c) return 'missing:' + cards.length; ` +
    `c.click(); return 'clicked'; })()`
  );
  stage('whackamole card launched', launched === 'clicked', launched);
  await sleep(1500);
  stage('editor shown', (await visible('editor-workspace')) === 'visible');
  const gameUrl = await run(`document.getElementById('game-url').value`);
  stage('target is aiwhackamole', /aiwhackamole/.test(gameUrl), gameUrl.slice(0, 90));

  // --- 3. Guest page actually loaded ---
  let guestTitle = '';
  for (let i = 0; i < 10 && !/whack/i.test(guestTitle); i++) {
    await sleep(1000);
    try { guestTitle = await guest('document.title'); } catch (e) { guestTitle = ''; }
  }
  stage('guest game page loaded', /whack/i.test(guestTitle), guestTitle);
  const startBtn = await guest(`!!document.getElementById('TEMPLATE-4weird-start-btn')`);
  stage('guest exposes Start button', startBtn === true);
  await shot('e2e-02-game-loaded.png');

  // --- 4. Rules awareness: file rules now, on-page enrichment after load ---
  const rulesNow = await run(`document.getElementById('game-rules').value`);
  stage('rules mention whacking Bad AIs', /whack/i.test(rulesNow) && /bad/i.test(rulesNow),
    rulesNow.split('\n')[0].slice(0, 100));
  stage('rules carry timer/win knowledge', /60-second|win condition/i.test(rulesNow));
  await sleep(3000); // allow did-finish-load page scrape to merge
  const rulesAfter = await run(`document.getElementById('game-rules').value`);
  stage('on-page meta rules merged', /spare good/i.test(rulesAfter),
    `${rulesAfter.split('\n').length} lines`);
  const logText = await run(`document.getElementById('log-stream').innerText.slice(-600)`);
  stage('rules load logged', /Game rules ready/.test(logText));

  // --- 5. Heuristic playtest: real steps, real clicks, $0 LLM ---
  win.show(); win.focus(); win.moveTop();
  await sleep(1000);
  const scoreBefore = await guest(`(document.getElementById('hud-score') || {}).textContent ?? 'n/a'`);
  const timeBefore = await guest(`(document.getElementById('hud-time') || {}).textContent ?? 'n/a'`);
  const errBeforeSteps = results.errors.length;
  let steps = 0;
  for (let i = 0; i < 6; i++) {
    await run(`window.triggerAgentStep(); 'step';`);
    await sleep(6000);
    steps = await run(`window.getAgentStatus ? window.getAgentStatus().steps : -1`);
    if (steps >= 3) break;
  }
  stage('heuristic steps executed', steps >= 1, `steps=${steps}`);
  stage('steps caused no page errors', results.errors.length === errBeforeSteps,
    `new=${results.errors.length - errBeforeSteps}`);
  const scoreAfter = await guest(`(document.getElementById('hud-score') || {}).textContent ?? 'n/a'`);
  const timeAfter = await guest(`(document.getElementById('hud-time') || {}).textContent ?? 'n/a'`);
  results.observations = { scoreBefore, scoreAfter, timeBefore, timeAfter, steps };
  console.log(`[e2e] observe score ${scoreBefore} -> ${scoreAfter}, timer ${timeBefore} -> ${timeAfter}`);
  await shot('e2e-03-playtesting.png');

  const failed = results.stages.filter((s) => !s.ok);
  console.log(`\n[e2e] ${results.stages.length - failed.length}/${results.stages.length} stages passed, ${results.errors.length} page errors.`);
  if (results.errors.length) console.error('[e2e] page errors:\n - ' + results.errors.join('\n - '));
  fs.writeFileSync(path.join(SHOT_DIR, 'e2e-whackamole-summary.json'), JSON.stringify({ ok: !failed.length && !results.errors.length, ...results }, null, 2));
  app.exit(failed.length || results.errors.length ? 1 : 0);
}

main().catch((err) => { console.error('[e2e] fatal', err); try { app.exit(1); } catch (e) { process.exit(1); } });
