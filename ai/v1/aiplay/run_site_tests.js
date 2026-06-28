const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Paths
const ARTIFACTS_DIR = 'C:\\Users\\ventu\\.gemini\\antigravity\\brain\\8bb3ad9c-adaf-4412-80cc-0d31065a68a6';
const SCREENSHOT_DIR = path.join(ARTIFACTS_DIR, 'screenshots');
const REPO_TEST_RESULTS_DIR = 'c:\\GitHub5\\4weird\\test-results';
const REPO_SCREENSHOT_DIR = path.join(REPO_TEST_RESULTS_DIR, 'screenshots');

// Ensure directories exist
[SCREENSHOT_DIR, REPO_SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Simple Static Server
function startServer(port, docRoot) {
  const server = http.createServer((req, res) => {
    let rawPath = new URL(req.url, `http://localhost:${port}`).pathname;
    let filePath = path.join(docRoot, decodeURIComponent(rawPath));
    
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch (e) {}

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.xml': 'application/xml',
      '.woff2': 'font/woff2'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port);
  return server;
}

// Discover Pages
function discoverPages(websiteV1Dir) {
  const pages = [];

  // 1. Home and top-level pages
  const topFiles = fs.readdirSync(websiteV1Dir);
  for (const item of topFiles) {
    const fullPath = path.join(websiteV1Dir, item);
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory() && item.endsWith('.html')) {
      let name = item.replace('.html', '');
      if (name === 'index') name = 'Home';
      else name = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      pages.push({
        name: `Website: ${name}`,
        url: `http://localhost:8888/${item}`
      });
    } else if (stat.isDirectory() && ['academy', 'aiplay', 'games'].includes(item)) {
      const indexFile = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        const name = item.charAt(0).toUpperCase() + item.slice(1);
        pages.push({
          name: `Website: ${name} Hub`,
          url: `http://localhost:8888/${item}/index.html`
        });
      }
    }
  }

  // 2. Games
  const gamesDir = path.join(websiteV1Dir, 'games');
  if (fs.existsSync(gamesDir)) {
    // Direct subdirectories under games/ (e.g. lastwordszombies)
    const directItems = fs.readdirSync(gamesDir);
    for (const item of directItems) {
      const fullPath = path.join(gamesDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && item !== 'html' && item !== 'images') {
        const indexFile = path.join(fullPath, 'index.html');
        if (fs.existsSync(indexFile)) {
          pages.push({
            name: `Game: ${item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
            url: `http://localhost:8888/games/${item}/index.html`
          });
        }
      }
    }

    // Games under games/html/
    const htmlGamesDir = path.join(gamesDir, 'html');
    if (fs.existsSync(htmlGamesDir)) {
      const htmlItems = fs.readdirSync(htmlGamesDir);
      for (const item of htmlItems) {
        const fullPath = path.join(htmlGamesDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && item !== '_TEMPLATE' && item !== 'images') {
          const indexFile = path.join(fullPath, 'index.html');
          if (fs.existsSync(indexFile)) {
            pages.push({
              name: `Game: ${item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
              url: `http://localhost:8888/games/html/${item}/index.html`
            });
          }
        }
      }
    }
  }

  return pages;
}

// Test page
async function testPage(win, page) {
  return new Promise((resolve) => {
    console.log(`\n[TESTING] ${page.name} -> ${page.url}`);
    
    const pageErrors = [];
    const consoleLogs = [];
    let finished = false;
    let graceTimeout = null;

    // Clear and attach fresh webContents event listeners
    win.webContents.removeAllListeners('console-message');
    win.webContents.removeAllListeners('did-fail-load');
    win.webContents.removeAllListeners('did-finish-load');
    win.webContents.removeAllListeners('render-process-gone');

    const watchdogTimeout = setTimeout(() => {
      if (finished) return;
      pageErrors.push('Page load timed out (8s limit)');
      cleanupAndResolve('timeout');
    }, 8000);

    const cleanupAndResolve = async (status) => {
      if (finished) return;
      finished = true;

      // Clear all timers immediately
      clearTimeout(watchdogTimeout);
      if (graceTimeout) clearTimeout(graceTimeout);

      // Capture screenshot
      let artifactScreenshotPath = '';
      try {
        if (!win.isDestroyed() && win.webContents) {
          const image = await win.webContents.capturePage();
          const safeName = page.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          artifactScreenshotPath = path.join(SCREENSHOT_DIR, `${safeName}.png`);
          fs.writeFileSync(artifactScreenshotPath, image.toPNG());

          const repoScreenshotPath = path.join(REPO_SCREENSHOT_DIR, `${safeName}.png`);
          fs.writeFileSync(repoScreenshotPath, image.toPNG());
        }
      } catch (e) {
        console.error(`  [WARN] Failed to capture screenshot for ${page.name}:`, e.message);
      }

      resolve({
        name: page.name,
        url: page.url,
        status: status,
        errors: pageErrors,
        logs: consoleLogs,
        screenshot: artifactScreenshotPath
      });
    };

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (finished) return;
      const levelNames = ['log', 'warning', 'error', 'debug'];
      const levelName = levelNames[level] || 'info';
      consoleLogs.push({ level: levelName, message, line, sourceId });
      
      if (levelName === 'error') {
        const isIgnoredError = message.includes('google-analytics') || 
                               message.includes('googletagmanager') || 
                               message.includes('Security Warning');
        if (!isIgnoredError) {
          pageErrors.push(`Console Error: ${message} (at ${sourceId}:${line})`);
        }
      }
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (finished) return;
      if (!validatedURL.endsWith('favicon.ico')) {
        pageErrors.push(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
      }
    });

    win.webContents.on('render-process-gone', (event, details) => {
      if (finished) return;
      pageErrors.push(`Renderer process gone: ${details.reason} (exit code: ${details.exitCode})`);
      cleanupAndResolve('failed');
    });

    win.webContents.on('did-finish-load', () => {
      if (finished) return;
      if (graceTimeout) clearTimeout(graceTimeout);
      graceTimeout = setTimeout(() => {
        const status = pageErrors.length > 0 ? 'failed' : 'passed';
        if (status === 'passed') {
          console.log(`  [OK] Passed!`);
        } else {
          console.log(`  [FAIL] Failed with ${pageErrors.length} errors:`);
          pageErrors.forEach(err => console.log(`    - ${err}`));
        }
        cleanupAndResolve(status);
      }, 1500);
    });

    win.loadURL(page.url).catch(err => {
      if (finished) return;
      pageErrors.push(`Error loading page URL: ${err.message}`);
      cleanupAndResolve('failed');
    });
  });
}

// Main Orchestrator
app.whenReady().then(async () => {
  const websiteV1Dir = path.join(__dirname, '..', '..', '..', 'website', 'v1');
  const server = startServer(8888, websiteV1Dir);
  console.log(`Local test server listening on http://localhost:8888`);

  const pages = discoverPages(websiteV1Dir);
  console.log(`Discovered ${pages.length} pages to test.`);

  // Create a single browser window to reuse for all tests
  const win = new BrowserWindow({
    show: true,
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  const results = [];
  for (const page of pages) {
    const res = await testPage(win, page);
    results.push(res);
  }

  // Clean up window
  try {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  } catch (e) {
    console.error("Failed to destroy browser window:", e.message);
  }

  // Save JSON report in repo test-results
  const failedTests = results.filter(r => r.status === 'failed' || r.status === 'timeout').map(r => r.name);
  const status = failedTests.length === 0 ? 'passed' : 'failed';
  
  const reportData = {
    status,
    timestamp: new Date().toISOString(),
    totalTested: results.length,
    passedCount: results.length - failedTests.length,
    failedCount: failedTests.length,
    failedTests,
    details: results
  };

  const reportPath = path.join(REPO_TEST_RESULTS_DIR, 'test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\nSaved test report to ${reportPath}`);

  // Save a copy in artifacts dir
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_report.json'), JSON.stringify(reportData, null, 2), 'utf8');

  // Close server and exit
  server.close(() => {
    console.log("Server stopped. Exiting Electron...");
    app.quit();
  });
}).catch(err => {
  console.error("Test execution failed:", err);
  app.quit();
});
