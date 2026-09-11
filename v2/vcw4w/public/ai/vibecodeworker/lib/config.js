/**
 * AutoCode Configuration Module
 * Manages system configuration and settings
 */

const VALID_PROVIDERS = ['deepseek', 'openai', 'meta', 'openrouter', 'gemini', 'local'];
const VALID_AUDIO_CHANNELS = ['mono', 'stereo'];
const KNOWN_CONFIG_KEYS = new Set([
  'autoChooseModel', 'largestModelAllowed', 'useProForExtreme', 'provider',
  'apiKey', 'endpointUrl', 'budgetLimit', 'maxInputTokens', 'maxOutputTokens',
  'useCacheTokens', 'minifyCode', 'compressScreenshots', 'enableScreenshots',
  'maxScreenshots', 'captureOnPlay', 'targetFile', 'projectPath', 'chatEnabled',
  'maxChatHistory', 'streamingEnabled', 'elevenlabsApiKey', 'audioChannelMode',
  'audioVoiceId', 'audioTtsModel', 'audioSttModel', 'audioCommentary',
  'audioNarrateBugs', 'cloud', 'localModels'
]);

function clampNum(v, lo, hi, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

class AutoCodeConfig {
  constructor() {
    // Model selection
    this.autoChooseModel = false;
    this.largestModelAllowed = 'gpt-5.6-luna';
    this.useProForExtreme = false;

    // Credentials / API settings
    this.provider = 'deepseek';
    this.apiKey = '';
    this.endpointUrl = '';

    // Budget & token limits
    this.budgetLimit = 0.05; // $0.05 default
    this.maxInputTokens = 30000;
    this.maxOutputTokens = 4000;
    this.useCacheTokens = true;

    // Token minimization
    this.minifyCode = true;
    this.compressScreenshots = true;

    // Screenshots
    this.enableScreenshots = false;
    this.maxScreenshots = 2;
    this.captureOnPlay = false;

    // Project
    this.targetFile = null;
    this.projectPath = null;

    // Chat
    this.chatEnabled = true;
    this.maxChatHistory = 50;
    this.streamingEnabled = true;

    // ElevenLabs audio (BYOK voice layer; never required, always optional)
    this.elevenlabsApiKey = '';
    this.audioChannelMode = 'mono'; // 'mono' (default single stream) | 'stereo' (L/R + diff)
    this.audioVoiceId = '21m00Tcm4TlvDq8ikWAM';
    this.audioTtsModel = 'eleven_multilingual_v2';
    this.audioSttModel = 'scribe_v1';
    this.audioCommentary = false; // speak agent thinking-out-loud via TTS
    this.audioNarrateBugs = false; // speak bug alerts via TTS

    // Runpod cloud game + model runs (BYOK, 55 min cap, per second billing).
    // Key is never stored here; it arrives per request via x-runpod-key.
    this.cloud = {
      maxMinutes: 55,
      billing: 'per-second',
      gameVramGB: 5,
      minGpuGB: 16,
      defaultGpuId: 'NVIDIA RTX 2000 Ada Generation'
    };

    // Local-model orchestration (Ollama role assignments; see lib/model_roles.js).
    // Defaults are suggestions only; the dashboard "Local models" panel owns them.
    this.localModels = {
      ollamaUrl: 'http://127.0.0.1:11434',
      autoStart: true,
      roles: {
        agent: { provider: 'local', model: 'qwen3:8b' },
        vision: { provider: 'local', model: 'qwen2.5vl:7b' },
        coder: { provider: 'local', model: 'qwen2.5-coder:7b' },
        reasoner: { provider: 'local', model: 'deepseek-r1:8b' }
      }
    };
  }

  update(newConfig) {
    if (!newConfig || typeof newConfig !== 'object') return this;
    const filtered = {};
    for (const k of Object.keys(newConfig)) {
      if (KNOWN_CONFIG_KEYS.has(k)) filtered[k] = newConfig[k];
    }
    Object.assign(this, filtered);
    this._normalize();
    return this;
  }

  _normalize() {
    if (typeof this.provider === 'string') {
      const p = this.provider.toLowerCase().trim();
      this.provider = VALID_PROVIDERS.includes(p) ? p : 'deepseek';
    } else {
      this.provider = 'deepseek';
    }
    this.budgetLimit = clampNum(this.budgetLimit, 0, 1000, 0.05);
    this.maxInputTokens = Math.round(clampNum(this.maxInputTokens, 1000, 1000000, 30000));
    this.maxOutputTokens = Math.round(clampNum(this.maxOutputTokens, 256, 128000, 4000));
    this.maxScreenshots = Math.round(clampNum(this.maxScreenshots, 0, 10, 2));
    this.maxChatHistory = Math.round(clampNum(this.maxChatHistory, 1, 200, 50));
    this.enableScreenshots = Boolean(this.enableScreenshots);
    this.captureOnPlay = Boolean(this.captureOnPlay);
    this.chatEnabled = Boolean(this.chatEnabled);
    this.streamingEnabled = Boolean(this.streamingEnabled);
    this.minifyCode = Boolean(this.minifyCode);
    this.compressScreenshots = Boolean(this.compressScreenshots);
    this.autoChooseModel = Boolean(this.autoChooseModel);
    this.useProForExtreme = Boolean(this.useProForExtreme);
    this.useCacheTokens = Boolean(this.useCacheTokens);
    this.audioCommentary = Boolean(this.audioCommentary);
    this.audioNarrateBugs = Boolean(this.audioNarrateBugs);
    if (!VALID_AUDIO_CHANNELS.includes(this.audioChannelMode)) this.audioChannelMode = 'mono';
    if (this.cloud && typeof this.cloud === 'object') {
      this.cloud.maxMinutes = clampNum(this.cloud.maxMinutes, 1, 55, 55);
    }
    if (typeof this.endpointUrl === 'string') this.endpointUrl = this.endpointUrl.trim().slice(0, 2048);
    if (typeof this.targetFile === 'string') this.targetFile = this.targetFile.slice(0, 1024);
    if (typeof this.projectPath === 'string') this.projectPath = this.projectPath.slice(0, 1024);
    return this;
  }

  validate() {
    const errors = [];
    if (!VALID_PROVIDERS.includes(this.provider)) errors.push(`provider must be one of ${VALID_PROVIDERS.join(',')}`);
    if (!(this.budgetLimit >= 0 && this.budgetLimit <= 1000)) errors.push('budgetLimit out of range 0-1000');
    if (!(this.maxInputTokens >= 1000 && this.maxInputTokens <= 1000000)) errors.push('maxInputTokens out of range');
    if (!(this.maxOutputTokens >= 256 && this.maxOutputTokens <= 128000)) errors.push('maxOutputTokens out of range');
    if (!VALID_AUDIO_CHANNELS.includes(this.audioChannelMode)) errors.push('audioChannelMode must be mono|stereo');
    if (this.endpointUrl && !/^https?:\/\//i.test(this.endpointUrl) && this.endpointUrl.length > 0) errors.push('endpointUrl must start with http(s)://');
    return errors;
  }

  isValid() {
    return this.validate().length === 0;
  }

  loadFromEnv(env) {
    const e = env || process.env || {};
    const patch = {};
    if (e.VIBE_PROVIDER) patch.provider = e.VIBE_PROVIDER;
    if (e.VIBE_BUDGET_LIMIT) patch.budgetLimit = Number(e.VIBE_BUDGET_LIMIT);
    if (e.VIBE_MAX_INPUT_TOKENS) patch.maxInputTokens = Number(e.VIBE_MAX_INPUT_TOKENS);
    if (e.VIBE_MAX_OUTPUT_TOKENS) patch.maxOutputTokens = Number(e.VIBE_MAX_OUTPUT_TOKENS);
    if (e.VIBE_AUDIO_CHANNEL) patch.audioChannelMode = e.VIBE_AUDIO_CHANNEL;
    if (e.LOCAL_LLM_URL) patch.endpointUrl = e.LOCAL_LLM_URL;
    return this.update(patch);
  }

  toJSON() {
    const { apiKey, elevenlabsApiKey, ...rest } = { ...this };
    return {
      ...rest,
      apiKey: apiKey ? '***redacted***' : '',
      elevenlabsApiKey: elevenlabsApiKey ? '***redacted***' : ''
    };
  }

  toJSONUnsafe() {
    return { ...this };
  }

  fromJSON(json) {
    if (!json || typeof json !== 'object') return this;
    const filtered = {};
    for (const k of Object.keys(json)) {
      if (KNOWN_CONFIG_KEYS.has(k)) filtered[k] = json[k];
    }
    Object.assign(this, filtered);
    this._normalize();
    return this;
  }
}

module.exports = { AutoCodeConfig, VALID_PROVIDERS, VALID_AUDIO_CHANNELS, KNOWN_CONFIG_KEYS };
