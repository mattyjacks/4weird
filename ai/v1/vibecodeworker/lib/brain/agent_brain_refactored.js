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

  getSessionSummary() {
    return getSessionSummary(this);
  }

  getReplayLog() {
    return getReplayLog(this);
  }

  saveReplay(replaysDir) {
    return saveReplay(this, replaysDir);
  }

  async callLLM(prompt, base64Image = null) {
    return await callLLM(this, prompt, base64Image);
  }

  buildPrompt(consoleLogs, domSnapshot, isStuck) {
    return buildPrompt(this, consoleLogs, domSnapshot, isStuck);
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

    const actionSig = `${action.type}:${action.target || ''}`;
    if (actionSig === `${this.lastActionType}:${this.lastActionTarget || ''}`) {
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

    this.episodes.push({
      timestamp: Date.now(),
      screenshotHash: this.simpleHash(screenshotBase64),
      action,
      status: result.status || 'unknown',
      reasoning_path: result.reasoning_path || [],
      reasoning: result.reasoning || (result.reasoning_path ? result.reasoning_path.join(' -> ') : '')
    });
    if (this.episodes.length > 10) {
      this.episodes.shift();
    }

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
          while (this.bugs.length > 100) {
            this.bugs.shift();
          }
          if (this.sessionStats) this.sessionStats.bugsFound++;
        }
      }
    }

    this.updateSessionMemory(action, isStuck);
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
    return scanForBugs(this, screenshotBase64, consoleLogs);
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
    return runHeuristicFallback(consoleLogs, domSnapshot);
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
    this.initSessionMemory();
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
