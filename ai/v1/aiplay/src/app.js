const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const AgentBrain = require('../agent_brain');
const GameController = require('../game_controller');

// Instantiate cores
const agentBrain = new AgentBrain();
const gameController = new GameController();

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

// Audio Synthesizer State
let audioCtx = null;
let isAudioEnabled = false;

// Path configurations
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const bugsLogPath = path.join(dataDir, 'bugs_log.json');
const replaysDir = path.join(dataDir, 'replays');

// DOM Elements
const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key');
const localUrlGroup = document.getElementById('local-url-group');
const localUrlInput = document.getElementById('local-url');
const modelNameInput = document.getElementById('model-name');
const modelSelect = document.getElementById('model-select');
const customModelGroup = document.getElementById('custom-model-group');
const nativeProcessSelect = document.getElementById('native-process');

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
const gameUrlInput = document.getElementById('game-url');
const btnLoadUrl = document.getElementById('btn-load-url');
const demoGameSelect = document.getElementById('demo-game-select');
const gameRulesInput = document.getElementById('game-rules');
const btnToggleAgent = document.getElementById('btn-toggle-agent');
const agentStateBadge = document.getElementById('agent-state-badge');
const fpsVal = document.getElementById('fps-val');
const heapVal = document.getElementById('heap-val');
const stuckVal = document.getElementById('stuck-val');
const webviewPlaceholder = document.getElementById('webview-placeholder');
const btnWebviewReload = document.getElementById('btn-webview-reload');
const btnWebviewDevtools = document.getElementById('btn-webview-devtools');
const btnManualShot = document.getElementById('btn-manual-shot');
const btnSimulateHeuristic = document.getElementById('btn-simulate-heuristic');
const logStream = document.getElementById('log-stream');
const btnClearLogs = document.getElementById('btn-clear-logs');
const brainScreenshot = document.getElementById('brain-screenshot');
const heatmapCanvas = document.getElementById('heatmap-overlay');
const brainReasoning = document.getElementById('brain-reasoning');
const bugsContainer = document.getElementById('bugs-container');
const bugCountBadge = document.getElementById('bug-count');
const btnGeneratePrompt = document.getElementById('btn-generate-prompt');
const promptOutputContainer = document.getElementById('prompt-output-container');
const megaPromptOutput = document.getElementById('mega-prompt-output');
const btnCopyPrompt = document.getElementById('btn-copy-prompt');
const btnSaveReplay = document.getElementById('btn-save-replay');
const replayStatusText = document.getElementById('replay-status-text');

// Sparkline/Timeline/Audio Synth Elements
const btnToggleAudio = document.getElementById('btn-toggle-audio');
const timelineContainer = document.getElementById('timeline-container');
const btnTimelinePlay = document.getElementById('btn-timeline-play');
const timelineScrubber = document.getElementById('timeline-scrubber');
const timelineTime = document.getElementById('timeline-time');

// Tabs and Code Explorer Elements
const tabLogs = document.getElementById('tab-logs');
const tabCode = document.getElementById('tab-code');
const codeStream = document.getElementById('code-stream');
const codeFileList = document.getElementById('code-file-list');
const codeContentView = document.getElementById('code-content-view');

// Token Stats Elements
const tokenLastRun = document.getElementById('token-last-run');
const tokenHourly = document.getElementById('token-hourly');
const tokenDaily = document.getElementById('token-daily');
const tokenWeekly = document.getElementById('token-weekly');
const tokenYearly = document.getElementById('token-yearly');
const tokenLifetime = document.getElementById('token-lifetime');
const tokenModelSelect = document.getElementById('token-model-select');

// Modal Elements
const bugModal = document.getElementById('bug-modal');
const modalBugTitle = document.getElementById('modal-bug-title');
const modalBugLogs = document.getElementById('modal-bug-logs');
const modalBugImg = document.getElementById('modal-bug-img');
const btnCloseModal = document.getElementById('btn-close-modal');

// Memory Toggle & Action Trail Elements
const toggleMemory = document.getElementById('toggle-memory');
const trailEntries = document.getElementById('trail-entries');

// Session Memory UI Elements
const sessSteps = document.getElementById('sess-steps');
const sessBugs = document.getElementById('sess-bugs');
const sessStuck = document.getElementById('sess-stuck');
const sessRecoveries = document.getElementById('sess-recoveries');
const actionMixEl = document.getElementById('action-mix');
const heatmapZonesEl = document.getElementById('heatmap-zones');

// Action trail ring buffer (last 5 actions)
let actionTrail = [];

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  webviewElement = document.getElementById('game-webview');
  
  // Load configuration from local storage
  loadSettings();
  
  // Populate local demo games dropdown
  populateDemoGames();
  
  // Load initial bugs database
  agentBrain.loadBugs(bugsLogPath);
  renderBugs();
  updateTokenStatsUI();
  
  // Event Bindings
  providerSelect.addEventListener('change', handleProviderChange);
  btnLoadUrl.addEventListener('click', loadGameUrl);
  demoGameSelect.addEventListener('change', selectDemoGame);
  btnToggleAgent.addEventListener('click', toggleAgentState);
  btnWebviewReload.addEventListener('click', reloadGame);
  btnWebviewDevtools.addEventListener('click', openGameDevTools);
  btnManualShot.addEventListener('click', takeManualSnapshot);
  btnSimulateHeuristic.addEventListener('click', forceHeuristicStep);
  btnClearLogs.addEventListener('click', clearLogView);
  btnGeneratePrompt.addEventListener('click', generateMegaPrompt);
  btnCopyPrompt.addEventListener('click', copyPromptToClipboard);
  btnSaveReplay.addEventListener('click', saveReplayFile);

  const btnScanProcesses = document.getElementById('btn-scan-processes');
  if (btnScanProcesses) {
    btnScanProcesses.addEventListener('click', async () => {
      playClickSound();
      logSystemMessage('Scanning running native processes...');
      const result = await ipcRenderer.invoke('scan-processes');
      if (result.success) {
        nativeProcessSelect.innerHTML = '<option value="">-- Scan / Select Game Window --</option>';
        if (result.processes && result.processes.length > 0) {
          result.processes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.MainWindowTitle;
            opt.textContent = `${p.ProcessName} (PID: ${p.Id}) - "${p.MainWindowTitle}"`;
            nativeProcessSelect.appendChild(opt);
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

  if (nativeProcessSelect) {
    nativeProcessSelect.addEventListener('change', () => {
      if (nativeProcessSelect.value) {
        btnToggleAgent.classList.remove('disabled');
        btnToggleAgent.removeAttribute('disabled');
        logSystemMessage(`Native target selected: "${nativeProcessSelect.value}". AI Play button is active.`);
      } else {
        if (!webviewElement.src || webviewElement.src === 'about:blank') {
          btnToggleAgent.classList.add('disabled');
          btnToggleAgent.setAttribute('disabled', 'true');
        }
      }
    });
  }

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      if (modelSelect.value === 'custom') {
        customModelGroup.classList.remove('hidden');
      } else {
        customModelGroup.classList.add('hidden');
        modelNameInput.value = modelSelect.value;
      }
      saveSettings();
    });
  }
  
  // Audio, Tabs and Timeline event listeners
  btnToggleAudio.addEventListener('click', toggleAudioSetting);
  tabLogs.addEventListener('click', () => switchTab('logs'));
  tabCode.addEventListener('click', () => switchTab('code'));
  
  timelineScrubber.addEventListener('input', handleTimelineScrub);
  btnTimelinePlay.addEventListener('click', resumeFromScrub);
  
  tokenModelSelect.addEventListener('change', updateTokenStatsUI);

  // Collapse / Expand Left & Right sidebars
  const btnToggleLeft = document.getElementById('btn-toggle-left');
  const btnToggleRight = document.getElementById('btn-toggle-right');
  const leftSidebar = document.querySelector('.control-panel');
  const rightSidebar = document.querySelector('.bug-panel');

  if (btnToggleLeft && leftSidebar) {
    btnToggleLeft.addEventListener('click', () => {
      leftSidebar.classList.toggle('collapsed');
      btnToggleLeft.classList.toggle('active');
      playClickSound();
    });
  }

  if (btnToggleRight && rightSidebar) {
    btnToggleRight.addEventListener('click', () => {
      rightSidebar.classList.toggle('collapsed');
      btnToggleRight.classList.toggle('active');
      playClickSound();
    });
  }

  // Episodic memory toggle
  if (toggleMemory) {
    toggleMemory.addEventListener('change', () => {
      agentBrain.config.alwaysSendMemory = toggleMemory.checked;
      saveSettings();
      logSystemMessage(`Episodic memory mode: ${toggleMemory.checked ? 'ALWAYS SEND (higher token cost)' : 'STUCK-ONLY (token-saving)'}`);
    });
  }
  
  // Close Modal binding
  btnCloseModal.addEventListener('click', () => bugModal.classList.add('hidden'));
  bugModal.classList.add('hidden'); // Ensure hidden at start
  
  // Webview Event setup
  setupWebviewListeners();

  // Listen to remote agent controls from local HTTP server
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
  
  // Auto-load last game if URL exists (wrapped in setTimeout to allow webview initialization)
  if (gameUrlInput.value) {
    setTimeout(() => {
      loadGameUrl();
      crawlCodeFiles();
    }, 500);
  }

  // Log message helper
  logSystemMessage("System dashboard loaded. Enter credentials and select target URL to begin.");
});

const configFilePath = path.join(__dirname, '..', 'config.json');

function populateModelsDropdown(provider) {
  if (!modelSelect) return;
  modelSelect.innerHTML = '';
  const models = modelsByProvider[provider] || [];
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.text;
    modelSelect.appendChild(opt);
  });
}

// Load Settings from config.json (gitignored) or fallback to LocalStorage
function loadSettings() {
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

  // Migrate deprecated nano model name to mini
  if (settings.modelName === 'gpt-5.4-nano-2026-03-17') {
    settings.modelName = 'gpt-5.4-mini-2026-03-17';
  }

  providerSelect.value = settings.provider || 'openai';
  apiKeyInput.value = settings.apiKey || '';
  localUrlInput.value = settings.localUrl || 'http://localhost:11434/api/chat';
  
  populateModelsDropdown(providerSelect.value);
  
  const savedModel = settings.modelName || 'gpt-5.4-mini-2026-03-17';
  const hasModelInSelect = Array.from(modelSelect.options).some(opt => opt.value === savedModel);
  if (hasModelInSelect) {
    modelSelect.value = savedModel;
    customModelGroup.classList.add('hidden');
    modelNameInput.value = savedModel;
  } else {
    modelSelect.value = 'custom';
    customModelGroup.classList.remove('hidden');
    modelNameInput.value = savedModel;
  }

  gameRulesInput.value = settings.gameRules || '';
  gameUrlInput.value = settings.gameUrl || '';
  isAudioEnabled = settings.isAudioEnabled || false;
  btnToggleAudio.textContent = isAudioEnabled ? '🔊' : '🔇';
  if (toggleMemory) {
    const alwaysMem = settings.alwaysSendMemory || false;
    toggleMemory.checked = alwaysMem;
    agentBrain.config.alwaysSendMemory = alwaysMem;
  }

  // Load persisted session memory
  agentBrain.updateConfig({ dataDir });
  agentBrain.loadSessionMemory();
  updateSessionStatsUI();

  handleProviderChange(true);
}

// Save Settings to config.json (gitignored) and LocalStorage
function saveSettings() {
  const modelToSave = modelSelect.value === 'custom' ? modelNameInput.value : modelSelect.value;
  const settings = {
    provider: providerSelect.value,
    apiKey: apiKeyInput.value,
    localUrl: localUrlInput.value,
    modelName: modelToSave,
    gameRules: gameRulesInput.value,
    gameUrl: gameUrlInput.value,
    isAudioEnabled: isAudioEnabled,
    alwaysSendMemory: toggleMemory ? toggleMemory.checked : false
  };
  localStorage.setItem('ai_debugger_settings', JSON.stringify(settings));

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write settings to config.json", e);
  }
  
  // Sync to agent brain
  agentBrain.updateConfig({
    provider: settings.provider,
    apiKey: settings.apiKey,
    endpointUrl: settings.localUrl,
    modelName: settings.modelName,
    gameRules: settings.gameRules,
    dataDir: dataDir
  });
}

// Adjust UI layout depending on Cloud or Local API selection
function handleProviderChange(skipSave = false) {
  const val = providerSelect.value;
  
  populateModelsDropdown(val);
  
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
    saveSettings();
  }
}

// Audio synthesizer logic using Web Audio API
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSynth(frequency, type, duration) {
  if (!isAudioEnabled) return;
  try {
    initAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Cyber slide pitch sweep
    if (type === 'sine') {
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.6, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.warn("Synth playback failed:", err);
  }
}

function toggleAudioSetting() {
  isAudioEnabled = !isAudioEnabled;
  btnToggleAudio.textContent = isAudioEnabled ? '🔊' : '🔇';
  saveSettings();
  playSynth(600, 'sine', 0.1);
}

function playAgentActionSound() { playSynth(260, 'triangle', 0.12); }
function playBugAlertSound() { playSynth(160, 'sawtooth', 0.35); }
function playClickSound() { playSynth(880, 'sine', 0.08); }

// UI Tabs Switcher (Logs vs Code Explorer)
function switchTab(tab) {
  playClickSound();
  if (tab === 'logs') {
    tabLogs.classList.add('active');
    tabCode.classList.remove('active');
    logStream.classList.remove('hidden');
    codeStream.classList.add('hidden');
  } else {
    tabLogs.classList.remove('active');
    tabCode.classList.add('active');
    logStream.classList.add('hidden');
    codeStream.classList.remove('hidden');
  }
}

// Auto-crawls demo HTML games directory
function populateDemoGames() {
  try {
    // Traverse from aiplay root to website/v1/games/html
    const localGamesDir = path.join(__dirname, '..', '..', '..', '..', 'website', 'v1', 'games', 'html');
    
    if (fs.existsSync(localGamesDir)) {
      const items = fs.readdirSync(localGamesDir);
      for (const item of items) {
        const fullPath = path.join(localGamesDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && item !== '_TEMPLATE' && item !== 'images') {
          const indexFile = path.join(fullPath, 'index.html');
          if (fs.existsSync(indexFile)) {
            const option = document.createElement('option');
            option.value = 'file:///' + indexFile.replace(/\\/g, '/');
            option.textContent = item;
            demoGameSelect.appendChild(option);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not load local demo games. Probably running outside standard repo folder structure.", err);
  }
}

// Selects demo game and fills game target URL input
function selectDemoGame() {
  const val = demoGameSelect.value;
  if (val) {
    gameUrlInput.value = val;
    saveSettings();
    loadGameUrl();
    crawlCodeFiles();
    // Auto-load game_meta.json if it exists alongside the index.html
    loadGameMeta(val);
  }
}

// Converts a file:/// URL to a native filesystem path (cross-platform)
function fileUrlToPath(fileUrl) {
  if (!fileUrl.startsWith('file:///')) return '';
  let p = decodeURIComponent(fileUrl.slice('file:///'.length));
  if (process.platform !== 'win32') {
    p = '/' + p;
  } else {
    p = p.replace(/\//g, '\\');
  }
  return p;
}

// Load game_meta.json for a given local file:// URL and populate game rules
function loadGameMeta(fileUrl) {
  try {
    if (!fileUrl.startsWith('file:///')) return;
    const indexPath = fileUrlToPath(fileUrl);
    const gameDir = path.dirname(indexPath);
    const metaPath = path.join(gameDir, 'game_meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const rulesText = [
        meta.objective ? `Objective: ${meta.objective}` : '',
        meta.controls ? `Controls: ${meta.controls}` : '',
        meta.win_condition ? `Win condition: ${meta.win_condition}` : '',
        meta.avoid ? `Avoid: ${meta.avoid}` : '',
        meta.tips ? `Tips: ${meta.tips}` : ''
      ].filter(Boolean).join('\n');
      gameRulesInput.value = rulesText;
      saveSettings();
      logSystemMessage(`Game meta loaded for "${meta.name || 'unknown'}". Rules auto-populated.`);
    }
  } catch (e) {
    console.warn('Could not load game_meta.json:', e);
  }
}

// Pre-crawls files to load into source explorer
async function crawlCodeFiles() {
  const currentUrl = gameUrlInput.value;
  let localGamePath = '';
  
  if (currentUrl.startsWith('file:///')) {
    localGamePath = path.dirname(fileUrlToPath(currentUrl));
  } else {
    const urlParts = currentUrl.split('/');
    const gameName = urlParts[urlParts.length - 2];
    const localGamesDir = path.join(__dirname, '..', '..', '..', '..', 'website', 'v1', 'games', 'html', gameName);
    if (fs.existsSync(localGamesDir)) {
      localGamePath = localGamesDir;
    }
  }

  if (localGamePath) {
    const scanResult = await ipcRenderer.invoke('scan-directory', localGamePath);
    if (scanResult.success) {
      sourceFiles = scanResult.files;
      renderFileList();
    }
  }
}

// Render source code file explorer list
function renderFileList() {
  codeFileList.innerHTML = '';
  if (sourceFiles.length === 0) {
    codeFileList.innerHTML = `<div class="empty-state">No source files crawled yet. Select and run a local game demo.</div>`;
    return;
  }

  sourceFiles.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.textContent = file.path;
    item.addEventListener('click', () => {
      // Highlight selection
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      // Load source text
      codeContentView.textContent = file.content;
      playClickSound();
    });
    codeFileList.appendChild(item);
  });
}

// Configures and intercepts webview messages
function setupWebviewListeners() {
  webviewElement.addEventListener('did-start-loading', () => {
    logSystemMessage("Game frame loading...");
  });

  webviewElement.addEventListener('did-stop-loading', () => {
    logSystemMessage("Game loaded successfully. AI play button is now active.");
    btnToggleAgent.classList.remove('disabled');
    btnToggleAgent.removeAttribute('disabled');
    webviewPlaceholder.classList.add('hidden');
    
    // Start tracking frame updates for FPS estimation
    startFpsTracker();
    crawlCodeFiles();
  });

  webviewElement.addEventListener('did-fail-load', (e) => {
    if (e.errorCode === -3) return; // Ignore aborted navigations (e.g. redirects)
    logMessage(`Game failed to load: [${e.errorCode}] ${e.errorDescription} - ${e.validatedURL}`, 'error');
    webviewPlaceholder.classList.remove('hidden');
  });

  webviewElement.addEventListener('console-message', (e) => {
    let type = 'system';
    if (e.level === 1) type = 'warning';
    if (e.level === 2) type = 'error';
    
    const formattedMsg = `[Webview Console] ${e.message}`;
    logMessage(formattedMsg, type);
    
    // Push logs to context
    consoleLogs.push({
      timestamp: new Date().toLocaleTimeString(),
      level: e.level, // 0 = Info, 1 = Warning, 2 = Error
      message: e.message
    });
    
    // Limit log context size
    if (consoleLogs.length > 50) {
      consoleLogs.shift();
    }
  });

  // Listen to events from the separate game window
  ipcRenderer.on('webview-console', (event, e) => {
    let type = 'system';
    if (e.level === 1) type = 'warning';
    if (e.level === 2) type = 'error';
    
    const formattedMsg = `[Game Window Console] ${e.message}`;
    logMessage(formattedMsg, type);
    
    consoleLogs.push({
      timestamp: new Date().toLocaleTimeString(),
      level: e.level,
      message: e.message
    });
    
    if (consoleLogs.length > 50) {
      consoleLogs.shift();
    }
  });

  ipcRenderer.on('webview-loaded', () => {
    logSystemMessage("Game window loaded successfully. AI play button is now active.");
    btnToggleAgent.classList.remove('disabled');
    btnToggleAgent.removeAttribute('disabled');
    webviewPlaceholder.classList.add('hidden');
    
    startFpsTracker();
    crawlCodeFiles();
  });

  ipcRenderer.on('webview-fail-load', (event, e) => {
    logMessage(`Game window failed to load: [${e.errorCode}] ${e.errorDescription} - ${e.validatedURL}`, 'error');
  });

  ipcRenderer.on('webview-closed', () => {
    logSystemMessage("Game window closed.");
    document.getElementById('gamewindow-active-placeholder').classList.add('hidden');
    webviewPlaceholder.classList.remove('hidden');
    webviewElement.classList.remove('hidden');
  });
}

// Load url in webview/game window
function loadGameUrl() {
  const url = gameUrlInput.value.trim();
  if (!url) {
    alert("Please enter a valid URL or select a local demo.");
    return;
  }
  
  saveSettings();
  consoleLogs = [];
  logStream.innerHTML = '';
  
  ipcRenderer.invoke('open-game-window', url).then(() => {
    document.getElementById('gamewindow-active-placeholder').classList.remove('hidden');
    webviewPlaceholder.classList.add('hidden');
    webviewElement.classList.add('hidden');
  }).catch(err => {
    console.warn("Failed to open separate game window, falling back to embedded webview:", err);
    webviewElement.src = url;
    document.getElementById('gamewindow-active-placeholder').classList.add('hidden');
  });
}

// Enable/Disable AI Loop Run
function toggleAgentState() {
  saveSettings(); // Ensure latest settings are pushed to brain
  playClickSound();
  
  if (isRunning) {
    isRunning = false;
    btnToggleAgent.innerHTML = `<span class="icon">▶</span> START AI AGENT`;
    btnToggleAgent.classList.remove('btn-warning');
    btnToggleAgent.classList.add('btn-primary');
    agentStateBadge.textContent = "PAUSED";
    agentStateBadge.className = "badge paused";
    
    clearTimeout(executionTimer);
    logSystemMessage("AI Playtest Agent PAUSED.");
    
    // End active token run
    agentBrain.endCurrentRun();
    
    // Show timeline scrubber when paused
    showScrubberTimeline();
  } else {
    isRunning = true;
    btnToggleAgent.innerHTML = `<span class="icon">⏸</span> PAUSE AI AGENT`;
    btnToggleAgent.classList.remove('btn-primary');
    btnToggleAgent.classList.add('btn-warning');
    agentStateBadge.textContent = "PLAYING";
    agentStateBadge.className = "badge active";
    
    // Reset scrubber timeline on restart
    timelineContainer.classList.add('hidden');
    timelineHistory = [];
    isScrubbing = false;
    
    // Start active token run track
    agentBrain.startNewRun();
    
    logSystemMessage("AI Playtest Agent STARTED.");
    runAgentLoop();
  }
}

// Loop execution step ticker
async function runAgentLoop() {
  if (!isRunning) return;

  try {
    let screenshot;
    let domSnapshot = [];
    let metrics = { heapUsed: 0 };
    const nativeTarget = nativeProcessSelect ? nativeProcessSelect.value : '';

    if (nativeTarget) {
      const result = await ipcRenderer.invoke('capture-native-screenshot', nativeTarget);
      if (result.success) {
        screenshot = result.base64;
      } else {
        throw new Error(`Failed to capture native screenshot: ${result.error}`);
      }
    } else {
      // 1. Capture screen & metadata
      screenshot = await gameController.captureScreenshot(webviewElement);
      domSnapshot = await gameController.getInteractiveDOM(webviewElement);
      metrics = await gameController.getPerformanceMetrics(webviewElement);
    }

    // Update performance indicators
    let heapMB = 0;
    if (metrics && metrics.heapUsed > 0) {
      heapMB = Math.round(metrics.heapUsed / (1024 * 1024));
      heapVal.textContent = `${heapMB} MB`;
    } else {
      heapVal.textContent = '-- MB';
    }
    
    const currentHash = agentBrain.simpleHash(screenshot);
    const isStuckCount = agentBrain.episodes.slice(-3).filter(h => h.screenshotHash === currentHash).length;
    stuckVal.textContent = `${isStuckCount}/3`;

    // Display frame in brain preview
    brainScreenshot.src = `data:image/jpeg;base64,${screenshot}`;
    
    // Update live-stream preview image
    const liveFeedImg = document.getElementById('live-stream-image');
    if (liveFeedImg) {
      liveFeedImg.src = `data:image/jpeg;base64,${screenshot}`;
    }

    // 2. Call brain step process
    logMessage("Analyzing game frame...", "system");
    const result = await agentBrain.processStep(screenshot, consoleLogs, domSnapshot, bugsLogPath);

    // Refresh Token Stats in real-time
    updateTokenStatsUI();

    // Play action step sound
    playAgentActionSound();

    // 3. Render reasoning and logs
    brainReasoning.innerHTML = `<strong>Reasoning:</strong> ${result.reasoning}`;
    logMessage(`Agent decided: ${result.action.type} -> ${result.action.target || 'N/A'}`, "agent");

    // Clear and draw click location on overlay canvas
    drawHeatmapClick(result.action);

    // 4. Record snapshot into Timeline Trace Player
    timelineHistory.push({
      screenshot: screenshot,
      action: result.action,
      reasoning: result.reasoning,
      logs: [...consoleLogs],
      fps: currentFps,
      heap: heapMB,
      stuck: isStuckCount
    });

    // 5. Render bugs if updated
    if (result.bug_report && result.bug_report.has_bug) {
      logMessage(`BUG DETECTED: [${result.bug_report.severity.toUpperCase()}] ${result.bug_report.description}`, "error");
      playBugAlertSound();
      renderBugs();
    }

    // 6. Update action trail (last 5)
    const trailEntry = `${result.action.type}${result.action.target ? ':' + result.action.target : ''}`;
    actionTrail.push(trailEntry);
    if (actionTrail.length > 5) actionTrail.shift();
    if (trailEntries) {
      trailEntries.innerHTML = actionTrail
        .map((t, i) => `<span class="trail-step ${i === actionTrail.length - 1 ? 'trail-latest' : ''}">${t}</span>`)
        .join('<span class="trail-arrow"> → </span>');
    }

    // 7. Update session stats UI
    updateSessionStatsUI();

    // 8. Execute action inside webview / native process
    await gameController.executeAction(webviewElement, result.action, nativeTarget);

    // Schedule next run with adaptive delay
    const MIN_DELAY = 100;
    const MAX_DELAY = 5000;
    let delay = 1800;
    if (result.action.type === 'wait') {
      delay = result.action.duration_ms || 1000;
    } else if (typeof result.next_delay_ms === 'number') {
      delay = Math.min(MAX_DELAY, Math.max(MIN_DELAY, result.next_delay_ms));
    }
    executionTimer = setTimeout(runAgentLoop, delay);

  } catch (err) {
    logMessage(`Loop Error: ${err.message}`, "error");
    executionTimer = setTimeout(runAgentLoop, 3000); // Wait longer on failures
  }
}

// Renders sparkline trends inside canvas contexts
function drawSparkline(canvasId, data, maxVal, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (data.length < 2) return;

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;

  const stepX = canvas.width / (data.length - 1);
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const normY = maxVal > 0 ? (data[i] / maxVal) : 0.5;
    const y = canvas.height - (normY * (canvas.height - 4)) - 2;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

// Timeline Player Scrub Event handler
function handleTimelineScrub() {
  if (timelineHistory.length === 0) return;
  
  isScrubbing = true;
  currentScrubIndex = parseInt(timelineScrubber.value);
  
  const snap = timelineHistory[currentScrubIndex];
  if (!snap) return;

  // Draw scrub state in app UI
  brainScreenshot.src = `data:image/jpeg;base64,${snap.screenshot}`;
  brainReasoning.innerHTML = `<strong>[Trace Scrubbing] Reasoning:</strong> ${snap.reasoning}`;
  fpsVal.textContent = snap.fps;
  heapVal.textContent = `${snap.heap} MB`;
  stuckVal.textContent = `${snap.stuck}/3`;
  timelineTime.textContent = `Tick: ${currentScrubIndex + 1}/${timelineHistory.length}`;
  
  // Re-draw heatmap coordinates
  drawHeatmapClick(snap.action);
  
  // Synthesize sliding tick
  playSynth(440 + (currentScrubIndex * 20), 'sine', 0.04);
}

// Resume playback of trace scrubber
function resumeFromScrub() {
  playClickSound();
  if (isRunning) {
    // If agent is active, pause it to let developer scrub
    toggleAgentState();
  } else {
    // If paused, dragging scrubber sets historical state. Clicking play resumes tick loop
    timelineContainer.classList.add('hidden');
    isRunning = true;
    btnToggleAgent.innerHTML = `<span class="icon">⏸</span> PAUSE AI AGENT`;
    btnToggleAgent.classList.remove('btn-primary');
    btnToggleAgent.classList.add('btn-warning');
    agentStateBadge.textContent = "PLAYING";
    agentStateBadge.className = "badge active";
    
    // Start a new run for token tracking when resuming from scrubber
    agentBrain.startNewRun();

    // Cut history to scrubber index to avoid timeline splits
    timelineHistory = timelineHistory.slice(0, currentScrubIndex + 1);
    runAgentLoop();
  }
}

// Draws simulated click on heatmap canvas overlay
function drawHeatmapClick(action) {
  const ctx = heatmapCanvas.getContext('2d');
  ctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
  
  if (action.type === 'click' && typeof action.target === 'string' && action.target.includes(',')) {
    const coords = action.target.split(',');
    const x = parseInt(coords[0]);
    const y = parseInt(coords[1]);
    
    // Scale coordinates based on visual bounds
    const parentWidth = heatmapCanvas.parentElement.clientWidth;
    const parentHeight = heatmapCanvas.parentElement.clientHeight;
    heatmapCanvas.width = parentWidth;
    heatmapCanvas.height = parentHeight;
    
    // Webview viewport dimensions inside Electron (normally standard 1000px scale)
    const scaleX = (x / 1000) * parentWidth;
    const scaleY = (y / 1000) * parentHeight;

    ctx.beginPath();
    ctx.arc(scaleX, scaleY, 12, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f2fe';
    ctx.stroke();
  }
}

// Renders bug cards from memory
function renderBugs() {
  bugsContainer.innerHTML = '';
  bugCountBadge.textContent = agentBrain.bugs.length;
  
  if (agentBrain.bugs.length === 0) {
    bugsContainer.innerHTML = `<div class="empty-state">No bugs identified yet. Run the playtest agent to scan.</div>`;
    return;
  }

  // Iterate backwards to show latest first
  for (let i = agentBrain.bugs.length - 1; i >= 0; i--) {
    const bug = agentBrain.bugs[i];
    const card = document.createElement('div');
    card.className = 'bug-card';
    card.innerHTML = `
      <div class="bug-meta">
        <span class="bug-severity ${bug.severity}">${bug.severity}</span>
        <span>${new Date(bug.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="bug-desc">${bug.description}</div>
    `;
    
    // Bind click to open detailed modal view
    card.addEventListener('click', () => {
      playClickSound();
      openBugModal(bug);
    });
    bugsContainer.appendChild(card);
  }
}

// Opens the detail modal displaying console outputs and captured frame
function openBugModal(bug) {
  modalBugTitle.textContent = `Bug Detail [Severity: ${bug.severity.toUpperCase()}]`;
  modalBugLogs.textContent = bug.consoleLogs.length > 0 
    ? bug.consoleLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\n')
    : "No console warnings or exceptions recorded at frame trigger.";
  
  modalBugImg.src = bug.screenshot;
  bugModal.classList.remove('hidden');
}

// Automates crawling local files and generating the Devin Mega-prompt
async function generateMegaPrompt() {
  playClickSound();
  logSystemMessage("Generating mega-prompt code bundle...");
  
  const currentUrl = gameUrlInput.value;
  let filesContext = '';
  let localGamePath = '';

  // 1. Try to extract local path from game URL
  if (currentUrl.startsWith('file:///')) {
    const filePath = currentUrl.replace('file:///', '');
    // Get directory of index.html
    localGamePath = path.dirname(filePath);
  } else {
    // Check if it matches a demo key in website directories
    const urlParts = currentUrl.split('/');
    const gameName = urlParts[urlParts.length - 2]; // e.g. orbitaldrift
    const localGamesDir = path.join(__dirname, '..', '..', '..', '..', 'website', 'v1', 'games', 'html', gameName);
    if (fs.existsSync(localGamesDir)) {
      localGamePath = localGamesDir;
    }
  }

  // 2. Scan folder if path exists
  if (localGamePath) {
    logSystemMessage(`Scanning local files in: ${localGamePath}`);
    const scanResult = await ipcRenderer.invoke('scan-directory', localGamePath);
    if (scanResult.success) {
      logSystemMessage(`Successfully scanned ${scanResult.files.length} code files.`);
      filesContext = scanResult.files.map(f => {
        return `### File: ${f.path}\n\`\`\`${path.extname(f.path).substring(1)}\n${f.content}\n\`\`\`\n`;
      }).join('\n');
    } else {
      logMessage(`Failed to scan files: ${scanResult.error}`, "warning");
    }
  } else {
    logMessage("Game URL is remote or local source directory could not be resolved automatically. Prompt will exclude code files.", "warning");
  }

  // 3. Compile prompt markdown
  const bugReportsMarkdown = agentBrain.bugs.length > 0
    ? agentBrain.bugs.map((b, idx) => {
        return `#### Bug #${idx+1} [${b.severity.toUpperCase()}]
- **Timestamp**: ${b.timestamp}
- **Description**: ${b.description}
- **Actions Leading Up**: ${JSON.stringify(b.actionTakenBeforeBug)}
- **Errors/Console**: 
\`\`\`
${b.consoleLogs.map(l => l.message).join('\n') || 'None'}
\`\`\``;
      }).join('\n\n')
    : "No bugs explicitly flagged by the agent yet.";

  const promptText = `# Game Bug Resolution Task

You are an expert game developer agent. Your task is to fix the bugs and add the requested features/improvements noted during our automated AI playtest run.

## Game Context
- **Target Source Directory**: ${localGamePath || "Remote URL"}
- **Playtest Replay Actions**: ${JSON.stringify(agentBrain.replayActions.slice(-20))}

## Logged Bugs & Glitches
${bugReportsMarkdown}

## Game Codebase Context
Below are the source files of the game:

${filesContext || "*No code files were auto-detected. Please locate and modify code files manually based on the logs.*"}

## Instructions
1. Review the logged bugs and compare them with the code snippets above.
2. Locate the logic errors or visual glitches (e.g. infinite loops, broken state-updates, missing event boundaries).
3. Apply code fixes directly to resolve the bugs.
4. Verify the gameplay runs normally without exceptions.
`;

  megaPromptOutput.value = promptText;
  promptOutputContainer.classList.remove('hidden');
  logSystemMessage("Mega-prompt generated! Ready to copy.");
}

// Copy prompt text to clipboard
function copyPromptToClipboard() {
  playClickSound();
  navigator.clipboard.writeText(megaPromptOutput.value).then(() => {
    btnCopyPrompt.textContent = "Copied!";
    setTimeout(() => {
      btnCopyPrompt.textContent = "Copy";
    }, 2000);
  }).catch(() => {
    megaPromptOutput.select();
    document.execCommand('copy');
    btnCopyPrompt.textContent = "Copied!";
    setTimeout(() => {
      btnCopyPrompt.textContent = "Copy";
    }, 2000);
  });
}

// Save play session replay JSON
function saveReplayFile() {
  playClickSound();
  const file = agentBrain.saveReplay(replaysDir);
  if (file) {
    replayStatusText.textContent = `Replay saved to: ${path.basename(file)}`;
    logSystemMessage(`Replay saved to ${file}`);
  } else {
    alert("No actions recorded to save!");
  }
}

// Controls
function reloadGame() {
  playClickSound();
  ipcRenderer.invoke('is-game-window-active').then(active => {
    if (active) {
      ipcRenderer.invoke('reload-game-window');
    } else {
      webviewElement.reload();
    }
  });
  logSystemMessage("Game reloaded.");
}

function openGameDevTools() {
  playClickSound();
  ipcRenderer.invoke('is-game-window-active').then(active => {
    if (active) {
      ipcRenderer.invoke('open-game-devtools');
    } else {
      webviewElement.openDevTools();
    }
  });
  logSystemMessage("DevTools opened.");
}

async function takeManualSnapshot() {
  playClickSound();
  try {
    const screenshot = await gameController.captureScreenshot(webviewElement);
    brainScreenshot.src = `data:image/jpeg;base64,${screenshot}`;
    const liveFeedImg = document.getElementById('live-stream-image');
    if (liveFeedImg) {
      liveFeedImg.src = `data:image/jpeg;base64,${screenshot}`;
    }
    logSystemMessage("Manual screenshot captured.");
  } catch (e) {
    logMessage(`Screenshot failed: ${e.message}`, "error");
  }
}

// Forces a heuristic test step
async function forceHeuristicStep() {
  playClickSound();
  try {
    const dom = await gameController.getInteractiveDOM(webviewElement);
    const result = agentBrain.runHeuristicFallback([], dom);
    logMessage(`Forced Heuristic Action: ${result.action.type} -> ${result.action.target}`, "warning");
    await gameController.executeAction(webviewElement, result.action);
  } catch (e) {
    logMessage(`Force heuristic failed: ${e.message}`, "error");
  }
}

// Frame Estimator for FPS
function startFpsTracker() {
  if (fpsInterval) clearInterval(fpsInterval);
  
  frameCount = 0;
  lastFpsUpdate = Date.now();
  
  // Track frame loop (mocking screen paint rates to fetch actual rendering ticks)
  function countFrames() {
    frameCount++;
    requestAnimationFrame(countFrames);
  }
  requestAnimationFrame(countFrames);

  fpsInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastFpsUpdate;
    currentFps = Math.min(Math.round((frameCount * 1000) / elapsed), 1000); // Prevent infinity/huge spikes
    fpsVal.textContent = currentFps;
    
    // Add to history and draw sparkline
    fpsHistory.push(currentFps);
    if (fpsHistory.length > 20) fpsHistory.shift();
    drawSparkline('fps-chart', fpsHistory, 60, '#00f2fe');

    // Fetch memory heap dynamically from webview and draw sparkline
    if (webviewElement && webviewElement.src && webviewElement.src !== 'about:blank') {
      gameController.getPerformanceMetrics(webviewElement).then(metrics => {
        let heapMB = 0;
        if (metrics && metrics.heapUsed > 0) {
          heapMB = Math.round(metrics.heapUsed / (1024 * 1024));
          heapVal.textContent = `${heapMB} MB`;
        } else {
          heapVal.textContent = "-- MB";
        }
        heapHistory.push(heapMB);
        if (heapHistory.length > 20) heapHistory.shift();
        const maxHeap = Math.max(...heapHistory, 120);
        drawSparkline('heap-chart', heapHistory, maxHeap, '#4facfe');
      }).catch(() => {});
    }
    
    frameCount = 0;
    lastFpsUpdate = now;
  }, 1000);
}

// General Logger Utilities
function logMessage(text, type = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span style="opacity: 0.5;">[${time}]</span> ${text}`;
  
  logStream.appendChild(entry);
  logStream.scrollTop = logStream.scrollHeight;

  // Save live logs to file for external scraper
  try {
    const logsPath = path.join(dataDir, 'live_logs.json');
    let logs = [];
    if (fs.existsSync(logsPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      } catch (e) {
        logs = [];
      }
    }
    logs.push({ timestamp: new Date().toISOString(), type, text });
    if (logs.length > 150) logs.shift(); // Limit file growth
    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to write live log file", err);
  }
}

function logSystemMessage(text) {
  logMessage(text, 'system');
}

// Render session memory stats to the right sidebar
function updateSessionStatsUI() {
  const mem = agentBrain._sessionMem;
  if (!mem) return;

  if (sessSteps) sessSteps.textContent = mem.totalSteps || 0;
  if (sessBugs) sessBugs.textContent = mem.bugsFound || 0;
  if (sessStuck) sessStuck.textContent = mem.stuckEvents || 0;
  if (sessRecoveries) sessRecoveries.textContent = mem.recoveries || 0;

  // Action type breakdown
  if (actionMixEl) {
    const counts = mem.actionTypeCounts || {};
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    if (total === 0) {
      actionMixEl.innerHTML = '<em>No actions yet.</em>';
    } else {
      const bars = Object.entries(counts)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => {
          const pct = Math.round((v / total) * 100);
          return `<div class="mix-bar"><span>${k}</span><div class="mix-track"><div class="mix-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>`;
        }).join('');
      actionMixEl.innerHTML = bars;
    }
  }

  // Top click zones
  if (heatmapZonesEl) {
    const zones = mem.clickHeatmapZones || {};
    const topZones = Object.entries(zones).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topZones.length === 0) {
      heatmapZonesEl.innerHTML = '';
    } else {
      heatmapZonesEl.innerHTML = '<div class="zones-label">Top Click Zones:</div>' +
        topZones.map(([k, v]) => {
          const [gx, gy] = k.split('_');
          return `<span class="zone-chip">(${gx * 100}–${gx * 100 + 99}, ${gy * 100}–${gy * 100 + 99}) ×${v}</span>`;
        }).join(' ');
    }
  }
}

// Triggered when agent pauses, reveals trace slider
function showScrubberTimeline() {
  if (timelineHistory.length === 0) return;
  timelineContainer.classList.remove('hidden');
  timelineScrubber.max = timelineHistory.length - 1;
  timelineScrubber.value = timelineHistory.length - 1;
  currentScrubIndex = timelineHistory.length - 1;
  timelineTime.textContent = `Tick: ${timelineHistory.length}/${timelineHistory.length}`;
}

function clearLogView() {
  playClickSound();
  logStream.innerHTML = '';
}

// Render token usage database statistics to the sidebar panel
function updateTokenStatsUI() {
  const stats = agentBrain.getTokenStats();
  const selectedModel = tokenModelSelect.value;
  
  // Get existing options
  const existingOptions = Array.from(tokenModelSelect.options).map(o => o.value);
  const newModels = Object.keys(stats.models || {});
  
  // Compare lists to prevent flicker
  const isDifferent = newModels.length !== (existingOptions.length - 1) || 
                      newModels.some(m => !existingOptions.includes(m));
                      
  if (isDifferent) {
    tokenModelSelect.innerHTML = '<option value="total">All Models (Combined)</option>';
    newModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      tokenModelSelect.appendChild(option);
    });
    // Restore selection
    if (newModels.includes(selectedModel)) {
      tokenModelSelect.value = selectedModel;
    } else {
      tokenModelSelect.value = 'total';
    }
  }
  
  const currentModel = tokenModelSelect.value;
  const activeStats = currentModel === 'total' 
    ? (stats.total || { lastRun: 0, hourly: 0, daily: 0, weekly: 0, yearly: 0, lifetime: 0 })
    : (stats.models[currentModel] || { lastRun: 0, hourly: 0, daily: 0, weekly: 0, yearly: 0, lifetime: 0 });
    
  tokenLastRun.textContent = (activeStats.lastRun || 0).toLocaleString();
  tokenHourly.textContent = (activeStats.hourly || 0).toLocaleString();
  tokenDaily.textContent = (activeStats.daily || 0).toLocaleString();
  tokenWeekly.textContent = (activeStats.weekly || 0).toLocaleString();
  tokenYearly.textContent = (activeStats.yearly || 0).toLocaleString();
  tokenLifetime.textContent = (activeStats.lifetime || 0).toLocaleString();
}

// ===== EXPOSING INTERFACES FOR HTTP API =====
window.getAgentStatus = function() {
  const mem = agentBrain._sessionMem || {};
  return {
    isRunning,
    gameUrl: gameUrlInput.value,
    provider: providerSelect.value,
    modelName: modelNameInput.value,
    gameRules: gameRulesInput.value,
    sessionStats: {
      totalSteps: mem.totalSteps || 0,
      bugsFound: mem.bugsFound || 0,
      stuckEvents: mem.stuckEvents || 0,
      recoveries: mem.recoveries || 0
    },
    bugs: agentBrain.bugs
  };
};

window.updateAgentConfig = function(newConfig) {
  if (newConfig.gameUrl !== undefined && newConfig.gameUrl !== gameUrlInput.value) {
    gameUrlInput.value = newConfig.gameUrl;
    loadGameUrl();
  }
  if (newConfig.gameRules !== undefined) gameRulesInput.value = newConfig.gameRules;
  if (newConfig.provider !== undefined) providerSelect.value = newConfig.provider;
  if (newConfig.apiKey !== undefined) apiKeyInput.value = newConfig.apiKey;
  if (newConfig.localUrl !== undefined) localUrlInput.value = newConfig.localUrl;
  if (newConfig.modelName !== undefined) modelNameInput.value = newConfig.modelName;
  
  saveSettings();
  return { success: true, message: "Configuration updated successfully" };
};

window.getInteractiveDOM = async function() {
  if (!webviewElement) return [];
  return await gameController.getInteractiveDOM(webviewElement);
};

window.executeAgentAction = async function(action) {
  if (!webviewElement) throw new Error("Webview not initialized");
  const result = await gameController.executeAction(webviewElement, action);
  
  // Register in local history
  actionTrail.push(`${action.type}${action.target ? ':' + action.target : ''}`);
  if (actionTrail.length > 5) actionTrail.shift();
  if (trailEntries) {
    trailEntries.innerHTML = actionTrail
      .map((t, i) => `<span class="trail-step ${i === actionTrail.length - 1 ? 'trail-latest' : ''}">${t}</span>`)
      .join('<span class="trail-arrow"> → </span>');
  }
  
  return result;
};

window.triggerAgentStep = async function() {
  if (!webviewElement) throw new Error("Webview not initialized");
  
  const screenshot = await gameController.captureScreenshot(webviewElement);
  const domSnapshot = await gameController.getInteractiveDOM(webviewElement);
  const metrics = await gameController.getPerformanceMetrics(webviewElement);
  
  let heapMB = 0;
  if (metrics.heapUsed > 0) {
    heapMB = Math.round(metrics.heapUsed / (1024 * 1024));
    heapVal.textContent = `${heapMB} MB`;
  }
  
  const currentHash = agentBrain.simpleHash(screenshot);
  const isStuckCount = agentBrain.episodes.slice(-3).filter(h => h.screenshotHash === currentHash).length;
  stuckVal.textContent = `${isStuckCount}/3`;
  brainScreenshot.src = `data:image/jpeg;base64,${screenshot}`;
  const liveFeedImg = document.getElementById('live-stream-image');
  if (liveFeedImg) {
    liveFeedImg.src = `data:image/jpeg;base64,${screenshot}`;
  }
  
  logMessage("Manual agent step triggered...", "system");
  const result = await agentBrain.processStep(screenshot, consoleLogs, domSnapshot, bugsLogPath);
  
  updateTokenStatsUI();
  playAgentActionSound();
  
  brainReasoning.innerHTML = `<strong>[Manual Step] Reasoning:</strong> ${result.reasoning}`;
  logMessage(`Agent decided: ${result.action.type} -> ${result.action.target || 'N/A'}`, "agent");
  drawHeatmapClick(result.action);
  
  timelineHistory.push({
    screenshot: screenshot,
    action: result.action,
    reasoning: result.reasoning,
    logs: [...consoleLogs],
    fps: currentFps,
    heap: heapMB,
    stuck: isStuckCount
  });
  
  if (result.bug_report && result.bug_report.has_bug) {
    logMessage(`BUG DETECTED: [${result.bug_report.severity.toUpperCase()}] ${result.bug_report.description}`, "error");
    playBugAlertSound();
    renderBugs();
  }
  
  updateSessionStatsUI();
  
  // Execute action in game webview
  const executeResult = await gameController.executeAction(webviewElement, result.action);
  
  return {
    decision: result,
    executionResult: executeResult
  };
};
