/**
 * Virtual bot mouse - visible cursor on the test window.
 *
 * Every bot-driven action routes through here first: a robot emoji riding
 * OVER the pointer arrow glides to the target, shows what the bot is doing
 * in a label, and flashes on click. Works on ANY page (generic overlay) and
 * upgrades to the rich in-game cursor when GraveGain3D is loaded
 * (same overlay id, see website/.../gravegain3d/ui/bot-cursor.js).
 *
 * Snippets are plain JS strings executed via controller.executeJS so both
 * the embedded webview and the separate game window get the cursor.
 */

const CURSOR_ID = 'vibe-bot-cursor';
const CLICK_GLIDE_MS = 200;

function ensureCursorJS() {
  return `
    (() => {
      if (window.GraveGainBotCursor) { window.GraveGainBotCursor.ensure(); return true; }
      if (document.getElementById('${CURSOR_ID}')) return true;
      const el = document.createElement('div');
      el.id = '${CURSOR_ID}';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="vibe-bot-badge">\\u{1F916}</div>' +
        '<div class="vibe-bot-pointer">\\u27A4</div>' +
        '<div class="vibe-bot-label"></div>';
      const css = document.createElement('style');
      css.textContent = '#${CURSOR_ID}{position:fixed;left:0;top:0;z-index:999999;pointer-events:none;' +
        'transition:left 0.18s ease-out,top 0.18s ease-out,opacity 0.25s;opacity:0;}' +
        '#${CURSOR_ID}.on{opacity:1;}' +
        '#${CURSOR_ID} .vibe-bot-badge{position:absolute;left:-9px;top:-30px;font-size:22px;line-height:1;}' +
        '#${CURSOR_ID} .vibe-bot-pointer{position:absolute;left:0;top:0;font-size:20px;color:#c084fc;}' +
        '#${CURSOR_ID} .vibe-bot-label{position:absolute;left:20px;top:-26px;white-space:nowrap;' +
        'font:600 11px/1.4 monospace,sans-serif;color:#e9d5ff;background:rgba(24,10,46,0.85);' +
        'border:1px solid rgba(168,85,247,0.6);border-radius:6px;padding:2px 7px;}';
      document.head.appendChild(css);
      document.body.appendChild(el);
      window.__vibeBotControl = window.__vibeBotControl || false;
      window.__vibeHumanOverride = false;
      window.addEventListener('mousedown', (e) => {
        if (e.isTrusted) {
          window.__vibeHumanOverride = true;
          const c = document.getElementById('${CURSOR_ID}');
          if (c) c.classList.remove('on');
        }
      }, true);
      return true;
    })()
  `;
}

function setBotControlJS(on) {
  return `
    (() => {
      if (window.GraveGainBotCursor) window.GraveGainBotCursor.setBotControl(${on ? 'true' : 'false'});
      window.__vibeBotControl = ${on ? 'true' : 'false'};
      if (${on ? 'true' : 'false'}) window.__vibeHumanOverride = false;
      const c = document.getElementById('${CURSOR_ID}');
      if (c) c.classList.toggle('on', ${on ? 'true' : 'false'} && !window.__vibeHumanOverride);
      return 'bot_control ${on ? 'on' : 'off'}';
    })()
  `;
}

function moveCursorJS(nx, ny, label) {
  const safeLabel = JSON.stringify(label || 'bot');
  return `
    (() => {
      ${ensureCursorJS()}
      if (window.GraveGainBotCursor) {
        // An explicit bot move IS bot control: assert it so the cursor
        // stays visible (opacity rides on the 'on' class) instead of
        // moving invisibly after pauses, reloads, or control resets.
        window.GraveGainBotCursor.setBotControl(true);
        window.GraveGainBotCursor.move(${nx}, ${ny}, ${safeLabel});
      } else {
        const c = document.getElementById('${CURSOR_ID}');
        window.__vibeBotControl = true;
        window.__vibeHumanOverride = false;
        if (c) {
          c.style.left = Math.round((${nx} / 1000) * window.innerWidth) + 'px';
          c.style.top = Math.round((${ny} / 1000) * window.innerHeight) + 'px';
          const lab = c.querySelector('.vibe-bot-label');
          if (lab) lab.textContent = ${safeLabel};
          c.classList.add('on');
        }
      }
      return 'cursor ' + ${nx} + ',' + ${ny};
    })()
  `;
}

function flashClickJS(nx, ny) {
  return `
    (() => {
      if (window.GraveGainBotCursor) { window.GraveGainBotCursor.flash(${nx}, ${ny}); return true; }
      const ring = document.createElement('div');
      ring.style.cssText = 'position:fixed;z-index:999998;pointer-events:none;width:14px;height:14px;' +
        'margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #c084fc;' +
        'left:' + Math.round((${nx} / 1000) * window.innerWidth) + 'px;' +
        'top:' + Math.round((${ny} / 1000) * window.innerHeight) + 'px;';
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 350);
      return true;
    })()
  `;
}

function labelCursorJS(text) {
  const safe = JSON.stringify(text);
  return `
    (() => {
      ${ensureCursorJS()}
      if (window.GraveGainBotCursor) { window.GraveGainBotCursor.setBotControl(true); window.GraveGainBotCursor.label(${safe}); }
      else {
        window.__vibeBotControl = true;
        const c = document.getElementById('${CURSOR_ID}');
        if (c && !window.__vibeHumanOverride) {
          const lab = c.querySelector('.vibe-bot-label');
          if (lab) lab.textContent = ${safe};
          c.classList.add('on');
        }
      }
      return 'label ' + ${safe};
    })()
  `;
}

// Glide the cursor to DYNAMIC page coords (xExpr/yExpr are JS expressions
// evaluating to CSS pixels, e.g. after getBoundingClientRect resolution).
function moveCursorToPxJS(xExpr, yExpr, labelExpr) {
  return `
    (() => {
      const __nx = Math.max(0, Math.min(1000, Math.round((${xExpr}) / window.innerWidth * 1000)));
      const __ny = Math.max(0, Math.min(1000, Math.round((${yExpr}) / window.innerHeight * 1000)));
      if (window.GraveGainBotCursor) {
        window.GraveGainBotCursor.setBotControl(true);
        window.GraveGainBotCursor.move(__nx, __ny, (${labelExpr}));
      } else {
        const c = document.getElementById('${CURSOR_ID}');
        window.__vibeBotControl = true;
        window.__vibeHumanOverride = false;
        if (c) {
          c.style.left = (${xExpr}) + 'px';
          c.style.top = (${yExpr}) + 'px';
          const lab = c.querySelector('.vibe-bot-label');
          if (lab) lab.textContent = (${labelExpr});
          c.classList.add('on');
        }
      }
      return 'cursor ' + __nx + ',' + __ny;
    })()
  `;
}

// Resolve 0-1000 coords from any bot action (target "x,y" or params.x/y).
function parseActionCoords(action) {
  if (!action) return null;
  if (action.params && typeof action.params.x === 'number' && typeof action.params.y === 'number') {
    return { nx: action.params.x, ny: action.params.y };
  }
  if (typeof action.target === 'string' && action.target.includes(',')) {
    const parts = action.target.split(',');
    const nx = parseInt(parts[0], 10);
    const ny = parseInt(parts[1], 10);
    if (Number.isFinite(nx) && Number.isFinite(ny)) return { nx, ny };
  }
  return null;
}

module.exports = {
  CURSOR_ID,
  CLICK_GLIDE_MS,
  ensureCursorJS,
  setBotControlJS,
  moveCursorJS,
  moveCursorToPxJS,
  flashClickJS,
  labelCursorJS,
  parseActionCoords
};
