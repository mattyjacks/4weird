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
    this.port = options.port || 9999;
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
          const rootDir = path.join(__dirname, '..', '..', '..');
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
