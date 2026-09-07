/**
 * AutoCode Pricing Module
 * Model pricing database and cost calculations
 */

// Model pricing per 1M tokens (in USD)
const MODEL_PRICING = {
  // GPT-5.6 Series
  'gpt-5.6-luna': {
    name: 'GPT-5.6 Luna',
    inputRate: 2.00,
    outputRate: 8.00,
    cacheInputRate: 1.00,
    tier: 2,
    description: 'Ultra fast and capable default model'
  },
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
    description: 'Premium model for complex tasks'
  },
  'gpt-5.4-mini-2026-03-17': {
    name: 'GPT-5.4 Mini',
    inputRate: 0.15,
    outputRate: 0.60,
    cacheInputRate: 0.075,
    tier: 1,
    description: 'Fast and affordable'
  },
  'gpt-5.4-mini': {
    name: 'GPT-5.4 Mini',
    inputRate: 0.15,
    outputRate: 0.60,
    cacheInputRate: 0.075,
    tier: 1,
    description: 'Fast and affordable'
  },
  'gpt-5.4-nano': {
    name: 'GPT-5.4 Nano',
    inputRate: 0.05,
    outputRate: 0.20,
    cacheInputRate: 0.025,
    tier: 1,
    description: 'Ultra-lightweight fast model'
  },
  // Gemini Series
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    inputRate: 0.075,
    outputRate: 0.30,
    cacheInputRate: 0.0375,
    tier: 1,
    description: 'High-speed Gemini model'
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    inputRate: 1.25,
    outputRate: 5.00,
    cacheInputRate: 0.625,
    tier: 3,
    description: 'Advanced reasoning Gemini model'
  },
  // OpenRouter Models
  'google/gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash (OpenRouter)',
    inputRate: 0.075,
    outputRate: 0.30,
    cacheInputRate: 0.0375,
    tier: 1,
    description: 'OpenRouter Gemini 2.5 Flash'
  },
  'google/gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro (OpenRouter)',
    inputRate: 1.25,
    outputRate: 5.00,
    cacheInputRate: 0.625,
    tier: 3,
    description: 'OpenRouter Gemini 2.5 Pro'
  },
  'openai/gpt-4o-mini': {
    name: 'GPT-4o Mini (OpenRouter)',
    inputRate: 0.15,
    outputRate: 0.60,
    cacheInputRate: 0.075,
    tier: 1,
    description: 'OpenRouter GPT-4o Mini'
  },
  // GPT-4o Series
  'gpt-4o': {
    name: 'GPT-4o',
    inputRate: 2.50,
    outputRate: 10.00,
    cacheInputRate: 1.25,
    tier: 2,
    description: 'Omni-modal model'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    inputRate: 0.15,
    outputRate: 0.60,
    cacheInputRate: 0.075,
    tier: 1,
    description: 'Fast and affordable'
  }
};

// Model tier ordering (lowest to highest)
const MODEL_TIER_ORDER = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-5.4',
  'gpt-5.5',
  'gpt-5.4-pro',
  'gpt-5.5-pro'
];

/**
 * Calculate cost for a given model and token counts
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {boolean} useCache - Whether cached input pricing applies
 * @returns {number} Cost in USD
 */
function calculateCost(model, inputTokens, outputTokens, useCache = false) {
  const pricing = MODEL_PRICING[model] || {
    inputRate: 0.50,
    outputRate: 1.50,
    cacheInputRate: 0.25,
    tier: 1
  };

  const inputRate = useCache ? pricing.cacheInputRate : pricing.inputRate;
  const inputCost = (inputTokens / 1000000) * inputRate;
  const outputCost = (outputTokens / 1000000) * pricing.outputRate;

  return inputCost + outputCost;
}

/**
 * Format cost for display
 * @param {number} cost - Cost in USD
 * @returns {string} Formatted cost string
 */
function formatCost(cost) {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}c`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Get pricing info for a model
 * @param {string} model - Model identifier
 * @returns {object} Pricing information
 */
function getModelPricing(model) {
  return MODEL_PRICING[model] || null;
}

/**
 * Get all available models
 * @returns {string[]} Array of model identifiers
 */
function getAvailableModels() {
  return Object.keys(MODEL_PRICING);
}

/**
 * Get models by tier
 * @param {number} maxTier - Maximum tier to include
 * @returns {string[]} Array of model identifiers
 */
function getModelsByTier(maxTier) {
  return MODEL_TIER_ORDER.filter(model => {
    const pricing = MODEL_PRICING[model];
    return pricing && pricing.tier <= maxTier;
  });
}

module.exports = {
  MODEL_PRICING,
  MODEL_TIER_ORDER,
  calculateCost,
  formatCost,
  getModelPricing,
  getAvailableModels,
  getModelsByTier
};
