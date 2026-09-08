const fs = require('fs');
const path = require('path');
const { ipcRenderer, clipboard } = require('electron');
const AgentBrain = require('../automation/agent_brain');
const GameController = require('../automation/game_controller');
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
const rules = require('./modules/game_rules');
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
const { initVisionMirror } = require('./components/vision_mirror');
const visionState = require('./runtime/vision_state');
const { buildDetectScript, parseDetectResponse } = require('./runtime/vision_detect');
const { executeAgentStep: runAgentStep } = require('./runtime/agent_step_executor');
const displayManager = require('./runtime/display_manager');
const { WebEngineManager, DEFAULT_ENGINE } = require('./runtime/web_engine_manager');
const { ThinkingOutLoud } = require('./runtime/thinking_out_loud');

// Instantiate cores
const agentBrain = new AgentBrain();
const gameController = new GameController();
const autoCodeSystem = new AutoCodeSystem();
const thinkingOutLoud = new ThinkingOutLoud({ ipcRenderer });
// Unified web-engine driver: Ultralight is the default main engine.
// Electron = current setup viewport, Chromium = standalone headless.
// Bound lazily to GameController + live <webview> so compat fallbacks work.
const webEngineManager = new WebEngineManager({
  activeEngine: DEFAULT_ENGINE,
  getController: () => gameController,
  getWebview: () => webviewElement,
});
// Back-compat alias: legacy `ultralightEngine` references now resolve to the
// Ultralight member of the unified manager (still the default driver).
const ultralightEngine = webEngineManager.ultralight;

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
let agentStepBusy = false;
let agentScheduleTimer = null;
let invalidTestedApiKeyProviders = [];

function adaptiveAgentDelay() {
  const latest = timelineHistory[timelineHistory.length - 1];
  const type = latest?.action?.type;
  if (type === 'hold_key' || type === 'move_mouse') return 280;
  if (type === 'click' || type === 'press_key') return 420;
  if (type === 'wait') return 220;
  return 650;
}

function scheduleAgentStep() {
  clearTimeout(agentScheduleTimer);
  if (!isRunning) return;
  agentScheduleTimer = setTimeout(async () => {
    await executeAgentStep();
    scheduleAgentStep();
  }, adaptiveAgentDelay());
}
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

// AI Vision Mirror instance (dashboard panel mirroring the test window)
let visionMirror = null;

function queryElements() {
  el.providerSelect = document.getElementById('provider-select');
  el.apiKeyInput = document.getElementById('api-key');
  el.missingApiKeysModal = document.getElementById('missing-api-keys-modal');
  el.btnSetupApiKeys = document.getElementById('btn-setup-api-keys');
  el.btnIgnoreApiKeysWarning = document.getElementById('btn-ignore-api-keys-warning');
  el.btnCloseMissingApiKeys = document.getElementById('btn-close-missing-api-keys');
  el.apiKeysModal = document.getElementById('api-keys-modal');
  el.openaiApiKey = document.getElementById('openai-api-key');
  el.deepseekApiKey = document.getElementById('deepseek-api-key');
  el.geminiApiKey = document.getElementById('gemini-api-key');
  el.metaApiKey = document.getElementById('meta-api-key');
  el.openrouterApiKey = document.getElementById('openrouter-api-key');
  el.openaiApiKeySaved = document.getElementById('openai-api-key-saved');
  el.deepseekApiKeySaved = document.getElementById('deepseek-api-key-saved');
  el.geminiApiKeySaved = document.getElementById('gemini-api-key-saved');
  el.metaApiKeySaved = document.getElementById('meta-api-key-saved');
  el.openrouterApiKeySaved = document.getElementById('openrouter-api-key-saved');
  el.apiKeysStatus = document.getElementById('api-keys-status');
  el.btnSaveApiKeys = document.getElementById('btn-save-api-keys');
  el.btnCloseApiKeys = document.getElementById('btn-close-api-keys');
  el.btnTestApiKeys = document.getElementById('btn-test-api-keys');
  el.btnClearInvalidApiKeys = document.getElementById('btn-clear-invalid-api-keys');
  el.apiKeyTestResults = document.getElementById('api-key-test-results');
  el.localUrlGroup = document.getElementById('local-url-group');
  el.localUrlInput = document.getElementById('local-url');
  el.modelNameInput = document.getElementById('model-name');
  el.modelSelect = document.getElementById('model-select');
  el.customModelGroup = document.getElementById('custom-model-group');
  el.nativeProcessSelect = document.getElementById('native-process');
  el.nativeWindowMode = document.getElementById('native-window-mode');
  el.nativeWindowWidth = document.getElementById('native-window-width');
  el.nativeWindowHeight = document.getElementById('native-window-height');
  el.nativeWindowSizeGroup = document.getElementById('native-window-size-group');
  el.steamGame = document.getElementById('steam-game');
  el.nativeStartNewGame = document.getElementById('native-start-new-game');
  el.nativeSkipCutscenes = document.getElementById('native-skip-cutscenes');
  el.btnLaunchHl2 = document.getElementById('btn-launch-hl2');
  el.btnHubGridView = document.getElementById('btn-hub-grid-view');
  el.btnHubListView = document.getElementById('btn-hub-list-view');
  el.thinkingOutLoudToggle = document.getElementById('thinking-out-loud-toggle');
  el.commentaryPersonality = document.getElementById('commentary-personality');
  el.commentaryVoiceEngine = document.getElementById('commentary-voice-engine');
  el.commentaryVoice = document.getElementById('commentary-voice');
  el.thinkingOutLoudStatus = document.getElementById('thinking-out-loud-status');
  
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

  // OpenCode.ai Bridge elements (optional integration)
  el.opencodeEnable = document.getElementById('opencode-enable');
  el.opencodeMode = document.getElementById('opencode-mode');
  el.opencodeStatusDot = document.getElementById('opencode-status-dot');
  el.opencodeStatusText = document.getElementById('opencode-status-text');
  el.btnOpencodeStatus = document.getElementById('btn-opencode-status');
  el.btnOpencodeExport = document.getElementById('btn-opencode-export');
  el.btnOpencodeFix = document.getElementById('btn-opencode-fix');
  el.btnOpencodeHeal = document.getElementById('btn-opencode-heal');
  el.opencodeHealCmd = document.getElementById('opencode-heal-cmd');
  el.btnSmartHandoff = document.getElementById('btn-smart-handoff');
  el.smartHandoffPath = document.getElementById('smart-handoff-path');

  // Direct AI Fix & Token Report elements
  el.btnSelfImproveDsh = document.getElementById('btn-self-improve-dsh');
  el.btnLaunchDshWeb = document.getElementById('btn-launch-dsh-web');
  el.btnRunDirectFix = document.getElementById('btn-run-direct-fix');
  el.directFixStatusContainer = document.getElementById('direct-fix-status-container');
  el.directFixCostBadge = document.getElementById('direct-fix-cost-badge');
  el.directFixStatusText = document.getElementById('direct-fix-status-text');
  el.btnViewDirectDiff = document.getElementById('btn-view-direct-diff');
  el.btnApplyDirectFix = document.getElementById('btn-apply-direct-fix');

  // Network & Local REST API Server Port
  el.serverPortInput = document.getElementById('server-port');
  el.btnSavePort = document.getElementById('btn-save-port');

  // Unified web engine selector (ultralight default | electron | chromium)
  el.webEngineSelect = document.getElementById('web-engine-select');
  el.webEngineStatus = document.getElementById('web-engine-status');
  el.btnMultiEngineQA = document.getElementById('btn-multi-engine-qa');
}

// Coordinate setups on DOM load
document.addEventListener('DOMContentLoaded', () => {
  webviewElement = document.getElementById('game-webview');
  queryElements();
  thinkingOutLoud.attach(el);
  
  config.loadConfig(el, audio, agentBrain, autoCodeSystem, dataDir);
  // A missing key makes the agent fall back to a limited local explorer, so
  // make the requirement explicit before the user starts a playtest.
  setTimeout(() => {
    if (!config.hasAnyApiKey()) el.missingApiKeysModal?.classList.remove('hidden');
  }, 0);
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
    if (el.nativeProcessSelect?.value) {
      if (el.quickGameRules) el.gameRulesInput.value = el.quickGameRules.value.trim();
      if (!isRunning) toggleAgentState();
      return;
    }
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
  if (el.btnSelfImproveDsh) {
    el.btnSelfImproveDsh.addEventListener('click', runDeepSeekSelfImprovement);
  }
  if (el.btnLaunchDshWeb) {
    el.btnLaunchDshWeb.addEventListener('click', launchDshWebGui);
  }
  if (el.btnRunDirectFix) {
    el.btnRunDirectFix.addEventListener('click', runDirectAIFix);
  }
  if (el.btnViewDirectDiff) {
    el.btnViewDirectDiff.addEventListener('click', inspectDirectDiff);
  }
  if (el.btnApplyDirectFix) {
    el.btnApplyDirectFix.addEventListener('click', applyDirectFix);
  }
  if (el.btnSavePort) {
    el.btnSavePort.addEventListener('click', async () => {
      audio.playClickSound();
      const newPort = parseInt(el.serverPortInput.value) || 42069;
      saveConfigData();
      try {
        const res = await ipcRenderer.invoke('set-api-server-port', newPort);
        if (res && res.success) {
          toastNotifier.show(`API Server port updated to ${res.port}!`, 'success');
          logSystemMessage(`Local REST API Server restarted on port ${res.port}`, 'success');
        } else {
          toastNotifier.show(`Failed to change port: ${res?.error || 'Unknown error'}`, 'error');
          logSystemMessage(`Failed to change API port: ${res?.error}`, 'error');
        }
      } catch (err) {
        toastNotifier.show(`Port error: ${err.message}`, 'error');
      }
    });
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
  const nativeMissionName = () => Number(el.steamGame?.value) === 420
    ? 'Half-Life 2: Episode Two'
    : Number(el.steamGame?.value) === 3483 ? 'Peggle Deluxe' : 'Half-Life 2';
  const nativeMissionUrl = () => {
    const appId = Number(el.steamGame?.value);
    if (appId === 420) return 'native://steam/420/half-life-2-episode-two';
    if (appId === 3483) return 'native://steam/3483/peggle-deluxe';
    return 'native://steam/220/half-life-2';
  };
  const activateNativeMission = (windowTitle) => {
    const gameName = nativeMissionName();
    const nativeUrl = nativeMissionUrl();
    // A native game has no browser URL. Replace the previous web target in
    // the dashboard with the selected Steam game and its live window.
    if (el.gameUrlInput) el.gameUrlInput.value = nativeUrl;
    if (el.quickGameUrl) {
      el.quickGameUrl.value = `Native window — ${gameName}`;
      el.quickGameUrl.readOnly = true;
      el.quickGameUrl.setAttribute('aria-label', `Native playtest target: ${gameName}`);
    }
    if (el.quickGameRules && !el.quickGameRules.value.trim()) {
      el.quickGameRules.value = `Play ${gameName}; advance safely, report discoveries, and recover from menus or loading screens.`;
      if (el.gameRulesInput) el.gameRulesInput.value = el.quickGameRules.value;
    }
    const copy = document.querySelector('.quick-run-copy');
    if (copy) {
      const label = copy.querySelector('span');
      const title = copy.querySelector('strong');
      if (label) label.textContent = 'NATIVE GAME PLAYTEST';
      if (title) title.textContent = `${gameName} — attached to “${windowTitle}”`;
    }
    const banner = document.getElementById('game-status-banner');
    if (banner) banner.textContent = `Native target active: ${gameName}. The AI Relay below mirrors the live game window.`;
    document.getElementById('gamewindow-active-placeholder')?.classList.remove('hidden');
    webviewElement?.classList.add('hidden');
    saveConfigData();
  };
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
      activateNativeMission(el.nativeProcessSelect.value);
      el.btnToggleAgent.classList.remove('disabled');
      el.btnToggleAgent.removeAttribute('disabled');
      logSystemMessage(`Native target selected: "${el.nativeProcessSelect.value}". AI Play button is active.`);
      ipcRenderer.invoke('enable-native-game-overlay', el.nativeProcessSelect.value)
        .then(result => logSystemMessage(result?.success
          ? `Native overlay active for "${el.nativeProcessSelect.value}".`
          : `Native overlay could not start: ${result?.error || 'unknown error'}`, result?.success ? 'success' : 'warning'))
        .catch(err => logSystemMessage(`Native overlay error: ${err.message}`, 'warning'));
    } else {
      if (el.quickGameUrl) {
        el.quickGameUrl.readOnly = false;
        el.quickGameUrl.removeAttribute('aria-label');
      }
      if (!webviewElement.src || webviewElement.src === 'about:blank') {
        el.btnToggleAgent.classList.add('disabled');
        el.btnToggleAgent.setAttribute('disabled', 'true');
      }
    }
  });

  const syncNativeWindowControls = () => {
    const partial = el.nativeWindowMode && el.nativeWindowMode.value === 'partial-windowed';
    if (el.nativeWindowSizeGroup) el.nativeWindowSizeGroup.classList.toggle('hidden', !partial);
  };
  if (el.nativeWindowMode) {
    el.nativeWindowMode.addEventListener('change', syncNativeWindowControls);
    syncNativeWindowControls();
  }

  if (el.btnLaunchHl2) {
    el.btnLaunchHl2.addEventListener('click', async () => {
      const mode = el.nativeWindowMode ? el.nativeWindowMode.value : 'exclusive-fullscreen';
      const appId = parseInt(el.steamGame?.value, 10) || 420;
      const gameName = appId === 420 ? 'Half-Life 2: Episode Two' : appId === 3483 ? 'Peggle Deluxe' : 'Half-Life 2';
      const width = Math.max(640, parseInt(el.nativeWindowWidth?.value, 10) || 1280);
      const height = Math.max(480, parseInt(el.nativeWindowHeight?.value, 10) || 720);
      try {
        const result = await ipcRenderer.invoke('launch-steam-game', { appId, mode, width, height });
        if (!result?.success) throw new Error(result?.error || 'Steam did not accept the launch request');
        logSystemMessage(`${gameName} launch requested in ${result.modeLabel}. When its window appears, scan and select it to attach the agent.`, 'success');
      } catch (error) {
        logSystemMessage(`Could not launch ${gameName}: ${error.message}`, 'warning');
      }
    });
  }

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

  const { setupOpenCodeEventListeners } = require('./components/opencode_ui_controller');
  setupOpenCodeEventListeners({
    el,
    agentBrain,
    audio,
    toastNotifier,
    logSystemMessage,
    saveConfigData
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
    await runActiveEngineQA();
  });
  wireMenuItem('menu-item-engine-ultralight', () => setWebEngine('ultralight'));
  wireMenuItem('menu-item-engine-electron', () => setWebEngine('electron'));
  wireMenuItem('menu-item-engine-chromium', () => setWebEngine('chromium'));
  wireMenuItem('menu-item-engine-multi', async () => {
    audio.playClickSound();
    await runMultiEngineQA();
  });
  wireMenuItem('menu-item-heuristic', () => forceHeuristicStep());
  wireMenuItem('menu-item-mega-prompt', () => generateMegaPrompt());
  wireMenuItem('menu-item-save-replay', () => {
    saveReplayTrace({ replaysDir, timelineHistory, el, audio, toastNotifier, logSystemMessage });
  });
  wireMenuItem('menu-item-copy-logs', () => {
    if (el.btnCopy50Logs) el.btnCopy50Logs.click();
  });
  wireMenuItem('menu-item-api-keys', () => openApiKeysModal());

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
  if (el.btnCloseApiKeys) el.btnCloseApiKeys.addEventListener('click', () => el.apiKeysModal?.classList.add('hidden'));
  if (el.btnSetupApiKeys) el.btnSetupApiKeys.addEventListener('click', () => {
    el.missingApiKeysModal?.classList.add('hidden');
    openApiKeysModal();
  });
  const dismissMissingApiKeysWarning = () => el.missingApiKeysModal?.classList.add('hidden');
  if (el.btnIgnoreApiKeysWarning) el.btnIgnoreApiKeysWarning.addEventListener('click', dismissMissingApiKeysWarning);
  if (el.btnCloseMissingApiKeys) el.btnCloseMissingApiKeys.addEventListener('click', dismissMissingApiKeysWarning);
  if (el.btnSaveApiKeys) el.btnSaveApiKeys.addEventListener('click', () => {
    const result = config.saveApiKeyBundle({
      openai: el.openaiApiKey?.value,
      deepseek: el.deepseekApiKey?.value,
      gemini: el.geminiApiKey?.value,
      meta: el.metaApiKey?.value,
      openrouter: el.openrouterApiKey?.value
    });
    if (!result.success) {
      if (el.apiKeysStatus) el.apiKeysStatus.textContent = result.error;
      toastNotifier.show(result.error, 'warning');
      return;
    }
    const keys = config.loadApiKeyBundle();
    const activeKey = keys[el.providerSelect?.value] || '';
    if (activeKey) {
      el.apiKeyInput.value = activeKey;
      agentBrain.updateConfig({ apiKey: activeKey });
    }
    // Secure refresh: clear typed secrets from the DOM and show only
    // first-8...last-4 previews so full keys never linger in input values.
    refreshMaskedApiKeyDisplay();
    if (el.apiKeysStatus) el.apiKeysStatus.textContent = `Saved ${result.saved.join(', ')} key${result.saved.length === 1 ? '' : 's'} securely.`;
    toastNotifier.show('API keys saved securely', 'success');
    logSystemMessage(`Saved API key settings for ${result.saved.join(', ')}.`, 'success');
  });
  if (el.btnTestApiKeys) el.btnTestApiKeys.addEventListener('click', async () => {
    // Empty modal inputs mean "keep saved key": merge typed values over the
    // encrypted store so saved keys can be tested without ever displaying them.
    const stored = config.loadApiKeyBundle();
    const pick = (typed, saved) => (typed || '').trim() || saved || '';
    const keys = {
      openai: pick(el.openaiApiKey?.value, stored.openai),
      deepseek: pick(el.deepseekApiKey?.value, stored.deepseek),
      gemini: pick(el.geminiApiKey?.value, stored.gemini),
      meta: pick(el.metaApiKey?.value, stored.meta),
      openrouter: pick(el.openrouterApiKey?.value, stored.openrouter)
    };
    invalidTestedApiKeyProviders = [];
    el.btnTestApiKeys.disabled = true;
    if (el.btnClearInvalidApiKeys) el.btnClearInvalidApiKeys.disabled = true;
    if (el.apiKeyTestResults) {
      el.apiKeyTestResults.classList.remove('hidden');
      el.apiKeyTestResults.textContent = 'Testing entered keys…';
    }
    try {
      // Pass the configured endpoint so a Meta-direct key can be live-tested
      // against the user's meta.ai endpoint instead of OpenRouter.
      const response = await ipcRenderer.invoke('test-api-keys', {
        ...keys,
        endpointUrl: el.localUrlInput?.value || agentBrain.config.endpointUrl || ''
      });
      const results = response?.results || [];
      invalidTestedApiKeyProviders = results.filter((result) => result.status === 'invalid').map((result) => result.provider);
      if (el.apiKeyTestResults) {
        el.apiKeyTestResults.innerHTML = '';
        results.forEach((result) => {
          const line = document.createElement('div');
          line.className = `api-key-test-result-${result.status}`;
          line.textContent = `${result.provider.toUpperCase()}: ${result.detail}`;
          el.apiKeyTestResults.appendChild(line);
        });
      }
      if (el.btnClearInvalidApiKeys) el.btnClearInvalidApiKeys.disabled = invalidTestedApiKeyProviders.length === 0;
    } catch (error) {
      if (el.apiKeyTestResults) el.apiKeyTestResults.textContent = `Could not run key checks: ${error.message}`;
    } finally {
      el.btnTestApiKeys.disabled = false;
    }
  });
  if (el.btnClearInvalidApiKeys) el.btnClearInvalidApiKeys.addEventListener('click', () => {
    if (!invalidTestedApiKeyProviders.length) return;
    if (!config.clearInvalidApiKeyProviders(invalidTestedApiKeyProviders)) {
      toastNotifier.show('Could not clear invalid API keys.', 'error');
      return;
    }
    invalidTestedApiKeyProviders.forEach((provider) => {
      const input = provider === 'openai' ? el.openaiApiKey
        : provider === 'deepseek' ? el.deepseekApiKey
          : provider === 'gemini' ? el.geminiApiKey
          : provider === 'openrouter' ? el.openrouterApiKey
            : el.metaApiKey;
      if (input) input.value = '';
      if (el.providerSelect?.value === provider) {
        el.apiKeyInput.value = '';
        agentBrain.updateConfig({ apiKey: '' });
      }
    });
    if (el.apiKeyTestResults) el.apiKeyTestResults.textContent = 'Confirmed invalid API key entries cleared.';
    invalidTestedApiKeyProviders = [];
    el.btnClearInvalidApiKeys.disabled = true;
    refreshMaskedApiKeyDisplay();
    toastNotifier.show('Invalid API keys cleared', 'success');
  });

  setupWebEngineControls();
  setupWebviewListeners();
  setupDisplayToolbar();

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

  ipcRenderer.on('native-game-autodetected', (_event, title) => {
    if (!title || !el.nativeProcessSelect) return;
    let option = Array.from(el.nativeProcessSelect.options).find(o => o.value === title);
    if (!option) {
      option = document.createElement('option');
      option.value = title;
      option.textContent = `hl2 — "${title}"`;
      el.nativeProcessSelect.appendChild(option);
    }
    el.nativeProcessSelect.value = title;
    el.nativeProcessSelect.dispatchEvent(new Event('change'));
    logSystemMessage(`HL2 attached as native target: "${title}". Starting native play policy.`, 'success');
    if (!isRunning) toggleAgentState();
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
    if (visionMirror) visionMirror.idle();
  });

  // AI Vision Mirror: exact live mirror of the test window (game or
  // website) with object recognition, bot-mouse trail, and key HUD.
  visionMirror = initVisionMirror({
    ipcRenderer,
    visionState,
    buildDetectScript,
    parseDetectResponse,
    // Native games are captured from their selected game window, not the
    // browser preview that may have been open before attachment.
    captureFrame: captureViewportScreenshot,
    log: (msg) => logSystemMessage('[Vision] ' + msg)
  });
  visionMirror.start();
  
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
  hubUI.showHubWorkspace();

  const hubGrid = document.querySelector('.hub-grid');
  const setHubLayout = (layout) => {
    const list = layout === 'list';
    hubGrid?.classList.toggle('hub-list-view', list);
    el.btnHubGridView?.classList.toggle('is-selected', !list);
    el.btnHubListView?.classList.toggle('is-selected', list);
    el.btnHubGridView?.setAttribute('aria-pressed', String(!list));
    el.btnHubListView?.setAttribute('aria-pressed', String(list));
    localStorage.setItem('vibecodeworker.homeLayout', list ? 'list' : 'grid');
  };
  setHubLayout(localStorage.getItem('vibecodeworker.homeLayout') || 'grid');
  el.btnHubGridView?.addEventListener('click', () => setHubLayout('grid'));
  el.btnHubListView?.addEventListener('click', () => setHubLayout('list'));

  logSystemMessage("System dashboard loaded. Welcome Hub ready.");
  setTimeout(() => {
    populateQuickLaunchGrid(
      document.getElementById('quick-launch-grid'),
      el.demoGameSelect,
      () => selectDemo()
    );
  }, 600);

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

// ── Unified Web Engine controls (ultralight default | electron | chromium) ──
let webEngineBugForwarding = false;

function buildViewportExecutor() {
  return {
    navigate: async (url) => {
      try {
        const res = await ipcRenderer.invoke('open-game-window', url);
        return res;
      } catch (err) {
        if (webviewElement) webviewElement.src = url;
        return { success: true, url };
      }
    },
    getInteractiveDOM: async () => gameController.getInteractiveDOM(webviewElement),
    executeAction: async (action) => gameController.executeAction(webviewElement, action),
    executeJS: async (code) => gameController.executeJS(webviewElement, code),
    captureScreenshot: async () => gameController.captureScreenshot(webviewElement),
  };
}

function refreshWebEngineStatus() {
  if (!el.webEngineStatus) return;
  const active = webEngineManager.activeEngineId;
  const info = webEngineManager.describeEngines().find((e) => e.id === active);
  const backend = info && info.backend ? info.backend.backend : 'unknown';
  el.webEngineStatus.textContent = `Active: ${active} (${backend}) · default: ultralight`;
}

function setWebEngine(id) {
  const res = webEngineManager.setActiveEngine(id);
  if (!res.success) {
    toastNotifier.show(res.error, 'error');
    logSystemMessage(`[Web Engine] ${res.error}`, 'error');
    return res;
  }
  if (el.webEngineSelect) el.webEngineSelect.value = id;
  saveConfigData();
  refreshWebEngineStatus();
  logSystemMessage(`[Web Engine] Driving engine switched to ${id}${id === 'ultralight' ? ' (main/default)' : ''}.`);
  toastNotifier.show(`Web engine: ${id}`, 'success');
  return res;
}

async function runActiveEngineQA() {
  const url = el.gameUrlInput ? el.gameUrlInput.value.trim() : '';
  const active = webEngineManager.activeEngineId;
  logSystemMessage(`[${active} Engine] Initializing web automation pass on: ${url || 'active target'}`);
  toastNotifier.show(`${active} Web Auto-QA running...`, 'info');
  try {
    const executor = buildViewportExecutor();
    const engine = webEngineManager.getActiveEngine();
    if (url) await engine.navigate(url, executor);
    try {
      const dom = await engine.getInteractiveDOM(executor);
      logSystemMessage(`[${active} Engine] Interactive elements: ${Array.isArray(dom) ? dom.length : 0}`);
    } catch (e) {
      logSystemMessage(`[${active} Engine] DOM snapshot unavailable: ${e.message}`, 'warning');
    }
    const metrics = engine.getMetrics();
    logSystemMessage(`[${active} Engine] Metrics: ${JSON.stringify(metrics)}`);
    toastNotifier.show(`${active} Web QA completed: Target verified`, 'success');
    return metrics;
  } catch (err) {
    logSystemMessage(`[${active} Engine] QA pass failed: ${err.message}`, 'error');
    toastNotifier.show(`${active} QA failed`, 'error');
    return null;
  }
}

async function runMultiEngineQA() {
  const url = el.gameUrlInput ? el.gameUrlInput.value.trim() : '';
  if (!url) {
    toastNotifier.show('Load a target URL first.', 'warning');
    return null;
  }
  logSystemMessage('[Multi-Engine QA] Running ultralight + electron + chromium passes...');
  toastNotifier.show('Multi-engine QA running...', 'info');
  const executor = buildViewportExecutor();
  const { success, summary, results } = await webEngineManager.runMultiEngineQA(url, {
    executorProvider: () => executor,
  });
  if (!success) {
    logSystemMessage('[Multi-Engine QA] Failed to complete.', 'error');
    return null;
  }
  for (const [id, r] of Object.entries(results)) {
    logSystemMessage(`[Multi-Engine QA] ${id}: success=${r.success} dom=${r.domCount} consoleErr=${r.consoleErrors} netFail=${r.networkFailures} bugs=${r.diagnosedBugs} loadMs=${r.loadTime}`, r.success ? 'system' : 'error');
  }
  logSystemMessage(`[Multi-Engine QA] ${summary.note}`, summary.diverged ? 'warning' : 'system');
  toastNotifier.show(summary.diverged ? 'Multi-engine QA: divergences found' : 'Multi-engine QA: all engines agree', summary.diverged ? 'warning' : 'success');
  return { summary, results };
}

function setupWebEngineControls() {
  // Forward engine bug telemetry into the bug tracker exactly once.
  if (!webEngineBugForwarding) {
    webEngineBugForwarding = true;
    webEngineManager.on('bug_detected', (bug) => {
      agentBrain.bugs.unshift(bug);
      tracker.renderBugs(el.bugsContainer, el.bugCountBadge, agentBrain, selectBugCard);
      logSystemMessage(`[${bug.engine || 'engine'} QA Defect] ${bug.type}: ${bug.description}`, 'error');
    });
  }
  // Restore persisted engine choice (config.loadConfig already set the select).
  try {
    if (el.webEngineSelect && ['ultralight', 'electron', 'chromium'].includes(el.webEngineSelect.value)) {
      webEngineManager.setActiveEngine(el.webEngineSelect.value);
    }
  } catch (_) { /* default ultralight stays active */ }
  refreshWebEngineStatus();
  if (el.webEngineSelect) {
    el.webEngineSelect.addEventListener('change', () => setWebEngine(el.webEngineSelect.value));
  }
  if (el.btnMultiEngineQA) {
    el.btnMultiEngineQA.addEventListener('click', () => runMultiEngineQA());
  }
}

function saveConfigData() {
  config.saveConfig(el, audio, agentBrain, autoCodeSystem, dataDir);
}

function paintSavedKeyHint(input, hintEl, masked, label) {
  if (input) {
    // Never place the full secret in the DOM: inputs stay blank and only
    // accept a replacement key. The masked preview goes in placeholder/hint.
    input.value = '';
    input.placeholder = masked
      ? `Saved ${masked} — enter a new key to replace`
      : `Paste ${label} API key`;
  }
  if (hintEl) hintEl.textContent = masked ? `Saved: ${masked}` : 'Not set';
}

function refreshMaskedApiKeyDisplay() {
  const masked = config.loadMaskedApiKeyBundleForDisplay();
  paintSavedKeyHint(el.openaiApiKey, el.openaiApiKeySaved, masked.openai, 'an OpenAI');
  paintSavedKeyHint(el.deepseekApiKey, el.deepseekApiKeySaved, masked.deepseek, 'a DeepSeek');
  paintSavedKeyHint(el.geminiApiKey, el.geminiApiKeySaved, masked.gemini, 'a Google Gemini');
  paintSavedKeyHint(el.metaApiKey, el.metaApiKeySaved, masked.meta, 'a Meta');
  paintSavedKeyHint(el.openrouterApiKey, el.openrouterApiKeySaved, masked.openrouter, 'an OpenRouter');
}

function openApiKeysModal() {
  // Secure display: show only first-8...last-4 previews. Full keys stay in
  // the encrypted OS store + in-memory config and are never written into
  // input values, hint text, logs, or placeholders.
  refreshMaskedApiKeyDisplay();
  if (el.apiKeysStatus) el.apiKeysStatus.textContent = 'Keys stay in the encrypted per-user store, not config.json. Leave a field blank to keep its saved key.';
  invalidTestedApiKeyProviders = [];
  if (el.btnClearInvalidApiKeys) el.btnClearInvalidApiKeys.disabled = true;
  if (el.apiKeyTestResults) {
    el.apiKeyTestResults.textContent = '';
    el.apiKeyTestResults.classList.add('hidden');
  }
  el.apiKeysModal?.classList.remove('hidden');
}

function updateStatusBanner(text, type = 'ready') {
  setStatusBanner(el.gameStatusBanner, text, type);
}

function applyGameRulesText(text, sources) {
  if (!el.gameRulesInput) return;
  el.gameRulesInput.value = text;
  if (el.quickGameRules) el.quickGameRules.value = text;
  saveConfigData();
  const label = sources && sources.length ? sources.join(' + ') : 'defaults';
  logSystemMessage(`Game rules ready (${label}).`);
}

// Resolve this target's rules (game_meta.json > game.json) the moment it
// loads, then enrich with on-page rules once the guest page is ready. The
// merged text becomes the agent's Test Focus, so every 4weird HTML game is
// playtested with its own rules and zero per-game code.
function refreshGameRules(scrapePage) {
  const url = String(el.gameUrlInput?.value || '').trim();
  if (!url || url.startsWith('native://')) return;
  const dir = rules.gameDirFromUrl(url);
  const fileRules = rules.resolveFileGameRules(dir);
  if (fileRules.sources.length) applyGameRulesText(fileRules.text, fileRules.sources);
  if (!scrapePage || !webviewElement) return;
  const token = url;
  const baseSeen = () => new Set(
    String(el.gameRulesInput?.value || '').split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean)
  );
  const onReady = () => {
    if (String(el.gameUrlInput?.value || '').trim() !== token) return;
    webviewElement.executeJavaScript(rules.PAGE_RULES_SCRIPT).then((scrape) => {
      if (String(el.gameUrlInput?.value || '').trim() !== token) return;
      const page = rules.formatPageRules(scrape, baseSeen());
      if (!page.text) return;
      applyGameRulesText(rules.mergeRules(el.gameRulesInput.value, page.text), [...fileRules.sources, ...page.sources]);
    }).catch(() => { /* file rules already applied; page enrichment is best-effort */ });
  };
  webviewElement.addEventListener('did-finish-load', onReady, { once: true });
}

function loadGame() {
  if (el.nativeProcessSelect?.value || String(el.gameUrlInput?.value || '').startsWith('native://')) {
    if (el.nativeProcessSelect?.value) {
      const gameName = Number(el.steamGame?.value) === 420 ? 'Half-Life 2: Episode Two' : 'the selected native game';
      updateStatusBanner(`🎮 Native game ready: ${gameName}. Click 'START AI AGENT' to begin playtesting.`, 'ready');
      return;
    }
    toastNotifier.show('Select the running native game window in Native Engine Scanner first.', 'warning');
    return;
  }
  if (el.quickGameUrl && el.quickGameUrl.value !== el.gameUrlInput.value) el.quickGameUrl.value = el.gameUrlInput.value;
  if (el.quickGameRules && el.quickGameRules.value !== el.gameRulesInput.value) el.quickGameRules.value = el.gameRulesInput.value;
  webview.loadGameUrl(el.gameUrlInput, webviewElement, el.webviewPlaceholder, saveConfigData, crawlFiles, logSystemMessage);
  if (el.gameUrlInput.value) {
    updateStatusBanner("👉 Game ready! Click 'START AI AGENT' to begin playtesting", 'ready');
    if (hubUI) hubUI.showEditorWorkspace();
    // Per-game rules awareness: file rules now, on-page rules on guest load.
    refreshGameRules(true);
  }
}

function selectDemo() {
  const val = el.demoGameSelect.value;
  if (val) {
    el.gameUrlInput.value = val;
    if (el.quickGameUrl) el.quickGameUrl.value = val;
    saveConfigData();
    // loadGame() resolves this demo's rules (file + on-page) via
    // refreshGameRules; the legacy loadGameMeta path is superseded.
    loadGame();
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

    // Human is back in charge: park the virtual bot mouse.
    try { gameController.setBotControl(webviewElement, false); } catch (_) {}

    clearTimeout(agentScheduleTimer);
    clearInterval(executionTimer);
    clearInterval(fpsInterval);
  } else {
    isRunning = true;
    el.btnToggleAgent.innerHTML = '<span class="icon">⏸</span> PAUSE AI AGENT';
    el.btnToggleAgent.className = 'btn btn-warning btn-large-top';
    el.agentStateBadge.textContent = 'ACTIVE';
    el.agentStateBadge.className = 'badge active';
    logSystemMessage("AI Agent playtesting activated." + (cliMaxTicks() > 0 ? ` Tick cap: ${cliMaxTicks()}.` : ''));
    if (!agentBrain.config.apiKey) {
      logSystemMessage("No API key set — running offline explorer (clicks/scrolls/keys, no smart decisions). Add a key in Settings for full AI playtesting.", 'warning');
      toastNotifier.show('No API key: offline explorer mode', 'warning');
    }
    updateStatusBanner("🤖 AI Agent actively playtesting & scanning for bugs...", 'active');
    
    ipcRenderer.invoke('is-game-window-active').then(active => {
      if (!active && !el.nativeProcessSelect.value) {
        openExternalGameWindow();
      }
    });
    
    agentBrain.startSession();
    tracker.updateSessionStatsUI(agentBrain, el);

    // Bot takes the mouse: show the robot-emoji cursor in the test window.
    try { gameController.setBotControl(webviewElement, true); } catch (_) {}

    // Adapt cadence to the previous action so cheap movement stays responsive
    // without overlapping expensive vision/model requests.
    scheduleAgentStep();
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
    // Frame the real play area (not the page header) so the agent's next
    // screenshot shows the GAME at full size. Best-effort, runs in background.
    try {
      displayManager.ensureGameVisible({ webviewElement, gameController, log: (m) => logSystemMessage(m) })
        .then((m) => { updateDisplayReadout(m); })
        .catch(() => {});
    } catch (_) {}
    
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

function updateDisplayReadout(m) {
  try {
    const readout = document.getElementById('display-readout');
    if (!readout) return;
    const metrics = m || displayManager.currentMetrics();
    if (!metrics || !metrics.ok) {
      readout.textContent = 'viewport: —';
      return;
    }
    if (metrics.target === 'game-window') {
      readout.textContent = `viewport: game window ${metrics.width || '?'}x${metrics.height || '?'}${metrics.fullscreen ? ' fullscreen' : ''}`;
    } else {
      const play = metrics.play ? ` · play ${metrics.play.width}x${metrics.play.height}` : '';
      readout.textContent = `viewport: guest ${metrics.guestW}x${metrics.guestH}${play} (${metrics.method || 'webview'})`;
    }
  } catch (_) {}
}

function setupDisplayToolbar() {
  const bind = (id, fn) => {
    try {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', fn);
    } catch (_) {}
  };
  bind('btn-display-windowed', async () => {
    audio.playClickSound();
    const res = await displayManager.setDisplayMode('windowed', { width: 1920, height: 1080 });
    logSystemMessage(res && res.success ? `Display: HD window ${res.width}x${res.height}.` : `Display switch failed: ${(res && res.error) || 'unknown'}`);
  });
  bind('btn-display-fullscreen', async () => {
    audio.playClickSound();
    const res = await displayManager.setDisplayMode('fullscreen');
    logSystemMessage(res && res.success ? 'Display: fullscreen dashboard.' : `Display switch failed: ${(res && res.error) || 'unknown'}`);
  });
  bind('btn-center-game', async () => {
    audio.playClickSound();
    const m = await displayManager.ensureGameVisible({ webviewElement, gameController, log: (msg) => logSystemMessage(msg) });
    updateDisplayReadout(m);
  });
  // Seed the readout with the live main-process display config.
  displayManager.getDisplayConfig().then((cfg) => {
    if (cfg && (cfg.width || cfg.fullscreen)) {
      updateDisplayReadout({ ok: true, target: 'webview', guestW: cfg.width, guestH: cfg.height, method: cfg.mode || 'windowed' });
    }
  }).catch(() => {});
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

async function runDeepSeekSelfImprovement() {
  audio.playClickSound();
  el.directFixStatusContainer.classList.remove('hidden');
  el.directFixStatusText.innerHTML = `⚡ <strong>Dispatching DeepSeek Harness (dsh) Self-Improvement Loop...</strong><br>Analyzing engine telemetry, bottlenecks & generating precision codebase upgrade.`;
  if (el.btnSelfImproveDsh) el.btnSelfImproveDsh.classList.add('btn-loading');
  logSystemMessage("Starting DeepSeek Harness autonomous self-improvement cycle...");

  try {
    const { runSelfImprovementCycle } = require('../lib/deepseek_harness');
    const result = await runSelfImprovementCycle(agentBrain, {
      targetFile: path.join(__dirname, 'app.js'),
      goal: "Self-improve VibeCodeWorker runtime: optimize playtesting loop, eliminate stuck states, enhance model efficiency and resilience."
    });

    if (result && result.success) {
      el.directFixCostBadge.textContent = 'DeepSeek Harness';
      el.directFixStatusText.innerHTML = `✅ <strong>DeepSeek Self-Improvement Cycle Complete!</strong><br>` +
        `Model: <code>${result.model}</code> | Confidence: <strong>${Math.round(result.confidenceScore * 100)}%</strong><br>` +
        `Summary: <em>${result.changesSummary}</em><br>` +
        `Analysis: <span>${result.analysis}</span>`;
      
      logSystemMessage(`DeepSeek Harness self-improvement successful: ${result.changesSummary}`, 'success');
      toastNotifier.show("DeepSeek Self-Improvement synthesized successfully!", "success");

      // Generate a diff against the target file and display in AutoCode
      if (result.improvedCode && el.autocodeFileSelect) {
        const currentContent = fs.readFileSync(result.targetFile, 'utf8');
        const diff = autoCodeSystem.generateDiff(currentContent, result.improvedCode);
        pendingDirectFix = {
          filePath: result.targetFile,
          modifiedContent: result.improvedCode,
          diff
        };
        el.btnViewDirectDiff.classList.remove('hidden');
        el.btnApplyDirectFix.classList.remove('hidden');
      }
    } else {
      el.directFixStatusText.innerHTML = `❌ <strong>DeepSeek Harness Notice:</strong> ${result?.error || 'Self-improvement cycle completed with notices.'}`;
      logSystemMessage(`DeepSeek Harness: ${result?.error || 'Completed with notice'}`, 'warning');
    }
  } catch (err) {
    el.directFixStatusText.innerHTML = `❌ <strong>Harness Exception:</strong> ${err.message}`;
    logSystemMessage(`DeepSeek Harness error: ${err.message}`, 'error');
    toastNotifier.show(err.message, "error");
  } finally {
    if (el.btnSelfImproveDsh) el.btnSelfImproveDsh.classList.remove('btn-loading');
  }
}

async function launchDshWebGui() {
  audio.playClickSound();
  logSystemMessage("Launching DeepSeek Harness interactive Web GUI (npx @deepseek-ai/dsh web)...");
  toastNotifier.show("Launching DeepSeek Harness Web GUI...", "info");

  try {
    const { launchDeepSeekHarnessWeb } = require('../lib/deepseek_harness');
    const res = await launchDeepSeekHarnessWeb({
      apiKey: el.apiKeyInput.value,
      workspaceDir: path.resolve(__dirname, '..'),
      port: 3080
    });

    if (res.success) {
      logSystemMessage(`DeepSeek Harness Web GUI active at ${res.url}`, 'success');
      toastNotifier.show(`Harness Web GUI active on ${res.url}`, 'success');
      const { shell } = require('electron');
      shell.openExternal(res.url);
    } else {
      logSystemMessage(`Failed to launch DeepSeek Harness: ${res.error}`, 'error');
      toastNotifier.show(`Harness error: ${res.error}`, 'error');
    }
  } catch (e) {
    logSystemMessage(`Harness spawn failed: ${e.message}`, 'error');
    toastNotifier.show(e.message, "error");
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

function generateMegaPrompt() {
  audio.playClickSound();
  const localGamePath = webview.fileUrlToPath ? webview.fileUrlToPath(el.gameUrlInput.value) : '';
  const prompt = agentBrain.generateMegaPrompt(localGamePath, sourceFiles);
  el.megaPromptOutput.value = prompt;
  el.promptOutputContainer.classList.remove('hidden');
  logSystemMessage('Generated a repair prompt from the current playtest evidence.');
  toastNotifier.show('Repair prompt generated.', 'success');
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

// --max-ticks N / --ticks N caps an agent run at N steps, then auto-pauses.
// Default (no flag) is unlimited. Used for bounded smoke-test runs.
function cliMaxTicks() {
  try {
    const argv = window.cliArgs || [];
    for (let i = 0; i < argv.length; i++) {
      if ((argv[i] === '--max-ticks' || argv[i] === '--ticks') && argv[i + 1]) {
        return Math.min(20, Math.max(0, parseInt(argv[i + 1], 10) || 0));
      }
    }
  } catch (_) {}
  return 0;
}

async function executeAgentStep(forceHeuristic = false) {
  if (agentStepBusy && !forceHeuristic) return;
  if (!forceHeuristic) agentStepBusy = true;
  try {
  const maxTicks = cliMaxTicks();
  if (!forceHeuristic && maxTicks > 0 && agentBrain.sessionStats.steps >= maxTicks && isRunning) {
    logSystemMessage(`Tick cap reached (${agentBrain.sessionStats.steps}/${maxTicks}) - auto-pausing agent.`);
    toggleAgentState();
    return;
  }
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
    logSystemMessage,
    thinkingOutLoud,
    commentaryApiKey: () => el.apiKeyInput?.value || agentBrain.config.apiKey || ''
  });
  } finally {
    if (!forceHeuristic) agentStepBusy = false;
  }
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

// Display + game-framing API for the operator console, CLI-driven flows,
// and the dedicated game-runner brain. Lets the runner pick HD windowed,
// fullscreen, or the separate game window, and re-centre the play area:
//   await window.setDisplayMode('fullscreen')
//   await window.setDisplayMode('game-fullscreen')
//   await window.ensureGameVisible()
window.setDisplayMode = (mode, opts) => displayManager.setDisplayMode(mode, opts);
window.getDisplayConfig = () => displayManager.getDisplayConfig();
window.ensureGameVisible = () => displayManager.ensureGameVisible({ webviewElement, gameController, log: (m) => logSystemMessage(m) });
window.getGameViewMetrics = () => displayManager.currentMetrics();
