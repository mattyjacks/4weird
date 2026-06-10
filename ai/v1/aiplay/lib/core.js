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

  // Generation
  async generateModifications(instruction) {
    if (this.isProcessing) {
      throw new Error('Already processing a request');
    }

    this.isProcessing = true;
    this.log(`Generating modifications for: ${instruction.substring(0, 50)}...`);

    try {
      const payload = this.buildPayload(instruction);

      const result = {
        success: true,
        model: payload.model,
        cost: payload.costEstimate,
        modifications: null
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
