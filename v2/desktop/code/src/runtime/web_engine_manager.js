/**
 * 4WEIRD VIBECODEWORKER - Unified Web Engine Manager
 *
 * Standardizes on ultralig.ht (Ultralight WebKit) as the MAIN driving engine,
 * while keeping the existing Electron/Chromium viewport ("current setup") and
 * a standalone Chromium backend available. Supports:
 *
 *   - `ultralight` (DEFAULT / main): lightweight WebKit GPU runtime telemetry.
 *     Uses the real `ultralight-sdk` npm binding when installed, otherwise
 *     runs in embedded-compat mode over the active Electron viewport.
 *   - `electron` (current setup): Electron <webview> + separate BrowserWindow
 *     game window driven through GameController / IPC.
 *   - `chromium` (standalone): Playwright / Puppeteer headless Chromium, with
 *     graceful compat fallback to the Electron viewport when not installed.
 *
 * Switching: `setActiveEngine(id)`; persisted to config.json `webEngine`.
 * Multi-engine QA: `runMultiEngineQA(url, executorProvider)` fans the same
 * telemetry pass out to all engines and diffs console/network/bug results so
 * cross-engine regressions (Ultralight vs Chromium vs Electron) are visible.
 */

const EventEmitter = require('events');
const { UltralightWebEngine } = require('./ultralight_engine');
const { ChromiumEngine } = require('./chromium_engine');

const ENGINE_IDS = ['ultralight', 'electron', 'chromium'];
const DEFAULT_ENGINE = 'ultralight';

const ENGINE_META = {
  ultralight: {
    id: 'ultralight',
    label: 'Ultralight (main)',
    description: 'ultralig.ht WebKit GPU runtime; default driver for telemetry & automation.',
    isDefault: true,
  },
  electron: {
    id: 'electron',
    label: 'Electron (current setup)',
    description: 'Existing Electron <webview> + separate game BrowserWindow viewport.',
    isDefault: false,
  },
  chromium: {
    id: 'chromium',
    label: 'Chromium standalone',
    description: 'Headless Chromium via Playwright/Puppeteer (compat fallback included).',
    isDefault: false,
  },
};

/**
 * Lightweight Electron-viewport adapter so the manager can drive the
 * "current setup" through the same interface without new dependencies.
 * The host wires `controller` (GameController) + `webview` element getters.
 */
class ElectronViewportEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.engineId = 'electron';
    this.name = 'Electron Viewport (current setup)';
    this.version = options.version || 'electron-chromium-embed';
    this.license = 'MIT (Electron) / BSD-3-Clause (Chromium)';
    this.currentUrl = 'about:blank';
    this.consoleLogs = [];
    this.networkRequests = [];
    this.diagnosedBugs = [];
    this._getController = options.getController || (() => null);
    this._getWebview = options.getWebview || (() => null);
  }

  _ctl() { return this._getController(); }
  _view() { return this._getWebview(); }

  async navigate(url, targetExecutor = null) {
    this.currentUrl = url;
    this.emit('navigating', { url, engine: this.engineId });
    const start = Date.now();
    try {
      const ctl = (targetExecutor && targetExecutor.navigate) ? targetExecutor : this._ctl();
      if (ctl && ctl.navigate) await ctl.navigate(url);
      else if (this._view() && this._view().src !== undefined) this._view().src = url;
      else if (targetExecutor && targetExecutor.loadURL) await targetExecutor.loadURL(url);
      const loadTime = Date.now() - start;
      this.emit('loaded', { url, loadTime, engine: this.engineId });
      return { success: true, url, loadTime, engine: this.engineId };
    } catch (err) {
      this.emit('error', { url, error: err.message, engine: this.engineId });
      return { success: false, error: err.message, engine: this.engineId };
    }
  }

  async getInteractiveDOM(targetExecutor = null) {
    const ctl = (targetExecutor && targetExecutor.getInteractiveDOM) ? targetExecutor : this._ctl();
    if (ctl && ctl.getInteractiveDOM) return await ctl.getInteractiveDOM(this._view());
    if (targetExecutor && targetExecutor.getInteractiveDOM) return await targetExecutor.getInteractiveDOM();
    return [];
  }

  async executeAction(action, targetExecutor = null) {
    if (!action || !action.type) return { success: false, error: 'No action specified', engine: this.engineId };
    this.emit('action', { ...action, engine: this.engineId });
    const ctl = (targetExecutor && targetExecutor.executeAction) ? targetExecutor : this._ctl();
    if (ctl && ctl.executeAction) {
      const res = await ctl.executeAction(this._view(), action);
      return typeof res === 'object' ? { ...res, engine: this.engineId } : { success: true, result: res, engine: this.engineId };
    }
    if (targetExecutor && targetExecutor.executeAction) {
      const res = await targetExecutor.executeAction(action);
      return { ...res, engine: this.engineId };
    }
    return { success: false, error: 'No Electron viewport controller bound', engine: this.engineId };
  }

  async evalJS(script, targetExecutor = null) {
    const ctl = (targetExecutor && targetExecutor.executeJS) ? targetExecutor : this._ctl();
    if (ctl && ctl.executeJS) return await ctl.executeJS(this._view(), script);
    throw new Error('No Electron viewport controller bound for evalJS');
  }

  logConsole(level, message, source = 'electron-viewport') {
    const entry = { level, message: String(message), source, timestamp: Date.now(), engine: this.engineId };
    this.consoleLogs.push(entry);
    this.emit('console', entry);
    if (level === 'error' || String(message).includes('Uncaught')) return this.flagBug(entry);
    return null;
  }

  logNetwork(req) {
    const entry = { url: req.url, method: req.method || 'GET', status: req.status || 200, durationMs: req.durationMs || 10, timestamp: Date.now(), engine: this.engineId };
    this.networkRequests.push(entry);
    this.emit('network', entry);
    if (entry.status >= 400) return this.flagBug(entry, true);
    return null;
  }

  flagBug(entry, isNet = false) {
    const bug = {
      id: `bug_electron_${Date.now()}`, type: isNet ? `Electron Network Failure (${entry.status})` : 'Electron Console Exception',
      description: isNet ? `Failed to load: ${entry.url} (${entry.status})` : entry.message,
      severity: isNet && entry.status >= 500 ? 'high' : 'medium', engine: this.engineId, timestamp: new Date().toISOString(),
    };
    this.diagnosedBugs.push(bug);
    this.emit('bug_detected', bug);
    return bug;
  }

  getMetrics() {
    return {
      engine: this.name, engineId: this.engineId, currentUrl: this.currentUrl,
      consoleErrors: this.consoleLogs.filter((l) => l.level === 'error').length,
      networkFailures: this.networkRequests.filter((r) => r.status >= 400).length,
      diagnosedBugs: this.diagnosedBugs.length,
    };
  }
}

class WebEngineManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.defaultEngine = DEFAULT_ENGINE;
    this.activeEngineId = options.activeEngine || DEFAULT_ENGINE;
    if (!ENGINE_IDS.includes(this.activeEngineId)) this.activeEngineId = DEFAULT_ENGINE;

    this.ultralight = new UltralightWebEngine(options.ultralight || {});
    this.ultralight.engineId = 'ultralight';
    this.chromium = new ChromiumEngine(options.chromium || {});
    this.electron = new ElectronViewportEngine({
      getController: options.getController || (() => null),
      getWebview: options.getWebview || (() => null),
    });

    // Re-emit child telemetry with engine attribution.
    for (const eng of this.allEngines()) {
      eng.on('bug_detected', (bug) => this.emit('bug_detected', { ...bug, engine: eng.engineId }));
      eng.on('console', (e) => this.emit('console', { ...e, engine: eng.engineId }));
      eng.on('network', (e) => this.emit('network', { ...e, engine: eng.engineId }));
    }
  }

  static get engineIds() { return [...ENGINE_IDS]; }
  static get defaultEngine() { return DEFAULT_ENGINE; }
  static get meta() { return { ...ENGINE_META }; }

  allEngines() { return [this.ultralight, this.electron, this.chromium]; }

  getEngine(id) {
    if (id === 'ultralight') return this.ultralight;
    if (id === 'electron') return this.electron;
    if (id === 'chromium') return this.chromium;
    return null;
  }

  getActiveEngine() { return this.getEngine(this.activeEngineId); }

  /** Switch the driving engine. Returns { success, activeEngine } or error. */
  setActiveEngine(id) {
    if (!ENGINE_IDS.includes(id)) {
      return { success: false, error: `Unknown engine '${id}'. Valid: ${ENGINE_IDS.join(', ')}` };
    }
    const prev = this.activeEngineId;
    this.activeEngineId = id;
    this.emit('engine_switched', { from: prev, to: id });
    return { success: true, previous: prev, activeEngine: id };
  }

  describeEngines() {
    return ENGINE_IDS.map((id) => ({
      ...ENGINE_META[id],
      active: id === this.activeEngineId,
      backend: id === 'chromium' ? this.chromium.getBackendInfo()
        : id === 'ultralight' ? this.ultralight.getBackendInfo()
        : { engineId: 'electron', backend: 'electron-webview', fullSupport: true, hint: 'Built-in Electron viewport' },
      metrics: this.getEngine(id).getMetrics(),
    }));
  }

  // ── Unified driver interface (delegates to ACTIVE engine) ──
  async navigate(url, targetExecutor = null) {
    return await this.getActiveEngine().navigate(url, targetExecutor || this._fallbackExecutor());
  }

  async getInteractiveDOM(targetExecutor = null) {
    return await this.getActiveEngine().getInteractiveDOM(targetExecutor || this._fallbackExecutor());
  }

  async executeAction(action, targetExecutor = null) {
    return await this.getActiveEngine().executeAction(action, targetExecutor || this._fallbackExecutor());
  }

  logConsole(level, message, source) {
    return this.getActiveEngine().logConsole(level, message, source);
  }

  logNetwork(req) {
    return this.getActiveEngine().logNetwork(req);
  }

  getMetrics() {
    const active = this.getActiveEngine();
    return { activeEngine: this.activeEngineId, ...active.getMetrics() };
  }

  _fallbackExecutor() {
    // Cross-engine compat: Ultralight/Chromium can observe the Electron
    // viewport when no dedicated backend is bound.
    const electron = this.electron;
    return {
      navigate: (url) => electron.navigate(url),
      getInteractiveDOM: () => electron.getInteractiveDOM(),
      executeAction: (action) => electron.executeAction(action),
    };
  }

  /**
   * Smart multi-engine QA: run navigate + DOM snapshot + console/network
   * telemetry replay across every engine, then diff results.
   *
   * @param {string} url target URL
   * @param {object} opts { engines?: string[], executorProvider?: (engineId)=>executor, actions?: object[] }
   */
  async runMultiEngineQA(url, opts = {}) {
    const ids = (opts.engines || ENGINE_IDS).filter((id) => ENGINE_IDS.includes(id));
    const provider = opts.executorProvider || (() => this._fallbackExecutor());
    const actions = opts.actions || [];
    const results = {};

    await Promise.all(ids.map(async (id) => {
      const engine = this.getEngine(id);
      const executor = provider(id) || this._fallbackExecutor();
      const started = Date.now();
      try {
        const nav = await engine.navigate(url, executor);
        let dom = [];
        try { dom = await engine.getInteractiveDOM(executor); } catch (_) { dom = []; }
        const actionResults = [];
        for (const a of actions) {
          try { actionResults.push(await engine.executeAction(a, executor)); }
          catch (e) { actionResults.push({ success: false, error: e.message, engine: id }); }
        }
        results[id] = {
          engine: id, success: nav.success !== false, loadTime: nav.loadTime ?? (Date.now() - started),
          domCount: Array.isArray(dom) ? dom.length : 0,
          consoleErrors: (engine.consoleLogs || []).filter((l) => l.level === 'error').length,
          networkFailures: (engine.networkRequests || []).filter((r) => r.status >= 400).length,
          diagnosedBugs: (engine.diagnosedBugs || []).length,
          actionResults, metrics: engine.getMetrics(),
        };
      } catch (err) {
        results[id] = { engine: id, success: false, error: err.message };
      }
    }));

    // Diff: flag engines that disagree on errors/bugs/DOM.
    const vals = Object.values(results);
    const errCounts = new Set(vals.map((r) => r.consoleErrors));
    const netCounts = new Set(vals.map((r) => r.networkFailures));
    const domCounts = new Set(vals.map((r) => r.domCount));
    const diverged = errCounts.size > 1 || netCounts.size > 1;
    const summary = {
      url, engines: ids, at: new Date().toISOString(),
      diverged, domCountsDiffer: domCounts.size > 1,
      note: diverged
        ? 'Engines disagree on console/network telemetry; inspect per-engine bug lists for rendering or API divergences.'
        : 'All engines agree on console/network telemetry for this target.',
    };
    this.emit('multi_engine_qa', { summary, results });
    return { success: true, summary, results };
  }
}

module.exports = {
  WebEngineManager,
  ElectronViewportEngine,
  ENGINE_IDS,
  DEFAULT_ENGINE,
  ENGINE_META,
};
