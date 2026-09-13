const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getInputSimulatorPath(baseDir) {
  // Electron packages application sources into app.asar. Python cannot execute
  // a script from inside that archive, so use the explicitly unpacked copy in
  // production and the project copy while developing.
  const packaged = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'scripts', 'python', 'input_sim.py');
  return fs.existsSync(packaged) ? packaged : path.join(baseDir, 'scripts', 'python', 'input_sim.py');
}

/**
 * Execute python input simulator script.
 */
function runInputSimulator(args, baseDir = __dirname) {
  return new Promise((resolve) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = getInputSimulatorPath(baseDir);

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
}

/**
 * Scan running processes on Windows with non-empty MainWindowTitle via PowerShell.
 */
function scanWindowsProcesses() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, error: 'Process scanning is only supported on Windows.' });
      return;
    }

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
}

/**
 * Capture native display or active window screenshot via python helper.
 */
function captureNativeScreenshot(tempDir, windowTitle, baseDir = __dirname) {
  return new Promise((resolve) => {
    const tempFile = path.join(tempDir, `vibecodeworker_shot_${Date.now()}.jpg`);
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = getInputSimulatorPath(baseDir);
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
          fs.unlinkSync(tempFile);
        } catch (e) {}
        resolve({ success: true, base64: base64Data });
      } else {
        resolve({ success: false, error: stderr || `Python process exited with code ${code}` });
      }
    });
  });
}

function configureNativeGameOverlay(windowTitle, baseDir = __dirname) {
  return runInputSimulator(['overlay', windowTitle], baseDir);
}

/**
 * Steam supports Source-engine launch arguments in its run protocol. Keep the
 * mapping in the main process so the renderer cannot construct arbitrary
 * external URLs. Window-relative capture in input_sim.py works for every mode.
 */
function buildSteamRunUrl(appId, { mode = 'exclusive-fullscreen', width = 1280, height = 720 } = {}) {
  const safeAppId = Number(appId);
  if (!Number.isInteger(safeAppId) || safeAppId <= 0) throw new Error('Invalid Steam app id');
  const safeWidth = Math.min(7680, Math.max(640, Math.round(Number(width) || 1280)));
  const safeHeight = Math.min(4320, Math.max(480, Math.round(Number(height) || 720)));
  const argsByMode = {
    'exclusive-fullscreen': ['-fullscreen'],
    borderless: ['-windowed', '-noborder'],
    'windowed-fullscreen': ['-windowed', '-noborder', '-w', String(safeWidth), '-h', String(safeHeight)],
    'partial-windowed': ['-windowed', '-w', String(safeWidth), '-h', String(safeHeight)]
  };
  const args = argsByMode[mode] || argsByMode['exclusive-fullscreen'];
  return {
    url: `steam://run/${safeAppId}//${encodeURIComponent(args.join(' '))}`,
    mode: Object.prototype.hasOwnProperty.call(argsByMode, mode) ? mode : 'exclusive-fullscreen',
    args
  };
}

module.exports = {
  runInputSimulator,
  scanWindowsProcesses,
  captureNativeScreenshot,
  configureNativeGameOverlay,
  buildSteamRunUrl
};
