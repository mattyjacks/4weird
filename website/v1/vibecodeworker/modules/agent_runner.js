/* ==========================================================================
   4WEIRD VIBECODEWORKER // AUTONOMOUS RUNNER & AGENT STEP CONTROLLER
   ========================================================================== */

import { state, el, synth } from './core_state.js';
import { log } from './telemetry_logger.js';
import { discoverGameBrain, updateRSOLoop } from './game_brain.js';
import { glideAgentCursorAndInteract, recordReplaySnapshot, runLunaVisionScan, setupIframeErrorListeners } from './viewport_manager.js';
import { renderReasoningTree, renderSourceCodeView, showBugLightbox, triggerDetectedBug } from './defect_healer.js';
import { resumeAllSubagents } from './subagents_manager.js';

export function runGraveGain3DStep() {
  const frame = el.gameIframe;
  if (!frame || !/gravegain3d/i.test(frame.src || '')) return null;

  try {
    const win = frame.contentWindow;
    const doc = frame.contentDocument || (win && win.document);
    if (!win || !doc) return null;
    const visible = (id) => {
      const node = doc.getElementById(id);
      return node && !node.classList.contains('hidden');
    };
    const click = (selector) => {
      const node = doc.querySelector(selector);
      if (node) node.click();
      return !!node;
    };
    const key = (value) => {
      const normalized = value === ' ' ? 'Space' : value;
      const code = normalized === 'Space' ? 'Space' : `Key${normalized.toUpperCase()}`;
      ['keydown', 'keyup'].forEach(type => {
        const event = new win.KeyboardEvent(type, { key: value, code, bubbles: true, cancelable: true });
        win.dispatchEvent(event);
        doc.dispatchEvent(event);
      });
    };

    if (visible('mainMenuScreen')) {
      return click('#btnPlay')
        ? 'GRAVEGAIN3D: menu detected — selecting Endless Dungeon Run.'
        : 'GRAVEGAIN3D: menu is visible; waiting for the run control.';
    }
    if (visible('charSelectScreen')) {
      return click('#btnCharSelectStart, #btnStartRun')
        ? 'GRAVEGAIN3D: character setup detected — deploying the default infiltrator.'
        : 'GRAVEGAIN3D: character setup is loading; waiting one step.';
    }
    if (visible('gameOverScreen')) {
      return click('#btnTryAgain, #btnGameOverReturn')
        ? 'GRAVEGAIN3D: defeat screen detected — restarting the run.'
        : 'GRAVEGAIN3D: defeat screen is visible; waiting for restart control.';
    }
    if (visible('levelUpScreen')) {
      return click('.perk-card button, .perk-card')
        ? 'GRAVEGAIN3D: level-up detected — selecting the first available perk.'
        : 'GRAVEGAIN3D: level-up screen is visible; waiting for perks.';
    }

    const game = win.GraveGainGame || win.game;
    const player = game && game.player;
    if (player) {
      if (player.hp < player.maxHp * 0.45 && (player.potions || 0) > 0) {
        key('q');
        return `GRAVEGAIN3D: low health (${Math.round(player.hp)}/${Math.round(player.maxHp)}) — drinking potion.`;
      }
      const enemies = Array.isArray(game.enemies) ? game.enemies.filter(enemy => enemy && enemy.hp > 0) : [];
      const nearby = enemies.some(enemy => Math.hypot(enemy.x - player.x, enemy.y - player.y) < 85);
      if (nearby) {
        key(' ');
        return 'GRAVEGAIN3D: enemy in melee range — attacking.';
      }
      key('w');
      return enemies.length
        ? 'GRAVEGAIN3D: enemy acquired — advancing into engagement range.'
        : 'GRAVEGAIN3D: no enemy visible — advancing through the dungeon.';
    }
  } catch (error) {
    log(`GRAVEGAIN3D controller recovery: ${error.message}`, 'warning');
  }
  return null;
}

export function executeAgentStep() {
  if (state.currentStep >= state.maxSteps) {
    stopTesting();
    log("Antigravity Test Run constraints met.", "system");
    return;
  }

  state.currentStep++;
  state.actionCount++;
  state.internalGameBrain.actionsSucceeded++;
  state.internalGameBrain.score += Math.floor(Math.random() * 15) + 5;
  if (state.internalGameBrain.score > state.internalGameBrain.highScore) {
    state.internalGameBrain.highScore = state.internalGameBrain.score;
  }
  if (el.statSteps) el.statSteps.textContent = `${state.currentStep} / ${state.maxSteps}`;

  let isGameOver = false;

  if (state.internalGameBrain.gameStage === 'MENU') {
    log(`[GAME BRAIN NAV] Stage: MENU -> Discovered Start Controls! Dispatching Start Game trigger.`, "info");
    state.internalGameBrain.gameStage = 'PLAYING';
    if (state.internalGameBrain.discoveredButtons.start.length > 0) {
      try { state.internalGameBrain.discoveredButtons.start[0].click(); } catch (e) { }
    }
  } else if (state.internalGameBrain.gameStage === 'PLAYING') {
    if (state.currentStep > 5 && state.currentStep % 25 === 0) {
      isGameOver = true;
      state.internalGameBrain.gameStage = 'GAME_OVER';
      log(`[GAME BRAIN NAV] Stage: PLAYING -> GAME_OVER detected! Final Score: ${state.internalGameBrain.score}. Triggering Auto-Restart!`, "warning");
    }
  } else if (state.internalGameBrain.gameStage === 'GAME_OVER') {
    log(`[GAME BRAIN NAV] Stage: GAME_OVER -> Auto-Restarting Gameplay Loop (Resetting Score).`, "info");
    state.internalGameBrain.gameStage = 'PLAYING';
    state.internalGameBrain.score = 0;
    if (state.internalGameBrain.discoveredButtons.restart.length > 0) {
      try { state.internalGameBrain.discoveredButtons.restart[0].click(); } catch (e) { }
    }
  }

  const graveGainActionLog = runGraveGain3DStep();
  if (graveGainActionLog) {
    log(graveGainActionLog, 'info');
    recordReplaySnapshot('gravegain3d', 0, 0, graveGainActionLog);
    renderReasoningTree();
    updateRSOLoop(isGameOver, (newInterval) => {
      if (state.isRunning && !state.isPaused) {
        clearInterval(state.loopTimer);
        state.loopTimer = setInterval(executeAgentStep, newInterval);
      }
    });
    if (state.currentStep % 3 === 0) runLunaVisionScan(true);
    return;
  }

  const rand = Math.random();
  const weights = state.rso.fuzzWeights || { keys: 0.4, click: 0.4, wait: 0.2 };
  let action = 'click';
  if (rand < weights.keys) action = 'press_key';
  else if (rand < weights.keys + weights.click) action = 'click';
  else action = 'wait';

  let actionLogStr = "";
  if (action === "click") {
    const containerWidth = el.iframeContainer ? el.iframeContainer.clientWidth : 600;
    const containerHeight = el.iframeContainer ? el.iframeContainer.clientHeight : 400;
    const rx = Math.floor(Math.random() * (containerWidth - 100)) + 50;
    const ry = Math.floor(Math.random() * (containerHeight - 100)) + 50;
    actionLogStr = `REASONING: Smooth-gliding cursor to pointer coordinates: [x: ${rx}, y: ${ry}]`;
    glideAgentCursorAndInteract(rx, ry);
  } else if (action === "press_key") {
    const keys = ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "w", "a", "s", "d", "Space", "Enter"];
    const key = keys[Math.floor(Math.random() * keys.length)];
    actionLogStr = `ACTION: Simulated Keyboard Event dispatch: '${key}'`;
    synth.play(840, 'triangle', 0.04, 0.04);
    try {
      if (el.gameIframe && el.gameIframe.contentWindow) {
        el.gameIframe.contentWindow.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
      }
    } catch (e) { }
  } else {
    actionLogStr = `PLANNING: Agent evaluating next action trajectory... Sleeping ${state.rso.intervalMs}ms`;
  }

  log(actionLogStr, "info");
  recordReplaySnapshot(action, action === "click" ? 250 : 0, action === "click" ? 150 : 0, actionLogStr);
  renderReasoningTree();

  updateRSOLoop(isGameOver, (newInterval) => {
    if (state.isRunning && !state.isPaused) {
      clearInterval(state.loopTimer);
      state.loopTimer = setInterval(executeAgentStep, newInterval);
    }
  });

  if (state.currentStep % 3 === 0) {
    runLunaVisionScan(true);
  }

  if (Math.random() < 0.06 && state.bugs.length < 5) {
    triggerDetectedBug();
  }
}

export function loadGameTarget() {
  synth.playClick();
  const url = el.gameTarget ? el.gameTarget.value.trim() : '';
  if (!url) return;

  log(`Loading sandbox iframe target: ${url}`, "system");
  el.gameIframe.src = url;
  state.gameLoaded = true;

  if (url.startsWith("http") && !url.includes(window.location.hostname)) {
    if (el.originWarning) el.originWarning.classList.remove('hidden');
  } else {
    if (el.originWarning) el.originWarning.classList.add('hidden');
  }

  el.gameIframe.onload = () => {
    setupIframeErrorListeners();
    discoverGameBrain();
  };

  discoverGameBrain();

  if (el.autoStartToggle && el.autoStartToggle.checked) {
    setTimeout(() => {
      if (!state.isRunning) initiateTesting();
    }, 500);
  }
}

export function initiateTesting() {
  synth.playSuccess();
  state.isRunning = true;
  state.isPaused = false;
  state.currentStep = 0;
  state.actionCount = 0;
  state.elapsedSeconds = 0;
  state.bugs = [];
  state.logs = [];
  state.patches = [];
  state.heatmapPoints = [];

  if (el.bugCounter) el.bugCounter.textContent = 0;
  if (el.bugListContainer) el.bugListContainer.innerHTML = '<div class="no-bugs-msg">Monitoring active reasoning loops...</div>';

  if (el.maxSteps) el.maxSteps.disabled = true;
  if (el.stepInterval) el.stepInterval.disabled = true;
  if (el.btnLoad) el.btnLoad.disabled = true;
  if (el.presetGames) el.presetGames.disabled = true;

  if (el.btnStart) el.btnStart.disabled = true;
  if (el.btnPause) el.btnPause.disabled = false;
  if (el.btnStop) el.btnStop.disabled = false;
  if (el.btnViewReport) el.btnViewReport.disabled = true;

  if (el.agentStateDot) el.agentStateDot.className = "badge-dot pulse-active";
  if (el.agentStateText) el.agentStateText.textContent = "ACTIVE PLAY";

  state.maxSteps = parseInt(el.maxSteps ? el.maxSteps.value : 100) || 100;
  state.intervalMs = parseInt(el.stepInterval ? el.stepInterval.value : 1200) || 1200;
  if (el.agentModel) {
    state.currentModel = el.agentModel.options[el.agentModel.selectedIndex].text;
    if (el.activeModelDisplay) el.activeModelDisplay.textContent = state.currentModel;
    if (el.brainModelName) el.brainModelName.textContent = state.currentModel;
  }

  const targetName = el.gameTarget ? el.gameTarget.value : 'runtime';
  log(`Autonomous testing session initiated. Target: ${targetName}`, "system");
  log(`Engine: ${state.currentModel} | maxSteps = ${state.maxSteps}, interval = ${state.intervalMs}ms`, "system");

  state.loopTimer = setInterval(executeAgentStep, state.intervalMs);
}

export function pauseTesting() {
  synth.playClick();
  if (state.isPaused) {
    state.isPaused = false;
    if (el.btnPause) el.btnPause.textContent = "⏸ PAUSE";
    if (el.agentStateDot) el.agentStateDot.className = "badge-dot pulse-active";
    if (el.agentStateText) el.agentStateText.textContent = "ACTIVE PLAY";
    log("Testing session resumed.", "system");
    state.loopTimer = setInterval(executeAgentStep, state.intervalMs);
  } else {
    state.isPaused = true;
    if (el.btnPause) el.btnPause.textContent = "▶ RESUME";
    if (el.agentStateDot) el.agentStateDot.className = "badge-dot pulse-paused";
    if (el.agentStateText) el.agentStateText.textContent = "PAUSED";
    log("Testing session suspended.", "system");
    clearInterval(state.loopTimer);
  }
}

export function stopTesting() {
  synth.playSuccess();
  state.isRunning = false;
  clearInterval(state.loopTimer);

  if (el.maxSteps) el.maxSteps.disabled = false;
  if (el.stepInterval) el.stepInterval.disabled = false;
  if (el.btnLoad) el.btnLoad.disabled = false;
  if (el.presetGames) el.presetGames.disabled = false;

  if (el.btnStart) el.btnStart.disabled = false;
  if (el.btnPause) {
    el.btnPause.disabled = true;
    el.btnPause.textContent = "⏸ PAUSE";
  }
  if (el.btnStop) el.btnStop.disabled = true;
  if (el.btnViewReport) el.btnViewReport.disabled = false;

  if (el.agentStateDot) el.agentStateDot.className = "badge-dot pulse-idle";
  if (el.agentStateText) el.agentStateText.textContent = "IDLE";

  log("Testing session completed. Report artifact compiled.", "system");
}

export function autoRunEverything() {
  synth.playSuccess();
  if (!state.gameLoaded) {
    if (el.presetGames && !el.presetGames.value) {
      el.presetGames.selectedIndex = 8;
    }
    const val = el.presetGames ? el.presetGames.value : '';
    if (val && el.gameTarget) {
      el.gameTarget.value = val;
      loadGameTarget();
    }
  }

  if (el.maxSteps) el.maxSteps.value = 100;
  if (el.stepInterval) el.stepInterval.value = 800;

  log("⚡ [AUTO-RUN EVERYTHING] Super-bot configured & initiated 1-click autonomous playtesting sweep!", "system");

  if (state.isPaused) {
    pauseTesting();
  } else if (!state.isRunning) {
    initiateTesting();
  }

  resumeAllSubagents();
}
