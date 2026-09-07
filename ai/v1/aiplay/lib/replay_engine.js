/**
 * AIPlay Replay Engine
 * Records, persists, and replays action sequences for automated bug reproduction.
 */

const path = require('path');
const { ReplayStorage } = require('./replay/replay_storage');
const { playActionSequence } = require('./replay/replay_player');

class ReplayEngine {
  constructor(apiClient) {
    this.client = apiClient;
    this.isRecording = false;
    this.recordedActions = [];
    this.replaysDir = path.join(__dirname, '..', 'data', 'replays');
    this.storage = new ReplayStorage(this.replaysDir);
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

    const filePath = this.storage.saveSession(session);
    console.log(`[ReplayEngine] Saved replay session (${session.actionCount} actions) to ${filePath}`);
    return session;
  }

  async playReplay(sessionId) {
    const session = this.storage.loadSession(sessionId);
    console.log(`[ReplayEngine] Replaying ${session.actions.length} actions for game: ${session.gameId}`);

    const result = await playActionSequence(this.client, session);
    console.log(`[ReplayEngine] Replay complete for session: ${session.id}`);
    return result;
  }

  listReplays() {
    return this.storage.listSessions();
  }
}

module.exports = { ReplayEngine };
