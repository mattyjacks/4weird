const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

class AgentBrain {
  constructor() {
    this.history = []; // Array of last 10 states/actions
    this.bugs = [];    // Array of detected bugs
    this.replayActions = []; // Current run action list
    this.isStuckMode = false;
    this.stuckCounter = 0;
    this.activeRunId = null;
    this.dataDir = '';
    this.config = {
      provider: 'openai', // 'openai', 'openrouter', 'local'
      apiKey: '',
      endpointUrl: '',
      modelName: '',
      gameRules: ''
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.dataDir) {
      this.dataDir = newConfig.dataDir;
    }
  }

  // Load existing bugs from bugs_log.json
  loadBugs(bugsPath) {
    try {
      if (fs.existsSync(bugsPath)) {
        this.bugs = JSON.parse(fs.readFileSync(bugsPath, 'utf8'));
      }
    } catch (e) {
      console.error("Failed to load bugs_log.json", e);
    }
  }

  // Save bugs to bugs_log.json
  saveBugs(bugsPath) {
    try {
      fs.writeFileSync(bugsPath, JSON.stringify(this.bugs, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to save bugs_log.json", e);
    }
  }

  // Get current active replay log
  getReplayLog() {
    return this.replayActions;
  }

  // Save current replay sequence
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

  // Calls the selected LLM provider
  async callLLM(prompt, base64Image = null) {
    const { provider, apiKey, endpointUrl, modelName } = this.config;
    let url = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    // Determine target API details
    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      const model = modelName || 'gpt-5.4-mini-2026-03-17';
      
      const content = [{ type: 'text', text: prompt }];
      if (base64Image) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` }
        });
      }
      
      body = {
        model: model,
        response_format: { type: "json_object" }, // Require JSON mode
        messages: [{ role: 'user', content }]
      };
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
      headers['X-Title'] = 'AI Game Debugger';
      const model = modelName || 'google/gemini-2.5-flash';

      const content = [{ type: 'text', text: prompt }];
      if (base64Image) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` }
        });
      }

      body = {
        model: model,
        response_format: { type: "json_object" },
        messages: [{ role: 'user', content }]
      };
    } else if (provider === 'local') {
      url = endpointUrl || 'http://localhost:11434/api/chat';
      const model = modelName || 'llama3';
      
      // Ollama vs generic OpenAI compatible Local endpoint
      if (url.includes('/api/chat')) {
        // Ollama native API format
        const content = prompt;
        const images = base64Image ? [base64Image] : [];
        body = {
          model: model,
          format: "json", // Require JSON mode
          stream: false,
          messages: [{ role: 'user', content, images }]
        };
      } else {
        // OpenAI compatible local API format (LM Studio, Llama.cpp, etc.)
        const content = [{ type: 'text', text: prompt }];
        if (base64Image) {
          content.push({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          });
        }
        body = {
          model: model,
          response_format: { type: "json_object" },
          messages: [{ role: 'user', content }]
        };
      }
    }

    console.log(`Sending API Request to ${provider} using model ${modelName || 'default'}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API Call failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    
    // Parse result based on response structure
    let contentString = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      contentString = data.choices[0].message.content;
    } else if (data.message && data.message.content) {
      // Ollama format
      contentString = data.message.content;
    } else {
      throw new Error("Unexpected LLM API response format");
    }

    // Determine active model string
    const activeModel = modelName || (provider === 'openai' ? 'gpt-5.4-mini-2026-03-17' : (provider === 'openrouter' ? 'google/gemini-2.5-flash' : 'llama3'));

    // Extract usage metrics
    let promptTokens = 0;
    let completionTokens = 0;
    if (data.usage) {
      promptTokens = data.usage.prompt_tokens || 0;
      completionTokens = data.usage.completion_tokens || 0;
    } else if (data.prompt_eval_count !== undefined || data.eval_count !== undefined) {
      promptTokens = data.prompt_eval_count || 0;
      completionTokens = data.eval_count || 0;
    } else {
      // Fallback calculation: 4 characters per token estimate
      promptTokens = Math.round(prompt.length / 4) + (base64Image ? 260 : 0);
      completionTokens = Math.round(contentString.length / 4);
    }

    // Record token usage
    this.recordTokenUsage(activeModel, promptTokens, completionTokens);

    return JSON.parse(contentString);
  }

  // Core execution loop cycle
  async processStep(screenshotBase64, consoleLogs, domSnapshot, bugsLogPath) {
    // 1. Check for Stuck recovery conditions (Visual stability over time)
    const isStuck = this.detectStuckState(screenshotBase64);
    
    let prompt = `You are an AI game player and bug testing agent. 
Analyze the current game state from the screenshot and additional metadata, and decide on the next input action.
You MUST respond in strict JSON format matching this schema:
{
  "status": "menu | playing | game_over | stuck",
  "reasoning": "Explain what you see, what obstacles are nearby, or what needs to be clicked next.",
  "action": {
    "type": "click | press_key | hold_key | wait | refresh",
    "target": "For 'click', provide coordinate selector or 'x,y' (scale 0-1000). For keys, specify keyName (e.g. 'ArrowLeft', 'ArrowRight', 'Space', 'w', 'a', 's', 'd').",
    "duration_ms": 100
  },
  "bug_report": {
    "has_bug": false,
    "description": "Describe any UI bugs, visual glitches, stuck states, or logic errors observed.",
    "severity": "low | medium | high"
  }
}

Game Rules and Goal:
${this.config.gameRules || "No special instructions provided. Focus on finding interactive elements, playing the game, avoiding hazards, and spotting console errors or interface rendering bugs."}

Console Logs (intercepted from game context):
${JSON.stringify(consoleLogs, null, 2)}

Interactive DOM elements detected:
${JSON.stringify(domSnapshot, null, 2)}
`;

    if (isStuck) {
      prompt += `\nWARNING: The agent detects that it might be STUCK (the screenshot has not changed significantly in the last few steps). Consider taking a recovery action like refreshing the game, pressing ESC, clicking elsewhere, or holding a directional key.`;
    }

    let result;
    try {
      result = await this.callLLM(prompt, screenshotBase64);
    } catch (e) {
      console.warn("LLM Call failed. Falling back to heuristic rules...", e);
      result = this.runHeuristicFallback(consoleLogs, domSnapshot);
    }

    // 2. Process action execution
    const action = result.action || { type: 'wait', duration_ms: 500 };
    
    // Add to replay history
    this.replayActions.push({
      timestamp: Date.now(),
      action: action,
      status: result.status
    });

    // 3. Log bug reports if found
    if (result.bug_report && result.bug_report.has_bug) {
      const bugEntry = {
        timestamp: new Date().toISOString(),
        description: result.bug_report.description,
        severity: result.bug_report.severity,
        consoleLogs: consoleLogs,
        screenshot: `data:image/jpeg;base64,${screenshotBase64}`,
        actionTakenBeforeBug: this.replayActions.slice(-3) // last 3 actions leading to it
      };
      
      // Prevent duplicates of identical bugs
      const isDuplicate = this.bugs.some(b => b.description === bugEntry.description);
      if (!isDuplicate) {
        this.bugs.push(bugEntry);
        this.saveBugs(bugsLogPath);
      }
    }

    // Save state to sliding window history
    this.history.push({
      screenshotHash: this.simpleHash(screenshotBase64),
      action: action
    });
    if (this.history.length > 10) {
      this.history.shift();
    }

    return result;
  }

  // Detect stuck states if screenshot hasn't changed
  detectStuckState(screenshotBase64) {
    if (this.history.length < 3) return false;
    const currentHash = this.simpleHash(screenshotBase64);
    
    // If last 3 screenshots have the exact same hash
    let sameCount = 0;
    for (let i = this.history.length - 1; i >= this.history.length - 3; i--) {
      if (this.history[i].screenshotHash === currentHash) {
        sameCount++;
      }
    }
    
    return sameCount >= 3;
  }

  // Fallback heuristics if API fails or rate limits
  runHeuristicFallback(consoleLogs, domSnapshot) {
    console.log("Heuristic Fallback triggered!");
    // Default action: find first button in DOM snapshot and click it, or hit Space/ArrowRight
    let type = 'wait';
    let target = '';
    
    if (domSnapshot && domSnapshot.length > 0) {
      // Find buttons/interactive items
      const clickables = domSnapshot.filter(el => ['BUTTON', 'A', 'INPUT'].includes(el.tagName));
      if (clickables.length > 0) {
        type = 'click';
        // Use coordinates if available, otherwise tag selector
        target = clickables[0].rect ? `${clickables[0].rect.left + clickables[0].rect.width/2},${clickables[0].rect.top + clickables[0].rect.height/2}` : clickables[0].id || clickables[0].tagName;
      }
    } else {
      // Default keyboard exploration fallback
      const fallbacks = ['Space', 'ArrowRight', 'ArrowUp', 'w', 'd'];
      type = 'press_key';
      target = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    return {
      status: 'stuck',
      reasoning: "API call failed. Falling back to default explorer heuristics.",
      action: {
        type,
        target,
        duration_ms: 200
      },
      bug_report: {
        has_bug: false
      }
    };
  }

  // Simple base64 string hashing to detect pixel equivalence
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    // We only hash a subset of characters for speed
    const step = Math.max(1, Math.floor(str.length / 500));
    for (let i = 0; i < str.length; i += step) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
  startNewRun() {
    this.activeRunId = 'run_' + Date.now();
  }

  endCurrentRun() {
    this.activeRunId = null;
  }

  recordTokenUsage(model, prompt, completion) {
    if (!this.dataDir) return;
    try {
      const usagePath = path.join(this.dataDir, 'token_usage.json');
      let data = { history: [], lifetimeTotals: {} };
      if (fs.existsSync(usagePath)) {
        try {
          data = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
        } catch (e) {
          console.error("Failed to parse token_usage.json, resetting", e);
        }
      }
      
      if (!data.history) data.history = [];
      if (!data.lifetimeTotals) data.lifetimeTotals = {};
      
      const total = prompt + completion;
      
      // Update lifetime totals for the model and global total
      data.lifetimeTotals[model] = (data.lifetimeTotals[model] || 0) + total;
      data.lifetimeTotals['total'] = (data.lifetimeTotals['total'] || 0) + total;
      
      const newRecord = {
        timestamp: new Date().toISOString(),
        model: model,
        prompt: prompt,
        completion: completion,
        total: total,
        runId: this.activeRunId || 'run_unknown'
      };
      
      data.history.push(newRecord);
      
      // Prune history older than 365 days to keep file size small
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
      if (!fs.existsSync(usagePath)) {
        return { total: {}, models: {} };
      }
      
      const data = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
      const history = data.history || [];
      const lifetime = data.lifetimeTotals || {};
      
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;
      const oneWeek = 7 * oneDay;
      const oneYear = 365 * oneDay;
      
      // Helper to sum tokens based on criteria
      const getSum = (records, filterFn) => {
        return records.filter(filterFn).reduce((sum, r) => sum + r.total, 0);
      };
      
      // Get all unique models
      const models = [...new Set(history.map(r => r.model))];
      
      // Get latest run ID in history
      let lastRunId = this.activeRunId;
      if (!lastRunId && history.length > 0) {
        lastRunId = history[history.length - 1].runId;
      }
      
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
