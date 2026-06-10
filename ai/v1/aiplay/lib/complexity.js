/**
 * AutoCode Complexity Module
 * Task complexity classification and model selection
 */

// Complexity classification keywords
const COMPLEXITY_KEYWORDS = {
  low: [
    'fix typo', 'rename', 'comment', 'format', 'style', 'whitespace',
    'indent', 'simple', 'easy', 'minor', 'tweak', 'adjust',
    'update version', 'add log', 'console.log', 'debug print'
  ],
  medium: [
    'add function', 'modify', 'update', 'change', 'implement basic',
    'refactor', 'extract', 'move', 'reorganize', 'improve',
    'optimize', 'enhance', 'clean up', 'simplify'
  ],
  high: [
    'architect', 'redesign', 'rewrite', 'major refactor', 'complex',
    'algorithm', 'data structure', 'async', 'concurrent', 'threading',
    'performance critical', 'security', 'encryption', 'authentication',
    'database', 'query optimization', 'machine learning', 'ai'
  ]
};

/**
 * Classify task complexity based on instruction content
 * @param {string} instruction - User instruction
 * @returns {string} Complexity level: 'low', 'medium', or 'high'
 */
function classifyTaskComplexity(instruction) {
  const lower = instruction.toLowerCase();
  let score = 0;

  // Check keyword matches
  COMPLEXITY_KEYWORDS.low.forEach(keyword => {
    if (lower.includes(keyword)) score -= 1;
  });

  COMPLEXITY_KEYWORDS.medium.forEach(keyword => {
    if (lower.includes(keyword)) score += 1;
  });

  COMPLEXITY_KEYWORDS.high.forEach(keyword => {
    if (lower.includes(keyword)) score += 2;
  });

  // Length factor (longer prompts often indicate complexity)
  const wordCount = lower.split(/\s+/).length;
  if (wordCount > 50) score += 1;
  if (wordCount > 100) score += 1;

  // Multiple requirements indicator
  const requirementCount = (lower.match(/\b(add|fix|implement|change|update|refactor|optimize)\b/g) || []).length;
  if (requirementCount > 2) score += 1;

  if (score <= -1) return 'low';
  if (score >= 2) return 'high';
  return 'medium';
}

/**
 * Select appropriate model based on complexity and constraints
 * @param {string} complexity - Complexity level
 * @param {string} largestAllowed - Maximum allowed model
 * @param {boolean} useProForExtreme - Whether to use Pro models for high complexity
 * @returns {string} Selected model identifier
 */
function selectModelForComplexity(complexity, largestAllowed, useProForExtreme = false) {
  const { MODEL_TIER_ORDER, MODEL_PRICING } = require('./pricing');

  // Get the tier of the largest allowed model
  const maxTier = MODEL_PRICING[largestAllowed]?.tier || 3;

  // Model selection map
  const selectionMap = {
    low: 'gpt-4o-mini',
    medium: maxTier >= 3 ? 'gpt-5.4' : 'gpt-4o',
    high: useProForExtreme && maxTier >= 5 ? 'gpt-5.5-pro' : 'gpt-5.5'
  };

  let selected = selectionMap[complexity];

  // Ensure selected model doesn't exceed max tier
  const selectedTier = MODEL_PRICING[selected]?.tier || 3;
  if (selectedTier > maxTier) {
    // Find highest model within tier limit
    for (let i = MODEL_TIER_ORDER.length - 1; i >= 0; i--) {
      const model = MODEL_TIER_ORDER[i];
      if (MODEL_PRICING[model].tier <= maxTier) {
        selected = model;
        break;
      }
    }
  }

  return selected;
}

/**
 * Estimate token count from text
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Get complexity description
 * @param {string} complexity - Complexity level
 * @returns {string} Human-readable description
 */
function getComplexityDescription(complexity) {
  const descriptions = {
    low: 'Simple task - minimal cognitive load',
    medium: 'Moderate complexity - requires understanding',
    high: 'High complexity - significant reasoning required'
  };
  return descriptions[complexity] || 'Unknown complexity';
}

module.exports = {
  COMPLEXITY_KEYWORDS,
  classifyTaskComplexity,
  selectModelForComplexity,
  estimateTokens,
  getComplexityDescription
};
