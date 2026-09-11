/**
 * AutoCode Screenshots Module
 * Screenshot queue management and action capture
 */

class ScreenshotQueue {
  constructor(maxSize = 2) {
    this.maxSize = maxSize;
    this.queue = [];
    this.enabled = false;
  }

  push(screenshot, metadata = {}) {
    if (!this.enabled) return null;

    const entry = {
      screenshot,
      timestamp: Date.now(),
      ...metadata
    };

    this.queue.push(entry);

    // Maintain rolling window
    while (this.queue.length > this.maxSize) {
      this.queue.shift();
    }

    return entry;
  }

  getAll() {
    return [...this.queue];
  }

  getLatest() {
    return this.queue.length > 0 ? this.queue[this.queue.length - 1] : null;
  }

  clear() {
    this.queue = [];
  }

  enable(maxSize = null) {
    this.enabled = true;
    if (maxSize) this.maxSize = maxSize;
  }

  disable() {
    this.enabled = false;
    this.clear();
  }

  setMaxSize(size) {
    this.maxSize = size;
    // Trim if necessary
    while (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
  }

  get size() {
    return this.queue.length;
  }

  isFull() {
    return this.queue.length >= this.maxSize;
  }
}

module.exports = { ScreenshotQueue };
