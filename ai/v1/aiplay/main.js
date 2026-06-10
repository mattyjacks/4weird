const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      devTools: true
    },
    title: "AI Game Player & Debugger Dashboard",
    icon: path.join(__dirname, 'src', 'icon.png') // Fallback if icon doesn't exist
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

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
              .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
              .replace(/^\s*[\r\n]/gm, '')
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
      const img = await mainWindow.webContents.capturePage();
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
        
        if (mainWindow) {
          const result = await mainWindow.webContents.executeJavaScript(script);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Main window not available');
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Execution Error: ${err.message}`);
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Endpoint not found. Use /screenshot, /data, /control, or /eval.');
  }
});

server.listen(9999, '127.0.0.1', () => {
  console.log('AI control HTTP server listening on http://localhost:9999');
});
