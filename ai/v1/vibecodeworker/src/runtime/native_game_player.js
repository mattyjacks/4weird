/**
 * Universal Native Game Player - DeepSeek harness vision driver.
 *
 * One path plays ANY desktop game (HL2: Episode Two is the demo):
 *   native screenshot -> DeepSeek vision (dsh fast path) -> normalized action.
 *
 * When no API key / offline, callers fall back to NativeGameDirector bandit.
 * Pure Node - safe to require in tests.
 */

const { resolveGameProfile } = require('./native_game_profiles');

const VISION_MODEL = 'deepseek-v4-flash-vision-exp';
const TEXT_MODEL = 'deepseek-v4-flash';

// Action vocabulary the executor + input_sim.py understand.
const NATIVE_ACTION_TYPES = [
  'hold_keys', 'hold_key', 'press_key', 'click',
  'move_mouse', 'drag_look', 'wheel', 'type_text', 'wait'
];

function buildNativeGamePrompt({ profile, recentActions = [], stuck = false, extraRules = '' } = {}) {
  const p = profile || resolveGameProfile('');
  const c = p.controls || {};
  const extra = c.extra ? Object.entries(c.extra).map(([k, v]) => `${k}=${v}`).join(', ') : '';
  const history = (recentActions || []).slice(-6).map((a, i) => {
    const desc = typeof a === 'string' ? a : `${a.type || '?'} ${a.target || JSON.stringify(a.params || {})}`;
    return `  -${(recentActions || []).slice(-6).length - i}: ${desc}`;
  }).join('\n') || '  (none yet)';
  const startup = (p.startup || []).map((s) => `- ${s}`).join('\n');

  return `## ROLE - UNIVERSAL PC GAME PLAYER (DeepSeek Harness vision loop)
You are playing the desktop game "${p.name}" (${p.genre}) SIGHTED: the screenshot is the live game window.
This is the DeepSeek Harness (dsh) fast vision path: decide ONE next input every tick.

## GAME BRIEF
${p.description}
GOAL: ${p.goal}
${extraRules ? `OPERATOR RULES: ${extraRules}\n` : ''}## CONTROLS (Source / WASD standard)
move forward=${c.forward || 'w'} back=${c.back || 's'} left=${c.left || 'a'} right=${c.right || 'd'} ` +
    `jump=${c.jump || 'space'} crouch=${c.crouch || 'c'} sprint=${c.sprint || 'shift'} ` +
    `use=${c.use || 'e'} reload=${c.reload || 'r'} fire=${c.fireHint || 'left click'} alt=${c.altFireHint || 'right click'}` +
    (extra ? ` extras: ${extra}` : '') + `
## STARTUP / RECOVERY CHEATSHEET
${startup || '- Click to focus, Enter past menus, Escape resumes pause.'}
${stuck ? '\n## STUCK WARNING\nThe frame has not changed for several ticks. Do something different: turn 90+ degrees, jump+sprint forward, or press Escape then resume.\n' : ''}
## VISION NOTES
${p.visionHints || 'Aim center-screen, follow exits and markers, shoot visible enemies.'}
Coordinates are 0-1000 normalized (500,500 = screen center, crosshair home).

## RECENT ACTIONS (do NOT repeat a failing move)
${history}

## TASK - respond ONLY with JSON, exactly:
{
  "status": "menu | playing | combat | puzzle | loading | dead | stuck | unknown",
  "reasoning": "one short sentence: what you see and why this input",
  "action": {
    "type": "hold_keys | press_key | click | move_mouse | drag_look | wait",
    "target": "hold_keys: comma keys like 'w,shift'. press_key: key like 'e'. click/move_mouse: 'x,y'. drag_look: 'dx,dy'. wait: ''",
    "duration_ms": 350,
    "params": { "keys": ["w"], "key": "e", "x": 500, "y": 500, "dx": 120, "dy": 0 }
  }
}
Rules:
- Combat visible? click center-ish on the enemy (fire), drag_look to track it, r to reload when idle-empty.
- Traveling? hold_keys w,shift to sprint forward; drag_look dx +-120 to steer toward doors/light/markers.
- Menu/pause/dead? press_key enter or escape, or click the highlighted button.
- Prefer hold_keys over tiny taps for movement. Keep duration_ms 200-900.
- Output JSON ONLY.`;
}

function normalizeNativeAction(raw) {
  if (!raw || typeof raw !== 'object') {
    return { type: 'hold_keys', target: 'w,shift', duration_ms: 500, params: { keys: ['w', 'shift'] }, status: 'native-fallback' };
  }
  let { type, target = '', duration_ms = 400, params = {} } = raw;
  if (!NATIVE_ACTION_TYPES.includes(type)) type = 'hold_keys';

  const clampMs = Math.max(80, Math.min(3000, parseInt(duration_ms, 10) || 400));
  const clampCoord = (n) => Math.max(0, Math.min(1000, Math.round(Number(n))));
  const cleanKeys = (v) => String(v || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);

  if (type === 'hold_keys') {
    const keys = Array.isArray(params.keys) && params.keys.length ? params.keys.map((k) => String(k).toLowerCase()) : cleanKeys(target);
    const finalKeys = keys.length ? keys : ['w'];
    return { type, target: finalKeys.join(','), duration_ms: clampMs, params: { keys: finalKeys } };
  }
  if (type === 'hold_key' || type === 'press_key') {
    const key = String(params.key || target || 'w').toLowerCase();
    return { type, target: key, duration_ms: type === 'press_key' ? 0 : clampMs, params: { key } };
  }
  if (type === 'click' || type === 'move_mouse') {
    let x = params.x, y = params.y;
    if ((!Number.isFinite(x) || !Number.isFinite(y)) && typeof target === 'string' && target.includes(',')) {
      const parts = target.split(',');
      x = parseInt(parts[0], 10); y = parseInt(parts[1], 10);
    }
    x = Number.isFinite(x) ? clampCoord(x) : 500;
    y = Number.isFinite(y) ? clampCoord(y) : 500;
    return { type, target: `${x},${y}`, duration_ms: 0, params: { x, y } };
  }
  if (type === 'drag_look') {
    let dx = params.dx, dy = params.dy;
    if ((!Number.isFinite(dx) || !Number.isFinite(dy)) && typeof target === 'string' && target.includes(',')) {
      const parts = target.split(',');
      dx = parseInt(parts[0], 10); dy = parseInt(parts[1], 10);
    }
    dx = Number.isFinite(dx) ? Math.max(-500, Math.min(500, Math.round(dx))) : 120;
    dy = Number.isFinite(dy) ? Math.max(-500, Math.min(500, Math.round(dy))) : 0;
    return { type, target: `${dx},${dy}`, duration_ms: 0, params: { dx, dy } };
  }
  if (type === 'wheel') {
    const delta = Number.isFinite(params.delta) ? Math.max(-5, Math.min(5, Math.round(params.delta))) : -1;
    return { type, target: String(delta), duration_ms: 0, params: { delta } };
  }
  if (type === 'type_text') {
    const text = String(params.text || target || '').slice(0, 120);
    return { type, target: text, duration_ms: 0, params: { text } };
  }
  return { type: 'wait', target: '', duration_ms: clampMs || 400, params: {} };
}

function parseNativeDecision(raw) {
  // Accepts callLLM outputs: object, JSON string, or {action,...} wrapper.
  try {
    let data = raw;
    if (typeof raw === 'string') {
      const m = raw.match(/\{[\s\S]*\}/);
      data = m ? JSON.parse(m[0]) : null;
    }
    if (!data || typeof data !== 'object') return null;
    const action = normalizeNativeAction(data.action || data);
    return {
      status: data.status || 'playing',
      reasoning: data.reasoning || data.analysis || 'DeepSeek harness vision step.',
      action
    };
  } catch (_) {
    return null;
  }
}

/**
 * Ask the DeepSeek harness vision model for the next native input.
 * brain: AgentBrain-like { config, callLLM } - uses dsh fast path.
 */
async function decideNativeActionViaDeepSeek(brain, {
  screenshotBase64,
  windowTitle = '',
  profile = null,
  recentActions = [],
  stuck = false,
  extraRules = ''
} = {}) {
  if (!brain || typeof brain.callLLM !== 'function') {
    throw new Error('decideNativeActionViaDeepSeek requires a brain with callLLM().');
  }
  if (!screenshotBase64) throw new Error('Screenshot is required for vision play.');
  const resolved = profile || resolveGameProfile(windowTitle);
  const prompt = buildNativeGamePrompt({ profile: resolved, recentActions, stuck, extraRules });

  // Force the vision-capable flash model for frames, keep text on cheap flash.
  const prevModel = brain.config ? brain.config.modelName : '';
  const wantVision = !prevModel || prevModel === 'deepseek-auto' ? VISION_MODEL : prevModel;
  let saved = null;
  try {
    if (brain.config) {
      saved = brain.config.modelName;
      // Only override auto/empty; respect an explicit operator choice.
      if (!saved || saved === 'deepseek-auto') brain.config.modelName = VISION_MODEL;
    }
    const raw = await brain.callLLM(prompt, screenshotBase64);
    const parsed = parseNativeDecision(raw);
    if (!parsed) throw new Error('Vision model returned unparseable JSON.');
    parsed.profile = resolved.id;
    return parsed;
  } finally {
    if (brain.config && saved !== null) brain.config.modelName = saved;
    void wantVision; void TEXT_MODEL;
  }
}

/**
 * Translate a normalized native action into input_sim.py argv (before window title).
 * Returns null for local waits (executor sleeps itself).
 */
function toInputSimArgs(action) {
  if (!action || !action.type) return null;
  const dur = action.duration_ms || 400;
  switch (action.type) {
    case 'click': {
      const x = action.params?.x ?? 500;
      const y = action.params?.y ?? 500;
      return ['click', String(x), String(y)];
    }
    case 'press_key': {
      const key = action.params?.key || action.target || 'space';
      return ['press', String(key)];
    }
    case 'hold_key': {
      const key = action.params?.key || action.target || 'w';
      return ['hold', String(key), String(dur)];
    }
    case 'hold_keys': {
      const keys = action.params?.keys || String(action.target || 'w').split(',');
      return ['hold_keys', keys.join(','), String(dur)];
    }
    case 'move_mouse': {
      const x = action.params?.x ?? 500;
      const y = action.params?.y ?? 500;
      return ['move', String(x), String(y)];
    }
    case 'drag_look': {
      const dx = action.params?.dx ?? 120;
      const dy = action.params?.dy ?? 0;
      return ['look', String(dx), String(dy)];
    }
    case 'wheel': {
      const delta = action.params?.delta ?? -1;
      return ['wheel', String(delta)];
    }
    case 'type_text': {
      const text = action.params?.text || action.target || '';
      return ['type', String(text)];
    }
    case 'wait':
      return null;
    default:
      return null;
  }
}

module.exports = {
  VISION_MODEL,
  TEXT_MODEL,
  NATIVE_ACTION_TYPES,
  buildNativeGamePrompt,
  normalizeNativeAction,
  parseNativeDecision,
  decideNativeActionViaDeepSeek,
  toInputSimArgs
};
