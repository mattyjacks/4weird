const fs = require('fs');
const path = require('path');

class ReplayStorage {
  constructor(replaysDir) {
    this.replaysDir = replaysDir;
    if (!fs.existsSync(this.replaysDir)) {
      fs.mkdirSync(this.replaysDir, { recursive: true });
    }
  }

  saveSession(session) {
    const filePath = path.join(this.replaysDir, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    return filePath;
  }

  loadSession(sessionId) {
    let filePath = sessionId;
    if (!filePath.endsWith('.json')) {
      filePath = path.join(this.replaysDir, `${sessionId}.json`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Replay session file not found: ${filePath}`);
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  listSessions() {
    const files = fs.readdirSync(this.replaysDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(this.replaysDir, f), 'utf8'));
      } catch (e) {
        return { file: f, error: e.message };
      }
    });
  }
}

module.exports = {
  ReplayStorage
};
