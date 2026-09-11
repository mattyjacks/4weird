/**
 * Plain-node unit tests for the per-game rules resolver
 * (src/modules/game_rules.js). No Electron needed — run:
 *   node tests/test_game_rules.js   (from website/v1/ai/vibecodeworker)
 */
const assert = require('assert');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const rules = require(path.join(projectRoot, 'src', 'modules', 'game_rules'));

const site = rules.findWebsiteV1Dir();
assert.ok(site, 'website v1 dir should resolve, got: ' + site);
console.log('website dir:', site);

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`PASS  ${name}`);
}

// 1. aiwhackamole: game_meta.json wins, sections present.
check('aiwhackamole resolves from game_meta.json', () => {
  const dir = path.join(site, 'games', 'html', 'aiwhackamole');
  const res = rules.resolveFileGameRules(dir);
  assert.ok(res.sources.includes('game_meta.json'), 'sources: ' + res.sources.join(','));
  assert.ok(/whack/i.test(res.text), 'mentions whacking');
  assert.ok(/bad/i.test(res.text) && /good/i.test(res.text), 'covers Bad vs Good AIs');
  assert.ok(/60-second|objective/i.test(res.text), 'has objective/timer');
  assert.ok(/avoid/i.test(res.text), 'has avoid line');
});

// 2. orbitaldrift: existing meta file still works.
check('orbitaldrift resolves from game_meta.json', () => {
  const dir = path.join(site, 'games', 'html', 'orbitaldrift');
  const res = rules.resolveFileGameRules(dir);
  assert.ok(res.sources.includes('game_meta.json'));
  assert.ok(/asteroid/i.test(res.text), 'mentions asteroids');
});

// 3. game.json fallback: a game WITHOUT game_meta.json still yields rules.
check('game without meta falls back to game.json', () => {
  const dir = path.join(site, 'games', 'html', 'template-demo');
  const res = rules.resolveFileGameRules(dir);
  assert.ok(res.text.length > 0, 'expected fallback text from game.json');
  assert.ok(res.sources.includes('game.json'), 'sources: ' + res.sources.join(','));
});

// 4. Unknown dir: documented generic fallback.
check('unknown dir yields generic fallback', () => {
  const res = rules.resolveFileGameRules(path.join(site, 'games', 'html', 'no-such-game'));
  assert.strictEqual(res.text, '');
  assert.deepStrictEqual(res.sources, []);
});

// 5. URL mapping: file:// and catalog http:// URLs resolve to the same dir.
check('file:// and catalog URLs map to the same game dir', () => {
  const expected = path.join(site, 'games', 'html', 'aiwhackamole');
  const viaFile = rules.gameDirFromUrl('file:///' + expected.replace(/\\/g, '/') + '/index.html');
  const viaHttp = rules.gameDirFromUrl('http://127.0.0.1:8888/games/html/aiwhackamole/index.html');
  assert.strictEqual(path.normalize(viaFile), path.normalize(expected));
  assert.strictEqual(path.normalize(viaHttp), path.normalize(expected));
});

// 6. file:// URL for a game outside the catalog still resolves.
check('arbitrary file:// URL resolves when present', () => {
  const dir = rules.gameDirFromUrl('file:///' + path.join(site, 'games', 'html', 'kouzi', 'index.html').replace(/\\/g, '/'));
  assert.ok(dir.endsWith('kouzi'), 'got: ' + dir);
});

// 7. mergeRules appends only fresh lines.
check('mergeRules dedupes enrichment', () => {
  const base = 'Objective: Whack Bad AIs';
  const merged = rules.mergeRules(base, 'Objective: Whack Bad AIs\nTips: Read bubbles first');
  assert.ok(/Read bubbles/.test(merged), merged);
  assert.strictEqual(merged.split('\n').filter((l) => /whack bad/i.test(l)).length, 1);
});

// 8. formatPageRules honors <meta name="game-rules"> + rules link + sections.
check('formatPageRules formats scrape payload', () => {
  const seen = new Set();
  const res = rules.formatPageRules({
    meta: 'Whack Bad AIs only',
    link: 'Full rules -> file:///rules.html',
    sections: ['How to play: click moles as they pop up from holes.']
  }, seen);
  assert.ok(/Whack Bad AIs/.test(res.text));
  assert.ok(/rules\.html/.test(res.text));
  assert.ok(/click moles/.test(res.text));
  assert.ok(res.sources.length >= 2, 'sources: ' + res.sources.join(','));
});

console.log(`\n[game-rules] ${passed}/8 unit tests passed.`);
