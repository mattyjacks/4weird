const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

const configFilePath = path.join(__dirname, '..', '..', 'config.json');

const modelsByProvider = {
  openai: [
    { value: 'gpt-5.4-mini-2026-03-17', text: 'GPT-5.4 Mini' },
    { value: 'gpt-4o-mini', text: 'GPT-4o Mini' },
    { value: 'gpt-4o', text: 'GPT-4o (Standard)' },
    { value: 'custom', text: 'Custom...' }
  ],
  gemini: [
    { value: 'gemini-2.5-flash', text: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', text: 'Gemini 2.5 Pro' },
    { value: 'custom', text: 'Custom...' }
  ],
  openrouter: [
    { value: 'google/gemini-2.5-flash', text: 'Gemini 2.5 Flash' },
    { value: 'google/gemini-2.5-pro', text: 'Gemini 2.5 Pro' },
    { value: 'openai/gpt-4o-mini', text: 'GPT-4o Mini' },
    { value: 'custom', text: 'Custom...' }
  ],
  local: [
    { value: 'llama3', text: 'Llama 3' },
    { value: 'mistral', text: 'Mistral' },
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

function handleProviderChange(providerSelect, modelSelect, localUrlGroup, apiKeyInput, customModelGroup, modelNameInput, skipSave = false, onSaveCallback) {
  const val = providerSelect.value;
  populateModelsDropdown(providerSelect, modelSelect);
  
  if (val === 'local') {
    localUrlGroup.classList.remove('hidden');
    apiKeyInput.placeholder = "Not required for local (optional)";
  } else {
    localUrlGroup.classList.add('hidden');
    if (val === 'gemini') {
      apiKeyInput.placeholder = "Enter Gemini API Key";
    } else {
      apiKeyInput.placeholder = "Enter API Key";
    }
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

  if (settings.modelName === 'gpt-5.4-nano-2026-03-17') {
    settings.modelName = 'gpt-5.4-mini-2026-03-17';
  }

  elements.providerSelect.value = settings.provider || 'openai';
  elements.apiKeyInput.value = settings.apiKey || '';
  elements.localUrlInput.value = settings.localUrl || 'http://localhost:11434/api/chat';
  
  populateModelsDropdown(elements.providerSelect, elements.modelSelect);
  
  const savedModel = settings.modelName || 'gpt-5.4-mini-2026-03-17';
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

  elements.gameRulesInput.value = settings.gameRules || '';
  elements.gameUrlInput.value = settings.gameUrl || '';
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
    elements.largestModelSelect.value = settings.largestModelAllowed || 'gpt-5.4';
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

  agentBrain.updateConfig({ dataDir });
  agentBrain.loadSessionMemory();

  autoCodeSystem.updateConfig({
    autoChooseModel: settings.autoChooseModel || false,
    largestModelAllowed: settings.largestModelAllowed || 'gpt-5.4',
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
    apiKey: elements.apiKeyInput.value,
    localUrl: elements.localUrlInput.value,
    modelName: modelToSave,
    gameRules: elements.gameRulesInput.value,
    gameUrl: elements.gameUrlInput.value,
    isAudioEnabled: audioModule.getAudioEnabled(),
    alwaysSendMemory: elements.toggleMemory ? elements.toggleMemory.checked : false,
    autoChooseModel: elements.toggleAutoChoose ? elements.toggleAutoChoose.checked : false,
    largestModelAllowed: elements.largestModelSelect ? elements.largestModelSelect.value : 'gpt-5.4',
    useProForExtreme: elements.toggleProExtreme ? elements.toggleProExtreme.checked : false,
    autoCodeBudget: elements.autocodeBudget ? parseFloat(elements.autocodeBudget.value) : 0.05,
    autoCodeMaxIn: elements.autocodeMaxIn ? parseInt(elements.autocodeMaxIn.value) : 30000,
    autoCodeMaxOut: elements.autocodeMaxOut ? parseInt(elements.autocodeMaxOut.value) : 4000,
    autoCodeCacheTokens: elements.autocodeCacheTokens ? elements.autocodeCacheTokens.checked : true,
    autoCodeMinifyCode: elements.autocodeMinifyCode ? elements.autocodeMinifyCode.checked : true,
    autoCodeCompressShots: elements.autocodeCompressShots ? elements.autocodeCompressShots.checked : true,
    autoCodeEnableShots: elements.autocodeEnableShots ? elements.autocodeEnableShots.checked : false,
    autoCodeMaxShots: elements.autocodeMaxShots ? parseInt(elements.autocodeMaxShots.value) : 2,
    autoCodeCaptureOnPlay: elements.autocodeCaptureOnPlay ? elements.autocodeCaptureOnPlay.checked : false
  };
  localStorage.setItem('ai_debugger_settings', JSON.stringify(settings));

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write settings to config.json", e);
  }

  agentBrain.updateConfig({
    provider: settings.provider,
    apiKey: settings.apiKey,
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

module.exports = {
  modelsByProvider,
  populateModelsDropdown,
  handleProviderChange,
  loadConfig,
  saveConfig
};
