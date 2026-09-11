/**
 * Dashboard "Local models (Ollama)" panel controller.
 *
 * Lets the user (1) see Ollama install/server status, (2) install or start
 * Ollama, (3) pick which installed model serves each orchestration role
 * (agent / vision / coder / reasoner), and (4) pull new model tags.
 * Everything persists into config/default.json `localModels` via the normal
 * saveConfig path. All IPC is guarded — the panel degrades to static inputs
 * when the main process does not expose the ollama channels (e.g. tests).
 */

function getIpc() {
  try {
    const { ipcRenderer } = require('electron');
    return ipcRenderer;
  } catch (_) {
    return null;
  }
}

function setPill(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind || '';
}

function collectOllamaElements(el) {
  el.ollamaStatusPill = document.getElementById('ollama-status-pill');
  el.btnOllamaStatus = document.getElementById('btn-ollama-status');
  el.btnOllamaInstall = document.getElementById('btn-ollama-install');
  el.btnOllamaStart = document.getElementById('btn-ollama-start');
  el.ollamaUrlInput = document.getElementById('ollama-url');
  el.ollamaAutoStart = document.getElementById('ollama-auto-start');
  el.ollamaPullName = document.getElementById('ollama-pull-name');
  el.btnOllamaPull = document.getElementById('btn-ollama-pull');
  el.ollamaPullStatus = document.getElementById('ollama-pull-status');
  el.ollamaInstalledModels = document.getElementById('ollama-installed-models');
  try {
    const { ROLE_NAMES } = require('../../lib/model_roles');
    for (const name of ROLE_NAMES) {
      el[`roleProvider_${name}`] = document.getElementById(`role-provider-${name}`);
      el[`roleModel_${name}`] = document.getElementById(`role-model-${name}`);
    }
  } catch (_) { /* role inputs stay undefined; config still loads */ }
  return el;
}

/** Apply persisted localModels settings to the panel controls (called by config load). */
function applyLocalModelsSettings(el, settings) {
  try {
    const { normalizeLocalModels, ROLE_NAMES, suggestedTags } = require('../../lib/model_roles');
    const block = normalizeLocalModels(settings && settings.localModels);
    if (el.ollamaUrlInput === undefined) collectOllamaElements(el);
    if (el.ollamaUrlInput) el.ollamaUrlInput.value = block.ollamaUrl;
    if (el.ollamaAutoStart) el.ollamaAutoStart.checked = block.autoStart !== false;
    for (const name of ROLE_NAMES) {
      const providerEl = el[`roleProvider_${name}`];
      const modelEl = el[`roleModel_${name}`];
      if (providerEl) providerEl.value = (block.roles[name] && block.roles[name].provider) || 'local';
      if (modelEl) {
        modelEl.value = (block.roles[name] && block.roles[name].model) || '';
        const listId = modelEl.getAttribute && modelEl.getAttribute('list');
        const listEl = listId && document.getElementById(listId);
        if (listEl) {
          listEl.innerHTML = '';
          for (const tag of suggestedTags(name)) {
            const opt = document.createElement('option');
            opt.value = tag;
            listEl.appendChild(opt);
          }
        }
      }
    }
  } catch (e) { /* defaults stand */ }
}

async function refreshOllamaStatus({ el, logSystemMessage }) {
  const ipc = getIpc();
  if (!ipc) {
    setPill(el.ollamaStatusPill, 'IPC unavailable', 'err');
    return { success: false, error: 'ipc unavailable' };
  }
  setPill(el.ollamaStatusPill, 'Checking…', '');
  try {
    const res = await ipc.invoke('ollama-status');
    if (!res) throw new Error('empty status response');
    if (res.server) {
      const n = (res.models || []).length;
      setPill(el.ollamaStatusPill, `Ready — ${n} model${n === 1 ? '' : 's'}`, 'ok');
    } else if (res.installed) {
      setPill(el.ollamaStatusPill, 'Installed — server stopped', 'warn');
    } else {
      setPill(el.ollamaStatusPill, 'Not installed', 'err');
    }
    renderInstalledModels(el, res.models || []);
    return res;
  } catch (e) {
    setPill(el.ollamaStatusPill, 'Check failed', 'err');
    if (logSystemMessage) logSystemMessage('Ollama status check failed: ' + e.message, 'error');
    return { success: false, error: e.message };
  }
}

function renderInstalledModels(el, models) {
  if (el.ollamaInstalledModels) {
    el.ollamaInstalledModels.textContent = models.length
      ? `Installed: ${models.join(', ')}`
      : 'No local models installed yet — pull one below.';
  }
  // Merge installed tags into each role's suggestion datalist (keeps starter hints).
  try {
    const { ROLE_NAMES, suggestedTags } = require('../../lib/model_roles');
    for (const name of ROLE_NAMES) {
      const modelEl = el[`roleModel_${name}`];
      const listId = modelEl && modelEl.getAttribute && modelEl.getAttribute('list');
      const listEl = listId && document.getElementById(listId);
      if (!listEl) continue;
      const seen = new Set();
      listEl.innerHTML = '';
      for (const tag of [...suggestedTags(name), ...models]) {
        if (seen.has(tag)) continue;
        seen.add(tag);
        const opt = document.createElement('option');
        opt.value = tag;
        listEl.appendChild(opt);
      }
    }
  } catch (_) { /* suggestions are best-effort */ }
}

async function handleInstall({ el, logSystemMessage }) {
  const ipc = getIpc();
  if (!ipc) return;
  const ok = window.confirm(
    'Install Ollama now?\n\nThis downloads ~700MB+ from ollama.com and installs it silently. Choose OK to continue.'
  );
  if (!ok) return;
  setPill(el.ollamaStatusPill, 'Installing…', '');
  if (logSystemMessage) logSystemMessage('Ollama install started (one-time download, may take several minutes)…');
  try {
    const res = await ipc.invoke('ollama-install');
    if (res && res.ok) {
      if (logSystemMessage) logSystemMessage('Ollama installed. Starting server…');
      await refreshOllamaStatus({ el, logSystemMessage });
    } else {
      setPill(el.ollamaStatusPill, 'Install failed', 'err');
      if (logSystemMessage) logSystemMessage('Ollama install failed: ' + ((res && res.error) || 'unknown error'), 'error');
      if (res && res.manual && logSystemMessage) logSystemMessage(res.manual, 'error');
    }
  } catch (e) {
    setPill(el.ollamaStatusPill, 'Install failed', 'err');
    if (logSystemMessage) logSystemMessage('Ollama install crashed: ' + e.message, 'error');
  }
}

async function handleStart({ el, logSystemMessage }) {
  const ipc = getIpc();
  if (!ipc) return;
  setPill(el.ollamaStatusPill, 'Starting…', '');
  try {
    const res = await ipc.invoke('ollama-start-server');
    if (res && res.ok) {
      if (logSystemMessage) logSystemMessage('Ollama server started.');
    } else if (logSystemMessage) {
      logSystemMessage('Ollama server did not start: ' + ((res && res.error) || 'unknown error'), 'error');
    }
    await refreshOllamaStatus({ el, logSystemMessage });
  } catch (e) {
    if (logSystemMessage) logSystemMessage('Ollama start crashed: ' + e.message, 'error');
    await refreshOllamaStatus({ el, logSystemMessage });
  }
}

async function handlePull({ el, logSystemMessage, saveConfigData }) {
  const ipc = getIpc();
  if (!ipc || !el.ollamaPullName) return;
  const name = el.ollamaPullName.value.trim();
  if (!name) {
    if (el.ollamaPullStatus) el.ollamaPullStatus.textContent = 'Type a model tag first (e.g. qwen3:8b).';
    return;
  }
  if (el.ollamaPullStatus) el.ollamaPullStatus.textContent = `Pulling ${name}… (large download, watch logs)`;
  if (logSystemMessage) logSystemMessage(`Pulling Ollama model ${name}…`);
  try {
    const res = await ipc.invoke('ollama-pull-model', name);
    if (res && res.ok) {
      if (el.ollamaPullStatus) el.ollamaPullStatus.textContent = `Installed: ${res.model || name}`;
      if (logSystemMessage) logSystemMessage(`Ollama model ready: ${res.model || name}`);
      await refreshOllamaStatus({ el, logSystemMessage });
      if (saveConfigData) saveConfigData();
    } else {
      if (el.ollamaPullStatus) el.ollamaPullStatus.textContent = `Pull failed: ${((res && res.error) || 'unknown error').slice(0, 160)}`;
      if (logSystemMessage) logSystemMessage(`Ollama pull failed: ${(res && res.error) || 'unknown error'}`, 'error');
    }
  } catch (e) {
    if (el.ollamaPullStatus) el.ollamaPullStatus.textContent = 'Pull crashed: ' + e.message;
    if (logSystemMessage) logSystemMessage('Ollama pull crashed: ' + e.message, 'error');
  }
}

function setupOllamaEventListeners({ el, logSystemMessage, saveConfigData }) {
  collectOllamaElements(el);
  if (el.btnOllamaStatus) el.btnOllamaStatus.addEventListener('click', () => refreshOllamaStatus({ el, logSystemMessage }));
  if (el.btnOllamaInstall) el.btnOllamaInstall.addEventListener('click', () => handleInstall({ el, logSystemMessage }));
  if (el.btnOllamaStart) el.btnOllamaStart.addEventListener('click', () => handleStart({ el, logSystemMessage }));
  if (el.btnOllamaPull) el.btnOllamaPull.addEventListener('click', () => handlePull({ el, logSystemMessage, saveConfigData }));
  try {
    const { ROLE_NAMES } = require('../../lib/model_roles');
    for (const name of ROLE_NAMES) {
      const providerEl = el[`roleProvider_${name}`];
      const modelEl = el[`roleModel_${name}`];
      if (providerEl) providerEl.addEventListener('change', () => { if (saveConfigData) saveConfigData(); });
      if (modelEl) modelEl.addEventListener('change', () => { if (saveConfigData) saveConfigData(); });
    }
  } catch (_) { /* role inputs optional */ }
  if (el.ollamaUrlInput) el.ollamaUrlInput.addEventListener('change', () => {
    if (saveConfigData) saveConfigData();
    refreshOllamaStatus({ el, logSystemMessage });
  });
  if (el.ollamaAutoStart) el.ollamaAutoStart.addEventListener('change', () => { if (saveConfigData) saveConfigData(); });
  // Initial status (non-blocking; Ollama missing must never break the dashboard).
  setTimeout(() => refreshOllamaStatus({ el, logSystemMessage }), 2000);
}

module.exports = {
  collectOllamaElements,
  applyLocalModelsSettings,
  refreshOllamaStatus,
  setupOllamaEventListeners,
};
