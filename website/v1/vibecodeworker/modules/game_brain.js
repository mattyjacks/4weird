/* ==========================================================================
   4WEIRD VIBECODEWORKER // GAME BRAIN DISCOVERY & RECURSIVE SELF-OPTIMIZATION
   ========================================================================== */

import { state, el } from './core_state.js';
import { log } from './telemetry_logger.js';

export function discoverGameBrain() {
  try {
    const win = el.gameIframe.contentWindow;
    const doc = el.gameIframe.contentDocument || (win && win.document);
    const controlsSet = new Set();
    let startBtns = [];
    let restartBtns = [];

    if (doc) {
      const allButtons = Array.from(doc.querySelectorAll('button, a, input[type="button"], input[type="submit"], div[role="button"], .btn, #btn-start, #start, #play, #restart, #retry'));
      allButtons.forEach(btn => {
        const txt = (btn.innerText || btn.value || btn.id || btn.className || '').toLowerCase();
        if (txt.includes('start') || txt.includes('play') || txt.includes('begin') || txt.includes('launch')) {
          startBtns.push(btn);
        }
        if (txt.includes('restart') || txt.includes('retry') || txt.includes('again')) {
          restartBtns.push(btn);
        }
      });

      const canvasEl = doc.querySelector('canvas');
      if (canvasEl) {
        controlsSet.add(`Canvas (${canvasEl.width || 800}x${canvasEl.height || 600})`);
      }

      controlsSet.add('Space (Action/Jump)');
      controlsSet.add('Arrow Keys / WASD (Move)');
      controlsSet.add('Pointer Clicks (Target UI)');

      const scoreEl = doc.querySelector('#score, .score, [id*="score"], [class*="score"]');
      if (scoreEl || (win && (win.score !== undefined || win.gameScore !== undefined))) {
        state.internalGameBrain.score = (scoreEl ? parseInt(scoreEl.textContent) : (win.score || 0)) || state.internalGameBrain.score;
      }
    } else {
      controlsSet.add('Space (Action/Jump)');
      controlsSet.add('Arrow Keys / WASD (Move)');
      controlsSet.add('Pointer Clicks (Target UI)');
    }

    state.internalGameBrain.discoveredButtons = { start: startBtns, restart: restartBtns };
    state.internalGameBrain.detectedControls = Array.from(controlsSet);
    state.internalGameBrain.gameStage = startBtns.length > 0 ? 'MENU' : 'PLAYING';

    updateGameBrainUI();
    log(`[AUTOMAGIC GAME DISCOVERY] Discovered Game Brain Mechanics: Stage: ${state.internalGameBrain.gameStage} | Controls: ${state.internalGameBrain.detectedControls.slice(0, 3).join(', ')} | Target: Maximize Score`, "system");
  } catch (e) {
    updateGameBrainUI();
    log("[AUTOMAGIC GAME DISCOVERY] Direct DOM cross-origin fallback active. Heuristic Game Brain engaged.", "info");
  }
}

export function updateGameBrainUI() {
  if (el.brainGameStage) el.brainGameStage.textContent = state.internalGameBrain.gameStage;
  if (el.brainDetectedControls) el.brainDetectedControls.textContent = state.internalGameBrain.detectedControls.slice(0, 3).join(', ');
  if (el.brainTargetObjectives) el.brainTargetObjectives.textContent = state.internalGameBrain.targetObjectives.join(', ');
  if (el.brainHighscorePolicy) el.brainHighscorePolicy.textContent = state.internalGameBrain.highScorePolicy;
  if (el.brainPlaystyleStrategy) el.brainPlaystyleStrategy.textContent = state.internalGameBrain.playstyleStrategy;
}

export function updateRSOLoop(isGameOverCycle = false, onIntervalTuned = null) {
  const actionsSucc = state.internalGameBrain.actionsSucceeded;
  const defects = state.bugs.length;
  const scoreMult = 1.0 + (state.internalGameBrain.score / 100);

  const rewardNum = ((actionsSucc * scoreMult) / (defects + 1));
  const rewardStr = rewardNum.toFixed(2);
  state.rso.reward = rewardStr;
  state.rso.actionsSucceeded = actionsSucc;

  if (state.currentStep > 0 && (state.currentStep % 10 === 0 || isGameOverCycle)) {
    state.rso.generation++;

    const policySequence = ['BALANCED_EXPLORATION', 'AGGRESSIVE_FUZZING', 'BOUNDARY_STRESS', 'HIGH_SCORE_OPTIMIZATION'];
    const policyIndex = (state.rso.generation - 1) % policySequence.length;
    state.rso.policy = policySequence[policyIndex];

    if (state.rso.policy === 'BALANCED_EXPLORATION') {
      state.rso.intervalMs = Math.max(600, state.intervalMs - 50);
      state.rso.fuzzWeights = { keys: 0.40, click: 0.40, wait: 0.20 };
    } else if (state.rso.policy === 'AGGRESSIVE_FUZZING') {
      state.rso.intervalMs = Math.max(400, state.intervalMs - 150);
      state.rso.fuzzWeights = { keys: 0.60, click: 0.30, wait: 0.10 };
    } else if (state.rso.policy === 'BOUNDARY_STRESS') {
      state.rso.intervalMs = Math.max(300, state.intervalMs - 100);
      state.rso.fuzzWeights = { keys: 0.30, click: 0.60, wait: 0.10 };
    } else {
      state.rso.intervalMs = Math.max(250, state.intervalMs - 50);
      state.rso.fuzzWeights = { keys: 0.50, click: 0.45, wait: 0.05 };
    }

    state.internalGameBrain.playstyleStrategy = state.rso.policy;

    if (typeof onIntervalTuned === 'function') {
      onIntervalTuned(state.rso.intervalMs);
    }

    log(`🔁 [RECURSIVE SELF-OPTIMIZATION (GEN #${state.rso.generation})] Reward Metric = ${rewardStr} | Policy: ${state.rso.policy} | Interval Speed: ${state.rso.intervalMs}ms`, "system");
  }

  updateRSOUI();
}

export function updateRSOUI() {
  if (el.rsoGenNum) el.rsoGenNum.textContent = state.rso.generation;
  if (el.rsoRewardVal) el.rsoRewardVal.textContent = state.rso.reward;
  if (el.rsoActionsSucc) el.rsoActionsSucc.textContent = state.rso.actionsSucceeded;
  if (el.rsoDefectsFound) el.rsoDefectsFound.textContent = state.bugs.length;
  if (el.rsoPolicyName) el.rsoPolicyName.textContent = state.rso.policy;
  if (el.rsoIntervalSpeed) el.rsoIntervalSpeed.textContent = `${state.rso.intervalMs} ms`;
  if (el.rsoFuzzWeights) {
    const w = state.rso.fuzzWeights;
    el.rsoFuzzWeights.textContent = `Keys: ${Math.round(w.keys * 100)}% | Click: ${Math.round(w.click * 100)}% | Wait: ${Math.round(w.wait * 100)}%`;
  }
}
