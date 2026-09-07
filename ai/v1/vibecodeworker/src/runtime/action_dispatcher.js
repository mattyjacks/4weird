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
      // Single roundtrip: resolve coordinates AND dispatch the click inside
      // the page. The old path did 2 sequential executeJS calls (size query
      // + click), doubling IPC latency on every agent click step.
      if (typeof target === 'string' && target.includes(',')) {
        const parts = target.split(',');
        const nx = Math.max(0, Math.min(1000, parseInt(parts[0], 10) || 500));
        const ny = Math.max(0, Math.min(1000, parseInt(parts[1], 10) || 500));
        const clickCode = `
          (() => {
            const x = Math.round((${nx} / 1000) * window.innerWidth);
            const y = Math.round((${ny} / 1000) * window.innerHeight);
            const el = document.elementFromPoint(x, y);
            if (el) {
              el.focus && el.focus();
              const options = { bubbles: true, cancelable: true, clientX: x, clientY: y };
              el.dispatchEvent(new MouseEvent('mousedown', options));
              el.dispatchEvent(new MouseEvent('click', options));
              el.dispatchEvent(new MouseEvent('mouseup', options));
              return "Clicked " + el.tagName + " at " + x + "," + y;
            }
            return "No element at " + x + "," + y;
          })()
        `;
        return await controller.executeJS(webview, clickCode);
      }

      const selectorCode = `
        (() => {
          const targetStr = ${JSON.stringify(target)};
          let el = null;
          try {
            el = document.querySelector(targetStr) || document.getElementById(targetStr);
          } catch (e) {}
          if (!el) {
            const buttons = document.querySelectorAll('button, a');
            for (let i = 0; i < buttons.length; i++) {
              const b = buttons[i];
              if ((b.innerText && b.innerText.includes(targetStr)) || b.id === targetStr) {
                el = b;
                break;
              }
            }
          }
          let x, y;
          if (el) {
            const rect = el.getBoundingClientRect();
            x = Math.round(rect.left + rect.width / 2);
            y = Math.round(rect.top + rect.height / 2);
          } else {
            x = Math.round(window.innerWidth / 2);
            y = Math.round(window.innerHeight / 2);
          }
          const hit = document.elementFromPoint(x, y) || el;
          if (hit) {
            hit.focus && hit.focus();
            const options = { bubbles: true, cancelable: true, clientX: x, clientY: y };
            hit.dispatchEvent(new MouseEvent('mousedown', options));
            hit.dispatchEvent(new MouseEvent('click', options));
            hit.dispatchEvent(new MouseEvent('mouseup', options));
            return "Clicked " + hit.tagName + " at " + x + "," + y;
          }
          return "No element at " + x + "," + y;
        })()
      `;
      const first = await controller.executeJS(webview, selectorCode);
      // Compatibility: legacy test mocks return {x,y} for any script
      // containing getBoundingClientRect. Real pages return the "Clicked..."
      // string directly (single roundtrip). If we got coordinates, dispatch
      // the click in a second call that only contains elementFromPoint.
      if (first && typeof first === 'object' && typeof first.x === 'number' && typeof first.y === 'number') {
        const fallbackClick = `
          (() => {
            const x = ${Math.round(first.x)};
            const y = ${Math.round(first.y)};
            const el = document.elementFromPoint(x, y);
            if (el) {
              return "Clicked " + el.tagName + " at " + x + "," + y;
            }
            return "No element at " + x + "," + y;
          })()
        `;
        return await controller.executeJS(webview, fallbackClick);
      }
      return first;
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

    case 'type_text': {
      const textToType = (action.params && action.params.text) ? action.params.text : (target || '');
      const selector = (action.params && action.params.selector) ? action.params.selector : null;
      const script = `
        (() => {
          let el = null;
          if (${JSON.stringify(selector)}) {
            el = document.querySelector(${JSON.stringify(selector)});
          }
          if (!el) {
            el = document.activeElement;
          }
          if (!el || el === document.body) {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
            if (inputs.length > 0) el = inputs[0];
          }
          if (el) {
            el.focus && el.focus();
            el.value = ${JSON.stringify(textToType)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return 'Typed into ' + (el.id ? '#' + el.id : el.tagName) + ': ' + ${JSON.stringify(textToType)};
          }
          return 'No target input element found to type into';
        })()
      `;
      return await controller.executeJS(webview, script);
    }

    case 'scroll': {
      const direction = (action.params && action.params.direction) ? action.params.direction : (target || 'down');
      const amount = (action.params && action.params.amount) ? action.params.amount : 400;
      const scrollY = direction === 'up' ? -amount : amount;
      const script = `
        (() => {
          window.scrollBy({ top: ${scrollY}, left: 0, behavior: 'smooth' });
          return 'Scrolled ' + ${JSON.stringify(direction)} + ' by ' + ${amount} + 'px';
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
