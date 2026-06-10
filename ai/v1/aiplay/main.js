const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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
