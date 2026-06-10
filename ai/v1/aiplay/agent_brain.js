const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

class AgentBrain {
  constructor() {
    this.episodes = [];   // Episodic memory: last 10 {screenshotHash, action, status, reasoning, timestamp}
    this.bugs = [];       // Detected bugs log
    this.replayActions = []; // Current run action list
    this.activeRunId = null;
    this.dataDir = '';

    // Stuck escalation state
    this.stuckRecoveryStage = 0; // 0=none, 1=click center, 2=press Escape, 3=refresh
    this.lastActionType = null;
    this.lastActionTarget = null;
    this.sameActionStreak = 0;

    this.config = {
      provider: 'openai',
      apiKey: '',
      endpointUrl: '',
      modelName: '',
      gameRules: '',
      alwaysSendMemory: false // Default: token-saving (only inject memory when stuck)
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.dataDir) {
      this.dataDir = newConfig.dataDir;
    }
  }

  // ─────────────────────────────────────────────
  // BUG LOG PERSISTENCE
  // ─────────────────────────────────────────────

  loadBugs(bugsPath) {
    try {
      if (fs.existsSync(bugsPath)) {
        this.bugs = JSON.parse(fs.readFileSync(bugsPath, 'utf8'));
      }
    } catch (e) {
      console.error("Failed to load bugs_log.json", e);
    }
  }

  saveBugs(bugsPath) {
    try {
      fs.writeFileSync(bugsPath, JSON.stringify(this.bugs, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to save bugs_log.json", e);
    }
  }

  // ─────────────────────────────────────────────
  // SESSION MEMORY PERSISTENCE
  // ─────────────────────────────────────────────

  loadSessionMemory() {
    if (!this.dataDir) return;
    try {
      const p = path.join(this.dataDir, 'session_memory.json');
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        this._sessionMem = data;
      }
    } catch (e) {
      console.error("Failed to load session_memory.json", e);
    }
  }

  saveSessionMemory() {
    if (!this.dataDir) return;
    try {
      const p = path.join(this.dataDir, 'session_memory.json');
      fs.writeFileSync(p, JSON.stringify(this._sessionMem, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to save session_memory.json", e);
    }
  }

  // Initializes or resets session memory for a new run
  initSessionMemory() {
    this._sessionMem = {
      runId: this.activeRunId,
      startTime: new Date().toISOString(),
      totalSteps: 0,
      bugsFound: 0,
      stuckEvents: 0,
      recoveries: 0,
      actionTypeCounts: { click: 0, press_key: 0, hold_key: 0, wait: 0, refresh: 0 },
      clickHeatmapZones: {}, // key = "sector_X_Y" bucketed to 10x10 grid
      topActions: [] // most repeated actions for context injection
    };
  }

  updateSessionMemory(action, wasStuck) {
    if (!this._sessionMem) return;
    this._sessionMem.totalSteps++;
    if (wasStuck) this._sessionMem.stuckEvents++;

    const type = action.type || 'wait';
    if (this._sessionMem.actionTypeCounts[type] !== undefined) {
      this._sessionMem.actionTypeCounts[type]++;
    }

    // Heatmap: bucket click targets into a 10x10 grid
    if (type === 'click' && typeof action.target === 'string' && action.target.includes(',')) {
      const parts = action.target.split(',');
      const gx = Math.floor(parseInt(parts[0]) / 100);
      const gy = Math.floor(parseInt(parts[1]) / 100);
      const key = `${gx}_${gy}`;
      this._sessionMem.clickHeatmapZones[key] = (this._sessionMem.clickHeatmapZones[key] || 0) + 1;
    }

    this.saveSessionMemory();
  }

  getSessionSummary() {
    if (!this._sessionMem) return '';
    const mem = this._sessionMem;
    const total = mem.totalSteps;
    if (total === 0) return '';

    const actionBreakdown = Object.entries(mem.actionTypeCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v} (${Math.round((v / total) * 100)}%)`)
      .join(', ');

    const topZones = Object.entries(mem.clickHeatmapZones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => {
        const [gx, gy] = k.split('_');
        return `zone (${gx * 100}-${gx * 100 + 99}, ${gy * 100}-${gy * 100 + 99}): ${v}×`;
      })
      .join('; ');

    return `Session so far: ${total} steps | ${actionBreakdown}${topZones ? ` | Most-clicked: ${topZones}` : ''}`;
  }

  // ─────────────────────────────────────────────
  // REPLAY LOG
  // ─────────────────────────────────────────────

  getReplayLog() {
    return this.replayActions;
  }

  saveReplay(replaysDir) {
    if (this.replayActions.length === 0) return null;
    try {
      if (!fs.existsSync(replaysDir)) {
        fs.mkdirSync(replaysDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(replaysDir, `replay_${timestamp}.json`);
      fs.writeFileSync(filename, JSON.stringify(this.replayActions, null, 2), 'utf8');
      return filename;
    } catch (e) {
      console.error("Failed to save replay script", e);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // LLM API CALLER
  // ─────────────────────────────────────────────

  async callLLM(prompt, base64Image = null) {
    const { provider, apiKey, endpointUrl, modelName } = this.config;
    let url = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      const model = modelName || 'gpt-5.4-mini-2026-03-17';
      const content = [{ type: 'text', text: prompt }];
      if (base64Image) {
        content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
      }
      body = { model, response_format: { type: "json_object" }, messages: [{ role: 'user', content }] };

    } else if (provider === 'gemini') {
      const model = modelName || 'gemini-2.5-flash';
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const parts = [{ text: prompt }];
      if (base64Image) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        });
      }
      body = {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      };

    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
      headers['X-Title'] = 'AI Game Debugger';
      const model = modelName || 'google/gemini-2.5-flash';
      const content = [{ type: 'text', text: prompt }];
      if (base64Image) {
        content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
      }
      body = { model, messages: [{ role: 'user', content }] };

    } else if (provider === 'local') {
      url = endpointUrl || 'http://localhost:11434/api/chat';
      const model = modelName || 'llama3';
      if (url.includes('/api/chat')) {
        body = { model, format: "json", stream: false, messages: [{ role: 'user', content: prompt, images: base64Image ? [base64Image] : [] }] };
      } else {
        const content = [{ type: 'text', text: prompt }];
        if (base64Image) {
          content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
        }
        body = { model, messages: [{ role: 'user', content }] };
      }
    }

    console.log(`Sending API Request to ${provider} using model ${modelName || 'default'}`);
    const abortController = new AbortController();
    const fetchTimeout = setTimeout(() => abortController.abort(), 60000);
    let response;
    try {
      response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: abortController.signal });
    } finally {
      clearTimeout(fetchTimeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API Call failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();

    let contentString = '';
    let promptTokens = 0, completionTokens = 0;

    if (provider === 'gemini') {
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        contentString = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Unexpected Gemini API response format");
      }
      if (data.usageMetadata) {
        promptTokens = data.usageMetadata.promptTokenCount || 0;
        completionTokens = data.usageMetadata.candidatesTokenCount || 0;
      }
    } else {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        contentString = data.choices[0].message.content;
      } else if (data.message && data.message.content) {
        contentString = data.message.content;
      } else {
        throw new Error("Unexpected LLM API response format");
      }

      if (data.usage) {
        promptTokens = data.usage.prompt_tokens || 0;
        completionTokens = data.usage.completion_tokens || 0;
      } else if (data.prompt_eval_count !== undefined || data.eval_count !== undefined) {
        promptTokens = data.prompt_eval_count || 0;
        completionTokens = data.eval_count || 0;
      }
    }

    const activeModel = modelName || (provider === 'openai' ? 'gpt-5.4-mini-2026-03-17' : (provider === 'openrouter' ? 'google/gemini-2.5-flash' : (provider === 'gemini' ? 'gemini-2.5-flash' : 'llama3')));

    if (promptTokens === 0 && completionTokens === 0) {
      promptTokens = Math.round(prompt.length / 4) + (base64Image ? 260 : 0);
      completionTokens = Math.round(contentString.length / 4);
    }

    this.recordTokenUsage(activeModel, promptTokens, completionTokens);
    try {
      return JSON.parse(contentString);
    } catch (e) {
      const jsonMatch = contentString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`LLM returned non-JSON response: ${contentString.slice(0, 200)}`);
    }
  }

  // ─────────────────────────────────────────────
  // PROMPT BUILDER (Structured Chain-of-Thought)
  // ─────────────────────────────────────────────

  buildPrompt(consoleLogs, domSnapshot, isStuck) {
    const includeMemory = this.config.alwaysSendMemory || isStuck;
    const sessionSummary = this.getSessionSummary();

    // Compact DOM Snapshot
    const compactDom = (domSnapshot || []).map(el => {
      const parts = [el.tagName];
      if (el.id) parts.push(`#${el.id}`);
      if (el.className) {
        const firstClass = el.className.split(' ')[0];
        if (firstClass) parts.push(`.${firstClass}`);
      }
      const text = el.innerText || el.placeholder;
      if (text) parts.push(`("${text.replace(/"/g, "'")}")`);
      if (el.rect) {
        parts.push(`[${el.rect.left},${el.rect.top},${el.rect.width},${el.rect.height}]`);
      }
      return parts.join('');
    });

    // Compact Console Logs
    const compactLogs = (consoleLogs || []).slice(-10).map(log => {
      if (typeof log === 'string') return log.slice(0, 80);
      const level = log.level || 'info';
      const msg = log.message || '';
      return `[${level}] ${msg.slice(0, 80)}`;
    });

    // --- MEMORY BLOCK (only when needed) ---
    let memoryBlock = '';
    if (includeMemory && this.episodes.length > 0) {
      const recentEps = this.episodes.slice(-5);
      const epLines = recentEps.map((ep, i) => {
        return `  Step -${recentEps.length - i}: [${ep.status}] ${ep.action.type} → ${ep.action.target || 'N/A'} | path: ${JSON.stringify(ep.reasoning_path || ep.reasoning || '')}`;
      }).join('\n');
      memoryBlock = `
## MEMORY — Recent Episode History (last ${recentEps.length} steps)
${epLines}
${sessionSummary ? `\nSession stats: ${sessionSummary}` : ''}
`;
    } else if (sessionSummary && isStuck) {
      memoryBlock = `\n## SESSION STATS\n${sessionSummary}\n`;
    }

    // --- STUCK WARNING ---
    const stuckBlock = isStuck ? `
## ⚠️ STUCK WARNING
The game state has not changed. Recovery stage: ${this.stuckRecoveryStage}/3.
Take a RECOVERY action: click center, Escape, or refresh.
` : '';

    return `## ROLE & DECISION ENGINE (BRAID)
You are an expert AI game QA testing agent. You must make decisions by traversing the following Bounded Reasoning Graph (BRAID):

Graph:
(S) Start -> Check if Game Over / Menu?
  ├─ [Yes] ──> (R_RESTART) Click restart button or press Enter
  └─ [No] ───> Check if Stuck/Looping?
        ├─ [Yes] ──> (R_RECOVER) Execute recovery action (Escape, click center, refresh)
        └─ [No] ────> Check Console Logs for high severity bugs?
              ├─ [Yes] ──> (R_BUG) Flag bug_report and pause/report
              └─ [No] ────> Check if interactive DOM has active buttons?
                    ├─ [Yes] ──> (R_MENU) Click relevant menu button
                    └─ [No] ────> (R_PLAY) Play game by pressing key or clicking targets

## OBSERVATION
Console Logs (last 10):
${compactLogs.join('\n')}

Interactive DOM (up to 40):
${compactDom.join('\n')}
${stuckBlock}
${memoryBlock}
## GOAL — Game Objective
${this.config.gameRules || "Explore the game: find buttons, play, maximize score, look for bugs/errors."}

## TASK
Respond ONLY with a JSON object matching this exact schema:
{
  "status": "menu | playing | game_over | stuck | unknown",
  "reasoning_path": ["S", "No", "No", "No", "R_PLAY"],
  "action": {
    "type": "click | press_key | hold_key | wait | refresh",
    "target": "For click: 'x,y' on 0-1000 scale. For keys: key name. For wait/refresh: leave empty.",
    "duration_ms": 100
  },
  "next_delay_ms": 1500,
  "bug_report": {
    "has_bug": false,
    "description": "Describe any UI bugs or JS errors.",
    "severity": "low | medium | high"
  }
}
Rules:
- "reasoning_path": Array representing your exact traversal of the BRAID graph. Do NOT include any other verbose text explanations to save tokens.
- Coordinates are on 0-1000 scale.
`;
  }

  // ─────────────────────────────────────────────
  // MAIN STEP PROCESSOR
  // ─────────────────────────────────────────────

  async processStep(screenshotBase64, consoleLogs, domSnapshot, bugsLogPath) {
    const isStuck = this.detectStuckState(screenshotBase64);

    const prompt = this.buildPrompt(consoleLogs, domSnapshot, isStuck);

    let result;
    try {
      result = await this.callLLM(prompt, screenshotBase64);
    } catch (e) {
      console.warn("LLM Call failed. Falling back to heuristic rules...", e);
      result = this.runHeuristicFallback(consoleLogs, domSnapshot);
    }

    let action;
    if (isStuck) {
      action = this.getStuckRecoveryAction();
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

    // Update same-action streak tracker for stuck detection
    const actionSig = `${action.type}:${action.target || ''}`;
    if (actionSig === `${this.lastActionType}:${this.lastActionTarget || ''}`) {
      this.sameActionStreak++;
    } else {
      this.sameActionStreak = 0;
      // If we were stuck but took a recovery action, we don't reset recovery stage until sameActionStreak breaks
      if (!isStuck) {
        this.stuckRecoveryStage = 0;
      }
    }
    this.lastActionType = action.type;
    this.lastActionTarget = action.target;

    // Add to replay history
    this.replayActions.push({
      timestamp: Date.now(),
      action,
      status: result.status
    });

    // Store episode in rolling memory
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

    // Log bug reports
    if (result.bug_report && result.bug_report.has_bug) {
      const bugEntry = {
        timestamp: new Date().toISOString(),
        description: result.bug_report.description,
        severity: result.bug_report.severity,
        consoleLogs,
        screenshot: `data:image/jpeg;base64,${screenshotBase64}`,
        actionTakenBeforeBug: this.replayActions.slice(-3)
      };
      const isDuplicate = this.bugs.some(b => b.description === bugEntry.description);
      if (!isDuplicate) {
        this.bugs.push(bugEntry);
        this.saveBugs(bugsLogPath);
        if (this._sessionMem) this._sessionMem.bugsFound++;
      }
    }

    // Update session memory
    this.updateSessionMemory(action, isStuck);

    result.reasoning = result.reasoning || (result.reasoning_path ? result.reasoning_path.join(' -> ') : '');

    return result;
  }

  // ─────────────────────────────────────────────
  // STUCK DETECTION (Escalating Recovery)
  // ─────────────────────────────────────────────

  detectStuckState(screenshotBase64) {
    if (this.episodes.length < 3) return false;

    // If the game status is menu, game_over, or paused, visual stability is normal
    const recentStatuses = this.episodes.slice(-3).map(ep => ep.status);
    if (recentStatuses.some(s => s === 'menu' || s === 'game_over' || s === 'paused')) {
      // For non-playing states, only consider stuck if we are repeating active input actions
      return this.sameActionStreak >= 4;
    }

    const currentHash = this.simpleHash(screenshotBase64);

    // Visual stability: last 3 frames identical
    const recentHashes = this.episodes.slice(-3).map(ep => ep.screenshotHash);
    const visuallyStuck = recentHashes.every(h => h === currentHash);

    // Action loop: same action repeated 4+ times
    const actionLooping = this.sameActionStreak >= 4;

    return visuallyStuck || actionLooping;
  }

  // Returns the escalating recovery action based on current stage
  getStuckRecoveryAction() {
    this.stuckRecoveryStage = Math.min(this.stuckRecoveryStage + 1, 3);
    if (this._sessionMem) this._sessionMem.recoveries++;

    switch (this.stuckRecoveryStage) {
      case 1:
        return { type: 'click', target: '500,500', duration_ms: 100 };
      case 2:
        return { type: 'press_key', target: 'Escape', duration_ms: 100 };
      case 3:
      default:
        this.stuckRecoveryStage = 0;
        return { type: 'refresh', target: '', duration_ms: 100 };
    }
  }

  // ─────────────────────────────────────────────
  // HEURISTIC FALLBACK
  // ─────────────────────────────────────────────

  runHeuristicFallback(consoleLogs, domSnapshot) {
    console.log("Heuristic Fallback triggered!");
    let type = 'wait';
    let target = '';

    if (domSnapshot && domSnapshot.length > 0) {
      const clickables = domSnapshot.filter(el => ['BUTTON', 'A', 'INPUT'].includes(el.tagName));
      if (clickables.length > 0) {
        type = 'click';
        target = clickables[0].rect
          ? `${clickables[0].rect.left + clickables[0].rect.width / 2},${clickables[0].rect.top + clickables[0].rect.height / 2}`
          : clickables[0].id || clickables[0].tagName;
      }
    } else {
      const fallbacks = ['Space', 'ArrowRight', 'ArrowUp', 'w', 'd'];
      type = 'press_key';
      target = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    return {
      status: 'stuck',
      reasoning: "API call failed. Falling back to default explorer heuristics.",
      action: { type, target, duration_ms: 200 },
      next_delay_ms: 1000,
      bug_report: { has_bug: false }
    };
  }

  // ─────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────

  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    const step = Math.max(1, Math.floor(str.length / 500));
    for (let i = 0; i < str.length; i += step) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
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

  endCurrentRun() {
    this.activeRunId = null;
  }

  // ─────────────────────────────────────────────
  // TOKEN USAGE TRACKING
  // ─────────────────────────────────────────────

  recordTokenUsage(model, prompt, completion) {
    if (!this.dataDir) return;
    try {
      const usagePath = path.join(this.dataDir, 'token_usage.json');
      let data = { history: [], lifetimeTotals: {} };
      if (fs.existsSync(usagePath)) {
        try { data = JSON.parse(fs.readFileSync(usagePath, 'utf8')); } catch (e) { console.error("Failed to parse token_usage.json, resetting", e); }
      }
      if (!data.history) data.history = [];
      if (!data.lifetimeTotals) data.lifetimeTotals = {};

      const total = prompt + completion;
      data.lifetimeTotals[model] = (data.lifetimeTotals[model] || 0) + total;
      data.lifetimeTotals['total'] = (data.lifetimeTotals['total'] || 0) + total;

      const newRecord = {
        timestamp: new Date().toISOString(),
        model,
        prompt,
        completion,
        total,
        runId: this.activeRunId || 'run_unknown'
      };
      data.history.push(newRecord);

      const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
      data.history = data.history.filter(record => new Date(record.timestamp).getTime() > oneYearAgo);
      fs.writeFileSync(usagePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error("Failed to record token usage", err);
    }
  }

  getTokenStats() {
    if (!this.dataDir) return { total: {}, models: {} };
    try {
      const usagePath = path.join(this.dataDir, 'token_usage.json');
      if (!fs.existsSync(usagePath)) return { total: {}, models: {} };

      const data = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
      const history = data.history || [];
      const lifetime = data.lifetimeTotals || {};

      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;
      const oneWeek = 7 * oneDay;
      const oneYear = 365 * oneDay;

      const getSum = (records, filterFn) => records.filter(filterFn).reduce((sum, r) => sum + r.total, 0);
      const models = [...new Set(history.map(r => r.model))];

      let lastRunId = this.activeRunId;
      if (!lastRunId && history.length > 0) lastRunId = history[history.length - 1].runId;

      const stats = {
        total: {
          lastRun: getSum(history, r => r.runId === lastRunId),
          hourly: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneHour),
          daily: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneDay),
          weekly: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneWeek),
          yearly: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneYear),
          lifetime: lifetime['total'] || 0
        },
        models: {}
      };

      models.forEach(model => {
        const modelHistory = history.filter(r => r.model === model);
        stats.models[model] = {
          lastRun: getSum(modelHistory, r => r.runId === lastRunId),
          hourly: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneHour),
          daily: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneDay),
          weekly: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneWeek),
          yearly: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneYear),
          lifetime: lifetime[model] || 0
        };
      });

      return stats;
    } catch (err) {
      console.error("Failed to get token stats", err);
      return { total: {}, models: {} };
    }
  }
}

module.exports = AgentBrain;
