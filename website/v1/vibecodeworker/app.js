/* ==========================================================================
   4WEIRD VIBECODEWORKER // APPLICATION ENTRY POINT & CONTROLLER (ES MODULE)
   ========================================================================== */

import { state, el, synth, isTauriRuntime, invokeTauriCommand } from './modules/core_state.js';
import { initDOM } from './modules/dom_elements.js';
import { sourceCodeFiles } from './modules/data_store.js';
import { log, updatePerformanceMetrics, initAuthCheck, setupAuthEventListeners } from './modules/telemetry_logger.js';
import { updateSubagentsUI, resumeAllSubagents, pauseAllSubagents, terminateAllSubagents, openDispatchSubagentModal, confirmDispatchSubagent, openSendMessageModal, confirmSendMessage, openReassignModal, confirmReassign, togglePauseSubagent, terminateSubagent } from './modules/subagents_manager.js';
import { discoverGameBrain } from './modules/game_brain.js';
import { openLocalGpuDrawer, testLocalGpuConnection, setupPhoneRemoteInteractions } from './modules/gpu_remote.js';
import { renderReasoningTree, renderSourceCodeView, updatePatchDrawerUI, showBugLightbox, exportMarkdownReport, switchReportTab, generateReportSummary } from './modules/defect_healer.js';
import { glideAgentCursorAndInteract, runLunaVisionScan, setDeviceView, toggleReplayPlay, toggleReplayLiveMode, stepReplayPrev, stepReplayNext, updateReplayUI } from './modules/viewport_manager.js';
import { HubManager } from './modules/hub_manager.js';
import { loadGameTarget, initiateTesting, pauseTesting, stopTesting, executeAgentStep, autoRunEverything } from './modules/agent_runner.js';

let hubInstance = null;

function toggleOptions() {
  synth.playClick();
  const container = document.querySelector('.app-wrapper') || document.body;
  container.classList.toggle('options-open');
  const label = document.getElementById('menu-layout-label');
  if (label) label.textContent = container.classList.contains('options-open') ? 'Close options' : 'Options';
}

function applyLayoutMode() {
  const container = document.querySelector('.app-wrapper') || document.body;
  const label = document.getElementById('menu-layout-label');
  const btnView = document.getElementById('btn-toggle-view');

  if (state.isSimpleMode) {
    container.classList.add('simple-mode');
    if (label) label.textContent = 'Options';
    if (btnView) btnView.textContent = '🛠️ Open options';
    log("[LAYOUT] Focused workspace active. Detailed controls are available in Options.", "system");
  } else {
    container.classList.remove('simple-mode');
    if (label) label.textContent = 'Options';
    if (btnView) btnView.textContent = '👁️ Open options';
    log("[LAYOUT] Advanced Mode active (full cyber telemetry & orchestrator).", "system");
  }
}

function toggleLeftSidebar() {
  synth.playClick();
  if (!el.configPanel || !el.btnToggleLeftSidebar) return;
  state.leftSidebarCollapsed = !state.leftSidebarCollapsed;
  if (state.leftSidebarCollapsed) {
    el.configPanel.classList.add('collapsed');
    el.btnToggleLeftSidebar.textContent = '▶ Expand';
  } else {
    el.configPanel.classList.remove('collapsed');
    el.btnToggleLeftSidebar.textContent = '◀ Collapse';
  }
}

function toggleRightSidebar() {
  synth.playClick();
  if (!el.statsPanel || !el.btnToggleRightSidebar) return;
  state.rightSidebarCollapsed = !state.rightSidebarCollapsed;
  if (state.rightSidebarCollapsed) {
    el.statsPanel.classList.add('collapsed');
    el.btnToggleRightSidebar.textContent = 'Expand ◀';
  } else {
    el.statsPanel.classList.remove('collapsed');
    el.btnToggleRightSidebar.textContent = 'Collapse ▶';
  }
}

function switchStageTab(tabName) {
  synth.playClick();
  state.activeStageTab = tabName;
  if (tabName === 'viewport') {
    if (el.stageTabViewport) el.stageTabViewport.classList.add('active');
    if (el.stageTabSource) el.stageTabSource.classList.remove('active');
    if (el.stageViewportPanel) el.stageViewportPanel.classList.remove('hidden');
    if (el.stageSourcePanel) el.stageSourcePanel.classList.add('hidden');
  } else if (tabName === 'source') {
    if (el.stageTabSource) el.stageTabSource.classList.add('active');
    if (el.stageTabViewport) el.stageTabViewport.classList.remove('active');
    if (el.stageSourcePanel) el.stageSourcePanel.classList.remove('hidden');
    if (el.stageViewportPanel) el.stageViewportPanel.classList.add('hidden');
    renderSourceCodeView();
  }
}

function handleTerminalCommand() {
  const raw = el.terminalInput.value.trim();
  if (!raw) return;

  el.terminalInput.value = '';
  log(`> ${raw}`, 'info');

  if (raw.startsWith('/')) {
    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === '/goal') {
      synth.playSuccess();
      log("Slash Command /goal: Autonomous mode engaged! Agent will not halt until zero defects remain.", "system");
      if (!state.isRunning) initiateTesting();
    } else if (cmd === '/boost') {
      synth.playSuccess();
      log("Slash Command /boost: Deep reasoning mode activated. Token limit expanded.", "system");
    } else if (cmd === '/solve') {
      synth.playSuccess();
      log("Slash Command /solve: Triggered self-healing engine on active defects.", "system");
      if (state.bugs.length > 0) showBugLightbox(state.bugs[0]);
      else alert("No active defects to solve!");
    } else if (cmd === '/subagent') {
      synth.playClick();
      openDispatchSubagentModal();
    } else if (cmd === '/diff') {
      synth.playClick();
      el.patchDrawer.classList.remove('hidden');
    } else if (cmd === '/step') {
      synth.playClick();
      executeAgentStep();
    } else if (cmd === '/click') {
      const x = parseInt(parts[1]) || 200;
      const y = parseInt(parts[2]) || 150;
      glideAgentCursorAndInteract(x, y);
      log(`Simulated Manual Pointer Click at [${x}, ${y}]`, "info");
    } else if (cmd === '/help') {
      log("Available Antigravity 2.0 Slash Commands: /goal, /boost, /solve, /subagent, /diff, /step, /click [x] [y]", "system");
    } else {
      log(`Unknown slash command: '${cmd}'. Type /help for command list.`, "warning");
    }
  } else {
    setTimeout(() => {
      log(`Agent Interpreter: Prompt instruction parsed: '${raw}'`, "info");
    }, 400);
  }
}

function selectPreset() {
  synth.playClick();
  const val = el.presetGames.value;
  if (val) {
    el.gameTarget.value = val;
    if (el.quickTarget) el.quickTarget.value = val;
    loadGameTarget();
  }
}

function bindKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable);

    if (e.key === 'Escape') {
      if (el.reportModal) el.reportModal.classList.add('hidden');
      if (el.bugModal) el.bugModal.classList.add('hidden');
      if (el.patchDrawer) el.patchDrawer.classList.add('hidden');
      if (el.gpuSettingsDrawer) el.gpuSettingsDrawer.classList.add('hidden');
      if (el.dispatchSubagentModal) el.dispatchSubagentModal.classList.add('hidden');
      if (el.subagentLogModal) el.subagentLogModal.classList.add('hidden');
      if (el.subagentMessageModal) el.subagentMessageModal.classList.add('hidden');
      if (el.subagentReassignModal) el.subagentReassignModal.classList.add('hidden');
      synth.playClick();
      return;
    }

    if (e.key === '/' && !isInput) {
      e.preventDefault();
      if (el.terminalInput) {
        el.terminalInput.focus();
        synth.playClick();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!state.isRunning) initiateTesting();
      else if (state.isPaused) pauseTesting();
      return;
    }

    if ((e.code === 'Space' || e.key === ' ') && !isInput) {
      e.preventDefault();
      if (state.isRunning) {
        pauseTesting();
      } else {
        initiateTesting();
      }
      return;
    }
  });
}

function bindEvents() {
  if (el.btnLoad) el.btnLoad.addEventListener('click', () => loadGameTarget());
  if (el.quickTarget && el.gameTarget) {
    el.quickTarget.value = el.gameTarget.value;
    el.quickTarget.addEventListener('input', () => {
      el.gameTarget.value = el.quickTarget.value;
      state.gameLoaded = false;
    });
  }
  if (el.quickObjective && el.testRules) {
    el.quickObjective.value = el.testRules.value;
    el.quickObjective.addEventListener('input', () => { el.testRules.value = el.quickObjective.value; });
  }
  if (el.btnQuickLoad) el.btnQuickLoad.addEventListener('click', () => loadGameTarget());
  if (el.btnQuickRun) el.btnQuickRun.addEventListener('click', () => {
    if (el.quickTarget && el.gameTarget) el.gameTarget.value = el.quickTarget.value.trim();
    if (el.quickObjective && el.testRules) el.testRules.value = el.quickObjective.value.trim();
    initiateTesting();
  });
  if (el.btnQuickPause) el.btnQuickPause.addEventListener('click', pauseTesting);
  if (el.presetGames) el.presetGames.addEventListener('change', selectPreset);

  if (el.btnLunaVisionScan) el.btnLunaVisionScan.addEventListener('click', () => runLunaVisionScan(false));
  if (el.btnExportMarkdown) el.btnExportMarkdown.addEventListener('click', exportMarkdownReport);
  if (el.repTabBtnSummary) el.repTabBtnSummary.addEventListener('click', () => switchReportTab('summary'));
  if (el.repTabBtnPreview) el.repTabBtnPreview.addEventListener('click', () => switchReportTab('preview'));

  if (el.btnReloadGame) {
    el.btnReloadGame.addEventListener('click', () => {
      synth.playClick();
      el.gameIframe.src = el.gameIframe.src;
    });
  }

  if (el.btnToggleHeatmap) {
    el.btnToggleHeatmap.addEventListener('click', () => {
      synth.playClick();
      state.heatmapEnabled = !state.heatmapEnabled;
      el.btnToggleHeatmap.textContent = `🔥 HEATMAP: ${state.heatmapEnabled ? 'ON' : 'OFF'}`;
      log(`Action Heatmap overlay ${state.heatmapEnabled ? 'enabled' : 'disabled'}.`, "system");
    });
  }

  if (el.btnMuteGame) {
    el.btnMuteGame.addEventListener('click', () => {
      synth.playClick();
      const muted = el.gameIframe.getAttribute('muted') === 'true';
      el.gameIframe.setAttribute('muted', !muted);
      el.btnMuteGame.textContent = muted ? "MUTE" : "UNMUTE";
      log(`Game audio ${muted ? 'enabled' : 'muted'}.`, "system");
    });
  }

  if (el.btnDeviceAutofit) el.btnDeviceAutofit.addEventListener('click', () => setDeviceView('autofit'));
  if (el.btnDevDesktop) el.btnDevDesktop.addEventListener('click', () => setDeviceView('desktop'));
  if (el.btnDevTablet) el.btnDevTablet.addEventListener('click', () => setDeviceView('tablet'));
  if (el.btnDevMobile) el.btnDevMobile.addEventListener('click', () => setDeviceView('mobile'));

  if (el.btnAutorunEverything) el.btnAutorunEverything.addEventListener('click', autoRunEverything);
  if (el.btnToggleLeftSidebar) el.btnToggleLeftSidebar.addEventListener('click', toggleLeftSidebar);
  if (el.btnToggleRightSidebar) el.btnToggleRightSidebar.addEventListener('click', toggleRightSidebar);

  if (el.tabBtnTree) {
    el.tabBtnTree.addEventListener('click', () => {
      synth.playClick();
      el.tabBtnTree.classList.add('active');
      el.tabBtnConfig.classList.remove('active');
      el.tabBtnBrain.classList.remove('active');
      el.tabTree.classList.remove('hidden');
      el.tabConfig.classList.add('hidden');
      el.tabBrain.classList.add('hidden');
      renderReasoningTree();
    });
  }

  if (el.stageTabViewport) el.stageTabViewport.addEventListener('click', () => switchStageTab('viewport'));
  if (el.stageTabSource) el.stageTabSource.addEventListener('click', () => switchStageTab('source'));
  if (el.sourceFileSelect) el.sourceFileSelect.addEventListener('change', renderSourceCodeView);

  if (el.btnCopySource) {
    el.btnCopySource.addEventListener('click', () => {
      synth.playClick();
      const filename = el.sourceFileSelect ? el.sourceFileSelect.value : 'orbitaldrift.js';
      const code = sourceCodeFiles[filename] || '';
      navigator.clipboard.writeText(code).then(() => {
        alert(`Source code for ${filename} copied to clipboard!`);
      });
    });
  }

  if (el.btnReplayPlay) el.btnReplayPlay.addEventListener('click', toggleReplayPlay);
  if (el.btnReplayLive) el.btnReplayLive.addEventListener('click', toggleReplayLiveMode);
  if (el.btnReplayPrev) el.btnReplayPrev.addEventListener('click', stepReplayPrev);
  if (el.btnReplayNext) el.btnReplayNext.addEventListener('click', stepReplayNext);
  if (el.replayScrubber) {
    el.replayScrubber.addEventListener('input', () => {
      if (state.isReplayPlaying) {
        state.isReplayPlaying = false;
        if (state.replayPlayTimer) clearInterval(state.replayPlayTimer);
        if (el.btnReplayPlay) el.btnReplayPlay.textContent = '▶ PLAY';
      }
      state.isReplayLive = false;
      updateReplayUI();
    });
  }

  bindKeyboardShortcuts();

  if (el.tabBtnConfig) {
    el.tabBtnConfig.addEventListener('click', () => {
      synth.playClick();
      el.tabBtnConfig.classList.add('active');
      el.tabBtnBrain.classList.remove('active');
      if (el.tabBtnTree) el.tabBtnTree.classList.remove('active');
      el.tabConfig.classList.remove('hidden');
      el.tabBrain.classList.add('hidden');
      if (el.tabTree) el.tabTree.classList.add('hidden');
    });
  }

  if (el.tabBtnBrain) {
    el.tabBtnBrain.addEventListener('click', () => {
      synth.playClick();
      el.tabBtnBrain.classList.add('active');
      el.tabBtnConfig.classList.remove('active');
      if (el.tabBtnTree) el.tabBtnTree.classList.remove('active');
      el.tabBrain.classList.remove('hidden');
      el.tabConfig.classList.add('hidden');
      if (el.tabTree) el.tabTree.classList.add('hidden');
    });
  }

  if (el.btnStart) el.btnStart.addEventListener('click', initiateTesting);
  if (el.btnPause) el.btnPause.addEventListener('click', pauseTesting);
  if (el.btnStop) el.btnStop.addEventListener('click', stopTesting);
  if (el.btnViewReport) el.btnViewReport.addEventListener('click', generateReportSummary);

  if (el.btnCloseReport) el.btnCloseReport.addEventListener('click', () => el.reportModal.classList.add('hidden'));
  if (el.btnCloseBug) el.btnCloseBug.addEventListener('click', () => el.bugModal.classList.add('hidden'));
  if (el.btnCloseDrawer) el.btnCloseDrawer.addEventListener('click', () => el.patchDrawer.classList.add('hidden'));
  if (el.btnCloseToast) el.btnCloseToast.addEventListener('click', () => el.autoHealToast.classList.add('hidden'));

  if (el.btnQuickPatch) {
    el.btnQuickPatch.addEventListener('click', () => {
      synth.playClick();
      updatePatchDrawerUI();
      el.patchDrawer.classList.remove('hidden');
    });
  }

  if (el.btnSelectMode) el.btnSelectMode.addEventListener('click', () => el.modeSelectionModal.classList.remove('hidden'));
  if (el.btnCloseModeModal) el.btnCloseModeModal.addEventListener('click', () => el.modeSelectionModal.classList.add('hidden'));

  if (el.btnSelectModeWeb) {
    el.btnSelectModeWeb.addEventListener('click', () => {
      synth.playSuccess();
      if (el.agentModel) el.agentModel.value = 'local-webgpu-inbrowser';
      state.currentModel = 'Local GPU (WebGPU In-Browser Inference - Large Systems)';
      if (el.activeModelDisplay) el.activeModelDisplay.textContent = 'Local GPU (WebGPU - Large Systems)';
      if (el.btnSelectMode) el.btnSelectMode.textContent = '⚙️ MODE: RUN WEB';
      el.modeSelectionModal.classList.add('hidden');
      log("[MODE SWITCH] Activated 'RUN WEB' (WebGPU In-Browser Client Inference).", "system");
    });
  }

  if (el.btnSelectModeLocal) {
    el.btnSelectModeLocal.addEventListener('click', () => {
      synth.playSuccess();
      if (el.agentModel) el.agentModel.value = 'local-gpu-ollama';
      state.currentModel = 'Local GPU (Ollama / Hardware GPU)';
      if (el.activeModelDisplay) el.activeModelDisplay.textContent = 'Local GPU (Ollama / CUDA)';
      if (el.btnSelectMode) el.btnSelectMode.textContent = '⚙️ MODE: RUN LOCAL';
      el.modeSelectionModal.classList.add('hidden');
      openLocalGpuDrawer();
      log("[MODE SWITCH] Activated 'RUN LOCAL' (Hardware GPU Server / Ollama).", "system");
    });
  }

  if (el.btnSelectModeRemote) {
    el.btnSelectModeRemote.addEventListener('click', () => {
      synth.playSuccess();
      if (el.agentModel) el.agentModel.value = 'gpt-5.6-luna';
      state.currentModel = 'GPT-5.6 Luna (OpenAI - DEFAULT)';
      if (el.activeModelDisplay) el.activeModelDisplay.textContent = 'GPT-5.6 Luna (OpenAI)';
      if (el.btnSelectMode) el.btnSelectMode.textContent = '⚙️ MODE: RUN REMOTE';
      el.modeSelectionModal.classList.add('hidden');
      log("[MODE SWITCH] Activated 'RUN REMOTE' (Cloud AI Engine Cluster).", "system");
    });
  }

  if (el.btnGpuConfig) el.btnGpuConfig.addEventListener('click', openLocalGpuDrawer);
  if (el.btnCloseGpuDrawer) el.btnCloseGpuDrawer.addEventListener('click', () => el.gpuSettingsDrawer.classList.add('hidden'));
  if (el.btnTestGpuConnection) el.btnTestGpuConnection.addEventListener('click', testLocalGpuConnection);

  if (el.agentModel) {
    el.agentModel.addEventListener('change', () => {
      const val = el.agentModel.value;
      if (val.startsWith('local-')) {
        if (val === 'local-gpu-ollama' && el.gpuEndpointInput) el.gpuEndpointInput.value = 'http://localhost:11434';
        if (val === 'local-gpu-lmstudio' && el.gpuEndpointInput) el.gpuEndpointInput.value = 'http://localhost:1234';
        openLocalGpuDrawer();
      }
    });
  }

  if (el.btnWarningDismiss) el.btnWarningDismiss.addEventListener('click', () => el.originWarning.classList.add('hidden'));

  if (el.btnSpawnSubagent) el.btnSpawnSubagent.addEventListener('click', openDispatchSubagentModal);
  if (el.btnDispatchSubagentLeft) el.btnDispatchSubagentLeft.addEventListener('click', openDispatchSubagentModal);
  if (el.btnConfirmDispatchSubagent) el.btnConfirmDispatchSubagent.addEventListener('click', confirmDispatchSubagent);
  if (el.btnCancelDispatchSubagent) el.btnCancelDispatchSubagent.addEventListener('click', () => el.dispatchSubagentModal.classList.add('hidden'));
  if (el.btnCloseDispatchModal) el.btnCloseDispatchModal.addEventListener('click', () => el.dispatchSubagentModal.classList.add('hidden'));

  if (el.btnResumeAllLeft) el.btnResumeAllLeft.addEventListener('click', resumeAllSubagents);
  if (el.btnResumeAllAux) el.btnResumeAllAux.addEventListener('click', resumeAllSubagents);
  if (el.btnPauseAllLeft) el.btnPauseAllLeft.addEventListener('click', pauseAllSubagents);
  if (el.btnPauseAllAux) el.btnPauseAllAux.addEventListener('click', pauseAllSubagents);
  if (el.btnTerminateAllLeft) el.btnTerminateAllLeft.addEventListener('click', terminateAllSubagents);
  if (el.btnTerminateAllAux) el.btnTerminateAllAux.addEventListener('click', terminateAllSubagents);

  if (el.btnSendMsgLeft) el.btnSendMsgLeft.addEventListener('click', () => openSendMessageModal('all'));
  if (el.btnSendMsgAux) el.btnSendMsgAux.addEventListener('click', () => openSendMessageModal('all'));
  if (el.btnConfirmSendMessage) el.btnConfirmSendMessage.addEventListener('click', confirmSendMessage);
  if (el.btnCancelSendMessage) el.btnCancelSendMessage.addEventListener('click', () => el.subagentMessageModal.classList.add('hidden'));
  if (el.btnCloseMessageModal) el.btnCloseMessageModal.addEventListener('click', () => el.subagentMessageModal.classList.add('hidden'));

  if (el.btnCloseSubagentLogModal) el.btnCloseSubagentLogModal.addEventListener('click', () => el.subagentLogModal.classList.add('hidden'));
  if (el.btnSubagentReassignTask) el.btnSubagentReassignTask.addEventListener('click', () => openReassignModal(state.activeSubagentModalId));
  if (el.btnSubagentTogglePause) el.btnSubagentTogglePause.addEventListener('click', () => togglePauseSubagent(state.activeSubagentModalId));
  if (el.btnSubagentTerminate) el.btnSubagentTerminate.addEventListener('click', () => terminateSubagent(state.activeSubagentModalId));

  if (el.btnConfirmReassign) el.btnConfirmReassign.addEventListener('click', confirmReassign);
  if (el.btnCancelReassign) el.btnCancelReassign.addEventListener('click', () => el.subagentReassignModal.classList.add('hidden'));
  if (el.btnCloseReassignModal) el.btnCloseReassignModal.addEventListener('click', () => el.subagentReassignModal.classList.add('hidden'));

  if (el.btnClearTerminal) {
    el.btnClearTerminal.addEventListener('click', () => {
      synth.playClick();
      el.terminalLog.innerHTML = '';
      log("Terminal buffer cleared.", "system");
    });
  }

  if (el.btnTerminalSend) el.btnTerminalSend.addEventListener('click', handleTerminalCommand);
  if (el.terminalInput) {
    el.terminalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleTerminalCommand();
    });
  }

  if (el.audioToggle) {
    el.audioToggle.addEventListener('click', () => {
      state.audioEnabled = !state.audioEnabled;
      el.audioToggle.textContent = `🔊 SYNTH: ${state.audioEnabled ? 'ON' : 'OFF'}`;
      if (state.audioEnabled) synth.play(660, 'sine', 0.1);
    });
  }

  document.querySelectorAll('.slash-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const cmd = pill.getAttribute('data-cmd');
      if (cmd && el.terminalInput) {
        el.terminalInput.value = cmd;
        handleTerminalCommand();
      }
    });
  });

  if (el.btnExportJson) {
    el.btnExportJson.addEventListener('click', async () => {
      synth.playClick();
      const content = JSON.stringify(state, null, 2);
      const filename = `antigravity_qa_report_${Date.now()}.json`;

      if (isTauriRuntime()) {
        const res = await invokeTauriCommand('save_report_file', { filename, content });
        if (res && res.success) {
          log(`💾 Report file saved natively to: ${res.path}`, "success");
          alert(`Report saved natively via Tauri IPC:\n${res.path}`);
          return;
        }
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", filename);
      dl.click();
    });
  }

  if (el.btnExportPdf) {
    el.btnExportPdf.addEventListener('click', async () => {
      synth.playClick();
      let csv = "Timestamp,Type,LogMessage\n";
      state.logs.forEach(l => {
        csv += `"${l.time}","${l.type}","${l.message.replace(/"/g, '""')}"\n`;
      });
      const filename = `antigravity_qa_logs_${Date.now()}.csv`;

      if (isTauriRuntime()) {
        const res = await invokeTauriCommand('save_report_file', { filename, content: csv });
        if (res && res.success) {
          log(`💾 Execution log saved natively to: ${res.path}`, "success");
          alert(`Logs saved natively via Tauri IPC:\n${res.path}`);
          return;
        }
      }

      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", filename);
      dl.click();
    });
  }

  // Header Layout Toggle button
  const topLayoutToggle = document.getElementById('btn-top-layout-toggle');
  if (topLayoutToggle) topLayoutToggle.addEventListener('click', toggleOptions);
  if (el.btnToggleView) el.btnToggleView.addEventListener('click', toggleOptions);

  setupPhoneRemoteInteractions({
    onStartAgent: () => {
      if (el.agentModel && !el.agentModel.value.startsWith('local-')) {
        el.agentModel.value = 'local-webgpu-inbrowser';
        state.currentModel = 'Local GPU (WebGPU In-Browser Inference)';
        if (el.activeModelDisplay) el.activeModelDisplay.textContent = 'Local GPU (WebGPU In-Browser)';
      }
      initiateTesting();
    },
    onPauseAgent: pauseTesting,
    onVisionScan: () => runLunaVisionScan(false),
    onHealBug: triggerDetectedBug,
    onSelectGame: () => {
      if (el.presetGames) {
        const nextIdx = (el.presetGames.selectedIndex + 1) % el.presetGames.options.length;
        el.presetGames.selectedIndex = nextIdx === 0 ? 1 : nextIdx;
        selectPreset();
      }
    },
    onGlideCursor: glideAgentCursorAndInteract
  });

  setupAuthEventListeners();
}

function startClock() {
  setInterval(() => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    if (el.systemTime) el.systemTime.textContent = time;
  }, 1000);
}

function initApp() {
  initDOM();
  bindEvents();
  initAuthCheck();
  startClock();
  updateSubagentsUI();
  renderReasoningTree();
  renderSourceCodeView();

  hubInstance = new HubManager({
    onLoadTarget: (path) => {
      if (el.gameTarget) el.gameTarget.value = path;
      loadGameTarget();
    },
    onShowViewport: () => {
      hubInstance.showEditorView();
    }
  });
  hubInstance.init();

  applyLayoutMode();
  hubInstance.showEditorView();

  if (isTauriRuntime()) {
    if (el.tauriDesktopBadge) el.tauriDesktopBadge.style.display = 'inline-flex';
    invokeTauriCommand('get_gpu_info').then(info => {
      if (info) {
        state.gpuSettings.renderer = info.renderer || state.gpuSettings.renderer;
        state.gpuSettings.backendMode = 'Native Desktop Hardware (Tauri v2 IPC)';
        log(`🖥️ TAURI DESKTOP RUNTIME ACTIVE: ${info.status || 'Hardware Accelerated'}`, 'success');
      }
    });
  }

  state.metricsTimer = setInterval(updatePerformanceMetrics, 1000);
}

window.addEventListener('DOMContentLoaded', initApp);
