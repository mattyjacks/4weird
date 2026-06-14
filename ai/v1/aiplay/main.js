const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;

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

  // Ensure window is focused and ready for interaction
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

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
    gameWindow.focus();
  } else {
    gameWindow = new BrowserWindow({
      x: gameX,
      y: gameY,
      width: gameWidth,
      height: gameHeight,
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

// Start local HTTP server on port 9999 for external AI Agent scraping and control
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/screenshot') {
    if (!mainWindow) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Electron window not initialized');
      return;
    }
    try {
      const targetParam = parsedUrl.searchParams.get('target');
      const targetWindow = targetParam === 'dashboard' ? mainWindow : (gameWindow || mainWindow);
      const img = await targetWindow.webContents.capturePage();
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(img.toPNG());
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Screenshot capture failed: ${e.message}`);
    }
  } else if (pathname === '/data') {
    try {
      const dataDir = path.join(__dirname, 'data');
      const configPath = path.join(__dirname, 'config.json');
      
      const payload = {
        timestamp: new Date().toISOString(),
        config: {},
        bugs: [],
        tokenUsage: {},
        liveLogs: []
      };

      if (fs.existsSync(configPath)) {
        payload.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      const bugsPath = path.join(dataDir, 'bugs_log.json');
      if (fs.existsSync(bugsPath)) {
        payload.bugs = JSON.parse(fs.readFileSync(bugsPath, 'utf8'));
      }

      const tokenPath = path.join(dataDir, 'token_usage.json');
      if (fs.existsSync(tokenPath)) {
        payload.tokenUsage = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      }

      const logsPath = path.join(dataDir, 'live_logs.json');
      if (fs.existsSync(logsPath)) {
        payload.liveLogs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Failed to retrieve data payload: ${e.message}`);
    }
  } else if (pathname === '/control') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed. Use POST.');
      return;
    }
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const params = JSON.parse(body);
        const command = params.command;
        
        if (!['start', 'pause', 'reload'].includes(command)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid command. Use "start", "pause", or "reload".');
          return;
        }
        
        if (mainWindow) {
          mainWindow.webContents.send('agent-control', { command });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Command '${command}' dispatched successfully` }));
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Main window not available');
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Bad Request: ${err.message}`);
      }
    });
  } else if (pathname === '/eval') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed. Use POST.');
      return;
    }
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        const script = params.script;
        
        const targetWindow = gameWindow || mainWindow;
        if (targetWindow) {
          const result = await targetWindow.webContents.executeJavaScript(script);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('No active window available');
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Execution Error: ${err.message}`);
      }
    });
  } else if (pathname === '/status') {
    if (!mainWindow) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Electron window not initialized');
      return;
    }
    try {
      const status = await mainWindow.webContents.executeJavaScript('window.getAgentStatus()');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Failed to get status: ${e.message}`);
    }
  } else if (pathname === '/config') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed. Use POST.');
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const config = JSON.parse(body);
        if (mainWindow) {
          const result = await mainWindow.webContents.executeJavaScript(`window.updateAgentConfig(${JSON.stringify(config)})`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Main window not available');
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Bad Request: ${err.message}`);
      }
    });
  } else if (pathname === '/elements') {
    if (!mainWindow) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Electron window not initialized');
      return;
    }
    try {
      const elements = await mainWindow.webContents.executeJavaScript('window.getInteractiveDOM()');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(elements, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Failed to get interactive DOM elements: ${e.message}`);
    }
  } else if (pathname === '/action') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed. Use POST.');
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const action = JSON.parse(body);
        if (mainWindow) {
          const result = await mainWindow.webContents.executeJavaScript(`window.executeAgentAction(${JSON.stringify(action)})`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Main window not available');
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Bad Request: ${err.message}`);
      }
    });
  } else if (pathname === '/step') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed. Use POST.');
      return;
    }
    try {
      if (mainWindow) {
        const result = await mainWindow.webContents.executeJavaScript('window.triggerAgentStep()');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result }));
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Main window not available');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Step Execution Error: ${err.message}`);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Endpoint not found. Use /screenshot, /data, /control, /eval, /status, /config, /elements, /action, or /step.');
  }
});

server.listen(9999, '127.0.0.1', () => {
  console.log('AI control HTTP server listening on http://localhost:9999');
});
