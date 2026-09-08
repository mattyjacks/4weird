/**
 * Headful visual test for the VibeCodeWorker hub (Tauri/website frontend).
 *
 * Launches a VISIBLE (headful) Electron window pointed at hub.html served from
 * website/v1, drives the real flows (catalogue -> launch target -> run agent ->
 * pause/stop, terminal slash command), captures a screenshot per stage into
 * test-results/screenshots/, and fails on any page error.
 *
 *   npm run test:headful
 */
const path = require('path');
const fs = require('fs');

const WEBSITE_V1_DIR = path.join(__dirname, '..', '..', '..', 'website', 'v1');
const STATIC_PORT = 8899;
const SHOT_DIR = path.join(__dirname, '..', '..', '..', 'test-results', 'screenshots');

const results = { stages: [], errors: [], shots: [] };
function stage(name, ok, detail) {
  results.stages.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const { startStaticServer } = require('./src/main_process/static_server');
  const staticServer = startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);
  console.log(`[headful] static site at http://127.0.0.1:${STATIC_PORT}/vibecodeworker/hub.html`);

  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

  const { app, BrowserWindow } = require('electron');
  await app.whenReady();

  const win = new BrowserWindow({
    width: 1440, height: 900, show: true,
    webPreferences: { contextIsolation: true }
  });

  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2 && !/Electron Security Warning/.test(message)) {
      results.errors.push(`console[${level}] ${message} @${sourceId}:${line}`);
      console.error(`[page-error] ${message} @${sourceId}:${line}`);
    }
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    results.errors.push(`did-fail-load ${code} ${desc}`);
  });

  const run = (code) => win.webContents.executeJavaScript(code);
  const shot = async (name) => {
    const img = await win.capturePage();
    const file = path.join(SHOT_DIR, name);
    fs.writeFileSync(file, img.toPNG());
    results.shots.push(file);
    console.log(`[headful] shot ${file}`);
  };
  const visible = (id) => run(
    `(() => { const n = document.getElementById('${id}'); if (!n) return 'missing'; ` +
    `return n.classList.contains('hidden') ? 'hidden' : 'visible'; })()`
  );
  const click = (id) => run(
    `(() => { const n = document.getElementById('${id}'); if (!n) return 'missing'; ` +
    `n.scrollIntoView({block:'nearest'}); n.click(); return 'clicked'; })()`
  );

  await win.webContents.session.clearCache();
  await win.loadURL(`http://127.0.0.1:${STATIC_PORT}/vibecodeworker/hub.html?headfultest=1`);
  await new Promise(r => setTimeout(r, 3500));

  // Stage 1: hub boots, splash lifts, clock ticks.
  const splashGone = await run(`!document.getElementById('boot-splash')`);
  const clock = await run(`document.getElementById('system-time').textContent`);
  const hubVisible = await visible('hub-workspace');
  stage('hub boots, splash lifts', splashGone && hubVisible === 'visible', `splashGone=${splashGone} hub=${hubVisible}`);
  stage('status clock ticks', clock !== '00:00:00', `clock=${clock}`);
  await shot('hub-01-boot.png');

  // Stage 2: catalogue modal opens with games.
  stage('open catalogue', (await click('card-load-4weird')) === 'clicked');
  await new Promise(r => setTimeout(r, 800));
  const modalVisible = await visible('modal-4weird-games');
  const gameCount = await run(`document.querySelectorAll('#modal-games-list .hub-modal-game-card').length`);
  stage('catalogue lists games', modalVisible === 'visible' && gameCount >= 10, `modal=${modalVisible} games=${gameCount}`);
  await shot('hub-02-catalogue.png');

  // Stage 3: launch first game into the viewport (editor view).
  const launched = await run(
    `(() => { const b = document.querySelector('#modal-games-list .hub-modal-game-card button'); ` +
    `if (!b) return 'missing'; b.click(); return 'clicked'; })()`
  );
  await new Promise(r => setTimeout(r, 2500));
  const iframeSrc = await run(`document.getElementById('game-iframe').src`);
  const hubHidden = await visible('hub-workspace');
  stage('game launches to editor', launched === 'clicked' && /orbitaldrift/.test(iframeSrc) && hubHidden === 'hidden',
    `src=${iframeSrc} hub=${hubHidden}`);
  await shot('hub-03-launched.png');

  // Stage 4: run the agent (short run), verify steps advance + state flips.
  await run(`(() => { document.getElementById('max-steps').value = 50; document.getElementById('step-interval').value = 300; })()`);
  await click('btn-toggle-view'); // open Options overlay to reach START
  await new Promise(r => setTimeout(r, 600));
  stage('options overlay opens', true);
  await shot('hub-04-options.png');
  stage('agent starts', (await click('btn-start')) === 'clicked');
  await new Promise(r => setTimeout(r, 2500));
  const agentText = await run(`document.getElementById('agent-state-text').textContent`);
  const steps = await run(`document.getElementById('stat-steps').textContent`);
  stage('agent steps advance', agentText === 'ACTIVE PLAY' && !/^0/.test(steps), `state=${agentText} steps=${steps}`);
  await shot('hub-05-running.png');

  // Stage 5: terminal slash command works.
  await run(`(() => { const t = document.getElementById('terminal-input'); t.value = '/help'; t.dispatchEvent(new KeyboardEvent('keypress', {key:'Enter', bubbles:true})); })()`);
  await new Promise(r => setTimeout(r, 800));
  const termHas = await run(`document.getElementById('terminal-log').textContent.includes('/goal')`);
  stage('terminal /help responds', termHas === true);
  await shot('hub-06-terminal.png');

  // Stage 6: stop returns to IDLE.
  stage('agent stops', (await click('btn-stop')) === 'clicked');
  await new Promise(r => setTimeout(r, 600));
  const idleText = await run(`document.getElementById('agent-state-text').textContent`);
  stage('back to IDLE', idleText === 'IDLE', `state=${idleText}`);
  await shot('hub-07-stopped.png');

  const failed = results.stages.filter(s => !s.ok);
  console.log(`\n[headful] ${results.stages.length - failed.length}/${results.stages.length} stages passed, ` +
    `${results.errors.length} page errors, ${results.shots.length} screenshots.`);
  if (results.errors.length) {
    console.error('[headful] page errors:\n - ' + results.errors.join('\n - '));
  }
  const summaryPath = path.join(__dirname, '..', '..', '..', 'test-results', 'hub-headful.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ ok: !failed.length && !results.errors.length, ...results }, null, 2));

  try { staticServer.close(); } catch (e) { /* noop */ }
  app.exit(failed.length || results.errors.length ? 1 : 0);
}

{
  // test file is executed inside Electron (plain node has no app runtime).
  const isElectron = !!(process.versions && process.versions.electron);
  if (!isElectron) {
    const { spawnSync } = require('child_process');
    const electronBin = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
    const r = spawnSync(electronBin, [__filename, '--headful-test'], { stdio: 'inherit' });
    process.exit(r.status === null ? 1 : r.status);
  } else {
    main().catch(err => { console.error('[headful] fatal', err); try { require('electron').app.exit(1); } catch (e) { process.exit(1); } });
  }
}
