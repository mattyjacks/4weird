/**
 * AutoCode Pricing Module
 * Model pricing database and cost calculations
 */

// Model pricing per 1M tokens (in USD)
const MODEL_PRICING = {
  // GPT-5.6 Series
  'gpt-5.6-luna': {
    name: 'GPT-5.6 Luna',
    inputRate: 0.20,
    outputRate: 1.20,
    cacheInputRate: 0.10,
    tier: 1,
    description: 'Current lowest-cost OpenAI model'
  },
  'gpt-5.6-terra': {
    name: 'GPT-5.6 Terra', inputRate: 2.00, outputRate: 12.00, cacheInputRate: 1.00, tier: 2,
    description: 'Current balanced OpenAI model'
  },
  'gpt-5.6-sol': {
    name: 'GPT-5.6 Sol', inputRate: 4.00, outputRate: 20.00, cacheInputRate: 2.00, tier: 3,
    description: 'Current advanced OpenAI model'
  },
  'gpt-6-astra': {
    name: 'GPT-6 Astra', inputRate: 10.00, outputRate: 50.00, cacheInputRate: 5.00, tier: 4,
    description: 'Current flagship OpenAI model'
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
  // Current Gemini Series
  'gemini-3.5-flash-lite': {
    name: 'Gemini 3.5 Flash-Lite',
    inputRate: 0.25,
    outputRate: 1.50,
    cacheInputRate: 0.025,
    tier: 1,
    description: 'Current lowest-cost stable Gemini tier'
  },
  'gemini-3.8-flash': {
    name: 'Gemini 3.8 Flash',
    inputRate: 0.75,
    outputRate: 3.75,
    cacheInputRate: 0.075,
    tier: 2,
    description: 'Newest stable Gemini Flash model'
  },
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
  // Current Meta Llama models on OpenRouter
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    name: 'Llama 4 Scout (Meta)',
    inputRate: 0.10,
    outputRate: 0.30,
    cacheInputRate: 0.05,
    tier: 1,
    description: 'Current efficient multimodal Llama model'
  },
  // DeepSeek Series
  'deepseek-chat': {
    name: 'DeepSeek Chat (V3)',
    inputRate: 0.14,
    outputRate: 0.28,
    cacheInputRate: 0.014,
    tier: 1,
    description: 'General purpose flagship chat model'
  },
  'deepseek-reasoner': {
    name: 'DeepSeek Reasoner (R1)',
    inputRate: 0.55,
    outputRate: 2.19,
    cacheInputRate: 0.14,
    tier: 3,
    description: 'Specialized deep logic and reasoning model'
  },
  'deepseek-v4-flash': {
    name: 'DeepSeek V4 Flash',
    inputRate: 0.05,
    outputRate: 0.20,
    cacheInputRate: 0.0125,
    tier: 1,
    description: 'Ultra token-efficient high-speed model for DeepSeek Harness'
  },
  'deepseek-v4-pro': {
    name: 'DeepSeek V4 Pro',
    inputRate: 0.50,
    outputRate: 2.00,
    cacheInputRate: 0.125,
    tier: 3,
    description: 'High-performance complex reasoning model'
  },
  'deepseek-v4-flash-vision-exp': {
    name: 'DeepSeek V4 Flash Vision',
    inputRate: 0.10,
    outputRate: 0.40,
    cacheInputRate: 0.025,
    tier: 1,
    description: 'Experimental multimodal image processing model'
  },
  // ElevenLabs audio (BYOK voice layer — not LLM tokens)
  'elevenlabs-tts': {
    name: 'ElevenLabs TTS',
    inputRate: 300.00,
    outputRate: 0,
    cacheInputRate: 300.00,
    tier: 1,
    description: 'Approx $0.30 per 1k chars (Creator tier)',
    unit: 'chars'
  },
  'elevenlabs-stt': {
    name: 'ElevenLabs Scribe STT',
    inputRate: 0.33,
    outputRate: 0,
    cacheInputRate: 0.33,
    tier: 1,
    description: 'Approx $0.02 per minute transcribed',
    unit: 'seconds'
  },
  'elevenlabs-audio': {
    name: 'ElevenLabs Audio (generic)',
    inputRate: 0.50,
    outputRate: 1.50,
    cacheInputRate: 0.25,
    tier: 1,
    description: 'Fallback audio cost bucket'
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
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  'gpt-6-astra'
];

/**
 * Calculate cost for a given model and token counts
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {boolean} useCache - Whether cached input pricing applies
 * @returns {number} Cost in USD
 */
const FALLBACK_PRICING = {
  inputRate: 0.50,
  outputRate: 1.50,
  cacheInputRate: 0.25,
  tier: 1
};

function sanitizeTokenCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(v, 100000000);
}

function calculateCost(model, inputTokens, outputTokens, useCache = false) {
  const pricing = MODEL_PRICING[model] || FALLBACK_PRICING;

  const inputRate = useCache ? pricing.cacheInputRate : pricing.inputRate;
  const inputCost = (sanitizeTokenCount(inputTokens) / 1000000) * inputRate;
  const outputCost = (sanitizeTokenCount(outputTokens) / 1000000) * pricing.outputRate;

  const total = inputCost + outputCost;
  return Number.isFinite(total) ? total : 0;
}

/**
 * Format cost for display
 * @param {number} cost - Cost in USD
 * @returns {string} Formatted cost string
 */
function formatCost(cost) {
  const v = Number(cost);
  if (!Number.isFinite(v) || v < 0) return '$0.0000';
  if (v < 0.01) {
    return `$${(v * 100).toFixed(2)}c`;
  }
  return `$${v.toFixed(4)}`;
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

function listModelsByTier() {
  return Object.entries(MODEL_PRICING)
    .map(([id, p]) => ({ id, name: p.name, tier: p.tier, inputRate: p.inputRate, outputRate: p.outputRate }))
    .sort((a, b) => a.tier - b.tier || a.inputRate - b.inputRate);
}

function estimateCostForCharacters(model, inputChars, outputChars, useCache = false) {
  const inputTokens = Math.ceil(Number(inputChars || 0) / 4);
  const outputTokens = Math.ceil(Number(outputChars || 0) / 4);
  return calculateCost(model, inputTokens, outputTokens, useCache);
}

module.exports = {
  MODEL_PRICING,
  MODEL_TIER_ORDER,
  FALLBACK_PRICING,
  calculateCost,
  formatCost,
  sanitizeTokenCount,
  getModelPricing,
  getAvailableModels,
  getModelsByTier,
  listModelsByTier,
  estimateCostForCharacters
};
