/**
 * Bug Detection and Logging Scanner
 */

const fs = require('fs');

function loadBugs(brain, bugsPath) {
  try {
    if (fs.existsSync(bugsPath)) {
      brain.bugs = JSON.parse(fs.readFileSync(bugsPath, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to load bugs_log.json", e);
  }
}

function saveBugs(brain, bugsPath) {
  try {
    fs.writeFileSync(bugsPath, JSON.stringify(brain.bugs, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to save bugs_log.json", e);
  }
}

const MAX_BUGS = 100;

function scanForBugs(brain, screenshotBase64, consoleLogs) {
  const beforeCount = brain.bugs.length;
  const errorLogs = (consoleLogs || []).filter(log => {
    const msg = typeof log === 'string' ? log : (log.message || '');
    if (msg.includes('Electron Security Warning') || msg.includes('Content Security Policy')) return false;

    if (typeof log === 'string') {
      const lower = log.toLowerCase();
      return lower.includes('error') || lower.includes('exception') || lower.includes('failed to load');
    }
    return log.level === 3 || (log.message && (
      log.message.includes('Error') ||
      log.message.includes('exception') ||
      log.message.includes('TypeError') ||
      log.message.includes('ReferenceError')
    ));
  });

  if (errorLogs.length > 0) {
    const lastErr = errorLogs[errorLogs.length - 1];
    const msg = typeof lastErr === 'string' ? lastErr : lastErr.message;

    const bugEntry = {
      timestamp: new Date().toISOString(),
      type: 'Console Error',
      description: msg.slice(0, 150),
      severity: 'high',
      consoleLogs: errorLogs.slice(-5).map(l => typeof l === 'string' ? l.slice(0, 300) : (l.message || '').slice(0, 300)),
      screenshot: screenshotBase64 ? `data:image/jpeg;base64,${screenshotBase64}` : '',
      screenshotBytes: typeof screenshotBase64 === 'string' ? screenshotBase64.length : 0,
      actionTakenBeforeBug: brain.replayActions.slice(-3)
    };

    const isDuplicate = brain.bugs.some(b => b.description === bugEntry.description);
    if (!isDuplicate) {
      brain.bugs.push(bugEntry);
      // Bound memory: drop oldest bugs (and their base64 screenshots) first.
      while (brain.bugs.length > MAX_BUGS) {
        brain.bugs.shift();
      }
      if (brain.sessionStats) brain.sessionStats.bugsFound++;
    }
  }
  return brain.bugs.length > beforeCount;
}

module.exports = {
  loadBugs,
  saveBugs,
  scanForBugs
};
