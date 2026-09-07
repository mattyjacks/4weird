/**
 * 4WEIRD VIBECODEWORKER - Chromium Standalone Engine Adapter
 *
 * Standalone Chromium automation backend (Playwright / Puppeteer compatible).
 * Optional deps: `playwright` or `puppeteer-core`. If neither is installed,
 * the engine runs in "compat" mode: it reuses the active Electron viewport
 * via an injected executor callback, so QA telemetry still works without
 * new native binaries. Install full support with:
 *
 *   npm install --save playwright   # or: npm install --save puppeteer-core
 *
 * Interface mirrors UltralightWebEngine:
 *   navigate(url, executor?), getInteractiveDOM(executor?),
 *   executeAction(action, executor?), logConsole/logNetwork,
 *   flagBugFromConsole/flagBugFromNetwork, getMetrics()
 */

const EventEmitter = require('events');

function tryRequire(name) {
  try {
    return require(name);
  } catch (_) {
    return null;
  }
}

class ChromiumEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.engineId = 'chromium';
    this.name = 'Chromium Standalone';
    this.version = options.version || 'chromium-compat-1.0';
    this.license = 'BSD-3-Clause (Chromium) / Apache-2.0 (Playwright/Puppeteer glue)';
    this.options = Object.assign({
      viewportWidth: 1280,
      viewportHeight: 720,
      headless: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 4Weird-VibeCodeWorker/2.0 Chromium'
    }, options);

    this.currentUrl = 'about:blank';
    this.title = 'Untitled';
    this.isLoading = false;
    this.consoleLogs = [];
    this.networkRequests = [];
    this.domSnapshot = [];
    this.diagnosedBugs = [];

    // Lazy-loaded automation backend (playwright > puppeteer-core > compat).
    this._backend = null;
    this._backendName = null;
    this._browser = null;
    this._page = null;
  }

  /** Detect which automation backend is available (no throw). */
  detectBackend() {
    if (this._backendName) return this._backendName;
    if (tryRequire('playwright')) {
      this._backendName = 'playwright';
    } else if (tryRequire('puppeteer-core')) {
      this._backendName = 'puppeteer-core';
    } else {
      this._backendName = 'compat';
    }
    return this._backendName;
  }

  getBackendInfo() {
    const backend = this.detectBackend();
    return {
      engineId: this.engineId,
      backend,
      fullSupport: backend !== 'compat',
      hint: backend === 'compat'
        ? 'Install full Chromium automation with: npm install --save playwright'
        : `Using ${backend} backend`,
    };
  }

  async _ensurePage() {
    const backend = this.detectBackend();
    if (backend === 'playwright') {
      const { chromium } = tryRequire('playwright');
      if (!this._browser) {
        this._browser = await chromium.launch({ headless: this.options.headless });
      }
      if (!this._page) {
        this._page = await this._browser.newPage({
          viewport: { width: this.options.viewportWidth, height: this.options.viewportHeight },
          userAgent: this.options.userAgent,
        });
        this._page.on('console', (msg) => this.logConsole(msg.type(), msg.text(), 'chromium-page'));
        this._page.on('pageerror', (err) => this.logConsole('error', String(err && err.message || err), 'chromium-page'));
        this._page.on('response', (res) => {
          try {
            this.logNetwork({ url: res.url(), method: res.request().method(), status: res.status(), durationMs: 0 });
          } catch (_) { /* telemetry best-effort */ }
        });
      }
      return this._page;
    }
    if (backend === 'puppeteer-core') {
      const puppeteer = tryRequire('puppeteer-core');
      if (!this._browser) {
        this._browser = await puppeteer.launch({
          headless: this.options.headless ? 'new' : false,
          args: [`--window-size=${this.options.viewportWidth},${this.options.viewportHeight}`],
        });
      }
      if (!this._page) {
        this._page = await this._browser.newPage();
        await this._page.setViewport({ width: this.options.viewportWidth, height: this.options.viewportHeight });
        await this._page.setUserAgent(this.options.userAgent);
        this._page.on('console', (msg) => this.logConsole(msg.type(), msg.text(), 'chromium-page'));
        this._page.on('pageerror', (err) => this.logConsole('error', String(err && err.message || err), 'chromium-page'));
        this._page.on('response', (res) => {
          try {
            this.logNetwork({ url: res.url(), method: res.request().method(), status: res.status(), durationMs: 0 });
          } catch (_) { /* best-effort */ }
        });
      }
      return this._page;
    }
    return null; // compat: caller supplies targetExecutor
  }

  async navigate(url, targetExecutor = null) {
    this.currentUrl = url;
    this.isLoading = true;
    this.emit('navigating', { url, engine: this.engineId });
    const startTime = Date.now();
    try {
      const page = await this._ensurePage();
      if (page) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try { this.title = await page.title(); } catch (_) { /* keep Untitled */ }
      } else if (targetExecutor && targetExecutor.navigate) {
        await targetExecutor.navigate(url);
      } else if (targetExecutor && targetExecutor.loadURL) {
        await targetExecutor.loadURL(url);
      }
      this.isLoading = false;
      const loadTime = Date.now() - startTime;
      this.emit('loaded', { url, loadTime, engine: this.engineId });
      return { success: true, url, loadTime, engine: this.engineId, backend: this.detectBackend() };
    } catch (err) {
      this.isLoading = false;
      const errorEvent = { url, error: err.message, timestamp: Date.now(), engine: this.engineId };
      this.emit('error', errorEvent);
      return { success: false, error: err.message, engine: this.engineId };
    }
  }

  async getInteractiveDOM(targetExecutor = null) {
    try {
      const page = await this._ensurePage();
      if (page) {
        const snapshot = await page.evaluate(() => {
          const out = [];
          const candidates = document.querySelectorAll(
            'button, a, input, select, textarea, canvas, [role="button"], [onclick], [tabindex]:not([tabindex="-1"])'
          );
          for (let i = 0; i < candidates.length && out.length < 40; i++) {
            const el = candidates[i];
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            out.push({
              tagName: el.tagName,
              id: el.id || '',
              innerText: (el.innerText || '').slice(0, 50).trim(),
              rect: { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
            });
          }
          return out;
        });
        this.domSnapshot = snapshot;
        return snapshot;
      }
    } catch (_) { /* fall through to executor path */ }
    if (targetExecutor && targetExecutor.getInteractiveDOM) {
      this.domSnapshot = await targetExecutor.getInteractiveDOM();
      return this.domSnapshot;
    }
    return this.domSnapshot.length ? this.domSnapshot : [
      { tagName: 'CANVAS', id: 'game-canvas', rect: { left: 0, top: 0, width: 1280, height: 720 } },
    ];
  }

  async executeAction(action, targetExecutor = null) {
    if (!action || !action.type) return { success: false, error: 'No action specified', engine: this.engineId };
    this.emit('action', { ...action, engine: this.engineId });
    try {
      const page = await this._ensurePage();
      if (page) {
        if (action.type === 'click') {
          const x = action.x ?? 100;
          const y = action.y ?? 100;
          await page.mouse.click(x, y);
          return { success: true, action: 'click', x, y, engine: this.engineId };
        }
        if (action.type === 'type_text' && action.params) {
          const sel = action.params.selector;
          const text = action.params.text || '';
          if (sel) {
            await page.fill(sel, text, { timeout: 5000 });
            return { success: true, action: 'type_text', selector: sel, engine: this.engineId };
          }
        }
        if (action.type === 'keydown' || action.type === 'keyup') {
          const key = action.key || action.code || 'Enter';
          if (action.type === 'keydown') await page.keyboard.down(key);
          else await page.keyboard.up(key);
          return { success: true, action: action.type, key, engine: this.engineId };
        }
        if (action.type === 'scroll') {
          const dx = action.params && action.params.direction === 'up' ? 0 : 0;
          const dy = (action.params && action.params.amount) || 500;
          await page.mouse.wheel(dx, action.params && action.params.direction === 'up' ? -dy : dy);
          return { success: true, action: 'scroll', engine: this.engineId };
        }
      }
    } catch (err) {
      return { success: false, error: err.message, engine: this.engineId };
    }
    if (targetExecutor && targetExecutor.executeAction) {
      const res = await targetExecutor.executeAction(action);
      return { ...res, engine: this.engineId };
    }
    return { success: true, action: action.type, target: action.target, engine: this.engineId, backend: this.detectBackend() };
  }

  async evalJS(script, targetExecutor = null) {
    try {
      const page = await this._ensurePage();
      if (page) return await page.evaluate(script);
    } catch (err) {
      throw err;
    }
    if (targetExecutor && targetExecutor.evalJS) return await targetExecutor.evalJS(script);
    if (targetExecutor && targetExecutor.executeJS) return await targetExecutor.executeJS(script);
    throw new Error('No Chromium page or fallback executor available for evalJS');
  }

  async captureScreenshot(targetExecutor = null) {
    try {
      const page = await this._ensurePage();
      if (page) {
        const buf = await page.screenshot({ type: 'jpeg', quality: 50 });
        return buf.toString('base64');
      }
    } catch (_) { /* fall through */ }
    if (targetExecutor && targetExecutor.captureScreenshot) return await targetExecutor.captureScreenshot();
    return null;
  }

  logConsole(level, message, source = 'chromium-page') {
    const entry = { level, message: String(message), source, timestamp: Date.now(), engine: this.engineId };
    this.consoleLogs.push(entry);
    this.emit('console', entry);
    if (level === 'error' || String(message).includes('Uncaught') || String(message).includes('ReferenceError') || String(message).includes('TypeError')) {
      return this.flagBugFromConsole(entry);
    }
    return null;
  }

  logNetwork(req) {
    const entry = {
      url: req.url, method: req.method || 'GET', status: req.status || 200,
      durationMs: req.durationMs || 10, timestamp: Date.now(), engine: this.engineId,
    };
    this.networkRequests.push(entry);
    this.emit('network', entry);
    if (entry.status >= 400) return this.flagBugFromNetwork(entry);
    return null;
  }

  flagBugFromConsole(consoleEntry) {
    const bug = {
      id: 'bug_chromium_' + Date.now(), type: 'Chromium Console Exception',
      description: consoleEntry.message, source: consoleEntry.source,
      severity: 'high', engine: this.engineId, timestamp: new Date().toISOString(),
    };
    this.diagnosedBugs.push(bug);
    this.emit('bug_detected', bug);
    return bug;
  }

  flagBugFromNetwork(netEntry) {
    const bug = {
      id: 'bug_chromium_net_' + Date.now(), type: 'Chromium Network Failure (' + netEntry.status + ')',
      description: `Failed to load asset or API: ${netEntry.url} (${netEntry.status})`,
      severity: netEntry.status >= 500 ? 'high' : 'medium',
      engine: this.engineId, timestamp: new Date().toISOString(),
    };
    this.diagnosedBugs.push(bug);
    this.emit('bug_detected', bug);
    return bug;
  }

  getMetrics() {
    return {
      engine: this.name, engineId: this.engineId, backend: this.detectBackend(),
      license: this.license, currentUrl: this.currentUrl,
      consoleErrors: this.consoleLogs.filter((l) => l.level === 'error').length,
      networkFailures: this.networkRequests.filter((r) => r.status >= 400).length,
      diagnosedBugs: this.diagnosedBugs.length,
    };
  }

  async close() {
    try { if (this._page) await this._page.close().catch(() => {}); } catch (_) {}
    try { if (this._browser) await this._browser.close().catch(() => {}); } catch (_) {}
    this._page = null;
    this._browser = null;
  }
}

module.exports = { ChromiumEngine };
