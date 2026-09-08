/** Local, bounded policy for a user-selected native game window. */
const FPS_TITLES = /half[- ]?life|portal|source|doom|quake|unreal|fps|shooter/i;
const PEGGLE_TITLES = /peggle/i;

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
  reset() { this.title = ''; this.tick = 0; this.startupTick = 0; this.previous = 0; this.last = null; this.lastFrame = 0; this.still = 0; this.arms = new Map(); }
  setTarget(title) { if (title !== this.title) { this.reset(); this.title = title || ''; } }
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
      ['advance', () => action('hold_keys', 'w,shift', 650, 'FPS route: advance while sprinting.', { keys: ['w', 'shift'] })],
      ['scan', () => action('move_mouse', this.tick % 2 ? '420,500' : '580,500', 0, 'FPS route: scan for a target or exit.', { x: this.tick % 2 ? 420 : 580, y: 500 })],
      ['interact', () => action('press_key', 'e', 0, 'FPS route: use the nearby object.', { key: 'e' })],
      ['jump', () => action('hold_keys', 'w,space', 350, 'FPS route: advance and jump over an obstacle.', { keys: ['w', 'space'] })],
      ['strafe', () => action('hold_keys', this.tick % 2 ? 'w,a' : 'w,d', 450, 'FPS route: vary the route with a diagonal strafe.', { keys: this.tick % 2 ? ['w', 'a'] : ['w', 'd'] })],
      ['fire', () => action('click', '500,500', 0, 'FPS route: fire at the crosshair.', { x: 500, y: 500 })],
      ['reload', () => action('press_key', 'r', 0, 'FPS route: reload weapon.', { key: 'r' })]
    ] : [
      ['confirm', () => action('press_key', 'enter', 0, 'Generic route: confirm focused state.', { key: 'enter' })],
      ['move', () => action('hold_keys', this.tick % 2 ? 'a' : 'd', 350, 'Generic route: probe lateral movement.', { keys: [this.tick % 2 ? 'a' : 'd'] })],
      ['action', () => action('press_key', 'space', 0, 'Generic route: trigger primary action.', { key: 'space' })],
      ['click', () => action('click', '500,500', 0, 'Generic route: activate center target.', { x: 500, y: 500 })]
    ];
    const exploration = Math.random() < 0.22;
    let selected = options[0];
    if (exploration) selected = options[Math.floor(Math.random() * options.length)];
    else selected = options.reduce((best, item) => this.score(item[0]) > this.score(best[0]) ? item : best);
    if (!this.arms.has(selected[0])) this.arms.set(selected[0], { n: 0, reward: 0 });
    this.last = selected[0];
    return selected[1]();
  }
  score(name) { const a = this.arms.get(name); return a ? a.reward / Math.max(1, a.n) : 0; }
  summary() { return Object.fromEntries([...this.arms].map(([name, a]) => [name, { attempts: a.n, reward: Number(a.reward.toFixed(2)) }])); }
}
module.exports = { NativeGameDirector };
