/**
 * Modular AgentBrain Core
 */
const { simpleHash, detectStuckState, getStuckRecoveryAction } = require('./stuck_detector');
const { recordTokenUsage, getTokenStats } = require('./token_tracker');
const { loadSessionMemory, saveSessionMemory, initSessionMemory, updateSessionMemory, getSessionSummary } = require('./session_memory');
const { buildPrompt, generateMegaPrompt } = require('./prompt_builder');
const { loadBugs, saveBugs, scanForBugs } = require('./bug_scanner');
const { callLLM, runHeuristicFallback } = require('./llm_caller');
const { getReplayLog, saveReplay } = require('./replay_recorder');
const { runBraidSelfImprovementLoop } = require('./braid_flow');
const { startTextBrain, recordTextBrainEpisode, recordDomDiscoveries, recordTextBrainBug, getTextBrainContext, flushTextBrain } = require('./brain_text_memory');

// Quantize click coords to a coarse grid so 1-2px jitter (111,29 vs 111,30
// vs 111,31 from subpixel rounding) still counts as the same repeated action.
// Without this the loop detector never fires on marketing pages.
function quantizeActionSignature(action) {
  if (!action || !action.type) return 'none:';
  const target = action.target || '';
  if (typeof target === 'string' && target.includes(',')) {
    const parts = target.split(',');
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const qx = Math.round(x / 50) * 50;
      const qy = Math.round(y / 50) * 50;
      return `${action.type}:${qx},${qy}`;
    }
  }
  return `${action.type}:${String(target).slice(0, 40)}`;
}

class AgentBrain {
  constructor() {
    this.episodes = [];
    this.bugs = [];
    this.replayActions = [];
    this.activeRunId = null;
    this.dataDir = '';

    this.stuckRecoveryStage = 0;
    this.lastActionType = null;
    this.lastActionTarget = null;
    this.sameActionStreak = 0;

    this.sessionStats = {
      steps: 0,
      bugsFound: 0,
      stuckEvents: 0,
      recoveries: 0,
      actionMix: {},
      clickZones: {}
    };

    this.config = {
      provider: 'openai',
      apiKey: '',
      endpointUrl: '',
      modelName: '',
      gameRules: '',
      alwaysSendMemory: false
    };
  }

  get stuckCounter() {
    return this.stuckRecoveryStage;
  }

  set stuckCounter(val) {
    this.stuckRecoveryStage = val;
  }

  get tokenUsage() {
    const stats = this.getTokenStats();
    const usage = {};
    const mapKeys = (obj) => {
      if (!obj) return null;
      return {
        last_run: obj.lastRun || 0,
        hourly: obj.hourly || 0,
        daily: obj.daily || 0,
        weekly: obj.weekly || 0,
        yearly: obj.yearly || 0,
        lifetime: obj.lifetime || 0
      };
    };
    usage['total'] = mapKeys(stats.total);
    if (stats.models) {
      for (const model of Object.keys(stats.models)) {
        usage[model] = mapKeys(stats.models[model]);
      }
    }
    return usage;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.dataDir) {
      this.dataDir = newConfig.dataDir;
    }
  }

  loadBugs(bugsPath) {
    return loadBugs(this, bugsPath);
  }

  saveBugs(bugsPath) {
    return saveBugs(this, bugsPath);
  }

  loadSessionMemory() {
    return loadSessionMemory(this);
  }

  saveSessionMemory() {
    return saveSessionMemory(this);
  }

  initSessionMemory() {
    return initSessionMemory(this);
  }

  updateSessionMemory(action, wasStuck) {
    return updateSessionMemory(this, action, wasStuck);
  }

  recordExternalDecision(decision, { domSnapshot = [], wasStuck = false } = {}) {
    if (!decision || !decision.action) return;
    const episode = {
      timestamp: Date.now(),
      screenshotHash: 'external-native-decision',
      action: decision.action,
      status: decision.status || 'unknown',
      reasoning_path: decision.reasoning_path || [],
      reasoning: decision.reasoning || ''
    };
    this.episodes.push(episode);
    if (this.episodes.length > 10) this.episodes.shift();
    this.updateSessionMemory(decision.action, wasStuck);
    recordDomDiscoveries(this, domSnapshot);
    recordTextBrainEpisode(this, episode, null);
  }

  getSessionSummary() {
    return getSessionSummary(this);
  }

  getTextBrainContext(limit) {
    return getTextBrainContext(this, limit);
  }

  getReplayLog() {
    return getReplayLog(this);
  }

  saveReplay(replaysDir) {
    return saveReplay(this, replaysDir);
  }

  async callLLM(prompt, base64Image = null, audioInput = null) {
    return await callLLM(this, prompt, base64Image, audioInput);
  }

  buildPrompt(consoleLogs, domSnapshot, isStuck, audioContext = null) {
    return buildPrompt(this, consoleLogs, domSnapshot, isStuck, audioContext);
  }

  async runBraidSelfImprovementLoop(conversationText) {
    return await runBraidSelfImprovementLoop(this, conversationText);
  }

  async chooseNextAction(screenshotBase64, domSnapshot, forceHeuristic = false, consoleLogs = []) {
    const isStuck = this.detectStuckState(screenshotBase64);
    const prompt = this.buildPrompt(consoleLogs, domSnapshot, isStuck);

    let result;
    if (forceHeuristic) {
      result = this.runHeuristicFallback(consoleLogs, domSnapshot);
    } else {
      try {
        result = await this.callLLM(prompt, screenshotBase64);
      } catch (e) {
        console.warn("LLM Call failed. Falling back to heuristic rules...", e);
        result = this.runHeuristicFallback(consoleLogs, domSnapshot);
      }
    }

    let action;
    if (isStuck) {
      if (this.sessionStats) this.sessionStats.stuckEvents++;
      action = this.getStuckRecoveryAction();
      if (this.sessionStats) this.sessionStats.recoveries++;
      if (result) {
        result.action = action;
        result.reasoning_path = [...(result.reasoning_path || []), `R_RECOVER_${this.stuckRecoveryStage}`];
      } else {
        result = {
          status: 'stuck',
          reasoning_path: ['S', 'No', 'Yes', `R_RECOVER_${this.stuckRecoveryStage}`],
          action
        };
      }
    } else {
      action = result.action || this.getStuckRecoveryAction() || { type: 'wait', duration_ms: 500 };
    }

    const actionSig = quantizeActionSignature(action);
    if (actionSig === quantizeActionSignature({ type: this.lastActionType, target: this.lastActionTarget })) {
      this.sameActionStreak++;
    } else {
      this.sameActionStreak = 0;
      if (!isStuck) {
        this.stuckRecoveryStage = 0;
      }
    }
    this.lastActionType = action.type;
    this.lastActionTarget = action.target;

    this.replayActions.push({
      timestamp: Date.now(),
      action,
      status: result.status
    });
    // Bound replay memory for long runs (was unbounded: +1 per step forever).
    if (this.replayActions.length > 500) {
      this.replayActions.splice(0, this.replayActions.length - 500);
    }

    const episode = {
      timestamp: Date.now(),
      screenshotHash: this.simpleHash(screenshotBase64),
      action,
      status: result.status || 'unknown',
      reasoning_path: result.reasoning_path || [],
      reasoning: result.reasoning || (result.reasoning_path ? result.reasoning_path.join(' -> ') : '')
    };
    this.episodes.push(episode);
    if (this.episodes.length > 10) {
      this.episodes.shift();
    }

    let newBug = null;
    if (result.bug_report && result.bug_report.has_bug) {
      const desc = result.bug_report.description || '';
      const isFakeBug = desc.toLowerCase().includes('interactive element') ||
                        desc.toLowerCase().includes('stuck') ||
                        desc.toLowerCase().includes('electron security') ||
                        desc.toLowerCase().includes('no elements');
      if (!isFakeBug) {
        const bugEntry = {
          timestamp: new Date().toISOString(),
          type: result.bug_report.type || 'UI/Visual Bug',
          description: result.bug_report.description,
          severity: result.bug_report.severity,
          consoleLogs: (consoleLogs || []).filter(l => {
            const msg = typeof l === 'string' ? l : (l.message || '');
            return !msg.includes('Electron Security Warning');
          }).slice(-5),
          screenshot: screenshotBase64 ? `data:image/jpeg;base64,${screenshotBase64}` : '',
          screenshotBytes: typeof screenshotBase64 === 'string' ? screenshotBase64.length : 0,
          actionTakenBeforeBug: this.replayActions.slice(-3)
        };
        const isDuplicate = this.bugs.some(b => b.description === bugEntry.description);
        if (!isDuplicate) {
          this.bugs.push(bugEntry);
          newBug = bugEntry;
          while (this.bugs.length > 100) {
            this.bugs.shift();
          }
          if (this.sessionStats) this.sessionStats.bugsFound++;
        }
      }
    }

    this.updateSessionMemory(action, isStuck);
    recordDomDiscoveries(this, domSnapshot);
    recordTextBrainEpisode(this, episode, newBug);
    result.reasoning = result.reasoning || (result.reasoning_path ? result.reasoning_path.join(' -> ') : '');
    return result;
  }

  async processStep(screenshotBase64, consoleLogs, domSnapshot, bugsLogPath) {
    const res = await this.chooseNextAction(screenshotBase64, domSnapshot, false, consoleLogs);
    if (res.bug_report && res.bug_report.has_bug) {
      this.saveBugs(bugsLogPath);
    }
    return res;
  }

  scanForBugs(screenshotBase64, consoleLogs) {
    const before = this.bugs.length;
    const found = scanForBugs(this, screenshotBase64, consoleLogs);
    if (found && this.bugs.length > before) recordTextBrainBug(this, this.bugs[this.bugs.length - 1]);
    return found;
  }

  generateMegaPrompt(localGamePath = '', files = []) {
    return generateMegaPrompt(this, localGamePath, files);
  }

  detectStuckState(screenshotBase64) {
    return detectStuckState(this, screenshotBase64);
  }

  getStuckRecoveryAction() {
    return getStuckRecoveryAction(this);
  }

  runHeuristicFallback(consoleLogs, domSnapshot) {
    return runHeuristicFallback(consoleLogs, domSnapshot, this);
  }

  simpleHash(str) {
    return simpleHash(str);
  }

  startNewRun() {
    this.activeRunId = 'run_' + Date.now();
    this.episodes = [];
    this.sameActionStreak = 0;
    this.stuckRecoveryStage = 0;
    this.lastActionType = null;
    this.lastActionTarget = null;
    this._heuristicCursor = 0;
    this._lastHeuristicTarget = null;
    this.initSessionMemory();
    startTextBrain(this);
  }

  startSession() {
    this.startNewRun();
    this.sessionStats = {
      steps: 0,
      bugsFound: 0,
      stuckEvents: 0,
      recoveries: 0,
      actionMix: {},
      clickZones: {}
    };
  }

  endCurrentRun() {
    try {
      const { flushSessionMemory } = require('./session_memory');
      flushSessionMemory(this);
    } catch (e) {}
    flushTextBrain(this);
    this.activeRunId = null;
  }

  recordTokenUsage(model, prompt, completion) {
    return recordTokenUsage(this, model, prompt, completion);
  }

  getTokenStats() {
    return getTokenStats(this);
  }
}

module.exports = AgentBrain;
