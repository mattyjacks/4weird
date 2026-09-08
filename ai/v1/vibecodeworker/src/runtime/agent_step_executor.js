/**
 * Agent Step Executor & Autoplay coordinator
 */
const { ipcRenderer } = require('electron');
const { CaptchaDetector } = require('./captcha_detector');
const { NativeGameDirector } = require('./native_game_director');
const { resolveGameProfile } = require('./native_game_profiles');
const { decideNativeActionViaDeepSeek, normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
const captchaDetector = new CaptchaDetector();
let isCaptchaResolving = false;
const nativeDirector = new NativeGameDirector();
// Short rolling history so the vision model does not repeat failing moves.
const nativeActionHistory = [];
function pushNativeHistory(action) {
  if (!action) return;
  nativeActionHistory.push(action);
  if (nativeActionHistory.length > 6) nativeActionHistory.shift();
}

async function executeAgentStep({
  forceHeuristic = false,
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
  commentaryApiKey
}) {
  if (!isRunning && !forceHeuristic) return;
  if (isCaptchaResolving) return;

  try {
    // 1. Check for Active CAPTCHAs (Cloudflare Turnstile, reCAPTCHA, hCaptcha)
    const captchaStatus = await captchaDetector.checkDOMForCaptcha(gameController, webviewElement);
    if (captchaStatus && captchaStatus.detected) {
      isCaptchaResolving = true;
      audio.playBugAlertSound();
      logSystemMessage(`⚠️ [CAPTCHA Detected] ${captchaStatus.type} encountered! Pausing agent for human resolution...`, 'warning');
      
      const banner = document.getElementById('game-status-banner');
      if (banner) {
        banner.textContent = `🚨 CAPTCHA (${captchaStatus.type}) detected! Please solve it in the viewport. Agent will resume automatically...`;
        banner.style.background = 'rgba(234, 179, 8, 0.9)';
        banner.style.color = '#000';
      }

      // Wait for user to solve captcha in viewport
      const resolution = await captchaDetector.waitForResolution(gameController, webviewElement, 120000);
      isCaptchaResolving = false;

      if (resolution.resolved) {
        audio.playClickSound();
        logSystemMessage(`✅ [CAPTCHA Solved] Verification challenge cleared in ${(resolution.elapsedMs / 1000).toFixed(1)}s. Seamlessly resuming agent!`, 'success');
        if (banner) {
          banner.textContent = 'Agent running...';
          banner.style.background = '';
          banner.style.color = '';
        }
      } else {
        logSystemMessage(`⏱️ [CAPTCHA Timeout] Challenge resolution timed out after 120s.`, 'warning');
        return;
      }
    }

    // Frame the real play area before the screenshot so the brain sees the
    // GAME (not the page header) at full size. Native games own their own
    // window and skip this; the embedded webview path is the one that can
    // otherwise show a header sliver.
    const nativeProcess = el.nativeProcessSelect.value;
    if (!nativeProcess) {
      try {
        await require('./display_manager').ensureGameVisible({ webviewElement, gameController });
      } catch (_) { /* framing is best-effort; the step still runs */ }
    }

    const screenshotBase64 = await captureViewportScreenshot();
    if (!screenshotBase64) return;
    const isExternalWindow = await ipcRenderer.invoke('is-game-window-active');
    let elements = [];
    if (!nativeProcess && !isExternalWindow) {
      elements = await gameController.getInteractiveDOM(webviewElement);
    } else if (!nativeProcess && isExternalWindow) {
      elements = await gameController.getInteractiveDOM(null);
    }

    const url = el.gameUrlInput.value;
    const isFriendSlop = url && url.includes('friendslop');
    const isGraveGain = url && url.toLowerCase().includes('gravegain');
    let decision = null;
    let usedBrainDecision = false;

    if (nativeProcess) {
      // Universal path: ANY game via DeepSeek harness vision (HL2:EP2 is the demo).
      // Offline / no-key falls back to the local bandit director.
      const profile = resolveGameProfile(nativeProcess);
      const startFresh = el.nativeStartNewGame?.checked === true;
      const skipCutscenes = el.nativeSkipCutscenes?.checked !== false;
      const operatorRules = el.gameRulesInput ? el.gameRulesInput.value : (el.gameRules ? el.gameRules.value : '');
      const extraRules = [
        operatorRules,
        startFresh && profile.id === 'hl2-ep2' ? 'Start a new game: choose New Game, then accept the default difficulty.' : '',
        skipCutscenes ? 'Skip a cinematic only when the frame visibly offers a Skip/Continue prompt or a non-interactive cinematic. Never press Escape blindly during live gameplay.' : ''
      ].filter(Boolean).join('\n');
      const hasKey = !!(agentBrain && agentBrain.config && agentBrain.config.apiKey);
      nativeDirector.setTarget(nativeProcess);
      decision = nativeDirector.chooseStartup(profile.id, startFresh);
      if (!decision && hasKey && !forceHeuristic) {
        try {
          const stuck = agentBrain.detectStuckState ? agentBrain.detectStuckState(screenshotBase64) : false;
          decision = await decideNativeActionViaDeepSeek(agentBrain, {
            screenshotBase64,
            windowTitle: nativeProcess,
            profile,
            recentActions: nativeActionHistory.slice(),
            stuck,
            extraRules
          });
          decision.reasoning = `[${profile.id} via DeepSeek harness] ${decision.reasoning}`;
        } catch (visionErr) {
          nativeDirector.setTarget(nativeProcess);
          decision = nativeDirector.choose(screenshotBase64);
          decision.reasoning = `[${profile.id} offline fallback: ${visionErr.message}] ${decision.reasoning} Learned outcomes: ${JSON.stringify(nativeDirector.summary())}.`;
        }
      } else if (!decision) {
        decision = nativeDirector.choose(screenshotBase64);
        decision.reasoning = `[${profile.id} heuristic] ${decision.reasoning} Learned action outcomes: ${JSON.stringify(nativeDirector.summary())}.`;
      }
    }

    const isAutoplayRequested = (window.cliArgs && window.cliArgs.includes('--autoplay')) || !agentBrain.config.apiKey;
    if (isFriendSlop && isAutoplayRequested) {
      decision = await friendSlopAI(webviewElement);
    } else if (isGraveGain && isAutoplayRequested) {
      decision = await graveGain3dAI(webviewElement, (code) => gameController.executeJS(webviewElement, code));
    }

    if (!decision) {
      decision = await agentBrain.chooseNextAction(screenshotBase64, elements, forceHeuristic, consoleLogs);
      usedBrainDecision = true;
    }

    // Native game directors and specialized autoplay controllers have their
    // own decision path. Feed their completed choice into the shared brain so
    // HL2/gameplay discoveries receive the same durable text summaries.
    if (!usedBrainDecision && agentBrain.recordExternalDecision) {
      agentBrain.recordExternalDecision(decision, { domSnapshot: elements });
    }

    el.brainScreenshot.src = 'data:image/jpeg;base64,' + screenshotBase64;
    el.brainReasoning.innerHTML = `<strong>Action reasoning:</strong><br>${decision.reasoning}`;
    logSystemMessage(`Decision reasoning: ${decision.reasoning}`);
    // Commentary is intentionally fire-and-forget: speech generation must
    // never add latency to gameplay input or the next agent decision.
    if (thinkingOutLoud) {
      void thinkingOutLoud.comment(decision, typeof commentaryApiKey === 'function' ? commentaryApiKey() : '');
    }

    timelineHistory.push({
      timestamp: Date.now(),
      screenshot: screenshotBase64,
      reasoning: decision.reasoning,
      action: decision.action
    });

    el.timelineScrubber.max = timelineHistory.length - 1;
    el.timelineScrubber.value = timelineHistory.length - 1;
    el.timelineTime.textContent = `Tick: ${timelineHistory.length}/${timelineHistory.length}`;
    el.timelineContainer.classList.remove('hidden');

    if (decision.action) {
      audio.playAgentActionSound();
      logSystemMessage(`Executing action: ${decision.action.type} -> ${JSON.stringify(decision.action.params || {})}`, 'action');

      if (decision.action.type === 'click' || decision.action.type === 'move_mouse') {
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

        const zoneX = Math.floor(px / 100) * 100;
        const zoneY = Math.floor(py / 100) * 100;
        const key = `(${zoneX}-${zoneX+99}, ${zoneY}-${zoneY+99})`;
        agentBrain.sessionStats.clickZones[key] = (agentBrain.sessionStats.clickZones[key] || 0) + 1;

        if (!decision.action.params) {
          decision.action.params = { x: px, y: py };
        }
      } else {
        clearHeatmapCanvas();
      }

      agentBrain.sessionStats.steps += 1;
      agentBrain.sessionStats.actionMix[decision.action.type] = (agentBrain.sessionStats.actionMix[decision.action.type] || 0) + 1;

      if (nativeProcess) {
        // Native input is handled by the Python bridge. Normalize the vision
        // decision (any game, any model shape) then translate to bridge argv
        // and always include the selected window title.
        decision.action = normalizeNativeAction(decision.action);
        pushNativeHistory(decision.action);
        const actionType = decision.action.type;
        if (actionType === 'wait') {
          const duration = decision.action.duration_ms || 500;
          await new Promise(resolve => setTimeout(resolve, duration));
          logSystemMessage(`Native action result: waited ${duration}ms`);
        } else {
          // Legacy alias: older brains emit 'keypress'.
          if (actionType === 'keypress') decision.action = normalizeNativeAction({ type: 'press_key', target: decision.action.target, params: decision.action.params });
          const pyArgs = toInputSimArgs(decision.action);
          if (pyArgs) {
            pyArgs.push(nativeProcess);
            const actionResult = await ipcRenderer.invoke('run-input-sim', pyArgs);
            if (!actionResult?.success) {
              throw new Error(actionResult?.error || 'Native input command failed');
            }
            logSystemMessage(`Native action result: ${actionResult.stdout || 'completed'}`);
          } else {
            logSystemMessage(`Native action ${decision.action.type} handled locally (no bridge call).`);
          }
        }
      } else {
        const actionResult = await gameController.executeAction(webviewElement, decision.action);
        logSystemMessage(`Action result: ${actionResult}`);
      }
    }

    tracker.updateSessionStatsUI(agentBrain, el);

    if (el.autocodeCaptureOnPlay.checked) {
      captureManualScreenshot();
    }

    const isNewBugFound = agentBrain.scanForBugs(screenshotBase64, consoleLogs);
    if (isNewBugFound) {
      audio.playBugAlertSound();
      tracker.renderBugs(el.bugsContainer, el.bugCountBadge, agentBrain, selectBugCard);
      logSystemMessage("⚠️ CRASH / EXCEPTION BUG IDENTIFIED!", "error");
      agentBrain.saveBugs(bugsLogPath);
    }

    tracker.updateTokenStatsUI(agentBrain, el.tokenModelSelect, el);

  } catch (err) {
    logSystemMessage(`Autopilot step execution failed: ${err.message}`, 'warning');
  }
}

module.exports = {
  executeAgentStep
};
