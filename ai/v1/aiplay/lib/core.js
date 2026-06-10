/**
 * AutoCode Core Module
 * Main AutoCodeSystem class that orchestrates all functionality
 */

const { AutoCodeConfig } = require('./config');
const { ScreenshotQueue } = require('./screenshots');
const { AutoCodeDebugAPI } = require('./debug');
const { MultiFileProject } = require('./project');
const { AIChatInterface } = require('./chat');
const { calculateCost, formatCost } = require('./pricing');
const { classifyTaskComplexity, selectModelForComplexity, estimateTokens } = require('./complexity');
const { minifyCode, buildCachedContext, truncateToTokens } = require('./minimization');

class AutoCodeSystem {
  constructor() {
    this.config = new AutoCodeConfig();
    this.screenshotQueue = new ScreenshotQueue();
    this.debugAPI = new AutoCodeDebugAPI(this);
    this.project = null;
    this.chat = new AIChatInterface();

    this.isProcessing = false;
    this.currentFileContent = null;
    this.proposedChanges = null;

    // Event callbacks
    this.onCostUpdate = null;
    this.onDiffGenerated = null;
    this.onError = null;
    this.onLog = null;
  }

  initialize() {
    if (typeof window !== 'undefined') {
      window.autoCodeDebug = this.debugAPI;
    }

    this.log('AutoCode System initialized');
    return this;
  }

  log(message) {
    console.log(`[AutoCode] ${message}`);
    if (this.onLog) {
      this.onLog(message);
    }
  }

  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config.update(newConfig);

    if (this.config.enableScreenshots) {
      this.screenshotQueue.enable(this.config.maxScreenshots);
    } else {
      this.screenshotQueue.disable();
    }

    if (oldConfig.autoChooseModel !== this.config.autoChooseModel) {
      this.log(`Auto-choose model: ${this.config.autoChooseModel ? 'enabled' : 'disabled'}`);
    }

    return this;
  }

  // Project Management
  async loadProject(projectPath) {
    this.project = new MultiFileProject(projectPath);
    const summary = await this.project.loadProject();
    this.log(`Loaded project: ${summary.fileCount} files`);
    return summary;
  }

  loadFile(filePath, content) {
    this.config.targetFile = filePath;
    this.currentFileContent = content;

    if (this.config.minifyCode) {
      this.currentFileContent = minifyCode(content);
    }

    this.log(`Loaded file: ${filePath} (${content.length} chars)`);
    return this.currentFileContent;
  }

  // Model Selection
  selectModelForRequest(instruction) {
    if (!this.config.autoChooseModel) {
      return this.config.largestModelAllowed;
    }

    const complexity = classifyTaskComplexity(instruction);
    const selectedModel = selectModelForComplexity(
      complexity,
      this.config.largestModelAllowed,
      this.config.useProForExtreme
    );

    this.log(`Auto-selected model: ${selectedModel} (complexity: ${complexity})`);
    return selectedModel;
  }

  // Cost Calculation
  calculateEstimatedCost(model, instruction) {
    const instructionTokens = estimateTokens(instruction);
    const fileTokens = this.currentFileContent ?
      estimateTokens(this.currentFileContent) : 0;
    const screenshotTokens = this.config.enableScreenshots ?
      this.screenshotQueue.size * 1000 : 0;

    const inputTokens = Math.min(
      this.config.maxInputTokens,
      instructionTokens + fileTokens + screenshotTokens
    );

    const cost = calculateCost(
      model,
      inputTokens,
      this.config.maxOutputTokens,
      this.config.useCacheTokens
    );

    return {
      cost,
      formatted: formatCost(cost),
      inputTokens,
      outputTokens: this.config.maxOutputTokens,
      model
    };
  }

  // Payload Building
  buildPayload(instruction) {
    const model = this.selectModelForRequest(instruction);
    const costEstimate = this.calculateEstimatedCost(model, instruction);

    if (costEstimate.cost > this.config.budgetLimit) {
      throw new Error(`Cost estimate (${costEstimate.formatted}) exceeds budget limit ($${this.config.budgetLimit})`);
    }

    const context = buildCachedContext({
      systemInstructions: this.buildSystemPrompt(),
      staticFiles: this.currentFileContent,
      dynamicPrompt: instruction,
      screenshots: this.screenshotQueue.getAll()
    });

    const payload = {
      model,
      costEstimate,
      context,
      config: {
        max_tokens: this.config.maxOutputTokens,
        temperature: 0.2
      }
    };

    this.debugAPI.recordPayload(payload);

    if (this.onCostUpdate) {
      this.onCostUpdate(costEstimate);
    }

    return payload;
  }

  buildSystemPrompt() {
    return `You are an expert code modification AI. Your task is to modify source code based on user instructions.

Rules:
1. Analyze the provided code and understand its structure
2. Generate the complete modified code
3. Return ONLY the modified code, no explanations
4. Maintain the original code style and formatting
5. Ensure the code is syntactically valid
6. Add comments only for complex logic

Output format:
- Return the complete modified file content
- Do not wrap in markdown code blocks
- Do not include explanations before or after the code`;
  }

  async callLLM(prompt, model) {
    const provider = this.config.provider || 'openai';
    const apiKey = this.config.apiKey || '';
    const endpointUrl = this.config.endpointUrl || '';
    
    let url = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      };
    } else if (provider === 'gemini') {
      const activeModel = model || 'gemini-2.5-flash';
      url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
      body = {
        contents: [{ parts: [{ text: prompt }] }]
      };
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
      headers['X-Title'] = 'AutoCode IDE';
      body = {
        model: model || 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }]
      };
    } else if (provider === 'local') {
      url = endpointUrl || 'http://localhost:11434/api/chat';
      const activeModel = model || 'llama3';
      if (url.includes('/api/chat')) {
        body = {
          model: activeModel,
          stream: false,
          messages: [{ role: 'user', content: prompt }]
        };
      } else {
        body = {
          model: activeModel,
          messages: [{ role: 'user', content: prompt }]
        };
      }
    }

    this.log(`Sending AutoCode LLM Request to ${provider} using model ${model}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API Call failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    let contentString = '';

    if (provider === 'gemini') {
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        contentString = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Unexpected Gemini API response format");
      }
    } else {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        contentString = data.choices[0].message.content;
      } else if (data.message && data.message.content) {
        contentString = data.message.content;
      } else {
        throw new Error("Unexpected LLM API response format");
      }
    }

    return contentString;
  }

  // Generation
  async generateModifications(instruction) {
    if (this.isProcessing) {
      throw new Error('Already processing a request');
    }

    this.isProcessing = true;
    this.log(`Generating modifications for: ${instruction.substring(0, 50)}...`);

    try {
      const payload = this.buildPayload(instruction);
      const responseText = await this.callLLM(payload.context, payload.model);
      
      let cleanCode = responseText.trim();
      if (cleanCode.startsWith('```')) {
        const lines = cleanCode.split('\n');
        if (lines[0].startsWith('```')) {
          lines.shift();
        }
        if (lines[lines.length - 1].startsWith('```')) {
          lines.pop();
        }
        cleanCode = lines.join('\n').trim();
      }

      this.proposedChanges = cleanCode;

      const result = {
        success: true,
        model: payload.model,
        cost: payload.costEstimate,
        modifications: cleanCode
      };

      this.debugAPI.recordResponse(result);
      return result;

    } finally {
      this.isProcessing = false;
    }
  }

  // Chat Integration
  async chatWithAI(message, options = {}) {
    return this.chat.sendMessage(message, options);
  }

  setChatContext(filePaths) {
    this.chat.setContextFiles(filePaths);
  }

  // Screenshot Management
  async triggerScreenshotCapture() {
    return null;
  }

  handleManualAction(actionType, data) {
    if (!this.config.captureOnPlay || !this.config.enableScreenshots) {
      return;
    }

    this.triggerScreenshotCapture().then(screenshot => {
      if (screenshot) {
        this.screenshotQueue.push(screenshot, {
          actionType,
          data,
          manualCapture: true
        });
        this.log(`Captured screenshot on ${actionType}`);
      }
    });
  }

  // Diff Generation
  generateDiff(original, modified) {
    if (!original || !modified) return null;

    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff = [];

    let i = 0, j = 0;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        j++;
      } else if (j >= modifiedLines.length) {
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        i++;
      } else if (originalLines[i] === modifiedLines[j]) {
        diff.push({ type: 'unchanged', line: i + 1, content: originalLines[i] });
        i++;
        j++;
      } else {
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        i++;
        j++;
      }
    }

    return diff;
  }

  // Change Management
  applyChanges(modifiedContent) {
    if (!this.config.targetFile || !modifiedContent) {
      throw new Error('No target file or modifications to apply');
    }

    try {
      const fs = require('fs');
      fs.writeFileSync(this.config.targetFile, modifiedContent, 'utf8');
      this.currentFileContent = modifiedContent;
      this.log(`Changes applied to ${this.config.targetFile}`);
      return true;
    } catch (err) {
      this.log(`Failed to apply changes: ${err.message}`);
      throw err;
    }
  }

  discardChanges() {
    this.proposedChanges = null;
    this.log('Proposed changes discarded');
  }
}

module.exports = { AutoCodeSystem };
