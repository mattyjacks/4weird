const { ipcRenderer } = require('electron');

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
        // Resize image to 512px width (preserving aspect ratio) and use 50% JPEG compression
        // This drops base64 footprint by ~85% and significantly limits visual token cost
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
    const code = `
      (() => {
        const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS'];
        const elements = [];
        
        // Crawl elements in viewport
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const isVisible = rect.width > 0 && rect.height > 0 && 
                            style.display !== 'none' && 
                            style.visibility !== 'hidden' && 
                            style.opacity !== '0';
          
          if (!isVisible) continue;
          
          const isClickable = interactiveTags.includes(el.tagName) || 
                              el.onclick != null || 
                              el.getAttribute('role') === 'button' ||
                              window.getComputedStyle(el).cursor === 'pointer';
                              
          if (isClickable) {
            elements.push({
              tagName: el.tagName,
              id: el.id || '',
              className: el.className || '',
              innerText: (el.innerText || '').slice(0, 50).trim(),
              placeholder: el.placeholder || '',
              rect: {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
          }
        }
        return elements.slice(0, 40); // Cap list
      })()
    `;
    
    try {
      return await this.executeJS(webview, code);
    } catch (e) {
      console.error("Failed to query interactive DOM elements:", e);
      return [];
    }
  }

  // Retrieve JS Heap size and track game execution performance
  async getPerformanceMetrics(webview) {
    const code = `
      (() => {
        return {
          heapLimit: window.performance && window.performance.memory ? window.performance.memory.jsHeapSizeLimit : 0,
          heapUsed: window.performance && window.performance.memory ? window.performance.memory.usedJSHeapSize : 0,
          heapTotal: window.performance && window.performance.memory ? window.performance.memory.totalJSHeapSize : 0
        };
      })()
    `;
    try {
      return await this.executeJS(webview, code);
    } catch (e) {
      console.warn("Performance memory metrics not available");
      return { heapLimit: 0, heapUsed: 0, heapTotal: 0 };
    }
  }

  // Execute specified input action (click, keypress, hold)
  async executeAction(webview, action, nativeProcessName = null) {
    const { type, target, duration_ms } = action;
    console.log(`Executing Action: ${type} targeting ${target} (native target: ${nativeProcessName || 'none'})`);

    if (nativeProcessName) {
      if (type === 'click') {
        let x = 500, y = 500;
        if (typeof target === 'string' && target.includes(',')) {
          const parts = target.split(',');
          x = parseInt(parts[0]);
          y = parseInt(parts[1]);
        }
        return await ipcRenderer.invoke('run-input-sim', ['click', x.toString(), y.toString(), nativeProcessName]);
      } else if (type === 'press_key') {
        return await ipcRenderer.invoke('run-input-sim', ['press', target, nativeProcessName]);
      } else if (type === 'hold_key') {
        return await ipcRenderer.invoke('run-input-sim', ['hold', target, (duration_ms || 200).toString(), nativeProcessName]);
      } else if (type === 'refresh') {
        return await ipcRenderer.invoke('run-input-sim', ['press', 'F5', nativeProcessName]);
      } else if (type === 'wait') {
        const waitMs = duration_ms || 500;
        return new Promise((resolve) => setTimeout(() => resolve(`Waited ${waitMs}ms`), waitMs));
      }
    }

    if (type === 'click') {
      let x = 0;
      let y = 0;
      
      if (typeof target === 'string' && target.includes(',')) {
        const parts = target.split(',');
        // Scale from 0-1000 to actual viewport size
        const sizeCode = `({ w: window.innerWidth, h: window.innerHeight })`;
        const size = await this.executeJS(webview, sizeCode);
        x = Math.round((parseInt(parts[0]) / 1000) * size.w);
        y = Math.round((parseInt(parts[1]) / 1000) * size.h);
      } else {
        // If coordinate target wasn't given directly, try finding it via selector or click center of screen
        const code = `
          (() => {
            const targetStr = ${JSON.stringify(target)};
            let el = document.querySelector(targetStr) || document.getElementById(targetStr);
            if (!el) {
              // try matching text content
              const buttons = Array.from(document.querySelectorAll('button, a'));
              el = buttons.find(b => b.innerText.includes(targetStr) || b.id === targetStr);
            }
            if (el) {
              const rect = el.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
            return null;
          })()
        `;
        const coords = await this.executeJS(webview, code);
        if (coords) {
          x = coords.x;
          y = coords.y;
        } else {
          // Default: click in center of viewport
          const sizeCode = `({ w: window.innerWidth, h: window.innerHeight })`;
          const size = await this.executeJS(webview, sizeCode);
          x = size.w / 2;
          y = size.h / 2;
        }
      }
      
      // Inject native-like click events via script
      const clickCode = `
        (() => {
          const el = document.elementFromPoint(${x}, ${y});
          if (el) {
            // Focus first
            el.focus && el.focus();
            
            // Dispatch mouse down, click, and mouse up
            const options = { bubbles: true, cancelable: true, clientX: ${x}, clientY: ${y} };
            el.dispatchEvent(new MouseEvent('mousedown', options));
            el.dispatchEvent(new MouseEvent('click', options));
            el.dispatchEvent(new MouseEvent('mouseup', options));
            return "Clicked " + el.tagName + " at " + ${x} + "," + ${y};
          }
          return "No element at " + ${x} + "," + ${y};
        })()
      `;
      return await this.executeJS(webview, clickCode);

    } else if (type === 'press_key') {
      const key = target;
      const keyCode = this.getKeyCode(key);
      const code = `
        (() => {
          const keyOptions = { key: ${JSON.stringify(key)}, code: ${JSON.stringify(keyCode)}, bubbles: true };
          window.dispatchEvent(new KeyboardEvent('keydown', keyOptions));
          window.dispatchEvent(new KeyboardEvent('keypress', keyOptions));
          setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keyup', keyOptions));
          }, 50);
          return "Pressed " + ${JSON.stringify(key)};
        })()
      `;
      return await this.executeJS(webview, code);

    } else if (type === 'hold_key') {
      const key = target;
      const duration = duration_ms || 200;
      const keyCode = this.getKeyCode(key);
      const code = `
        (() => {
          const keyOptions = { key: ${JSON.stringify(key)}, code: ${JSON.stringify(keyCode)}, bubbles: true };
          window.dispatchEvent(new KeyboardEvent('keydown', keyOptions));
          setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keyup', keyOptions));
          }, ${duration});
          return "Held " + ${JSON.stringify(key)} + " for " + ${duration} + "ms";
        })()
      `;
      return await this.executeJS(webview, code);

    } else if (type === 'refresh') {
      const isActive = await ipcRenderer.invoke('is-game-window-active');
      if (isActive) {
        await ipcRenderer.invoke('reload-game-window');
      } else if (webview) {
        webview.reload();
      }
      return "Reloaded page";
    } else if (type === 'wait') {
      const waitMs = duration_ms || 500;
      return new Promise((resolve) => setTimeout(() => resolve(`Waited ${waitMs}ms`), waitMs));
    }
  }

  // Convert key strings to standard KeyboardEvent codes
  getKeyCode(key) {
    const map = {
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'Space': 'Space',
      ' ': 'Space',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Shift': 'ShiftLeft',
      'Control': 'ControlLeft',
      'Alt': 'AltLeft',
      'Meta': 'MetaLeft',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'Insert': 'Insert',
      'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
      'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
      'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
      'w': 'KeyW',
      'a': 'KeyA',
      's': 'KeyS',
      'd': 'KeyD',
      'Escape': 'Escape'
    };
    if (map[key]) return map[key];
    if (key.length === 1) return 'Key' + key.toUpperCase();
    return key;
  }
}

module.exports = GameController;
