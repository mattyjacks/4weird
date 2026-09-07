/**
 * AIPlay Replay Engine
 * Records, persists, and replays action sequences for automated bug reproduction.
 */

const fs = require('fs');
const path = require('path');

class ReplayEngine {
  constructor(apiClient) {
    this.client = apiClient;
    this.isRecording = false;
    this.recordedActions = [];
    this.replaysDir = path.join(__dirname, '..', 'data', 'replays');
    if (!fs.existsSync(this.replaysDir)) {
      fs.mkdirSync(this.replaysDir, { recursive: true });
    }
  }

  startRecording(gameId) {
    this.isRecording = true;
    this.recordedActions = [];
    this.currentGameId = gameId;
    this.recordingStartTime = Date.now();
    console.log(`[ReplayEngine] Started recording for game: ${gameId}`);
  }

  recordAction(action) {
    if (!this.isRecording) return;
    this.recordedActions.push({
      offsetMs: Date.now() - this.recordingStartTime,
      action
    });
  }

  stopRecording(sessionName) {
    if (!this.isRecording) return null;
    this.isRecording = false;
    const session = {
      id: `replay_${Date.now()}`,
      name: sessionName || `Replay ${this.currentGameId} ${new Date().toISOString()}`,
      gameId: this.currentGameId,
      durationMs: Date.now() - this.recordingStartTime,
      actionCount: this.recordedActions.length,
      actions: this.recordedActions
    };

    const filePath = path.join(this.replaysDir, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    console.log(`[ReplayEngine] Saved replay session (${session.actionCount} actions) to ${filePath}`);
    return session;
  }

  async playReplay(sessionId) {
    let filePath = sessionId;
    if (!filePath.endsWith('.json')) {
      filePath = path.join(this.replaysDir, `${sessionId}.json`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Replay session file not found: ${filePath}`);
    }

    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`[ReplayEngine] Replaying ${session.actions.length} actions for game: ${session.gameId}`);

    if (this.client) {
      await this.client.launchGame(session.gameId);
    }

    let lastOffset = 0;
    for (const step of session.actions) {
      const waitTime = Math.max(0, step.offsetMs - lastOffset);
      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, Math.min(waitTime, 5000)));
      }
      lastOffset = step.offsetMs;

      if (this.client && step.action) {
        if (step.action.type === 'click') {
          await this.client.click(step.action.x, step.action.y);
        } else if (step.action.type === 'keydown') {
          await this.client.pressKey(step.action.key);
        }
      }
    }
    console.log(`[ReplayEngine] Replay complete for session: ${session.id}`);
    return { success: true, session };
  }

  listReplays() {
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

module.exports = { ReplayEngine };
