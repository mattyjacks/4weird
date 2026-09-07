const { BrowserWindow, screen } = require('electron');

let gameWindow = null;

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

async function openGameWindow(url, isHeadless, mainWindow, onConsoleLog) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const ideWidth = Math.floor(width / 2);
  const gameWidth = width - ideWidth;
  const gameHeight = height;
  const gameX = x + ideWidth;
  const gameY = y;

  const attachListeners = (win) => {
    if (win._vibeListenersAttached) return;
    win._vibeListenersAttached = true;
    // Forward console events and load state back to dashboard (mainWindow)
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (typeof onConsoleLog === 'function') {
        onConsoleLog(level, message, line, sourceId);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-console', { level, message });
      }
    });

    win.webContents.on('did-finish-load', () => {
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

function openGameDevTools() {
  if (gameWindow) {
    gameWindow.webContents.openDevTools();
    return true;
  }
  return false;
}

module.exports = {
  getGameWindow,
  isGameWindowActive,
  openGameWindow,
  evalInGameWindow,
  captureGameScreenshot,
  reloadGameWindow,
  openGameDevTools
};
