const { BrowserWindow, screen } = require('electron');

let gameWindow = null;

function getGameWindow() {
  return gameWindow;
}

function isGameWindowActive() {
  return gameWindow !== null;
}

async function openGameWindow(url, isHeadless, mainWindow, onConsoleLog) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const ideWidth = Math.floor(width / 2);
  const gameWidth = width - ideWidth;
  const gameHeight = height;
  const gameX = x + ideWidth;
  const gameY = y;

  if (gameWindow) {
    gameWindow.setBounds({ x: gameX, y: gameY, width: gameWidth, height: gameHeight });
    gameWindow.loadURL(url);
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
    gameWindow.loadURL(url);

    // Forward console events and load state back to dashboard (mainWindow)
    gameWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (typeof onConsoleLog === 'function') {
        onConsoleLog(level, message, line, sourceId);
      }
      if (mainWindow) {
        mainWindow.webContents.send('webview-console', { level, message });
      }
    });

    gameWindow.webContents.on('did-finish-load', () => {
      if (mainWindow) {
        mainWindow.webContents.send('webview-loaded');
      }
    });

    gameWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
      if (mainWindow) {
        mainWindow.webContents.send('webview-fail-load', { errorCode, errorDescription, validatedURL });
      }
    });

    gameWindow.on('closed', () => {
      gameWindow = null;
      if (mainWindow) {
        mainWindow.webContents.send('webview-closed');
      }
    });
  }
  return { success: true, url };
}

async function evalInGameWindow(script) {
  if (gameWindow) {
    return await gameWindow.webContents.executeJavaScript(script);
  }
  throw new Error("Game window is not open");
}

async function captureGameScreenshot() {
  if (gameWindow) {
    const img = await gameWindow.webContents.capturePage();
    const resized = img.resize({ width: 512 });
    const jpegBuffer = resized.toJPEG(50);
    return jpegBuffer.toString('base64');
  }
  throw new Error("Game window is not open");
}

function reloadGameWindow() {
  if (gameWindow) {
    gameWindow.webContents.reload();
    return true;
  }
  return false;
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
