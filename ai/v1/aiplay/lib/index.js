/**
 * AutoCode Vibe-Coding IDE System
 * Main entry point - exports all modules
 */

// Core
const { AutoCodeSystem } = require('./core');
const { AutoCodeConfig } = require('./config');

// Data & Pricing
const {
  MODEL_PRICING,
  MODEL_TIER_ORDER,
  calculateCost,
  formatCost,
  getModelPricing,
  getAvailableModels,
  getModelsByTier
} = require('./pricing');

// Complexity & Model Selection
const {
  COMPLEXITY_KEYWORDS,
  classifyTaskComplexity,
  selectModelForComplexity,
  estimateTokens,
  getComplexityDescription
} = require('./complexity');

// Token Minimization
const {
  minifyCode,
  stripComments,
  compressScreenshot,
  buildCachedContext,
  truncateToTokens,
  calculateCompressionRatio
} = require('./minimization');

// Screenshots
const { ScreenshotQueue } = require('./screenshots');

// Debug
const { AutoCodeDebugAPI } = require('./debug');

// Project
const { MultiFileProject } = require('./project');

// Chat
const { AIChatInterface, ChatMessage } = require('./chat');

// QOL Features
const {
  PromptHistory,
  DraftManager,
  TemplateLibrary,
  ToastNotifier,
  KeyboardShortcuts
} = require('./qol');

module.exports = {
  // Core
  AutoCodeSystem,
  AutoCodeConfig,

  // Pricing
  MODEL_PRICING,
  MODEL_TIER_ORDER,
  calculateCost,
  formatCost,
  getModelPricing,
  getAvailableModels,
  getModelsByTier,

  // Complexity
  COMPLEXITY_KEYWORDS,
  classifyTaskComplexity,
  selectModelForComplexity,
  estimateTokens,
  getComplexityDescription,

  // Minimization
  minifyCode,
  stripComments,
  compressScreenshot,
  buildCachedContext,
  truncateToTokens,
  calculateCompressionRatio,

  // Components
  ScreenshotQueue,
  AutoCodeDebugAPI,
  MultiFileProject,
  AIChatInterface,
  ChatMessage,

  // QOL
  PromptHistory,
  DraftManager,
  TemplateLibrary,
  ToastNotifier,
  KeyboardShortcuts
};
