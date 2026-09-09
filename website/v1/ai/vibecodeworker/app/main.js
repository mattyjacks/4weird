const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
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
  getGameWindowBounds,
  focusGameWindow,
  evalInGameWindow,
  captureGameScreenshot,
  startPlaytestRecording,
  stopPlaytestRecording,
  getPlaytestRecordingStatus,
  recordPlaytestEvent,
  reloadGameWindow,
  openGameDevTools,
  setBotControlInGameWindow
} = require('../src/main_process/game_window_manager');
const { discoverGames } = require('../src/main_process/game_discovery');
const { LocalAPIServer } = require('../lib/api_server');
const { getResolvedApiKey } = require('../lib/storage');
const { META_DIRECT_ENDPOINT_URL, META_DIRECT_MODEL, isMetaDirectUrl } = require('../lib/meta_endpoint');
const { installLatestStableGodot } = require('../lib/godot_runtime');

let mainWindow;
// Desktop playtests are always visible. parseWorkerArgs also treats the
// legacy --headless flag as non-operative so a background run cannot keep
// steering the mouse without an operator-visible window.
const isHeadless = false;
const RENDERER_OPERATION_TIMEOUT_MS = 8000;
const windowStatePath = path.join(localElectronData, 'window-state.json');

function readSavedWindowBounds() {
  try {
    const saved = JSON.parse(fs.readFileSync(windowStatePath, 'utf8'));
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)
      || !Number.isFinite(saved.width) || !Number.isFinite(saved.height)) return null;
    const displays = screen.getAllDisplays();
    const stillVisible = displays.some(({ workArea }) =>
      saved.x < workArea.x + workArea.width && saved.x + saved.width > workArea.x
      && saved.y < workArea.y + workArea.height && saved.y + saved.height > workArea.y);
    if (!stillVisible) return null;
    return {
      x: Math.round(saved.x), y: Math.round(saved.y),
      width: Math.max(800, Math.round(saved.width)),
      height: Math.max(600, Math.round(saved.height))
    };
  } catch (_) {
    return null;
  }
}

function saveWindowBounds() {
  try {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMaximized() || mainWindow.isFullScreen()) return;
    fs.mkdirSync(localElectronData, { recursive: true });
    fs.writeFileSync(windowStatePath, JSON.stringify(mainWindow.getBounds()));
  } catch (_) { /* Saving window placement must never prevent exit. */ }
}

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

function resolveDashboardBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  // Legacy side-by-side layout: dashboard takes the left half so a separate
  // game window can tile on the right. Default is the full work area (up to
  // full HD 1920x1080) so the embedded game viewport is as large as possible.
  if (cliOpts.displayMode === 'split') {
    const ideWidth = Math.floor(width / 2);
    return { x, y, width: ideWidth, height, mode: 'split' };
  }
  // An explicit size is a launch instruction; otherwise reopen where the
  // operator last left the dashboard.
  if (!cliOpts.windowSize) {
    const saved = readSavedWindowBounds();
    if (saved) return { ...saved, mode: cliOpts.displayMode || 'windowed' };
  }
  const wantW = cliOpts.windowSize ? cliOpts.windowSize.width : 1920;
  const wantH = cliOpts.windowSize ? cliOpts.windowSize.height : 1080;
  const w = Math.max(800, Math.min(wantW, width));
  const h = Math.max(600, Math.min(wantH, height));
  return { x: Math.round(x + Math.max(0, (width - w) / 2)), y: Math.round(y + Math.max(0, (height - h) / 2)), width: w, height: h, mode: cliOpts.displayMode || 'windowed' };
}

function currentDisplayConfig() {
  let bounds = null;
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const b = mainWindow.getBounds();
      bounds = { x: b.x, y: b.y, width: b.width, height: b.height, fullscreen: mainWindow.isFullScreen() };
    }
  } catch (_) {}
  return {
    ...(bounds || resolveDashboardBounds()),
    mode: mainWindow && !mainWindow.isDestroyed() && mainWindow.isFullScreen() ? 'fullscreen' : (cliOpts.displayMode || 'windowed'),
    headless: isHeadless,
    gameWindowActive: isGameWindowActive(),
    gameWindow: getGameWindowBounds()
  };
}

function createWindow() {
  const dash = resolveDashboardBounds();

  mainWindow = new BrowserWindow({
    x: dash.x,
    y: dash.y,
    width: dash.width,
    height: dash.height,
    show: !isHeadless,
    fullscreen: cliOpts.fullscreen && !isHeadless,
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
  mainWindow.on('close', saveWindowBounds);
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

  // Ollama auto-start (best-effort, never blocks boot): when the user left
  // autoStart on and Ollama is installed but the server is down, bring
  // `ollama serve` up in the background. Installs are NEVER automatic here —
  // those need explicit consent via the .bat --install-ollama flag or the
  // dashboard INSTALL button.
  setImmediate(async () => {
    try {
      let autoStart = true;
      try {
        const cfgPath = path.join(projectRoot, 'config', 'default.json');
        if (fs.existsSync(cfgPath)) {
          const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          if (cfg && cfg.localModels && typeof cfg.localModels.autoStart === 'boolean') {
            autoStart = cfg.localModels.autoStart;
          }
        }
      } catch (_) { /* default stays on */ }
      if (!autoStart) return;
      const res = await ollamaManager.ensureReady({ baseUrl: ollamaBaseUrl(), autoInstall: false, startTimeoutMs: 25000 });
      smartlog.info(`Ollama boot check: ${res.ok ? `ready (${(res.models || []).length} models)` : (res.error || res.stage)}`, { category: 'ollama' });
    } catch (e) {
      smartlog.info(`Ollama boot check skipped: ${e.message}`, { category: 'ollama' });
    }
  });

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
// Self-generated trace tests: the renderer composes a tiny digest test +
// runtime-only data fixture (see src/runtime/trace_test_gen.js). Filenames are
// allow-listed, sizes capped, and the pair is written to tests/generated/.
ipcMain.handle('save-trace-test', async (_event, payload = {}) => {
  try {
    const fs = require('fs');
    const { testFilename, testSource, dataFilename, dataSource } = payload;
    const nameRe = /^trace-\d{8}-\d{6}-[a-z0-9-]{1,24}\.(js|test\.json)$/;
    if (typeof testFilename !== 'string' || !nameRe.test(testFilename) || !testFilename.endsWith('.js')) {
      throw new Error('rejected: bad test filename');
    }
    const expectData = testFilename.replace(/\.js$/, '.test.json');
    if (dataFilename !== expectData) throw new Error('rejected: fixture name must match the test');
    if (typeof testSource !== 'string' || !testSource.includes('VIBECODEWORKER-TRACE-TEST v1')) {
      throw new Error('rejected: missing trace-test marker');
    }
    if (Buffer.byteLength(testSource, 'utf8') > 4096) throw new Error('rejected: test exceeds the token budget (4KB)');
    if (typeof dataSource !== 'string') throw new Error('rejected: bad fixture payload');
    const data = JSON.parse(dataSource);
    if (!data || data.v !== 1 || !Array.isArray(data.samples) || !data.samples.length) {
      throw new Error('rejected: fixture has no samples');
    }
    if (Buffer.byteLength(dataSource, 'utf8') > 262144) throw new Error('rejected: fixture exceeds 256KB');
    const dir = path.join(projectRoot, 'tests', 'generated');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, testFilename), testSource, 'utf8');
    fs.writeFileSync(path.join(dir, dataFilename), dataSource, 'utf8');
    return { success: true, testFile: testFilename, dataFile: dataFilename };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('run-input-sim', async (event, args) => {
  return await runInputSimulator(args, projectRoot);
});

// Native desktop entry point for the same official stable installer used by
// the cloud image. The renderer gets an IPC capability, never a download URL.
ipcMain.handle('install-godot-latest', async () => {
  try {
    const root = path.join(app.getPath('userData'), 'godot');
    return { success: true, godot: await installLatestStableGodot({ installRoot: root }) };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
  // Renderer sends its configured endpoint URL alongside the keys so a
  // Meta-direct key can be live-tested against the user's own endpoint when
  // set, otherwise against the universal Meta Llama API URL (see below).
  const metaEndpointUrl = String(suppliedKeys.endpointUrl || '').trim();
  const providers = [
    { name: 'openai', key: String(suppliedKeys.openai || '').trim(), url: 'https://api.openai.com/v1/responses', model: 'gpt-5.6-luna', body: () => ({ model: 'gpt-5.6-luna', input: prompt, max_output_tokens: 16, store: false }) },
    { name: 'deepseek', key: String(suppliedKeys.deepseek || '').trim(), url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash', body: () => ({ model: 'deepseek-v4-flash', max_tokens: 16, messages: [{ role: 'user', content: prompt }] }) },
    { name: 'gemini', key: String(suppliedKeys.gemini || '').trim(), url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`, model: 'gemini-3.5-flash-lite', body: () => ({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 16 } }) },
    { name: 'meta', key: String(suppliedKeys.meta || '').trim(), url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', body: () => ({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', max_tokens: 16, messages: [{ role: 'user', content: prompt }] }) },
    { name: 'openrouter', key: String(suppliedKeys.openrouter || '').trim(), url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', body: () => ({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', max_tokens: 16, messages: [{ role: 'user', content: prompt }] }) },
    { name: 'elevenlabs', key: String(suppliedKeys.elevenlabs || '').trim(), url: 'https://api.elevenlabs.io/v1/user', model: 'eleven_multilingual_v2', elevenlabs: true }
  ];
  const results = await Promise.all(providers.map(async (provider) => {
    if (!provider.key) return { provider: provider.name, status: 'skipped', detail: 'No key entered.' };
    // ElevenLabs authenticates with xi-api-key on a GET /v1/user probe —
    // never POST test traffic that would burn voice credits.
    if (provider.elevenlabs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(provider.url, { headers: { 'xi-api-key': provider.key }, signal: controller.signal });
        if (response.ok) return { provider: provider.name, status: 'valid', detail: 'Key accepted.' };
        if (response.status === 401 || response.status === 403) return { provider: provider.name, status: 'invalid', detail: `Authentication rejected (${response.status}).` };
        return { provider: provider.name, status: 'error', detail: `Provider returned ${response.status}; the key itself was not judged bad. Key was not removed.` };
      } catch (error) {
        return { provider: provider.name, status: 'error', detail: error.name === 'AbortError' ? 'Timed out; key was not removed.' : 'Connection failed; key was not removed.' };
      } finally {
        clearTimeout(timer);
      }
    }
    // The Meta slot accepts either an OpenRouter key (sk-or-v1-…) or a
    // Meta-direct key for Meta's Llama API. A Meta-direct key is tested
    // against the user's configured Meta endpoint when set, otherwise the
    // universal Meta URL (same for everybody) — never against OpenRouter,
    // where it would produce a false 401.
    const isMetaDirectKey = provider.name === 'meta' && !provider.key.startsWith('sk-or-v1-');
    const metaDirectUrl = isMetaDirectUrl(metaEndpointUrl) ? metaEndpointUrl : META_DIRECT_ENDPOINT_URL;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const headers = { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' };
      let url = typeof provider.url === 'function' ? provider.url(provider.key) : provider.url;
      let body = provider.body();
      if (isMetaDirectKey) {
        // Meta's hosted API documents Bearer auth, while some account/API
        // gateway versions also expect the token in x-api-key. Sending both
        // is compatible and avoids a false 401 for valid LLM_ credentials.
        headers['x-api-key'] = provider.key;
        // Mirror runtime behavior (llm_caller.js): Bearer auth only, no
        // OpenRouter headers, OpenAI-compatible chat body. The Llama API
        // uses native model ids, not the OpenRouter slug.
        url = metaDirectUrl;
        body = { model: META_DIRECT_MODEL, max_tokens: 16, messages: [{ role: 'user', content: prompt }] };
      } else {
        if (provider.name === 'meta' || provider.name === 'openrouter') {
          headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
          headers['X-Title'] = '4weird VibeCodeWorker';
        }
      }
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      if (response.ok) return { provider: provider.name, status: 'valid', detail: 'Key accepted.' };
      // Only authentication/authorization responses prove that a stored key is bad.
      if (response.status === 401 || response.status === 403) {
        // Meta-direct tokens are accepted by more than one Llama service and
        // some accounts reject this probe's model/route even when the token
        // itself is valid. Never label or clear a Meta key based on that
        // ambiguous response; the user can configure the exact endpoint in
        // settings and use the token there.
        if (isMetaDirectKey) return { provider: provider.name, status: 'error', detail: `Meta endpoint rejected this probe (${response.status}); key was not removed. Check the Meta endpoint/model settings.` };
        return { provider: provider.name, status: 'invalid', detail: `Authentication rejected (${response.status}).` };
      }
      // Anything else (402 billing, 429 rate limit, 404 model, 5xx outage)
      // says nothing about the key itself, so the key is always kept.
      if (response.status === 402) return { provider: provider.name, status: 'error', detail: `Key is valid but the account needs payment/quota (provider returned 402 Payment Required). Top up billing and retry. Key was not removed.` };
      if (response.status === 429) return { provider: provider.name, status: 'error', detail: `Rate limited (429) — key works, slow down and retry. Key was not removed.` };
      return { provider: provider.name, status: 'error', detail: `Provider returned ${response.status}; the key itself was not judged bad. Key was not removed.` };
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
  // ElevenLabs path (BYOK voice layer): richer voices + personalities.
  if (options.provider === 'elevenlabs' || options.elevenlabs) {
    try {
      const eleven = require('../lib/elevenlabs');
      const { PERSONALITIES } = require('../lib/audio/voice_director');
      const personality = PERSONALITIES[options.personality] || PERSONALITIES[options.personality === 'streamer' ? 'streamer' : 'qa'] || PERSONALITIES.streamer;
      const clip = await eleven.textToSpeech(text, {
        apiKey: String(options.apiKey || ''),
        voiceId: options.voice || undefined,
        ...personality,
      });
      return clip;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
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

// ElevenLabs voice layer: generic TTS + offline PCM QA for the dashboard.
ipcMain.handle('elevenlabs-tts', async (_event, options = {}) => {
  try {
    const eleven = require('../lib/elevenlabs');
    return await eleven.textToSpeech(options.text, {
      apiKey: String(options.apiKey || ''),
      voiceId: options.voiceId,
      modelId: options.modelId,
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('audio-analyze', async (_event, options = {}) => {
  try {
    const { stereoQaVerdict } = require('../lib/audio/voice_director');
    if (!options.pcm) return { success: false, error: 'Missing pcm ({ mono:[...] } or { left:[...], right:[...] })' };
    return stereoQaVerdict(options.pcm, { mode: options.mode || 'mono', transcript: options.transcript || null });
  } catch (error) {
    return { success: false, error: error.message };
  }
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

ipcMain.handle('open-game-window', async (event, url, options = {}) => {
  // Renderer may pass (url, { width, height, fullscreen, mode }) or a legacy
  // bare URL string. The test window defaults to full HD 1920x1080.
  const opts = (options && typeof options === 'object') ? options : {};
  const targetUrl = typeof url === 'string' ? url : (url && url.url) || '';
  const res = await openGameWindow(targetUrl, isHeadless, mainWindow, null, {
    width: opts.width || (cliOpts.gameWindowSize && cliOpts.gameWindowSize.width) || 1920,
    height: opts.height || (cliOpts.gameWindowSize && cliOpts.gameWindowSize.height) || 1080,
    fullscreen: opts.fullscreen || opts.mode === 'fullscreen' || cliOpts.gameFullscreen,
    mode: opts.mode
  });
  // Smart tiling: when the test window opens windowed next to a windowed
  // dashboard, dock the dashboard to the left half (legacy side-by-side)
  // unless the caller opts out with { tile: false }.
  try {
    if (res && res.success && opts.tile !== false && !isHeadless && mainWindow && !mainWindow.isDestroyed()
      && !mainWindow.isFullScreen() && !(opts.fullscreen || opts.mode === 'fullscreen' || cliOpts.gameFullscreen)) {
      const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
      const half = Math.floor(width / 2);
      mainWindow.setBounds({ x, y, width: half, height });
      const gw = getGameWindow();
      if (gw && !gw.isDestroyed()) gw.setBounds({ x: x + half, y, width: width - half, height });
    }
  } catch (_) { /* tiling is best-effort */ }
  return res;
});

ipcMain.handle('eval-in-game-window', async (event, script) => {
  return await evalInGameWindow(script);
});

ipcMain.handle('capture-game-screenshot', async (event) => {
  return await captureGameScreenshot();
});

ipcMain.handle('start-playtest-recording', async (_event, options = {}) => {
  return await startPlaytestRecording(projectRoot, options, mainWindow);
});
ipcMain.handle('stop-playtest-recording', async () => {
  return await stopPlaytestRecording(projectRoot);
});
ipcMain.handle('get-playtest-recording-status', async () => getPlaytestRecordingStatus(projectRoot));
ipcMain.on('playtest-recording-event', (_event, event = {}) => {
  recordPlaytestEvent(projectRoot, event);
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

ipcMain.handle('focus-game-window', async () => {
  return focusGameWindow();
});

ipcMain.handle('get-display-config', async () => {
  return currentDisplayConfig();
});

// Runtime display control for the operator toolbar AND the runner brain:
//   { mode: 'windowed' }                          -> dashboard windowed (HD size)
//   { mode: 'fullscreen' }                        -> dashboard fullscreen
//   { mode: 'split' }                             -> legacy left-half dashboard
//   { mode: 'game-windowed', width, height }      -> test window windowed (default 1920x1080)
//   { mode: 'game-fullscreen' }                   -> test window fullscreen
ipcMain.handle('set-display-mode', async (_event, req = {}) => {
  const mode = String((req && req.mode) || 'windowed').toLowerCase();
  try {
    if (mode === 'game-fullscreen' || mode === 'game-windowed') {
      const gw = getGameWindow();
      if (!gw || gw.isDestroyed()) return { success: false, error: 'Game window is not open' };
      if (mode === 'game-fullscreen') {
        gw.setFullScreen(true);
        if (!isHeadless) { gw.show(); gw.focus(); }
      } else {
        const { width, height } = screen.getPrimaryDisplay().workArea;
        const w = Math.max(800, Math.min(Number(req.width) || 1920, width));
        const h = Math.max(600, Math.min(Number(req.height) || 1080, height));
        try { gw.setFullScreen(false); } catch (_) {}
        gw.setBounds({ x: Math.round(width - w), y: 0, width: w, height: h });
        if (!isHeadless) { gw.show(); gw.focus(); }
      }
      return { success: true, ...(getGameWindowBounds() || {}) };
    }
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false, error: 'Dashboard is not open' };
    if (mode === 'fullscreen') {
      mainWindow.setFullScreen(true);
      cliOpts.displayMode = 'fullscreen';
    } else if (mode === 'split') {
      try { mainWindow.setFullScreen(false); } catch (_) {}
      const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
      const half = Math.floor(width / 2);
      mainWindow.setBounds({ x, y, width: half, height });
      cliOpts.displayMode = 'split';
    } else {
      // windowed / hd: explicit HD size (default 1920x1080), centered.
      try { mainWindow.setFullScreen(false); } catch (_) {}
      const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
      const w = Math.max(800, Math.min(Number(req.width) || 1920, width));
      const h = Math.max(600, Math.min(Number(req.height) || 1080, height));
      mainWindow.setBounds({
        x: Math.round(x + Math.max(0, (width - w) / 2)),
        y: Math.round(y + Math.max(0, (height - h) / 2)),
        width: w, height: h
      });
      cliOpts.displayMode = 'windowed';
    }
    if (!isHeadless) { mainWindow.show(); mainWindow.focus(); }
    return { success: true, ...currentDisplayConfig() };
  } catch (e) {
    return { success: false, error: e.message };
  }
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

        recordPlaytestEvent(projectRoot, { type: 'action', action });
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

      startVideoRecording: async (options) => await startPlaytestRecording(projectRoot, options, mainWindow),
      stopVideoRecording: async () => await stopPlaytestRecording(projectRoot),
      getVideoRecordingStatus: async () => getPlaytestRecordingStatus(projectRoot),
      exportVideoLayouts: async ({ input, inputMode = 'desktop' } = {}) => {
        if (!input || !fs.existsSync(input)) return { success: false, error: 'A captured gameplay MP4 path is required' };
        const exporter = inputMode === 'mobile' ? 'scripts/node/export_mobile_testing.js' : 'scripts/node/export_testing_layouts.js';
        return await new Promise((resolve) => execFile(process.execPath, [path.join(projectRoot, exporter), input], { cwd: projectRoot, windowsHide: true, env: { ...process.env, VCW_INPUT_MODE: inputMode } }, (error, stdout, stderr) => resolve(error ? { success: false, error: stderr || error.message } : { success: true, inputMode, output: stdout.trim() })));
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

// Local models (Ollama) IPC: status, install, server control, model pulls.
// Install is explicit-consent only (renderer confirms first — ~700MB+
// download). Everything else is safe to call any time; failures return
// { ok:false } and never break the dashboard.
const ollamaManager = require('../lib/ollama_manager');

function ollamaBaseUrl() {
  try {
    const cfgPath = path.join(projectRoot, 'config', 'default.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const fromCfg = cfg && cfg.localModels && cfg.localModels.ollamaUrl;
      if (typeof fromCfg === 'string' && /^https?:\/\//.test(fromCfg.trim())) {
        return fromCfg.trim().replace(/\/+$/, '');
      }
    }
  } catch (_) { /* fall through to default */ }
  return ollamaManager.defaultBaseUrl();
}

ipcMain.handle('ollama-status', async () => {
  try {
    const baseUrl = ollamaBaseUrl();
    const up = await ollamaManager.isServerUp(baseUrl, 5000);
    if (up.ok) return { ok: true, success: true, installed: true, server: true, models: up.models, baseUrl };
    const found = ollamaManager.detectOllama();
    return {
      ok: false, success: false, installed: found.ok, server: false,
      models: [], baseUrl, error: up.error, manual: found.ok ? undefined : ollamaManager.manualInstallHint(),
    };
  } catch (e) {
    return { ok: false, success: false, error: e.message };
  }
});

ipcMain.handle('ollama-install', async () => {
  try {
    const res = await ollamaManager.installOllama({
      onProgress: (msg) => console.log(`[Ollama] ${msg}`),
      timeoutMs: 900000,
    });
    if (res.ok) {
      const started = await ollamaManager.startServer({ binary: res.binary, baseUrl: ollamaBaseUrl(), timeoutMs: 45000 });
      return { ...res, success: true, server: started.ok };
    }
    smartlog.info(`Ollama install failed: ${res.error}`, { category: 'ollama' });
    return { ...res, success: false };
  } catch (e) {
    return { ok: false, success: false, error: e.message };
  }
});

ipcMain.handle('ollama-start-server', async () => {
  try {
    const res = await ollamaManager.startServer({ baseUrl: ollamaBaseUrl(), timeoutMs: 45000 });
    return { ...res, success: res.ok };
  } catch (e) {
    return { ok: false, success: false, error: e.message };
  }
});

ipcMain.handle('ollama-list-models', async () => {
  try {
    const models = await ollamaManager.listModels(ollamaBaseUrl(), 8000);
    return { ok: true, success: true, models };
  } catch (e) {
    return { ok: false, success: false, error: e.message, models: [] };
  }
});

ipcMain.handle('ollama-pull-model', async (_event, model) => {
  try {
    const res = await ollamaManager.ensureModel(model, {
      baseUrl: ollamaBaseUrl(),
      allowPull: true,
      onProgress: (msg) => console.log(`[Ollama] ${msg}`),
    });
    return { ...res, success: res.ok };
  } catch (e) {
    return { ok: false, success: false, error: e.message };
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
