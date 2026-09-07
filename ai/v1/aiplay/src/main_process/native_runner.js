const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Execute python input simulator script.
 */
function runInputSimulator(args, baseDir = __dirname) {
  return new Promise((resolve) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(baseDir, 'input_sim.py');

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
    const tempFile = path.join(tempDir, `aiplay_shot_${Date.now()}.jpg`);
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(baseDir, 'input_sim.py');
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

module.exports = {
  runInputSimulator,
  scanWindowsProcesses,
  captureNativeScreenshot
};
