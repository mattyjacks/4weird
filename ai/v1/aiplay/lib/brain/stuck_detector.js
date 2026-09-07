/**
 * Stuck State Detector and Escalation Policy
 */

function simpleHash(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  const step = Math.max(1, Math.floor(str.length / 500));
  for (let i = 0; i < str.length; i += step) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function detectStuckState(brain, screenshotBase64) {
  if (brain.episodes.length < 3) return false;

  const recentStatuses = brain.episodes.slice(-3).map(ep => ep.status);
  if (recentStatuses.some(s => s === 'menu' || s === 'game_over' || s === 'paused')) {
    return brain.sameActionStreak >= 4;
  }

  const currentHash = simpleHash(screenshotBase64);
  const recentHashes = brain.episodes.slice(-3).map(ep => ep.screenshotHash);
  const visuallyStuck = recentHashes.every(h => h === currentHash);
  const actionLooping = brain.sameActionStreak >= 4;

  return visuallyStuck || actionLooping;
}

function getStuckRecoveryAction(brain) {
  brain.stuckRecoveryStage = Math.min(brain.stuckRecoveryStage + 1, 3);
  if (brain._sessionMem) brain._sessionMem.recoveries++;

  switch (brain.stuckRecoveryStage) {
    case 1:
      return { type: 'click', target: '500,500', duration_ms: 100 };
    case 2:
      return { type: 'press_key', target: 'Escape', duration_ms: 100 };
    case 3:
    default:
      brain.stuckRecoveryStage = 0;
      return { type: 'refresh', target: '', duration_ms: 100 };
  }
}

module.exports = {
  simpleHash,
  detectStuckState,
  getStuckRecoveryAction
};
