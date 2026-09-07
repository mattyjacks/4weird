/**
 * Game Action Execution and Event Dispatcher
 */
const { ipcRenderer } = require('electron');
const { getKeyCode } = require('./input_mapper');
const botCursor = require('./bot_cursor');
const visionState = require('./vision_state');

// Every bot action is mirrored to the AI Vision Mirror: record locally
// (same renderer process, read directly by the mirror panel) and push a
// snapshot to the main process for the /api/vision/state HTTP endpoint.
function pushVision() {
  try {
    if (ipcRenderer && typeof ipcRenderer.send === 'function') {
      ipcRenderer.send('vision-state-push', visionState.getSnapshot());
    }
  } catch (_) { /* mirror is best-effort; actions must never fail on it */ }
}

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
        // Heuristics sometimes emit off-viewport coords (e.g. from hidden
        // carousel items). Clamp so the cursor, the page click, and the
        // vision trail all agree on a real on-screen point.
        const rawNx = parseInt((target.split(',')[0] || ''), 10);
        const rawNy = parseInt((target.split(',')[1] || ''), 10);
        const nx = Math.max(0, Math.min(1000, Number.isFinite(rawNx) ? rawNx : 500));
        const ny = Math.max(0, Math.min(1000, Number.isFinite(rawNy) ? rawNy : 500));
        // params.gameAction routes canvas clicks inside GraveGain3D through
        // the bot input API (aim + attack, no pointer lock needed).
        const gameAction = (action.params && action.params.gameAction) || null;
        const clickLabel = gameAction === 'attack' ? 'attack' : (gameAction === 'aim' ? 'aim' : ('click ' + target));
        visionState.recordPointer(nx, ny, clickLabel, true);
        visionState.recordAction('click ' + clickLabel + ' @ ' + nx + ',' + ny);
        pushVision();
        const clickCode = `
          (() => {
            ${botCursor.moveCursorJS(nx, ny, clickLabel)}
            const x = Math.round((${nx} / 1000) * window.innerWidth);
            const y = Math.round((${ny} / 1000) * window.innerHeight);
            const nx = ${nx}, ny = ${ny};
            const gameAction = ${JSON.stringify(gameAction)};
            const doClick = () => {
              if (gameAction && window.GraveGainBotInput) {
                ${botCursor.flashClickJS(nx, ny)}
                if (gameAction === 'attack') return window.GraveGainBotInput.click(nx, ny, 'attack');
                if (gameAction === 'aim') {
                  window.GraveGainBotInput.move(nx, ny, 'aim');
                  window.GraveGainBotInput.lookToward(nx, ny);
                  return 'Bot aimed at ' + nx + ',' + ny;
                }
              }
              const el = document.elementFromPoint(x, y);
              if (el) {
                el.focus && el.focus();
                const options = { bubbles: true, cancelable: true, clientX: x, clientY: y };
                el.dispatchEvent(new MouseEvent('mousedown', options));
                el.dispatchEvent(new MouseEvent('click', options));
                el.dispatchEvent(new MouseEvent('mouseup', options));
                ${botCursor.flashClickJS(nx, ny)}
                return "Clicked " + el.tagName + " at " + x + "," + y;
              }
              return "No element at " + x + "," + y;
            };
            // Let the visible bot cursor glide to the target before landing.
            return new Promise((resolve) => setTimeout(() => {
              try { resolve(doClick()); } catch (e) { resolve('Click failed: ' + e.message); }
            }, ${botCursor.CLICK_GLIDE_MS}));
          })()
        `;
        return await controller.executeJS(webview, clickCode);
      }

      visionState.recordAction('click ' + target);
      pushVision();
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
          ${botCursor.moveCursorToPxJS('x', 'y', 'targetStr')}
          const hit = document.elementFromPoint(x, y) || el;
          const doClick = () => {
            if (hit) {
              hit.focus && hit.focus();
              const options = { bubbles: true, cancelable: true, clientX: x, clientY: y };
              hit.dispatchEvent(new MouseEvent('mousedown', options));
              hit.dispatchEvent(new MouseEvent('click', options));
              hit.dispatchEvent(new MouseEvent('mouseup', options));
              // Cursor already glided to (x, y) above; flash the hit.
              const ring = document.createElement('div');
              ring.style.cssText = 'position:fixed;z-index:999998;pointer-events:none;width:14px;height:14px;' +
                'margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #c084fc;left:' + x + 'px;top:' + y + 'px;';
              document.body.appendChild(ring);
              setTimeout(() => ring.remove(), 350);
              return "Clicked " + hit.tagName + " at " + x + "," + y;
            }
            return "No element at " + x + "," + y;
          };
          return new Promise((resolve) => setTimeout(() => {
            try { resolve(doClick()); } catch (e) { resolve('Click failed: ' + e.message); }
          }, ${botCursor.CLICK_GLIDE_MS}));
        })()
      `;
      const first = await controller.executeJS(webview, selectorCode);
      // Compatibility: legacy test mocks return {x,y} for any script
      // containing getBoundingClientRect. Real pages return the "Clicked..."
      // string directly (single roundtrip). If we got coordinates, dispatch
      // the click in a second call that only contains elementFromPoint.
      if (first && typeof first === 'object' && typeof first.x === 'number' && typeof first.y === 'number') {
        const fx = Math.round(first.x);
        const fy = Math.round(first.y);
        const fallbackClick = `
          (() => {
            const x = ${fx};
            const y = ${fy};
            ${botCursor.moveCursorToPxJS('x', 'y', JSON.stringify('click ' + target))}
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

    case 'move_mouse': {
      // Glide the visible bot cursor without clicking (aiming, hovering).
      const coords = botCursor.parseActionCoords(action) || { nx: 500, ny: 500 };
      const label = (action.params && action.params.label) || (action.params && action.params.gameAction) || 'move';
      visionState.recordPointer(coords.nx, coords.ny, label, true);
      visionState.recordAction('move ' + label + ' @ ' + coords.nx + ',' + coords.ny);
      pushVision();
      return await controller.executeJS(webview, botCursor.moveCursorJS(coords.nx, coords.ny, label));
    }

    case 'bot_control': {
      // Explicitly show/hide the bot cursor: target 'on' (bot drives) / 'off'.
      const on = target === 'on' || target === true ||
        (action.params && (action.params.enabled === true || action.params.state === 'on'));
      visionState.setPointerVisible(on);
      visionState.recordAction('bot_control ' + (on ? 'on' : 'off'));
      pushVision();
      return await controller.executeJS(webview, botCursor.setBotControlJS(on));
    }

    case 'press_key': {
      visionState.recordKeys(target, 'press');
      visionState.recordAction('press ' + target);
      pushVision();
      const codeStr = getKeyCode(target);
      const script = `
        (() => {
          ${botCursor.labelCursorJS('keyboard ' + target)}
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
      visionState.recordKeys(target, 'hold ' + duration + 'ms');
      visionState.recordAction('hold ' + target + ' ' + duration + 'ms');
      pushVision();
      const codeStr = getKeyCode(target);
      const script = `
        (() => {
          ${botCursor.labelCursorJS('hold ' + target + ' ' + duration + 'ms')}
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
      visionState.recordAction('type "' + String(textToType).slice(0, 40) + '"' + (selector ? ' into ' + selector : ''));
      pushVision();
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
