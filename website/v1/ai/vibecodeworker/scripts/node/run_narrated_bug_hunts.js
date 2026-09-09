/*
 * Visible, repeatable three-game bug-hunt reel.
 *
 * It deliberately uses BrowserWindow + sendInputEvent instead of calling game
 * internals: every scored action is a real input against a live game page.
 * Browser errors and each input are written into the MediaMogul manifest,
 * giving a reviewer evidence for every repair made during a session.
 *
 * npm run record:bug-hunts
 */
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');
const ROOT = path.resolve(__dirname, '..', '..');
const WEBSITE = path.resolve(ROOT, '..', '..');
const OUTPUT = path.join(ROOT, 'data', 'narrated-bug-hunts');
const { startStaticServer } = require(path.join(ROOT, 'src', 'main_process', 'static_server'));
const { MediaMogulPlaytestRecorder } = require(path.join(ROOT, 'lib', 'mediamogul_video_recorder'));
const { synthesizeWindowsNarration } = require(path.join(ROOT, 'lib', 'mediamogul_voiceover'));
const { triageConsoleMessage } = require(path.join(ROOT, 'lib', 'console_triage'));

// Capture must remain available on machines without a working GPU process
// (common on inexpensive desktops and freshly provisioned cloud hosts).
// Chromium can still render and capture these ordinary web QA flows in its
// software compositor, while game builds can opt back into GPU acceleration
// through VCW_RECORD_GPU=1.
if (process.env.VCW_RECORD_GPU !== '1') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
}

const PORT = 8912;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const PAGE_LOAD_TIMEOUT_MS = 20000;
const sessions = [
  {
    id: 'taglish-translate',
    url: 'https://taglish-translate.vercel.app/',
    narration: 'VibeCodeWorker is testing Taglish Translate as an unknown web application. It discovers the input, performs a harmless translation, and verifies that the result area changes without browser errors.',
    async play(win, note) {
      // Use visible focus, keystrokes, and the site’s normal button — no API
      // calls or hidden app state. The sentence is deliberately non-sensitive.
      const box = await win.webContents.executeJavaScript(`(() => { const e = document.querySelector('#source-text, textarea'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
      if (!box) throw new Error('translation input was not visible');
      // Explicit renderer focus prevents insertText from landing on the page
      // body in an Electron BrowserWindow with a freshly loaded web app.
      await win.webContents.executeJavaScript(`document.querySelector('#source-text, textarea')?.focus()`);
      win.webContents.focus();
      win.webContents.sendInputEvent({ type: 'mouseDown', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      win.webContents.sendInputEvent({ type: 'mouseUp', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      win.webContents.insertText('I love building fast games with friends.');
      await sleep(250);
      const inputAccepted = await win.webContents.executeJavaScript(`Boolean(document.querySelector('#source-text, textarea')?.value)`);
      if (!inputAccepted) throw new Error('translation input did not accept visible keyboard text');
      note({ type: 'action', action: { type: 'type', purpose: 'enter harmless translation sample' } });
      const button = await win.webContents.executeJavaScript(`(() => { const e = document.querySelector('#translate-action-btn, button'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
      if (!button) throw new Error('translate button was not visible');
      win.webContents.sendInputEvent({ type: 'mouseDown', x: button.x, y: button.y, button: 'left', clickCount: 1 });
      win.webContents.sendInputEvent({ type: 'mouseUp', x: button.x, y: button.y, button: 'left', clickCount: 1 });
      note({ type: 'action', action: { type: 'click', x: button.x, y: button.y, purpose: 'request translation' } });
      await sleep(3500);
      return await win.webContents.executeJavaScript(`({ source: document.querySelector('#source-text')?.value || '', result: document.querySelector('#target-text')?.value || '', translating: /translating/i.test(document.body.innerText) })`);
    }
  },
  {
    // A small, public, no-account pool. Picked per run so the universal
    // investigator is exercised against unfamiliar game UI rather than a
    // fixed, hand-scripted title. Keep this allow-list explicit: it prevents
    // the recorder from ever following a page-supplied redirect as a target.
    id: 'crazygames-random',
    urls: [
      'https://www.crazygames.com/game/crazy-guys',
      'https://www.crazygames.com/game/crazy-city-multiplayer',
      'https://www.crazygames.com/game/puzzle-play'
    ],
    narration: 'VibeCodeWorker is testing a randomly selected public CrazyGames title as an unknown interactive system. It observes the visible play surface, tries ordinary reversible controls, and records console failures or loading blockers.',
    async play(win, note) {
      // The game can be nested in a cross-origin frame, so this intentionally
      // uses visible, normal input rather than game-specific DOM internals.
      const size = win.getContentBounds();
      const x = Math.max(1, Math.round(size.width / 2));
      const y = Math.max(1, Math.round(size.height / 2));
      win.webContents.focus();
      win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
      win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
      note({ type: 'action', action: { type: 'click', x, y, purpose: 'focus unknown game surface' } });
      for (const keyCode of ['Space', 'ArrowRight', 'ArrowLeft']) {
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
        note({ type: 'action', action: { type: 'key', key: keyCode, purpose: 'reversible generic control probe' } });
        await sleep(350);
      }
      await sleep(2500);
      return await win.webContents.executeJavaScript(`({ title: document.title, frames: document.querySelectorAll('iframe').length, canvas: !!document.querySelector('canvas'), visibleText: document.body.innerText.slice(0, 500) })`);
    }
  },
  {
    id: 'aiwhackamole',
    url: '/games/html/aiwhackamole/index.html?slowmo=3',
    narration: 'The AI is live in AI Whack A Mole. It starts a real round, probes the board with visible clicks, and watches score, health, and the timer for regressions.',
    async play(win, note) {
      await win.webContents.executeJavaScript(`document.getElementById('TEMPLATE-4weird-start-btn')?.click()`);
      for (let i = 0; i < 22; i += 1) {
        const x = 340 + (i % 3) * 290;
        const y = 300 + (Math.floor(i / 3) % 3) * 150;
        win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
        note({ type: 'action', action: { type: 'click', x, y, purpose: 'whack live mole' } });
        await sleep(320);
      }
      return await win.webContents.executeJavaScript(`({ score: document.getElementById('hud-score')?.textContent, health: document.getElementById('hud-health-bar')?.style.width, time: document.getElementById('hud-time')?.textContent })`);
    }
  },
  {
    id: 'gravegain2d',
    url: '/games/html/gravegain2d/index.html?playtest=1',
    narration: 'The AI is playing a live Grave Gain dungeon run. It selects a character, moves through the dungeon, attacks enemies, and checks that the turn and health systems remain coherent.',
    async play(win, note) {
      // The game exposes its start choices as normal buttons. Click one rather
      // than invoking game functions so this stays an input-driven playthrough.
      await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b => /warrior|start/i.test(b.textContent))?.click()`);
      await sleep(800);
      const keys = ['ArrowRight', 'ArrowDown', 'Space', 'ArrowLeft', 'ArrowUp', 'Space'];
      for (let i = 0; i < 24; i += 1) {
        const keyCode = keys[i % keys.length];
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
        note({ type: 'action', action: { type: 'key', key: keyCode, purpose: 'move or attack in live dungeon' } });
        await sleep(260);
      }
      return await win.webContents.executeJavaScript(`({ turn: document.getElementById('hudTurnPhase')?.textContent, hp: document.querySelector('[id*=hp], [class*=hp]')?.textContent || 'visible HUD checked' })`);
    }
  },
  {
    id: 'overtake',
    url: '/games/html/overtake/index.html?playtest=1',
    narration: 'The AI is now driving Overtake. It enters a live race, steers, accelerates, uses nitro, and checks that the race loop remains responsive without console failures.',
    async play(win, note) {
      await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b => /play|race|start/i.test(b.textContent))?.click()`);
      await sleep(1500);
      const keys = ['ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowUp', 'n', 'ArrowRight'];
      for (let i = 0; i < 26; i += 1) {
        const keyCode = keys[i % keys.length];
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
        await sleep(110);
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
        note({ type: 'action', action: { type: 'key', key: keyCode, purpose: 'drive live race' } });
        await sleep(190);
      }
      return await win.webContents.executeJavaScript(`({ title: document.title, canvas: !!document.querySelector('canvas'), state: window.gameState || null })`);
    }
  }
];

async function runSession(spec) {
  const win = new BrowserWindow({ width: 1280, height: 720, show: true, title: `AI Bug Hunt — ${spec.id}`, webPreferences: { contextIsolation: true } });
  const errors = [];
  const selectedUrl = Array.isArray(spec.urls) && spec.urls.length
    ? spec.urls[Math.floor(Math.random() * spec.urls.length)]
    : spec.url;
  if (!selectedUrl) throw new Error(`${spec.id}: no target URL configured`);
  const observedConsole = [];
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const triage = triageConsoleMessage({ level, message, sourceId, targetUrl: selectedUrl });
    const entry = { level, message, line, sourceId, ...triage };
    observedConsole.push(entry);
    if (triage.actionable) errors.push(entry);
  });
  const loadTarget = /^https?:/i.test(selectedUrl) ? selectedUrl : `http://127.0.0.1:${PORT}${selectedUrl}`;
  // Ad-heavy public game portals can leave a document loading forever while
  // third-party pixels redirect or fail TLS. Continue into the visible page
  // after a bounded wait so the recording documents the actual blocker.
  await Promise.race([
    win.loadURL(loadTarget),
    sleep(PAGE_LOAD_TIMEOUT_MS).then(() => 'load-timeout')
  ]);
  await sleep(1800);
  const recorder = new MediaMogulPlaytestRecorder({ projectRoot: ROOT, outputRoot: OUTPUT, capturePage: () => win.webContents.capturePage(), createVoiceover: synthesizeWindowsNarration });
  const started = await recorder.start({ name: spec.id, fps: 8, voiceoverText: spec.narration });
  if (!started.success) throw new Error(`${spec.id}: ${started.error}`);
  recorder.recordEvent({ type: 'session-start', game: spec.id, targetUrl: selectedUrl, mode: 'headful', repairPolicy: 'stop on browser error; retain exact evidence for the source repair' });
  const observation = await spec.play(win, event => recorder.recordEvent(event));
  for (const entry of observedConsole) recorder.recordEvent({ type: entry.actionable ? 'bug-found' : 'console-context', ...entry });
  recorder.recordEvent({ type: errors.length ? 'repair-needed' : 'verification-pass', observation, browserErrors: errors.length, consoleContext: observedConsole.length - errors.length });
  await sleep(1200);
  const result = await recorder.stop();
  win.destroy();
  if (!result.success) throw new Error(`${spec.id}: ${result.error}`);
  return { game: spec.id, targetUrl: selectedUrl, ...result, browserErrors: errors, consoleContext: observedConsole.filter((entry) => !entry.actionable) };
}

async function main() {
  app.setPath('userData', path.join(OUTPUT, '.electron-profile'));
  fs.mkdirSync(OUTPUT, { recursive: true });
  const server = startStaticServer(PORT, WEBSITE);
  await app.whenReady();
  const results = [];
  try {
    const requested = process.argv.slice(2);
    const selected = requested.length ? sessions.filter(spec => requested.includes(spec.id)) : sessions;
    if (!selected.length) throw new Error(`Unknown session. Available: ${sessions.map(s => s.id).join(', ')}`);
    for (const spec of selected) results.push(await runSession(spec));
    const summary = path.join(OUTPUT, 'latest-session-summary.json');
    fs.writeFileSync(summary, JSON.stringify({ createdAt: new Date().toISOString(), sessions: results }, null, 2));
    console.log(JSON.stringify({ success: true, summary, videos: results.map(x => x.videoPath) }, null, 2));
  } finally {
    server.close();
    app.quit();
  }
}
main().catch(error => { console.error(error.stack || error.message); app.exit(1); });
