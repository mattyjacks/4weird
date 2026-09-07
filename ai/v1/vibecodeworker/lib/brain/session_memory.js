/**
 * Brain Episodic and Session Memory Persistence
 */

const fs = require('fs');
const path = require('path');

function loadSessionMemory(brain) {
  if (!brain.dataDir) return;
  try {
    const p = path.join(brain.dataDir, 'session_memory.json');
    if (fs.existsSync(p)) {
      brain._sessionMem = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load session_memory.json', e);
  }
}

// Throttle disk writes: the agent loop calls updateSessionMemory every step
// (~every 2s). Writing synchronously each time blocks the loop on I/O.
// We persist at most once per SAVE_THROTTLE_MS or every SAVE_EVERY_STEPS.
const SAVE_THROTTLE_MS = 2000;
const SAVE_EVERY_STEPS = 10;

function saveSessionMemory(brain, force = false) {
  if (!brain.dataDir) return;
  if (!brain._sessionMem) return;
  const now = Date.now();
  const steps = brain._sessionMem.totalSteps || 0;

  if (!force) {
    const lastSave = brain._sessionMemLastSave || 0;
    const stepsSinceSave = steps - (brain._sessionMemLastSavedStep || 0);
    const throttledByTime = now - lastSave < SAVE_THROTTLE_MS;
    const throttledBySteps = stepsSinceSave < SAVE_EVERY_STEPS && stepsSinceSave > 0;
    // Save when EITHER throttle window expired OR step batch filled.
    // Skip only while both windows are still closed.
    if (throttledByTime && throttledBySteps) {
      brain._sessionMemDirty = true;
      return;
    }
  }

  try {
    const p = path.join(brain.dataDir, 'session_memory.json');
    fs.writeFileSync(p, JSON.stringify(brain._sessionMem), 'utf8');
    brain._sessionMemLastSave = now;
    brain._sessionMemLastSavedStep = steps;
    brain._sessionMemDirty = false;
  } catch (e) {
    console.error('Failed to save session_memory.json', e);
  }
}

function flushSessionMemory(brain) {
  if (brain && brain._sessionMemDirty) {
    saveSessionMemory(brain, true);
  }
}

function initSessionMemory(brain) {
  brain._sessionMem = {
    runId: brain.activeRunId,
    startTime: new Date().toISOString(),
    totalSteps: 0,
    bugsFound: 0,
    stuckEvents: 0,
    recoveries: 0,
    actionTypeCounts: { click: 0, press_key: 0, hold_key: 0, wait: 0, refresh: 0 },
    clickHeatmapZones: {},
    topActions: []
  };
  brain._sessionMemLastSave = 0;
  brain._sessionMemLastSavedStep = 0;
  brain._sessionMemDirty = false;
}

function updateSessionMemory(brain, action, wasStuck) {
  if (!brain._sessionMem) return;
  brain._sessionMem.totalSteps++;
  if (wasStuck) brain._sessionMem.stuckEvents++;

  const type = action.type || 'wait';
  if (brain._sessionMem.actionTypeCounts[type] !== undefined) {
    brain._sessionMem.actionTypeCounts[type]++;
  }

  if (type === 'click' && typeof action.target === 'string' && action.target.includes(',')) {
    const parts = action.target.split(',');
    const gx = Math.floor(parseInt(parts[0]) / 100);
    const gy = Math.floor(parseInt(parts[1]) / 100);
    const key = gx + '_' + gy;
    brain._sessionMem.clickHeatmapZones[key] = (brain._sessionMem.clickHeatmapZones[key] || 0) + 1;
  }

  saveSessionMemory(brain);
}

function getSessionSummary(brain) {
  if (!brain._sessionMem) return;
  const mem = brain._sessionMem;
  const total = mem.totalSteps;
  if (total === 0) return '';

  const actionBreakdown = Object.entries(mem.actionTypeCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => k + ': ' + v + ' (' + Math.round((v / total) * 100) + '%)')
    .join(', ');

  const topZones = Object.entries(mem.clickHeatmapZones)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => {
      const [gx, gy] = k.split('_');
      return 'zone (' + (gx * 100) + '-' + (gx * 100 + 99) + ', ' + (gy * 100) + '-' + (gy * 100 + 99) + '): ' + v + 'p';
    })
    .join('; ');

  return 'Session so far: ' + total + ' steps | ' + actionBreakdown + (topZones ? ' | Most-clicked: ' + topZones : '');
}

module.exports = {
  loadSessionMemory,
  saveSessionMemory,
  flushSessionMemory,
  initSessionMemory,
  updateSessionMemory,
  getSessionSummary
};
