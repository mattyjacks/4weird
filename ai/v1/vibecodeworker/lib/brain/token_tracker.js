/**
 * Brain Token Usage Tracking and Analytics
 */

const fs = require('fs');
const path = require('path');

function recordTokenUsage(brain, model, prompt, completion) {
  if (!brain.dataDir) return;
  try {
    const usagePath = path.join(brain.dataDir, 'token_usage.json');
    let data = { history: [], lifetimeTotals: {} };
    if (fs.existsSync(usagePath)) {
      try { data = JSON.parse(fs.readFileSync(usagePath, 'utf8')); } catch (e) { console.error("Failed to parse token_usage.json, resetting", e); }
    }
    if (!data.history) data.history = [];
    if (!data.lifetimeTotals) data.lifetimeTotals = {};

    const total = prompt + completion;
    data.lifetimeTotals[model] = (data.lifetimeTotals[model] || 0) + total;
    data.lifetimeTotals['total'] = (data.lifetimeTotals['total'] || 0) + total;

    const newRecord = {
      timestamp: new Date().toISOString(),
      model,
      prompt,
      completion,
      total,
      runId: brain.activeRunId || 'run_unknown'
    };
    data.history.push(newRecord);

    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    data.history = data.history.filter(record => new Date(record.timestamp).getTime() > oneYearAgo);
    fs.writeFileSync(usagePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to record token usage", err);
  }
}

function getTokenStats(brain) {
  if (!brain.dataDir) return { total: {}, models: {} };
  try {
    const usagePath = path.join(brain.dataDir, 'token_usage.json');
    if (!fs.existsSync(usagePath)) return { total: {}, models: {} };

    const data = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
    const history = data.history || [];
    const lifetime = data.lifetimeTotals || {};

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;
    const oneYear = 365 * oneDay;

    const getSum = (records, filterFn) => records.filter(filterFn).reduce((sum, r) => sum + r.total, 0);
    const models = [...new Set(history.map(r => r.model))];

    let lastRunId = brain.activeRunId;
    if (!lastRunId && history.length > 0) lastRunId = history[history.length - 1].runId;

    const stats = {
      total: {
        lastRun: getSum(history, r => r.runId === lastRunId),
        hourly: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneHour),
        daily: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneDay),
        weekly: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneWeek),
        yearly: getSum(history, r => (now - new Date(r.timestamp).getTime()) <= oneYear),
        lifetime: lifetime['total'] || 0
      },
      models: {}
    };

    models.forEach(model => {
      const modelHistory = history.filter(r => r.model === model);
      stats.models[model] = {
        lastRun: getSum(modelHistory, r => r.runId === lastRunId),
        hourly: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneHour),
        daily: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneDay),
        weekly: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneWeek),
        yearly: getSum(modelHistory, r => (now - new Date(r.timestamp).getTime()) <= oneYear),
        lifetime: lifetime[model] || 0
      };
    });

    return stats;
  } catch (err) {
    console.error("Failed to get token stats", err);
    return { total: {}, models: {} };
  }
}

module.exports = {
  recordTokenUsage,
  getTokenStats
};
