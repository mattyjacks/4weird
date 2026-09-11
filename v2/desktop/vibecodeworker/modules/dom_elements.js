/* ==========================================================================
   4WEIRD VIBECODEWORKER // DOM CACHE INITIALIZER
   ========================================================================== */

import { el } from './core_state.js';

export function initDOM() {
  el.gameTarget = document.getElementById('game-target');
  el.btnLoad = document.getElementById('btn-load');
  el.presetGames = document.getElementById('preset-games');
  el.autoStartToggle = document.getElementById('auto-start-toggle');
  el.agentModel = document.getElementById('agent-model');
  el.testRules = document.getElementById('test-rules');
  el.maxSteps = document.getElementById('max-steps');
  el.stepInterval = document.getElementById('step-interval');
  el.btnStart = document.getElementById('btn-start');
  el.btnPause = document.getElementById('btn-pause');
  el.btnStop = document.getElementById('btn-stop');
  el.quickTarget = document.getElementById('quick-target');
  el.quickObjective = document.getElementById('quick-objective');
  el.btnQuickLoad = document.getElementById('btn-quick-load');
  el.btnQuickRun = document.getElementById('btn-quick-run');
  el.btnQuickPause = document.getElementById('btn-quick-pause');

  el.gameIframe = document.getElementById('game-iframe');
  el.iframeContainer = document.getElementById('game-frame-container');
  el.agentCursor = document.getElementById('agent-cursor');
  el.actionCanvas = document.getElementById('action-overlay-canvas');
  el.btnDeviceAutofit = document.getElementById('btn-device-autofit');
  el.btnDevDesktop = document.getElementById('btn-device-desktop');
  el.btnDevTablet = document.getElementById('btn-device-tablet');
  el.btnDevMobile = document.getElementById('btn-device-mobile');
  el.btnToggleHeatmap = document.getElementById('btn-toggle-heatmap');
  el.btnReloadGame = document.getElementById('btn-reload-game');
  el.btnMuteGame = document.getElementById('btn-mute-game');
  el.viewportRes = document.getElementById('viewport-res');
  el.originWarning = document.getElementById('origin-warning');
  el.btnWarningDismiss = document.getElementById('btn-warning-dismiss');

  el.autoHealToast = document.getElementById('auto-heal-toast');
  el.toastBugTitle = document.getElementById('toast-bug-title');
  el.toastBugDesc = document.getElementById('toast-bug-desc');
  el.btnToastAutoheal = document.getElementById('btn-toast-autoheal');
  el.btnCloseToast = document.getElementById('btn-close-toast');

  el.terminalLog = document.getElementById('terminal-log');
  el.terminalInput = document.getElementById('terminal-input');
  el.btnTerminalSend = document.getElementById('btn-terminal-send');
  el.btnClearTerminal = document.getElementById('btn-clear-terminal');

  el.valFps = document.getElementById('val-fps');
  el.valHeap = document.getElementById('val-heap');
  el.chartFps = document.getElementById('chart-fps');
  el.chartHeap = document.getElementById('chart-heap');

  el.statElapsed = document.getElementById('stat-elapsed');
  el.statSteps = document.getElementById('stat-steps');
  el.statApm = document.getElementById('stat-apm');
  el.bugCounter = document.getElementById('bug-counter');
  el.bugListContainer = document.getElementById('bug-list-container');
  el.btnViewReport = document.getElementById('btn-view-report');

  el.reportModal = document.getElementById('report-modal');
  el.btnCloseReport = document.getElementById('btn-close-report');
  el.repSteps = document.getElementById('rep-steps');
  el.repBugs = document.getElementById('rep-bugs');
  el.repFps = document.getElementById('rep-fps');
  el.repDuration = document.getElementById('rep-duration');
  el.repBugListDetails = document.getElementById('rep-bug-list-details');
  el.btnExportJson = document.getElementById('btn-export-json');
  el.btnExportPdf = document.getElementById('btn-export-pdf');

  el.bugModal = document.getElementById('bug-modal');
  el.btnCloseBug = document.getElementById('btn-close-bug');
  el.bugDetailTitle = document.getElementById('bug-detail-title');
  el.bugDetailTime = document.getElementById('bug-detail-time');
  el.bugDetailDesc = document.getElementById('bug-detail-desc');
  el.bugDetailStack = document.getElementById('bug-detail-stack');
  el.bugDetailImg = document.getElementById('bug-detail-img');
  el.btnSolveMega = document.getElementById('btn-solve-mega');
  el.btnApplyHotpatch = document.getElementById('btn-apply-hotpatch');
  el.diffFileName = document.getElementById('diff-file-name');
  el.diffCodeContent = document.getElementById('diff-code-content');

  el.patchDrawer = document.getElementById('patch-drawer');
  el.btnCloseDrawer = document.getElementById('btn-close-drawer');
  el.btnQuickPatch = document.getElementById('btn-quick-patch');
  el.drawerPatchesList = document.getElementById('drawer-patches-list');

  el.agentStateDot = document.getElementById('agent-state-dot');
  el.agentStateText = document.getElementById('agent-state-text');
  el.audioToggle = document.getElementById('audio-toggle');
  el.systemTime = document.getElementById('system-time');
  el.tauriDesktopBadge = document.getElementById('tauri-desktop-badge');
  el.activeModelDisplay = document.getElementById('active-model-display');
  el.btnSelectMode = document.getElementById('btn-select-mode');
  el.modeSelectionModal = document.getElementById('mode-selection-modal');
  el.btnCloseModeModal = document.getElementById('btn-close-mode-modal');
  el.btnSelectModeWeb = document.getElementById('btn-select-mode-web');
  el.btnSelectModeLocal = document.getElementById('btn-select-mode-local');
  el.btnSelectModeRemote = document.getElementById('btn-select-mode-remote');

  el.tabBtnConfig = document.getElementById('tab-btn-config');
  el.tabBtnBrain = document.getElementById('tab-btn-brain');
  el.tabConfig = document.getElementById('tab-config');
  el.tabBrain = document.getElementById('tab-brain');
  el.brainThoughtStream = document.getElementById('brain-thought-stream');
  el.brainModelName = document.getElementById('brain-model-name');
  el.brainTokenCount = document.getElementById('brain-token-count');

  el.subagentListContainer = document.getElementById('subagent-list-container');
  el.btnSpawnSubagent = document.getElementById('btn-spawn-subagent');
  el.btnDispatchSubagentLeft = document.getElementById('btn-dispatch-subagent-left');
  el.btnResumeAllLeft = document.getElementById('btn-resume-all-left');
  el.btnPauseAllLeft = document.getElementById('btn-pause-all-left');
  el.btnTerminateAllLeft = document.getElementById('btn-terminate-all-left');
  el.btnSendMsgLeft = document.getElementById('btn-send-msg-left');

  el.btnResumeAllAux = document.getElementById('btn-resume-all-aux');
  el.btnPauseAllAux = document.getElementById('btn-pause-all-aux');
  el.btnTerminateAllAux = document.getElementById('btn-terminate-all-aux');
  el.btnSendMsgAux = document.getElementById('btn-send-msg-aux');

  el.dispatchSubagentModal = document.getElementById('dispatch-subagent-modal');
  el.btnCloseDispatchModal = document.getElementById('btn-close-dispatch-modal');
  el.btnCancelDispatchSubagent = document.getElementById('btn-cancel-dispatch-subagent');
  el.btnConfirmDispatchSubagent = document.getElementById('btn-confirm-dispatch-subagent');
  el.subagentRoleSelect = document.getElementById('subagent-role-select');
  el.subagentNameInput = document.getElementById('subagent-name-input');
  el.subagentPromptInput = document.getElementById('subagent-prompt-input');

  el.subagentLogModal = document.getElementById('subagent-log-modal');
  el.btnCloseSubagentLogModal = document.getElementById('btn-close-subagent-log-modal');
  el.subagentLogTitle = document.getElementById('subagent-log-title');
  el.subagentLogRole = document.getElementById('subagent-log-role');
  el.subagentLogStatus = document.getElementById('subagent-log-status');
  el.subagentLogPrompt = document.getElementById('subagent-log-prompt');
  el.subagentLogStream = document.getElementById('subagent-log-stream');
  el.btnSubagentReassignTask = document.getElementById('btn-subagent-reassign-task');
  el.btnSubagentTogglePause = document.getElementById('btn-subagent-toggle-pause');
  el.btnSubagentTerminate = document.getElementById('btn-subagent-terminate');

  el.subagentMessageModal = document.getElementById('subagent-message-modal');
  el.btnCloseMessageModal = document.getElementById('btn-close-message-modal');
  el.btnCancelSendMessage = document.getElementById('btn-cancel-send-message');
  el.btnConfirmSendMessage = document.getElementById('btn-confirm-send-message');
  el.messageTargetSelect = document.getElementById('message-target-select');
  el.subagentMessageInput = document.getElementById('subagent-message-input');

  el.subagentReassignModal = document.getElementById('subagent-reassign-modal');
  el.btnCloseReassignModal = document.getElementById('btn-close-reassign-modal');
  el.btnCancelReassign = document.getElementById('btn-cancel-reassign');
  el.btnConfirmReassign = document.getElementById('btn-confirm-reassign');
  el.reassignModalTitle = document.getElementById('reassign-modal-title');
  el.reassignPromptInput = document.getElementById('reassign-prompt-input');

  el.btnLunaVisionScan = document.getElementById('btn-luna-vision-scan');
  el.visionOverlayCanvas = document.getElementById('vision-overlay-canvas');
  el.visionScanBadge = document.getElementById('vision-scan-badge');
  el.btnExportMarkdown = document.getElementById('btn-export-markdown');
  el.repTabBtnSummary = document.getElementById('rep-tab-btn-summary');
  el.repTabBtnPreview = document.getElementById('rep-tab-btn-preview');
  el.repPaneSummary = document.getElementById('rep-pane-summary');
  el.repPanePreview = document.getElementById('rep-pane-preview');
  el.repVFrames = document.getElementById('rep-v-frames');
  el.repVLatency = document.getElementById('rep-v-latency');
  el.repVAnomalies = document.getElementById('rep-v-anomalies');
  el.repMarkdownCode = document.getElementById('rep-markdown-code');
  el.btnCopyMarkdownPreview = document.getElementById('btn-copy-markdown-preview');

  el.btnAutorunEverything = document.getElementById('btn-autorun-everything');
  el.btnToggleLeftSidebar = document.getElementById('btn-toggle-left-sidebar');
  el.btnToggleRightSidebar = document.getElementById('btn-toggle-right-sidebar');
  el.configPanel = document.getElementById('config-panel');
  el.statsPanel = document.getElementById('stats-panel');
  el.mainLayout = document.getElementById('main-layout');

  el.tabBtnTree = document.getElementById('tab-btn-tree');
  el.tabTree = document.getElementById('tab-tree');
  el.reasoningTreeContainer = document.getElementById('reasoning-tree-container');

  el.stageTabViewport = document.getElementById('stage-tab-viewport');
  el.stageTabSource = document.getElementById('stage-tab-source');
  el.stageViewportPanel = document.getElementById('stage-viewport-panel');
  el.stageSourcePanel = document.getElementById('stage-source-panel');

  el.sourceFileTitle = document.getElementById('source-file-title');
  el.sourceLineCount = document.getElementById('source-line-count');
  el.sourceFileSelect = document.getElementById('source-file-select');
  el.btnCopySource = document.getElementById('btn-copy-source');
  el.sourceLineNumbers = document.getElementById('source-line-numbers');
  el.sourceCodeContent = document.getElementById('source-code-content');

  el.replayTimeline = document.getElementById('replay-timeline');
  el.btnReplayPrev = document.getElementById('btn-replay-prev');
  el.btnReplayPlay = document.getElementById('btn-replay-play');
  el.btnReplayNext = document.getElementById('btn-replay-next');
  el.btnReplayLive = document.getElementById('btn-replay-live');
  el.replayScrubber = document.getElementById('replay-scrubber');
  el.replayStepInfo = document.getElementById('replay-step-info');

  el.btnGpuConfig = document.getElementById('btn-gpu-config');
  el.gpuSettingsDrawer = document.getElementById('gpu-settings-drawer');
  el.btnCloseGpuDrawer = document.getElementById('btn-close-gpu-drawer');
  el.gpuEndpointInput = document.getElementById('gpu-endpoint-input');
  el.gpuModelSelect = document.getElementById('gpu-model-select');
  el.gpuVramUsage = document.getElementById('gpu-vram-usage');
  el.gpuOffloadStatus = document.getElementById('gpu-offload-status');
  el.gpuTokensSpeed = document.getElementById('gpu-tokens-speed');
  el.gpuBackendMode = document.getElementById('gpu-backend-mode');
  el.btnTestGpuConnection = document.getElementById('btn-test-gpu-connection');
  el.gpuTestResult = document.getElementById('gpu-test-result');

  el.btnBotToken = document.getElementById('btn-bot-token');
  el.botTokenDrawer = document.getElementById('bot-token-drawer');
  el.btnCloseBotDrawer = document.getElementById('btn-close-bot-drawer');
  el.botTokenInput = document.getElementById('bot-token-input');
  el.btnSaveBotToken = document.getElementById('btn-save-bot-token');
  el.btnVerifyBotToken = document.getElementById('btn-verify-bot-token');
  el.btnClearBotToken = document.getElementById('btn-clear-bot-token');
  el.botTokenStatus = document.getElementById('bot-token-status');
  el.botTokenIdentity = document.getElementById('bot-token-identity');

  el.rsoGenNum = document.getElementById('rso-gen-num');
  el.rsoRewardVal = document.getElementById('rso-reward-val');
  el.rsoActionsSucc = document.getElementById('rso-actions-succ');
  el.rsoDefectsFound = document.getElementById('rso-defects-found');
  el.rsoPolicyName = document.getElementById('rso-policy-name');
  el.rsoIntervalSpeed = document.getElementById('rso-interval-speed');
  el.rsoFuzzWeights = document.getElementById('rso-fuzz-weights');

  el.brainGameStage = document.getElementById('brain-game-stage');
  el.brainDetectedControls = document.getElementById('brain-detected-controls');
  el.brainTargetObjectives = document.getElementById('brain-target-objectives');
  el.brainHighscorePolicy = document.getElementById('brain-highscore-policy');
  el.brainPlaystyleStrategy = document.getElementById('brain-playstyle-strategy');

  el.btnPhoneLink = document.getElementById('btn-phone-link');
  el.phoneRemoteModal = document.getElementById('phone-remote-modal');
  el.btnClosePhoneRemoteModal = document.getElementById('btn-close-phone-remote-modal');
  el.qrCodeDisplay = document.getElementById('qr-code-display');
  el.phoneLinkingCode = document.getElementById('phone-linking-code');
  el.phoneLinkingUrl = document.getElementById('phone-linking-url');
  el.phoneRemoteStatus = document.getElementById('phone-remote-status');
  el.btnRegenQrCode = document.getElementById('btn-regen-qr-code');
  el.btnCopyLinkingUrl = document.getElementById('btn-copy-linking-url');
  el.remoteBtnStart = document.getElementById('remote-btn-start');
  el.remoteBtnPause = document.getElementById('remote-btn-pause');
  el.remoteBtnVision = document.getElementById('remote-btn-vision');
  el.remoteBtnHeal = document.getElementById('remote-btn-heal');
  el.remoteBtnSelectGame = document.getElementById('remote-btn-select-game');
  el.remoteTouchpad = document.getElementById('remote-touchpad');
  el.remoteCrosshairPointer = document.getElementById('remote-crosshair-pointer');
  el.phoneStreamFps = document.getElementById('phone-stream-fps');
  el.phoneStreamHeap = document.getElementById('phone-stream-heap');
  el.phoneStreamStep = document.getElementById('phone-stream-step');
  el.phoneStreamLogFeed = document.getElementById('phone-stream-log-feed');

  el.authOverlay = document.getElementById('auth-overlay');
  el.authForm = document.getElementById('auth-form');
  el.authPasswordInput = document.getElementById('auth-password-input');
  el.authErrorMsg = document.getElementById('auth-error-msg');
  el.btnAuthLock = document.getElementById('btn-auth-lock');

  // Hub and Navigation Elements
  el.hubWorkspace = document.getElementById('hub-workspace');
  el.btnGotoHub = document.getElementById('btn-goto-hub');
  el.btnToggleView = document.getElementById('btn-toggle-view');
  el.menuGameBtn = document.getElementById('menu-game-btn');
  el.menuToolsBtn = document.getElementById('menu-tools-btn');
  el.menuViewBtn = document.getElementById('menu-view-btn');
}
