const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { loadCredentials, saveCredentials, getResolvedApiKey, isPlaceholderKey, removeCredentialsForProviders, maskApiKey, loadMaskedApiKeyBundle } = require('../../lib/storage');

const configFilePath = path.join(__dirname, '..', '..', 'config', 'default.json');

const modelsByProvider = {
  openai: [
    { value: 'gpt-5.6-luna', text: 'GPT-5.6 Luna — current lowest-cost tier (Default)' },
    { value: 'gpt-5.6-terra', text: 'GPT-5.6 Terra — balanced' },
    { value: 'gpt-5.6-sol', text: 'GPT-5.6 Sol — advanced work' },
    { value: 'custom', text: 'Custom...' }
  ],
  deepseek: [
    { value: 'deepseek-v4-flash', text: 'DeepSeek V4 Flash — current low-cost tier (Default)' },
    { value: 'deepseek-v4-pro', text: 'DeepSeek V4 Pro (Complex)' },
    { value: 'deepseek-v4-flash-vision-exp', text: 'DeepSeek V4 Flash Vision' },
    { value: 'custom', text: 'Custom...' }
  ],
  meta: [
    { value: 'muse-spark-1.3-contributor', text: 'Muse Spark 1.3 Contributor — current Meta model (Default)' },
    { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', text: 'Llama 4 Maverick — higher capability' },
    { value: 'custom', text: 'Custom...' }
  ],
  gemini: [
    { value: 'gemini-3.5-flash-lite', text: 'Gemini 3.5 Flash-Lite — current lowest-cost tier (Default)' },
    { value: 'gemini-3.8-flash', text: 'Gemini 3.8 Flash — newest Flash model' },
    { value: 'custom', text: 'Custom...' }
  ],
  openrouter: [
    { value: 'meta/muse-spark-1.3-contributor', text: 'Muse Spark 1.3 Contributor — current Meta model (Default)' },
    { value: 'google/gemini-3.5-flash-lite', text: 'Gemini 3.5 Flash-Lite' },
    { value: 'custom', text: 'Custom...' }
  ],
  elevenlabs: [
    { value: 'eleven_multilingual_v2', text: 'Eleven Multilingual v2 — TTS default' },
    { value: 'eleven_turbo_v2_5', text: 'Eleven Turbo v2.5 — low latency' },
    { value: 'scribe_v1', text: 'Scribe v1 — speech-to-text' },
    { value: 'custom', text: 'Custom...' }
  ],
  local: [
    { value: 'llama3', text: 'Llama 3' },
    { value: 'mistral', text: 'Mistral' },
    { value: 'qwen3:8b', text: 'Qwen3 8B — fast generalist (recommended local default)' },
    { value: 'qwen2.5vl:7b', text: 'Qwen2.5-VL 7B — vision (screenshots)' },
    { value: 'qwen2.5-coder:7b', text: 'Qwen2.5-Coder 7B — code patches' },
    { value: 'deepseek-r1:8b', text: 'DeepSeek-R1 8B — reasoning' },
    { value: 'custom', text: 'Custom...' }
  ]
};

function populateModelsDropdown(providerSelect, modelSelect) {
  if (!modelSelect) return;
  modelSelect.innerHTML = '';
  const models = modelsByProvider[providerSelect.value] || [];
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.text;
    modelSelect.appendChild(opt);
  });
}

function defaultModelForProvider(provider) {
  return (modelsByProvider[provider] || modelsByProvider.openai)[0].value;
}

function migrateLegacyDefaultModel(provider, modelName) {
  const legacyDefaults = {
    openai: new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-5.4-mini-2026-03-17', 'gpt-5.4-mini', 'gpt-5.4-nano']),
    deepseek: new Set(['deepseek-auto', 'deepseek-chat', 'deepseek-reasoner']),
    meta: new Set(['meta/muse-spark-1.3-contributor', 'muse-spark-1.3-contributor']),
    gemini: new Set(['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']),
    openrouter: new Set(['meta/muse-spark-1.3-contributor', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-4o-mini'])
  };
  return legacyDefaults[provider]?.has(modelName) ? defaultModelForProvider(provider) : modelName;
}

function handleProviderChange(providerSelect, modelSelect, localUrlGroup, apiKeyInput, customModelGroup, modelNameInput, skipSave = false, onSaveCallback) {
  const val = providerSelect.value;
  populateModelsDropdown(providerSelect, modelSelect);
  
  if (val === 'local') {
    localUrlGroup.classList.remove('hidden');
    apiKeyInput.placeholder = "Not required for local (optional)";
  } else {
    localUrlGroup.classList.add('hidden');
    if (val === 'deepseek') {
      apiKeyInput.placeholder = process.env.DEEPSEEK_API_KEY ? "Using process.env.DEEPSEEK_API_KEY" : "Enter DeepSeek API Key";
    } else if (val === 'meta') {
      apiKeyInput.placeholder = (process.env.META_API_KEY || process.env.OPENROUTER_API_KEY) ? "Using process.env (META_API_KEY / OPENROUTER_API_KEY)" : "Enter Meta / OpenRouter API Key";
    } else if (val === 'gemini') {
      apiKeyInput.placeholder = process.env.GEMINI_API_KEY ? "Using process.env.GEMINI_API_KEY" : "Enter Gemini API Key";
    } else if (val === 'openrouter') {
      apiKeyInput.placeholder = process.env.OPENROUTER_API_KEY ? "Using process.env.OPENROUTER_API_KEY" : "Enter OpenRouter API Key";
    } else if (val === 'elevenlabs') {
      apiKeyInput.placeholder = process.env.ELEVENLABS_API_KEY ? "Using process.env.ELEVENLABS_API_KEY" : "Enter ElevenLabs API Key (voice/TTS/STT)";
    } else {
      apiKeyInput.placeholder = process.env.OPENAI_API_KEY ? "Using process.env.OPENAI_API_KEY" : "Enter OpenAI API Key";
    }
  }

  // Load key specific to selected provider from persistent storage
  const savedKey = getResolvedApiKey(val);
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
  
  if (!skipSave) {
    if (modelSelect.options.length > 0) {
      modelSelect.value = modelSelect.options[0].value;
      customModelGroup.classList.add('hidden');
      modelNameInput.value = modelSelect.value;
    }
    if (onSaveCallback) onSaveCallback();
  }
}

function loadConfig(elements, audioModule, agentBrain, autoCodeSystem, dataDir) {
  let settings = {};
  try {
    if (fs.existsSync(configFilePath)) {
      settings = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    } else {
      settings = JSON.parse(localStorage.getItem('ai_debugger_settings') || '{}');
    }
  } catch (e) {
    console.error("Failed to read settings config file", e);
    settings = JSON.parse(localStorage.getItem('ai_debugger_settings') || '{}');
  }

  const prov = settings.provider || 'openai';
  settings.modelName = migrateLegacyDefaultModel(prov, settings.modelName || '');
  elements.providerSelect.value = prov;

  // Resolve API key from OS-level persistent storage across builds
  const resolvedKey = getResolvedApiKey(prov, settings.apiKey);
  elements.apiKeyInput.value = resolvedKey || '';
  if (!elements.apiKeyInput.value) {
    if (prov === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      elements.apiKeyInput.placeholder = "Using process.env.DEEPSEEK_API_KEY";
    } else if (prov === 'meta' && (process.env.META_API_KEY || process.env.OPENROUTER_API_KEY)) {
      elements.apiKeyInput.placeholder = "Using process.env.META_API_KEY";
    } else if (prov === 'openrouter' && process.env.OPENROUTER_API_KEY) {
      elements.apiKeyInput.placeholder = "Using process.env.OPENROUTER_API_KEY";
    } else if (prov === 'openai' && process.env.OPENAI_API_KEY) {
      elements.apiKeyInput.placeholder = "Using process.env.OPENAI_API_KEY";
    } else if (prov === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      elements.apiKeyInput.placeholder = "Using process.env.ELEVENLABS_API_KEY";
    }
  }
  elements.localUrlInput.value = settings.localUrl || 'http://localhost:11434/api/chat';
  
  populateModelsDropdown(elements.providerSelect, elements.modelSelect);
  
  const savedModel = settings.modelName || defaultModelForProvider(prov);
  const hasModelInSelect = Array.from(elements.modelSelect.options).some(opt => opt.value === savedModel);
  if (hasModelInSelect) {
    elements.modelSelect.value = savedModel;
    elements.customModelGroup.classList.add('hidden');
    elements.modelNameInput.value = savedModel;
  } else {
    elements.modelSelect.value = 'custom';
    elements.customModelGroup.classList.remove('hidden');
    elements.modelNameInput.value = savedModel;
  }

  elements.gameRulesInput.value = settings.gameRules || 'Website audit: explore nav, scroll the full page, try key CTAs/forms, report real JS errors. Ignore cross-origin iframe and permissions-policy noise.';
  elements.gameUrlInput.value = settings.gameUrl || 'https://mattyjacks.com';
  audioModule.setAudioEnabled(settings.isAudioEnabled || false);
  document.getElementById('btn-toggle-audio').textContent = audioModule.getAudioEnabled() ? '🔊' : '🔇';

  if (elements.toggleMemory) {
    const alwaysMem = settings.alwaysSendMemory || false;
    elements.toggleMemory.checked = alwaysMem;
    agentBrain.config.alwaysSendMemory = alwaysMem;
  }

  if (elements.toggleAutoChoose) {
    const autoChoose = settings.autoChooseModel || false;
    elements.toggleAutoChoose.checked = autoChoose;
    if (autoChoose) {
      elements.largestModelGroup.classList.remove('hidden');
      elements.proExtremeGroup.classList.remove('hidden');
    }
  }
  if (elements.largestModelSelect) {
    elements.largestModelSelect.value = settings.largestModelAllowed || 'gpt-5.6-luna';
  }
  if (elements.toggleProExtreme) {
    elements.toggleProExtreme.checked = settings.useProForExtreme || false;
  }

  if (elements.autocodeBudget) elements.autocodeBudget.value = settings.autoCodeBudget || 0.05;
  if (elements.autocodeMaxIn) elements.autocodeMaxIn.value = settings.autoCodeMaxIn || 30000;
  if (elements.autocodeMaxOut) elements.autocodeMaxOut.value = settings.autoCodeMaxOut || 4000;
  if (elements.autocodeCacheTokens) elements.autocodeCacheTokens.checked = settings.autoCodeCacheTokens !== false;
  if (elements.autocodeMinifyCode) elements.autocodeMinifyCode.checked = settings.autoCodeMinifyCode !== false;
  if (elements.autocodeCompressShots) elements.autocodeCompressShots.checked = settings.autoCodeCompressShots !== false;
  if (elements.autocodeEnableShots) elements.autocodeEnableShots.checked = settings.autoCodeEnableShots || false;
  if (elements.autocodeMaxShots) elements.autocodeMaxShots.value = settings.autoCodeMaxShots || 2;
  if (elements.autocodeCaptureOnPlay) elements.autocodeCaptureOnPlay.checked = settings.autoCodeCaptureOnPlay || false;

  if (elements.serverPortInput) {
    elements.serverPortInput.value = settings.serverPort || 42069;
  }

  // Unified web engine selection: ultralight (default/main) | electron | chromium.
  if (elements.webEngineSelect) {
    const valid = ['ultralight', 'electron', 'chromium'];
    const saved = valid.includes(settings.webEngine) ? settings.webEngine : 'ultralight';
    elements.webEngineSelect.value = saved;
  }

  // Audio engine: mono (default single stream) | stereo (L/R + diff).
  if (elements.audioChannelMode) {
    const valid = ['mono', 'stereo'];
    elements.audioChannelMode.value = valid.includes(settings.audioChannelMode) ? settings.audioChannelMode : 'mono';
  }
  if (elements.audioVoiceId) elements.audioVoiceId.value = settings.audioVoiceId || '21m00Tcm4TlvDq8ikWAM';
  if (elements.toggleAudioCommentary) elements.toggleAudioCommentary.checked = settings.audioCommentary || false;
  if (elements.toggleAudioNarrateBugs) elements.toggleAudioNarrateBugs.checked = settings.audioNarrateBugs || false;

  // Standalone ElevenLabs key (voice layer is provider-independent).
  if (elements.elevenlabsKeyInput) {
    elements.elevenlabsKeyInput.value = getResolvedApiKey('elevenlabs');
    if (!elements.elevenlabsKeyInput.value && process.env.ELEVENLABS_API_KEY) {
      elements.elevenlabsKeyInput.placeholder = "Using process.env.ELEVENLABS_API_KEY";
    }
  }

  // Local-model orchestration roles (dashboard "Local models" panel).
  // Elements are optional — the panel may be absent in minimal builds.
  try {
    const { applyLocalModelsSettings } = require('../components/ollama_ui_controller');
    applyLocalModelsSettings(elements, settings);
  } catch (e) { /* dashboard works fine without the local-models panel */ }

  // OpenCode.ai bridge (optional) — applied defensively so older configs still load.
  try {
    const { applyOpenCodeSettings } = require('../components/opencode_ui_controller');
    applyOpenCodeSettings(elements, settings);
  } catch (e) { /* dashboard works fine without the bridge panel */ }

  agentBrain.updateConfig({
    dataDir,
    provider: prov,
    apiKey: elements.apiKeyInput.value || '',
    endpointUrl: elements.localUrlInput.value || '',
    modelName: elements.modelNameInput.value || '',
    gameRules: elements.gameRulesInput.value || ''
  });
  agentBrain.loadSessionMemory();

  autoCodeSystem.updateConfig({
    autoChooseModel: settings.autoChooseModel || false,
    largestModelAllowed: settings.largestModelAllowed || 'gpt-5.6-luna',
    useProForExtreme: settings.useProForExtreme || false,
    budgetLimit: settings.autoCodeBudget || 0.05,
    maxInputTokens: settings.autoCodeMaxIn || 30000,
    maxOutputTokens: settings.autoCodeMaxOut || 4000,
    useCacheTokens: settings.autoCodeCacheTokens !== false,
    minifyCode: settings.autoCodeMinifyCode !== false,
    compressScreenshots: settings.autoCodeCompressShots !== false,
    enableScreenshots: settings.autoCodeEnableShots || false,
    maxScreenshots: settings.autoCodeMaxShots || 2,
    captureOnPlay: settings.autoCodeCaptureOnPlay || false
  });
}

function saveConfig(elements, audioModule, agentBrain, autoCodeSystem, dataDir) {
  const modelToSave = elements.modelSelect.value === 'custom' ? elements.modelNameInput.value : elements.modelSelect.value;
  const settings = {
    provider: elements.providerSelect.value,
    localUrl: elements.localUrlInput.value,
    modelName: modelToSave,
    gameRules: elements.gameRulesInput.value,
    gameUrl: elements.gameUrlInput.value,
    isAudioEnabled: audioModule.getAudioEnabled(),
    alwaysSendMemory: elements.toggleMemory ? elements.toggleMemory.checked : false,
    autoChooseModel: elements.toggleAutoChoose ? elements.toggleAutoChoose.checked : false,
    largestModelAllowed: elements.largestModelSelect ? elements.largestModelSelect.value : 'gpt-5.6-luna',
    useProForExtreme: elements.toggleProExtreme ? elements.toggleProExtreme.checked : false,
    autoCodeBudget: elements.autocodeBudget ? parseFloat(elements.autocodeBudget.value) : 0.05,
    autoCodeMaxIn: elements.autocodeMaxIn ? parseInt(elements.autocodeMaxIn.value) : 30000,
    autoCodeMaxOut: elements.autocodeMaxOut ? parseInt(elements.autocodeMaxOut.value) : 4000,
    autoCodeCacheTokens: elements.autocodeCacheTokens ? elements.autocodeCacheTokens.checked : true,
    autoCodeMinifyCode: elements.autocodeMinifyCode ? elements.autocodeMinifyCode.checked : true,
    autoCodeCompressShots: elements.autocodeCompressShots ? elements.autocodeCompressShots.checked : true,
    autoCodeEnableShots: elements.autocodeEnableShots ? elements.autocodeEnableShots.checked : false,
    autoCodeMaxShots: elements.autocodeMaxShots ? parseInt(elements.autocodeMaxShots.value) : 2,
    autoCodeCaptureOnPlay: elements.autocodeCaptureOnPlay ? elements.autocodeCaptureOnPlay.checked : false,
    serverPort: elements.serverPortInput ? (parseInt(elements.serverPortInput.value) || 42069) : 42069,
    webEngine: elements.webEngineSelect && ['ultralight', 'electron', 'chromium'].includes(elements.webEngineSelect.value)
      ? elements.webEngineSelect.value
      : 'ultralight',
    audioChannelMode: elements.audioChannelMode && ['mono', 'stereo'].includes(elements.audioChannelMode.value)
      ? elements.audioChannelMode.value
      : 'mono',
    audioVoiceId: elements.audioVoiceId ? elements.audioVoiceId.value : '21m00Tcm4TlvDq8ikWAM',
    audioCommentary: elements.toggleAudioCommentary ? elements.toggleAudioCommentary.checked : false,
    audioNarrateBugs: elements.toggleAudioNarrateBugs ? elements.toggleAudioNarrateBugs.checked : false,
    // Local-model role assignments (owned by the dashboard panel; never wiped).
    localModels: readLocalModelsBlock(elements),
    // Preserve the OpenCode bridge block (managed by its own panel; never wiped).
    opencode: readExistingOpenCodeBlock(elements)
  };
  // Keys live exclusively in the encrypted, user-profile credential store.
  // Do not place them in config.json, localStorage, or a Git worktree.
  localStorage.setItem('ai_debugger_settings', JSON.stringify(settings));

  // Persist API key to OS-level storage across builds
  const apiKey = elements.apiKeyInput.value;
  if (apiKey) {
    const credUpdate = {};
    if (settings.provider === 'deepseek') credUpdate.deepseekApiKey = apiKey;
    else if (settings.provider === 'meta') credUpdate.metaApiKey = apiKey;
    else if (settings.provider === 'openai') credUpdate.openaiApiKey = apiKey;
    else if (settings.provider === 'gemini') credUpdate.geminiApiKey = apiKey;
    else if (settings.provider === 'openrouter') credUpdate.openrouterApiKey = apiKey;
    else if (settings.provider === 'elevenlabs') credUpdate.elevenlabsApiKey = apiKey;
    saveCredentials(credUpdate);
  }
  // ElevenLabs voice key is provider-independent — always persist when typed.
  if (elements.elevenlabsKeyInput && elements.elevenlabsKeyInput.value) {
    saveCredentials({ elevenlabsApiKey: elements.elevenlabsKeyInput.value });
  }

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write settings to config.json", e);
  }

  agentBrain.updateConfig({
    provider: settings.provider,
    apiKey,
    endpointUrl: settings.localUrl,
    modelName: settings.modelName,
    gameRules: settings.gameRules,
    dataDir: dataDir
  });

  autoCodeSystem.updateConfig({
    provider: settings.provider,
    apiKey: settings.apiKey,
    endpointUrl: settings.localUrl,
    autoChooseModel: settings.autoChooseModel,
    largestModelAllowed: settings.largestModelAllowed,
    useProForExtreme: settings.useProForExtreme,
    budgetLimit: settings.autoCodeBudget,
    maxInputTokens: settings.autoCodeMaxIn,
    maxOutputTokens: settings.autoCodeMaxOut,
    useCacheTokens: settings.autoCodeCacheTokens,
    minifyCode: settings.autoCodeMinifyCode,
    compressScreenshots: settings.autoCodeCompressShots,
    enableScreenshots: settings.autoCodeEnableShots,
    maxScreenshots: settings.autoCodeMaxShots,
    captureOnPlay: settings.autoCodeCaptureOnPlay
  });
}

function loadApiKeyBundle() {
  return {
    openai: getResolvedApiKey('openai'),
    deepseek: getResolvedApiKey('deepseek'),
    gemini: getResolvedApiKey('gemini'),
    meta: getResolvedApiKey('meta'),
    openrouter: getResolvedApiKey('openrouter'),
    elevenlabs: getResolvedApiKey('elevenlabs'),
    runpod: getResolvedApiKey('runpod')
  };
}

// Display-only bundle: first 8 + last 4 per key, never full secrets.
// Use this for any UI text/placeholder; keep loadApiKeyBundle() for
// authenticated IPC calls and never render its values.
function loadMaskedApiKeyBundleForDisplay() {
  return loadMaskedApiKeyBundle();
}

function hasAnyApiKey() {
  return ['openai', 'deepseek', 'meta', 'gemini', 'openrouter', 'elevenlabs', 'runpod']
    .some((provider) => Boolean(getResolvedApiKey(provider)));
}

function clearInvalidApiKeyProviders(providers) {
  return removeCredentialsForProviders(providers);
}

function saveApiKeyBundle(keys = {}) {
  const update = {};
  const invalid = [];
  const entries = [
    ['openai', 'openaiApiKey'],
    ['deepseek', 'deepseekApiKey'],
    ['gemini', 'geminiApiKey'],
    ['meta', 'metaApiKey'],
    ['openrouter', 'openrouterApiKey'],
    ['elevenlabs', 'elevenlabsApiKey'],
    ['runpod', 'runpodApiKey']
  ];
  for (const [name, field] of entries) {
    const value = String(keys[name] || '').trim();
    if (!value) continue;
    if (isPlaceholderKey(value)) invalid.push(name);
    else update[field] = value;
  }
  if (invalid.length) return { success: false, error: `Replace the example/placeholder ${invalid.join(', ')} key.` };
  if (!Object.keys(update).length) return { success: false, error: 'Enter at least one API key to save.' };
  return saveCredentials(update)
    ? { success: true, saved: Object.keys(update).map((field) => field.replace('ApiKey', '')) }
    : { success: false, error: 'The encrypted key store could not be updated.' };
}

// Read the live Local-models panel controls, falling back to whatever is
// already on disk so saveConfig never wipes role assignments when the panel
// is absent. Validation lives in lib/model_roles.js (normalizeLocalModels).
function readLocalModelsBlock(elements) {
  let onDisk = null;
  try {
    if (fs.existsSync(configFilePath)) {
      const raw = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      if (raw && raw.localModels) onDisk = raw.localModels;
    }
  } catch (e) { /* defaults below */ }
  try {
    const { normalizeLocalModels, ROLE_NAMES } = require('../../lib/model_roles');
    const roles = {};
    let touched = false;
    for (const name of ROLE_NAMES) {
      const providerEl = elements[`roleProvider_${name}`];
      const modelEl = elements[`roleModel_${name}`];
      if (providerEl || modelEl) touched = true;
      const diskRole = (onDisk && onDisk.roles && onDisk.roles[name]) || {};
      roles[name] = {
        provider: providerEl && providerEl.value ? providerEl.value : (diskRole.provider || 'local'),
        model: modelEl && modelEl.value.trim() ? modelEl.value.trim() : (diskRole.model || ''),
      };
    }
    const urlEl = elements.ollamaUrlInput;
    const autoEl = elements.ollamaAutoStart;
    const merged = {
      ollamaUrl: urlEl && urlEl.value.trim()
        ? urlEl.value.trim()
        : ((onDisk && onDisk.ollamaUrl) || 'http://127.0.0.1:11434'),
      autoStart: autoEl ? !!autoEl.checked : (onDisk ? onDisk.autoStart !== false : true),
      roles,
    };
    void touched;
    return normalizeLocalModels(merged);
  } catch (e) {
    try {
      const { normalizeLocalModels } = require('../../lib/model_roles');
      return normalizeLocalModels(onDisk);
    } catch (_) {
      return onDisk || {};
    }
  }
}

// Read the live OpenCode panel controls, falling back to whatever is already
// on disk so saveConfig never wipes the bridge block when the panel is absent.
function readExistingOpenCodeBlock(elements) {
  let onDisk = {};
  try {
    if (fs.existsSync(configFilePath)) {
      const raw = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      if (raw && raw.opencode) onDisk = raw.opencode;
    }
  } catch (e) { /* defaults below */ }
  const block = {
    enabled: !!(elements.opencodeEnable ? elements.opencodeEnable.checked : onDisk.enabled),
    mode: elements.opencodeMode ? elements.opencodeMode.value : (onDisk.mode || 'cli'),
    model: onDisk.model || '',
    agent: onDisk.agent || 'build',
    autoApprove: onDisk.autoApprove !== false,
    timeoutMs: onDisk.timeoutMs || 600000,
    serverUrl: onDisk.serverUrl || 'http://127.0.0.1:4096',
  };
  return block;
}

module.exports = {
  modelsByProvider,
  defaultModelForProvider,
  migrateLegacyDefaultModel,
  populateModelsDropdown,
  handleProviderChange,
  loadConfig,
  saveConfig,
  loadApiKeyBundle,
  loadMaskedApiKeyBundleForDisplay,
  maskApiKey,
  hasAnyApiKey,
  clearInvalidApiKeyProviders,
  saveApiKeyBundle
};
