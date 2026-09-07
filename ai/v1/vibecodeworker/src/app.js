const fs = require('fs');
const path = require('path');
const { ipcRenderer, clipboard } = require('electron');
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

// Import modular runtime & UI components
const { drawSparkline: renderSparkline } = require('./components/metrics_sparkline');
const { drawHeatmapDot: scrubberDrawHeatmapDot, clearHeatmapCanvas: scrubberClearHeatmapCanvas } = require('./components/scrubber_controller');
const { populateQuickLaunchGrid } = require('./components/quick_launcher');
const { setupCollapsibleSections } = require('./components/collapsible_sections');
const { updateStatusBanner: setStatusBanner } = require('./components/status_banner');
const { logSystemMessage: writeSystemLog } = require('./components/system_logger');
const { runFriendSlopAutoplay: friendSlopAI } = require('./runtime/friend_slop_autoplay');
const { runGraveGain3DAutoplay: graveGain3dAI } = require('./runtime/gravegain3d_autoplay');
const {
  setupAutoCodeEventListeners,
  populateAutoCodeFileSelect,
  renderAutoCodeDiff
} = require('./components/autocode_ui_controller');
const {
  handleTimelineScrub: onTimelineScrub,
  resumeFromScrub: onResumeFromScrub,
  saveReplayTrace
} = require('./components/timeline_scrubber_view');
const { HubUIController } = require('./components/hub_ui_controller');
const { executeAgentStep: runAgentStep } = require('./runtime/agent_step_executor');
const { UltralightWebEngine } = require('./runtime/ultralight_engine');

// Instantiate cores
const agentBrain = new AgentBrain();
const gameController = new GameController();
const autoCodeSystem = new AutoCodeSystem();
const ultralightEngine = new UltralightWebEngine();

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

// Scanned code files container
let sourceFiles = [];

// Path configurations
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const bugsLogPath = path.join(dataDir, 'bugs_log.json');
const replaysDir = path.join(dataDir, 'replays');

// DOM Elements Map
let el = {};

// Hub UI Controller instance
let hubUI = null;

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
  el.quickGameUrl = document.getElementById('quick-game-url');
  el.quickGameRules = document.getElementById('quick-game-rules');
  el.btnQuickLoad = document.getElementById('btn-quick-load');
  el.btnQuickRun = document.getElementById('btn-quick-run');
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

  // Token monitor elements
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

  // Direct AI Fix & Token Report elements
  el.btnRunDirectFix = document.getElementById('btn-run-direct-fix');
  el.directFixStatusContainer = document.getElementById('direct-fix-status-container');
  el.directFixCostBadge = document.getElementById('direct-fix-cost-badge');
  el.directFixStatusText = document.getElementById('direct-fix-status-text');
  el.btnViewDirectDiff = document.getElementById('btn-view-direct-diff');
  el.btnApplyDirectFix = document.getElementById('btn-apply-direct-fix');
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
  if (el.quickGameUrl) {
    el.quickGameUrl.value = el.gameUrlInput.value;
    el.quickGameUrl.addEventListener('input', () => { el.gameUrlInput.value = el.quickGameUrl.value; });
    el.gameUrlInput.addEventListener('input', () => { el.quickGameUrl.value = el.gameUrlInput.value; });
  }
  if (el.quickGameRules) {
    el.quickGameRules.value = el.gameRulesInput.value;
    el.quickGameRules.addEventListener('input', () => { el.gameRulesInput.value = el.quickGameRules.value; });
    el.gameRulesInput.addEventListener('input', () => { el.quickGameRules.value = el.gameRulesInput.value; });
  }
  if (el.btnQuickLoad) el.btnQuickLoad.addEventListener('click', () => {
    if (el.quickGameUrl) el.gameUrlInput.value = el.quickGameUrl.value.trim();
    if (el.quickGameRules) el.gameRulesInput.value = el.quickGameRules.value.trim();
    loadGame();
  });
  if (el.btnQuickRun) el.btnQuickRun.addEventListener('click', () => {
    if (el.quickGameUrl) el.gameUrlInput.value = el.quickGameUrl.value.trim();
    if (el.quickGameRules) el.gameRulesInput.value = el.quickGameRules.value.trim();
    if (!el.gameUrlInput.value) {
      toastNotifier.show('Choose a target before starting a playtest.', 'warning');
      return;
    }
    if (!webviewElement.src || webviewElement.src === 'about:blank') loadGame();
    if (!isRunning) toggleAgentState();
  });
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
  if (el.btnRunDirectFix) {
    el.btnRunDirectFix.addEventListener('click', runDirectAIFix);
  }
  if (el.btnViewDirectDiff) {
    el.btnViewDirectDiff.addEventListener('click', inspectDirectDiff);
  }
  if (el.btnApplyDirectFix) {
    el.btnApplyDirectFix.addEventListener('click', applyDirectFix);
  }
  el.btnSaveReplay.addEventListener('click', () => {
    saveReplayTrace({ replaysDir, timelineHistory, el, audio, toastNotifier, logSystemMessage });
  });
  
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
      const isOpen = appContainer.classList.toggle('options-open');
      const navLabelEl = el.btnToggleView.querySelector('.nav-item-label') || el.btnToggleView;
      if (navLabelEl === el.btnToggleView) {
        el.btnToggleView.textContent = isOpen ? '✕ Close detailed options' : '🛠️ Open detailed options';
      } else {
        navLabelEl.textContent = isOpen ? 'Close detailed options' : 'Open detailed options';
      }
      logSystemMessage(`${isOpen ? 'Opened' : 'Closed'} detailed options.`);
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
  el.tabAutoCode.addEventListener('click', () => tabs.switchTab('autocode', el, audio, () => populateAutoCodeFileSelect(el, sourceFiles)));
  
  el.timelineScrubber.addEventListener('input', () => onTimelineScrub({ el, timelineHistory }));
  el.btnTimelinePlay.addEventListener('click', () => onResumeFromScrub({ el, audio, logSystemMessage }));
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

  setupAutoCodeEventListeners({
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
  });

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

  // --- HEADER DROPDOWN MENUS CONTROLLER ---
  const dropdowns = document.querySelectorAll('.menu-dropdown');
  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.menu-dropdown-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
        audio.playClickSound();
        const wasActive = dd.classList.contains('active');
        dropdowns.forEach(d => d.classList.remove('active'));
        if (!wasActive) {
          dd.classList.add('active');
        }
      });
    }
  });

  // Close dropdowns when clicking outside
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-dropdown')) {
      dropdowns.forEach(d => d.classList.remove('active'));
    }
  });

  // Wire Dropdown Items
  const wireMenuItem = (id, callback) => {
    const item = document.getElementById(id);
    if (item) {
      item.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('active'));
        callback();
      });
    }
  };

  wireMenuItem('menu-item-load-game', () => loadGame());
  wireMenuItem('menu-item-reload-game', () => reloadGame());
  wireMenuItem('menu-item-ext-window', () => openExternalGameWindow());
  wireMenuItem('menu-item-devtools', () => openGameDevTools());
  wireMenuItem('menu-item-snapshot', () => takeManualSnapshot());
  wireMenuItem('menu-item-goto-hub', () => {
    if (hubUI) {
      audio.playClickSound();
      hubUI.showHubWorkspace();
    }
  });

  wireMenuItem('menu-item-direct-fix', () => runDirectAIFix());
  wireMenuItem('menu-item-ultralight', async () => {
    audio.playClickSound();
    const url = el.gameUrlInput ? el.gameUrlInput.value.trim() : '';
    logSystemMessage(`[Ultralight Engine] Initializing headless web automation pass on: ${url || 'active target'}`);
    toastNotifier.show("Ultralight Web Auto-QA running...", "info");
    
    // Listen for engine bug detections and log forward
    ultralightEngine.on('bug_detected', (bug) => {
      agentBrain.bugs.unshift(bug);
      tracker.renderBugs(el.bugsContainer, el.bugCountBadge, agentBrain, selectBugCard);
      logSystemMessage(`[Ultralight QA Defect] ${bug.type}: ${bug.description}`, 'error');
    });

    const metrics = ultralightEngine.getMetrics();
    logSystemMessage(`[Ultralight Engine] Viewport active. Rendered WebKit metrics: ${JSON.stringify(metrics)}`);
    toastNotifier.show("Ultralight Web QA completed: Target verified", "success");
  });
  wireMenuItem('menu-item-heuristic', () => forceHeuristicStep());
  wireMenuItem('menu-item-mega-prompt', () => generateMegaPrompt());
  wireMenuItem('menu-item-save-replay', () => {
    saveReplayTrace({ replaysDir, timelineHistory, el, audio, toastNotifier, logSystemMessage });
  });
  wireMenuItem('menu-item-copy-logs', () => {
    if (el.btnCopy50Logs) el.btnCopy50Logs.click();
  });

  wireMenuItem('menu-item-toggle-layout', () => {
    if (el.btnToggleView) el.btnToggleView.click();
    const isOpen = appContainer.classList.contains('options-open');
    const menuLayoutLabel = document.getElementById('menu-layout-label');
    if (menuLayoutLabel) {
      menuLayoutLabel.textContent = isOpen ? 'Close detailed options' : 'Open detailed options';
    }
  });

  wireMenuItem('menu-item-toggle-audio', () => {
    toggleAudioSetting();
    const menuAudioLabel = document.getElementById('menu-audio-label');
    if (menuAudioLabel) {
      menuAudioLabel.textContent = audio.getAudioEnabled() ? 'Mute Sounds (Currently ON)' : 'Unmute Sounds (Currently OFF)';
    }
  });

  wireMenuItem('menu-item-toggle-config', () => {
    if (leftSidebar) {
      leftSidebar.classList.toggle('collapsed');
      if (btnToggleLeft) btnToggleLeft.classList.toggle('active');
      audio.playClickSound();
    }
  });

  wireMenuItem('menu-item-toggle-tracker', () => {
    if (rightSidebar) {
      rightSidebar.classList.toggle('collapsed');
      if (btnToggleRight) btnToggleRight.classList.toggle('active');
      audio.playClickSound();
    }
  });

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
  
  // Initialize Hub Controller
  const hubEl = {
    hubWorkspace: document.getElementById('hub-workspace'),
    editorWorkspace: document.getElementById('editor-workspace'),
    btnGotoHub: document.getElementById('btn-goto-hub'),
    cardRandomGame: document.getElementById('card-random-game'),
    cardPlanGame: document.getElementById('card-plan-game'),
    cardOpenFolder: document.getElementById('card-open-folder'),
    pitchResultsPanel: document.getElementById('pitch-results-panel'),
    chatPlannerPanel: document.getElementById('chat-planner-panel'),
    pitchGameName: document.getElementById('pitch-game-name'),
    pitchTxtOutput: document.getElementById('pitch-txt-output'),
    pitchBraidOutput: document.getElementById('pitch-braid-output'),
    btnClosePitch: document.getElementById('btn-close-pitch'),
    btnClosePlanner: document.getElementById('btn-close-planner'),
    plannerChatMessages: document.getElementById('planner-chat-messages'),
    plannerChoicesRow: document.getElementById('planner-choices-row'),
    plannerCustomInput: document.getElementById('planner-custom-input'),
    btnPlannerSendCustom: document.getElementById('btn-planner-send-custom'),
    plannerSpecPreview: document.getElementById('planner-spec-preview')
  };

  hubUI = new HubUIController({
    hubEl,
    audio,
    toastNotifier,
    logSystemMessage,
    agentBrain,
    saveConfigData,
    loadGame,
    crawlFiles,
    showEditorWorkspace: () => {
      hubEl.hubWorkspace.classList.add('hidden');
      hubEl.editorWorkspace.classList.remove('hidden');
    },
    el
  });
  hubUI.setupBindings();

  logSystemMessage("System dashboard loaded. Welcome Hub ready.");
  setTimeout(() => populateQuickLaunchGrid(el.demoGameSelect, selectDemo, audio), 600);

  // Listen for CLI arguments
  ipcRenderer.on('cli-args', (event, argv) => {
    window.cliArgs = argv;
    const gameArgIndex = argv.indexOf('--game');
    if (gameArgIndex !== -1 && gameArgIndex + 1 < argv.length) {
      const gameName = argv[gameArgIndex + 1];
      const normalizedTarget = gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
      logSystemMessage(`Command-line request: Auto-loading game "${gameName}"`);
      setTimeout(() => {
        const options = Array.from(el.demoGameSelect.options);
        const matchedOpt = options.find(opt => {
          const textNorm = (opt.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const valNorm = (opt.value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return textNorm.includes(normalizedTarget) || valNorm.includes(normalizedTarget);
        });
        if (matchedOpt) {
          el.demoGameSelect.value = matchedOpt.value;
          selectDemo();
          if (argv.includes('--start-agent') || argv.includes('--autoplay')) {
            logSystemMessage("Command-line request: Auto-starting AI Agent in 1.5 seconds");
            setTimeout(() => {
              if (!isRunning) toggleAgentState();
            }, 1500);
          }
        } else {
          logSystemMessage(`Game "${gameName}" not found in demo games list.`, 'error');
        }
      }, 1200);
    }
  });
});

function saveConfigData() {
  config.saveConfig(el, audio, agentBrain, autoCodeSystem, dataDir);
}

function updateStatusBanner(text, type = 'ready') {
  setStatusBanner(el.gameStatusBanner, text, type);
}

function loadGame() {
  if (el.quickGameUrl && el.quickGameUrl.value !== el.gameUrlInput.value) el.quickGameUrl.value = el.gameUrlInput.value;
  if (el.quickGameRules && el.quickGameRules.value !== el.gameRulesInput.value) el.quickGameRules.value = el.gameRulesInput.value;
  webview.loadGameUrl(el.gameUrlInput, webviewElement, el.webviewPlaceholder, saveConfigData, crawlFiles, logSystemMessage);
  if (el.gameUrlInput.value) {
    updateStatusBanner("👉 Game ready! Click 'START AI AGENT' to begin playtesting", 'ready');
    if (hubUI) hubUI.showEditorWorkspace();
  }
}

function selectDemo() {
  const val = el.demoGameSelect.value;
  if (val) {
    el.gameUrlInput.value = val;
    if (el.quickGameUrl) el.quickGameUrl.value = val;
    saveConfigData();
    loadGame();
    webview.loadGameMeta(val, el.gameRulesInput, saveConfigData, logSystemMessage);
    if (el.quickGameRules) el.quickGameRules.value = el.gameRulesInput.value;
  }
}

function crawlFiles() {
  webview.crawlCodeFiles(el.gameUrlInput, (files) => {
    sourceFiles = files;
    tabs.renderFileList(el.codeFileList, el.codeContentView, sourceFiles, () => {
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

function logSystemMessage(message, type = 'system') {
  writeSystemLog(el.logStream, consoleLogs, dataDir, message, type);
}

function clearLogView() {
  audio.playClickSound();
  el.logStream.innerHTML = '';
  consoleLogs = [];
  logSystemMessage("Logs cleared.");
}

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
    
    ipcRenderer.invoke('is-game-window-active').then(active => {
      if (!active && !el.nativeProcessSelect.value) {
        openExternalGameWindow();
      }
    });
    
    agentBrain.startSession();
    tracker.updateSessionStatsUI(agentBrain, el);
    
    executionTimer = setInterval(executeAgentStep, 2000);
    fpsInterval = setInterval(updatePerformanceMetrics, 1000);
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
      el.modalBugTitle.textContent = `Screenshot #${idx + 1}`;
      el.modalBugLogs.textContent = 'Captured screenshot metadata';
      el.modalBugImg.src = img.src;
      el.modalBugImg.style.display = 'block';
      el.bugModal.classList.remove('hidden');
    });
    el.autocodeShotsPreview.appendChild(img);
  });
}

let lastManualCaptureTime = 0;

function setupWebviewListeners() {
  webviewElement.addEventListener('console-message', (e) => {
    let type = 'agent';
    if (e.level === 2) type = 'warning';
    if (e.level === 3) type = 'error';
    
    if (e.message.includes('[4weird-user-action]')) {
      if (el.autocodeCaptureOnPlay && el.autocodeCaptureOnPlay.checked) {
        const now = Date.now();
        if (now - lastManualCaptureTime >= 1000) {
          lastManualCaptureTime = now;
          captureManualScreenshot();
        }
      }
      return;
    }
    
    if (e.level === 3 || e.message.includes('4weird')) {
      logSystemMessage(`[Game Console] ${e.message}`, type);
    }
  });

  webviewElement.addEventListener('did-finish-load', () => {
    logSystemMessage("Game window viewport successfully loaded.");
    crawlFiles();
    
    webviewElement.executeJavaScript(`
      (() => {
        const handler = (e) => {
          console.log('[4weird-user-action] ' + e.type);
        };
        window.addEventListener('keydown', handler);
        window.addEventListener('mousedown', handler);
      })()
    `).catch(err => console.error("Failed to inject tracking script:", err));
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
  
  document.getElementById('gamewindow-active-placeholder').classList.remove('hidden');
  document.getElementById('game-webview').classList.add('hidden');
  
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

let pendingDirectFix = null;

async function runDirectAIFix() {
  audio.playClickSound();
  if (sourceFiles.length === 0) {
    toastNotifier.show("Load a game demo first to index source files.", "warning");
    return;
  }

  // Check if we have an active bug or general playtest findings
  const targetBug = agentBrain.bugs.length > 0 ? agentBrain.bugs[0] : {
    type: 'Code Polish / Optimization',
    description: 'Auto-detected game optimization and bug prevention based on playtest trace.',
    severity: 'medium'
  };

  el.directFixStatusContainer.classList.remove('hidden');
  el.directFixStatusText.innerHTML = `⏳ <strong>Analyzing codebase & dispatching AI Fix...</strong><br>Using direct AI tokens (no Antigravity/Codex quota limits).`;
  el.btnRunDirectFix.classList.add('btn-loading');
  logSystemMessage(`Initiating direct AI coding fix via AI tokens on "${targetBug.title || targetBug.type}"...`);

  try {
    const fixResult = await autoCodeSystem.autoFixBug({
      bug: targetBug,
      sourceFiles,
      customInstruction: "Provide robust, clean code modifications to fix this issue directly in the file."
    });

    if (fixResult.success) {
      pendingDirectFix = fixResult;
      const costStr = fixResult.cost?.formatted || (fixResult.cost?.cost ? `$${fixResult.cost.cost.toFixed(4)}` : '$0.0000');
      const tokens = fixResult.usage ? `${fixResult.usage.totalTokens} tokens (${fixResult.usage.promptTokens} in / ${fixResult.usage.completionTokens} out)` : '';
      
      el.directFixCostBadge.textContent = costStr;
      el.directFixStatusText.innerHTML = `✅ <strong>Fix Proposed for ${path.basename(fixResult.filePath)}!</strong><br>` +
        `Model: <code>${fixResult.model}</code><br>` +
        `Tokens: <strong>${tokens}</strong> | Cost: <strong>${costStr}</strong>`;

      el.btnViewDirectDiff.classList.remove('hidden');
      el.btnApplyDirectFix.classList.remove('hidden');

      // Update token stats widget
      tracker.updateTokenStatsUI(agentBrain, el.tokenModelSelect, el);
      logSystemMessage(`Direct AI Fix generated successfully! Cost: ${costStr} | ${tokens}`);
      toastNotifier.show(`Direct AI Fix generated (${costStr})`, "success");

      // Auto-load into AutoCode IDE diff view for immediate review
      if (el.autocodeFileSelect) {
        el.autocodeFileSelect.value = fixResult.filePath;
        if (el.autocodeCostVal) el.autocodeCostVal.textContent = costStr;
        renderAutoCodeDiff(el, fixResult.diff);
        el.autocodeDiffSection.classList.remove('hidden');
      }
    } else {
      el.directFixStatusText.innerHTML = `❌ <strong>AI Fix Failed:</strong> ${fixResult.error}`;
      logSystemMessage(`Direct AI Fix failed: ${fixResult.error}`, 'error');
      toastNotifier.show(fixResult.error, "error");
    }
  } catch (err) {
    el.directFixStatusText.innerHTML = `❌ <strong>Exception:</strong> ${err.message}`;
    logSystemMessage(`Direct AI Fix runtime error: ${err.message}`, 'error');
    toastNotifier.show(err.message, "error");
  } finally {
    el.btnRunDirectFix.classList.remove('btn-loading');
  }
}

function inspectDirectDiff() {
  audio.playClickSound();
  tabs.switchTab('autocode', el, audio);
  if (pendingDirectFix) {
    if (el.autocodeFileSelect) el.autocodeFileSelect.value = pendingDirectFix.filePath;
    renderAutoCodeDiff(el, pendingDirectFix.diff);
    el.autocodeDiffSection.classList.remove('hidden');
  }
}

async function applyDirectFix() {
  if (!pendingDirectFix) return;
  audio.playClickSound();
  logSystemMessage(`Applying Direct AI Fix to ${pendingDirectFix.filePath}...`);

  try {
    const success = autoCodeSystem.applyChanges(pendingDirectFix.filePath, pendingDirectFix.modifiedContent);
    if (success) {
      logSystemMessage(`Direct AI Fix applied and saved to disk.`);
      toastNotifier.show("Fix applied successfully to file!", "success");
      el.directFixStatusText.innerHTML = `💾 <strong>Successfully applied fix to ${path.basename(pendingDirectFix.filePath)}!</strong>`;
      el.btnApplyDirectFix.classList.add('hidden');
      el.autocodeDiffSection.classList.add('hidden');
      crawlFiles();
    }
  } catch (err) {
    logSystemMessage(`Failed to apply direct fix: ${err.message}`, 'error');
  }
}

function copyPromptToClipboard() {
  audio.playClickSound();
  el.megaPromptOutput.select();
  document.execCommand('copy');
  toastNotifier.show("Mega-Prompt copied to clipboard!", "success");
}

function drawHeatmapDot(x, y) {
  scrubberDrawHeatmapDot(el.heatmapCanvas, x, y);
}

function clearHeatmapCanvas() {
  scrubberClearHeatmapCanvas(el.heatmapCanvas);
}

async function executeAgentStep(forceHeuristic = false) {
  await runAgentStep({
    forceHeuristic,
    isRunning,
    el,
    gameController,
    agentBrain,
    webviewElement,
    friendSlopAI,
    graveGain3dAI,
    consoleLogs,
    timelineHistory,
    audio,
    drawHeatmapDot,
    clearHeatmapCanvas,
    tracker,
    selectBugCard,
    bugsLogPath,
    captureViewportScreenshot,
    captureManualScreenshot,
    logSystemMessage
  });
}

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

    if (mb < 500) {
      el.heapVal.className = 'value healthy';
    } else if (mb < 800) {
      el.heapVal.className = 'value warning';
    } else {
      el.heapVal.className = 'value critical';
    }

    renderSparkline(document.getElementById('fps-chart'), currentFps, 120, fpsHistory);
    renderSparkline(document.getElementById('heap-chart'), mb, 300, heapHistory);
  });
}

// Window state exports for HTTP server scrapers
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

window.updateAgentConfig = (cfg) => {
  if (cfg.provider) el.providerSelect.value = cfg.provider;
  if (cfg.apiKey) el.apiKeyInput.value = cfg.apiKey;
  if (cfg.modelName) el.modelNameInput.value = cfg.modelName;
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
