/**
 * AIPlay Local REST API Server
 * Provides full control and inspection API for Gemini and external tools.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

class LocalAPIServer {
  constructor(options = {}) {
    this.port = options.port || 9999;
    this.host = options.host || '127.0.0.1';
    this.server = null;
    this.appState = {
      startTime: Date.now(),
      activeGame: null,
      activeGameUrl: null,
      runtimeMode: options.runtimeMode || 'electron',
      logs: [],
      bugs: [],
      apiRequests: 0,
      recentActions: []
    };

    // Callbacks provided by host runner (Electron or Headless server)
    this.handlers = {
      getGames: options.getGames || (async () => []),
      launchGame: options.launchGame || (async (gameId) => ({ success: false, error: 'No launch handler' })),
      captureScreenshot: options.captureScreenshot || (async (target) => null),
      getLogs: options.getLogs || (async () => []),
      getGameState: options.getGameState || (async () => ({})),
      executeAction: options.executeAction || (async (action) => ({ success: false })),
      evalJavaScript: options.evalJavaScript || (async (script) => ({ success: false })),
      reloadGame: options.reloadGame || (async () => ({ success: false })),
      ...options.handlers
    };

    this.dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.bugsLogPath = path.join(this.dataDir, 'bugs_log.json');
    this.loadBugs();
  }

  loadBugs() {
    try {
      if (fs.existsSync(this.bugsLogPath)) {
        this.appState.bugs = JSON.parse(fs.readFileSync(this.bugsLogPath, 'utf8'));
      }
    } catch (err) {
      console.error('[API Server] Failed to load bugs log:', err.message);
    }
  }

  saveBugs() {
    try {
      fs.writeFileSync(this.bugsLogPath, JSON.stringify(this.appState.bugs, null, 2), 'utf8');
    } catch (err) {
      console.error('[API Server] Failed to save bugs log:', err.message);
    }
  }

  logRequest(method, pathname, status, durationMs) {
    this.appState.apiRequests++;
    this.appState.recentActions.unshift({
      timestamp: new Date().toISOString(),
      method,
      pathname,
      status,
      durationMs
    });
    if (this.appState.recentActions.length > 50) {
      this.appState.recentActions.pop();
    }
  }

  addConsoleLog(level, message, source = 'game') {
    this.appState.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      source
    });
    if (this.appState.logs.length > 500) {
      this.appState.logs.shift();
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        const startTime = Date.now();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;

        const sendJSON = (statusCode, data) => {
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data, null, 2));
          this.logRequest(req.method, pathname, statusCode, Date.now() - startTime);
        };

        const sendText = (statusCode, text) => {
          res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
          res.end(text);
          this.logRequest(req.method, pathname, statusCode, Date.now() - startTime);
        };

        const readBody = () => new Promise((resBody) => {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              resBody(body ? JSON.parse(body) : {});
            } catch (e) {
              resBody({ _raw: body, _error: e.message });
            }
          });
        });

        try {
          // ─── GET /api/status ─────────────────────────────────
          if (pathname === '/api/status' || pathname === '/status') {
            sendJSON(200, {
              success: true,
              system: '4weird AIPlay Local API Server',
              version: '2.0.0',
              uptimeSeconds: Math.floor((Date.now() - this.appState.startTime) / 1000),
              runtimeMode: this.appState.runtimeMode,
              activeGame: this.appState.activeGame,
              activeGameUrl: this.appState.activeGameUrl,
              totalBugs: this.appState.bugs.length,
              totalApiRequests: this.appState.apiRequests,
              memoryUsage: process.memoryUsage()
            });

          // ─── GET /api/games ──────────────────────────────────
          } else if (pathname === '/api/games') {
            const games = await this.handlers.getGames();
            sendJSON(200, { success: true, count: games.length, games });

          // ─── POST /api/game/launch ───────────────────────────
          } else if (pathname === '/api/game/launch') {
            if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
            const body = await readBody();
            const gameId = body.gameId || body.game;
            if (!gameId) return sendJSON(400, { success: false, error: 'Missing gameId in request body' });

            const result = await this.handlers.launchGame(gameId);
            if (result.success) {
              this.appState.activeGame = gameId;
              this.appState.activeGameUrl = result.url || null;
            }
            sendJSON(result.success ? 200 : 500, result);

          // ─── GET /api/game/screenshot ───────────────────────
          } else if (pathname === '/api/game/screenshot' || pathname === '/screenshot') {
            const target = parsedUrl.searchParams.get('target') || 'game';
            const format = parsedUrl.searchParams.get('format') || 'png';
            const acceptHeader = req.headers['accept'] || '';

            const imageBuffer = await this.handlers.captureScreenshot(target);
            if (!imageBuffer) {
              return sendJSON(500, { success: false, error: 'Game window/canvas screenshot unavailable' });
            }

            if (format === 'json' || acceptHeader.includes('application/json')) {
              sendJSON(200, {
                success: true,
                target,
                mimeType: 'image/png',
                base64: imageBuffer.toString('base64')
              });
            } else {
              res.writeHead(200, { 'Content-Type': 'image/png' });
              res.end(imageBuffer);
              this.logRequest(req.method, pathname, 200, Date.now() - startTime);
            }

          // ─── GET /api/game/logs ──────────────────────────────
          } else if (pathname === '/api/game/logs') {
            const liveLogs = await this.handlers.getLogs();
            const combinedLogs = [...this.appState.logs, ...liveLogs];
            sendJSON(200, { success: true, count: combinedLogs.length, logs: combinedLogs });

          // ─── GET /api/game/state ─────────────────────────────
          } else if (pathname === '/api/game/state') {
            const state = await this.handlers.getGameState();
            sendJSON(200, { success: true, activeGame: this.appState.activeGame, state });

          // ─── POST /api/game/action ───────────────────────────
          } else if (pathname === '/api/game/action' || pathname === '/action') {
            if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
            const body = await readBody();
            const result = await this.handlers.executeAction(body);
            sendJSON(result.success ? 200 : 500, result);

          // ─── POST /api/game/eval ─────────────────────────────
          } else if (pathname === '/api/game/eval' || pathname === '/eval') {
            if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
            const body = await readBody();
            const script = body.script;
            if (!script) return sendJSON(400, { success: false, error: 'Missing script in body' });

            const result = await this.handlers.evalJavaScript(script);
            sendJSON(200, { success: true, result });

          // ─── POST /api/game/patch ────────────────────────────
          } else if (pathname === '/api/game/patch') {
            if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
            const body = await readBody();
            const { filePath, targetContent, replacementContent, fullContent } = body;

            if (!filePath) return sendJSON(400, { success: false, error: 'Missing filePath parameter' });

            const absPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', '..', '..', filePath);
            if (!fs.existsSync(absPath)) {
              return sendJSON(404, { success: false, error: `File not found: ${absPath}` });
            }

            // Create a backup
            const backupPath = `${absPath}.bak_${Date.now()}`;
            fs.copyFileSync(absPath, backupPath);

            let newContent = '';
            let currentContent = fs.readFileSync(absPath, 'utf8');

            if (fullContent !== undefined) {
              newContent = fullContent;
            } else if (targetContent !== undefined && replacementContent !== undefined) {
              if (!currentContent.includes(targetContent)) {
                return sendJSON(400, { success: false, error: 'Target content not found in file' });
              }
              newContent = currentContent.replace(targetContent, replacementContent);
            } else {
              return sendJSON(400, { success: false, error: 'Provide fullContent or targetContent + replacementContent' });
            }

            fs.writeFileSync(absPath, newContent, 'utf8');
            this.addConsoleLog('info', `Patched file: ${path.basename(absPath)} (backup created: ${path.basename(backupPath)})`, 'api_server');

            // Trigger reload if active
            const reloadRes = await this.handlers.reloadGame();

            sendJSON(200, {
              success: true,
              message: `Successfully patched ${path.basename(absPath)}`,
              backupPath,
              reloaded: reloadRes.success || false
            });

          // ─── GET & POST /api/bugs ────────────────────────────
          } else if (pathname === '/api/bugs' || pathname === '/data') {
            if (req.method === 'GET') {
              sendJSON(200, { success: true, bugs: this.appState.bugs });
            } else if (req.method === 'POST') {
              const body = await readBody();
              const bug = {
                id: `BUG-${Date.now()}`,
                gameId: body.gameId || this.appState.activeGame || 'unknown',
                title: body.title || 'Uncategorized Issue',
                description: body.description || '',
                severity: body.severity || 'medium',
                status: body.status || 'open',
                timestamp: new Date().toISOString(),
                ...body
              };
              this.appState.bugs.unshift(bug);
              this.saveBugs();
              sendJSON(200, { success: true, bug });
            } else {
              sendText(405, 'Method Not Allowed');
            }

          // ─── GET /api/dashboard ──────────────────────────────
          } else if (pathname === '/api/dashboard') {
            const games = await this.handlers.getGames();
            sendJSON(200, {
              success: true,
              status: {
                activeGame: this.appState.activeGame,
                activeGameUrl: this.appState.activeGameUrl,
                uptimeSeconds: Math.floor((Date.now() - this.appState.startTime) / 1000),
                totalApiRequests: this.appState.apiRequests,
                runtimeMode: this.appState.runtimeMode
              },
              games,
              bugs: this.appState.bugs,
              logs: this.appState.logs.slice(-50),
              recentActions: this.appState.recentActions.slice(0, 15)
            });

          } else {
            sendJSON(404, { success: false, error: `Endpoint '${pathname}' not found. Available endpoints: /api/status, /api/games, /api/game/launch, /api/game/screenshot, /api/game/logs, /api/game/state, /api/game/action, /api/game/eval, /api/game/patch, /api/bugs, /api/dashboard` });
          }

        } catch (err) {
          sendJSON(500, { success: false, error: err.message, stack: err.stack });
        }
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[LocalAPIServer] Listening on http://${this.host}:${this.port}`);
        resolve(this);
      });

      this.server.on('error', (err) => {
        console.error(`[LocalAPIServer] Error starting server:`, err.message);
        reject(err);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[LocalAPIServer] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { LocalAPIServer };
