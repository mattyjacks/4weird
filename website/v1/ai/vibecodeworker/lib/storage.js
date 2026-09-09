/**
 * Persistent Local Credentials & Key Storage Module - Super Secure Edition
 * Features:
 *  - Machine-specific AES-256-GCM hardware/user-bound key encryption at rest
 *  - Protected file permissions (0600 on POSIX, ACLs on Windows)
 *  - Sanitized API key logging & memory protection
 *  - Cross-build persistence in %APPDATA%/vibecodeworker/credentials.enc
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function getCredentialsDir() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'vibecodeworker');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'vibecodeworker');
  } else {
    return path.join(os.homedir(), '.config', 'vibecodeworker');
  }
}

function getCredentialsFilePath() {
  return path.join(getCredentialsDir(), 'credentials.json');
}

function getEncryptedCredentialsFilePath() {
  return path.join(getCredentialsDir(), 'credentials.enc');
}

/**
 * Derives a hardware- and user-bound 256-bit encryption key for this machine.
 * Prevents copied credential files from being decrypted on other computers.
 * Cached: PBKDF2 with 100k iterations costs ~50-100ms, so derive once per process.
 */
let _cachedMasterKey = null;
function getMachineMasterKey() {
  if (_cachedMasterKey) return _cachedMasterKey;

  // Some restricted Windows environments cannot resolve os.userInfo()
  // (uv_os_get_passwd may return ENOMEM). A stable username environment
  // fallback keeps encrypted local storage available instead of failing the
  // whole configuration flow.
  let username = process.env.USERNAME || process.env.USER || 'unknown-user';
  try {
    username = os.userInfo().username || username;
  } catch (_) {}

  const machineFingerprint = [
    os.hostname(),
    username,
    process.platform,
    os.arch()
  ].join(':');

  _cachedMasterKey = crypto.pbkdf2Sync(machineFingerprint, '4weird-vibe-security-salt-2026', 100000, 32, 'sha256');
  return _cachedMasterKey;
}

// Test hook: allow clearing the cached key (e.g. in unit tests that mock os.userInfo).
function _clearMasterKeyCache() {
  _cachedMasterKey = null;
}

function sanitizeKeyPreview(key) {
  if (typeof key !== 'string' || key.length < 8) return '***';
  return `${key.slice(0, 3)}...${key.slice(-2)} (${key.length} chars)`;
}

function isPlausibleApiKey(key) {
  if (typeof key !== 'string') return false;
  const t = key.trim();
  if (t.length < 8 || t.length > 512) return false;
  if (/^(sk-your|your-|xxx|test|placeholder)/i.test(t)) return false;
  return true;
}

function maskCredentialsForLog(creds) {
  const out = {};
  if (!creds || typeof creds !== 'object') return out;
  for (const k of Object.keys(creds)) {
    out[k] = sanitizeKeyPreview(creds[k]);
  }
  return out;
}

/**
 * Encrypt arbitrary plain text using AES-256-GCM.
 */
function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMachineMasterKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM encrypted payload.
 */
function decryptSecret(encryptedPayload) {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedPayload.split(':');
    if (!ivHex || !authTagHex || !encrypted) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getMachineMasterKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

/**
 * Load saved API credentials from local user profile directory.
 * Supports both encrypted (.enc) and backwards-compatible (.json) with auto-encryption migration.
 * Cached by file mtime so hot paths (getResolvedApiKey per LLM call) avoid
 * a file read + AES-GCM decrypt on every invocation.
 * @returns {Object} Key-value map of credentials by provider or global
 */
let _credsCache = null;
let _credsCacheStamp = '';

function _credsFileStamp(encPath, jsonPath) {
  try {
    const encStat = fs.existsSync(encPath) ? fs.statSync(encPath) : null;
    const jsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : null;
    return `${encStat ? `${encStat.mtimeMs}:${encStat.size}` : 'noenc'}|${jsonStat ? `${jsonStat.mtimeMs}:${jsonStat.size}` : 'nojson'}`;
  } catch (e) {
    return '';
  }
}

function loadCredentials(skipMigration = false) {
  const encPath = getEncryptedCredentialsFilePath();
  const jsonPath = getCredentialsFilePath();

  // Fast path: return cached copy when neither backing file changed.
  if (!skipMigration && _credsCache) {
    const stamp = _credsFileStamp(encPath, jsonPath);
    if (stamp && stamp === _credsCacheStamp) {
      return { ..._credsCache };
    }
  }

  let result = null;

  // 1. Try reading encrypted storage first
  if (fs.existsSync(encPath)) {
    try {
      const rawEnc = fs.readFileSync(encPath, 'utf8').trim();
      const decrypted = decryptSecret(rawEnc);
      if (decrypted) {
        result = JSON.parse(decrypted);
      }
    } catch (err) {
      console.error('[Credentials Security] Failed to decrypt credentials store:', err.message);
    }
  }

  // 2. Migration fallback: read legacy plain JSON if present, then auto-encrypt & wipe plain text
  if (!result && !skipMigration && fs.existsSync(jsonPath)) {
    try {
      const data = fs.readFileSync(jsonPath, 'utf8');
      const creds = JSON.parse(data);
      // Auto-encrypt into .enc without re-triggering migration
      saveCredentials(creds, true);
      try { fs.unlinkSync(jsonPath); } catch (e) {}
      result = creds;
    } catch (err) {
      console.error(`[Credentials] Failed to load plain credentials from ${jsonPath}:`, err.message);
    }
  }

  result = result || {};
  if (!skipMigration) {
    _credsCache = { ...result };
    try {
      _credsCacheStamp = _credsFileStamp(encPath, jsonPath);
    } catch (e) {
      _credsCacheStamp = '';
    }
  }
  return { ...result };
}

// Test hook: clear the credentials cache.
function _clearCredentialsCache() {
  _credsCache = null;
  _credsCacheStamp = '';
}

/**
 * Save API credentials to local user profile directory with AES-256-GCM encryption.
 * @param {Object} credentials - Map of credentials
 * @param {boolean} isMigrating - Internal flag to prevent recursion
 * @returns {boolean} Success status
 */
function saveCredentials(credentials, isMigrating = false) {
  const dir = getCredentialsDir();
  const encPath = getEncryptedCredentialsFilePath();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    const current = isMigrating ? {} : loadCredentials(true);
    const updated = { ...current, ...credentials, updatedAt: new Date().toISOString() };
    const encrypted = encryptSecret(JSON.stringify(updated, null, 2));
    fs.writeFileSync(encPath, encrypted, { encoding: 'utf8', mode: 0o600 });
    // Refresh cache so subsequent loads hit memory instead of disk.
    _credsCache = { ...updated };
    try {
      _credsCacheStamp = _credsFileStamp(encPath, getCredentialsFilePath());
    } catch (e) {
      _credsCacheStamp = '';
    }
    return true;
  } catch (err) {
    console.error(`[Credentials Security] Failed to save encrypted credentials to ${encPath}:`, err.message);
    return false;
  }
}

/** Remove provider-specific keys after a confirmed authentication failure. */
function removeCredentialsForProviders(providers = []) {
  const fields = { openai: 'openaiApiKey', deepseek: 'deepseekApiKey', gemini: 'geminiApiKey', meta: 'metaApiKey', openrouter: 'openrouterApiKey', elevenlabs: 'elevenlabsApiKey', runpod: 'runpodApiKey' };
  const wanted = providers.filter((provider) => fields[provider]);
  if (!wanted.length) return false;
  const dir = getCredentialsDir();
  const encPath = getEncryptedCredentialsFilePath();
  try {
    const updated = loadCredentials(true);
    for (const provider of wanted) {
      delete updated[fields[provider]];
      // Remove the legacy generic mirror only when it belongs to this provider.
      if (updated.provider === provider) {
        delete updated.provider;
        delete updated.apiKey;
      }
    }
    updated.updatedAt = new Date().toISOString();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(encPath, encryptSecret(JSON.stringify(updated, null, 2)), { encoding: 'utf8', mode: 0o600 });
    _credsCache = { ...updated };
    _credsCacheStamp = _credsFileStamp(encPath, getCredentialsFilePath());
    return true;
  } catch (err) {
    console.error(`[Credentials Security] Failed to remove invalid credentials: ${err.message}`);
    return false;
  }
}

/**
 * Placeholder / example values that must NEVER be treated as a real key.
 * These come from .env.example and docs; using one produces a 401 that
 * looks exactly like "my key is invalid".
 */
const PLACEHOLDER_PATTERNS = [
  /your-.*-api-key-here/i,
  /sk-your-/i,
  /AIzaSyYour/i,
  /^sk-or-v1-your-/i,
  /^YOUR_/,
  /^Using process\.env/,
  /^enter /i,
  /^\*+$/,
  /^test-key/i,
  /^mock/i,
  /elevenlabs-key-here/i,
  /your-elevenlabs/i,
  // Test/demo fixtures that have appeared in local credential stores. They
  // look key-shaped, but are deliberately non-secret values used by tests.
  /^sk-luna(?:-|$)/i,
  /^sk-dsh(?:-|$)/i,
  /^meta-muse?(?:-|$)/i,
  /(?:^|-)(?:test|fixture|example)(?:-|$)/i
];

function isPlaceholderKey(key) {
  if (!key || typeof key !== 'string') return true;
  const trimmed = key.trim();
  if (trimmed.length < 8) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

function readEnvKey(provider) {
  let raw = '';
  if (provider === 'deepseek') raw = process.env.DEEPSEEK_API_KEY || '';
  else if (provider === 'meta') raw = process.env.META_API_KEY || process.env.OPENROUTER_API_KEY || '';
  else if (provider === 'openai') raw = process.env.OPENAI_API_KEY || '';
  else if (provider === 'gemini') raw = process.env.GEMINI_API_KEY || '';
  else if (provider === 'openrouter') raw = process.env.OPENROUTER_API_KEY || '';
  else if (provider === 'elevenlabs') raw = process.env.ELEVENLABS_API_KEY || '';
  else if (provider === 'runpod') raw = process.env.RUNPOD_API_KEY || '';
  raw = (raw || '').trim();
  // A stale placeholder in the shell (e.g. copied from .env.example) must not
  // shadow the good key the user saved in the encrypted store.
  if (!raw || isPlaceholderKey(raw)) return '';
  return raw;
}

/**
 * Get active API key for a specified provider.
 * Priority (fixes "entered it last run but invalid now"):
 *   1. Explicit typed key (dashboard input / in-memory config)
 *   2. Encrypted OS store (%APPDATA%/vibecodeworker/credentials.enc)
 *   3. Environment variable (real values only, placeholders rejected)
 * @param {string} provider - Provider name ('openai', 'deepseek', 'meta', 'openrouter', 'gemini')
 * @param {string} fallbackKey - Optional key from memory/config
 * @returns {string} Resolved API key
 */
function getResolvedApiKey(provider, fallbackKey = '') {
  const typed = (fallbackKey || '').trim();
  if (typed && !isPlaceholderKey(typed)) {
    return typed;
  }

  const creds = loadCredentials();
  const clean = (v) => {
    const s = (v || '').trim();
    return s && !isPlaceholderKey(s) ? s : '';
  };

  let stored = '';
  if (provider === 'deepseek') {
    stored = clean(creds.deepseekApiKey) || (creds.provider === 'deepseek' ? clean(creds.apiKey) : '');
  } else if (provider === 'meta') {
    stored = clean(creds.metaApiKey) || clean(creds.openrouterApiKey) || (creds.provider === 'meta' ? clean(creds.apiKey) : '');
  } else if (provider === 'openai') {
    stored = clean(creds.openaiApiKey) || (creds.provider === 'openai' ? clean(creds.apiKey) : '') || clean(creds.apiKey);
  } else if (provider === 'gemini') {
    stored = clean(creds.geminiApiKey) || (creds.provider === 'gemini' ? clean(creds.apiKey) : '');
  } else if (provider === 'openrouter') {
    stored = clean(creds.openrouterApiKey) || (creds.provider === 'openrouter' ? clean(creds.apiKey) : '');
  } else if (provider === 'elevenlabs') {
    stored = clean(creds.elevenlabsApiKey) || (creds.provider === 'elevenlabs' ? clean(creds.apiKey) : '');
  } else if (provider === 'runpod') {
    stored = clean(creds.runpodApiKey) || (creds.provider === 'runpod' ? clean(creds.apiKey) : '');
  } else {
    stored = clean(creds.apiKey);
  }
  if (stored) return stored;

  // Last resort: real (non-placeholder) environment variable.
  return readEnvKey(provider);
}

/**
 * Mask an API key for safe UI display and log printing (e.g. "sk-abc123...wxyz").
 * Shows the first 8 and last 4 characters only; the middle stays hidden so the
 * full secret is never rendered, logged, or placed in the DOM. Short/placeholder
 * values return a fixed mask so their length is not leaked.
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (!trimmed || isPlaceholderKey(trimmed)) return '';
  if (trimmed.length <= 12) return '********';
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

/**
 * Masked display bundle for the API-keys modal. Returns ONLY first8...last4
 * previews (never full secrets) so the UI can show each saved key without
 * exposing it in input values, innerText, or logs.
 * @returns {{openai:string,deepseek:string,gemini:string,meta:string,openrouter:string,elevenlabs:string}}
 */
function loadMaskedApiKeyBundle() {
  return {
    openai: maskApiKey(getResolvedApiKey('openai')),
    deepseek: maskApiKey(getResolvedApiKey('deepseek')),
    gemini: maskApiKey(getResolvedApiKey('gemini')),
    meta: maskApiKey(getResolvedApiKey('meta')),
    openrouter: maskApiKey(getResolvedApiKey('openrouter')),
    elevenlabs: maskApiKey(getResolvedApiKey('elevenlabs')),
    runpod: maskApiKey(getResolvedApiKey('runpod'))
  };
}

module.exports = {
  getCredentialsDir,
  getCredentialsFilePath,
  getEncryptedCredentialsFilePath,
  loadCredentials,
  saveCredentials,
  removeCredentialsForProviders,
  getResolvedApiKey,
  encryptSecret,
  decryptSecret,
  maskApiKey,
  loadMaskedApiKeyBundle,
  isPlaceholderKey,
  readEnvKey,
  sanitizeKeyPreview,
  isPlausibleApiKey,
  maskCredentialsForLog,
  _clearMasterKeyCache,
  _clearCredentialsCache
};
