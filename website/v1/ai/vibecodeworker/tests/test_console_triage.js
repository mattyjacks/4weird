'use strict';
const assert = require('assert');
const { triageConsoleMessage, sameSite } = require('../lib/console_triage');

assert.strictEqual(sameSite('https://builds.crazygames.com/a.js', 'https://www.crazygames.com/game/x'), true);
assert.strictEqual(sameSite('https://ads.example.test/a.js', 'https://www.crazygames.com/game/x'), false);
assert.strictEqual(triageConsoleMessage({ level: 3, message: 'Speech recognition error: network', sourceId: 'https://taglish-translate.vercel.app/script.js', targetUrl: 'https://taglish-translate.vercel.app/' }).actionable, true);
assert.strictEqual(triageConsoleMessage({ level: 2, message: 'No available adapters.', sourceId: 'https://www.crazygames.com/game/x', targetUrl: 'https://www.crazygames.com/game/x' }).category, 'environment');
assert.strictEqual(triageConsoleMessage({ level: 3, message: 'vendor failed', sourceId: 'https://ads.example.test/a.js', targetUrl: 'https://www.crazygames.com/game/x' }).category, 'third-party');
console.log('PASS console triage');
