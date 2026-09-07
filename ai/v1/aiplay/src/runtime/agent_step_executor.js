/**
 * Agent Step Executor & Autoplay coordinator
 */
const { ipcRenderer } = require('electron');

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
  logSystemMessage
}) {
  if (!isRunning && !forceHeuristic) return;

  try {
    const screenshotBase64 = await captureViewportScreenshot();
    if (!screenshotBase64) return;

    const nativeProcess = el.nativeProcessSelect.value;
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

    const isAutoplayRequested = (window.cliArgs && window.cliArgs.includes('--autoplay')) || !agentBrain.config.apiKey;
    if (isFriendSlop && isAutoplayRequested) {
      decision = await friendSlopAI(webviewElement);
    } else if (isGraveGain && isAutoplayRequested) {
      decision = await graveGain3dAI(webviewElement, (code) => gameController.executeJS(webviewElement, code));
    }

    if (!decision) {
      decision = await agentBrain.chooseNextAction(screenshotBase64, elements, forceHeuristic, consoleLogs);
    }

    el.brainScreenshot.src = 'data:image/jpeg;base64,' + screenshotBase64;
    el.brainReasoning.innerHTML = `<strong>Action reasoning:</strong><br>${decision.reasoning}`;
    logSystemMessage(`Decision reasoning: ${decision.reasoning}`);

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
        const pyArgs = [decision.action.type];
        if (decision.action.type === 'click') {
          pyArgs.push(decision.action.params.x, decision.action.params.y);
        } else if (decision.action.type === 'keypress') {
          pyArgs.push(decision.action.params ? decision.action.params.key : decision.action.target);
        }
        await ipcRenderer.invoke('run-input-sim', pyArgs);
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
