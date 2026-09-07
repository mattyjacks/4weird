/**
 * Game Action Execution and Event Dispatcher
 */
const { ipcRenderer } = require('electron');
const { getKeyCode } = require('./input_mapper');

async function executeAction(controller, webview, action, nativeProcessName = null) {
  if (!action || !action.type) return "No action specified";
  const target = action.target;
  const duration = action.duration_ms || 100;
  console.log(`Executing Action: ${action.type} targeting ${target} (native target: ${nativeProcessName || 'none'})`);

  if (nativeProcessName) {
    if (action.type === 'click') {
      let x = 500, y = 500;
      if (typeof target === 'string' && target.includes(',')) {
        const parts = target.split(',');
        x = parseInt(parts[0]);
        y = parseInt(parts[1]);
      }
      return await ipcRenderer.invoke('run-input-sim', ['click', x.toString(), y.toString(), nativeProcessName]);
    } else if (action.type === 'press_key') {
      return await ipcRenderer.invoke('run-input-sim', ['press', target, nativeProcessName]);
    } else if (action.type === 'hold_key') {
      return await ipcRenderer.invoke('run-input-sim', ['hold', target, (duration || 200).toString(), nativeProcessName]);
    } else if (action.type === 'refresh') {
      return await ipcRenderer.invoke('run-input-sim', ['press', 'F5', nativeProcessName]);
    } else if (action.type === 'wait') {
      const waitMs = duration || 500;
      return new Promise((resolve) => setTimeout(() => resolve(`Waited ${waitMs}ms`), waitMs));
    }
  }

  switch (action.type) {
    case 'click': {
      let x = 0;
      let y = 0;
      
      if (typeof target === 'string' && target.includes(',')) {
        const parts = target.split(',');
        const sizeCode = `({ w: window.innerWidth, h: window.innerHeight })`;
        const size = await controller.executeJS(webview, sizeCode);
        x = Math.round((parseInt(parts[0]) / 1000) * size.w);
        y = Math.round((parseInt(parts[1]) / 1000) * size.h);
      } else {
        const code = `
          (() => {
            const targetStr = ${JSON.stringify(target)};
            let el = document.querySelector(targetStr) || document.getElementById(targetStr);
            if (!el) {
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
        const coords = await controller.executeJS(webview, code);
        if (coords) {
          x = coords.x;
          y = coords.y;
        } else {
          const sizeCode = `({ w: window.innerWidth, h: window.innerHeight })`;
          const size = await controller.executeJS(webview, sizeCode);
          x = size.w / 2;
          y = size.h / 2;
        }
      }
      
      const clickCode = `
        (() => {
          const el = document.elementFromPoint(${x}, ${y});
          if (el) {
            el.focus && el.focus();
            const options = { bubbles: true, cancelable: true, clientX: ${x}, clientY: ${y} };
            el.dispatchEvent(new MouseEvent('mousedown', options));
            el.dispatchEvent(new MouseEvent('click', options));
            el.dispatchEvent(new MouseEvent('mouseup', options));
            return "Clicked " + el.tagName + " at " + ${x} + "," + ${y};
          }
          return "No element at " + ${x} + "," + ${y};
        })()
      `;
      return await controller.executeJS(webview, clickCode);
    }

    case 'press_key': {
      const codeStr = getKeyCode(target);
      const script = `
        (() => {
          const eDown = new KeyboardEvent('keydown', { key: '${target}', code: '${codeStr}', bubbles: true });
          const ePress = new KeyboardEvent('keypress', { key: '${target}', code: '${codeStr}', bubbles: true });
          const eUp = new KeyboardEvent('keyup', { key: '${target}', code: '${codeStr}', bubbles: true });
          window.dispatchEvent(eDown);
          document.dispatchEvent(eDown);
          window.dispatchEvent(ePress);
          document.dispatchEvent(ePress);
          setTimeout(() => {
            window.dispatchEvent(eUp);
            document.dispatchEvent(eUp);
          }, 50);
          return 'Pressed ' + '${target}';
        })()
      `;
      return await controller.executeJS(webview, script);
    }

    case 'hold_key': {
      const codeStr = getKeyCode(target);
      const script = `
        (() => {
          const eDown = new KeyboardEvent('keydown', { key: '${target}', code: '${codeStr}', bubbles: true });
          window.dispatchEvent(eDown);
          document.dispatchEvent(eDown);
          setTimeout(() => {
            const eUp = new KeyboardEvent('keyup', { key: '${target}', code: '${codeStr}', bubbles: true });
            window.dispatchEvent(eUp);
            document.dispatchEvent(eUp);
          }, ${duration});
          return 'Held ' + '${target}' + ' for ' + ${duration} + 'ms';
        })()
      `;
      return await controller.executeJS(webview, script);
    }

    case 'wait':
      await new Promise(r => setTimeout(r, duration));
      return `Waited ${duration}ms`;

    case 'refresh':
      if (webview && webview.reload) {
        webview.reload();
      }
      return "Reloaded page";

    default:
      return `Unknown action type: ${action.type}`;
  }
}

module.exports = {
  executeAction
};
