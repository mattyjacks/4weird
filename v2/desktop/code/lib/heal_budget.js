/**
 * heal_budget.js — TOKEN budget for the self-healing loop.
 *
 * startHealCycle (lib/opencode_bridge.js) stops on maxIterations only.
 * This module adds the money side: per-iteration token accounting priced
 * via lib/pricing.js, with stop conditions on maxTokens + maxSpendUSD.
 *
 * - Token counts come from the caller (LLM usage) or are estimated from
 *   character counts at 4 chars/token (the lib/minimization.js convention).
 * - When a `brain` (with dataDir) is supplied, every recorded iteration is
 *   also appended to the persistent ledger via lib/brain/token_tracker.js.
 * - Pure in-memory otherwise: safe to require in Electron main, renderer
 *   (nodeIntegration), headless servers, and minimal cloud containers.
 *
 * Usage:
 *   const { createHealBudget, recordIteration, shouldStop } = require('./heal_budget');
 *   const budget = createHealBudget({ maxTokens: 50000, maxSpendUSD: 0.50, model: 'gpt-4o-mini' });
 *   recordIteration(budget, { iteration: 1, inputTokens: 400, outputTokens: 200 });
 *   const { stop, reason } = shouldStop(budget); // {stop, reason}
 */

'use strict';

const { calculateCost, formatCost, sanitizeTokenCount } = require('./pricing');

let tokenTracker = null;
try {
  tokenTracker = require('./brain/token_tracker');
} catch (e) { tokenTracker = null; }

/** 4 chars/token estimate (mirrors lib/minimization.js truncateToTokens). */
const CHARS_PER_TOKEN = 4;

function estimateTokensForChars(chars) {
  const n = Number(chars);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / CHARS_PER_TOKEN);
}

function sanitizeMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

/**
 * Create a fresh budget object.
 * @param {object} opts
 * @param {number} [opts.maxTokens] - stop when total tokens exceed this (null/Infinity = unlimited)
 * @param {number} [opts.maxSpendUSD] - stop when spend exceeds this (null/Infinity = unlimited)
 * @param {string} [opts.model] - model id priced via lib/pricing.js (unknown ids use fallback pricing)
 * @param {object} [opts.brain] - optional brain ({ dataDir, activeRunId }) for persistent token_tracker logging
 */
function createHealBudget({ maxTokens = null, maxSpendUSD = null, model = 'gpt-4o-mini', brain = null } = {}) {
  const capTokens = maxTokens === null || maxTokens === undefined ? Infinity : sanitizeTokenCount(maxTokens);
  const capSpend = maxSpendUSD === null || maxSpendUSD === undefined ? Infinity : sanitizeMoney(maxSpendUSD);
  return {
    maxTokens: capTokens,
    maxSpendUSD: capSpend,
    model: typeof model === 'string' && model ? model : 'gpt-4o-mini',
    brain: brain || null,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalSpendUSD: 0,
    iterations: [],
    ledger: [],
  };
}

/**
 * Record one healing iteration against the budget.
 * Accepts explicit token counts, or character counts estimated at 4 chars/token.
 * @param {object} budget - from createHealBudget()
 * @param {object} usage
 * @param {number} [usage.iteration]
 * @param {number} [usage.inputTokens] [usage.outputTokens]
 * @param {number} [usage.inputChars] [usage.outputChars] - estimated when token counts absent
 * @param {string} [usage.output] - output text; output tokens estimated from its length when needed
 * @returns {{ entry: object, ledgerLine: string, stop: boolean, reason: string }}
 */
function recordIteration(budget, usage = {}) {
  if (!budget || typeof budget !== 'object' || !Array.isArray(budget.iterations)) {
    throw new Error('heal_budget: recordIteration needs a budget from createHealBudget().');
  }
  let inputTokens = Number(usage.inputTokens);
  let outputTokens = Number(usage.outputTokens);
  if (!Number.isFinite(inputTokens) || inputTokens < 0) {
    inputTokens = usage.inputChars !== undefined
      ? estimateTokensForChars(usage.inputChars)
      : 0;
  } else {
    inputTokens = Math.floor(inputTokens);
  }
  if (!Number.isFinite(outputTokens) || outputTokens < 0) {
    if (usage.outputChars !== undefined) outputTokens = estimateTokensForChars(usage.outputChars);
    else if (typeof usage.output === 'string') outputTokens = estimateTokensForChars(usage.output.length);
    else outputTokens = 0;
  } else {
    outputTokens = Math.floor(outputTokens);
  }
  inputTokens = sanitizeTokenCount(inputTokens);
  outputTokens = sanitizeTokenCount(outputTokens);

  const costUSD = calculateCost(budget.model, inputTokens, outputTokens, false);

  budget.totalInputTokens += inputTokens;
  budget.totalOutputTokens += outputTokens;
  budget.totalTokens = budget.totalInputTokens + budget.totalOutputTokens;
  budget.totalSpendUSD += costUSD;

  const entry = {
    iteration: usage.iteration !== undefined ? usage.iteration : budget.iterations.length + 1,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUSD,
    cumulativeTokens: budget.totalTokens,
    cumulativeSpendUSD: budget.totalSpendUSD,
    at: new Date().toISOString(),
  };
  budget.iterations.push(entry);

  const ledgerLine =
    `[heal_budget] iter=${entry.iteration} in=${inputTokens} out=${outputTokens} ` +
    `tokens=${entry.totalTokens} (${formatCost(costUSD)}) ` +
    `cum=${budget.totalTokens} tokens / ${formatCost(budget.totalSpendUSD)} ` +
    `(cap ${Number.isFinite(budget.maxTokens) ? budget.maxTokens : 'unlimited'} tokens / ` +
    `${Number.isFinite(budget.maxSpendUSD) ? '$' + budget.maxSpendUSD.toFixed(4) : 'unlimited'} model=${budget.model})`;
  budget.ledger.push(ledgerLine);

  if (budget.brain && tokenTracker) {
    try {
      tokenTracker.recordTokenUsage(budget.brain, budget.model, inputTokens, outputTokens);
    } catch (e) { /* ledger accounting must never break the heal loop */ }
  }

  const { stop, reason } = shouldStop(budget);
  return { entry, ledgerLine, stop, reason };
}

/**
 * Budget trip check.
 * @param {object} budget - from createHealBudget()
 * @returns {{ stop: boolean, reason: string }} reason is 'ok' when under budget.
 */
function shouldStop(budget) {
  if (!budget || typeof budget !== 'object') return { stop: false, reason: 'ok' };
  const tokens = Number(budget.totalTokens) || 0;
  const spend = Number(budget.totalSpendUSD) || 0;
  if (Number.isFinite(budget.maxTokens) && tokens > budget.maxTokens) {
    return { stop: true, reason: `maxTokens exceeded: ${tokens}/${budget.maxTokens} tokens` };
  }
  if (Number.isFinite(budget.maxSpendUSD) && spend > budget.maxSpendUSD) {
    return {
      stop: true,
      reason: `maxSpendUSD exceeded: ${formatCost(spend)}/$${budget.maxSpendUSD.toFixed(4)}`,
    };
  }
  return { stop: false, reason: 'ok' };
}

/** Human-readable summary of the budget state (for logs / verdicts). */
function summarizeBudget(budget) {
  if (!budget || typeof budget !== 'object') return null;
  return {
    model: budget.model,
    iterations: budget.iterations.length,
    totalInputTokens: budget.totalInputTokens,
    totalOutputTokens: budget.totalOutputTokens,
    totalTokens: budget.totalTokens,
    totalSpendUSD: budget.totalSpendUSD,
    totalSpendFormatted: formatCost(budget.totalSpendUSD || 0),
    maxTokens: Number.isFinite(budget.maxTokens) ? budget.maxTokens : null,
    maxSpendUSD: Number.isFinite(budget.maxSpendUSD) ? budget.maxSpendUSD : null,
  };
}

/** Copy of the per-iteration ledger lines (for log files). */
function getLedger(budget) {
  if (!budget || !Array.isArray(budget.ledger)) return [];
  return budget.ledger.slice();
}

module.exports = {
  CHARS_PER_TOKEN,
  createHealBudget,
  recordIteration,
  shouldStop,
  summarizeBudget,
  getLedger,
  estimateTokensForChars,
};
