const assert = require('assert');
const { decideOvertake } = require('../lib/brain/overtake_reflex');

function keys(s) { return s.action.params.keys; }
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS  ${name}`); }

check('starts a route from the menu', () => {
  const d = decideOvertake({ mode: 'menu' });
  assert.strictEqual(d.action.target, 'r');
});
check('keeps accelerating in a clear center lane', () => {
  const d = decideOvertake({ mode: 'race', playerX: 0, nitro: 0, traffic: [] });
  assert.deepStrictEqual(keys(d), ['arrowup']);
});
check('steers away from a close center rival', () => {
  const d = decideOvertake({ mode: 'race', playerX: 0, nitro: 0, traffic: [{ x: 0, distanceAhead: 45 }] });
  assert.ok(keys(d).includes('arrowleft') || keys(d).includes('arrowright'));
});
check('takes a safe nitro lane and boosts', () => {
  const d = decideOvertake({ mode: 'race', playerX: 0, nitro: 0.7, traffic: [{ x: 0, distanceAhead: 40 }, { x: -0.7, distanceAhead: 80, kind: 'powerup' }] });
  assert.ok(keys(d).includes('arrowleft'));
  assert.ok(keys(d).includes('n'));
});
console.log(`\n[overtake-reflex] ${passed}/4 unit tests passed.`);
