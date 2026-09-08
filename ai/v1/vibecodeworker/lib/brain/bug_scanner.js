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
// Same recurring error must not be re-filed more often than this, so a
// chatty page (or the agent's own alarm line) can never flood the log.
const BUG_REFIRE_COOLDOWN_MS = 5 * 60 * 1000;
// Benign third-party / browser noise that must never file a CRASH bug.
// Seen on mattyjacks.com: Instagram + BirchCreek iframe + permissions policy.
const BENIGN_PATTERNS = [
  'Electron Security Warning',
  'Content Security Policy',
  'compute-pressure',
  'Permissions policy violation',
  'Blocked a frame with origin',
  "Failed to read a named property 'href' from 'Location'",
  'Protocols, domains, and ports must match',
  'ResizeObserver loop',
  'third-party cookie',
  'Third-party cookie',
  'favicon.ico',
  'net::ERR_BLOCKED_BY_CLIENT',
  'net::ERR_ABORTED',
  'chrome-extension://',
  'Unrecognized feature:',
  'websocket was closed',
  'WebSocket connection'
];

function isBenignNoise(msg) {
  if (!msg) return false;
  return BENIGN_PATTERNS.some(p => msg.includes(p));
}

// The agent's own alarm line - filing it as a bug makes the detector
// detect itself every step (self-alarm loop). Never file it.
const SELF_ALARM_MARKER = 'CRASH / EXCEPTION BUG IDENTIFIED';

function normalizeSignature(msg) {
  return String(msg || '')
    .replace(/^\[\d{1,2}:\d{2}(:\d{2})?\]\s*/, '') // dashboard [HH:MM:SS] prefix
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g, '<ts>') // ISO stamps
    .replace(/\b\d+,\d+\b/g, '<xy>') // coords like 0,37 / -9888,38
    .replace(/\b\d+(\.\d+)?(px|ms|s)?\b/g, '<n>') // bare numbers
    .slice(0, 150);
}

function scanForBugs(brain, screenshotBase64, consoleLogs) {
  const beforeCount = brain.bugs.length;
  const now = Date.now();
  if (!brain._bugSigTimes) brain._bugSigTimes = {};
  const errorLogs = (consoleLogs || []).filter(log => {
    const msg = typeof log === 'string' ? log : (log.message || '');
    if (isBenignNoise(msg)) return false;
    if (msg.includes(SELF_ALARM_MARKER)) return false;

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
    const signature = normalizeSignature(msg);

    // Cooldown per normalized signature: recurring identical errors
    // (timestamps/coords stripped) file once, then stay quiet.
    const lastFiled = brain._bugSigTimes[signature] || 0;
    if (now - lastFiled < BUG_REFIRE_COOLDOWN_MS) return false;
    brain._bugSigTimes[signature] = now;

    const bugEntry = {
      timestamp: new Date().toISOString(),
      type: 'Console Error',
      description: signature,
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
