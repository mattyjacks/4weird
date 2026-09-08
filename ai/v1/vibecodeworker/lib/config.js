/**
 * AutoCode Configuration Module
 * Manages system configuration and settings
 */

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

    // ElevenLabs audio (BYOK voice layer — never required, always optional)
    this.elevenlabsApiKey = '';
    this.audioChannelMode = 'mono'; // 'mono' (default single stream) | 'stereo' (L/R + diff)
    this.audioVoiceId = '21m00Tcm4TlvDq8ikWAM';
    this.audioTtsModel = 'eleven_multilingual_v2';
    this.audioSttModel = 'scribe_v1';
    this.audioCommentary = false; // speak agent thinking-out-loud via TTS
    this.audioNarrateBugs = false; // speak bug alerts via TTS

    // Local-model orchestration (Ollama role assignments — see lib/model_roles.js).
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
    Object.assign(this, newConfig);
    return this;
  }

  toJSON() {
    return { ...this };
  }

  fromJSON(json) {
    Object.assign(this, json);
    return this;
  }
}

module.exports = { AutoCodeConfig };
