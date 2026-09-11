/**
 * Overtake reflex director.
 *
 * This is deliberately a small, deterministic control loop.  A remote model
 * is useful for discovering an unfamiliar game, but a round trip is much too
 * slow for steering around a car that is already in front of the player.
 * The director consumes only the game's public QA telemetry and produces the
 * same normal action schema as BRAID. Bit masks make the lane hazard scan
 * allocation-free and cheap enough to run on every agent tick.
 */

const LANE_LEFT = 1;
const LANE_CENTER = 2;
const LANE_RIGHT = 4;
const ALL_LANES = LANE_LEFT | LANE_CENTER | LANE_RIGHT;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function laneMask(x) {
  return x < -0.34 ? LANE_LEFT : x > 0.34 ? LANE_RIGHT : LANE_CENTER;
}
function laneCenter(mask) {
  if (mask === LANE_LEFT) return -0.67;
  if (mask === LANE_RIGHT) return 0.67;
  return 0;
}
function laneKey(mask) {
  return mask === LANE_LEFT ? 'arrowleft' : mask === LANE_RIGHT ? 'arrowright' : 'arrowup';
}

function analyze(snapshot = {}) {
  const playerX = Number(snapshot.playerX) || 0;
  const playerPosition = Number(snapshot.playerPosition) || 0;
  let hazards = 0;
  let pickups = 0;
  for (const item of snapshot.traffic || []) {
    const delta = Number(item.distanceAhead);
    if (!Number.isFinite(delta) || delta < -20 || delta > 280) continue;
    const bit = laneMask(Number(item.x) || 0);
    // Close rivals block a lane. Far traffic is still a soft hazard, so it is
    // included here and the target selection prefers the most open lane.
    if (item.kind === 'powerup') pickups |= bit;
    else hazards |= bit;
  }
  return { playerLane: laneMask(playerX), hazards: hazards & ALL_LANES, pickups: pickups & ALL_LANES };
}

function chooseOpenLane(playerLane, hazards, pickups) {
  const safe = (~hazards) & ALL_LANES;
  // A safe power-up lane wins. The bitwise mask intentionally retains only
  // the three physical lanes, even though JS bitwise values are signed ints.
  const reward = safe & pickups;
  if (reward & LANE_CENTER) return LANE_CENTER;
  if (reward & LANE_LEFT) return LANE_LEFT;
  if (reward & LANE_RIGHT) return LANE_RIGHT;
  if (safe & playerLane) return playerLane;
  if (safe & LANE_CENTER) return LANE_CENTER;
  if (safe & LANE_LEFT) return LANE_LEFT;
  if (safe & LANE_RIGHT) return LANE_RIGHT;
  return playerLane;
}

function decideOvertake(snapshot = {}) {
  const mode = String(snapshot.mode || '').toLowerCase();
  if (mode === 'menu' || mode === 'paused' || mode === 'complete') {
    return { status: mode || 'menu', urgency: 'low', reasoning: 'Overtake reflex: menu/recovery state; start or restart the route.', reasoning_path: ['S', 'Yes', 'R_RESTART'], action: { type: 'press_key', target: mode === 'paused' ? 'p' : 'r', duration_ms: 45 }, next_delay_ms: 150 };
  }
  if (mode === 'countdown') {
    return { status: 'playing', urgency: 'high', reasoning: 'Overtake reflex: countdown; hold acceleration.', reasoning_path: ['S', 'No', 'R_PLAY'], action: { type: 'hold_keys', target: 'arrowup', duration_ms: 180, params: { keys: ['arrowup'] } }, next_delay_ms: 90 };
  }
  if (mode !== 'race') return null;

  const state = analyze(snapshot);
  const targetLane = chooseOpenLane(state.playerLane, state.hazards, state.pickups);
  const targetX = laneCenter(targetLane);
  const x = Number(snapshot.playerX) || 0;
  const steer = targetX - x;
  const keys = ['arrowup'];
  if (steer < -0.12) keys.push('arrowleft');
  if (steer > 0.12) keys.push('arrowright');
  const nitro = Number(snapshot.nitro) || 0;
  // Boost only when the current lane is safe and the gauge has enough charge.
  // The target lane may differ from the current lane while overtaking; the
  // boost is safe when that destination is clear, not merely when the car's
  // departing lane happens to be clear.
  if ((state.hazards & targetLane) === 0 && nitro >= 0.28) keys.push('n');
  const duration = clamp(state.hazards ? 105 : 165, 80, 180);
  return {
    status: 'playing', urgency: 'high',
    reasoning: `Overtake reflex: lanes hazards=${state.hazards.toString(2).padStart(3, '0')}, target=${laneKey(targetLane)}.`,
    reasoning_path: ['S', 'No', 'No', 'R_PLAY', 'OVERTAKE_REFLEX'],
    action: { type: 'hold_keys', target: keys.join(','), duration_ms: duration, params: { keys } },
    next_delay_ms: 80
  };
}

module.exports = { LANE_LEFT, LANE_CENTER, LANE_RIGHT, analyze, decideOvertake };
