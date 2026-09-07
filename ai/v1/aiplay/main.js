const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');

// Modular helper imports
const { runInputSimulator, scanWindowsProcesses, captureNativeScreenshot } = require('./src/main_process/native_runner');
const { scanSourceDirectory } = require('./src/main_process/file_scanner');
const { startStaticServer } = require('./src/main_process/static_server');
const {
  getGameWindow,
  isGameWindowActive,
  openGameWindow,
  evalInGameWindow,
  captureGameScreenshot,
  reloadGameWindow,
  openGameDevTools
} = require('./src/main_process/game_window_manager');
const { discoverGames } = require('./src/main_process/game_discovery');
const { LocalAPIServer } = require('./lib/api_server');

let mainWindow;
const isHeadless = process.argv.includes('--headless');

// AIPLAY is a debugger first: it must still open on machines where Electron's
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
    title: "4weird aiplay - game runner and fixer",
    icon: path.join(__dirname, 'src', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('cli-args', process.argv);
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('run-input-sim', async (event, args) => {
  return await runInputSimulator(args, __dirname);
});

ipcMain.handle('scan-processes', async (event) => {
  return await scanWindowsProcesses();
});

ipcMain.handle('capture-native-screenshot', async (event, windowTitle) => {
  return await captureNativeScreenshot(app.getPath('temp'), windowTitle, __dirname);
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

// Ensure static server is running for game files
const WEBSITE_V1_DIR = path.join(__dirname, '..', '..', '..', 'website', 'v1');
const STATIC_PORT = 8888;
startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);

// Initialize Local API Server connected to Electron windows & handlers
const localApiServer = new LocalAPIServer({
  port: 9999,
  runtimeMode: 'electron',
  handlers: {
    getGames: async () => {
      return discoverGames(WEBSITE_V1_DIR, STATIC_PORT);
    },

    launchGame: async (gameId) => {
      const url = gameId.startsWith('http') ? gameId : `http://localhost:${STATIC_PORT}/games/html/${gameId}/index.html`;
      return await openGameWindow(url, isHeadless, mainWindow, (level, message, line, sourceId) => {
        localApiServer.addConsoleLog(level === 2 ? 'error' : (level === 1 ? 'warn' : 'info'), message, 'game_window');
      });
    },

    captureScreenshot: async (target) => {
      const gameWin = getGameWindow();
      const win = (target === 'dashboard' || !gameWin) ? mainWindow : gameWin;
      if (!win) return null;
      const img = await win.webContents.capturePage();
      return img.toPNG();
    },

    getLogs: async () => [],

    getGameState: async () => {
      const gameWin = getGameWindow();
      if (!gameWin) return { active: false };
      try {
        const stateStr = await gameWin.webContents.executeJavaScript(`
          JSON.stringify({
            title: document.title,
            url: window.location.href,
            canvas: !!document.querySelector('canvas'),
            score: window.score || (window.game && window.game.score) || 0,
            isGameOver: window.isGameOver || (window.game && window.game.isGameOver) || false,
            playerState: window.player ? { x: window.player.x, y: window.player.y, hp: window.player.hp } : null
          })
        `);
        return JSON.parse(stateStr);
      } catch (e) {
        return { active: true, error: e.message };
      }
    },

    executeAction: async (action) => {
      const win = getGameWindow() || mainWindow;
      if (!win) return { success: false, error: 'No active window' };

      if (action.type === 'click') {
        const x = action.x || 100;
        const y = action.y || 100;
        win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
        return { success: true, action: 'click', x, y };
      } else if (action.type === 'keydown' || action.type === 'keyup') {
        win.webContents.sendInputEvent({ type: action.type, keyCode: action.key || action.code });
        return { success: true, action: action.type, key: action.key };
      }
      return { success: false, error: `Unsupported action type: ${action.type}` };
    },

    evalJavaScript: async (script) => {
      const win = getGameWindow() || mainWindow;
      if (!win) throw new Error('No window available for javascript execution');
      return await win.webContents.executeJavaScript(script);
    },

    reloadGame: async () => {
      const gameWin = getGameWindow();
      if (gameWin) {
        gameWin.webContents.reload();
        return { success: true };
      }
      return { success: false, error: 'Game window not open' };
    }
  }
});

localApiServer.start().then(() => {
  console.log('[Main] Integrated AIPlay Local REST API Server active on http://localhost:9999');
}).catch(err => {
  console.error('[Main] Failed to start Local REST API Server:', err);
});
