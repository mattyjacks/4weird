import os
import sys

def write_file(rel_path, content):
    full_path = os.path.join(os.path.dirname(__file__), rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated: {rel_path}")

# 1. lib/brain/replay_recorder.js
write_file("lib/brain/replay_recorder.js", """/**
 * Replay Recording and Export Manager
 */

const fs = require('fs');
const path = require('path');

function getReplayLog(brain) {
  return brain.replayActions;
}

function saveReplay(brain, replaysDir) {
  if (brain.replayActions.length === 0) return null;
  try {
    if (!fs.existsSync(replaysDir)) {
      fs.mkdirSync(replaysDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(replaysDir, `replay_${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(brain.replayActions, null, 2), 'utf8');
    return filename;
  } catch (e) {
    console.error("Failed to save replay script", e);
    return null;
  }
}

module.exports = {
  getReplayLog,
  saveReplay
};
""")

# 2. lib/brain/bug_scanner.js
write_file("lib/brain/bug_scanner.js", """/**
 * Bug Detection and Logging Scanner
 */

const fs = require('fs');

function loadBugs(brain, bugsPath) {
  try {
    if (fs.existsSync(bugsPath)) {
      brain.bugs = JSON.parse(fs.readFileSync(bugsPath, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to load bugs_log.json", e);
  }
}

function saveBugs(brain, bugsPath) {
  try {
    fs.writeFileSync(bugsPath, JSON.stringify(brain.bugs, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to save bugs_log.json", e);
  }
}

function scanForBugs(brain, screenshotBase64, consoleLogs) {
  const beforeCount = brain.bugs.length;
  const errorLogs = (consoleLogs || []).filter(log => {
    const msg = typeof log === 'string' ? log : (log.message || '');
    if (msg.includes('Electron Security Warning') || msg.includes('Content Security Policy')) return false;

    if (typeof log === 'string') {
      const lower = log.toLowerCase();
      return lower.includes('error') || lower.includes('exception') || lower.includes('failed to load');
    }
    return log.level === 3 || (log.message && (
      log.message.includes('Error') ||
      log.message.includes('exception') ||
      log.message.includes('TypeError') ||
      log.message.includes('ReferenceError')
    ));
  });

  if (errorLogs.length > 0) {
    const lastErr = errorLogs[errorLogs.length - 1];
    const msg = typeof lastErr === 'string' ? lastErr : lastErr.message;

    const bugEntry = {
      timestamp: new Date().toISOString(),
      type: 'Console Error',
      description: msg.slice(0, 150),
      severity: 'high',
      consoleLogs: errorLogs.map(l => typeof l === 'string' ? l : l.message),
      screenshot: `data:image/jpeg;base64,${screenshotBase64}`,
      actionTakenBeforeBug: brain.replayActions.slice(-3)
    };

    const isDuplicate = brain.bugs.some(b => b.description === bugEntry.description);
    if (!isDuplicate) {
      brain.bugs.push(bugEntry);
      if (brain.sessionStats) brain.sessionStats.bugsFound++;
    }
  }
  return brain.bugs.length > beforeCount;
}

module.exports = {
  loadBugs,
  saveBugs,
  scanForBugs
};
""")

# 3. lib/brain/llm_caller.js
write_file("lib/brain/llm_caller.js", """/**
 * LLM Provider API Caller and Heuristic Fallbacks
 */

async function callLLM(brain, prompt, base64Image = null) {
  const { provider, apiKey, endpointUrl, modelName } = brain.config;
  let url = '';
  let headers = { 'Content-Type': 'application/json' };
  let body = {};

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    const realModel = 'gpt-4o-mini';

    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
    }
    body = { model: realModel, response_format: { type: "json_object" }, messages: [{ role: 'user', content }] };

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

  brain.recordTokenUsage(activeModel, promptTokens, completionTokens);
  try {
    return JSON.parse(contentString);
  } catch (e) {
    const jsonMatch = contentString.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`LLM returned non-JSON response: ${contentString.slice(0, 200)}`);
  }
}

function runHeuristicFallback(consoleLogs, domSnapshot) {
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

module.exports = {
  callLLM,
  runHeuristicFallback
};
""")

# 4. lib/brain/prompt_builder.js
write_file("lib/brain/prompt_builder.js", """/**
 * Brain Structured Chain-of-Thought (BRAID) & Mega-Prompt Builder
 */
const path = require('path');

function buildPrompt(brain, consoleLogs, domSnapshot, isStuck) {
  const includeMemory = brain.config.alwaysSendMemory || isStuck;
  const sessionSummary = brain.getSessionSummary();

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

  const compactLogs = (consoleLogs || []).slice(-10).map(log => {
    if (typeof log === 'string') return log.slice(0, 80);
    const level = log.level || 'info';
    const msg = log.message || '';
    return `[${level}] ${msg.slice(0, 80)}`;
  });

  let memoryBlock = '';
  if (includeMemory && brain.episodes.length > 0) {
    const recentEps = brain.episodes.slice(-5);
    const epLines = recentEps.map((ep, i) => {
      return `  Step -${recentEps.length - i}: [${ep.status}] ${ep.action.type} -> ${ep.action.target || 'N/A'} | path: ${JSON.stringify(ep.reasoning_path || ep.reasoning || '')}`;
    }).join('\\n');
    memoryBlock = `\\n## MEMORY — Recent Episode History (last ${recentEps.length} steps)\\n${epLines}${sessionSummary ? `\\nSession stats: ${sessionSummary}` : ''}\\n`;
  } else if (sessionSummary && isStuck) {
    memoryBlock = `\\n## SESSION STATS\\n${sessionSummary}\\n`;
  }

  const stuckBlock = isStuck ? `\\n## ⚠️ STUCK WARNING\\nThe game state has not changed. Recovery stage: ${brain.stuckRecoveryStage}/3.\\nTake a RECOVERY action: click center, Escape, or refresh.\\n` : '';

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
${compactLogs.join('\\n')}

Interactive DOM (up to 40):
${compactDom.join('\\n')}
${stuckBlock}
${memoryBlock}
## GOAL — Game Objective
${brain.config.gameRules || "Explore the game: find buttons, play, maximize score, look for bugs/errors."}

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

function generateMegaPrompt(brain, localGamePath = '', files = []) {
  let filesContext = '';
  if (files && files.length > 0) {
    filesContext = files.map(f => {
      return `### File: ${f.path}\\n\`\`\`${path.extname(f.path).substring(1)}\\n${f.content}\\n\`\`\`\\n`;
    }).join('\\n');
  }

  const bugReportsMarkdown = brain.bugs.length > 0
    ? brain.bugs.map((b, idx) => {
        const logsStr = b.consoleLogs 
          ? (b.consoleLogs.map(l => typeof l === 'string' ? l : (l.message || '')).join('\\n') || 'None')
          : 'None';
        return `#### Bug #${idx+1} [${b.severity ? b.severity.toUpperCase() : 'HIGH'}]
  - **Timestamp**: ${b.timestamp}
  - **Description**: ${b.description}
  - **Actions Leading Up**: ${JSON.stringify(b.actionTakenBeforeBug || [])}
  - **Errors/Console**: 
  \`\`\`
  ${logsStr}
  \`\`\``;
      }).join('\\n\\n')
    : "No bugs explicitly flagged by the agent yet.";

  return `# Game Bug Resolution Task

You are an expert game developer agent. Your task is to fix the bugs and add the requested features/improvements noted during our automated AI playtest run.

## Game Context
- **Target Source Directory**: ${localGamePath || "Remote URL"}
- **Playtest Replay Actions**: ${JSON.stringify(brain.replayActions.slice(-20))}

## Logged Bugs & Glitches
${bugReportsMarkdown}

## Game Codebase Context
Below are the source files of the game:

${filesContext || "*No code files were auto-detected. Please locate and modify code files manually based on the logs.*"}

## Instructions
1. Review the logged bugs and compare them with the code snippets above.
2. Locate the logic errors or visual glitches (e.g. infinite loops, broken state-updates, missing event boundaries).
3. Apply code fixes directly to resolve the bugs.
4. Verify the gameplay runs normally without exceptions.
`;
}

module.exports = {
  buildPrompt,
  generateMegaPrompt
};
""")

# 5. lib/brain/braid_flow.js
write_file("lib/brain/braid_flow.js", """/**
 * BRAID Self-Improvement Loop Flow Generator
 */

async function runBraidSelfImprovementLoop(brain, conversationText) {
  const braidPrompt = `BRAID Generation Prompt
You are an expert at generating clear, structured Mermaid flowcharts to plan responses in multi-turn conversations.
Task:
• Read the entire conversation history.
• Extract constraints, user-provided facts, references (including version references), and goals.
• Produce a flowchart plan that guides producing the best final assistant reply to the last user turn.
• Do NOT include the response itself—only the plan.
• Start exactly with 'flowchart TD;'
Conversation:
${conversationText}
Output Requirements:
1. Output ONLY Mermaid code, no extra text/markdown.
2. Start exactly with 'flowchart TD;'
3. Each node should represent constraints, facts, or steps to produce the final reply.
4. End nodes should indicate checks against constraints or rubric-related requirements (if implied).`;

  let response = await brain.callLLM(braidPrompt);

Review this plan against all constraints and facts in the conversation:
${conversationText}

Please perform one iteration of self-improvement to optimize and correct any inaccuracies, ensuring it strictly follows:
1. Output ONLY Mermaid code, no extra text/markdown.
2. Start exactly with 'flowchart TD;'
3. End nodes check all constraints.
Output the improved flowchart plan now:`;

  const improvedResponse = await brain.callLLM(improvementPrompt);
  return improvedResponse;
}

module.exports = {
  runBraidSelfImprovementLoop
};
""")

# 6. lib/brain/agent_brain_refactored.js
write_file("lib/brain/agent_brain_refactored.js", """/**
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
          }),
          screenshot: `data:image/jpeg;base64,${screenshotBase64}`,
          actionTakenBeforeBug: this.replayActions.slice(-3)
        };
        const isDuplicate = this.bugs.some(b => b.description === bugEntry.description);
        if (!isDuplicate) {
          this.bugs.push(bugEntry);
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
""")

# 7. src/runtime/input_mapper.js
write_file("src/runtime/input_mapper.js", """/**
 * Key Code and Input Event Mapping Utility
 */

function getKeyCode(key) {
  const map = {
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'Space': 'Space',
    ' ': 'Space',
    'Enter': 'Enter',
    'Escape': 'Escape',
    'w': 'KeyW',
    'a': 'KeyA',
    's': 'KeyS',
    'd': 'KeyD',
    'Shift': 'ShiftLeft',
    'Control': 'ControlLeft',
    'Alt': 'AltLeft',
    'F5': 'F5',
    'F12': 'F12'
  };
  return map[key] || (key.length === 1 ? 'Key' + key.toUpperCase() : key);
}

module.exports = {
  getKeyCode
};
""")

# 8. src/runtime/action_dispatcher.js
write_file("src/runtime/action_dispatcher.js", """/**
 * Game Action Execution and Event Dispatcher
 */
const { getKeyCode } = require('./input_mapper');

async function executeAction(controller, webview, action) {
  if (!action || !action.type) return "No action specified";
  const target = action.target;
  const duration = action.duration_ms || 100;
  console.log(`Executing Action: ${action.type} targeting ${target} (native target: none)`);

  switch (action.type) {
    case 'click': {
      if (typeof target === 'string' && target.includes(',')) {
        const parts = target.split(',');
        let targetX = parseInt(parts[0], 10);
        let targetY = parseInt(parts[1], 10);

        let viewportSize = { w: 1000, h: 1000 };
        try {
          viewportSize = await controller.executeJS(webview, `({ w: window.innerWidth, h: window.innerHeight })`);
        } catch (e) {}

        const finalX = Math.round((targetX / 1000) * viewportSize.w);
        const finalY = Math.round((targetY / 1000) * viewportSize.h);

        const clickCode = `
          (() => {
            const x = ${finalX};
            const y = ${finalY};
            const el = document.elementFromPoint(x, y);
            if (el) {
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
              return 'Clicked ' + el.tagName + ' at ' + x + ',' + y;
            }
            return 'No element at point';
          })()
        `;
        return await controller.executeJS(webview, clickCode);
      } else {
        const selectorCode = `
          (() => {
            const el = document.querySelector('${target}');
            if (el) {
              const rect = el.getBoundingClientRect();
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
              return 'Clicked ' + el.tagName + ' at ' + x + ',' + y;
            }
            return 'Element not found: ${target}';
          })()
        `;
        return await controller.executeJS(webview, selectorCode);
      }
    }

    case 'press_key': {
      const codeStr = getKeyCode(target);
      const script = `
        (() => {
          const eDown = new KeyboardEvent('keydown', { key: '${target}', code: '${codeStr}', bubbles: true });
          const ePress = new KeyboardEvent('keypress', { key: '${target}', code: '${codeStr}', bubbles: true });
          const eUp = new KeyboardEvent('keyup', { key: '${target}', code: '${codeStr}', bubbles: true });
          window.dispatchEvent(eDown);
          document.dispatchEvent(eDown);
          window.dispatchEvent(ePress);
          document.dispatchEvent(ePress);
          setTimeout(() => {
            window.dispatchEvent(eUp);
            document.dispatchEvent(eUp);
          }, 50);
          return 'Pressed ' + '${target}';
        })()
      `;
      return await controller.executeJS(webview, script);
    }

    case 'hold_key': {
      const codeStr = getKeyCode(target);
      const script = `
        (() => {
          const eDown = new KeyboardEvent('keydown', { key: '${target}', code: '${codeStr}', bubbles: true });
          window.dispatchEvent(eDown);
          document.dispatchEvent(eDown);
          setTimeout(() => {
            const eUp = new KeyboardEvent('keyup', { key: '${target}', code: '${codeStr}', bubbles: true });
            window.dispatchEvent(eUp);
            document.dispatchEvent(eUp);
          }, ${duration});
          return 'Held ' + '${target}' + ' for ' + ${duration} + 'ms';
        })()
      `;
      return await controller.executeJS(webview, script);
    }

    case 'wait':
      await new Promise(r => setTimeout(r, duration));
      return `Waited ${duration}ms`;

    case 'refresh':
      if (webview && webview.reload) {
        webview.reload();
      }
      return "Reloaded page";

    default:
      return `Unknown action type: ${action.type}`;
  }
}

module.exports = {
  executeAction
};
""")

# 9. src/runtime/dom_inspector.js
write_file("src/runtime/dom_inspector.js", """/**
 * Viewport DOM and Performance Metrics Inspector
 */

async function getInteractiveDOM(controller, webview) {
  const code = `
    (() => {
      const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS'];
      const elements = [];
      
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && 
                          style.display !== 'none' && 
                          style.visibility !== 'hidden' && 
                          style.opacity !== '0';
        
        if (!isVisible) continue;
        
        const isClickable = interactiveTags.includes(el.tagName) || 
                            el.onclick != null || 
                            el.getAttribute('role') === 'button' ||
                            window.getComputedStyle(el).cursor === 'pointer';
                            
        if (isClickable) {
          elements.push({
            tagName: el.tagName,
            id: el.id || '',
            className: el.className || '',
            innerText: (el.innerText || '').slice(0, 50).trim(),
            placeholder: el.placeholder || '',
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        }
      }
      return elements.slice(0, 40);
    })()
  `;
  
  try {
    return await controller.executeJS(webview, code);
  } catch (e) {
    console.error("Failed to query interactive DOM elements:", e);
    return [];
  }
}

async function getPerformanceMetrics(controller, webview) {
  const code = `
    (() => {
      return {
        heapLimit: window.performance && window.performance.memory ? window.performance.memory.jsHeapSizeLimit : 0,
        heapUsed: window.performance && window.performance.memory ? window.performance.memory.usedJSHeapSize : 0,
        heapTotal: window.performance && window.performance.memory ? window.performance.memory.totalJSHeapSize : 0
      };
    })()
  `;
  try {
    return await controller.executeJS(webview, code);
  } catch (e) {
    return { heapLimit: 0, heapUsed: 0, heapTotal: 0 };
  }
}

module.exports = {
  getInteractiveDOM,
  getPerformanceMetrics
};
""")

# 10. src/components/metrics_sparkline.js
write_file("src/components/metrics_sparkline.js", """/**
 * Real-time Canvas Sparkline Renderer for Performance Metrics
 */

function drawSparkline(canvas, val, maxRange, historyArr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  historyArr.push(val);
  if (historyArr.length > 20) historyArr.shift();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#00ff66';
  
  const step = canvas.width / 19;
  historyArr.forEach((h, idx) => {
    const x = idx * step;
    const y = canvas.height - (h / maxRange) * canvas.height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

module.exports = {
  drawSparkline
};
""")

# 11. src/components/scrubber_controller.js
write_file("src/components/scrubber_controller.js", """/**
 * Execution Timeline & Scrubber Controller
 */

function drawHeatmapDot(canvas, x, y) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parentWidth = canvas.parentElement.clientWidth;
  const parentHeight = canvas.parentElement.clientHeight;
  canvas.width = parentWidth;
  canvas.height = parentHeight;
  
  const scaleX = (x / 1000) * parentWidth;
  const scaleY = (y / 1000) * parentHeight;

  ctx.beginPath();
  ctx.arc(scaleX, scaleY, 12, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ff66';
  ctx.stroke();
}

function clearHeatmapCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

module.exports = {
  drawHeatmapDot,
  clearHeatmapCanvas
};
""")

# 12. src/components/native_process_scanner.js
write_file("src/components/native_process_scanner.js", """/**
 * Native Process Scanner and Selector Binding
 */
const { ipcRenderer } = require('electron');

async function scanNativeProcesses(nativeProcessSelect, logCallback) {
  if (logCallback) logCallback('Scanning running native processes...');
  const result = await ipcRenderer.invoke('scan-processes');
  if (result.success) {
    nativeProcessSelect.innerHTML = '<option value="">-- Scan / Select Game Window --</option>';
    if (result.processes && result.processes.length > 0) {
      result.processes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.MainWindowTitle;
        opt.textContent = `${p.ProcessName} (PID: ${p.Id}) - "${p.MainWindowTitle}"`;
        nativeProcessSelect.appendChild(opt);
      });
      if (logCallback) logCallback(`Found ${result.processes.length} windowed processes.`);
    } else {
      if (logCallback) logCallback('No windowed processes found.');
    }
  } else {
    if (logCallback) logCallback(`Scanning failed: ${result.error}`, 'error');
  }
}

module.exports = {
  scanNativeProcesses
};
""")

# 13. src/components/quick_launcher.js
write_file("src/components/quick_launcher.js", """/**
 * Quick Launcher Grid Renderer
 */

function populateQuickLaunchGrid(gridElement, demoGameSelect, onSelectCallback) {
  if (!gridElement || !demoGameSelect) return;
  gridElement.innerHTML = '';
  
  const options = Array.from(demoGameSelect.options).filter(opt => opt.value);
  if (options.length === 0) return;
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-small quick-launch-btn';
    const isPage = opt.dataset.type === 'page';
    btn.textContent = isPage ? ('[Doc] View ' + opt.textContent) : ('[Game] Play ' + opt.textContent);
    btn.addEventListener('click', () => {
      demoGameSelect.value = opt.value;
      if (onSelectCallback) onSelectCallback(opt.value);
    });
    gridElement.appendChild(btn);
  });
}

module.exports = {
  populateQuickLaunchGrid
};
""")

# 14. src/runtime/friend_slop_autoplay.js
write_file("src/runtime/friend_slop_autoplay.js", """/**
 * Specialized Autoplay Heuristic for FriendSlop Game
 */

async function runFriendSlopAutoplay(webviewElement) {
  try {
    const gameState = await webviewElement.executeJavaScript(`
      (() => {
        if (typeof game === 'undefined') return null;
        return {
          state: game.state,
          playerX: game.players && game.players.length > 0 ? (game.players[0].x + game.players[0].width / 2) : 400,
          slops: game.slop ? game.slop.map(s => ({ x: s.x + s.width / 2, y: s.y + s.height / 2, speed: s.speed })) : [],
          hazards: game.hazards ? game.hazards.map(h => ({ x: h.x + h.width / 2, y: h.y + h.height / 2 })) : [],
          friends: game.friends ? game.friends.map(f => ({ x: f.x + f.width / 2, y: f.y + f.height / 2 })) : []
        };
      })()
    `);

    if (!gameState) return null;

    let type = 'wait';
    let target = '';
    let reasoning = 'Autoplay: waiting...';

    if (gameState.state === 'start') {
      type = 'click';
      target = '#friendslop-4weird-start-btn';
      reasoning = 'Autoplay: Clicking Single Player start button';
    } else if (gameState.state === 'game_over') {
      type = 'click';
      target = '#friendslop-4weird-play-again-btn';
      reasoning = 'Autoplay: Clicking Play Again button';
    } else if (gameState.state === 'paused') {
      type = 'click';
      target = '#friendslop-4weird-resume-btn';
      reasoning = 'Autoplay: Clicking Resume button';
    } else if (gameState.state === 'playing') {
      const validSlops = gameState.slops.filter(s => s.y < 500);
      if (validSlops.length > 0) {
        validSlops.sort((a, b) => b.y - a.y);
        const targetSlop = validSlops[0];
        const dx = targetSlop.x - gameState.playerX;
        
        if (Math.abs(dx) > 15) {
          type = 'press_key';
          target = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
          reasoning = `Autoplay: Moving player towards closest falling slop at X: ${Math.round(targetSlop.x)}`;
        } else {
          type = 'press_key';
          target = ' ';
          reasoning = 'Autoplay: Aligned with slop! Throwing to feed friends!';
        }
      } else {
        if (Math.random() < 0.3) {
          type = 'press_key';
          target = ' ';
          reasoning = 'Autoplay: No slops, throwing blindly';
        } else {
          const dx = 400 - gameState.playerX;
          if (Math.abs(dx) > 20) {
            type = 'press_key';
            target = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
            reasoning = 'Autoplay: Returning to center';
          } else {
            type = 'wait';
            reasoning = 'Autoplay: Idling in center';
          }
        }
      }
    }

    return {
      status: gameState.state,
      reasoning,
      action: { type, target, duration_ms: 100 }
    };
  } catch (err) {
    console.error("Autoplay script failed", err);
    return null;
  }
}

module.exports = {
  runFriendSlopAutoplay
};
""")

# 15. src/runtime/viewport_screenshot.js
write_file("src/runtime/viewport_screenshot.js", """/**
 * Viewport Screenshot Utility for Internal & External Windows
 */
const { ipcRenderer } = require('electron');

async function captureViewportScreenshot(nativeProcessSelect, webviewElement) {
  const nativeProcess = nativeProcessSelect ? nativeProcessSelect.value : null;
  if (nativeProcess) {
    const nativeShot = await ipcRenderer.invoke('capture-native-screenshot', nativeProcess);
    if (nativeShot.success) {
      return nativeShot.base64;
    }
    return null;
  }
  
  const isGameWindowActive = await ipcRenderer.invoke('is-game-window-active');
  if (isGameWindowActive) {
    try {
      return await ipcRenderer.invoke('capture-game-screenshot');
    } catch (e) {
      console.warn("Failed to capture separate game window", e);
    }
  }
  
  if (webviewElement) {
    try {
      const img = await webviewElement.capturePage();
      const resized = img.resize({ width: 512 });
      return resized.toJPEG(50).toString('base64');
    } catch (e) {
      console.warn("Failed to capture webview page", e);
    }
  }
  return null;
}

module.exports = {
  captureViewportScreenshot
};
""")

# 16. src/runtime/autocode_bridge.js
write_file("src/runtime/autocode_bridge.js", """/**
 * AutoCode IDE Bridge & UI Diff Coordinator
 */

function renderAutoCodeDiff(container, diff) {
  if (!container) return;
  container.innerHTML = '';
  diff.forEach(line => {
    const div = document.createElement('div');
    if (line.type === 'add') {
      div.className = 'diff-add';
      div.textContent = `+ ${line.content}`;
    } else if (line.type === 'remove') {
      div.className = 'diff-remove';
      div.textContent = `- ${line.content}`;
    } else {
      div.className = 'diff-unchanged';
      div.textContent = `  ${line.content}`;
    }
    container.appendChild(div);
  });
}

function estimateCost(codeContent, promptText) {
  const codeLen = codeContent ? codeContent.length : 0;
  const promptLen = promptText ? promptText.length : 0;
  const totalChars = codeLen + promptLen + 1000;
  const estTokens = Math.ceil(totalChars / 4);
  return estTokens * 0.0000015;
}

module.exports = {
  renderAutoCodeDiff,
  estimateCost
};
""")

# 17. src/components/collapsible_sections.js
write_file("src/components/collapsible_sections.js", """/**
 * UI Collapsible Sections Manager
 */

function setupCollapsibleSections(audio) {
  const headers = document.querySelectorAll('.section-header');
  const savedPrefs = JSON.parse(localStorage.getItem('sectionPrefs') || '{}');

  headers.forEach(header => {
    const sectionId = header.dataset.section;
    const content = document.getElementById(sectionId);
    if (!content) return;
    const toggle = header.querySelector('.section-toggle');

    const isOpen = savedPrefs[sectionId] !== undefined ? savedPrefs[sectionId] : (sectionId === 'llm-settings');

    if (!isOpen) {
      content.classList.add('hidden');
      if (toggle) toggle.textContent = '>';
    }

    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('help-icon')) return;
      const isCurrentlyOpen = !content.classList.contains('hidden');

      if (isCurrentlyOpen) {
        content.classList.add('hidden');
        if (toggle) toggle.textContent = '>';
      } else {
        content.classList.remove('hidden');
        if (toggle) toggle.textContent = 'v';
      }

      savedPrefs[sectionId] = !isCurrentlyOpen;
      localStorage.setItem('sectionPrefs', JSON.stringify(savedPrefs));

      if (audio && audio.playClickSound) {
        audio.playClickSound();
      }
    });
  });
}

module.exports = {
  setupCollapsibleSections
};
""")

# 18. src/components/status_banner.js
write_file("src/components/status_banner.js", """/**
 * Game Status Banner Controller
 */

function updateStatusBanner(bannerElement, text, type = 'ready') {
  if (!bannerElement) return;
  bannerElement.textContent = text;
  bannerElement.className = 'game-status-banner';
  if (type === 'ready') {
    bannerElement.classList.add('banner-ready');
  } else if (type === 'active') {
    bannerElement.classList.add('banner-active');
  }
}

module.exports = {
  updateStatusBanner
};
""")

# 19. src/components/system_logger.js
write_file("src/components/system_logger.js", """/**
 * System Logger and Persistent Console Stream
 */
const fs = require('fs');
const path = require('path');

function logSystemMessage(logStream, consoleLogs, dataDir, message, type = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  entry.innerHTML = `<span style="opacity: 0.5;">[${timestamp}]</span> ${message}`;
  
  if (logStream) {
    logStream.appendChild(entry);
    logStream.scrollTop = logStream.scrollHeight;
  }
  
  consoleLogs.push(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  
  if (dataDir) {
    try {
      fs.writeFileSync(path.join(dataDir, 'live_logs.json'), JSON.stringify(consoleLogs.slice(-200), null, 2));
    } catch (e) {}
  }
}

module.exports = {
  logSystemMessage
};
""")

# 20. src/runtime/planner_ai_handler.js
write_file("src/runtime/planner_ai_handler.js", """/**
 * Interactive Hub Game Planner AI Handler
 */
const pool = require('../modules/vocabulary_pool');

async function callPlannerAI(agentBrain, userInput, plannerStep, plannerSpecs, plannerHistory) {
  plannerHistory.push({ role: 'user', content: userInput });
  const useFallback = !agentBrain.config.apiKey && agentBrain.config.provider !== 'local';
  
  if (useFallback) {
    const step = plannerStep;
    let agentResponse = "";
    let choices = [];
    let isCompleted = false;

    if (step === 0) {
      plannerSpecs.name = userInput.replace(/^\\d+\\.\\s*/, '');
      agentResponse = `Excellent! "${plannerSpecs.name}" is a great name. Let's decide on the Core Mechanic. What type of gameplay fits this game?`;
      choices = [
        "1. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "2. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "3. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)]
      ];
      return { agentResponse, choices, nextStep: 1, isCompleted: false };
    } else if (step === 1) {
      plannerSpecs.mechanic = userInput.replace(/^\\d+\\.\\s*/, '');
      agentResponse = `Got it. For "${plannerSpecs.name}", we are using: "${plannerSpecs.mechanic}". Next, let's pick a Visual Theme / Aesthetic:`;
      choices = [
        "1. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "2. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "3. " + pool.themes[Math.floor(Math.random() * pool.themes.length)]
      ];
      return { agentResponse, choices, nextStep: 2, isCompleted: false };
    } else if (step === 2) {
      plannerSpecs.theme = userInput.replace(/^\\d+\\.\\s*/, '');
      agentResponse = `Perfect choice. With a theme of "${plannerSpecs.theme}", what should be the main Winning Goal or Win/Lose Condition?`;
      choices = [
        "1. Collect 50 stardust fragments to win",
        "2. Survive as long as possible (endless loop)",
        "3. Clear 10 waves of accelerating hazards"
      ];
      return { agentResponse, choices, nextStep: 3, isCompleted: false };
    } else {
      plannerSpecs.goal = userInput.replace(/^\\d+\\.\\s*/, '');
      agentResponse = `[Plan Complete] Your plan document has been written to: games_plan/${plannerSpecs.name.replace(/\\s+/g, '_')}_plan.txt. You can copy/paste it into Cursor/antigravity or select the folder from the hub view!`;
      choices = ["Draft Saved", "Spec Completed", "Saved to workspace"];
      return { agentResponse, choices, nextStep: 4, isCompleted: true };
    }
  }

  const systemPrompt = `You are an expert game designer helping a user design a viral browser HTML5 game.
We are building a specification document. The current spec state is:
Name: ${plannerSpecs.name || 'Not set'}
Mechanic: ${plannerSpecs.mechanic || 'Not set'}
Theme: ${plannerSpecs.theme || 'Not set'}
Goal: ${plannerSpecs.goal || 'Not set'}

Your task:
Review the conversation history, then guide the user to design the next part of the game or complete it.
You MUST respond with a JSON object matching this schema:
{
  "agentResponse": "Your helpful response to the user chat",
  "choices": ["Option 1", "Option 2", "Option 3"],
  "specs": {
    "name": "Game Name (update if decided)",
    "mechanic": "Core Mechanic (update if decided)",
    "theme": "Visual Theme (update if decided)",
    "goal": "Main Goal (update if decided)"
  },
  "isCompleted": false
}`;

  const promptText = `Instructions:\\n${systemPrompt}\\n\\nUser:\\n${userInput}\\n\\nAssistant Response (JSON ONLY):`;
  try {
    const rawResult = await agentBrain.callLLM(promptText);
    const data = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    return {
      agentResponse: data.agentResponse,
      choices: data.choices || [],
      nextStep: data.isCompleted ? 4 : plannerStep + 1,
      isCompleted: !!data.isCompleted,
      specs: data.specs
    };
  } catch (err) {
    return {
      agentResponse: "Failed to query AI model. Saved design locally.",
      choices: ["Continue", "Retry", "Exit"],
      nextStep: plannerStep,
      isCompleted: false
    };
  }
}

module.exports = {
  callPlannerAI
};
""")

# 21. src/runtime/spec_sheet_builder.js
write_file("src/runtime/spec_sheet_builder.js", """/**
 * Game Specification & Technical Blueprint Document Generator
 */

function generateSpecSheet(plannerSpecs) {
  const braid = `(S) Start -> Check if Danger nearby?
  |-[Yes] --> Evade using game controls (${plannerSpecs.mechanic || 'Pending choice'})
  L-[No] ---> Check if target goal (${plannerSpecs.goal || 'Pending choice'}) visible?
        |-[Yes] --> Glide / Move towards it
        L-[No] ----> Keep default exploring`;

  const is3D = /3D|Three\\.js|spatial|perspective|first-person|voxel|cube|sphere/i.test((plannerSpecs.mechanic || '') + " " + (plannerSpecs.theme || ''));

  let platform = "HTML5 Browser (Canvas 2D API)";
  let fileLayout = `  1. index.html   : Hosts the Canvas DOM layout, high-performance viewport styling, and script tags importing the modules.
  2. game.js      : The main game engine controller managing requestAnimationFrame, game state transitions, and canvas scaling.
  3. physics.js   : Game physics containing Euler movement integration, speed limits, and circle-to-circle collision equations.
  4. assets.js    : Aesthetic drawing library containing custom methods for glow lines, vaporwave grid lines, and particles.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

  let stateVariables = `   - canvas, ctx: DOM controls for Canvas 2D contexts.
   - player: Object storing location and current movement state.
   - hazards: Obstacle list containing target vector offsets.`;

  let renderingPhases = `   - Clear Canvas: Redraw solid dark backgrounds matching the theme.
   - Render Grid Backdrop: Use modern vector lines to match: ${plannerSpecs.theme || 'Pending choice'}.
   - Draw Avatar: Draw player with custom particle aura.
   - Scoreboard: Print custom neon status tracker in the top-right corner.`;

  if (is3D) {
    platform = "HTML5 Browser (3D WebGL API via Three.js library)";
    fileLayout = `  1. index.html   : Hosts the 3D canvas viewport container, imports Three.js CDN script (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js), and project modules.
  2. game.js      : The main game loop and engine orchestration, setting up the THREE.Scene, THREE.PerspectiveCamera, and THREE.WebGLRenderer.
  3. physics.js   : Calculates 3D physics updates (position vector additions, velocity damping, bounding box or bounding sphere collisions in 3D).
  4. assets.js    : Manages 3D geometry creation (THREE.BoxGeometry, THREE.SphereGeometry), materials, lights, and animations.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

    stateVariables = `   - scene, camera, renderer: Three.js core rendering components.
   - playerMesh: THREE.Mesh representing the player's 3D avatar.
   - hazardMeshes: Array of active hazard meshes moving through the 3D viewport.
   - collectibleMeshes: Array of meshes representing target goals.`;

    renderingPhases = `   - Clear Viewport: Reset renderer and apply background theme color.
   - Update 3D Camera: Align PerspectiveCamera to orbit player mesh position.
   - Draw 3D Avatar/Objects: Rotate meshes and emit Three.js particle groups.
   - HUD overlay: Print score tracker overlaying the 3D rendering context.`;
  }

  return `================================================================================
GAME SPECIFICATION SHEET: ${plannerSpecs.name}
================================================================================
Status: Under design / draft plan
Core Mechanic: ${plannerSpecs.mechanic || 'Pending choice'}
Visual Aesthetic: ${plannerSpecs.theme || 'Pending choice'}
Winning Goal: ${plannerSpecs.goal || 'Pending choice'}
Target Platform: ${platform}

--------------------------------------------------------------------------------
1. DETAILED MECHANICS AND STATE STRUCTURE
--------------------------------------------------------------------------------
- Player Physics: Implement simple integration vectors.
  - Core mechanics matching: ${plannerSpecs.mechanic || 'Pending choice'}.
- Goal Spawning: Spawn items within safe padding away from canvas margins.
- Hazard Scalers: Adjust spawn speed dynamically based on current game score.

--------------------------------------------------------------------------------
2. TECHNICAL ARCHITECTURE & SOURCE FILE LAYOUT (EXPERT BLUEPRINT)
--------------------------------------------------------------------------------
As an expert game design architect, I recommend structuring this codebase into multiple modular files to separate concerns, facilitate seamless AI vibe-coding edits, and support clean playtesting injection:

- RECOMMENDED FILE LAYOUT:
${fileLayout}

A. STATE VARIABLES REQUIRED:
${stateVariables}
   - score: Current count of collectable goals acquired.

B. CRITICAL RENDERING PHASES:
${renderingPhases}

--------------------------------------------------------------------------------
3. PLAYTESTING & AI AUTOMATION STEPS
--------------------------------------------------------------------------------
- Load inside 4weird aiplay debugger using local file paths.
- Setup AI Agent parameters matching the decision tree below.
- Verify game loop recovery under active obstacle vectors.

--------------------------------------------------------------------------------
4. BRAID ACTION DECISION GRAPH
--------------------------------------------------------------------------------
${braid}

================================================================================
`;
}

module.exports = {
  generateSpecSheet
};
""")

# 22. src/runtime/workspace_crawler.js
write_file("src/runtime/workspace_crawler.js", """/**
 * Workspace Directory Crawler and Code View Renderer
 */
const { ipcRenderer } = require('electron');

async function crawlWorkspaceDirectory(folderPath, tabs, codeFileList, codeContentView, audio) {
  const scanResult = await ipcRenderer.invoke('scan-directory', folderPath);
  if (scanResult.success) {
    const sourceFiles = scanResult.files;
    tabs.renderFileList(codeFileList, codeContentView, sourceFiles, () => {
      if (audio && audio.playClickSound) audio.playClickSound();
    });
    return sourceFiles;
  }
  return [];
}

module.exports = {
  crawlWorkspaceDirectory
};
""")

print("All modular split files generated successfully!")




