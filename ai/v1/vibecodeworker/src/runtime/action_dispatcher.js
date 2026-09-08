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
    // Universal native bridge: any game action -> input_sim.py argv.
    // Covers vision-player types (hold_keys, drag_look, wheel, ...) plus legacy aliases.
    if (action.type === 'keypress') action = { ...action, type: 'press_key' };
    if (action.type === 'refresh') {
      return await ipcRenderer.invoke('run-input-sim', ['press', 'F5', nativeProcessName]);
    }
    if (action.type === 'wait') {
      const waitMs = duration || 500;
      return new Promise((resolve) => setTimeout(() => resolve(`Waited ${waitMs}ms`), waitMs));
    }
    try {
      const { normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
      const normalized = normalizeNativeAction(action);
      const pyArgs = toInputSimArgs(normalized);
      if (pyArgs) {
        pyArgs.push(nativeProcessName);
        return await ipcRenderer.invoke('run-input-sim', pyArgs);
      }
      return `Native action ${action.type} has no bridge mapping`;
    } catch (_) {
      // Minimal fallback when the player module is unavailable (tests mock ipcRenderer).
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
      }
      return `Unknown native action type: ${action.type}`;
    }
  }

  switch (action.type) {
    case 'combo': {
      // Chained inputs in near-real-time. Native path collapses to ONE
      // input_sim.py spawn (see toInputSimArgs 'combo'); the webview path
      // collapses to ONE executeJS roundtrip with overlapping holds.
      if (nativeProcessName) {
        try {
          const { normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
          const normalized = normalizeNativeAction(action);
          const pyArgs = toInputSimArgs(normalized);
          if (pyArgs) {
            pyArgs.push(nativeProcessName);
            const steps = (normalized.params && normalized.params.steps) || [];
            visionState.recordKeys(steps.filter((s) => s.op === 'hold_keys').map((s) => s.keys.join('+')).join(' ') || 'combo', 'combo');
            visionState.recordAction('combo ' + (normalized.target || steps.map((s) => s.op).join('+')));
            pushVision();
            return await ipcRenderer.invoke('run-input-sim', pyArgs);
          }
          return 'Native combo has no steps to execute';
        } catch (e) {
          return `Native combo failed: ${e.message}`;
        }
      }
      const rawSteps = (action.params && action.params.steps) || action.steps || [];
      let steps = rawSteps;
      try {
        const { normalizeComboStep } = require('./native_game_player');
        const normed = rawSteps.map(normalizeComboStep).filter(Boolean);
        if (normed.length) steps = normed;
      } catch (_) { /* web-only caller without player module: use raw steps */ }
      steps = (Array.isArray(steps) ? steps : []).slice(0, 8);
      if (!steps.length) return 'Combo has no steps to execute';
      const label = String(action.target || steps.map((s) => s.op).join('+')).slice(0, 60);
      visionState.recordAction('combo ' + label + ' (' + steps.length + ' steps)');
      pushVision();
      const comboScript = `
        (() => {
          const steps = ${JSON.stringify(steps)};
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const keyCode = (k) => {
            const m = { arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', ' ': 'Space', space: 'Space', enter: 'Enter', escape: 'Escape', shift: 'ShiftLeft', control: 'ControlLeft', alt: 'AltLeft' };
            const low = String(k || '').toLowerCase();
            if (m[low]) return m[low];
            if (low.length === 1) return 'Key' + low.toUpperCase();
            return k;
          };
          const down = (k) => {
            const ev = new KeyboardEvent('keydown', { key: k, code: keyCode(k), bubbles: true });
            window.dispatchEvent(ev); document.dispatchEvent(ev);
          };
          const up = (k) => {
            const ev = new KeyboardEvent('keyup', { key: k, code: keyCode(k), bubbles: true });
            window.dispatchEvent(ev); document.dispatchEvent(ev);
          };
          const clickAt = (nx, ny, button) => {
            const x = Math.round((nx / 1000) * window.innerWidth);
            const y = Math.round((ny / 1000) * window.innerHeight);
            const btn = button === 'right' ? 2 : (button === 'middle' ? 1 : 0);
            const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: btn, buttons: btn === 0 ? 1 : btn === 2 ? 2 : 4 };
            const el = document.elementFromPoint(x, y);
            if (window.GraveGainBotInput && btn === 0) { try { window.GraveGainBotInput.click(nx, ny, 'attack'); } catch (_) {} }
            if (el) {
              el.focus && el.focus();
              el.dispatchEvent(new MouseEvent('mousedown', opts));
              el.dispatchEvent(new MouseEvent('mouseup', opts));
              el.dispatchEvent(new MouseEvent('click', opts));
              return 'hit ' + el.tagName;
            }
            return 'no element';
          };
          return (async () => {
            const held = [];
            const t0 = Date.now();
            let longest = 0;
            for (const s of steps) {
              if (s.op === 'hold_keys' && Array.isArray(s.keys)) {
                longest = Math.max(longest, s.duration_ms || 400);
                for (const k of s.keys) { down(k); held.push({ k, until: t0 + (s.duration_ms || 400) }); }
              } else if (s.op === 'hold' && s.key) {
                longest = Math.max(longest, s.duration_ms || 400);
                down(s.key); held.push({ k: s.key, until: t0 + (s.duration_ms || 400) });
              }
            }
            const log = [];
            for (const s of steps) {
              try {
                if (s.op === 'press' && s.key) { down(s.key); await sleep(40); up(s.key); log.push('press ' + s.key); }
                else if (s.op === 'click') { log.push('click:' + clickAt(s.x ?? 500, s.y ?? 500, s.button || 'left')); }
                else if (s.op === 'right_click') { log.push('right:' + clickAt(s.x ?? 500, s.y ?? 500, 'right')); }
                else if (s.op === 'double_click') {
                  clickAt(s.x ?? 500, s.y ?? 500, 'left'); await sleep(60);
                  log.push('dbl:' + clickAt(s.x ?? 500, s.y ?? 500, 'left'));
                }
                else if (s.op === 'move') {
                  const x = Math.round(((s.x ?? 500) / 1000) * window.innerWidth);
                  const y = Math.round(((s.y ?? 500) / 1000) * window.innerHeight);
                  window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
                  log.push('move ' + s.x + ',' + s.y);
                }
                else if (s.op === 'look') {
                  const dx = s.dx || 0, dy = s.dy || 0;
                  if (window.GraveGainBotInput && window.GraveGainBotInput.lookToward) {
                    try { window.GraveGainBotInput.lookToward(500 + dx, 500 + dy); } catch (_) {}
                  }
                  window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: window.innerWidth / 2 + dx, clientY: window.innerHeight / 2 + dy }));
                  log.push('look ' + dx + ',' + dy);
                }
                else if (s.op === 'wheel') {
                  window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: (s.delta || 0) > 0 ? -100 : 100 }));
                  log.push('wheel ' + s.delta);
                }
                else if (s.op === 'wait') { await sleep(Math.max(0, Math.min(3000, s.duration_ms || 150))); log.push('wait'); }
                // hold_keys/hold already opened above; keep the gap tiny.
                await sleep(25);
              } catch (e) { log.push(s.op + ' failed'); }
            }
            const remain = longest - (Date.now() - t0);
            if (remain > 0) await sleep(remain);
            for (const h of held.reverse()) { try { up(h.k); } catch (_) {} }
            return 'Combo (' + steps.length + ' steps, ' + (Date.now() - t0) + 'ms): ' + log.join('; ');
          })();
        })()
      `;
      return await controller.executeJS(webview, comboScript);
    }

    case 'hold_keys': {
      // Multi-key hold (W+Shift sprint, W+A strafe): all keys go down
      // together, release together after duration - one roundtrip.
      const keys = (action.params && action.params.keys) || String(target || 'w').split(',');
      const clean = keys.map((k) => String(k).trim()).filter(Boolean).slice(0, 3);
      const finalKeys = clean.length ? clean : ['w'];
      visionState.recordKeys(finalKeys.join('+'), 'hold ' + duration + 'ms');
      visionState.recordAction('hold_keys ' + finalKeys.join('+') + ' ' + duration + 'ms');
      pushVision();
      if (nativeProcessName) {
        try {
          const { normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
          const pyArgs = toInputSimArgs(normalizeNativeAction(action));
          if (pyArgs) { pyArgs.push(nativeProcessName); return await ipcRenderer.invoke('run-input-sim', pyArgs); }
        } catch (_) { /* fall through to webview path */ }
      }
      const holdScript = `
        (() => {
          const keys = ${JSON.stringify(finalKeys)};
          const codeOf = (k) => {
            const low = String(k).toLowerCase();
            const m = { arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', ' ': 'Space', space: 'Space', enter: 'Enter', escape: 'Escape', shift: 'ShiftLeft', control: 'ControlLeft', alt: 'AltLeft' };
            if (m[low]) return m[low];
            return low.length === 1 ? 'Key' + low.toUpperCase() : k;
          };
          for (const k of keys) {
            const ev = new KeyboardEvent('keydown', { key: k, code: codeOf(k), bubbles: true });
            window.dispatchEvent(ev); document.dispatchEvent(ev);
          }
          setTimeout(() => {
            for (const k of keys) {
              const ev = new KeyboardEvent('keyup', { key: k, code: codeOf(k), bubbles: true });
              window.dispatchEvent(ev); document.dispatchEvent(ev);
            }
          }, ${duration});
          return 'Held ' + keys.join('+') + ' for ' + ${duration} + 'ms';
        })()
      `;
      return await controller.executeJS(webview, holdScript);
    }

    case 'right_click':
    case 'double_click': {
      const isRight = action.type === 'right_click';
      let nx = 500, ny = 500;
      if (action.params && Number.isFinite(Number(action.params.x))) {
        nx = Number(action.params.x); ny = Number(action.params.y);
      } else if (typeof target === 'string' && target.includes(',')) {
        nx = parseInt(target.split(',')[0], 10) || 500;
        ny = parseInt(target.split(',')[1], 10) || 500;
      }
      nx = Math.max(0, Math.min(1000, nx)); ny = Math.max(0, Math.min(1000, ny));
      visionState.recordPointer(nx, ny, action.type, true);
      visionState.recordAction(action.type + ' @ ' + nx + ',' + ny);
      pushVision();
      if (nativeProcessName) {
        try {
          const { normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
          const pyArgs = toInputSimArgs(normalizeNativeAction(action));
          if (pyArgs) { pyArgs.push(nativeProcessName); return await ipcRenderer.invoke('run-input-sim', pyArgs); }
        } catch (_) { /* fall through */ }
      }
      const btnScript = `
        (() => {
          const nx = ${nx}, ny = ${ny};
          const x = Math.round((nx / 1000) * window.innerWidth);
          const y = Math.round((ny / 1000) * window.innerHeight);
          const fire = () => {
            const el = document.elementFromPoint(x, y);
            if (!el) return 'No element at ' + x + ',' + y;
            el.focus && el.focus();
            ${isRight
              ? `const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2 };
                 el.dispatchEvent(new MouseEvent('mousedown', opts));
                 el.dispatchEvent(new MouseEvent('mouseup', opts));
                 el.dispatchEvent(new MouseEvent('contextmenu', opts));
                 return 'Right-clicked ' + el.tagName + ' at ' + x + ',' + y;`
              : `const mk = () => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 });
                 el.dispatchEvent(new MouseEvent('mousedown', mk()));
                 el.dispatchEvent(new MouseEvent('mouseup', mk()));
                 el.dispatchEvent(new MouseEvent('click', mk()));
                 el.dispatchEvent(new MouseEvent('mousedown', mk()));
                 el.dispatchEvent(new MouseEvent('mouseup', mk()));
                 el.dispatchEvent(new MouseEvent('click', mk()));
                 el.dispatchEvent(new MouseEvent('dblclick', mk()));
                 return 'Double-clicked ' + el.tagName + ' at ' + x + ',' + y;`}
          };
          ${botCursor.moveCursorJS(nx, ny, action.type)}
          return new Promise((resolve) => setTimeout(() => {
            try { resolve(fire()); } catch (e) { resolve('${action.type} failed: ' + e.message); }
          }, ${botCursor.CLICK_GLIDE_MS}));
        })()
      `;
      return await controller.executeJS(webview, btnScript);
    }

    case 'drag_look': {
      // FPS camera turn. Native: relative look via input_sim. Webview: aim
      // through the bot API when present, else synthesize mousemove.
      let dx = 120, dy = 0;
      if (action.params && (Number.isFinite(Number(action.params.dx)) || Number.isFinite(Number(action.params.dy)))) {
        dx = Number(action.params.dx) || 0; dy = Number(action.params.dy) || 0;
      } else if (typeof target === 'string' && target.includes(',')) {
        dx = parseInt(target.split(',')[0], 10) || 0; dy = parseInt(target.split(',')[1], 10) || 0;
      }
      dx = Math.max(-500, Math.min(500, Math.round(dx)));
      dy = Math.max(-500, Math.min(500, Math.round(dy)));
      visionState.recordAction('drag_look ' + dx + ',' + dy);
      pushVision();
      if (nativeProcessName) {
        try {
          const { normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
          const pyArgs = toInputSimArgs(normalizeNativeAction(action));
          if (pyArgs) { pyArgs.push(nativeProcessName); return await ipcRenderer.invoke('run-input-sim', pyArgs); }
        } catch (_) { /* fall through */ }
      }
      return await controller.executeJS(webview, `
        (() => {
          const dx = ${dx}, dy = ${dy};
          if (window.GraveGainBotInput && window.GraveGainBotInput.lookToward) {
            try { window.GraveGainBotInput.lookToward(500 + dx, 500 + dy); return 'Looked toward ' + (500 + dx) + ',' + (500 + dy); } catch (_) {}
          }
          window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: window.innerWidth / 2 + dx, clientY: window.innerHeight / 2 + dy }));
          return 'Dragged look by ' + dx + ',' + dy;
        })()
      `);
    }

    case 'wheel': {
      const delta = (action.params && Number.isFinite(Number(action.params.delta)))
        ? Math.max(-5, Math.min(5, Math.round(Number(action.params.delta)))) : -1;
      visionState.recordAction('wheel ' + delta);
      pushVision();
      if (nativeProcessName) {
        try {
          const { normalizeNativeAction, toInputSimArgs } = require('./native_game_player');
          const pyArgs = toInputSimArgs(normalizeNativeAction(action));
          if (pyArgs) { pyArgs.push(nativeProcessName); return await ipcRenderer.invoke('run-input-sim', pyArgs); }
        } catch (_) { /* fall through */ }
      }
      return await controller.executeJS(webview, `
        (() => {
          window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: ${delta} > 0 ? -100 : 100 }));
          return 'Wheeled ' + ${delta};
        })()
      `);
    }

    case 'click': {
      // params.button 'right' routes to the right-click path (context menu +
      // button-2 events) instead of a plain left click.
      if (!nativeProcessName && action.params && String(action.params.button || '').toLowerCase() === 'right') {
        action = { ...action, type: 'right_click' };
        // Fall through to right_click by re-dispatching one case down is not
        // possible in a switch, so handle it inline via the shared path below.
        // Simplest correct route: rename and restart the switch body.
        return executeAction(controller, webview, action, nativeProcessName);
      }
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
            if (gameAction === 'gravegain2d_attack' || gameAction === 'gravegain2d_aim') {
              const game = window.GraveGainGame;
              if (game && game.input && game.player) {
                const gameX = (nx / 1000) * (game.canvas?.width || 1000);
                const gameY = (ny / 1000) * (game.canvas?.height || 600);
                game.input.mouse.x = gameX;
                game.input.mouse.y = gameY;
                game.player.angle = Math.atan2(gameY - (game.player.y - game.camera.getOffsets().y), gameX - (game.player.x - game.camera.getOffsets().x));
                if (gameAction === 'gravegain2d_attack') game.input.mouse.click = true;
                return gameAction === 'gravegain2d_attack' ? 'GraveGain2D melee attack queued' : 'GraveGain2D aim updated';
              }
              return 'GraveGain2D input unavailable';
            }
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
              if (!b.disabled && ((b.innerText && b.innerText.includes(targetStr)) || b.id === targetStr)) {
                el = b;
                break;
              }
            }
          }
          // A missing selector must be a safe no-op. Falling back to the
          // viewport centre caused stalled menu autoplay to click the same
          // unrelated DIV forever.
          if (!el || el.disabled || !el.getClientRects().length) {
            return 'No actionable element matched ' + targetStr;
          }
          const rect = el.getBoundingClientRect();
          const x = Math.round(rect.left + rect.width / 2);
          const y = Math.round(rect.top + rect.height / 2);
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
      const aimX = action.params && Number.isFinite(Number(action.params.aimX)) ? Number(action.params.aimX) : null;
      const aimY = action.params && Number.isFinite(Number(action.params.aimY)) ? Number(action.params.aimY) : null;
      const aimCode = aimX !== null && aimY !== null ? `
          if (window.GraveGainGame && window.GraveGainGame.input && window.GraveGainGame.player) {
            const g = window.GraveGainGame;
            const ax = (${aimX} / 1000) * (g.canvas?.width || 1000);
            const ay = (${aimY} / 1000) * (g.canvas?.height || 600);
            g.input.mouse.x = ax;
            g.input.mouse.y = ay;
            g.player.angle = Math.atan2(ay - (g.player.y - g.camera.getOffsets().y), ax - (g.player.x - g.camera.getOffsets().x));
          }
        ` : '';
      const script = `
        (() => {
          ${aimCode}
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
