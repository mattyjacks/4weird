/**
 * AutoCode Core Module
 * Main AutoCodeSystem class that orchestrates all functionality
 */

const fs = require('fs');
const path = require('path');
const { AutoCodeConfig } = require('./config');
const { ScreenshotQueue } = require('./screenshots');
const { AutoCodeDebugAPI } = require('./debug');
const { MultiFileProject } = require('./project');
const { AIChatInterface } = require('./chat');
const { calculateCost, formatCost } = require('./pricing');
const { classifyTaskComplexity, selectModelForComplexity, estimateTokens } = require('./complexity');
const { minifyCode, buildCachedContext, truncateToTokens } = require('./minimization');
const { recordTokenUsage } = require('./brain/token_tracker');
const { getResolvedApiKey } = require('./storage');

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
    this.dataDir = path.join(__dirname, '..', 'data');
    this.activeRunId = 'autocode_' + Date.now();

    // Event callbacks
    this.onCostUpdate = null;
    this.onDiffGenerated = null;
    this.onError = null;
    this.onLog = null;
  }

  // Screenshot accessors for UI compatibility
  get screenshots() {
    return this.screenshotQueue.getAll().map(entry => entry.screenshot || entry);
  }

  addScreenshot(base64) {
    if (!this.config.enableScreenshots) {
      this.config.enableScreenshots = true;
      this.screenshotQueue.enable(this.config.maxScreenshots || 2);
    }
    return this.screenshotQueue.push(base64);
  }

  clearScreenshots() {
    this.screenshotQueue.clear();
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
    if (this.config.modelName && this.config.modelName !== 'custom') {
      return this.config.modelName;
    }

    if (!this.config.autoChooseModel) {
      return this.config.largestModelAllowed || 'gpt-5.6-luna';
    }

    const complexity = classifyTaskComplexity(instruction);
    const selectedModel = selectModelForComplexity(
      complexity,
      this.config.largestModelAllowed || 'gpt-5.6-luna',
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
    let provider = this.config.provider || 'openai';
    let apiKey = getResolvedApiKey(provider, this.config.apiKey);
    const endpointUrl = this.config.endpointUrl || '';

    // Auto-resolve API keys from environment variables
    if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY') {
      if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
      } else if (provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
        apiKey = process.env.DEEPSEEK_API_KEY;
      } else if (provider === 'meta' && (process.env.META_API_KEY || process.env.OPENROUTER_API_KEY)) {
        apiKey = process.env.META_API_KEY || process.env.OPENROUTER_API_KEY;
      } else if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
        apiKey = process.env.OPENROUTER_API_KEY;
      } else if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        apiKey = process.env.GEMINI_API_KEY;
      } else if (!provider || provider === 'openai') {
        if (process.env.OPENAI_API_KEY) {
          apiKey = process.env.OPENAI_API_KEY;
          provider = 'openai';
        } else if (process.env.DEEPSEEK_API_KEY) {
          apiKey = process.env.DEEPSEEK_API_KEY;
          provider = 'deepseek';
        } else if (process.env.META_API_KEY) {
          apiKey = process.env.META_API_KEY;
          provider = 'meta';
        } else if (process.env.OPENROUTER_API_KEY) {
          apiKey = process.env.OPENROUTER_API_KEY;
          provider = 'openrouter';
        }
      }
    }
    
    let url = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    const promptText = typeof prompt === 'string' ? prompt : (
      prompt.dynamic?.content || prompt.system?.content || JSON.stringify(prompt)
    );

    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gpt-5.6-luna',
        messages: [{ role: 'user', content: promptText }]
      };
    } else if (provider === 'deepseek') {
      url = 'https://api.deepseek.com/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'deepseek-v4-flash',
        messages: [{ role: 'user', content: promptText }]
      };
    } else if (provider === 'meta') {
      const activeModel = model || 'meta-llama/llama-4-scout-17b-16e-instruct';
      const isMetaDirect = endpointUrl && endpointUrl.includes('meta.ai');
      url = isMetaDirect ? endpointUrl : (endpointUrl || 'https://openrouter.ai/api/v1/chat/completions');
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
      headers['X-Title'] = 'AutoCode IDE';
      body = {
        model: activeModel,
        messages: [{ role: 'user', content: promptText }]
      };
    } else if (provider === 'gemini') {
      const activeModel = model || 'gemini-3.5-flash-lite';
      url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
      body = {
        contents: [{ parts: [{ text: promptText }] }]
      };
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
      headers['X-Title'] = 'AutoCode IDE';
      body = {
        model: model || 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: promptText }]
      };
    } else if (provider === 'local') {
      url = endpointUrl || 'http://localhost:11434/api/chat';
      const activeModel = model || 'llama3';
      if (url.includes('/api/chat')) {
        body = {
          model: activeModel,
          stream: false,
          messages: [{ role: 'user', content: promptText }]
        };
      } else {
        body = {
          model: activeModel,
          messages: [{ role: 'user', content: promptText }]
        };
      }
    }

    this.log(`Sending AutoCode LLM Request to ${provider} using model ${model || 'default'}`);

    const abortController = new AbortController();
    const fetchTimeout = setTimeout(() => abortController.abort(), 60000);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController.signal
      });
    } finally {
      clearTimeout(fetchTimeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API Call failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    let contentString = '';
    let promptTokens = 0;
    let completionTokens = 0;

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

    // Estimate tokens if provider doesn't return usage metadata
    if (promptTokens === 0 && completionTokens === 0) {
      promptTokens = Math.round(promptText.length / 4);
      completionTokens = Math.round(contentString.length / 4);
    }

    const activeModel = model || (provider === 'openrouter' ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gpt-5.6-luna');
    const cost = calculateCost(activeModel, promptTokens, completionTokens, this.config.useCacheTokens);

    // Record token usage to token_usage.json
    try {
      recordTokenUsage(this, activeModel, promptTokens, completionTokens);
    } catch (e) {
      this.log(`Token recording notice: ${e.message}`);
    }

    return {
      content: contentString,
      model: activeModel,
      provider,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      cost,
      costFormatted: formatCost(cost)
    };
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
      const llmResult = await this.callLLM(payload.context, payload.model);
      const responseText = typeof llmResult === 'string' ? llmResult : (llmResult.content || '');
      
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
        model: llmResult.model || payload.model,
        cost: llmResult.costFormatted ? { ...payload.costEstimate, formatted: llmResult.costFormatted, cost: llmResult.cost } : payload.costEstimate,
        usage: llmResult.usage || null,
        modifications: cleanCode
      };

      this.debugAPI.recordResponse(result);
      return result;

    } finally {
      this.isProcessing = false;
    }
  }

  // VibeCode method for AutoCode UI integration
  async vibeCode(filePath, currentContent, prompt) {
    this.loadFile(filePath, currentContent);
    try {
      const genResult = await this.generateModifications(prompt);
      const diff = this.generateDiff(currentContent, genResult.modifications);
      
      const report = {
        timestamp: new Date().toISOString(),
        filePath,
        prompt,
        model: genResult.model,
        usage: genResult.usage,
        cost: genResult.cost,
        success: true
      };
      this.saveFixReport(report);

      return {
        success: true,
        diff,
        modifiedContent: genResult.modifications,
        model: genResult.model,
        usage: genResult.usage,
        cost: genResult.cost
      };
    } catch (err) {
      this.log(`vibeCode failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Autonomous Bug Fixer executing directly via AI tokens
  async autoFixBug({ bug, sourceFiles = [], targetFile = '', customInstruction = '' }) {
    this.log(`Starting autonomous AI bug fix for: ${bug?.title || bug?.description || 'Bug fix'}`);

    // If targetFile not specified, deduce from bug description or sourceFiles
    let fileToFix = targetFile;
    if (!fileToFix && bug) {
      const desc = bug.description || '';
      for (const f of sourceFiles) {
        const base = path.basename(f.path);
        if (desc.includes(base) || desc.includes(f.path)) {
          fileToFix = f.path;
          break;
        }
      }
      if (!fileToFix && sourceFiles.length > 0) {
        // Look for common game script candidates
        const candidate = sourceFiles.find(f => f.path.endsWith('game.js') || f.path.endsWith('index.html') || f.path.endsWith('main.js'));
        fileToFix = candidate ? candidate.path : sourceFiles[0].path;
      }
    }

    if (!fileToFix) {
      throw new Error('No source file identified to apply the bug fix.');
    }

    const fileObj = sourceFiles.find(f => f.path === fileToFix);
    let originalContent = '';
    if (fileObj) {
      originalContent = fileObj.content;
    } else if (fs.existsSync(fileToFix)) {
      originalContent = fs.readFileSync(fileToFix, 'utf8');
    } else {
      throw new Error(`Target file does not exist: ${fileToFix}`);
    }

    const promptInstruction = `Fix the following bug identified during playtesting in ${path.basename(fileToFix)}:
Bug Type: ${bug?.type || 'Runtime Bug'}
Severity: ${bug?.severity || 'medium'}
Description: ${bug?.description || 'Review and resolve issue'}
${bug?.consoleLogs && bug.consoleLogs.length > 0 ? `Console Logs:\n${bug.consoleLogs.slice(-5).join('\n')}` : ''}
${customInstruction ? `Additional Instructions: ${customInstruction}` : ''}

Modify the code to resolve the problem completely while preserving existing features.`;

    const vibeResult = await this.vibeCode(fileToFix, originalContent, promptInstruction);
    if (!vibeResult.success) {
      return vibeResult;
    }

    return {
      success: true,
      filePath: fileToFix,
      originalContent,
      modifiedContent: vibeResult.modifiedContent,
      diff: vibeResult.diff,
      model: vibeResult.model,
      usage: vibeResult.usage,
      cost: vibeResult.cost
    };
  }

  saveFixReport(report) {
    try {
      if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
      const reportFile = path.join(this.dataDir, 'autocode_fix_report.json');
      let reports = [];
      if (fs.existsSync(reportFile)) {
        try {
          reports = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        } catch (e) {}
      }
      reports.unshift(report);
      if (reports.length > 50) reports.pop();
      fs.writeFileSync(reportFile, JSON.stringify(reports, null, 2), 'utf8');
    } catch (e) {
      this.log(`Failed to save fix report: ${e.message}`);
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

  // Diff Generation (bounded: unchanged runs collapsed, capped entries)
  generateDiff(original, modified, maxEntries = 2000) {
    if (!original || !modified) return null;

    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff = [];
    let unchangedRun = 0;

    const flushUnchanged = () => {
      if (unchangedRun > 0) {
        diff.push({ type: 'unchanged', line: -1, content: `... ${unchangedRun} unchanged lines ...` });
        unchangedRun = 0;
      }
    };

    let i = 0, j = 0;
    while ((i < originalLines.length || j < modifiedLines.length) && diff.length < maxEntries) {
      if (i >= originalLines.length) {
        flushUnchanged();
        diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        j++;
      } else if (j >= modifiedLines.length) {
        flushUnchanged();
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        i++;
      } else if (originalLines[i] === modifiedLines[j]) {
        unchangedRun++;
        i++;
        j++;
      } else {
        flushUnchanged();
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        if (diff.length < maxEntries) {
          diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        }
        i++;
        j++;
      }
    }

    if ((i < originalLines.length || j < modifiedLines.length) && diff.length >= maxEntries) {
      diff.push({ type: 'unchanged', line: -1, content: '... diff truncated ...' });
    } else {
      flushUnchanged();
    }

    return diff;
  }

  // Change Management
  applyChanges(targetFileOrContent, optionalModifiedContent) {
    let target = this.config.targetFile;
    let content = this.proposedChanges;

    if (optionalModifiedContent !== undefined) {
      target = targetFileOrContent;
      content = optionalModifiedContent;
    } else if (targetFileOrContent) {
      if (fs.existsSync(targetFileOrContent) || targetFileOrContent.includes('/') || targetFileOrContent.includes('\\')) {
        target = targetFileOrContent;
      } else {
        content = targetFileOrContent;
      }
    }

    if (!target || !content) {
      throw new Error('No target file or modifications to apply');
    }

    try {
      fs.writeFileSync(target, content, 'utf8');
      this.currentFileContent = content;
      this.config.targetFile = target;
      this.log(`Changes applied to ${target}`);
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
