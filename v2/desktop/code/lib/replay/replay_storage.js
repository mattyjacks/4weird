const fs = require('fs');
const path = require('path');

class ReplayStorage {
  constructor(replaysDir) {
    this.replaysDir = replaysDir;
    if (!fs.existsSync(this.replaysDir)) {
      fs.mkdirSync(this.replaysDir, { recursive: true });
    }
  }

  // Security: session ids are request-influenced. They are treated as bare
  // file names inside replaysDir only; path separators, traversal, and
  // absolute paths are rejected, and the resolved path is re-confined.
  sanitizeSessionId(sessionId) {
    const id = String(sessionId == null ? '' : sessionId);
    if (!id || id.length > 128) return null;
    if (id.includes('/') || id.includes('\\') || id.includes('..') || path.isAbsolute(id)) return null;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) return null;
    const resolved = path.resolve(this.replaysDir, `${id}.json`);
    const rel = path.relative(path.resolve(this.replaysDir), resolved);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return resolved;
  }

  saveSession(session) {
    const filePath = this.sanitizeSessionId(session && session.id) || path.join(this.replaysDir, `replay_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    return filePath;
  }

  loadSession(sessionId) {
    const filePath = this.sanitizeSessionId(sessionId);
    if (!filePath) {
      throw new Error('Replay session file not found: invalid session id');
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
