/**
 * AutoCode Pricing Module
 * Model pricing database and cost calculations
 */

// Model pricing per 1M tokens (in USD)
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
    description: 'Premium model for complex tasks'
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
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

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
