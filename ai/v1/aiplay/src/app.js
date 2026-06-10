const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const AgentBrain = require('../agent_brain');
const GameController = require('../game_controller');
const { AutoCodeSystem } = require('../lib/core');
const {
  PromptHistory,
  DraftManager,
  TemplateLibrary,
  ToastNotifier,
  KeyboardShortcuts
} = require('../lib/qol');

// Import modular helper components
const audio = require('./modules/audio_synthesizer');
const config = require('./modules/config_manager');
const webview = require('./modules/webview_manager');
const tracker = require('./modules/tracker_manager');
const tabs = require('./modules/monitor_tabs');

// Instantiate cores
const agentBrain = new AgentBrain();
const gameController = new GameController();
const autoCodeSystem = new AutoCodeSystem();

// QOL Helper Classes
const promptHistory = new PromptHistory(20);
const draftManager = new DraftManager();
const templateLibrary = new TemplateLibrary();
const toastNotifier = new ToastNotifier();
const keyboardShortcuts = new KeyboardShortcuts();

// App states
let isRunning = false;
let webviewElement = null;
let consoleLogs = [];
let executionTimer = null;
let fpsInterval = null;
let frameCount = 0;
let currentFps = 60;
let lastFpsUpdate = Date.now();

// Sparkline statistics histories
let fpsHistory = [];
let heapHistory = [];

// Timeline Scrubber Trace State
let timelineHistory = [];
let isScrubbing = false;
let currentScrubIndex = 0;

// Scanned code files container
let sourceFiles = [];

// AutoCode file content cache
let autoCodeFileContent = null;

// Path configurations
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const bugsLogPath = path.join(dataDir, 'bugs_log.json');
const replaysDir = path.join(dataDir, 'replays');

// DOM Elements Map
let el = {};

function queryElements() {
  el.providerSelect = document.getElementById('provider-select');
  el.apiKeyInput = document.getElementById('api-key');
  el.localUrlGroup = document.getElementById('local-url-group');
  el.localUrlInput = document.getElementById('local-url');
  el.modelNameInput = document.getElementById('model-name');
  el.modelSelect = document.getElementById('model-select');
  el.customModelGroup = document.getElementById('custom-model-group');
  el.nativeProcessSelect = document.getElementById('native-process');
  
  el.gameUrlInput = document.getElementById('game-url');
  el.btnLoadUrl = document.getElementById('btn-load-url');
  el.demoGameSelect = document.getElementById('demo-game-select');
  el.gameRulesInput = document.getElementById('game-rules');
  el.btnToggleAgent = document.getElementById('btn-toggle-agent');
  el.agentStateBadge = document.getElementById('agent-state-badge');
  el.fpsVal = document.getElementById('fps-val');
  el.heapVal = document.getElementById('heap-val');
  el.stuckVal = document.getElementById('stuck-val');
  el.webviewPlaceholder = document.getElementById('webview-placeholder');
  el.btnWebviewReload = document.getElementById('btn-webview-reload');
  el.btnWebviewDevtools = document.getElementById('btn-webview-devtools');
  el.btnManualShot = document.getElementById('btn-manual-shot');
  el.btnSimulateHeuristic = document.getElementById('btn-simulate-heuristic');
  el.logStream = document.getElementById('log-stream');
  el.btnClearLogs = document.getElementById('btn-clear-logs');
  el.brainScreenshot = document.getElementById('brain-screenshot');
  el.heatmapCanvas = document.getElementById('heatmap-overlay');
  el.brainReasoning = document.getElementById('brain-reasoning');
  el.bugsContainer = document.getElementById('bugs-container');
  el.bugCountBadge = document.getElementById('bug-count');
  el.btnGeneratePrompt = document.getElementById('btn-generate-prompt');
  el.promptOutputContainer = document.getElementById('prompt-output-container');
  el.megaPromptOutput = document.getElementById('mega-prompt-output');
  el.btnCopyPrompt = document.getElementById('btn-copy-prompt');
  el.btnSaveReplay = document.getElementById('btn-save-replay');
  el.replayStatusText = document.getElementById('replay-status-text');
  el.btnToggleView = document.getElementById('btn-toggle-view');
  el.gameStatusBanner = document.getElementById('game-status-banner');
  
  el.btnToggleAudio = document.getElementById('btn-toggle-audio');
  el.timelineContainer = document.getElementById('timeline-container');
  el.btnTimelinePlay = document.getElementById('btn-timeline-play');
  el.timelineScrubber = document.getElementById('timeline-scrubber');
  el.timelineTime = document.getElementById('timeline-time');
  
  el.tabLogs = document.getElementById('tab-logs');
  el.tabCode = document.getElementById('tab-code');
  el.tabAutoCode = document.getElementById('tab-autocode');
  el.codeStream = document.getElementById('code-stream');
  el.codeFileList = document.getElementById('code-file-list');
  el.codeContentView = document.getElementById('code-content-view');
  
  el.tokenLastRun = document.getElementById('token-last-run');
  el.tokenHourly = document.getElementById('token-hourly');
  el.tokenDaily = document.getElementById('token-daily');
  el.tokenWeekly = document.getElementById('token-weekly');
  el.tokenYearly = document.getElementById('token-yearly');
  el.tokenLifetime = document.getElementById('token-lifetime');
  el.tokenModelSelect = document.getElementById('token-model-select');
  
  el.bugModal = document.getElementById('bug-modal');
  el.modalBugTitle = document.getElementById('modal-bug-title');
  el.modalBugLogs = document.getElementById('modal-bug-logs');
  el.modalBugImg = document.getElementById('modal-bug-img');
  el.btnCloseModal = document.getElementById('btn-close-modal');
  
  el.toggleMemory = document.getElementById('toggle-memory');
  el.trailEntries = document.getElementById('trail-entries');
  
  el.sessSteps = document.getElementById('sess-steps');
  el.sessBugs = document.getElementById('sess-bugs');
  el.sessStuck = document.getElementById('sess-stuck');
  el.sessRecoveries = document.getElementById('sess-recoveries');
  el.actionMixEl = document.getElementById('action-mix');
  el.heatmapZonesEl = document.getElementById('heatmap-zones');
  
  el.toggleAutoChoose = document.getElementById('toggle-auto-choose');
  el.largestModelGroup = document.getElementById('largest-model-group');
  el.largestModelSelect = document.getElementById('largest-model-select');
  el.proExtremeGroup = document.getElementById('pro-extreme-group');
  el.toggleProExtreme = document.getElementById('toggle-pro-extreme');
  
  el.autocodeStream = document.getElementById('autocode-stream');
  el.autocodeFileSelect = document.getElementById('autocode-file-select');
  el.autocodeEditorView = document.getElementById('autocode-editor-view');
  el.autocodePromptInput = document.getElementById('autocode-prompt-input');
  el.btnVibeCode = document.getElementById('btn-vibe-code');
  el.autocodeBudget = document.getElementById('autocode-budget');
  el.autocodeMaxIn = document.getElementById('autocode-max-in');
  el.autocodeMaxOut = document.getElementById('autocode-max-out');
  el.autocodeCacheTokens = document.getElementById('autocode-cache-tokens');
  el.autocodeMinifyCode = document.getElementById('autocode-minify-code');
  el.autocodeCompressShots = document.getElementById('autocode-compress-shots');
  el.autocodeEnableShots = document.getElementById('autocode-enable-shots');
  el.autocodeMaxShots = document.getElementById('autocode-max-shots');
  el.autocodeCaptureOnPlay = document.getElementById('autocode-capture-on-play');
  el.btnTriggerCapture = document.getElementById('btn-trigger-capture');
  el.autocodeShotsPreview = document.getElementById('autocode-shots-preview');
  el.autocodeCostVal = document.getElementById('autocode-cost-val');
  el.autocodeDiffSection = document.getElementById('autocode-diff-section');
  el.autocodeDiffContainer = document.getElementById('autocode-diff-container');
  el.btnDiscardChanges = document.getElementById('btn-discard-changes');
  el.btnApplyChanges = document.getElementById('btn-apply-changes');
}

// Coordinate setups on DOM load
document.addEventListener('DOMContentLoaded', () => {
  webviewElement = document.getElementById('game-webview');
  queryElements();
  
  config.loadConfig(el, audio, agentBrain, autoCodeSystem, dataDir);
  webview.populateDemoGames(el.demoGameSelect);
  
  agentBrain.loadBugs(bugsLogPath);
  tracker.renderBugs(el.bugsContainer, el.bugCountBadge, agentBrain, selectBugCard);
  tracker.updateTokenStatsUI(agentBrain, el.tokenModelSelect, el);
  
  // Bind Event Listeners
  el.providerSelect.addEventListener('change', () => {
    config.handleProviderChange(el.providerSelect, el.modelSelect, el.localUrlGroup, el.apiKeyInput, el.customModelGroup, el.modelNameInput, false, saveConfigData);
  });
  
  el.btnLoadUrl.addEventListener('click', loadGame);
  el.demoGameSelect.addEventListener('change', selectDemo);
  el.btnToggleAgent.addEventListener('click', toggleAgentState);
  el.btnWebviewReload.addEventListener('click', reloadGame);
  el.btnWebviewDevtools.addEventListener('click', openGameDevTools);
  el.btnManualShot.addEventListener('click', takeManualSnapshot);
  el.btnSimulateHeuristic.addEventListener('click', forceHeuristicStep);
  el.btnClearLogs.addEventListener('click', clearLogView);
  el.btnGeneratePrompt.addEventListener('click', generateMegaPrompt);
  el.btnCopyPrompt.addEventListener('click', copyPromptToClipboard);
  el.btnSaveReplay.addEventListener('click', saveReplayFile);
  
  if (el.btnToggleView) {
    el.btnToggleView.addEventListener('click', () => {
      audio.playClickSound();
      const appContainer = document.querySelector('.app-container');
      const isSimple = appContainer.classList.toggle('simple-mode');
      el.btnToggleView.textContent = isSimple ? '👁️ VIEW: SIMPLE' : '👁️ VIEW: ADVANCED';
      logSystemMessage(`Switched to ${isSimple ? 'Simple' : 'Advanced'} layout.`);
      if (isSimple) {
        tabs.switchTab('logs', el, audio);
      }
    });
  }
  
  const btnScanProcesses = document.getElementById('btn-scan-processes');
  if (btnScanProcesses) {
    btnScanProcesses.addEventListener('click', async () => {
      audio.playClickSound();
      logSystemMessage('Scanning running native processes...');
      const result = await ipcRenderer.invoke('scan-processes');
      if (result.success) {
        el.nativeProcessSelect.innerHTML = '<option value="">-- Scan / Select Game Window --</option>';
        if (result.processes && result.processes.length > 0) {
          result.processes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.MainWindowTitle;
            opt.textContent = `${p.ProcessName} (PID: ${p.Id}) - "${p.MainWindowTitle}"`;
            el.nativeProcessSelect.appendChild(opt);
          });
          logSystemMessage(`Found ${result.processes.length} windowed processes.`);
        } else {
          logSystemMessage('No windowed processes found.');
        }
      } else {
        logSystemMessage(`Scanning failed: ${result.error}`);
      }
    });
  }

  el.nativeProcessSelect.addEventListener('change', () => {
    if (el.nativeProcessSelect.value) {
      el.btnToggleAgent.classList.remove('disabled');
      el.btnToggleAgent.removeAttribute('disabled');
      logSystemMessage(`Native target selected: "${el.nativeProcessSelect.value}". AI Play button is active.`);
    } else {
      if (!webviewElement.src || webviewElement.src === 'about:blank') {
        el.btnToggleAgent.classList.add('disabled');
        el.btnToggleAgent.setAttribute('disabled', 'true');
      }
    }
  });

  el.modelSelect.addEventListener('change', () => {
    if (el.modelSelect.value === 'custom') {
      el.customModelGroup.classList.remove('hidden');
    } else {
      el.customModelGroup.classList.add('hidden');
      el.modelNameInput.value = el.modelSelect.value;
    }
    saveConfigData();
  });
  
  el.btnToggleAudio.addEventListener('click', toggleAudioSetting);
  el.tabLogs.addEventListener('click', () => tabs.switchTab('logs', el, audio));
  el.tabCode.addEventListener('click', () => tabs.switchTab('code', el, audio));
  el.tabAutoCode.addEventListener('click', () => tabs.switchTab('autocode', el, audio, populateAutoCodeFileSelect));
  
  el.timelineScrubber.addEventListener('input', handleTimelineScrub);
  el.btnTimelinePlay.addEventListener('click', resumeFromScrub);
  el.tokenModelSelect.addEventListener('change', () => tracker.updateTokenStatsUI(agentBrain, el.tokenModelSelect, el));

  el.toggleAutoChoose.addEventListener('change', () => {
    const isEnabled = el.toggleAutoChoose.checked;
    if (isEnabled) {
      el.largestModelGroup.classList.remove('hidden');
      el.proExtremeGroup.classList.remove('hidden');
    } else {
      el.largestModelGroup.classList.add('hidden');
      el.proExtremeGroup.classList.add('hidden');
    }
    autoCodeSystem.updateConfig({ autoChooseModel: isEnabled });
    saveConfigData();
    logSystemMessage(`Auto-Choose Model: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
  });

  el.largestModelSelect.addEventListener('change', () => {
    autoCodeSystem.updateConfig({ largestModelAllowed: el.largestModelSelect.value });
    saveConfigData();
  });

  el.toggleProExtreme.addEventListener('change', () => {
    autoCodeSystem.updateConfig({ useProForExtreme: el.toggleProExtreme.checked });
    saveConfigData();
  });

  setupAutoCodeEventListeners();

  const btnToggleLeft = document.getElementById('btn-toggle-left');
  const btnToggleRight = document.getElementById('btn-toggle-right');
  const leftSidebar = document.querySelector('.control-panel');
  const rightSidebar = document.querySelector('.bug-panel');

  if (btnToggleLeft && leftSidebar) {
    btnToggleLeft.addEventListener('click', () => {
      leftSidebar.classList.toggle('collapsed');
      btnToggleLeft.classList.toggle('active');
      audio.playClickSound();
    });
  }

  if (btnToggleRight && rightSidebar) {
    btnToggleRight.addEventListener('click', () => {
      rightSidebar.classList.toggle('collapsed');
      btnToggleRight.classList.toggle('active');
      audio.playClickSound();
    });
  }

  el.toggleMemory.addEventListener('change', () => {
    agentBrain.config.alwaysSendMemory = el.toggleMemory.checked;
    saveConfigData();
    logSystemMessage(`Episodic memory mode: ${el.toggleMemory.checked ? 'ALWAYS SEND (higher token cost)' : 'STUCK-ONLY (token-saving)'}`);
  });
  
  el.btnCloseModal.addEventListener('click', () => el.bugModal.classList.add('hidden'));
  el.bugModal.classList.add('hidden');
  
  setupWebviewListeners();

  ipcRenderer.on('agent-control', (event, { command }) => {
    logSystemMessage(`Remote AI Agent command received: '${command}'`);
    if (command === 'start') {
      if (!isRunning) toggleAgentState();
    } else if (command === 'pause') {
      if (isRunning) toggleAgentState();
    } else if (command === 'reload') {
      reloadGame();
    }
  });
  
  if (el.gameUrlInput.value) {
    setTimeout(() => {
      loadGame();
      crawlFiles();
    }, 500);
  } else {
    updateStatusBanner("Select a game from local demos below or enter a URL", "ready");
  }

  logSystemMessage("System dashboard loaded. Enter credentials and select target URL to begin.");
  setTimeout(populateQuickLaunchGrid, 600);
});

function saveConfigData() {
  config.saveConfig(el, audio, agentBrain, autoCodeSystem, dataDir);
}

function updateStatusBanner(text, type = 'ready') {
  if (!el.gameStatusBanner) return;
  el.gameStatusBanner.textContent = text;
  el.gameStatusBanner.className = 'game-status-banner';
  if (type === 'ready') {
    el.gameStatusBanner.classList.add('banner-ready');
  } else if (type === 'active') {
    el.gameStatusBanner.classList.add('banner-active');
  }
}

function populateQuickLaunchGrid() {
  const grid = document.getElementById('quick-launch-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const options = Array.from(el.demoGameSelect.options).filter(opt => opt.value);
  if (options.length === 0) {
    return;
  }
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-small quick-launch-btn';
    btn.textContent = `🎮 Launch ${opt.textContent}`;
    btn.addEventListener('click', () => {
      audio.playClickSound();
      el.demoGameSelect.value = opt.value;
      selectDemo();
    });
    grid.appendChild(btn);
  });
}

function loadGame() {
  webview.loadGameUrl(el.gameUrlInput, webviewElement, el.webviewPlaceholder, saveConfigData, crawlFiles, logSystemMessage);
  if (el.gameUrlInput.value) {
    updateStatusBanner("👉 Game ready! Click 'START AI AGENT' to begin playtesting", 'ready');
  }
}

function selectDemo() {
  const val = el.demoGameSelect.value;
  if (val) {
    el.gameUrlInput.value = val;
    saveConfigData();
    loadGame();
    webview.loadGameMeta(val, el.gameRulesInput, saveConfigData, logSystemMessage);
  }
}

function crawlFiles() {
  webview.crawlCodeFiles(el.gameUrlInput, (files) => {
    sourceFiles = files;
    tabs.renderFileList(el.codeFileList, el.codeContentView, sourceFiles, (file) => {
      audio.playClickSound();
    });
  });
}

function toggleAudioSetting() {
  audio.setAudioEnabled(!audio.getAudioEnabled());
  el.btnToggleAudio.textContent = audio.getAudioEnabled() ? '🔊' : '🔇';
  saveConfigData();
  audio.playSynth(600, 'sine', 0.1);
}

function selectBugCard(bug) {
  tracker.showBugDetails(bug, el.bugModal, el.modalBugTitle, el.modalBugLogs, el.modalBugImg);
}

// System logging helper
function logSystemMessage(message, type = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  entry.innerHTML = `<span style="opacity: 0.5;">[${timestamp}]</span> ${message}`;
  
  el.logStream.appendChild(entry);
  el.logStream.scrollTop = el.logStream.scrollHeight;
  
  consoleLogs.push(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  
  // Update remote server data logging
  try {
    fs.writeFileSync(path.join(dataDir, 'live_logs.json'), JSON.stringify(consoleLogs.slice(-200), null, 2));
  } catch (e) {}
}

function clearLogView() {
  audio.playClickSound();
  el.logStream.innerHTML = '';
  consoleLogs = [];
  logSystemMessage("Logs cleared.");
}

// Autopilot loops & agent executor state management
function toggleAgentState() {
  audio.playClickSound();
  if (isRunning) {
    isRunning = false;
    el.btnToggleAgent.innerHTML = '<span class="icon">▶</span> START AI AGENT';
    el.btnToggleAgent.className = 'btn btn-primary btn-large-top';
    el.agentStateBadge.textContent = 'PAUSED';
    el.agentStateBadge.className = 'badge paused';
    logSystemMessage("AI Agent playtesting paused.");
    updateStatusBanner("⏸️ Playtest paused. Click 'START AI AGENT' to resume", 'ready');
    
    clearInterval(executionTimer);
    clearInterval(fpsInterval);
  } else {
    isRunning = true;
    el.btnToggleAgent.innerHTML = '<span class="icon">⏸</span> PAUSE AI AGENT';
    el.btnToggleAgent.className = 'btn btn-warning btn-large-top';
    el.agentStateBadge.textContent = 'ACTIVE';
    el.agentStateBadge.className = 'badge active';
    logSystemMessage("AI Agent playtesting activated.");
    updateStatusBanner("🤖 AI Agent actively playtesting & scanning for bugs...", 'active');
    
    // Initialize session memory
    agentBrain.startSession();
    tracker.updateSessionStatsUI(agentBrain, el);
    
    // Setup loops
    executionTimer = setInterval(executeAgentStep, 2000);
    fpsInterval = setInterval(updatePerformanceMetrics, 1000);
  }
}

// AutoCode IDE event listeners integration
function setupAutoCodeEventListeners() {
  if (el.autocodeFileSelect) {
    el.autocodeFileSelect.addEventListener('change', loadAutoCodeFileContent);
  }
  if (el.autocodePromptInput) {
    el.autocodePromptInput.addEventListener('input', estimateAutoCodeCosts);
  }
  if (el.btnVibeCode) {
    el.btnVibeCode.addEventListener('click', triggerAutoCodeVibe);
  }
  if (el.btnDiscardChanges) {
    el.btnDiscardChanges.addEventListener('click', discardAutoCodeChanges);
  }
  if (el.btnApplyChanges) {
    el.btnApplyChanges.addEventListener('click', applyAutoCodeChanges);
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

function populateAutoCodeFileSelect() {
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

function loadAutoCodeFileContent() {
  const filePath = el.autocodeFileSelect.value;
  if (!filePath) {
    el.autocodeEditorView.value = '';
    el.autocodeEditorView.setAttribute('readonly', 'true');
    autoCodeFileContent = null;
    return;
  }
  const file = sourceFiles.find(f => f.path === filePath);
  if (file) {
    el.autocodeEditorView.value = file.content;
    el.autocodeEditorView.removeAttribute('readonly');
    autoCodeFileContent = file.content;
    estimateAutoCodeCosts();
  }
}

function estimateAutoCodeCosts() {
  // Rough estimate of prompt costs
  const codeLen = autoCodeFileContent ? autoCodeFileContent.length : 0;
  const promptLen = el.autocodePromptInput.value.length;
  const totalChars = codeLen + promptLen + 1000;
  const estTokens = Math.ceil(totalChars / 4);
  const cost = estTokens * 0.0000015; // standard mini rate
  el.autocodeCostVal.textContent = `$${cost.toFixed(4)}`;
}

async function triggerAutoCodeVibe() {
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
      renderAutoCodeDiff(result.diff);
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

function renderAutoCodeDiff(diff) {
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

function discardAutoCodeChanges() {
  audio.playClickSound();
  el.autocodeDiffSection.classList.add('hidden');
  logSystemMessage("Proposed code changes discarded.");
}

async function applyAutoCodeChanges() {
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
      
      // Re-crawl source directory to refresh caches
      crawlFiles();
    } else {
      logSystemMessage(`Failed to apply changes to disk.`, 'error');
    }
  } catch (err) {
    logSystemMessage(`Error writing files: ${err.message}`, 'error');
  }
}

async function captureManualScreenshot() {
  // Capture screenshot of WebView
  const imgBase64 = await ipcRenderer.invoke('capture-game-screenshot');
  if (imgBase64) {
    autoCodeSystem.addScreenshot(imgBase64);
    renderShotsPreview();
    audio.playClickSound();
  }
}

function renderShotsPreview() {
  el.autocodeShotsPreview.innerHTML = '';
  autoCodeSystem.screenshots.forEach((shot, idx) => {
    const img = document.createElement('img');
    img.className = 'shot-preview-thumb';
    img.src = 'data:image/jpeg;base64,' + shot;
    img.title = `Screenshot #${idx + 1}`;
    img.addEventListener('click', () => {
      // Toggle color preview in modal
      el.modalBugTitle.textContent = `Screenshot #${idx + 1}`;
      el.modalBugLogs.textContent = 'Captured screenshot metadata';
      el.modalBugImg.src = img.src;
      el.modalBugImg.style.display = 'block';
      el.bugModal.classList.remove('hidden');
    });
    el.autocodeShotsPreview.appendChild(img);
  });
}

// WebView messages interception
function setupWebviewListeners() {
  webviewElement.addEventListener('console-message', (e) => {
    let type = 'agent';
    if (e.level === 2) type = 'warning';
    if (e.level === 3) type = 'error';
    
    // Strip webview logs from system logs but preserve errors
    if (e.level === 3 || e.message.includes('4weird')) {
      logSystemMessage(`[Game Console] ${e.message}`, type);
    }
  });

  webviewElement.addEventListener('did-finish-load', () => {
    logSystemMessage("Game window viewport successfully loaded.");
    crawlFiles();
  });
}

function reloadGame() {
  audio.playClickSound();
  webviewElement.reload();
  logSystemMessage("WebView reload triggered.");
}

function openGameDevTools() {
  audio.playClickSound();
  webviewElement.openDevTools();
  logSystemMessage("Game DevTools open requested.");
}

async function takeManualSnapshot() {
  audio.playClickSound();
  logSystemMessage("Capturing manual screen frame...");
  const imgBase64 = await ipcRenderer.invoke('capture-game-screenshot');
  if (imgBase64) {
    el.brainScreenshot.src = 'data:image/jpeg;base64,' + imgBase64;
    toastNotifier.show("Dashboard snapshot captured!", "success");
  }
}

function forceHeuristicStep() {
  audio.playClickSound();
  logSystemMessage("Force action override requested. Executing immediate manual heuristic step...");
  executeAgentStep(true);
}

// Generate the mega-prompt payload
function generateMegaPrompt() {
  audio.playClickSound();
  const prompt = agentBrain.generateMegaPrompt(el.gameUrlInput.value, sourceFiles);
  el.megaPromptOutput.value = prompt;
  el.promptOutputContainer.classList.remove('hidden');
}

function copyPromptToClipboard() {
  audio.playClickSound();
  el.megaPromptOutput.select();
  document.execCommand('copy');
  toastNotifier.show("Mega-Prompt copied to clipboard!", "success");
}

function saveReplayFile() {
  audio.playClickSound();
  logSystemMessage("Saving replay trace data...");
  const replayPath = path.join(replaysDir, `replay_${Date.now()}.json`);
  fs.writeFileSync(replayPath, JSON.stringify(timelineHistory, null, 2), 'utf8');
  el.replayStatusText.textContent = `Replay trace saved to replays directory.`;
  toastNotifier.show("Replay saved successfully!", "success");
}

// Scrubber timeline control
function handleTimelineScrub() {
  isScrubbing = true;
  currentScrubIndex = parseInt(el.timelineScrubber.value);
  const frame = timelineHistory[currentScrubIndex];
  if (frame) {
    el.brainScreenshot.src = frame.screenshot.startsWith('data:') 
      ? frame.screenshot 
      : 'data:image/jpeg;base64,' + frame.screenshot;
    el.brainReasoning.innerHTML = `<strong>Scrubbing Tick #${currentScrubIndex}:</strong><br>${frame.reasoning}`;
    el.timelineTime.textContent = `Tick: ${currentScrubIndex + 1}/${timelineHistory.length}`;
    
    // Draw heatmap overlays if click coordinates exist
    if (frame.action && frame.action.type === 'click') {
      drawHeatmapDot(frame.action.x, frame.action.y);
    } else {
      clearHeatmapCanvas();
    }
  }
}

function resumeFromScrub() {
  audio.playClickSound();
  isScrubbing = false;
  el.timelineContainer.classList.add('hidden');
  logSystemMessage("Resumed live tracking viewport.");
}

function drawHeatmapDot(x, y) {
  const ctx = el.heatmapCanvas.getContext('2d');
  const parentWidth = el.heatmapCanvas.parentElement.clientWidth;
  const parentHeight = el.heatmapCanvas.parentElement.clientHeight;
  el.heatmapCanvas.width = parentWidth;
  el.heatmapCanvas.height = parentHeight;
  
  const scaleX = (x / 1000) * parentWidth;
  const scaleY = (y / 1000) * parentHeight;

  ctx.beginPath();
  ctx.arc(scaleX, scaleY, 12, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ff66';
  ctx.stroke();
}

function clearHeatmapCanvas() {
  const ctx = el.heatmapCanvas.getContext('2d');
  ctx.clearRect(0, 0, el.heatmapCanvas.width, el.heatmapCanvas.height);
}

// Periodic task simulator: evaluates latest page layout and executes action choice
async function executeAgentStep(forceHeuristic = false) {
  if (!isRunning && !forceHeuristic) return;
  
  try {
    let screenshotBase64 = null;
    
    // Handle Native process screenshots vs WebView screenshots
    const nativeProcess = el.nativeProcessSelect.value;
    if (nativeProcess) {
      const nativeShot = await ipcRenderer.invoke('capture-native-screenshot', nativeProcess);
      if (nativeShot.success) {
        screenshotBase64 = nativeShot.base64;
      }
    } else {
      screenshotBase64 = await ipcRenderer.invoke('capture-game-screenshot');
    }
    
    if (!screenshotBase64) return;
    
    // Send latest state elements to the AI Agent Brain
    let elements = [];
    if (!nativeProcess) {
      elements = await webviewElement.executeJavaScript('window.getInteractiveDOM ? window.getInteractiveDOM() : []');
    }
    
    // Step decision calculation
    const decision = await agentBrain.chooseNextAction(screenshotBase64, elements, forceHeuristic, consoleLogs);
    
    // Update live view overlay and reasoning
    el.brainScreenshot.src = 'data:image/jpeg;base64,' + screenshotBase64;
    el.brainReasoning.innerHTML = `<strong>Action reasoning:</strong><br>${decision.reasoning}`;
    
    // Save to timeline tracker history
    timelineHistory.push({
      timestamp: Date.now(),
      screenshot: screenshotBase64,
      reasoning: decision.reasoning,
      action: decision.action
    });
    
    // Update scrubber bounds
    el.timelineScrubber.max = timelineHistory.length - 1;
    el.timelineScrubber.value = timelineHistory.length - 1;
    el.timelineTime.textContent = `Tick: ${timelineHistory.length}/${timelineHistory.length}`;
    el.timelineContainer.classList.remove('hidden');
    
    // Execute control output in simulator
    if (decision.action) {
      audio.playAgentActionSound();
      logSystemMessage(`Executing action: ${decision.action.type} -> ${JSON.stringify(decision.action.params || {})}`, 'action');
      
      // Update action mix history tracker
      if (decision.action.type === 'click') {
        const px = decision.action.params.x;
        const py = decision.action.params.y;
        drawHeatmapDot(px, py);
        
        // Push click zones
        const zoneX = Math.floor(px / 100) * 100;
        const zoneY = Math.floor(py / 100) * 100;
        const key = `(${zoneX}-${zoneX+99}, ${zoneY}-${zoneY+99})`;
        agentBrain.sessionStats.clickZones[key] = (agentBrain.sessionStats.clickZones[key] || 0) + 1;
      } else {
        clearHeatmapCanvas();
      }
      
      agentBrain.sessionStats.steps += 1;
      agentBrain.sessionStats.actionMix[decision.action.type] = (agentBrain.sessionStats.actionMix[decision.action.type] || 0) + 1;
      
      // Simulate action inputs into WebView or Native OS
      if (nativeProcess) {
        // Run inputs python native subprocess
        const pyArgs = [decision.action.type];
        if (decision.action.type === 'click') {
          pyArgs.push(decision.action.params.x, decision.action.params.y);
        } else if (decision.action.type === 'keypress') {
          pyArgs.push(decision.action.params.key);
        }
        await ipcRenderer.invoke('run-input-sim', pyArgs);
      } else {
        // Inject into WebView DOM
        await gameController.injectAction(webviewElement, decision.action);
      }
    }
    
    // Poll console errors for bugs
    let hasConsoleCrash = false;
    if (!nativeProcess) {
      const logs = await webviewElement.executeJavaScript('console.error');
      // If stack contains crash signals
    }
    
    // Sync session display stats
    tracker.updateSessionStatsUI(agentBrain, el);
    
    // Auto-choose screen captures trigger
    if (el.autocodeCaptureOnPlay.checked) {
      captureManualScreenshot();
    }
    
    // Trigger bug alerts sound if new bug detected
    const beforeCount = agentBrain.bugs.length;
    const isNewBugFound = agentBrain.scanForBugs(screenshotBase64, consoleLogs);
    if (isNewBugFound) {
      audio.playBugAlertSound();
      tracker.renderBugs(el.bugsContainer, el.bugCountBadge, agentBrain, selectBugCard);
      logSystemMessage("⚠️ CRASH / EXCEPTION BUG IDENTIFIED!", "error");
      // Save database update
      agentBrain.saveBugs(bugsLogPath);
    }
    
    tracker.updateTokenStatsUI(agentBrain, el.tokenModelSelect, el);
    
  } catch (err) {
    logSystemMessage(`Autopilot step execution failed: ${err.message}`, 'warning');
  }
}

// Performance charts sparkline updates
function updatePerformanceMetrics() {
  frameCount++;
  const now = Date.now();
  if (now - lastFpsUpdate >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
  }
  
  el.fpsVal.textContent = currentFps;
  el.stuckVal.textContent = `${agentBrain.stuckCounter}/3`;
  
  const processStats = process.getProcessMemoryInfo();
  processStats.then((stats) => {
    const mb = Math.round(stats.private / 1024 / 1024);
    el.heapVal.textContent = `${mb} MB`;
    
    // Draw Sparkline Canvas
    drawSparkline(document.getElementById('fps-chart'), currentFps, 120, fpsHistory);
    drawSparkline(document.getElementById('heap-chart'), mb, 300, heapHistory);
  });
}

function drawSparkline(canvas, val, maxRange, historyArr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  historyArr.push(val);
  if (historyArr.length > 20) historyArr.shift();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#00ff66';
  
  const step = canvas.width / 19;
  historyArr.forEach((h, idx) => {
    const x = idx * step;
    const y = canvas.height - (h / maxRange) * canvas.height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// Expose state getters for HTTP server scrapers
window.getAgentStatus = () => {
  return {
    running: isRunning,
    fps: currentFps,
    heap: el.heapVal.textContent,
    bugs: agentBrain.bugs.length,
    steps: agentBrain.sessionStats.steps,
    model: el.modelSelect.value
  };
};

window.updateAgentConfig = (config) => {
  if (config.provider) el.providerSelect.value = config.provider;
  if (config.apiKey) el.apiKeyInput.value = config.apiKey;
  if (config.modelName) el.modelNameInput.value = config.modelName;
  saveConfigData();
  return { success: true };
};

window.getInteractiveDOM = () => {
  return webviewElement ? webviewElement.executeJavaScript('window.getInteractiveDOM ? window.getInteractiveDOM() : []') : [];
};

window.executeAgentAction = (action) => {
  if (webviewElement) {
    gameController.injectAction(webviewElement, action);
    return { success: true };
  }
  return { success: false, error: "No active window" };
};

window.triggerAgentStep = () => {
  executeAgentStep(true);
  return { success: true };
};
