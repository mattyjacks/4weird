/**
 * Agent Step Executor & Autoplay coordinator
 */
const { ipcRenderer } = require('electron');
const { CaptchaDetector } = require('./captcha_detector');
const { NativeGameDirector } = require('./native_game_director');
const { resolveGameProfile } = require('./native_game_profiles');
const { decideNativeActionViaDeepSeek, normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
const { simpleHash } = require('../../lib/brain/stuck_detector');
const { classifyUrgency, computeNextDelay, frameDeltaLevel, midProbePlan } = require('./adaptive_tick');
const { decideOvertake } = require('../../lib/brain/overtake_reflex');
const captchaDetector = new CaptchaDetector();
let isCaptchaResolving = false;
const nativeDirector = new NativeGameDirector();
// Short rolling history so the vision model does not repeat failing moves.
const nativeActionHistory = [];
// Last pre-tick frame signature for the adaptive tick planner: sizing the
// NEXT delay from how fast the screen is changing costs one hash, no pixels.
let lastPreFrame = null;
// Last fovea overlay key sent to the playtest recorder (run-scoped so each
// agent session logs its crop plan at least once; rect-only, no pixels).
let lastFoveaKey = null;
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
  captureVisionFrame,
  captureManualScreenshot,
  logSystemMessage,
  thinkingOutLoud,
  commentaryApiKey
}) {
  if (!isRunning && !forceHeuristic) return null;
  if (isCaptchaResolving) return null;

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
        return null;
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

    // Foveated vision: 1 small overview + up to 3 tiny detail crops where the
    // model wants more pixels (FPS crosshair fast path). The capture helper
    // owns rect selection (pending AI focus + genre/urgency defaults); this
    // step just normalizes its return shape so legacy string captures keep
    // working. Small crops = small tokens = faster decisions + faster inputs.
    let screenshotBase64 = null;
    let detailImages = [];
    let visionMeta = null;
    try {
      if (typeof captureVisionFrame === 'function') {
        const frame = await captureVisionFrame();
        if (frame && typeof frame === 'object' && !Array.isArray(frame)) {
          screenshotBase64 = frame.overview || null;
          detailImages = Array.isArray(frame.details)
            ? frame.details.map((d) => (typeof d === 'string' ? d : d && d.base64)).filter((s) => typeof s === 'string' && s.length > 100)
            : [];
          visionMeta = frame.meta || (Array.isArray(frame.details)
            ? { details: frame.details.map((d, i) => ({ label: (d && d.label) || `crop${i + 1}`, rect: (d && d.rect) || null })) }
            : null);
        } else if (typeof frame === 'string') {
          screenshotBase64 = frame;
        }
      }
    } catch (_) { /* foveated capture is best-effort; fall back below */ }
    if (!screenshotBase64 && typeof captureViewportScreenshot === 'function') {
      screenshotBase64 = await captureViewportScreenshot();
    }
    if (!screenshotBase64) return null;
    // Fovea breadcrumb for the testing videos: log the tick's detail-crop
    // boundaries (rects only, no pixels) so TestingH/V exports can draw the
    // crop boxes + picture-in-picture renders. Change-throttled per run so
    // the manifest stays tiny; the recorder no-ops when idle.
    try {
      const foveaDetails = visionMeta && Array.isArray(visionMeta.details) ? visionMeta.details : [];
      if (foveaDetails.length && ipcRenderer && typeof ipcRenderer.send === 'function') {
        const runId = (agentBrain && agentBrain.activeRunId) || 'norun';
        const foveaKey = `${runId}|${foveaDetails.map((d) => `${(d && d.label) || 'crop'}:${d && d.rect ? `${d.rect.x},${d.rect.y},${d.rect.w},${d.rect.h}` : '?'}`).join('|')}`;
        if (foveaKey !== lastFoveaKey) {
          lastFoveaKey = foveaKey;
          ipcRenderer.send('playtest-recording-event', {
            type: 'fovea',
            rects: foveaDetails.map((d) => ({ label: String((d && d.label) || 'detail').slice(0, 40), ...(d && d.rect ? d.rect : {}) })),
            detailCount: foveaDetails.length,
            source: (visionMeta && visionMeta.source) || 'fovea'
          });
        }
      }
    } catch (_) { /* recording is optional */ }
    // Frame-change signal for the adaptive tick: compare this pre-frame
    // against the previous tick's (hash + byte size, no pixel decode).
    const preFrame = { hash: simpleHash(screenshotBase64), bytes: screenshotBase64.length };
    const frameDelta = frameDeltaLevel(lastPreFrame, preFrame);
    lastPreFrame = preFrame;
    const isExternalWindow = await ipcRenderer.invoke('is-game-window-active');
    let elements = [];
    if (!nativeProcess && !isExternalWindow) {
      elements = await gameController.getInteractiveDOM(webviewElement);
    } else if (!nativeProcess && isExternalWindow) {
      elements = await gameController.getInteractiveDOM(null);
    }

    const url = el.gameUrlInput.value;
    const isOvertake = /(?:^|[\\/])overtake(?:[\\/]|$)|overtake/i.test(url || '');
    const isFriendSlop = url && url.includes('friendslop');
    const isGraveGain = url && url.toLowerCase().includes('gravegain');
    let decision = null;
    let usedBrainDecision = false;

    // Overtake publishes a deliberately read-only telemetry snapshot.  Use a
    // local reflex tree for frame-critical steering; a remote model's network
    // round trip is inappropriate for this loop and is still available for
    // unfamiliar games, failures, and code-level QA.  The snapshot call is a
    // single webview round trip and gracefully falls back to BRAID if absent.
    if (isOvertake && !nativeProcess) {
      try {
        const telemetry = await gameController.executeJS(webviewElement,
          'window.gameState && typeof window.gameState.snapshot === "function" ? window.gameState.snapshot() : null');
        decision = decideOvertake(telemetry || {});
        if (decision) decision.reasoning += ' Local bitwise telemetry policy; no model round trip.';
      } catch (_) { /* Older/remote Overtake builds continue through BRAID. */ }
    }

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
            extraRules,
            extraImages: detailImages,
            visionMeta
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
      decision = await agentBrain.chooseNextAction(screenshotBase64, elements, forceHeuristic, consoleLogs, {
        extraImages: detailImages,
        visionMeta
      });
      usedBrainDecision = true;
    }

    // Native game directors and specialized autoplay controllers have their
    // own decision path. Feed their completed choice into the shared brain so
    // HL2/gameplay discoveries receive the same durable text summaries.
    if (!usedBrainDecision && agentBrain.recordExternalDecision) {
      agentBrain.recordExternalDecision(decision, { domSnapshot: elements });
    }

    el.brainScreenshot.src = 'data:image/jpeg;base64,' + screenshotBase64;
    el.brainReasoning.textContent = '';
    {
      const label = document.createElement('strong');
      label.textContent = 'Action reasoning:';
      el.brainReasoning.appendChild(label);
      el.brainReasoning.appendChild(document.createElement('br'));
      el.brainReasoning.appendChild(document.createTextNode(String(decision.reasoning ?? '')));
    }
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
      action: decision.action,
      detailCount: detailImages.length,
      focus: Array.isArray(decision.focus) ? decision.focus : []
    });

    el.timelineScrubber.max = timelineHistory.length - 1;
    el.timelineScrubber.value = timelineHistory.length - 1;
    el.timelineTime.textContent = `Tick: ${timelineHistory.length}/${timelineHistory.length}`;
    el.timelineContainer.classList.remove('hidden');

    // Urgency for this tick: explicit model vote wins, else infer from
    // status/reasoning so combat snaps the follow-up tick even when the
    // model forgets to set urgency.
    const tickUrgency = classifyUrgency({
      status: decision.status,
      reasoning: decision.reasoning,
      urgency: decision.urgency
    });
    // Staggered mid-action probe: long holds/combos arm a screenshot halfway
    // through execution. A sudden frame change surfaces here instead of a
    // full slow tick later - the follow-up delay shortens accordingly.
    const probePlan = decision.action ? midProbePlan(decision.action) : { probe: false, probeDelayMs: 0 };
    let midFrame = null;
    let probeTimer = null;
    let midDelta = 1;
    if (probePlan.probe && typeof captureViewportScreenshot === 'function') {
      probeTimer = setTimeout(async () => {
        try {
          const mid = await captureViewportScreenshot();
          if (mid) {
            midFrame = { hash: simpleHash(mid), bytes: mid.length };
            midDelta = frameDeltaLevel(preFrame, midFrame);
            if (midDelta >= 2) {
              logSystemMessage(`Mid-action probe: screen changed sharply during ${decision.action.type} - next tick will hurry.`, 'action');
            }
          }
        } catch (_) { /* probes are best-effort; the step still runs */ }
      }, probePlan.probeDelayMs);
      if (probeTimer.unref) probeTimer.unref();
    }

    const execT0 = Date.now();
    if (decision.action) {
      audio.playAgentActionSound();
      logSystemMessage(`Executing action: ${decision.action.type} -> ${JSON.stringify(decision.action.params || {})}`, 'action');

      if (decision.action.type === 'click' || decision.action.type === 'move_mouse' ||
          decision.action.type === 'right_click' || decision.action.type === 'double_click') {
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
      } else if (decision.action.type === 'combo' && decision.action.params && Array.isArray(decision.action.params.steps)) {
        // Heatmap the combo's click-ish steps so the trail stays truthful.
        for (const step of decision.action.params.steps) {
          if ((step.op === 'click' || step.op === 'right_click' || step.op === 'double_click' || step.op === 'move') &&
              Number.isFinite(step.x) && Number.isFinite(step.y)) {
            drawHeatmapDot(step.x, step.y);
          }
        }
      } else {
        clearHeatmapCanvas();
      }

      agentBrain.sessionStats.steps += 1;
      agentBrain.sessionStats.actionMix[decision.action.type] = (agentBrain.sessionStats.actionMix[decision.action.type] || 0) + 1;
      if (decision.action.type === 'combo' && decision.action.params && Array.isArray(decision.action.params.steps)) {
        for (const step of decision.action.params.steps) {
          const k = 'combo:' + (step.op || '?');
          agentBrain.sessionStats.actionMix[k] = (agentBrain.sessionStats.actionMix[k] || 0) + 1;
        }
      }

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
    const execMs = Date.now() - execT0;
    if (probeTimer) clearTimeout(probeTimer);

    tracker.updateSessionStatsUI(agentBrain, el);

    if (el.autocodeCaptureOnPlay.checked) {
      captureManualScreenshot();
    }

    // Website debugging: throttled on-page audit (broken images, dead
    // links, unlabeled inputs, ...) for http(s) targets. Findings fold into
    // consoleLogs so the bug scan below files them. Skipped for native games
    // (no webview guest) and best-effort everywhere else.
    if (!nativeProcess) {
      try {
        await require('./website_debugger').maybeAuditWebsite({
          gameController,
          webviewElement,
          url: el.gameUrlInput ? el.gameUrlInput.value : '',
          consoleLogs,
          logSystemMessage,
        });
      } catch (_) { /* audits never break the step */ }
    }

    const isNewBugFound = agentBrain.scanForBugs(screenshotBase64, consoleLogs);
    if (isNewBugFound) {
      audio.playBugAlertSound();
      tracker.renderBugs(el.bugsContainer, el.bugCountBadge, agentBrain, selectBugCard);
      logSystemMessage("⚠️ CRASH / EXCEPTION BUG IDENTIFIED!", "error");
      agentBrain.saveBugs(bugsLogPath);
    }

    tracker.updateTokenStatsUI(agentBrain, el.tokenModelSelect, el);

    // Adaptive follow-up tick: action cost + urgency + frame motion + the
    // wall time execution already consumed. The scheduler (app.js) waits
    // this long before the next screenshot - fast in combat, relaxed in menus.
    const tickHint = {
      tickDelayMs: computeNextDelay({
        action: decision.action || {},
        status: decision.status,
        reasoning: decision.reasoning,
        urgency: tickUrgency,
        llmDelay: decision.next_delay_ms,
        execMs,
        frameDelta: Math.max(frameDelta, midDelta),
        stuck: false
      }),
      urgency: tickUrgency,
      frameDelta,
      midDelta,
      execMs,
      probed: probePlan.probe && !!midFrame
    };
    // Scheduler + tests read the hint off the decision; the return value is
    // the contract for headless callers.
    decision.tickHint = tickHint;
    return tickHint;

  } catch (err) {
    logSystemMessage(`Autopilot step execution failed: ${err.message}`, 'warning');
    return null;
  }
}

module.exports = {
  executeAgentStep
};
