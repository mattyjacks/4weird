/**
 * AutoCode Configuration Module
 * Manages system configuration and settings
 */

class AutoCodeConfig {
  constructor() {
    // Model selection
    this.autoChooseModel = false;
    this.largestModelAllowed = 'gpt-5.4';
    this.useProForExtreme = false;

    // Credentials / API settings
    this.provider = 'openai';
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
