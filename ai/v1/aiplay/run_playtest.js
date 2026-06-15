const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ARTIFACTS_DIR = 'C:\\Users\\ventu\\.gemini\\antigravity\\brain\\ecb08d1b-e9a9-4456-9936-a49b02e38a04';
const SCREENSHOT_DIR = path.join(ARTIFACTS_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Read args
const headless = process.argv.includes('--headless');
console.log(`Starting playtest. Mode: ${headless ? 'HEADLESS' : 'HEADFUL'}`);

// Start Electron process
const electronCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['electron', '.', '--game', 'friendslop', '--autoplay'];
if (headless) {
  args.push('--headless');
}

const child = spawn(electronCmd, args, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Helper to make POST request
function postJSON(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9999,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Helper to download screenshot
function saveScreenshot(filename) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9999/screenshot?target=game', (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get screenshot: ${res.statusCode}`));
        return;
      }
      const filePath = path.join(SCREENSHOT_DIR, filename);
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        console.log(`Saved screenshot: ${filePath}`);
        resolve(filePath);
      });
    }).on('error', reject);
  });
}

// Orchestrate playtest
async function run() {
  console.log("Waiting 4 seconds for Electron app to initialize and load the game...");
  await new Promise(resolve => setTimeout(resolve, 4000));

  console.log("Triggering start command to AI Agent...");
  try {
    await postJSON('/control', { command: 'start' });
    console.log("AI Agent started.");
  } catch (err) {
    console.error("Failed to start agent via control API, maybe the server isn't up yet. Retrying in 2s...", err);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await postJSON('/control', { command: 'start' });
  }

  // Take 5 screenshots in 15 seconds (one every 3 seconds)
  for (let i = 1; i <= 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`Taking screenshot ${i}/5...`);
    try {
      await saveScreenshot(`playtest_${i}.png`);
    } catch (e) {
      console.error(`Failed to capture screenshot ${i}:`, e.message);
    }
  }

  console.log("Playtest complete. Shutting down Electron...");
  child.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Playtest orchestrator failed:", err);
  child.kill();
  process.exit(1);
});
