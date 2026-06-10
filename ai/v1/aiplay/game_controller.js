class GameController {
  // Capture Webview screenshot as base64 JPEG (Token optimized)
  async captureScreenshot(webview) {
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
          const isVisible = rect.width > 0 && rect.height > 0 && 
                            rect.top >= 0 && rect.left >= 0 &&
                            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                            rect.right <= (window.innerWidth || document.documentElement.clientWidth);
          
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
      return await webview.executeJavaScript(code);
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
      return await webview.executeJavaScript(code);
    } catch (e) {
      console.warn("Performance memory metrics not available");
      return { heapLimit: 0, heapUsed: 0, heapTotal: 0 };
    }
  }

  // Execute specified input action (click, keypress, hold)
  async executeAction(webview, action) {
    const { type, target, duration_ms } = action;
    console.log(`Executing Action: ${type} targeting ${target}`);

    if (type === 'click') {
      let x = 0;
      let y = 0;
      
      if (typeof target === 'string' && target.includes(',')) {
        const parts = target.split(',');
        x = parseInt(parts[0]);
        y = parseInt(parts[1]);
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
        const coords = await webview.executeJavaScript(code);
        if (coords) {
          x = coords.x;
          y = coords.y;
        } else {
          // Default: click in center of viewport
          const sizeCode = `({ w: window.innerWidth, h: window.innerHeight })`;
          const size = await webview.executeJavaScript(sizeCode);
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
      return await webview.executeJavaScript(clickCode);

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
      return await webview.executeJavaScript(code);

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
      return await webview.executeJavaScript(code);

    } else if (type === 'refresh') {
      webview.reload();
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
