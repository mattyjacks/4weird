const { BrowserWindow, screen } = require('electron');
const { MediaMogulPlaytestRecorder } = require('../../lib/mediamogul_video_recorder');
const { synthesizeWindowsNarration } = require('../../lib/mediamogul_voiceover');

let gameWindow = null;
let playtestRecorder = null;

function getPlaytestRecorder(projectRoot, fallbackWindow) {
  if (!playtestRecorder) {
    playtestRecorder = new MediaMogulPlaytestRecorder({
      projectRoot,
      createVoiceover: synthesizeWindowsNarration,
      capturePage: async () => {
        const target = isGameWindowActive() ? gameWindow : fallbackWindow;
        if (!target || target.isDestroyed()) throw new Error('Game surface is not open');
        return await target.webContents.capturePage();
      }
    });
  }
  return playtestRecorder;
}

function getGameWindow() {
  return gameWindow;
}

function isGameWindowActive() {
  return !!gameWindow && !gameWindow.isDestroyed();
}

function withGameTimeout(promise, label, ms = 8000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([Promise.resolve().then(() => promise), timeout])
    .finally(() => clearTimeout(timer));
}

async function openGameWindow(url, isHeadless, mainWindow, onConsoleLog, options = {}) {
  // 4th arg historically is the console-forward callback; tolerate an
  // options object there too (renderer passes { width, height, fullscreen }).
  if (onConsoleLog && typeof onConsoleLog === 'object') {
    options = onConsoleLog;
    onConsoleLog = null;
  }
  const opts = options || {};
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  // Default the test window to full HD (1920x1080), clamped to the display.
  const wantW = Math.max(800, Math.min(Number(opts.width) || 1920, width));
  const wantH = Math.max(600, Math.min(Number(opts.height) || 1080, height));
  const gameWidth = (opts.fullscreen || opts.mode === 'fullscreen') ? width : wantW;
  const gameHeight = (opts.fullscreen || opts.mode === 'fullscreen') ? height : wantH;
  const gameX = Number.isFinite(Number(opts.x)) ? Number(opts.x) : Math.round(x + Math.max(0, (width - gameWidth) / 2));
  const gameY = Number.isFinite(Number(opts.y)) ? Number(opts.y) : Math.round(y + Math.max(0, (height - gameHeight) / 2));

  const attachListeners = (win) => {
    if (win._vibeListenersAttached) return;
    win._vibeListenersAttached = true;
    // Forward console events and load state back to dashboard (mainWindow)
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) {
        recordPlaytestEvent(null, { type: 'game-console-error', level, message: String(message).slice(0, 500), line, sourceId });
      }
      if (typeof onConsoleLog === 'function') {
        onConsoleLog(level, message, line, sourceId);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-console', { level, message });
      }
    });

    win.webContents.on('did-finish-load', () => {
      // Seed the virtual bot-mouse overlay in the test window so it is
      // present (hidden until the bot acts) before any agent step runs.
      try {
        const botCursor = require('../runtime/bot_cursor');
        win.webContents.executeJavaScript(botCursor.ensureCursorJS()).catch(() => {});
      } catch (_) { /* overlay is best-effort; clicks still work without it */ }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-loaded');
      }
    });

    win.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-fail-load', { errorCode, errorDescription, validatedURL });
      }
    });

    win.on('closed', () => {
      gameWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-closed');
      }
    });
  };

  if (isGameWindowActive()) {
    gameWindow.setBounds({ x: gameX, y: gameY, width: gameWidth, height: gameHeight });
    attachListeners(gameWindow);
    if (opts.fullscreen || opts.mode === 'fullscreen') {
      try { gameWindow.setFullScreen(true); } catch (_) {}
    } else {
      try { gameWindow.setFullScreen(false); } catch (_) {}
    }
    try {
      await gameWindow.loadURL(url);
    } catch (err) {
      return { success: false, url, error: err.message };
    }
    if (!isHeadless) {
      gameWindow.focus();
    }
  } else {
    gameWindow = new BrowserWindow({
      x: gameX,
      y: gameY,
      width: gameWidth,
      height: gameHeight,
      show: !isHeadless,
      fullscreen: !!(opts.fullscreen || opts.mode === 'fullscreen') && !isHeadless,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true
      },
      title: "AI Playtest Target Game Window"
    });
    attachListeners(gameWindow);
    try {
      await gameWindow.loadURL(url);
    } catch (err) {
      return { success: false, url, error: err.message };
    }
  }
  return { success: true, url };
}

function getGameWindowBounds() {
  if (!isGameWindowActive()) return null;
  try {
    const b = gameWindow.getBounds();
    return { x: b.x, y: b.y, width: b.width, height: b.height, fullscreen: gameWindow.isFullScreen() };
  } catch (_) {
    return null;
  }
}

function focusGameWindow() {
  if (!isGameWindowActive()) return { success: false, error: 'Game window is not open' };
  try {
    if (gameWindow.isMinimized()) gameWindow.restore();
    gameWindow.show();
    gameWindow.focus();
    gameWindow.moveTop();
  } catch (_) {}
  return { success: true, ...(getGameWindowBounds() || {}) };
}

async function evalInGameWindow(script) {
  if (isGameWindowActive()) {
    return await withGameTimeout(
      gameWindow.webContents.executeJavaScript(script),
      'Game window eval'
    );
  }
  throw new Error("Game window is not open");
}

async function captureGameScreenshot() {
  if (isGameWindowActive()) {
    const img = await withGameTimeout(
      gameWindow.webContents.capturePage(),
      'Game window screenshot'
    );
    const resized = img.resize({ width: 512 });
    const jpegBuffer = resized.toJPEG(50);
    return jpegBuffer.toString('base64');
  }
  throw new Error("Game window is not open");
}

function reloadGameWindow() {
  if (isGameWindowActive()) {
    gameWindow.webContents.reload();
    return { success: true };
  }
  return { success: false, error: 'Game window is not open' };
}

async function startPlaytestRecording(projectRoot, options, fallbackWindow) {
  return await getPlaytestRecorder(projectRoot, fallbackWindow).start(options);
}
async function stopPlaytestRecording(projectRoot) {
  return await getPlaytestRecorder(projectRoot).stop();
}
function getPlaytestRecordingStatus() { return playtestRecorder ? playtestRecorder.status() : { recording: false }; }
function recordPlaytestEvent(projectRoot, event) { if (playtestRecorder) playtestRecorder.recordEvent(event); }

function openGameDevTools() {
  if (gameWindow) {
    gameWindow.webContents.openDevTools();
    return true;
  }
  return false;
}

// Show/hide the robot-emoji bot cursor in the test window. The worker
// asserts bot control on every bot action; call with false when the human
// takes over or the agent stops.
async function setBotControlInGameWindow(on) {
  if (!isGameWindowActive()) return { success: false, error: 'Game window is not open' };
  try {
    const botCursor = require('../runtime/bot_cursor');
    const res = await withGameTimeout(
      gameWindow.webContents.executeJavaScript(botCursor.setBotControlJS(on)),
      'Game window bot cursor'
    );
    return { success: true, result: res };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getGameWindow,
  isGameWindowActive,
  openGameWindow,
  getGameWindowBounds,
  focusGameWindow,
  evalInGameWindow,
  captureGameScreenshot,
  reloadGameWindow,
  openGameDevTools,
  setBotControlInGameWindow
  , startPlaytestRecording, stopPlaytestRecording, getPlaytestRecordingStatus, recordPlaytestEvent
};
