const fs = require('fs');
const path = require('path');
const { ipcRenderer, clipboard, shell } = require('electron');
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
const hub = require('./modules/hub_manager');

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
  el.btnOpenGameWindow = document.getElementById('btn-open-game-window');
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
  el.btnCopyAllLogs = document.getElementById('btn-copy-all-logs');
  el.btnCopy50Logs = document.getElementById('btn-copy-50-logs');
  
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

  // New token monitor elements with progress bars
  el.tokenInputCount = document.getElementById('token-input-count');
  el.tokenOutputCount = document.getElementById('token-output-count');
  el.tokenTotalCount = document.getElementById('token-total-count');
  el.tokenInputPercent = document.getElementById('token-input-percent');
  el.tokenOutputPercent = document.getElementById('token-output-percent');
  el.tokenTotalPercent = document.getElementById('token-total-percent');
  el.tokenInputBar = document.getElementById('token-input-bar');
  el.tokenOutputBar = document.getElementById('token-output-bar');
  el.tokenTotalBar = document.getElementById('token-total-bar');
  el.costEstimate = document.getElementById('cost-estimate');
  el.costBudget = document.getElementById('cost-budget');
  
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
  if (el.btnOpenGameWindow) {
    el.btnOpenGameWindow.addEventListener('click', openExternalGameWindow);
  }
  el.btnManualShot.addEventListener('click', takeManualSnapshot);
  el.btnSimulateHeuristic.addEventListener('click', forceHeuristicStep);
  el.btnClearLogs.addEventListener('click', clearLogView);
  el.btnGeneratePrompt.addEventListener('click', generateMegaPrompt);
  el.btnCopyPrompt.addEventListener('click', copyPromptToClipboard);
  el.btnSaveReplay.addEventListener('click', saveReplayFile);
  
  if (el.btnCopyAllLogs) {
    el.btnCopyAllLogs.addEventListener('click', () => {
      audio.playClickSound();
      if (consoleLogs.length === 0) {
        toastNotifier.show("No logs to copy.", "warning");
        return;
      }
      clipboard.writeText(consoleLogs.join('\n'));
      toastNotifier.show("All logs copied to clipboard!", "success");
    });
  }
  if (el.btnCopy50Logs) {
    el.btnCopy50Logs.addEventListener('click', () => {
      audio.playClickSound();
      if (consoleLogs.length === 0) {
        toastNotifier.show("No logs to copy.", "warning");
        return;
      }
      const last50 = consoleLogs.slice(-50);
      clipboard.writeText(last50.join('\n'));
      toastNotifier.show(`Last ${last50.length} log lines copied to clipboard!`, "success");
    });
  }
  
  if (el.btnToggleView) {
    el.btnToggleView.addEventListener('click', () => {
      audio.playClickSound();
      const appContainer = document.querySelector('.app-container');
      const isSimple = appContainer.classList.toggle('simple-mode');
      const navLabelEl = el.btnToggleView.querySelector('.nav-item-label') || el.btnToggleView;
      if (navLabelEl === el.btnToggleView) {
        el.btnToggleView.textContent = isSimple ? '🛠️ Switch to Advanced Layout' : '👁️ Switch to Simple Layout';
      } else {
        navLabelEl.textContent = isSimple ? 'Switch to Advanced Layout' : 'Switch to Simple Layout';
      }
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
  setupCollapsibleSections();

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

  const navSidebar = document.getElementById('nav-sidebar');
  const btnHideNav = document.getElementById('btn-hide-nav');
  const btnOpenNav = document.getElementById('btn-open-nav');
  const appContainer = document.querySelector('.app-container');

  function hideNav() {
    if (navSidebar) navSidebar.classList.add('nav-hidden');
    if (appContainer) appContainer.classList.add('nav-is-hidden');
    audio.playClickSound();
  }

  function showNav() {
    if (navSidebar) {
      navSidebar.classList.remove('nav-hidden');
      if (appContainer) appContainer.classList.remove('nav-is-hidden');
    }
    audio.playClickSound();
  }

  if (btnHideNav) btnHideNav.addEventListener('click', hideNav);
  if (btnOpenNav) btnOpenNav.addEventListener('click', showNav);

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

  ipcRenderer.on('webview-console', (event, { level, message }) => {
    let type = 'agent';
    if (level === 2) type = 'warning';
    if (level === 3) type = 'error';
    if (level === 3 || message.includes('4weird')) {
      logSystemMessage(`[Game Window Console] ${message}`, type);
    }
  });

  ipcRenderer.on('webview-loaded', () => {
    logSystemMessage("External Game window successfully loaded.");
    crawlFiles();
  });

  ipcRenderer.on('webview-closed', () => {
    logSystemMessage("External Game window closed. Restoring internal preview.");
    document.getElementById('gamewindow-active-placeholder').classList.add('hidden');
    document.getElementById('game-webview').classList.remove('hidden');
  });
  
  // Set up the Hub bindings
  setupHubBindings();

  logSystemMessage("System dashboard loaded. Welcome Hub ready.");
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
    showEditorWorkspace();
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
    
    // Automatically open the game window if not already active to show the gameplay visual
    ipcRenderer.invoke('is-game-window-active').then(active => {
      if (!active && !el.nativeProcessSelect.value) {
        openExternalGameWindow();
      }
    });
    
    // Initialize session memory
    agentBrain.startSession();
    tracker.updateSessionStatsUI(agentBrain, el);
    
    // Setup loops
    executionTimer = setInterval(executeAgentStep, 2000);
    fpsInterval = setInterval(updatePerformanceMetrics, 1000);
  }
}

// Collapsible sidebar sections
function setupCollapsibleSections() {
  const headers = document.querySelectorAll('.section-header');

  // Load saved preferences from localStorage
  const savedPrefs = JSON.parse(localStorage.getItem('sectionPrefs') || '{}');

  headers.forEach(header => {
    const sectionId = header.dataset.section;
    const content = document.getElementById(sectionId);
    const toggle = header.querySelector('.section-toggle');

    // Apply saved preferences (default: first section open, others closed)
    const isOpen = savedPrefs[sectionId] !== undefined ? savedPrefs[sectionId] : (sectionId === 'llm-settings');

    if (!isOpen) {
      content.classList.add('hidden');
      toggle.textContent = '▶';
    }

    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on the help icon
      if (e.target.classList.contains('help-icon')) return;

      const isCurrentlyOpen = !content.classList.contains('hidden');

      if (isCurrentlyOpen) {
        content.classList.add('hidden');
        toggle.textContent = '▶';
      } else {
        content.classList.remove('hidden');
        toggle.textContent = '▼';
      }

      // Save preference
      savedPrefs[sectionId] = !isCurrentlyOpen;
      localStorage.setItem('sectionPrefs', JSON.stringify(savedPrefs));

      // Play click sound if audio is enabled
      if (el.audioToggle && el.audioToggle.checked) {
        audio.playClickSound();
      }
    });
  });
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

async function captureViewportScreenshot() {
  const nativeProcess = el.nativeProcessSelect.value;
  if (nativeProcess) {
    const nativeShot = await ipcRenderer.invoke('capture-native-screenshot', nativeProcess);
    if (nativeShot.success) {
      return nativeShot.base64;
    }
    return null;
  }
  
  const isGameWindowActive = await ipcRenderer.invoke('is-game-window-active');
  if (isGameWindowActive) {
    try {
      return await ipcRenderer.invoke('capture-game-screenshot');
    } catch (e) {
      console.warn("Failed to capture separate game window", e);
    }
  }
  
  if (webviewElement) {
    try {
      const img = await webviewElement.capturePage();
      const resized = img.resize({ width: 512 });
      return resized.toJPEG(50).toString('base64');
    } catch (e) {
      console.warn("Failed to capture webview page", e);
    }
  }
  return null;
}

async function captureManualScreenshot() {
  // Capture screenshot of WebView
  const imgBase64 = await captureViewportScreenshot();
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

async function openExternalGameWindow() {
  audio.playClickSound();
  const url = el.gameUrlInput.value.trim();
  if (!url) {
    toastNotifier.show("Load a game URL first.", "warning");
    return;
  }
  logSystemMessage(`Opening external preview window for URL: ${url}`);
  
  // Show placeholder, hide webview
  document.getElementById('gamewindow-active-placeholder').classList.remove('hidden');
  document.getElementById('game-webview').classList.add('hidden');
  
  // Call main process to open window
  await ipcRenderer.invoke('open-game-window', url);
}

async function takeManualSnapshot() {
  audio.playClickSound();
  logSystemMessage("Capturing manual screen frame...");
  const imgBase64 = await captureViewportScreenshot();
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
    screenshotBase64 = await captureViewportScreenshot();
    
    if (!screenshotBase64) return;
    
    const nativeProcess = el.nativeProcessSelect.value;
    
    // Send latest state elements to the AI Agent Brain
    const isExternalWindow = await ipcRenderer.invoke('is-game-window-active');
    let elements = [];
    if (!nativeProcess && !isExternalWindow) {
      elements = await gameController.getInteractiveDOM(webviewElement);
    } else if (!nativeProcess && isExternalWindow) {
      elements = await gameController.getInteractiveDOM(null);
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
        let px = 500;
        let py = 500;
        if (decision.action.params && decision.action.params.x !== undefined) {
          px = decision.action.params.x;
          py = decision.action.params.y;
        } else if (typeof decision.action.target === 'string' && decision.action.target.includes(',')) {
          const parts = decision.action.target.split(',');
          px = parseInt(parts[0]) || 500;
          py = parseInt(parts[1]) || 500;
        }
        
        drawHeatmapDot(px, py);
        
        // Push click zones
        const zoneX = Math.floor(px / 100) * 100;
        const zoneY = Math.floor(py / 100) * 100;
        const key = `(${zoneX}-${zoneX+99}, ${zoneY}-${zoneY+99})`;
        agentBrain.sessionStats.clickZones[key] = (agentBrain.sessionStats.clickZones[key] || 0) + 1;
        
        // Ensure params is populated for gameController
        if (!decision.action.params) {
          decision.action.params = { x: px, y: py };
        }
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
          pyArgs.push(decision.action.params ? decision.action.params.key : decision.action.target);
        }
        await ipcRenderer.invoke('run-input-sim', pyArgs);
      } else {
        // Inject into WebView DOM
        await gameController.executeAction(webviewElement, decision.action);
      }
    }
    
    // Poll console errors for bugs (collected via console-message event listener)
    
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

  // Color code FPS value
  if (currentFps > 30) {
    el.fpsVal.className = 'value healthy';
  } else if (currentFps > 15) {
    el.fpsVal.className = 'value warning';
  } else {
    el.fpsVal.className = 'value critical';
  }

  const processStats = process.getProcessMemoryInfo();
  processStats.then((stats) => {
    const mb = Math.round(stats.private / 1024 / 1024);
    el.heapVal.textContent = `${mb} MB`;

    // Color code HEAP value
    if (mb < 500) {
      el.heapVal.className = 'value healthy';
    } else if (mb < 800) {
      el.heapVal.className = 'value warning';
    } else {
      el.heapVal.className = 'value critical';
    }

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
  return webviewElement ? gameController.getInteractiveDOM(webviewElement) : [];
};

window.executeAgentAction = (action) => {
  if (webviewElement) {
    gameController.executeAction(webviewElement, action);
    return { success: true };
  }
  return { success: false, error: "No active window" };
};

window.triggerAgentStep = () => {
  executeAgentStep(true);
  return { success: true };
};

// ─── HUB PLANNING & FOLDER DETECTION UTILS ─────────────────────────
const hubEl = {
  hubWorkspace: null,
  editorWorkspace: null,
  btnGotoHub: null,
  cardRandomGame: null,
  cardPlanGame: null,
  cardOpenFolder: null,
  pitchResultsPanel: null,
  chatPlannerPanel: null,
  pitchGameName: null,
  pitchTxtOutput: null,
  pitchBraidOutput: null,
  btnClosePitch: null,
  btnClosePlanner: null,
  plannerChatMessages: null,
  plannerChoicesRow: null,
  plannerCustomInput: null,
  btnPlannerSendCustom: null,
  plannerSpecPreview: null
};

let plannerStep = 0;
let plannerSpecs = {
  name: '',
  mechanic: '',
  theme: '',
  goal: ''
};
let plannerTxtContent = '';

function setupHubBindings() {
  hubEl.hubWorkspace = document.getElementById('hub-workspace');
  hubEl.editorWorkspace = document.getElementById('editor-workspace');
  hubEl.btnGotoHub = document.getElementById('btn-goto-hub');
  
  hubEl.cardRandomGame = document.getElementById('card-random-game');
  hubEl.cardPlanGame = document.getElementById('card-plan-game');
  hubEl.cardOpenFolder = document.getElementById('card-open-folder');

  // Debug: Log hub card elements
  console.log('[DEBUG] Hub Card Elements:');
  console.log('  cardRandomGame:', hubEl.cardRandomGame ? 'FOUND' : 'NOT FOUND');
  console.log('  cardPlanGame:', hubEl.cardPlanGame ? 'FOUND' : 'NOT FOUND');
  console.log('  cardOpenFolder:', hubEl.cardOpenFolder ? 'FOUND' : 'NOT FOUND');
  
  hubEl.pitchResultsPanel = document.getElementById('pitch-results-panel');
  hubEl.chatPlannerPanel = document.getElementById('chat-planner-panel');
  
  hubEl.pitchGameName = document.getElementById('pitch-game-name');
  hubEl.pitchTxtOutput = document.getElementById('pitch-txt-output');
  hubEl.pitchBraidOutput = document.getElementById('pitch-braid-output');
  
  hubEl.btnClosePitch = document.getElementById('btn-close-pitch');
  hubEl.btnClosePlanner = document.getElementById('btn-close-planner');
  
  hubEl.plannerChatMessages = document.getElementById('planner-chat-messages');
  hubEl.plannerChoicesRow = document.getElementById('planner-choices-row');
  hubEl.plannerCustomInput = document.getElementById('planner-custom-input');
  hubEl.btnPlannerSendCustom = document.getElementById('btn-planner-send-custom');
  hubEl.plannerSpecPreview = document.getElementById('planner-spec-preview');

  if (hubEl.btnGotoHub) {
    hubEl.btnGotoHub.addEventListener('click', () => {
      audio.playClickSound();
      showHubWorkspace();
    });
  }

  if (hubEl.cardRandomGame) {
    hubEl.cardRandomGame.addEventListener('click', (e) => {
      console.log('[DEBUG] Card 1 (Random Game) clicked!', e.target);
      audio.playClickSound();
      triggerCreateRandomGame();
    });
  }

  if (hubEl.cardPlanGame) {
    hubEl.cardPlanGame.addEventListener('click', (e) => {
      console.log('[DEBUG] Card 2 (Plan Game) clicked!', e.target);
      audio.playClickSound();
      triggerInteractivePlanner();
    });
  }

  if (hubEl.cardOpenFolder) {
    hubEl.cardOpenFolder.addEventListener('click', (e) => {
      console.log('[DEBUG] Card 3 (Open Folder) clicked!', e.target);
      audio.playClickSound();
      triggerOpenFolderSelector();
    });
  }

  const btnImportPlan = document.getElementById('btn-import-plan');
  if (btnImportPlan) {
    btnImportPlan.addEventListener('click', () => {
      audio.playClickSound();
      const imported = hub.importGamePlan();
      if (imported) {
        lastPitchedGame = imported;
        
        const grid = document.querySelector('.hub-grid');
        const hero = document.querySelector('.hub-hero');
        if (grid) grid.style.display = 'none';
        if (hero) hero.style.display = 'none';

        hubEl.pitchGameName.textContent = imported.name;
        hubEl.pitchTxtOutput.value = imported.fileContent;
        
        const braidMatch = imported.fileContent.split('5. AGENT BRAID ACTION FLOW GRAPHIC')[1] || 
                           imported.fileContent.split('AGENT BRAID ACTION FLOW GRAPHIC')[1] || 
                           imported.fileContent.split('BRAID ACTION DECISION GRAPH')[1] ||
                           imported.fileContent.split('BRAID ACTION FLOW:')[1];
        if (braidMatch) {
          hubEl.pitchBraidOutput.textContent = braidMatch.trim().replace(/^[\r\n]+|=+[\r\n]+|[\r\n]+=+/g, '');
        } else {
          hubEl.pitchBraidOutput.textContent = `(S) Start -> Check target visible?\n  ├─ [Yes] ──> Glide / Move towards it\n  └─ [No] ───> Explore canvas`;
        }

        hubEl.pitchResultsPanel.classList.remove('hidden');
        toastNotifier.show(`Plan "${imported.name}" imported successfully!`, "success");
      }
    });
  }

  if (hubEl.btnClosePitch) {
    hubEl.btnClosePitch.addEventListener('click', () => {
      audio.playClickSound();
      resetHubViews();
    });
  }

  if (hubEl.btnClosePlanner) {
    hubEl.btnClosePlanner.addEventListener('click', () => {
      audio.playClickSound();
      resetHubViews();
    });
  }

  if (hubEl.btnPlannerSendCustom) {
    hubEl.btnPlannerSendCustom.addEventListener('click', () => {
      processPlannerInput(hubEl.plannerCustomInput.value.trim());
      hubEl.plannerCustomInput.value = '';
    });
  }

  const choiceButtons = hubEl.plannerChoicesRow.querySelectorAll('.choice-btn');
  choiceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      processPlannerInput(btn.textContent.trim());
    });
  });

  // Pitch panel copy plan button
  const btnPitchCopy = document.getElementById('btn-pitch-copy');
  if (btnPitchCopy) {
    btnPitchCopy.addEventListener('click', () => {
      audio.playClickSound();
      if (hubEl.pitchTxtOutput.value) {
        clipboard.writeText(hubEl.pitchTxtOutput.value);
        toastNotifier.show("Game plan copied to clipboard!", "success");
      }
    });
  }

  // Pitch panel modify with AI button
  const btnPitchModify = document.getElementById('btn-pitch-modify');
  if (btnPitchModify) {
    btnPitchModify.addEventListener('click', () => {
      audio.playClickSound();
      startModifyingPitchedGame();
    });
  }

  // Pitch panel open folder button
  const btnPitchOpenFolder = document.getElementById('btn-pitch-open-folder');
  if (btnPitchOpenFolder) {
    btnPitchOpenFolder.addEventListener('click', () => {
      audio.playClickSound();
      shell.openPath(hub.plansDir);
      toastNotifier.show("Opening games_plan folder...", "success");
    });
  }

  // Pitch panel open in notepad button
  const btnPitchOpenNotepad = document.getElementById('btn-pitch-open-notepad');
  if (btnPitchOpenNotepad) {
    btnPitchOpenNotepad.addEventListener('click', () => {
      audio.playClickSound();
      if (lastPitchedGame && lastPitchedGame.planPath) {
        shell.openPath(lastPitchedGame.planPath);
        toastNotifier.show("Opening plan file in editor...", "success");
      }
    });
  }

  // Planner panel copy plan button
  const btnPlannerCopy = document.getElementById('btn-planner-copy');
  if (btnPlannerCopy) {
    btnPlannerCopy.addEventListener('click', () => {
      audio.playClickSound();
      if (hubEl.plannerSpecPreview.value) {
        clipboard.writeText(hubEl.plannerSpecPreview.value);
        toastNotifier.show("Game plan copied to clipboard!", "success");
      }
    });
  }

  // Planner panel open folder button
  const btnPlannerOpenFolder = document.getElementById('btn-planner-open-folder');
  if (btnPlannerOpenFolder) {
    btnPlannerOpenFolder.addEventListener('click', () => {
      audio.playClickSound();
      shell.openPath(hub.plansDir);
      toastNotifier.show("Opening games_plan folder...", "success");
    });
  }

  // Planner panel open in notepad button
  const btnPlannerOpenNotepad = document.getElementById('btn-planner-open-notepad');
  if (btnPlannerOpenNotepad) {
    btnPlannerOpenNotepad.addEventListener('click', () => {
      audio.playClickSound();
      if (plannerSpecs.name) {
        const planPath = path.join(hub.plansDir, `${plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt`);
        if (fs.existsSync(planPath)) {
          shell.openPath(planPath);
          toastNotifier.show("Opening plan file in editor...", "success");
        } else {
          toastNotifier.show("No saved plan file found yet. Finish planning first!", "warning");
        }
      }
    });
  }
}

let lastPitchedGame = null;

function startModifyingPitchedGame() {
  if (!lastPitchedGame) return;
  
  // Hide pitch panel, show chat planner panel
  hubEl.pitchResultsPanel.classList.add('hidden');
  hubEl.chatPlannerPanel.classList.remove('hidden');
  
  plannerStep = 1;
  plannerSpecs = {
    name: lastPitchedGame.name,
    mechanic: lastPitchedGame.mechanic,
    theme: lastPitchedGame.theme,
    goal: ''
  };
  
  hubEl.plannerChatMessages.innerHTML = '';
  addAgentChatMessage(`Let's modify the plan for "${plannerSpecs.name}"! I loaded the pitched design spec. Currently, the Core Mechanic is: "${plannerSpecs.mechanic}". What would you like to change or add to the core mechanic?`);
  updatePlannerChoices(
    "1. Add gravity drag & deceleration physics",
    "2. Mouse clicks blast incoming obstacles",
    "3. Keep current mechanic (Stealth/exploration)"
  );
  updateLiveSpecFile();
}

function showHubWorkspace() {
  hubEl.hubWorkspace.classList.remove('hidden');
  hubEl.editorWorkspace.classList.add('hidden');
  resetHubViews();
}

function showEditorWorkspace() {
  hubEl.hubWorkspace.classList.add('hidden');
  hubEl.editorWorkspace.classList.remove('hidden');
}

function resetHubViews() {
  const grid = document.querySelector('.hub-grid');
  const hero = document.querySelector('.hub-hero');
  if (grid) grid.style.display = 'grid';
  if (hero) hero.style.display = 'block';

  hubEl.pitchResultsPanel.classList.add('hidden');
  hubEl.chatPlannerPanel.classList.add('hidden');
}

function triggerCreateRandomGame() {
  const grid = document.querySelector('.hub-grid');
  const hero = document.querySelector('.hub-hero');
  if (grid) grid.style.display = 'none';
  if (hero) hero.style.display = 'none';

  logSystemMessage("Generating Random Viral Spec Sheet...");
  const pitched = hub.pitchGame();
  lastPitchedGame = pitched;

  hubEl.pitchGameName.textContent = pitched.name;
  hubEl.pitchTxtOutput.value = pitched.fileContent;
  hubEl.pitchBraidOutput.textContent = pitched.braid;
  
  hubEl.pitchResultsPanel.classList.remove('hidden');
  toastNotifier.show("Game pitched successfully!", "success");
}

function triggerInteractivePlanner() {
  const grid = document.querySelector('.hub-grid');
  const hero = document.querySelector('.hub-hero');
  if (grid) grid.style.display = 'none';
  if (hero) hero.style.display = 'none';

  hubEl.chatPlannerPanel.classList.remove('hidden');
  hubEl.plannerChatMessages.innerHTML = '';
  
  plannerStep = 0;
  plannerSpecs = { name: '', mechanic: '', theme: '', goal: '' };
  plannerTxtContent = '';
  hubEl.plannerSpecPreview.value = '';

  addAgentChatMessage("Welcome to the HTML Game Planner! Let's start by choosing a Name or concept. What should we name your new game?");
  updatePlannerChoices(
    "1. Hyperdrift Slime",
    "2. Galactic Space Collector",
    "3. Pixel DeepSea Escape"
  );
}

function addAgentChatMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg agent';
  msg.textContent = text;
  hubEl.plannerChatMessages.appendChild(msg);
  hubEl.plannerChatMessages.scrollTop = hubEl.plannerChatMessages.scrollHeight;
  audio.playSynth(440, 'triangle', 0.1);
}

function addUserChatMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg user';
  msg.textContent = text;
  hubEl.plannerChatMessages.appendChild(msg);
  hubEl.plannerChatMessages.scrollTop = hubEl.plannerChatMessages.scrollHeight;
  audio.playSynth(550, 'sine', 0.08);
}

function updatePlannerChoices(c1, c2, c3) {
  const buttons = hubEl.plannerChoicesRow.querySelectorAll('.choice-btn');
  buttons[0].textContent = c1;
  buttons[1].textContent = c2;
  buttons[2].textContent = c3;
}

function updateLiveSpecFile() {
  const braid = `(S) Start -> Check if Danger nearby?
  ├─ [Yes] ──> Evade using game controls (${plannerSpecs.mechanic || 'Pending choice'})
  └─ [No] ───> Check if target goal (${plannerSpecs.goal || 'Pending choice'}) visible?
        ├─ [Yes] ──> Glide / Move towards it
        └─ [No] ────> Keep default exploring`;

  const is3D = /3D|Three\.js|spatial|perspective|first-person|voxel|cube|sphere/i.test((plannerSpecs.mechanic || '') + " " + (plannerSpecs.theme || ''));

  let platform = "HTML5 Browser (Canvas 2D API)";
  let fileLayout = `  1. index.html   : Hosts the Canvas DOM layout, high-performance viewport styling, and script tags importing the modules.
  2. game.js      : The main game engine controller managing requestAnimationFrame, game state transitions, and canvas scaling.
  3. physics.js   : Game physics containing Euler movement integration, speed limits, and circle-to-circle collision equations.
  4. assets.js    : Aesthetic drawing library containing custom methods for glow lines, vaporwave grid lines, and particles.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

  let stateVariables = `   - canvas, ctx: DOM controls for Canvas 2D contexts.
   - player: Object storing location and current movement state.
   - hazards: Obstacle list containing target vector offsets.`;

  let renderingPhases = `   - Clear Canvas: Redraw solid dark backgrounds matching the theme.
   - Render Grid Backdrop: Use modern vector lines to match: ${plannerSpecs.theme || 'Pending choice'}.
   - Draw Avatar: Draw player with custom particle aura.
   - Scoreboard: Print custom neon status tracker in the top-right corner.`;

  if (is3D) {
    platform = "HTML5 Browser (3D WebGL API via Three.js library)";
    fileLayout = `  1. index.html   : Hosts the 3D canvas viewport container, imports Three.js CDN script (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js), and project modules.
  2. game.js      : The main game loop and engine orchestration, setting up the THREE.Scene, THREE.PerspectiveCamera, and THREE.WebGLRenderer.
  3. physics.js   : Calculates 3D physics updates (position vector additions, velocity damping, bounding box or bounding sphere collisions in 3D).
  4. assets.js    : Manages 3D geometry creation (THREE.BoxGeometry, THREE.SphereGeometry), materials, lights, and animations.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

    stateVariables = `   - scene, camera, renderer: Three.js core rendering components.
   - playerMesh: THREE.Mesh representing the player's 3D avatar.
   - hazardMeshes: Array of active hazard meshes moving through the 3D viewport.
   - collectibleMeshes: Array of meshes representing target goals.`;

    renderingPhases = `   - Clear Viewport: Reset renderer and apply background theme color.
   - Update 3D Camera: Align PerspectiveCamera to orbit player mesh position.
   - Draw 3D Avatar/Objects: Rotate meshes and emit Three.js particle groups.
   - HUD overlay: Print score tracker overlaying the 3D rendering context.`;
  }

  plannerTxtContent = `================================================================================
GAME SPECIFICATION SHEET: ${plannerSpecs.name}
================================================================================
Status: Under design / draft plan
Core Mechanic: ${plannerSpecs.mechanic || 'Pending choice'}
Visual Aesthetic: ${plannerSpecs.theme || 'Pending choice'}
Winning Goal: ${plannerSpecs.goal || 'Pending choice'}
Target Platform: ${platform}

--------------------------------------------------------------------------------
1. DETAILED MECHANICS AND STATE STRUCTURE
--------------------------------------------------------------------------------
- Player Physics: Implement simple integration vectors.
  - Core mechanics matching: ${plannerSpecs.mechanic || 'Pending choice'}.
- Goal Spawning: Spawn items within safe padding away from canvas margins.
- Hazard Scalers: Adjust spawn speed dynamically based on current game score.

--------------------------------------------------------------------------------
2. TECHNICAL ARCHITECTURE & SOURCE FILE LAYOUT (EXPERT BLUEPRINT)
--------------------------------------------------------------------------------
As an expert game design architect, I recommend structuring this codebase into multiple modular files to separate concerns, facilitate seamless AI vibe-coding edits, and support clean playtesting injection:

- RECOMMENDED FILE LAYOUT:
${fileLayout}

A. STATE VARIABLES REQUIRED:
${stateVariables}
   - score: Current count of collectable goals acquired.

B. CRITICAL RENDERING PHASES:
${renderingPhases}

--------------------------------------------------------------------------------
3. PLAYTESTING & AI AUTOMATION STEPS
--------------------------------------------------------------------------------
- Load inside 4weird aiplay debugger using local file paths.
- Setup AI Agent parameters matching the decision tree below.
- Verify game loop recovery under active obstacle vectors.

--------------------------------------------------------------------------------
4. BRAID ACTION DECISION GRAPH
--------------------------------------------------------------------------------
${braid}

================================================================================
`;
  hubEl.plannerSpecPreview.value = plannerTxtContent;
}

let plannerHistory = [];

async function callPlannerAI(userInput) {
  plannerHistory.push({ role: 'user', content: userInput });

  // Fallback dynamic generator if LLM is not configured/key is empty
  const useFallback = !agentBrain.config.apiKey && agentBrain.config.provider !== 'local';
  
  if (useFallback) {
    const pool = require('./modules/vocabulary_pool');
    const step = plannerStep;
    let agentResponse = "";
    let choices = [];
    let isCompleted = false;

    if (step === 0) {
      plannerSpecs.name = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 1;
      agentResponse = `Excellent! "${plannerSpecs.name}" is a great name. Let's decide on the Core Mechanic. What type of gameplay fits this game?`;
      choices = [
        "1. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "2. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "3. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)]
      ];
    } else if (step === 1) {
      plannerSpecs.mechanic = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 2;
      agentResponse = `Got it. For "${plannerSpecs.name}", we are using: "${plannerSpecs.mechanic}". Next, let's pick a Visual Theme / Aesthetic:`;
      choices = [
        "1. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "2. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "3. " + pool.themes[Math.floor(Math.random() * pool.themes.length)]
      ];
    } else if (step === 2) {
      plannerSpecs.theme = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 3;
      agentResponse = `Perfect choice. With a theme of "${plannerSpecs.theme}", what should be the main Winning Goal or Win/Lose Condition?`;
      choices = [
        "1. Collect 50 stardust fragments to win",
        "2. Survive as long as possible (endless loop)",
        "3. Clear 10 waves of accelerating hazards"
      ];
    } else {
      plannerSpecs.goal = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 4;
      isCompleted = true;
      agentResponse = `🎉 Complete! Your plan document has been written to: games_plan/${plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt. You can copy/paste it into Cursor/antigravity or select the folder from the hub view!`;
      choices = ["Draft Saved", "Spec Completed", "Saved to workspace"];
    }

    plannerHistory.push({ role: 'assistant', content: agentResponse });
    return { agentResponse, choices, specs: { ...plannerSpecs }, isCompleted };
  }

  // Active AI call
  const systemPrompt = `You are an expert game designer helping a user design a viral browser HTML5 game.
We are building a specification document. The current spec state is:
Name: ${plannerSpecs.name || 'Not set'}
Mechanic: ${plannerSpecs.mechanic || 'Not set'}
Theme: ${plannerSpecs.theme || 'Not set'}
Goal: ${plannerSpecs.goal || 'Not set'}

Your task:
Review the conversation history, then guide the user to design the next part of the game or complete it.
You MUST respond with a JSON object matching this schema:
{
  "agentResponse": "Your helpful response to the user chat",
  "choices": ["Option 1", "Option 2", "Option 3"],
  "specs": {
    "name": "Game Name (update if decided)",
    "mechanic": "Core Mechanic (update if decided)",
    "theme": "Visual Theme (update if decided)",
    "goal": "Main Goal (update if decided)"
  },
  "isCompleted": false
}

Guidelines:
- Keep responses friendly, creative, and professional.
- Propose highly engaging and interesting mechanics/themes/goals.
- Ensure "choices" has exactly 3 elements.
- Respond ONLY with the JSON block. No markdown, no extra text.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...plannerHistory
  ];

  const promptText = messages.map(m => `${m.role === 'system' ? 'Instructions' : m.role === 'user' ? 'User' : 'Assistant'}:\n${m.content}`).join('\n\n') + '\n\nAssistant Response (JSON ONLY):';

  try {
    const rawResult = await agentBrain.callLLM(promptText);
    let cleaned = rawResult.trim();
    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      if (lines[0].startsWith('```')) lines.shift();
      if (lines[lines.length - 1].startsWith('```')) lines.pop();
      cleaned = lines.join('\n').trim();
    }
    const data = JSON.parse(cleaned);
    
    plannerSpecs.name = data.specs.name || plannerSpecs.name;
    plannerSpecs.mechanic = data.specs.mechanic || plannerSpecs.mechanic;
    plannerSpecs.theme = data.specs.theme || plannerSpecs.theme;
    plannerSpecs.goal = data.specs.goal || plannerSpecs.goal;

    if (data.isCompleted) {
      plannerStep = 4;
    } else {
      if (!plannerSpecs.name) plannerStep = 0;
      else if (!plannerSpecs.mechanic) plannerStep = 1;
      else if (!plannerSpecs.theme) plannerStep = 2;
      else plannerStep = 3;
    }

    plannerHistory.push({ role: 'assistant', content: data.agentResponse });
    return {
      agentResponse: data.agentResponse,
      choices: data.choices || [],
      specs: { ...plannerSpecs },
      isCompleted: data.isCompleted || false
    };
  } catch (err) {
    console.error("AI Planner call failed, falling back to local pool...", err);
    // Temporarily trigger fallback Offline logic
    const pool = require('./modules/vocabulary_pool');
    const step = plannerStep;
    let agentResponse = "";
    let choices = [];
    let isCompleted = false;

    if (step === 0) {
      plannerSpecs.name = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 1;
      agentResponse = `Excellent! "${plannerSpecs.name}" is a great name. Let's decide on the Core Mechanic. What type of gameplay fits this game?`;
      choices = [
        "1. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "2. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "3. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)]
      ];
    } else if (step === 1) {
      plannerSpecs.mechanic = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 2;
      agentResponse = `Got it. For "${plannerSpecs.name}", we are using: "${plannerSpecs.mechanic}". Next, let's pick a Visual Theme / Aesthetic:`;
      choices = [
        "1. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "2. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "3. " + pool.themes[Math.floor(Math.random() * pool.themes.length)]
      ];
    } else if (step === 2) {
      plannerSpecs.theme = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 3;
      agentResponse = `Perfect choice. With a theme of "${plannerSpecs.theme}", what should be the main Winning Goal or Win/Lose Condition?`;
      choices = [
        "1. Collect 50 stardust fragments to win",
        "2. Survive as long as possible (endless loop)",
        "3. Clear 10 waves of accelerating hazards"
      ];
    } else {
      plannerSpecs.goal = userInput.replace(/^\d+\.\s*/, '');
      plannerStep = 4;
      isCompleted = true;
      agentResponse = `🎉 Complete! Your plan document has been written to: games_plan/${plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt. You can copy/paste it into Cursor/antigravity or select the folder from the hub view!`;
      choices = ["Draft Saved", "Spec Completed", "Saved to workspace"];
    }

    plannerHistory.push({ role: 'assistant', content: agentResponse });
    return { agentResponse, choices, specs: { ...plannerSpecs }, isCompleted };
  }
}

async function processPlannerInput(input) {
  if (!input) return;
  addUserChatMessage(input);

  const loaderId = addAgentChatMessage("Thinking...");
  const result = await callPlannerAI(input);
  
  // Remove "Thinking..." message
  const chatMsgs = hubEl.plannerChatMessages.querySelectorAll('.chat-msg');
  chatMsgs.forEach(msg => {
    if (msg.textContent.includes("Thinking...")) {
      msg.remove();
    }
  });

  addAgentChatMessage(result.agentResponse);
  updatePlannerChoices(result.choices[0], result.choices[1], result.choices[2]);
  updateLiveSpecFile();

  if (result.isCompleted || plannerStep >= 4) {
    const planPath = path.join(hub.plansDir, `${plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt`);
    fs.writeFileSync(planPath, plannerTxtContent, 'utf8');
  }
}

function triggerOpenFolderSelector() {
  const selected = hub.selectGameFolder();
  if (selected) {
    const { folderPath, gameType } = selected;
    logSystemMessage(`Opened specific folder: "${folderPath}" (Detected type: ${gameType})`);
    
    if (el.nativeProcessSelect) {
      el.nativeProcessSelect.innerHTML = `<option value="">-- Scan / Select Game Window --</option>`;
      const opt = document.createElement('option');
      opt.value = gameType;
      opt.textContent = `${gameType} Game Workspace - Auto-detected`;
      opt.selected = true;
      el.nativeProcessSelect.appendChild(opt);
    }

    if (gameType === 'HTML') {
      let indexFile = path.join(folderPath, 'index.html');
      if (!fs.existsSync(indexFile)) {
        const list = fs.readdirSync(folderPath);
        for (const item of list) {
          const sub = path.join(folderPath, item);
          if (fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'index.html'))) {
            indexFile = path.join(sub, 'index.html');
            break;
          }
        }
      }
      
      if (fs.existsSync(indexFile)) {
        el.gameUrlInput.value = 'file:///' + indexFile.replace(/\\/g, '/');
        saveConfigData();
        loadGame();
        crawlFiles();
      }
    } else {
      crawlFilesSpecific(folderPath);
    }
    
    showEditorWorkspace();
    toastNotifier.show(`Loaded workspace of type ${gameType}!`, "success");
  }
}

async function crawlFilesSpecific(folderPath) {
  const scanResult = await ipcRenderer.invoke('scan-directory', folderPath);
  if (scanResult.success) {
    sourceFiles = scanResult.files;
    tabs.renderFileList(el.codeFileList, el.codeContentView, sourceFiles, (file) => {
      audio.playClickSound();
    });
  }
}

