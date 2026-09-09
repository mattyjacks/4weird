const fs = require('fs');
const path = require('path');

class ApiBugStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.bugsLogPath = path.join(this.dataDir, 'bugs_log.json');
    this.bugs = [];
    this.loadBugs();
  }

  loadBugs() {
    try {
      if (fs.existsSync(this.bugsLogPath)) {
        this.bugs = JSON.parse(fs.readFileSync(this.bugsLogPath, 'utf8'));
      }
    } catch (err) {
      console.error('[ApiBugStore] Failed to load bugs log:', err.message);
    }
    return this.bugs;
  }

  saveBugs() {
    try {
      fs.writeFileSync(this.bugsLogPath, JSON.stringify(this.bugs, null, 2), 'utf8');
    } catch (err) {
      console.error('[ApiBugStore] Failed to save bugs log:', err.message);
    }
  }

  addBug(body, activeGame) {
    const bug = {
      id: `BUG-${Date.now()}`,
      gameId: body.gameId || activeGame || 'unknown',
      title: body.title || 'Uncategorized Issue',
      description: body.description || '',
      severity: body.severity || 'medium',
      status: body.status || 'open',
      timestamp: new Date().toISOString(),
      ...body
    };
    this.bugs.unshift(bug);
    this.saveBugs();
    return bug;
  }

  getBugs() {
    return this.bugs;
  }
}

module.exports = {
  ApiBugStore
};
