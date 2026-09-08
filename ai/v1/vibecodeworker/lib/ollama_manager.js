/**
 * Ollama lifecycle manager (Windows-first, macOS/Linux best-effort).
 *
 * Responsibilities, in order:
 *   1. detect()       — locate the `ollama` binary (PATH + well-known spots).
 *   2. isServerUp()   — probe the HTTP API (GET /api/tags).
 *   3. startServer()  — spawn `ollama serve` detached when the binary exists
 *                       but nothing listens yet.
 *   4. installOllama()— EXPLICIT-CONSENT ONLY: winget, else the official
 *                       OllamaSetup.exe (silent), else clear manual steps.
 *   5. listModels()/pullModel()/ensureModel() — model inventory management.
 *   6. ensureReady()  — the one-call orchestrator used by the launcher,
 *                       the Electron main process, and the settings panel.
 *
 * Every function returns plain `{ ok, ... }` results and never throws on
 * expected failures (missing binary, offline registry, refused download).
 * Plain Node only — no Electron dependency so the .bat preflight, the API
 * server, and unit tests can all use it.
 */

const { spawn, spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');

const DEFAULT_PORT = 11434;
const OLLAMA_SETUP_URL = 'https://ollama.com/download/OllamaSetup.exe';
const WINGET_PACKAGE_ID = 'Ollama.Ollama';

function defaultBaseUrl() {
  if (process.env.OLLAMA_URL) return String(process.env.OLLAMA_URL).replace(/\/+$/, '');
  if (process.env.OLLAMA_HOST) {
    let host = String(process.env.OLLAMA_HOST).trim();
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(host)) host = `http://${host}`;
    try {
      const parsed = new URL(host);
      // OLLAMA_HOST is a *bind* address: 0.0.0.0 means "all interfaces" and
      // is not dialable. Rewrite it to loopback, preserving any port.
      if (parsed.hostname === '0.0.0.0' || parsed.hostname === '::') parsed.hostname = '127.0.0.1';
      // A bare host carries no port — fall back to the Ollama default instead
      // of the protocol default (80/443), which would never answer.
      if (!parsed.port) parsed.port = String(DEFAULT_PORT);
      return parsed.toString().replace(/\/+$/, '');
    } catch (_) {
      return `http://${String(process.env.OLLAMA_HOST).trim()}`.replace(/\/+$/, '');
    }
  }
  return `http://127.0.0.1:${DEFAULT_PORT}`;
}

function candidateBinaryPaths() {
  const found = [];
  const push = (p) => { if (p && !found.includes(p)) found.push(p); };
  push('ollama'); // resolved via PATH by the OS
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    push(path.join(localApp, 'Programs', 'Ollama', 'ollama.exe'));
    push(path.join(programFiles, 'Ollama', 'ollama.exe'));
    push(path.join(programFilesX86, 'Ollama', 'ollama.exe'));
  } else {
    push('/usr/local/bin/ollama');
    push('/usr/bin/ollama');
    push(path.join(os.homedir(), '.ollama', 'bin', 'ollama'));
  }
  return found;
}

/** Locate a usable ollama binary. Returns { ok, binary } — binary may be bare 'ollama'. */
function detectOllama() {
  for (const candidate of candidateBinaryPaths()) {
    try {
      if (candidate === 'ollama') {
        const probe = process.platform === 'win32'
          ? spawnSync('cmd.exe', ['/c', 'where', 'ollama'], { encoding: 'utf8', timeout: 8000 })
          : spawnSync('sh', ['-c', 'command -v ollama'], { encoding: 'utf8', timeout: 8000 });
        if (probe.status === 0 && String(probe.stdout || '').trim()) {
          return { ok: true, binary: String(probe.stdout).trim().split(/\r?\n/)[0].trim() || 'ollama' };
        }
        continue;
      }
      if (fs.existsSync(candidate)) return { ok: true, binary: candidate };
    } catch (_) { /* try next candidate */ }
  }
  return { ok: false, error: 'ollama binary not found on PATH or in well-known install locations' };
}

function httpJson(url, { method = 'GET', body = null, timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return resolve({ ok: false, error: `bad url: ${url}` });
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const payload = body === null || body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = lib.request(parsed, {
      method,
      timeout: timeoutMs,
      headers: payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {},
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return resolve({ ok: false, status: res.statusCode, error: raw.slice(0, 300) || `HTTP ${res.statusCode}` });
        }
        if (!raw) return resolve({ ok: true, status: res.statusCode, data: null });
        try {
          resolve({ ok: true, status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'non-JSON response from Ollama API' });
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('request timed out')); });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

/** Probe GET /api/tags. Returns { ok, models:[names], version? }. */
async function isServerUp(baseUrl = defaultBaseUrl(), timeoutMs = 8000) {
  const res = await httpJson(`${baseUrl.replace(/\/+$/, '')}/api/tags`, { timeoutMs });
  if (!res.ok) return { ok: false, error: res.error || 'Ollama server not reachable' };
  const models = Array.isArray(res.data && res.data.models)
    ? res.data.models.map((m) => m && (m.name || m.model)).filter(Boolean)
    : [];
  return { ok: true, models, version: res.data && res.data.version };
}

/** Spawn `ollama serve` detached and wait until /api/tags answers. */
async function startServer({ binary = null, baseUrl = defaultBaseUrl(), timeoutMs = 30000, onProgress = null } = {}) {
  const found = binary ? { ok: true, binary } : detectOllama();
  if (!found.ok) return { ok: false, stage: 'detect', error: found.error };
  const already = await isServerUp(baseUrl, 4000);
  if (already.ok) return { ok: true, stage: 'already-running', models: already.models, binary: found.binary };

  const say = (msg) => { try { onProgress && onProgress(msg); } catch (_) {} };
  say(`Starting Ollama server (${found.binary} serve)...`);
  try {
    const child = spawn(found.binary, ['serve'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        OLLAMA_HOST: process.env.OLLAMA_HOST || `127.0.0.1:${DEFAULT_PORT}`,
      },
    });
    child.unref();
  } catch (e) {
    return { ok: false, stage: 'spawn', error: `could not start ollama serve: ${e.message}` };
  }
  const deadline = Date.now() + timeoutMs;
  let lastErr = 'server did not answer in time';
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const probe = await isServerUp(baseUrl, 3000);
    if (probe.ok) {
      say('Ollama server is up.');
      return { ok: true, stage: 'started', models: probe.models, binary: found.binary };
    }
    lastErr = probe.error;
  }
  return { ok: false, stage: 'wait', error: lastErr };
}

function downloadFile(url, destPath, { timeoutMs = 120000, onProgress = null } = {}) {
  return new Promise((resolve) => {
    const say = (msg) => { try { onProgress && onProgress(msg); } catch (_) {} };
    const attempt = (currentUrl, redirectsLeft) => {
      let parsed;
      try {
        parsed = new URL(currentUrl);
      } catch (e) {
        return resolve({ ok: false, error: `bad download url: ${currentUrl}` });
      }
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(currentUrl, { timeout: timeoutMs }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const next = new URL(res.headers.location, currentUrl).toString();
          return attempt(next, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return resolve({ ok: false, error: `download failed: HTTP ${res.statusCode}` });
        }
        const total = Number(res.headers['content-length'] || 0);
        let received = 0;
        const out = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total > 0) say(`Downloading Ollama installer... ${Math.round((received / total) * 100)}%`);
        });
        res.on('error', (e) => resolve({ ok: false, error: `download error: ${e.message}` }));
        out.on('finish', () => resolve({ ok: true, bytes: received }));
        out.on('error', (e) => resolve({ ok: false, error: `write error: ${e.message}` }));
        res.pipe(out);
      });
      req.on('timeout', () => { req.destroy(new Error('download timed out')); });
      req.on('error', (e) => resolve({ ok: false, error: `download error: ${e.message}` }));
    };
    attempt(url, 5);
  });
}

/**
 * Full unattended install. EXPLICIT CONSENT ONLY — the caller (CLI --install
 * flag or the dashboard Install button) must have asked the user first:
 * this downloads ~700MB+ and touches the system.
 */
async function installOllama({ onProgress = null, timeoutMs = 600000 } = {}) {
  const say = (msg) => { try { onProgress && onProgress(msg); } catch (_) {} };
  const already = detectOllama();
  if (already.ok) return { ok: true, stage: 'already-installed', binary: already.binary };
  const started = Date.now();
  const remaining = () => Math.max(15000, timeoutMs - (Date.now() - started));

  if (process.platform === 'win32') {
    // Path 1: winget (reliable silent install, official package id).
    try {
      const winget = spawnSync('winget', [
        'install', '--id', WINGET_PACKAGE_ID,
        '--silent', '--accept-package-agreements', '--accept-source-agreements',
      ], { encoding: 'utf8', timeout: remaining() });
      const out = `${winget.stdout || ''}${winget.stderr || ''}`;
      const redetect = detectOllama();
      if (winget.status === 0 && redetect.ok) {
        say('Ollama installed via winget.');
        return { ok: true, stage: 'winget', binary: redetect.binary };
      }
      say(`winget path unavailable (${(out || 'no output').slice(0, 160)}), trying direct installer...`);
    } catch (e) {
      say(`winget unavailable (${e.message}), trying direct installer...`);
    }
    // Path 2: official OllamaSetup.exe, silent.
    try {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-ollama-'));
      const installer = path.join(tmpDir, 'OllamaSetup.exe');
      say('Downloading OllamaSetup.exe from ollama.com...');
      const dl = await downloadFile(OLLAMA_SETUP_URL, installer, { timeoutMs: remaining(), onProgress });
      if (!dl.ok) return { ok: false, stage: 'download', error: dl.error, manual: manualInstallHint() };
      say('Running silent install (this can take a few minutes)...');
      const run = spawnSync(installer, ['/SILENT'], { encoding: 'utf8', timeout: remaining(), windowsHide: true });
      const redetect = detectOllama();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      if (run.status === 0 && redetect.ok) {
        say('Ollama installed.');
        return { ok: true, stage: 'setup-exe', binary: redetect.binary };
      }
      // Last resort: the installer may have needed elevation or a reboot of
      // PATH. Re-check common locations before giving up.
      if (redetect.ok) return { ok: true, stage: 'setup-exe-unverified', binary: redetect.binary };
      return {
        ok: false,
        stage: 'setup-exe',
        error: `installer exited with code ${run.status}. ${(run.stderr || run.stdout || '').slice(0, 200)}`,
        manual: manualInstallHint(),
      };
    } catch (e) {
      return { ok: false, stage: 'setup-exe', error: e.message, manual: manualInstallHint() };
    }
  }

  if (process.platform === 'darwin') {
    try {
      const brew = spawnSync('brew', ['install', '--cask', 'ollama'], { encoding: 'utf8', timeout: remaining() });
      const redetect = detectOllama();
      if (brew.status === 0 && redetect.ok) return { ok: true, stage: 'brew', binary: redetect.binary };
    } catch (_) { /* fall through to manual hint */ }
    return { ok: false, stage: 'brew', error: 'Homebrew install failed or brew is missing', manual: manualInstallHint() };
  }

  // Linux: official install script (runs with user consent via the caller flag).
  try {
    const sh = spawnSync('sh', ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], { encoding: 'utf8', timeout: remaining() });
    const redetect = detectOllama();
    if (sh.status === 0 && redetect.ok) return { ok: true, stage: 'install-sh', binary: redetect.binary };
    return { ok: false, stage: 'install-sh', error: (sh.stderr || sh.stdout || 'install script failed').slice(0, 300), manual: manualInstallHint() };
  } catch (e) {
    return { ok: false, stage: 'install-sh', error: e.message, manual: manualInstallHint() };
  }
}

function manualInstallHint() {
  if (process.platform === 'win32') {
    return 'Manual install: run `winget install Ollama.Ollama`, or download OllamaSetup.exe from https://ollama.com/download and run it, then relaunch VibeCodeWorker.';
  }
  if (process.platform === 'darwin') {
    return 'Manual install: `brew install --cask ollama`, or download Ollama for macOS from https://ollama.com/download, then relaunch VibeCodeWorker.';
  }
  return 'Manual install: `curl -fsSL https://ollama.com/install.sh | sh`, then relaunch VibeCodeWorker.';
}

/** GET /api/tags model names (empty array when the server is down). */
async function listModels(baseUrl = defaultBaseUrl(), timeoutMs = 8000) {
  const up = await isServerUp(baseUrl, timeoutMs);
  return up.ok ? up.models : [];
}

/**
 * Pull a model, streaming progress. Model names are allow-listed to a safe
 * registry-style pattern so UI/CLI input cannot inject shell or path tricks
 * (Ollama itself is HTTP-called, but strictness is cheap).
 */
function isSafeModelName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(name);
}

function pullModel(model, { baseUrl = defaultBaseUrl(), timeoutMs = 3600000, onProgress = null } = {}) {
  return new Promise((resolve) => {
    if (!isSafeModelName(model)) return resolve({ ok: false, error: `rejected unsafe model name: ${String(model).slice(0, 60)}` });
    const say = (msg) => { try { onProgress && onProgress(msg); } catch (_) {} };
    let parsed;
    try {
      parsed = new URL(`${baseUrl.replace(/\/+$/, '')}/api/pull`);
    } catch (e) {
      return resolve({ ok: false, error: `bad base url: ${baseUrl}` });
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const payload = JSON.stringify({ model, stream: true });
    const req = lib.request(parsed, {
      method: 'POST',
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        return res.on('end', () => resolve({ ok: false, error: `pull failed: HTTP ${res.statusCode} ${(raw || '').slice(0, 200)}` }));
      }
      let buffer = '';
      let lastStatus = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.error) {
              req.destroy();
              return resolve({ ok: false, error: String(msg.error).slice(0, 300) });
            }
            const status = msg.status || '';
            if (status) lastStatus = status;
            if (typeof msg.completed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
              say(`Pulling ${model}... ${status} ${Math.round((msg.completed / msg.total) * 100)}%`);
            } else if (status && status !== lastStatus) {
              say(`Pulling ${model}... ${status}`);
            }
          } catch (_) { /* partial NDJSON line — wait for more */ }
        }
      });
      res.on('end', () => resolve({ ok: true, model }));
      res.on('error', (e) => resolve({ ok: false, error: e.message }));
    });
    req.on('timeout', () => { req.destroy(new Error('pull timed out')); });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

/** Pull only when missing (gated by allowPull so callers stay explicit). */
async function ensureModel(model, { baseUrl = defaultBaseUrl(), allowPull = false, onProgress = null } = {}) {
  if (!isSafeModelName(model)) return { ok: false, error: `rejected unsafe model name: ${String(model).slice(0, 60)}` };
  const models = await listModels(baseUrl);
  const base = String(model).split(':')[0].toLowerCase();
  const present = models.some((m) => m === model || String(m).split(':')[0].toLowerCase() === base);
  if (present) {
    const exact = models.find((m) => m === model) || models.find((m) => String(m).split(':')[0].toLowerCase() === base);
    return { ok: true, stage: 'already-present', model: exact };
  }
  if (!allowPull) return { ok: false, stage: 'missing', error: `model '${model}' is not installed`, model };
  const pulled = await pullModel(model, { baseUrl, onProgress });
  if (!pulled.ok) return { ok: false, stage: 'pull', error: pulled.error, model };
  return { ok: true, stage: 'pulled', model };
}

/**
 * One-call readiness: server up? (start it if the binary exists).
 * Auto-install only when opts.autoInstall is true (explicit user consent).
 */
async function ensureReady({ baseUrl = defaultBaseUrl(), autoInstall = false, startTimeoutMs = 30000, onProgress = null } = {}) {
  const say = (msg) => { try { onProgress && onProgress(msg); } catch (_) {} };
  const up = await isServerUp(baseUrl, 5000);
  if (up.ok) return { ok: true, stage: 'ready', server: true, installed: true, models: up.models, baseUrl };

  const found = detectOllama();
  if (found.ok) {
    say('Ollama is installed but the server is down — starting it...');
    const started = await startServer({ binary: found.binary, baseUrl, timeoutMs: startTimeoutMs, onProgress });
    if (started.ok) return { ok: true, stage: 'server-started', server: true, installed: true, models: started.models, baseUrl };
    return { ok: false, stage: started.stage, server: false, installed: true, error: started.error, baseUrl };
  }

  if (!autoInstall) {
    return { ok: false, stage: 'not-installed', server: false, installed: false, error: found.error, manual: manualInstallHint(), baseUrl };
  }
  say('Ollama is not installed — installing now (one-time, ~700MB+)...');
  const installed = await installOllama({ onProgress });
  if (!installed.ok) return { ok: false, stage: installed.stage, server: false, installed: false, error: installed.error, manual: installed.manual, baseUrl };
  const started = await startServer({ binary: installed.binary, baseUrl, timeoutMs: startTimeoutMs, onProgress });
  if (!started.ok) return { ok: false, stage: started.stage, server: false, installed: true, error: started.error, baseUrl };
  return { ok: true, stage: 'installed-and-started', server: true, installed: true, models: started.models, baseUrl };
}

module.exports = {
  DEFAULT_PORT,
  defaultBaseUrl,
  candidateBinaryPaths,
  detectOllama,
  isServerUp,
  startServer,
  installOllama,
  manualInstallHint,
  listModels,
  isSafeModelName,
  pullModel,
  ensureModel,
  ensureReady,
};
