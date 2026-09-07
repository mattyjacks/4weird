const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;

const isHeadless = process.argv.includes('--headless');

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
    icon: path.join(__dirname, 'src', 'icon.png') // Fallback if icon doesn't exist
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('cli-args', process.argv);
  });

  // Ensure window is focused and ready for interaction
  if (!isHeadless) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }

  // Open external links in default browser
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

// IPC Handler for executing python inputs simulator
ipcMain.handle('run-input-sim', async (event, args) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, 'input_sim.py');
    
    console.log(`Spawning: ${pythonPath} ${scriptPath} ${args.join(' ')}`);
    const pyProcess = spawn(pythonPath, [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pyProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout });
      } else {
        resolve({ success: false, error: stderr || `Process exited with code ${code}`, stdout });
      }
    });
  });
});

// IPC Handler for scanning running native processes on Windows
ipcMain.handle('scan-processes', async (event) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, error: 'Process scanning is only supported on Windows.' });
      return;
    }
    
    // Spawn PowerShell to get windowed processes with non-empty MainWindowTitle
    const cmd = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json`;
    console.log(`Spawning PowerShell process scanner`);
    const ps = spawn('powershell', ['-Command', cmd]);
    
    let stdout = '';
    let stderr = '';
    
    ps.stdout.on('data', (data) => stdout += data.toString());
    ps.stderr.on('data', (data) => stderr += data.toString());
    
    ps.on('close', (code) => {
      if (code !== 0) {
        resolve({ success: false, error: stderr || `PowerShell exited with code ${code}` });
        return;
      }
      try {
        if (!stdout.trim()) {
          resolve({ success: true, processes: [] });
          return;
        }
        const processes = JSON.parse(stdout);
        const list = Array.isArray(processes) ? processes : (processes ? [processes] : []);
        resolve({ success: true, processes: list });
      } catch (err) {
        resolve({ success: false, error: `Failed to parse processes: ${err.message}`, raw: stdout });
      }
    });
  });
});

// IPC Handler to capture a screenshot of the display or active window via Python/PyAutoGUI
ipcMain.handle('capture-native-screenshot', async (event, windowTitle) => {
  return new Promise((resolve) => {
    const tempFile = path.join(app.getPath('temp'), `aiplay_shot_${Date.now()}.jpg`);
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, 'input_sim.py');
    const args = ['screenshot', tempFile];
    if (windowTitle) {
      args.push(windowTitle);
    }
    
    console.log(`Spawning: ${pythonPath} ${scriptPath} ${args.join(' ')}`);
    const pyProcess = spawn(pythonPath, [scriptPath, ...args]);
    
    let stderr = '';
    
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pyProcess.on('close', (code) => {
      if (code === 0 && fs.existsSync(tempFile)) {
        const base64Data = fs.readFileSync(tempFile, 'base64');
        try {
          fs.unlinkSync(tempFile); // Cleanup temp file
        } catch (e) {}
        resolve({ success: true, base64: base64Data });
      } else {
        resolve({ success: false, error: stderr || `Python process exited with code ${code}` });
      }
    });
  });
});

// IPC Handler for scanning source directory files
ipcMain.handle('scan-directory', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist' };
    }
    
    const files = [];
    const maxFiles = 30; // Limit file reading to prevent massive prompts
    
    function scan(currentDir) {
      const list = fs.readdirSync(currentDir);
      for (const item of list) {
        if (files.length >= maxFiles) break;
        
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        // Exclude node_modules, .git, images, media, etc.
        if (stat.isDirectory()) {
          if (['node_modules', '.git', 'images', 'assets', 'media', 'build', 'dist'].includes(item)) {
            continue;
          }
          scan(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (['.js', '.html', '.css', '.json', '.ts', '.gd', '.cs', '.lua', '.py'].includes(ext)) {
            const relPath = path.relative(dirPath, fullPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            // Remove comments and blank lines to optimize prompt token payload
            const minifiedContent = content
              .replace(/\/\*[\s\S]*?\*\//g, '')          // Block comments
              .replace(/^\s*\/\/.*$/gm, '')              // Line-beginning comments
              .replace(/([^:'"`\s])\s*\/\/.*$/gm, '$1') // Inline comments (avoid URLs like http://)
              .replace(/^\s*[\r\n]/gm, '')               // Empty lines
              .slice(0, 3000);

            files.push({
              path: relPath,
              content: minifiedContent
            });
          }
        }
      }
    }
    
    scan(dirPath);
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

let gameWindow = null;

ipcMain.handle('open-game-window', async (event, url) => {
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
  return { success: true };
});

ipcMain.handle('eval-in-game-window', async (event, script) => {
  if (gameWindow) {
    return await gameWindow.webContents.executeJavaScript(script);
  }
  throw new Error("Game window is not open");
});

ipcMain.handle('capture-game-screenshot', async (event) => {
  if (gameWindow) {
    const img = await gameWindow.webContents.capturePage();
    const resized = img.resize({ width: 512 });
    const jpegBuffer = resized.toJPEG(50);
    return jpegBuffer.toString('base64');
  }
  throw new Error("Game window is not open");
});

ipcMain.handle('reload-game-window', async (event) => {
  if (gameWindow) {
    gameWindow.webContents.reload();
    return true;
  }
  return false;
});

ipcMain.handle('open-game-devtools', async (event) => {
  if (gameWindow) {
    gameWindow.webContents.openDevTools();
    return true;
  }
  return false;
});

ipcMain.handle('is-game-window-active', () => {
  return gameWindow !== null;
});

// Import Local API Server module
const { LocalAPIServer } = require('./lib/api_server');

// Initialize Local API Server connected to Electron windows & handlers
const localApiServer = new LocalAPIServer({
  port: 9999,
  runtimeMode: 'electron',
  handlers: {
    getGames: async () => {
      const websiteV1Dir = path.join(__dirname, '..', '..', 'website', 'v1');
      const gamesDir = path.join(websiteV1Dir, 'games');
      const games = [];
      
      if (fs.existsSync(path.join(gamesDir, 'html'))) {
        const htmlItems = fs.readdirSync(path.join(gamesDir, 'html'));
        for (const item of htmlItems) {
          if (item.startsWith('_') || item === 'images') continue;
          const itemPath = path.join(gamesDir, 'html', item);
          if (fs.statSync(itemPath).isDirectory()) {
            const jsonPath = path.join(itemPath, 'game.json');
            let meta = { title: item, maker: '4weird' };
            if (fs.existsSync(jsonPath)) {
              try { meta = { ...meta, ...JSON.parse(fs.readFileSync(jsonPath, 'utf8')) }; } catch (e) {}
            }
            games.push({
              id: item,
              title: meta.title || item,
              maker: meta.maker || meta.author || '4weird',
              description: meta.description || '',
              url: `http://localhost:8888/games/html/${item}/index.html`,
              path: path.relative(websiteV1Dir, itemPath)
            });
          }
        }
      }
      return games;
    },

    launchGame: async (gameId) => {
      const url = gameId.startsWith('http') ? gameId : `http://localhost:8888/games/html/${gameId}/index.html`;
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x, y, width, height } = primaryDisplay.workArea;
      const ideWidth = Math.floor(width / 2);

      if (gameWindow) {
        gameWindow.loadURL(url);
      } else {
        gameWindow = new BrowserWindow({
          x: x + ideWidth,
          y,
          width: width - ideWidth,
          height,
          show: !isHeadless,
          webPreferences: { nodeIntegration: true, contextIsolation: false, devTools: true },
          title: `AI Playtest - ${gameId}`
        });
        gameWindow.loadURL(url);

        gameWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
          localApiServer.addConsoleLog(level === 2 ? 'error' : (level === 1 ? 'warn' : 'info'), message, 'game_window');
          if (mainWindow) mainWindow.webContents.send('webview-console', { level, message, line, sourceId });
        });

        gameWindow.on('closed', () => { gameWindow = null; });
      }
      return { success: true, url };
    },

    captureScreenshot: async (target) => {
      const win = (target === 'dashboard' || !gameWindow) ? mainWindow : gameWindow;
      if (!win) return null;
      const img = await win.webContents.capturePage();
      return img.toPNG();
    },

    getLogs: async () => {
      return [];
    },

    getGameState: async () => {
      if (!gameWindow) return { active: false };
      try {
        const stateStr = await gameWindow.webContents.executeJavaScript(`
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
      const win = gameWindow || mainWindow;
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
      const win = gameWindow || mainWindow;
      if (!win) throw new Error('No window available for javascript execution');
      return await win.webContents.executeJavaScript(script);
    },

    reloadGame: async () => {
      if (gameWindow) {
        gameWindow.webContents.reload();
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

