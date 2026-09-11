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
// combo chains several inputs into ONE python spawn (near-real-time):
// e.g. hold W while turning the camera, firing, and jumping.
const NATIVE_ACTION_TYPES = [
  'combo', 'hold_keys', 'hold_key', 'press_key', 'click',
  'right_click', 'double_click', 'move_mouse', 'drag_look', 'wheel', 'type_text', 'wait'
];

// Player identity: whenever ANY game shows a name / nickname / profile field,
// the worker claims it as VibeCodeWorker first, then falls back intelligently
// (numbered, shortened, sanitized) if the game rejects the previous attempt.
const PLAYER_NAME_CANDIDATES = [
  'VibeCodeWorker',
  'VibeCodeWorker1',
  'VCW_Player',
  'VibeCoder',
  'VCWorker01',
  'Player_VCW'
];

// Xonotic-style name fields accept [A-Za-z0-9_] and cap length (~16).
// Sanitize so a rejected attempt degrades gracefully instead of re-sending
// the same illegal string forever.
function sanitizePlayerName(name, maxLen = 16) {
  const clean = String(name || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, maxLen);
  return clean || 'VCW_Player';
}

// attempt is 0-based: 0 -> VibeCodeWorker, then ordered variations, then
// numbered VCW_Player_N with shortening so we never repeat a failed name.
function getPlayerNameCandidate(attempt = 0) {
  const i = Math.max(0, Math.floor(Number(attempt) || 0));
  if (i < PLAYER_NAME_CANDIDATES.length) return sanitizePlayerName(PLAYER_NAME_CANDIDATES[i]);
  const n = i - PLAYER_NAME_CANDIDATES.length + 2;
  return sanitizePlayerName(`VCW_Player${n}`);
}

// Normalize one combo step (op-level clamping shared by normalizeNativeAction).
// Pure + testable: never touches pyautogui / ipc.
function normalizeComboStep(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const op = String(raw.op || raw.type || '').toLowerCase();
  const clampCoord = (n) => Math.max(0, Math.min(1000, Math.round(Number(n))));
  const cleanKeys = (v) => String(v || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
  const ms = Math.max(80, Math.min(3000, parseInt(raw.duration_ms, 10) || 400));
  switch (op) {
    case 'hold_keys': {
      const keys = Array.isArray(raw.keys) && raw.keys.length
        ? raw.keys.map((k) => String(k).toLowerCase()).slice(0, 3)
        : cleanKeys(raw.target);
      return { op, keys: keys.length ? keys : ['w'], duration_ms: ms };
    }
    case 'hold': {
      return { op, key: String(raw.key || raw.target || 'w').toLowerCase(), duration_ms: ms };
    }
    case 'press': case 'press_key': {
      return { op: 'press', key: String(raw.key || raw.target || 'space').toLowerCase() };
    }
    case 'click': {
      const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
      const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
      const button = ['left', 'right', 'middle'].includes(String(raw.button || 'left').toLowerCase())
        ? String(raw.button).toLowerCase() : 'left';
      return { op: 'click', x, y, button };
    }
    case 'right_click': {
      const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
      const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
      return { op: 'right_click', x, y };
    }
    case 'middle_click': {
      const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
      const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
      return { op: 'click', x, y, button: 'middle' };
    }
    case 'double_click': {
      const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
      const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
      return { op: 'double_click', x, y };
    }
    case 'move': case 'move_mouse': {
      const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
      const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
      return { op: 'move', x, y };
    }
    case 'look': case 'drag_look': {
      const dx = Number.isFinite(raw.dx) ? Math.max(-500, Math.min(500, Math.round(raw.dx))) : 120;
      const dy = Number.isFinite(raw.dy) ? Math.max(-500, Math.min(500, Math.round(raw.dy))) : 0;
      return { op: 'look', dx, dy };
    }
    case 'wheel': {
      const delta = Number.isFinite(raw.delta) ? Math.max(-5, Math.min(5, Math.round(raw.delta)))
        : Number.isFinite(raw.clicks) ? Math.max(-5, Math.min(5, Math.round(raw.clicks))) : -1;
      return { op: 'wheel', delta };
    }
    case 'drag': {
      const x1 = Number.isFinite(raw.x1) ? clampCoord(raw.x1) : 400;
      const y1 = Number.isFinite(raw.y1) ? clampCoord(raw.y1) : 500;
      const x2 = Number.isFinite(raw.x2) ? clampCoord(raw.x2) : 600;
      const y2 = Number.isFinite(raw.y2) ? clampCoord(raw.y2) : 500;
      return { op: 'drag', x1, y1, x2, y2, duration_ms: ms };
    }
    case 'wait': {
      return { op: 'wait', duration_ms: Math.max(0, Math.min(3000, parseInt(raw.duration_ms, 10) || 150)) };
    }
    case 'type': case 'type_text': {
      const text = String(raw.text || raw.target || '').slice(0, 120);
      if (!text) return null;
      return { op: 'type', text };
    }
    default:
      return null;
  }
}

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
## NAME ENTRY (any game, any name/nickname/profile field)
If the screen shows a name field (Welcome screen, "enter your player name",
"Name:" label, nickname box, profile setup): the field OWNS this tick.
1. Double-click the name field to select any existing text, then type_text "${getPlayerNameCandidate(0)}" (attempt 1).
2. If the previous tick already typed a name and the screen did not advance,
   the game rejected it: use the next variation in order ${PLAYER_NAME_CANDIDATES.join(' -> ')} -> VCW_Player2, VCW_Player3, ... (sanitized [A-Za-z0-9_], max 16 chars, never repeat a failed name).
3. After typing, press_key enter, then click Save/Confirm/Continue (bottom of the dialog).
4. Never leave a name screen with the field empty, and never stall on it doing movement keys.
## VISION NOTES
${p.visionHints || 'Aim center-screen, follow exits and markers, shoot visible enemies.'}
Coordinates are 0-1000 normalized (500,500 = screen center, crosshair home).

## RECENT ACTIONS (do NOT repeat a failing move)
${history}

## TASK - respond ONLY with JSON, exactly:
{
  "status": "menu | playing | combat | puzzle | loading | dead | stuck | unknown",
  "reasoning": "one short sentence: what you see and why this input",
  "urgency": "low | normal | high",
  "action": {
    "type": "combo | hold_keys | press_key | click | right_click | double_click | move_mouse | drag_look | wheel | wait",
    "target": "hold_keys: comma keys like 'w,shift'. press_key: key like 'e'. click/right_click/double_click/move_mouse: 'x,y'. drag_look: 'dx,dy'. wait: ''. combo: short label like 'w+look+fire+jump'",
    "duration_ms": 350,
    "params": { "keys": ["w"], "key": "e", "x": 500, "y": 500, "dx": 120, "dy": 0 }
  }
}
CHAINED MOVES (combo) - prefer ONE combo over several single ticks when the
situation needs simultaneous inputs. Combo steps run inside a single fast
window (holds open first, mouse/clicks/jump overlap them):
{
  "type": "combo",
  "target": "advance+scan+fire+jump",
  "duration_ms": 650,
  "params": { "steps": [
    { "op": "hold_keys", "keys": ["w"], "duration_ms": 600 },
    { "op": "look", "dx": 120, "dy": 0 },
    { "op": "click", "x": 500, "y": 500, "button": "left" },
    { "op": "press", "key": "space" }
  ] }
}
Step ops: hold_keys {keys,duration_ms} | hold {key,duration_ms} |
press {key} | click {x,y,button left|right|middle} |
right_click {x,y} | double_click {x,y} | move {x,y} | look {dx,dy} |
wheel {delta} | drag {x1,y1,x2,y2,duration_ms} | wait {duration_ms}.
Max 8 steps per combo. Example chains: "w + look + left-click + space jump",
"strafe + aim + right-click alt-fire", "sprint w,shift + steer + fire".
Rules:
- Combat visible? combo: hold w toward cover/enemy + drag_look to track + click center-ish on the enemy (fire), r to reload when idle-empty.
- Traveling? combo: hold_keys w,shift to sprint forward + drag_look dx +-120 to steer toward doors/light/markers + press space to jump gaps.
- Menu/pause/dead? press_key enter or escape, or click the highlighted button. Single actions are fine here.
- Prefer hold_keys over tiny taps for movement. Keep duration_ms 200-900 (combo total 300-1500).
- Set urgency high when enemies/muzzle flash/damage vignette fill the frame (tick goes fast); low on menus/loading (tick relaxes).
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
  if (type === 'combo') {
    // Chained move: normalize each step, clamp count + durations so one tick
    // stays real-time. Malformed steps are dropped, never fatal.
    const rawSteps = Array.isArray(params.steps) ? params.steps
      : Array.isArray(raw.steps) ? raw.steps : [];
    const steps = rawSteps.map(normalizeComboStep).filter(Boolean).slice(0, 8);
    if (!steps.length) {
      return { type: 'hold_keys', target: 'w', duration_ms: 400, params: { keys: ['w'] } };
    }
    const longestHold = steps.reduce((m, s) => (s.duration_ms ? Math.max(m, s.duration_ms) : m), 0);
    const label = String(target || steps.map((s) => s.op).join('+')).slice(0, 60);
    return {
      type, target: label,
      duration_ms: Math.max(150, Math.min(1500, parseInt(duration_ms, 10) || longestHold || 500)),
      params: { steps }
    };
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
    if (type === 'move_mouse') return { type, target: `${x},${y}`, duration_ms: 0, params: { x, y } };
    const button = ['left', 'right', 'middle'].includes(String(params.button || '').toLowerCase())
      ? String(params.button).toLowerCase() : 'left';
    return { type, target: `${x},${y}`, duration_ms: 0, params: { x, y, button } };
  }
  if (type === 'right_click' || type === 'double_click') {
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
      urgency: ['low', 'normal', 'high'].includes(String(data.urgency || '').toLowerCase())
        ? String(data.urgency).toLowerCase() : undefined,
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
    case 'combo': {
      const steps = Array.isArray(action.params?.steps) ? action.params.steps : [];
      if (!steps.length) return null;
      return ['combo', JSON.stringify({ steps })];
    }
    case 'click': {
      const x = action.params?.x ?? 500;
      const y = action.params?.y ?? 500;
      const button = String(action.params?.button || 'left').toLowerCase();
      // input_sim.py has dedicated right/middle/double verbs; route through
      // them so the click lands with the correct OS button in one spawn.
      if (button === 'right') return ['right_click', String(x), String(y)];
      if (button === 'middle') return ['middle_click', String(x), String(y)];
      return ['click', String(x), String(y)];
    }
    case 'right_click': {
      const x = action.params?.x ?? 500;
      const y = action.params?.y ?? 500;
      return ['right_click', String(x), String(y)];
    }
    case 'double_click': {
      const x = action.params?.x ?? 500;
      const y = action.params?.y ?? 500;
      return ['double_click', String(x), String(y)];
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
  PLAYER_NAME_CANDIDATES,
  sanitizePlayerName,
  getPlayerNameCandidate,
  buildNativeGamePrompt,
  normalizeNativeAction,
  normalizeComboStep,
  parseNativeDecision,
  decideNativeActionViaDeepSeek,
  toInputSimArgs
};
