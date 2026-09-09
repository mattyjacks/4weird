/**
 * VibeCodeWorker Local REST API Server
 * Provides full control and inspection API for Gemini and external tools.
 */

const http = require('http');
const path = require('path');
const { URL } = require('url');
const { ApiBugStore } = require('./api/bug_store');
const { handleApiRequest } = require('./api/routes');

const { isValidPort } = require('./vcw_utils');

class LocalAPIServer {
  constructor(options = {}) {
    const requestedPort = Number(options.port || 42069);
    this.port = isValidPort(requestedPort) ? requestedPort : 42069;
    this.host = typeof options.host === 'string' && options.host.length < 256 ? options.host : '127.0.0.1';
    this.requestTimeoutMs = 30000;
    this.rateLimitWindowMs = 60000;
    this.rateLimitMax = 120;
    this._rateHits = new Map();
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
      // Video capture needs Electron's rendered game surface. Keep the
      // standalone API explicit rather than failing with a missing handler.
      startVideoRecording: options.startVideoRecording || (async () => ({ success: false, error: 'Video recording requires the VibeCodeWorker desktop runtime' })),
      stopVideoRecording: options.stopVideoRecording || (async () => ({ success: false, error: 'Video recording requires the VibeCodeWorker desktop runtime' })),
      getVideoRecordingStatus: options.getVideoRecordingStatus || (async () => ({ recording: false, available: false, reason: 'Video recording requires the VibeCodeWorker desktop runtime' })),
      exportVideoLayouts: options.exportVideoLayouts || (async () => ({ success: false, error: 'Video layout export requires the VibeCodeWorker runtime' })),
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
        const isTrustedVcwOrigin = origin === 'https://4weird.com' || origin === 'https://www.4weird.com';
        const isLocalOrigin = !origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('file://') || origin.startsWith('vscode-webview://') || isTrustedVcwOrigin;

        // CORS: echo back only origins we trust (loopback, file, vscode
        // webview, or the production site). Anything else gets no
        // Access-Control-Allow-Origin header, so browsers withhold the
        // response from foreign pages. Never emit a reflected-origin or '*'
        // value alongside credential-style auth headers.
        if (isLocalOrigin) {
          res.setHeader('Access-Control-Allow-Origin', origin || '*');
          res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Auth, X-Runpod-Key, X-Request-Id');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('X-Request-Id', `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`);

        // Per-IP rate limit: 120 req/min (in-memory, loopback-friendly).
        try {
          const now = Date.now();
          const key = String(clientIp || 'unknown');
          const hits = (this._rateHits.get(key) || []).filter((t) => now - t < this.rateLimitWindowMs);
          hits.push(now);
          this._rateHits.set(key, hits);
          if (hits.length > this.rateLimitMax) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Rate limited: slow down and retry' }));
            this.logRequest(req.method, pathname, 429, Date.now() - startTime);
            return;
          }
          if (this._rateHits.size > 1000) this._rateHits.clear();
        } catch (_) { /* rate limiting must never break serving */ }

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url && req.url.length > 8192) {
          res.writeHead(414, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Request URI too long' }));
          this.logRequest(req.method, String(req.method), 414, Date.now() - startTime);
          return;
        }
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;

        // Security: Block non-local external origins from mutating the host machine or executing code.
        // Both canonical paths and their short aliases (/eval, /action) are
        // covered so an alias cannot bypass the origin guard.
        const EXECUTION_PATHS = ['/api/game/patch', '/api/game/eval', '/eval', '/api/game/action', '/action', '/api/game/video/start', '/api/game/video/stop', '/api/autocode/fix',
          '/api/opencode/fix', '/api/opencode/heal', '/api/opencode/heal-test', '/api/opencode/revert',
          '/api/cloud/launch', '/api/cloud/stop', '/api/cloud/status', '/api/cloud/games/download',
          '/api/godot/install', '/api/godot/action'];
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
          const prod = process.env.NODE_ENV === 'production';
          sendJSON(500, prod
            ? { success: false, error: err && err.message ? String(err.message).slice(0, 500) : 'Internal error' }
            : { success: false, error: err.message, stack: String(err.stack || '').slice(0, 2000) });
        }
      });

      this.server.requestTimeout = this.requestTimeoutMs;
      this.server.headersTimeout = this.requestTimeoutMs + 5000;
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

  getHealth() {
    return {
      ok: true,
      uptimeSec: Math.round((Date.now() - this.appState.startTime) / 1000),
      apiRequests: this.appState.apiRequests,
      bugs: this.bugStore ? this.bugStore.getBugs().length : 0,
      host: this.host,
      port: this.port
    };
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        const force = setTimeout(() => { try { this.server.closeAllConnections(); } catch (_) {} resolve(); }, 5000);
        this.server.close(() => {
          clearTimeout(force);
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
