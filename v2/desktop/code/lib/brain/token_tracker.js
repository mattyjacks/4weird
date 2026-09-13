/**
 * Brain Token Usage Tracking and Analytics
 * Optimized: in-memory cache per dataDir, single-pass stats, bounded history.
 */

const fs = require('fs');
const path = require('path');

const MAX_HISTORY_ENTRIES = 10000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Cache: dataDir -> { data, mtimeMs, size }
const _usageCache = new Map();
let _writesSincePrune = 0;

function _usagePath(dataDir) {
  return path.join(dataDir, 'token_usage.json');
}

function _loadUsageData(dataDir) {
  const usagePath = _usagePath(dataDir);
  let stat = null;
  try {
    stat = fs.existsSync(usagePath) ? fs.statSync(usagePath) : null;
  } catch (e) {
    stat = null;
  }
  const cached = _usageCache.get(dataDir);
  if (cached && stat && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.data;
  }
  let data = { history: [], lifetimeTotals: {} };
  if (stat) {
    try {
      data = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
    } catch (e) {
      console.error('Failed to parse token_usage.json, resetting', e);
      data = { history: [], lifetimeTotals: {} };
    }
  }
  if (!Array.isArray(data.history)) data.history = [];
  if (!data.lifetimeTotals || typeof data.lifetimeTotals !== 'object') data.lifetimeTotals = {};
  // Stamp numeric time once per record to avoid repeated Date parsing.
  for (const r of data.history) {
    if (typeof r._t !== 'number') {
      const t = Date.parse(r.timestamp);
      r._t = Number.isFinite(t) ? t : 0;
    }
  }
  try {
    const fresh = fs.existsSync(usagePath) ? fs.statSync(usagePath) : stat;
    _usageCache.set(dataDir, {
      data,
      mtimeMs: fresh ? fresh.mtimeMs : 0,
      size: fresh ? fresh.size : 0
    });
  } catch (e) {
    _usageCache.set(dataDir, { data, mtimeMs: 0, size: 0 });
  }
  return data;
}

function _saveUsageData(dataDir, data) {
  const usagePath = _usagePath(dataDir);
  try {
    fs.writeFileSync(usagePath, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.error('Failed to record token usage', err);
    return;
  }
  try {
    const stat = fs.statSync(usagePath);
    _usageCache.set(dataDir, { data, mtimeMs: stat.mtimeMs, size: stat.size });
  } catch (e) {
    _usageCache.set(dataDir, { data, mtimeMs: 0, size: 0 });
  }
}

function recordTokenUsage(brain, model, prompt, completion) {
  if (!brain.dataDir) return;
  try {
    const data = _loadUsageData(brain.dataDir);

    const total = prompt + completion;
    data.lifetimeTotals[model] = (data.lifetimeTotals[model] || 0) + total;
    data.lifetimeTotals.total = (data.lifetimeTotals.total || 0) + total;

    const now = Date.now();
    data.history.push({
      timestamp: new Date(now).toISOString(),
      _t: now,
      model,
      prompt,
      completion,
      total,
      runId: brain.activeRunId || 'run_unknown'
    });

    // Bound memory + file size: prune yearly + cap length, but not on every
    // write; amortize to roughly once per 50 writes or when over the cap.
    _writesSincePrune++;
    const overCap = data.history.length > MAX_HISTORY_ENTRIES;
    if (overCap || _writesSincePrune >= 50) {
      _writesSincePrune = 0;
      const cutoff = Date.now() - ONE_YEAR_MS;
      if (overCap) {
        // Keep only the newest MAX entries that are also within the year.
        const fresh = data.history.filter((r) => (r._t || 0) > cutoff);
        data.history = fresh.length > MAX_HISTORY_ENTRIES
          ? fresh.slice(fresh.length - MAX_HISTORY_ENTRIES)
          : fresh;
      } else {
        data.history = data.history.filter((r) => (r._t || 0) > cutoff);
      }
    }

    _saveUsageData(brain.dataDir, data);
  } catch (err) {
    console.error('Failed to record token usage', err);
  }
}

function getTokenStats(brain) {
  if (!brain.dataDir) return { total: {}, models: {} };
  try {
    const data = _loadUsageData(brain.dataDir);
    const history = data.history || [];
    const lifetime = data.lifetimeTotals || {};

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;
    const oneYear = 365 * oneDay;

    let lastRunId = brain.activeRunId;
    if (!lastRunId && history.length > 0) lastRunId = history[history.length - 1].runId;

    // Single pass: accumulate all time buckets + per-model buckets.
    const total = { lastRun: 0, hourly: 0, daily: 0, weekly: 0, yearly: 0, lifetime: lifetime.total || 0 };
    const perModel = new Map();

    for (let i = 0; i < history.length; i++) {
      const r = history[i];
      const t = typeof r._t === 'number' ? r._t : 0;
      const age = now - t;
      const v = r.total || 0;
      const isLastRun = r.runId === lastRunId;

      let m = perModel.get(r.model);
      if (!m) {
        m = { lastRun: 0, hourly: 0, daily: 0, weekly: 0, yearly: 0, lifetime: lifetime[r.model] || 0 };
        perModel.set(r.model, m);
      }

      if (isLastRun) {
        total.lastRun += v;
        m.lastRun += v;
      }
      if (age <= oneHour) {
        total.hourly += v;
        m.hourly += v;
      }
      if (age <= oneDay) {
        total.daily += v;
        m.daily += v;
      }
      if (age <= oneWeek) {
        total.weekly += v;
        m.weekly += v;
      }
      if (age <= oneYear) {
        total.yearly += v;
        m.yearly += v;
      }
    }

    const models = {};
    for (const [name, stats] of perModel) {
      models[name] = stats;
    }

    return { total, models };
  } catch (err) {
    console.error('Failed to get token stats', err);
    return { total: {}, models: {} };
  }
}

// Test hook: clear in-memory usage cache.
function _clearTokenCache() {
  _usageCache.clear();
  _writesSincePrune = 0;
}

module.exports = {
  recordTokenUsage,
  getTokenStats,
  _clearTokenCache
};
