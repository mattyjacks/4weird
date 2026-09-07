/**
 * System Logger and Persistent Console Stream
 */
const fs = require('fs');
const path = require('path');

function logSystemMessage(logStream, consoleLogs, dataDir, message, type = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  entry.innerHTML = `<span style="opacity: 0.5;">[${timestamp}]</span> ${message}`;
  
  if (logStream) {
    logStream.appendChild(entry);
    logStream.scrollTop = logStream.scrollHeight;
  }
  
  consoleLogs.push(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  
  if (dataDir) {
    try {
      fs.writeFileSync(path.join(dataDir, 'live_logs.json'), JSON.stringify(consoleLogs.slice(-200), null, 2));
    } catch (e) {}
  }
}

module.exports = {
  logSystemMessage
};
