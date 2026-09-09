/**
 * VibeCodeWorker Local REST API Server
 * Provides full control and inspection API for Gemini and external tools.
 */

const http = require('http');
const path = require('path');
const { URL } = require('url');
const { ApiBugStore } = require('./api/bug_store');
const { handleApiRequest } = require('./api/routes');

class LocalAPIServer {
  constructor(options = {}) {
    this.port = options.port || 42069;
    this.host = options.host || '127.0.0.1';
    this.server = null;
    this.appState = {
      startTime: Date.now(),
      activeGame: null,
      activeGameUrl: null,
      runtimeMode: options.runtimeMode || 'electron',
      logs: [],
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
      getVisionState: options.getVisionState || (async () => ({ gameWindowActive: false, pointer: null, keys: [], trail: [], path: [] })),
      reloadGame: options.reloadGame || (async () => ({ success: false })),
      ...options.handlers
    };

    this.dataDir = path.join(__dirname, '..', 'data');
    this.bugStore = new ApiBugStore(this.dataDir);

    // Provide backwards-compatible getter/setter for appState.bugs
    Object.defineProperty(this.appState, 'bugs', {
      get: () => this.bugStore.getBugs(),
      set: (val) => { this.bugStore.bugs = val; }
    });
  }

  loadBugs() {
    return this.bugStore.loadBugs();
  }

  saveBugs() {
    this.bugStore.saveBugs();
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
    // SmartLog file mirror: error statuses + every state-changing call, so
    // headless/cloud runs leave an AI-readable trail without console spam.
    try {
      const smartlog = require('./smart_log').getSharedLog();
      if (status >= 400) {
        smartlog.log(status >= 500 ? 'error' : 'warn', 'api', `${method} ${pathname} -> ${status} (${durationMs}ms)`);
      } else if (method !== 'GET' && method !== 'OPTIONS' && pathname.startsWith('/api/')) {
        smartlog.log('info', 'action', `${method} ${pathname} -> ${status} (${durationMs}ms)`);
      }
    } catch (e) { /* logging must never break serving */ }
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
        const origin = req.headers.origin || '';
        const clientIp = req.socket.remoteAddress || '';

        // Security check: restrict loopback/localhost access or known safe origin
        const isLocalClient = clientIp.includes('127.0.0.1') || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp === '';
        const isLocalOrigin = !origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('file://') || origin.startsWith('vscode-webview://');

        // Allow CORS for local origins or non-browser tooling (curl, python, node tests)
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Auth, X-Runpod-Key');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;

        // Security: Block non-local external origins from mutating the host machine or executing code
        const EXECUTION_PATHS = ['/api/game/patch', '/api/game/eval', '/api/autocode/fix',
          '/api/opencode/fix', '/api/opencode/heal', '/api/opencode/heal-test', '/api/opencode/revert',
          '/api/cloud/launch', '/api/cloud/stop', '/api/cloud/status'];
        if (origin && !isLocalOrigin && EXECUTION_PATHS.some(p => pathname.startsWith(p))) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Forbidden: Untrusted external origin not authorized for execution endpoints' }));
          this.logRequest(req.method, pathname, 403, Date.now() - startTime);
          return;
        }

        // Cloud token auth (optional): when VIBE_API_TOKEN is set, every
        // state-changing API call must present it as X-Vibe-Auth or a
        // Bearer token. Read-only GETs (status/dashboard/health) stay open
        // so load-balancer and Docker HEALTHCHECK probes keep working.
        // Local loopback clients without an Origin header are always allowed
        // (desktop app, local tests, curl on the box).
        const apiToken = process.env.VIBE_API_TOKEN || '';
        const isBypassClient = isLocalClient && !origin;
        if (apiToken && !isBypassClient && req.method !== 'GET' && req.method !== 'OPTIONS' && pathname.startsWith('/api/')) {
          const presented = req.headers['x-vibe-auth'] || String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
          if (presented !== apiToken) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized: valid X-Vibe-Auth token required' }));
            this.logRequest(req.method, pathname, 401, Date.now() - startTime);
            return;
          }
        }



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

        // Bounded body reader: Buffer chunks (no O(n^2) string concat),
        // 1MB cap so /api/game/patch and /api/autocode/fix can't OOM the host.
        const MAX_BODY_BYTES = 1024 * 1024;
        const readBody = () => new Promise((resBody) => {
          const chunks = [];
          let received = 0;
          let rejected = false;
          req.on('data', (chunk) => {
            if (rejected) return;
            received += chunk.length;
            if (received > MAX_BODY_BYTES) {
              rejected = true;
              resBody({ _raw: '', _error: 'Request body exceeds 1MB limit' });
              try { req.destroy(); } catch (e) {}
              return;
            }
            chunks.push(chunk);
          });
          req.on('end', () => {
            if (rejected) return;
            try {
              const body = chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
              resBody(body ? JSON.parse(body) : {});
            } catch (e) {
              resBody({ _raw: '', _error: e.message });
            }
          });
          req.on('error', () => {
            if (!rejected) resBody({});
          });
        });

        try {
          const rootDir = path.join(__dirname, '..');
          await handleApiRequest(this, req, res, pathname, parsedUrl, readBody, sendJSON, sendText, rootDir);
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
