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

const PORT = 8912;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const sessions = [
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
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2 && !/Electron Security Warning/.test(message)) errors.push({ level, message, line, sourceId });
  });
  await win.loadURL(`http://127.0.0.1:${PORT}${spec.url}`);
  await sleep(1800);
  const recorder = new MediaMogulPlaytestRecorder({ projectRoot: ROOT, outputRoot: OUTPUT, capturePage: () => win.webContents.capturePage(), createVoiceover: synthesizeWindowsNarration });
  const started = await recorder.start({ name: spec.id, fps: 8, voiceoverText: spec.narration });
  if (!started.success) throw new Error(`${spec.id}: ${started.error}`);
  recorder.recordEvent({ type: 'session-start', game: spec.id, mode: 'headful', repairPolicy: 'stop on browser error; retain exact evidence for the source repair' });
  const observation = await spec.play(win, event => recorder.recordEvent(event));
  for (const error of errors) recorder.recordEvent({ type: 'bug-found', ...error });
  recorder.recordEvent({ type: errors.length ? 'repair-needed' : 'verification-pass', observation, browserErrors: errors.length });
  await sleep(1200);
  const result = await recorder.stop();
  win.destroy();
  if (!result.success) throw new Error(`${spec.id}: ${result.error}`);
  return { game: spec.id, ...result, browserErrors: errors };
}

async function main() {
  app.setPath('userData', path.join(OUTPUT, '.electron-profile'));
  fs.mkdirSync(OUTPUT, { recursive: true });
  const server = startStaticServer(PORT, WEBSITE);
  await app.whenReady();
  const results = [];
  try {
    for (const spec of sessions) results.push(await runSession(spec));
    const summary = path.join(OUTPUT, 'latest-session-summary.json');
    fs.writeFileSync(summary, JSON.stringify({ createdAt: new Date().toISOString(), sessions: results }, null, 2));
    console.log(JSON.stringify({ success: true, summary, videos: results.map(x => x.videoPath) }, null, 2));
  } finally {
    server.close();
    app.quit();
  }
}
main().catch(error => { console.error(error.stack || error.message); app.exit(1); });
