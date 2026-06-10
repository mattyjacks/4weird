/**
 * AutoCode Debug Module
 * Internal debug API for development and troubleshooting
 */

class AutoCodeDebugAPI {
  constructor(autoCodeSystem) {
    this.system = autoCodeSystem;
    this.lastPayload = null;
    this.lastResponse = null;
    this.requestHistory = [];
    this.maxHistorySize = 100;
  }

  getQueuedScreenshots() {
    return this.system.screenshotQueue?.getAll() || [];
  }

  triggerManualCapture() {
    return this.system.triggerScreenshotCapture?.();
  }

  getLastPayload() {
    return this.lastPayload;
  }

  getLastResponse() {
    return this.lastResponse;
  }

  getRequestHistory() {
    return [...this.requestHistory];
  }

  recordPayload(payload) {
    this.lastPayload = payload;
    this.requestHistory.push({
      timestamp: Date.now(),
      type: 'payload',
      data: payload
    });

    this.trimHistory();
  }

  recordResponse(response) {
    this.lastResponse = response;
    this.requestHistory.push({
      timestamp: Date.now(),
      type: 'response',
      data: response
    });

    this.trimHistory();
  }

  trimHistory() {
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  getSystemStatus() {
    return {
      config: this.system.config?.toJSON(),
      screenshotQueue: {
        enabled: this.system.screenshotQueue?.enabled || false,
        size: this.system.screenshotQueue?.size || 0,
        maxSize: this.system.screenshotQueue?.maxSize || 0
      },
      historySize: this.requestHistory.length,
      isProcessing: this.system.isProcessing || false,
      loadedFiles: this.system.project?.getFileCount?.() || 0
    };
  }

  clearHistory() {
    this.requestHistory = [];
    this.lastPayload = null;
    this.lastResponse = null;
  }

  exportDebugData() {
    return {
      timestamp: Date.now(),
      status: this.getSystemStatus(),
      lastPayload: this.lastPayload,
      lastResponse: this.lastResponse,
      history: this.requestHistory
    };
  }
}

module.exports = { AutoCodeDebugAPI };
