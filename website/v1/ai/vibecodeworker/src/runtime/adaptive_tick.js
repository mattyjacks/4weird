/**
 * Adaptive Tick Planner - urgency-aware scheduling + staggered screenshots.
 *
 * The old scheduler waited a fixed delay per action type (280-650ms) no
 * matter what was on screen. This module sizes each tick from three signals:
 *   1. What the brain just decided (action duration + status + urgency).
 *   2. What is happening on screen (frame-change rate across ticks).
 *   3. How long execution itself already took (never double-wait).
 *
 * Long actions (>=600ms holds/combos) also arm a mid-action screenshot probe
 * so a sudden combat frame can shorten the FOLLOW-UP tick instead of being
 * discovered a full slow tick later. Pure Node - safe to require in tests.
 */

const MIN_DELAY_MS = 200;
const MAX_DELAY_MS = 2500;

const HIGH_HINTS = /combat|enemy|enemies|boss|firing|fire at|muzzle|damage|hit points|low hp|health low|chase|attack/i;
const LOW_HINTS = /menu|loading|load screen|game over|paused|pause|dialog|inventory|settings|title screen|cutscene|cinematic/i;

function clampDelay(ms) {
  if (!Number.isFinite(ms)) return 650;
  return Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, Math.round(ms)));
}

// Explicit model urgency wins when valid; otherwise infer from status text.
function classifyUrgency({ status = '', reasoning = '', urgency = '' } = {}) {
  const explicit = String(urgency || '').toLowerCase();
  if (explicit === 'high' || explicit === 'low' || explicit === 'normal') return explicit;
  const text = `${status} ${reasoning}`;
  if (HIGH_HINTS.test(text)) return 'high';
  if (LOW_HINTS.test(text)) return 'low';
  const s = String(status || '').toLowerCase();
  if (s === 'combat') return 'high';
  if (s === 'menu' || s === 'loading' || s === 'game_over' || s === 'dead' || s === 'stuck') return 'low';
  return 'normal';
}

// Cheap frame-change level between two base64 frames: 0 identical, 1 small,
// 2 large. Hash equality matches the stuck detector; byte length adds a
// gradient so fast motion shortens the tick without any pixel decode.
function frameDeltaLevel(prev, curr) {
  if (!prev || !curr) return 1;
  if (prev.hash !== undefined || curr.hash !== undefined) {
    if (prev.hash === curr.hash) {
      const lenA = prev.bytes || 0;
      const lenB = curr.bytes || 0;
      if (lenA && lenB && Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.05) return 1;
      return 0;
    }
    const lenA = prev.bytes || 0;
    const lenB = curr.bytes || 0;
    if (lenA && lenB && Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.15) return 2;
    return 1;
  }
  // Raw base64 strings.
  if (prev === curr) return 0;
  const lenA = String(prev).length;
  const lenB = String(curr).length;
  if (lenA && lenB && Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.15) return 2;
  return 1;
}

function baseDelayForAction(action = {}) {
  const dur = Math.max(0, Number(action.duration_ms) || 0);
  switch (action.type) {
    case 'combo':
      // One spawn already; tick just past the overlap window.
      return (dur || 600) + 120;
    case 'hold_keys':
    case 'hold_key':
      return (dur || 400) + 150;
    case 'wait':
      return dur || 300;
    case 'refresh':
      return 1500;
    case 'click':
    case 'right_click':
    case 'double_click':
    case 'press_key':
      return 380;
    case 'move_mouse':
    case 'drag_look':
    case 'wheel':
    case 'scroll':
      return 300;
    case 'type_text':
      return 600;
    case 'bot_control':
      return 250;
    default:
      return 650;
  }
}

// Main entry: how long should the scheduler wait BEFORE the next tick?
function computeNextDelay({
  action = {},
  status = '',
  reasoning = '',
  urgency = '',
  llmDelay = NaN,
  execMs = 0,
  frameDelta = 1,
  stuck = false
} = {}) {
  const level = classifyUrgency({ status, reasoning, urgency });
  let delay = baseDelayForAction(action);

  // Urgency scales the tick: combat snaps (min 220ms), menus relax.
  if (level === 'high') delay = Math.max(220, delay * 0.55);
  else if (level === 'low') delay = Math.min(MAX_DELAY_MS, delay * 1.8);

  // Fast-changing frames + high urgency -> hurry. Static frames + low
  // urgency -> back off and save tokens.
  if (frameDelta >= 2 && level === 'high') delay -= 100;
  if (frameDelta === 0 && level === 'low') delay += 400;
  if (frameDelta === 0 && level === 'normal') delay += 150;

  // Blend the model's own next_delay_ms (30%) when sane - but urgency
  // caps the vote so a stale 1500ms ask cannot slow combat, and a 0ms ask
  // cannot spin menus into a token firehose.
  let llm = Number(llmDelay);
  if (Number.isFinite(llm) && llm > 0) {
    if (level === 'high') llm = Math.min(llm, 600);
    else if (level === 'low') llm = Math.max(llm, 900);
    delay = delay * 0.7 + clampDelay(llm) * 0.3;
  }

  if (stuck) delay = Math.min(delay, 500);

  // Execution already consumed wall time - never double-wait it.
  delay -= Math.max(0, Number(execMs) || 0);
  return clampDelay(delay);
}

// Long actions get a staggered mid-action screenshot so urgency changes
// surface early. Returns { probe: bool, probeDelayMs }.
function midProbePlan(action = {}) {
  const dur = Number(action.duration_ms) || 0;
  const longType = action.type === 'combo' || action.type === 'hold_keys' ||
    action.type === 'hold_key' || action.type === 'wait';
  if (!longType || dur < 600) return { probe: false, probeDelayMs: 0 };
  // Probe halfway through, capped so the follow-up tick stays real-time.
  return { probe: true, probeDelayMs: Math.min(800, Math.round(dur / 2)) };
}

function shouldProbeMidAction(action = {}) {
  return midProbePlan(action).probe;
}

// Screenshot budget hint per urgency: high keeps full detail (combat needs
// pixels), low shrinks to save tokens on static menus.
function screenshotBudget(urgency = 'normal') {
  if (urgency === 'high') return { width: 512, quality: 50 };
  if (urgency === 'low') return { width: 384, quality: 40 };
  return { width: 512, quality: 50 };
}

module.exports = {
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  classifyUrgency,
  frameDeltaLevel,
  baseDelayForAction,
  computeNextDelay,
  midProbePlan,
  shouldProbeMidAction,
  screenshotBudget
};
