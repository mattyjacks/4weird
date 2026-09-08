const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

// Keep the runner self-contained on locked-down Windows hosts. The default
// roaming Electron profile can be unreadable, which prevents the game guest
// window from loading before a playtest even starts.
const localElectronData = path.join(projectRoot, '.vibecodeworker-user-data');
app.setPath('userData', localElectronData);
app.setPath('cache', path.join(localElectronData, 'cache'));

// Both batch entry points intentionally converge on this Electron app. Keep a
// second click, a stale shortcut, or a concurrent batch invocation from making
// a duplicate dashboard; instead, bring the existing one back to the front.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

// SmartLog: file-backed structured logs + AI handoffs (see lib/smart_log.js).
// Log dir: %APPDATA%/vibecodeworker/logs (win) — every console.* line lands there.
const { getSharedLog, teeConsole, parseWorkerArgs } = require('../lib/smart_log');
const smartlog = getSharedLog('electron-main');
teeConsole(smartlog);
const cliOpts = parseWorkerArgs(process.argv);
smartlog.info(`VibeCodeWorker boot (headfull=${cliOpts.headfull} headless=${cliOpts.headless} game=${cliOpts.game || 'none'})`, { category: 'lifecycle' });

// Modular helper imports
const { runInputSimulator, scanWindowsProcesses, captureNativeScreenshot, configureNativeGameOverlay, buildSteamRunUrl } = require('../src/main_process/native_runner');
const { scanSourceDirectory } = require('../src/main_process/file_scanner');
const { startStaticServer } = require('../src/main_process/static_server');
const {
  getGameWindow,
  isGameWindowActive,
  openGameWindow,
  evalInGameWindow,
  captureGameScreenshot,
  reloadGameWindow,
  openGameDevTools,
  setBotControlInGameWindow
} = require('../src/main_process/game_window_manager');
const { discoverGames } = require('../src/main_process/game_discovery');
const { LocalAPIServer } = require('../lib/api_server');
const { getResolvedApiKey } = require('../lib/storage');

let mainWindow;
// --headfull (explicit visible window) wins over --headless so CLI runs like
// `electron . --headfull --game gravegain3d --autoplay` always show the UI.
const isHeadless = process.argv.includes('--headless') && !cliOpts.headfull;
const RENDERER_OPERATION_TIMEOUT_MS = 8000;

function withRendererTimeout(operation, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${RENDERER_OPERATION_TIMEOUT_MS / 1000}s`)), RENDERER_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([Promise.resolve().then(operation), timeout])
    .finally(() => clearTimeout(timeoutId));
}

// VIBECODEWORKER is a debugger first: it must still open on machines where Electron's
// GPU subprocess cannot load.  Opt into native GPU rendering with --enable-gpu
// when it is known to be available; Chromium will otherwise use its software
// renderer, which keeps both the dashboard and WebGL game preview alive.
if (!process.argv.includes('--enable-gpu')) {
  app.disableHardwareAcceleration();
  // Some Windows Electron builds still create a GPU child process unless the
  // Chromium command-line switch is also present.  That process can terminate
  // the whole app when the host has no compatible graphics DLL.
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('in-process-gpu');
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const ideWidth = Math.floor(width / 2);
  const ideHeight = height;
  const ideX = x;
  const ideY = y;

  mainWindow = new BrowserWindow({
    x: ideX,
    y: ideY,
    width: ideWidth,
    height: ideHeight,
    show: !isHeadless,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      devTools: true
    },
    title: "4weird vibecodeworker - game runner and fixer",
    icon: path.join(projectRoot, 'src', 'icon.png')
  });

  mainWindow.loadFile(path.join(projectRoot, 'src', 'index.html'));

  // Renderer failures otherwise stay hidden inside Electron DevTools and make
  // the dashboard appear to have dead controls. Keep them visible to the host
  // log so startup and button-binding failures are diagnosable.
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const prefix = level >= 2 ? 'error' : 'info';
    console[ prefix === 'error' ? 'error' : 'log'](`[Dashboard ${prefix}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Forward normalized CLI opts (game/autoplay/headfull) to the dashboard,
    // which already handles --game / --start-agent via this channel.
    const forwarded = [...process.argv];
    if (cliOpts.game && !forwarded.includes('--game')) forwarded.push('--game', cliOpts.game);
    if (cliOpts.autoplay && !forwarded.includes('--start-agent')) forwarded.push('--start-agent');
    mainWindow.webContents.send('cli-args', forwarded);
    // Opt in automatically when HL2 is already running. The renderer receives
    // the exact title and therefore never falls back to its web preview.
    scanWindowsProcesses().then(async (scan) => {
      const hl2 = (scan.processes || []).find(p => String(p.ProcessName || '').toLowerCase() === 'hl2');
      if (!hl2) return;
      const overlay = await configureNativeGameOverlay(hl2.MainWindowTitle, projectRoot);
      if (overlay.success) {
        const match = String(overlay.stdout || '').match(/Overlay bounds:\s*(-?\d+),(-?\d+),(\d+),(\d+)/);
        if (match) mainWindow.setBounds({ x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) });
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        // Opaque dashboard: never let the game bleed through the window.
        mainWindow.setOpacity(1.0);
        mainWindow.webContents.send('native-game-autodetected', hl2.MainWindowTitle);
      }
    }).catch(err => smartlog.warn(`HL2 auto-attach failed: ${err.message}`, { category: 'native-game' }));
    smartlog.info('Dashboard loaded, CLI args forwarded', { category: 'lifecycle' });
    if (cliOpts.handoffOnly) {
      setTimeout(() => {
        const p = writeExitHandoff('cli --handoff smoke run');
        console.log(`[SmartLog] Handoff: ${p || 'FAILED'}`);
        app.quit();
      }, 3000);
    }
  });

  if (!isHeadless) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function writeExitHandoff(reason) {
  try {
    const res = smartlog.writeHandoff({ reason });
    if (res.success) {
      console.log(`[SmartLog] Handoff written: ${res.path}`);
      return res.path;
    }
  } catch (e) {}
  return null;
}

app.on('window-all-closed', () => {
  if (cliOpts.handoffOnExit || cliOpts.handoffOnly) writeExitHandoff(cliOpts.handoffReason || 'electron exit');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('run-input-sim', async (event, args) => {
  return await runInputSimulator(args, projectRoot);
});

ipcMain.handle('scan-processes', async (event) => {
  return await scanWindowsProcesses();
});

ipcMain.handle('launch-steam-game', async (_event, options = {}) => {
  try {
    const launch = buildSteamRunUrl(options.appId, options);
    await shell.openExternal(launch.url);
    const labels = {
      'exclusive-fullscreen': 'full screen',
      borderless: 'borderless windowed',
      'windowed-fullscreen': 'full-screen windowed',
      'partial-windowed': `partial windowed (${options.width || 1280}×${options.height || 720})`
    };
    return { success: true, mode: launch.mode, modeLabel: labels[launch.mode], args: launch.args };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-api-keys', async (_event, suppliedKeys = {}) => {
  const prompt = 'Hello, World! Respond in 1 word.';
  const providers = [
    { name: 'openai', key: String(suppliedKeys.openai || '').trim(), url: 'https://api.openai.com/v1/responses', model: 'gpt-5.6-luna', body: () => ({ model: 'gpt-5.6-luna', input: prompt, max_output_tokens: 16, store: false }) },
    { name: 'deepseek', key: String(suppliedKeys.deepseek || '').trim(), url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash', body: () => ({ model: 'deepseek-v4-flash', max_tokens: 16, messages: [{ role: 'user', content: prompt }] }) },
    { name: 'gemini', key: String(suppliedKeys.gemini || '').trim(), url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`, model: 'gemini-3.5-flash-lite', body: () => ({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 16 } }) },
    { name: 'meta', key: String(suppliedKeys.meta || '').trim(), url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', body: () => ({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', max_tokens: 16, messages: [{ role: 'user', content: prompt }] }) },
    { name: 'openrouter', key: String(suppliedKeys.openrouter || '').trim(), url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', body: () => ({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', max_tokens: 16, messages: [{ role: 'user', content: prompt }] }) }
  ];
  const results = await Promise.all(providers.map(async (provider) => {
    if (!provider.key) return { provider: provider.name, status: 'skipped', detail: 'No key entered.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const headers = { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' };
      if (provider.name === 'meta' || provider.name === 'openrouter') {
        headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
        headers['X-Title'] = '4weird VibeCodeWorker';
      }
      const response = await fetch(typeof provider.url === 'function' ? provider.url(provider.key) : provider.url, { method: 'POST', headers, body: JSON.stringify(provider.body()), signal: controller.signal });
      if (response.ok) return { provider: provider.name, status: 'valid', detail: 'Key accepted.' };
      // Only authentication/authorization responses prove that a stored key is bad.
      if (response.status === 401 || response.status === 403) return { provider: provider.name, status: 'invalid', detail: `Authentication rejected (${response.status}).` };
      return { provider: provider.name, status: 'error', detail: `Provider returned ${response.status}; key was not removed.` };
    } catch (error) {
      return { provider: provider.name, status: 'error', detail: error.name === 'AbortError' ? 'Timed out; key was not removed.' : 'Connection failed; key was not removed.' };
    } finally {
      clearTimeout(timer);
    }
  }));
  return { success: true, results };
});

ipcMain.handle('generate-commentary-speech', async (_event, options = {}) => {
  const text = String(options.text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!text) return { success: false, error: 'No commentary text supplied' };
  const apiKey = getResolvedApiKey('openai', String(options.apiKey || ''));
  if (!apiKey) return { success: false, error: 'Add an OpenAI API key or choose System voice' };
  const permittedVoices = new Set(['alloy', 'nova', 'shimmer', 'onyx']);
  const voice = permittedVoices.has(options.voice) ? options.voice : 'nova';
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        response_format: 'mp3',
        instructions: options.personality === 'streamer'
          ? 'Deliver this as upbeat, witty video-game stream commentary. Keep it natural.'
          : 'Deliver this as calm, concise software playtest commentary.'
      })
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      return { success: false, error: `OpenAI TTS ${response.status}: ${detail}` };
    }
    return { success: true, mimeType: 'audio/mpeg', audioBase64: Buffer.from(await response.arrayBuffer()).toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('capture-native-screenshot', async (event, windowTitle) => {
  return await captureNativeScreenshot(app.getPath('temp'), windowTitle, projectRoot);
});

ipcMain.handle('enable-native-game-overlay', async (_event, windowTitle) => {
  const result = await configureNativeGameOverlay(windowTitle, projectRoot);
  if (!result.success || !mainWindow) return result;
  const match = String(result.stdout || '').match(/Overlay bounds:\s*(-?\d+),(-?\d+),(\d+),(\d+)/);
  if (match) {
    mainWindow.setBounds({ x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) });
  }
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  // Opaque dashboard: never let the game bleed through the window.
  mainWindow.setOpacity(1.0);
  return { ...result, overlay: true };
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
  return scanSourceDirectory(dirPath);
});

ipcMain.handle('open-game-window', async (event, url) => {
  return await openGameWindow(url, isHeadless, mainWindow);
});

ipcMain.handle('eval-in-game-window', async (event, script) => {
  return await evalInGameWindow(script);
});

ipcMain.handle('capture-game-screenshot', async (event) => {
  return await captureGameScreenshot();
});

ipcMain.handle('reload-game-window', async (event) => {
  return reloadGameWindow();
});

ipcMain.handle('open-game-devtools', async (event) => {
  return openGameDevTools();
});

ipcMain.handle('is-game-window-active', () => {
  return isGameWindowActive();
});

ipcMain.handle('set-bot-control', async (event, on) => {
  return await setBotControlInGameWindow(on !== false);
});

// AI Vision Mirror state: the dashboard renderer pushes a snapshot on
// every bot action (fire-and-forget). Cached here so the HTTP API
// (/api/vision/state) and headless tooling can read pointer/keys/trail.
let lastVisionSnapshot = null;
ipcMain.on('vision-state-push', (_event, snapshot) => {
  if (snapshot && typeof snapshot === 'object') lastVisionSnapshot = snapshot;
});

// Mirror loop heartbeat from the dashboard renderer (proves the panel's
// screenshot + detect + render loop is alive; surfaced in vision state).
let lastMirrorTick = null;
ipcMain.on('vision-mirror-tick', (_event, beat) => {
  if (beat && typeof beat === 'object') lastMirrorTick = beat;
});

function getVisionSnapshot() {
  return {
    ...(lastVisionSnapshot || {
      pointer: { x: 500, y: 500, label: 'idle', visible: false, ts: 0 },
      keys: [],
      trail: [],
      path: []
    }),
    gameWindowActive: isGameWindowActive(),
    mirror: lastMirrorTick,
    ts: Date.now()
  };
}

ipcMain.handle('get-vision-state', async () => getVisionSnapshot());

const { launchDeepSeekHarnessWeb, runSelfImprovementCycle } = require('../lib/deepseek_harness');

ipcMain.handle('launch-deepseek-harness', async (event, opts) => {
  return await launchDeepSeekHarnessWeb(opts);
});

ipcMain.handle('run-self-improvement', async (event, params) => {
  return await runSelfImprovementCycle(null, params);
});

// Ensure static server is running for game files
const WEBSITE_V1_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'website', 'v1')
  : path.join(projectRoot, '..', '..', '..', 'website', 'v1');
const STATIC_PORT = 8888;
startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);

const fs = require('fs');

// Read initial configured port or default to 42069
function getConfiguredPort() {
  const cfgPath = path.join(projectRoot, 'config', 'default.json');
  try {
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.serverPort) return parseInt(cfg.serverPort);
    }
  } catch (e) {}
  return parseInt(process.env.VIBECODEWORKER_PORT || process.env.PORT || 42069);
}

// Unified web engine driver (main process side): ultralight default,
// electron current-setup viewport, chromium standalone. Headless API runs
// without a renderer, so compat executors delegate to the game window.
function getConfiguredEngine() {
  const valid = ['ultralight', 'electron', 'chromium'];
  if (process.env.VIBE_WEB_ENGINE && valid.includes(process.env.VIBE_WEB_ENGINE)) {
    return process.env.VIBE_WEB_ENGINE;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'config', 'default.json'), 'utf8'));
    if (cfg.webEngine && valid.includes(cfg.webEngine)) return cfg.webEngine;
  } catch (e) {}
  return 'ultralight';
}

const { WebEngineManager } = require('../src/runtime/web_engine_manager');
const webEngineManager = new WebEngineManager({ activeEngine: getConfiguredEngine() });
webEngineManager.on('bug_detected', (bug) => {
  if (localApiServer) localApiServer.addConsoleLog('error', `[${bug.engine || 'engine'}] ${bug.type}: ${bug.description}`, 'web-engine');
});

function buildMainExecutor() {
  return {
    navigate: async (url) => openGameWindow(url, isHeadless, mainWindow),
    getInteractiveDOM: async () => {
      const win = getGameWindow();
      if (!win || win.isDestroyed()) return [];
      const stateStr = await win.webContents.executeJavaScript(`JSON.stringify((() => {
        const out = [];
        const cands = document.querySelectorAll('button, a, input, select, textarea, canvas, [role="button"]');
        for (let i = 0; i < cands.length && out.length < 40; i++) {
          const el = cands[i]; const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          out.push({ tagName: el.tagName, id: el.id || '', innerText: (el.innerText || '').slice(0,50), rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } });
        }
        return out;
      })())`);
      return JSON.parse(stateStr);
    },
    executeAction: async (action) => {
      const win = getGameWindow() || mainWindow;
      if (!win || win.isDestroyed()) return { success: false, error: 'No active window' };
      if (action.type === 'click') {
        const x = action.x || 100; const y = action.y || 100;
        win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
        return { success: true, action: 'click', x, y };
      }
      return { success: false, error: `Unsupported action type: ${action.type}` };
    },
  };
}

let currentApiPort = getConfiguredPort();

// Initialize Local API Server connected to Electron windows & handlers
let localApiServer = null;

function createLocalApiServer(port) {
  return new LocalAPIServer({
    port: port || 42069,
    runtimeMode: 'electron',
    handlers: {
      getGames: async () => {
        return discoverGames(WEBSITE_V1_DIR, STATIC_PORT);
      },

      launchGame: async (gameId) => {
        const url = gameId.startsWith('http') ? gameId : `http://localhost:${STATIC_PORT}/games/html/${gameId}/index.html`;
        smartlog.info(`Launching game: ${gameId}`, { category: 'game' });
        return await openGameWindow(url, isHeadless, mainWindow, (level, message, line, sourceId) => {
          if (localApiServer) localApiServer.addConsoleLog(level === 2 ? 'error' : (level === 1 ? 'warn' : 'info'), message, 'game_window');
          if (level >= 1) smartlog.log(level >= 2 ? 'error' : 'warn', 'game', `[${gameId}] ${message}`, { line, sourceId });
        });
      },

      captureScreenshot: async (target) => {
        const gameWin = getGameWindow();
        const win = (target === 'dashboard' || !gameWin) ? mainWindow : gameWin;
        if (!win || win.isDestroyed()) return null;
        const img = await withRendererTimeout(() => win.webContents.capturePage(), 'Screenshot capture');
        return img.toPNG();
      },

      getLogs: async () => [],

      getVisionState: async () => getVisionSnapshot(),

      getGameState: async () => {
        const gameWin = getGameWindow();
        if (!gameWin || gameWin.isDestroyed()) return { active: false };
        try {
          const stateStr = await withRendererTimeout(() => gameWin.webContents.executeJavaScript(`
            JSON.stringify({
              title: document.title,
              url: window.location.href,
              canvas: !!document.querySelector('canvas'),
              score: window.score || (window.game && window.game.score) || 0,
              isGameOver: window.isGameOver || (window.game && window.game.isGameOver) || false,
              playerState: window.player ? { x: window.player.x, y: window.player.y, hp: window.player.hp } : null
            })
          `), 'Game state inspection');
          return JSON.parse(stateStr);
        } catch (e) {
          return { active: true, error: e.message };
        }
      },

      executeAction: async (action) => {
        const win = getGameWindow() || mainWindow;
        if (!win || win.isDestroyed()) return { success: false, error: 'No active window' };

        if (!action || typeof action.type !== 'string') {
          return { success: false, error: 'Action must include a type' };
        }

        if (action.type === 'click') {
          const x = action.x || 100;
          const y = action.y || 100;
          win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
          win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
          return { success: true, action: 'click', x, y };
        } else if (action.type === 'keydown' || action.type === 'keyup') {
          const keyCode = action.key || action.code;
          if (!keyCode) return { success: false, error: 'Keyboard action must include key or code' };
          win.webContents.sendInputEvent({ type: action.type, keyCode });
          return { success: true, action: action.type, key: action.key };
        }
        return { success: false, error: `Unsupported action type: ${action.type}` };
      },

      evalJavaScript: async (script) => {
        const win = getGameWindow() || mainWindow;
        if (!win || win.isDestroyed()) throw new Error('No window available for javascript execution');
        return await withRendererTimeout(() => win.webContents.executeJavaScript(script), 'JavaScript evaluation');
      },

      reloadGame: async () => {
        const gameWin = getGameWindow();
        if (gameWin) {
          gameWin.webContents.reload();
          return { success: true };
        }
        return { success: false, error: 'Game window not open' };
      },

      getEngines: async () => webEngineManager.describeEngines(),

      setEngine: async (engineId) => {
        const res = webEngineManager.setActiveEngine(engineId);
        if (res.success) {
          try {
            const cfgPath = path.join(projectRoot, 'config', 'default.json');
            const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
            cfg.webEngine = webEngineManager.activeEngineId;
            fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
          } catch (_) { /* persist best-effort */ }
        }
        return res;
      },

      runMultiEngineQA: async ({ url, engines, actions } = {}) => {
        const target = url || (getGameWindow() ? getGameWindow().webContents.getURL() : null);
        if (!target) return { success: false, error: 'No URL provided and no game window open' };
        return await webEngineManager.runMultiEngineQA(target, {
          engines,
          actions,
          executorProvider: () => buildMainExecutor(),
        });
      }
    }
  });
}

localApiServer = createLocalApiServer(currentApiPort);
localApiServer.start().then(() => {
  console.log(`[Main] Integrated VibeCodeWorker Local REST API Server active on http://localhost:${currentApiPort}`);
}).catch(err => {
  console.error('[Main] Failed to start Local REST API Server:', err);
});

ipcMain.handle('set-api-server-port', async (event, newPort) => {
  const targetPort = parseInt(newPort) || 42069;
  if (targetPort === currentApiPort && localApiServer && localApiServer.server) {
    return { success: true, port: targetPort, message: 'Port already active' };
  }
  try {
    if (localApiServer) {
      await localApiServer.stop();
    }
    currentApiPort = targetPort;
    localApiServer = createLocalApiServer(currentApiPort);
    await localApiServer.start();
    console.log(`[Main] Restarted Local REST API Server on http://localhost:${currentApiPort}`);
    return { success: true, port: currentApiPort };
  } catch (err) {
    console.error(`[Main] Failed to switch port to ${targetPort}:`, err);
    return { success: false, error: err.message };
  }
});

// Unified web engine IPC: renderer (dashboard) switches drivers & runs QA.
ipcMain.handle('get-web-engines', async () => webEngineManager.describeEngines());

ipcMain.handle('set-web-engine', async (event, engineId) => {
  const res = webEngineManager.setActiveEngine(engineId);
  if (res.success) {
    try {
      const cfgPath = path.join(projectRoot, 'config', 'default.json');
      const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
      cfg.webEngine = webEngineManager.activeEngineId;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (_) { /* persist best-effort */ }
  }
  return res;
});

ipcMain.handle('run-multi-engine-qa', async (event, opts = {}) => {
  const target = opts.url || (isGameWindowActive() ? getGameWindow().webContents.getURL() : null);
  if (!target) return { success: false, error: 'No URL provided and no game window open' };
  return await webEngineManager.runMultiEngineQA(target, {
    engines: opts.engines,
    actions: opts.actions,
    executorProvider: () => buildMainExecutor(),
  });
});
