/**
 * AutoCode Vibe-Coding IDE System - Core Module
 * 
 * Features:
 * 1. Cost & Model Pricing Database
 * 2. Auto Choose Model Logic with Complexity Classification
 * 3. Token Minimization Strategies
 * 4. Screenshot Management & Action Capture
 * 5. Internal Debug API
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 1. COST & MODEL PRICING DATABASE
// ============================================================

const MODEL_PRICING = {
  // GPT-5.5 Series
  'gpt-5.5': {
    name: 'GPT-5.5',
    inputRate: 5.00,
    outputRate: 30.00,
    cacheInputRate: 2.50,
    tier: 4,
    description: 'High-performance general model'
  },
  'gpt-5.5-pro': {
    name: 'GPT-5.5 Pro',
    inputRate: 30.00,
    outputRate: 180.00,
    cacheInputRate: 15.00,
    tier: 5,
    description: 'Premium model for extreme complexity'
  },
  // GPT-5.4 Series
  'gpt-5.4': {
    name: 'GPT-5.4',
    inputRate: 2.50,
    outputRate: 15.00,
    cacheInputRate: 1.25,
    tier: 3,
    description: 'Standard high-performance model'
  },
  'gpt-5.4-pro': {
    name: 'GPT-5.4 Pro',
    inputRate: 30.00,
    outputRate: 180.00,
    cacheInputRate: 15.00,
    tier: 5,
    description: 'Premium legacy model'
  },
  'gpt-5.4-mini': {
    name: 'GPT-5.4 Mini',
    inputRate: 0.75,
    outputRate: 4.50,
    cacheInputRate: 0.375,
    tier: 2,
    description: 'Efficient medium-complexity model'
  },
  'gpt-5.4-nano': {
    name: 'GPT-5.4 Nano',
    inputRate: 0.20,
    outputRate: 1.25,
    cacheInputRate: 0.10,
    tier: 1,
    description: 'Fast, cost-effective simple tasks'
  },
  // GPT-4o Series
  'gpt-4o': {
    name: 'GPT-4o',
    inputRate: 2.50,
    outputRate: 10.00,
    cacheInputRate: 1.25,
    tier: 3,
    description: 'Legacy multimodal model'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    inputRate: 0.15,
    outputRate: 0.60,
    cacheInputRate: 0.075,
    tier: 1,
    description: 'Legacy efficient model'
  }
};

// Model tier ordering for constraint comparison
const MODEL_TIER_ORDER = [
  'gpt-5.4-nano',
  'gpt-4o-mini',
  'gpt-5.4-mini',
  'gpt-4o',
  'gpt-5.4',
  'gpt-5.5',
  'gpt-5.4-pro',
  'gpt-5.5-pro'
];

// ============================================================
// 2. AUTO CHOOSE MODEL LOGIC
// ============================================================

/**
 * Classify task complexity based on instruction content
 * @param {string} instruction - The user instruction/prompt
 * @returns {string} - 'low', 'medium', or 'high'
 */
function classifyTaskComplexity(instruction) {
  if (!instruction) return 'low';
  
  const instr = instruction.toLowerCase();
  
  const highKeywords = [
    'physics', 'math', 'boss', 'kraken', 'homing', 'missile', 
    'refactor', 'engine', 'complex', 'algorithm', 'rewrite',
    'neural', 'ai', 'machine learning', 'collision', 'pathfinding',
    'multithreading', 'async', 'websocket', 'database', 'encryption'
  ];
  
  const medKeywords = [
    'add', 'new feature', 'create', 'implement', 'mutate', 
    'upgrade', 'function', 'component', 'ui', 'style', 'animate',
    'button', 'menu', 'score', 'health', 'timer', 'particle'
  ];
  
  const hasHigh = highKeywords.some(kw => instr.includes(kw));
  const hasMed = medKeywords.some(kw => instr.includes(kw));
  
  if (hasHigh || instruction.length > 250) {
    return 'high';
  } else if (hasMed || instruction.length > 100) {
    return 'medium';
  }
  return 'low';
}

/**
 * Select appropriate model based on complexity and constraints
 * @param {string} complexity - 'low', 'medium', or 'high'
 * @param {string} maxAllowedModel - The largest model allowed by user constraint
 * @param {boolean} useProForExtreme - Whether to use Pro for extreme high complexity
 * @returns {string} - Selected model identifier
 */
function selectModelForComplexity(complexity, maxAllowedModel = 'gpt-5.5-pro', useProForExtreme = false) {
  // Map complexity to preferred model
  const complexityMap = {
    'low': 'gpt-5.4-nano',
    'medium': 'gpt-5.4-mini',
    'high': useProForExtreme ? 'gpt-5.5-pro' : 'gpt-5.5'
  };
  
  const preferredModel = complexityMap[complexity] || 'gpt-5.4-mini';
  
  // Apply constraint: cap model tier
  const maxTier = MODEL_PRICING[maxAllowedModel]?.tier || 5;
  const preferredTier = MODEL_PRICING[preferredModel]?.tier || 2;
  
  if (preferredTier <= maxTier) {
    return preferredModel;
  }
  
  // Find the best model within allowed tier
  const allowedModels = MODEL_TIER_ORDER.filter(m => 
    MODEL_PRICING[m] && MODEL_PRICING[m].tier <= maxTier
  );
  
  // Return the highest-tier allowed model
  return allowedModels[allowedModels.length - 1] || 'gpt-5.4-nano';
}

// ============================================================
// 3. TOKEN MINIMIZATION STRATEGIES
// ============================================================

/**
 * Extreme visual compression for screenshots
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Compression options
 * @returns {Promise<Buffer>} - Compressed image buffer
 */
async function compressScreenshot(imageBuffer, options = {}) {
  const {
    maxWidth = 256,
    grayscale = true,
    jpegQuality = 20
  } = options;
  
  // Note: Actual implementation requires Sharp or Jimp library
  // This is a placeholder that would be implemented with Sharp:
  /*
  const sharp = require('sharp');
  let pipeline = sharp(imageBuffer)
    .resize(maxWidth, null, { withoutEnlargement: true })
    .jpeg({ quality: jpegQuality, progressive: true });
  
  if (grayscale) {
    pipeline = pipeline.grayscale();
  }
  
  return await pipeline.toBuffer();
  */
  
  // For now, return the original (compression happens in main process via capturePage)
  return imageBuffer;
}

/**
 * Minify code by removing comments and unnecessary whitespace
 * @param {string} code - Source code to minify
 * @returns {string} - Minified code
 */
function minifyCode(code) {
  if (!code) return '';
  
  return code
    // Remove block comments /* */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove line comments // (but not URLs like http://)
    .replace(/([^:'"`\s])\s*\/\/.*$/gm, '$1')
    .replace(/^\s*\/\/.*$/gm, '')
    // Collapse multiple empty lines
    .replace(/\n\s*\n+/g, '\n')
    // Remove leading/trailing whitespace per line
    .replace(/^[ \t]+/gm, '')
    // Trim
    .trim();
}

/**
 * Build context cache structure for optimal prefix caching
 * Places static content first to maximize cache hits
 * @param {Object} context - Context components
 * @returns {Array} - Ordered context array
 */
function buildCachedContext(context) {
  const {
    systemInstructions,
    staticFiles,
    dynamicPrompt,
    screenshots
  } = context;
  
  // Order: System instructions (most static) -> Static files -> Dynamic content
  return [
    { type: 'system', content: systemInstructions },
    { type: 'static', content: staticFiles },
    { type: 'dynamic', content: dynamicPrompt },
    { type: 'visual', content: screenshots }
  ];
}

// ============================================================
// 4. SCREENSHOT MANAGEMENT & ACTION CAPTURE
// ============================================================

class ScreenshotQueue {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.queue = [];
    this.enabled = false;
  }
  
  enable(maxSize = 5) {
    this.enabled = true;
    this.maxSize = Math.max(0, Math.min(5, maxSize));
  }
  
  disable() {
    this.enabled = false;
    this.queue = [];
  }
  
  push(screenshotBase64, metadata = {}) {
    if (!this.enabled || this.maxSize === 0) return false;
    
    const entry = {
      timestamp: Date.now(),
      screenshot: screenshotBase64,
      metadata
    };
    
    this.queue.push(entry);
    
    // Maintain rolling window
    while (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
    
    return true;
  }
  
  getAll() {
    return [...this.queue];
  }
  
  clear() {
    this.queue = [];
  }
  
  setMaxSize(size) {
    this.maxSize = Math.max(0, Math.min(5, size));
    while (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
  }
}

// ============================================================
// 5. COST CALCULATION
// ============================================================

/**
 * Calculate estimated cost for a request
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @param {boolean} useCache - Whether cached input rates apply
 * @returns {number} - Estimated cost in USD
 */
function calculateCost(model, inputTokens, outputTokens, useCache = false) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  
  const inputRate = useCache ? pricing.cacheInputRate : pricing.inputRate;
  const outputRate = pricing.outputRate;
  
  // Rates are per 1M tokens
  const inputCost = (inputTokens / 1000000) * inputRate;
  const outputCost = (outputTokens / 1000000) * outputRate;
  
  return inputCost + outputCost;
}

/**
 * Format cost for display
 * @param {number} cost - Cost in USD
 * @returns {string} - Formatted string
 */
function formatCost(cost) {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  } else if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

// ============================================================
// 6. AUTOCODE CONFIGURATION
// ============================================================

class AutoCodeConfig {
  constructor() {
    this.budgetLimit = 0.05; // USD
    this.maxInputTokens = 30000;
    this.maxOutputTokens = 4000;
    this.useCacheTokens = true;
    this.enableScreenshots = false;
    this.maxScreenshots = 2;
    this.captureOnPlay = false;
    this.autoChooseModel = false;
    this.largestModelAllowed = 'gpt-5.4';
    this.useProForExtreme = false;
    this.minifyCode = true;
    this.compressScreenshots = true;
    this.targetFile = null;
  }
  
  update(config) {
    Object.assign(this, config);
    
    // Validate constraints
    this.maxScreenshots = Math.max(0, Math.min(5, this.maxScreenshots));
    this.budgetLimit = Math.max(0.001, this.budgetLimit);
    this.maxInputTokens = Math.max(1000, this.maxInputTokens);
    this.maxOutputTokens = Math.max(100, this.maxOutputTokens);
  }
  
  toJSON() {
    return {
      budgetLimit: this.budgetLimit,
      maxInputTokens: this.maxInputTokens,
      maxOutputTokens: this.maxOutputTokens,
      useCacheTokens: this.useCacheTokens,
      enableScreenshots: this.enableScreenshots,
      maxScreenshots: this.maxScreenshots,
      captureOnPlay: this.captureOnPlay,
      autoChooseModel: this.autoChooseModel,
      largestModelAllowed: this.largestModelAllowed,
      useProForExtreme: this.useProForExtreme,
      minifyCode: this.minifyCode,
      compressScreenshots: this.compressScreenshots,
      targetFile: this.targetFile
    };
  }
}

// ============================================================
// 7. INTERNAL DEBUG API
// ============================================================

class AutoCodeDebugAPI {
  constructor(autoCodeSystem) {
    this.system = autoCodeSystem;
    this.lastPayload = null;
    this.lastResponse = null;
    this.requestHistory = [];
  }
  
  getQueuedScreenshots() {
    return this.system.screenshotQueue.getAll();
  }
  
  triggerManualCapture() {
    return this.system.triggerScreenshotCapture();
  }
  
  getLastPayload() {
    return this.lastPayload;
  }
  
  getLastResponse() {
    return this.lastResponse;
  }
  
  getRequestHistory() {
    return [...this.requestHistory];
  }
  
  recordPayload(payload) {
    this.lastPayload = payload;
    this.requestHistory.push({
      timestamp: Date.now(),
      type: 'payload',
      data: payload
    });
    
    // Keep history manageable
    if (this.requestHistory.length > 100) {
      this.requestHistory.shift();
    }
  }
  
  recordResponse(response) {
    this.lastResponse = response;
    this.requestHistory.push({
      timestamp: Date.now(),
      type: 'response',
      data: response
    });
  }
  
  getSystemStatus() {
    return {
      config: this.system.config.toJSON(),
      screenshotQueue: {
        enabled: this.system.screenshotQueue.enabled,
        size: this.system.screenshotQueue.queue.length,
        maxSize: this.system.screenshotQueue.maxSize
      },
      historySize: this.requestHistory.length,
      isProcessing: this.system.isProcessing
    };
  }
}

// ============================================================
// 8. MAIN AUTOCODE SYSTEM CLASS
// ============================================================

class AutoCodeSystem {
  constructor() {
    this.config = new AutoCodeConfig();
    this.screenshotQueue = new ScreenshotQueue();
    this.debugAPI = new AutoCodeDebugAPI(this);
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
    // Expose debug API globally
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
    
    // Update screenshot queue settings
    if (this.config.enableScreenshots) {
      this.screenshotQueue.enable(this.config.maxScreenshots);
    } else {
      this.screenshotQueue.disable();
    }
    
    // Log changes
    if (oldConfig.autoChooseModel !== this.config.autoChooseModel) {
      this.log(`Auto-choose model: ${this.config.autoChooseModel ? 'enabled' : 'disabled'}`);
    }
    if (oldConfig.largestModelAllowed !== this.config.largestModelAllowed) {
      this.log(`Largest model allowed: ${this.config.largestModelAllowed}`);
    }
  }
  
  loadFile(filePath, content) {
    this.config.targetFile = filePath;
    this.currentFileContent = content;
    
    // Minify if enabled
    if (this.config.minifyCode) {
      this.currentFileContent = minifyCode(content);
    }
    
    this.log(`Loaded file: ${filePath} (${content.length} chars, minified: ${this.currentFileContent.length} chars)`);
    return this.currentFileContent;
  }
  
  async triggerScreenshotCapture() {
    // This will be called from the main app to capture game window
    // Returns a promise that resolves with base64 screenshot
    return null;
  }
  
  handleManualAction(actionType, data) {
    if (!this.config.captureOnPlay || !this.config.enableScreenshots) {
      return;
    }
    
    // Capture screenshot on manual user action
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
  
  calculateEstimatedCost(model, instruction) {
    // Estimate tokens based on instruction length and file content
    const instructionTokens = Math.ceil(instruction.length / 4);
    const fileTokens = this.currentFileContent ? 
      Math.ceil(this.currentFileContent.length / 4) : 0;
    const screenshotTokens = this.config.enableScreenshots ? 
      this.screenshotQueue.queue.length * 1000 : 0; // ~1000 tokens per compressed screenshot
    
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
  
  buildPayload(instruction) {
    const model = this.selectModelForRequest(instruction);
    const costEstimate = this.calculateEstimatedCost(model, instruction);
    
    // Check budget constraint
    if (costEstimate.cost > this.config.budgetLimit) {
      throw new Error(`Cost estimate (${costEstimate.formatted}) exceeds budget limit ($${this.config.budgetLimit})`);
    }
    
    // Build context with caching optimization
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
  
  async generateModifications(instruction) {
    if (this.isProcessing) {
      throw new Error('Already processing a request');
    }
    
    this.isProcessing = true;
    this.log(`Generating modifications for: ${instruction.substring(0, 50)}...`);
    
    try {
      const payload = this.buildPayload(instruction);
      
      // This would call the actual LLM API
      // For now, return a placeholder
      const result = {
        success: true,
        model: payload.model,
        cost: payload.costEstimate,
        modifications: null // Would contain actual LLM response
      };
      
      this.debugAPI.recordResponse(result);
      return result;
      
    } finally {
      this.isProcessing = false;
    }
  }
  
  generateDiff(original, modified) {
    if (!original || !modified) return null;
    
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    const diff = [];
    let i = 0, j = 0;
    
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        // Added lines
        diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        j++;
      } else if (j >= modifiedLines.length) {
        // Removed lines
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        i++;
      } else if (originalLines[i] === modifiedLines[j]) {
        // Unchanged
        diff.push({ type: 'unchanged', line: i + 1, content: originalLines[i] });
        i++;
        j++;
      } else {
        // Modified - mark as remove then add
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        i++;
        j++;
      }
    }
    
    return diff;
  }
  
  applyChanges(modifiedContent) {
    if (!this.config.targetFile || !modifiedContent) {
      throw new Error('No target file or modifications to apply');
    }
    
    // Write to file system
    try {
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

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  AutoCodeSystem,
  AutoCodeConfig,
  ScreenshotQueue,
  AutoCodeDebugAPI,
  MODEL_PRICING,
  MODEL_TIER_ORDER,
  classifyTaskComplexity,
  selectModelForComplexity,
  minifyCode,
  buildCachedContext,
  calculateCost,
  formatCost,
  compressScreenshot
};
