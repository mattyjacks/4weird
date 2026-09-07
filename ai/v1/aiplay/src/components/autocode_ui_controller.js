/**
 * AutoCode IDE Section Event Handlers and UI Controller
 */

function setupAutoCodeEventListeners({
  el,
  sourceFiles,
  autoCodeSystem,
  audio,
  toastNotifier,
  logSystemMessage,
  saveConfigData,
  crawlFiles,
  renderShotsPreview,
  captureManualScreenshot
}) {
  if (el.autocodeFileSelect) {
    el.autocodeFileSelect.addEventListener('change', () => loadAutoCodeFileContent({ el, sourceFiles }));
  }
  if (el.autocodePromptInput) {
    el.autocodePromptInput.addEventListener('input', () => estimateAutoCodeCosts({ el }));
  }
  if (el.btnVibeCode) {
    el.btnVibeCode.addEventListener('click', () => triggerAutoCodeVibe({
      el,
      sourceFiles,
      autoCodeSystem,
      audio,
      toastNotifier,
      logSystemMessage
    }));
  }
  if (el.btnDiscardChanges) {
    el.btnDiscardChanges.addEventListener('click', () => {
      audio.playClickSound();
      el.autocodeDiffSection.classList.add('hidden');
      logSystemMessage("Proposed code changes discarded.");
    });
  }
  if (el.btnApplyChanges) {
    el.btnApplyChanges.addEventListener('click', () => applyAutoCodeChanges({
      el,
      autoCodeSystem,
      audio,
      toastNotifier,
      logSystemMessage,
      crawlFiles
    }));
  }
  if (el.autocodeEnableShots) {
    el.autocodeEnableShots.addEventListener('change', () => {
      const controlsRow = document.querySelector('.screenshot-controls-row');
      if (el.autocodeEnableShots.checked) {
        controlsRow.classList.add('enabled');
        autoCodeSystem.updateConfig({ enableScreenshots: true });
      } else {
        controlsRow.classList.remove('enabled');
        autoCodeSystem.updateConfig({ enableScreenshots: false });
        autoCodeSystem.clearScreenshots();
        renderShotsPreview();
      }
      saveConfigData();
    });
  }
  if (el.autocodeMaxShots) {
    el.autocodeMaxShots.addEventListener('change', () => {
      autoCodeSystem.updateConfig({ maxScreenshots: parseInt(el.autocodeMaxShots.value) });
      saveConfigData();
    });
  }
  if (el.autocodeCaptureOnPlay) {
    el.autocodeCaptureOnPlay.addEventListener('change', () => {
      autoCodeSystem.updateConfig({ captureOnPlay: el.autocodeCaptureOnPlay.checked });
      saveConfigData();
    });
  }
  if (el.btnTriggerCapture) {
    el.btnTriggerCapture.addEventListener('click', captureManualScreenshot);
  }
}

function populateAutoCodeFileSelect(el, sourceFiles) {
  if (!el.autocodeFileSelect) return;
  const currentVal = el.autocodeFileSelect.value;
  el.autocodeFileSelect.innerHTML = '<option value="">-- Select File to Edit --</option>';
  sourceFiles.forEach(file => {
    const opt = document.createElement('option');
    opt.value = file.path;
    opt.textContent = file.path;
    el.autocodeFileSelect.appendChild(opt);
  });
  el.autocodeFileSelect.value = currentVal;
}

function loadAutoCodeFileContent({ el, sourceFiles }) {
  const filePath = el.autocodeFileSelect.value;
  if (!filePath) {
    el.autocodeEditorView.value = '';
    el.autocodeEditorView.setAttribute('readonly', 'true');
    return;
  }
  const file = sourceFiles.find(f => f.path === filePath);
  if (file) {
    el.autocodeEditorView.value = file.content;
    el.autocodeEditorView.removeAttribute('readonly');
    estimateAutoCodeCosts({ el });
  }
}

function estimateAutoCodeCosts({ el }) {
  const codeLen = el.autocodeEditorView.value ? el.autocodeEditorView.value.length : 0;
  const promptLen = el.autocodePromptInput.value.length;
  const totalChars = codeLen + promptLen + 1000;
  const estTokens = Math.ceil(totalChars / 4);
  const cost = estTokens * 0.0000015;
  el.autocodeCostVal.textContent = `$${cost.toFixed(4)}`;
}

async function triggerAutoCodeVibe({
  el,
  sourceFiles,
  autoCodeSystem,
  audio,
  toastNotifier,
  logSystemMessage
}) {
  const filePath = el.autocodeFileSelect.value;
  const prompt = el.autocodePromptInput.value.trim();
  if (!filePath || !prompt) {
    toastNotifier.show("Select a file and enter a prompt modification instruction first.", "warning");
    return;
  }

  audio.playClickSound();
  el.btnVibeCode.classList.add('btn-loading');
  logSystemMessage(`Initiating AutoCode modifications on "${filePath}"...`);

  try {
    const file = sourceFiles.find(f => f.path === filePath);
    const result = await autoCodeSystem.vibeCode(filePath, file.content, prompt);
    if (result.success) {
      logSystemMessage(`AutoCode modifications proposed successfully!`);
      renderAutoCodeDiff(el, result.diff);
      el.autocodeDiffSection.classList.remove('hidden');
    } else {
      logSystemMessage(`AutoCode failed: ${result.error}`, 'error');
      toastNotifier.show(result.error, "error");
    }
  } catch (err) {
    logSystemMessage(`AutoCode runtime exception: ${err.message}`, 'error');
  } finally {
    el.btnVibeCode.classList.remove('btn-loading');
  }
}

function renderAutoCodeDiff(el, diff) {
  el.autocodeDiffContainer.innerHTML = '';
  diff.forEach(line => {
    const div = document.createElement('div');
    if (line.type === 'add') {
      div.className = 'diff-add';
      div.textContent = `+ ${line.content}`;
    } else if (line.type === 'remove') {
      div.className = 'diff-remove';
      div.textContent = `- ${line.content}`;
    } else {
      div.className = 'diff-unchanged';
      div.textContent = `  ${line.content}`;
    }
    el.autocodeDiffContainer.appendChild(div);
  });
}

async function applyAutoCodeChanges({
  el,
  autoCodeSystem,
  audio,
  toastNotifier,
  logSystemMessage,
  crawlFiles
}) {
  const filePath = el.autocodeFileSelect.value;
  if (!filePath) return;

  audio.playClickSound();
  logSystemMessage(`Applying code changes directly to local source file: "${filePath}"...`);

  try {
    const success = await autoCodeSystem.applyChanges(filePath);
    if (success) {
      logSystemMessage(`File "${filePath}" successfully modified and saved to disk.`);
      toastNotifier.show("Changes applied successfully!", "success");
      el.autocodeDiffSection.classList.add('hidden');
      crawlFiles();
    } else {
      logSystemMessage(`Failed to apply changes to disk.`, 'error');
    }
  } catch (err) {
    logSystemMessage(`Error writing files: ${err.message}`, 'error');
  }
}

module.exports = {
  setupAutoCodeEventListeners,
  populateAutoCodeFileSelect,
  loadAutoCodeFileContent,
  estimateAutoCodeCosts,
  triggerAutoCodeVibe,
  renderAutoCodeDiff,
  applyAutoCodeChanges
};
