/** Local, bounded policy for a user-selected native game window. */
const FPS_TITLES = /half[- ]?life|portal|source|doom|quake|unreal|fps|shooter|combine|antlion|alyx|hl2|ep2|episode|xonotic|arena/i;
const PEGGLE_TITLES = /peggle/i;

// Name-field geometry per profile (0-1000 normalized). Xonotic's Welcome
// dialog: Name input left-center, Save settings bottom-center.
const NAME_FIELD_GEOMETRY = {
  xonotic: { field: { x: 380, y: 460 }, save: { x: 500, y: 895 } },
  default: { field: { x: 500, y: 400 }, save: { x: 500, y: 850 } }
};
function nameGeometryFor(profileId) {
  return NAME_FIELD_GEOMETRY[profileId] || NAME_FIELD_GEOMETRY.default;
}

function fingerprint(frame = '') {
  let h = 2166136261;
  const stride = Math.max(1, Math.floor(frame.length / 160));
  for (let i = 0; i < frame.length; i += stride) { h ^= frame.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function action(type, target, duration_ms, reasoning, params = {}) {
  return { action: { type, target, duration_ms, params }, reasoning, status: 'native-policy' };
}

class NativeGameDirector {
  constructor() { this.reset(); }
  reset() { this.title = ''; this.tick = 0; this.startupTick = 0; this.previous = 0; this.last = null; this.lastFrame = 0; this.still = 0; this.fpsCycle = 0; this.arms = new Map(); this.nameAttempt = 0; this.nameStep = 0; }
  setTarget(title) { if (title !== this.title) { this.reset(); this.title = title || ''; } }
  // Intelligent name entry: one action per call, 4-step cycle per candidate
  // (focus field -> type candidate -> confirm -> save). Each full cycle
  // advances to the next variation so a rejected name is never retried.
  chooseNameEntry(profileId = '') {
    let candidate = 'VibeCodeWorker';
    try {
      const player = require('./native_game_player');
      candidate = player.getPlayerNameCandidate(this.nameAttempt);
    } catch (_) { candidate = `VibeCodeWorker${this.nameAttempt > 0 ? this.nameAttempt : ''}`; }
    const geo = nameGeometryFor(profileId);
    const phase = this.nameStep % 4;
    this.nameStep++;
    if (phase === 3 && this.nameStep % 4 === 0) this.nameAttempt++;
    if (phase === 0) {
      return action('double_click', `${geo.field.x},${geo.field.y}`, 0, `Name entry: focus the name field for "${candidate}" (attempt ${this.nameAttempt + 1}).`, { x: geo.field.x, y: geo.field.y });
    }
    if (phase === 1) {
      return { action: { type: 'type_text', target: candidate, duration_ms: 0, params: { text: candidate } }, reasoning: `Name entry: type "${candidate}" (attempt ${this.nameAttempt + 1}; sanitized, never a repeat).`, status: 'native-policy' };
    }
    if (phase === 2) {
      return action('press_key', 'enter', 0, `Name entry: confirm "${candidate}" with Enter.`, { key: 'enter' });
    }
    return action('click', `${geo.save.x},${geo.save.y}`, 0, `Name entry: click Save/Confirm for "${candidate}" then advance; next rejection tries a new variation.`, { x: geo.save.x, y: geo.save.y });
  }
  chooseStartup(profileId, startFresh = false) {
    if (profileId === 'peggle-deluxe' && startFresh && this.startupTick === 0) {
      this.startupTick++;
      return action('press_key', 'enter', 0, 'Peggle startup: begin the selected fresh Adventure game.', { key: 'enter' });
    }
    if (profileId !== 'hl2-ep2' || !startFresh || this.startupTick >= 2) return null;
    this.startupTick++;
    if (this.startupTick === 1) {
      return action('press_key', 'enter', 0, 'Episode Two startup: New Game is selected, so begin a fresh campaign.', { key: 'enter' });
    }
    return action('press_key', 'enter', 0, 'Episode Two startup: accept the default difficulty and continue into the new campaign.', { key: 'enter' });
  }
  choose(frame) {
    const current = fingerprint(frame);
    this.still = current === this.previous ? this.still + 1 : 0;
    if (this.last && this.arms.has(this.last)) { const arm = this.arms.get(this.last); arm.n++; arm.reward += current !== this.lastFrame ? 1 : -0.25; }
    this.previous = current; this.lastFrame = current; this.tick++;
    if (this.still >= 3) { this.still = 0; this.last = 'recovery'; return action('press_key', 'escape', 0, 'Recovery: clear a pause/menu state.', { key: 'escape' }); }
    const fps = FPS_TITLES.test(this.title);
    const peggle = PEGGLE_TITLES.test(this.title);
    const options = peggle ? [
      ['start', () => action('press_key', 'enter', 0, 'Peggle startup: confirm the highlighted menu or next level.', { key: 'enter' })],
      ['aim-left', () => action('click', '370,300', 0, 'Peggle shot: aim into the left-side peg cluster.', { x: 370, y: 300 })],
      ['aim-center', () => action('click', '500,280', 0, 'Peggle shot: aim at the central high-value cluster.', { x: 500, y: 280 })],
      ['aim-right', () => action('click', '630,300', 0, 'Peggle shot: aim into the right-side peg cluster.', { x: 630, y: 300 })],
      ['wait-ball', () => action('wait', '', 900, 'Peggle: let the launched ball finish resolving before choosing another shot.')]
    ] : fps ? [
      ['advance', () => action('combo', 'sprint+scan', 650, 'FPS route: sprint forward while scanning for exits.', { steps: [
        { op: 'hold_keys', keys: ['w', 'shift'], duration_ms: 600 },
        { op: 'look', dx: this.tick % 2 ? -120 : 120, dy: 0 }
      ] })],
      ['scan', () => action('move_mouse', this.tick % 2 ? '420,500' : '580,500', 0, 'FPS route: scan for a target or exit.', { x: this.tick % 2 ? 420 : 580, y: 500 })],
      ['interact', () => action('press_key', 'e', 0, 'FPS route: use the nearby object.', { key: 'e' })],
      ['jump', () => action('combo', 'advance+jump', 450, 'FPS route: sprint forward and jump the obstacle.', { steps: [
        { op: 'hold_keys', keys: ['w'], duration_ms: 400 },
        { op: 'press', key: 'space' }
      ] })],
      ['strafe', () => action('hold_keys', this.tick % 2 ? 'w,a' : 'w,d', 450, 'FPS route: vary the route with a diagonal strafe.', { keys: this.tick % 2 ? ['w', 'a'] : ['w', 'd'] })],
      ['fire', () => action('combo', 'track+fire', 500, 'FPS route: track center-screen threat and fire.', { steps: [
        { op: 'look', dx: 60, dy: 0 },
        { op: 'click', x: 500, y: 500, button: 'left' }
      ] })],
      ['reload', () => action('press_key', 'r', 0, 'FPS route: reload weapon.', { key: 'r' })]
    ] : [
      ['confirm', () => action('press_key', 'enter', 0, 'Generic route: confirm focused state.', { key: 'enter' })],
      ['move', () => action('hold_keys', this.tick % 2 ? 'a' : 'd', 350, 'Generic route: probe lateral movement.', { keys: [this.tick % 2 ? 'a' : 'd'] })],
      ['action', () => action('press_key', 'space', 0, 'Generic route: trigger primary action.', { key: 'space' })],
      ['click', () => action('click', '500,500', 0, 'Generic route: activate center target.', { x: 500, y: 500 })]
    ];
    // The offline vision fallback has no semantic frame understanding.  A
    // bandit therefore tends to reward a zero-effect mouse scan and repeats
    // it forever.  For FPS games use a bounded route that always includes
    // movement and interaction; the normal still-frame recovery above still
    // sends Escape when the game appears paused or otherwise stuck.
    let selected = options[0];
    if (fps) {
      const route = ['advance', 'strafe', 'interact', 'advance', 'jump', 'fire', 'advance', 'reload'];
      const next = route[this.fpsCycle % route.length];
      this.fpsCycle++;
      selected = options.find(([name]) => name === next) || options[0];
    } else {
      const exploration = Math.random() < 0.22;
      if (exploration) selected = options[Math.floor(Math.random() * options.length)];
      else selected = options.reduce((best, item) => this.score(item[0]) > this.score(best[0]) ? item : best);
    }
    if (!this.arms.has(selected[0])) this.arms.set(selected[0], { n: 0, reward: 0 });
    this.last = selected[0];
    return selected[1]();
  }
  score(name) { const a = this.arms.get(name); return a ? a.reward / Math.max(1, a.n) : 0; }
  summary() { return Object.fromEntries([...this.arms].map(([name, a]) => [name, { attempts: a.n, reward: Number(a.reward.toFixed(2)) }])); }
}
module.exports = { NativeGameDirector };
