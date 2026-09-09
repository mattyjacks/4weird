/**
 * Replay Recording and Export Manager
 */

const fs = require('fs');
const path = require('path');

function getReplayLog(brain) {
  return brain.replayActions;
}

function saveReplay(brain, replaysDir) {
  if (brain.replayActions.length === 0) return null;
  try {
    if (!fs.existsSync(replaysDir)) {
      fs.mkdirSync(replaysDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(replaysDir, `replay_${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(brain.replayActions, null, 2), 'utf8');
    return filename;
  } catch (e) {
    console.error("Failed to save replay script", e);
    return null;
  }
}

module.exports = {
  getReplayLog,
  saveReplay
};
