const { ipcRenderer } = require('electron');
const { executeAction } = require('../src/runtime/action_dispatcher');
const { getInteractiveDOM, getPerformanceMetrics } = require('../src/runtime/dom_inspector');
const { getKeyCode } = require('../src/runtime/input_mapper');

class GameController {
  // Helper to execute Javascript in webview or separate game window
  async executeJS(webview, code) {
    const isActive = await ipcRenderer.invoke('is-game-window-active');
    if (isActive) {
      return await ipcRenderer.invoke('eval-in-game-window', code);
    } else if (webview) {
      return await webview.executeJavaScript(code);
    }
    throw new Error("No active game viewport available");
  }

  // Capture Webview/GameWindow screenshot as base64 JPEG (Token optimized)
  async captureScreenshot(webview) {
    const isActive = await ipcRenderer.invoke('is-game-window-active');
    if (isActive) {
      return await ipcRenderer.invoke('capture-game-screenshot');
    }

    if (!webview) throw new Error("No active game viewport available");

    return new Promise((resolve, reject) => {
      webview.capturePage().then(img => {
        const resized = img.resize({ width: 512 });
        const jpegBuffer = resized.toJPEG(50);
        resolve(jpegBuffer.toString('base64'));
      }).catch(err => {
        reject(err);
      });
    });
  }

  // Retrieve interactive elements from the webview DOM
  async getInteractiveDOM(webview) {
    return await getInteractiveDOM(this, webview);
  }

  // Retrieve JS Heap size and track game execution performance
  async getPerformanceMetrics(webview) {
    return await getPerformanceMetrics(this, webview);
  }

  // Execute specified input action (click, keypress, hold)
  async executeAction(webview, action, nativeProcessName = null) {
    return await executeAction(this, webview, action, nativeProcessName);
  }

  // Show/hide the robot-emoji bot cursor wherever the game is displayed
  // (separate test window when open, else the embedded webview).
  async setBotControl(webview, on) {
    try {
      const active = await ipcRenderer.invoke('is-game-window-active');
      if (active) {
        return await ipcRenderer.invoke('set-bot-control', on !== false);
      }
    } catch (_) { /* fall through to webview path */ }
    if (!webview) return 'no viewport';
    const botCursor = require('../src/runtime/bot_cursor');
    return await this.executeJS(webview, botCursor.setBotControlJS(on !== false));
  }

  // Convert key strings to standard KeyboardEvent codes
  getKeyCode(key) {
    return getKeyCode(key);
  }
}

module.exports = GameController;
