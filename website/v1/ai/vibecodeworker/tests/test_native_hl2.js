/**
 * Native game player tests: any-game profiles + DeepSeek harness vision path.
 * Run: node test_native_hl2.js
 * Offline-safe: vision decisions use a mocked brain.callLLM (no network).
 */
const assert = require('assert');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

const { resolveGameProfile, getProfile, listProfiles, registerGameProfile } = require(path.join(projectRoot, 'src', 'runtime', 'native_game_profiles'));
const player = require(path.join(projectRoot, 'src', 'runtime', 'native_game_player'));
const { NativeGameDirector } = require(path.join(projectRoot, 'src', 'runtime', 'native_game_director'));

async function runTests() {
  console.log('=== NATIVE GAME PLAYER TESTS (HL2 demo of play-any-game) ===');
  const failed = [];

  try {
    console.log('Test 1: HL2 Episode Two resolves from any HL2 query...');
    assert.strictEqual(resolveGameProfile('Half-Life 2').id, 'hl2-ep2');
    assert.strictEqual(resolveGameProfile('HALF-LIFE 2: Episode Two').id, 'hl2-ep2');
    assert.strictEqual(resolveGameProfile('hl2').id, 'hl2-ep2');
    assert.strictEqual(resolveGameProfile('hl2.exe').id, 'hl2-ep2');
    assert.strictEqual(resolveGameProfile('hl2-ep2').id, 'hl2-ep2');
    assert.strictEqual(resolveGameProfile('Peggle Deluxe').id, 'peggle-deluxe');
    assert.strictEqual(resolveGameProfile('peggle.exe').id, 'peggle-deluxe');
    const hl2 = getProfile('hl2-ep2');
    assert(hl2.controls.forward === 'w' && hl2.controls.use === 'e' && hl2.controls.reload === 'r');
    assert(hl2.goal.length > 20);
    console.log('PASS Test 1');
  } catch (e) { console.error('FAIL Test 1:', e.message); failed.push('profiles.hl2'); }

  try {
    console.log('Test 2: any-game fallback registry...');
    assert.strictEqual(resolveGameProfile('Doom Eternal').genre, 'fps');
    assert.strictEqual(resolveGameProfile('Some Random Indie Game XYZ').id, 'generic-game');
    assert(listProfiles().some((p) => p.id === 'hl2-ep2'));
    registerGameProfile({ id: 'demo-custom', name: 'Demo Custom', windowTitlePatterns: [/demo custom/i] });
    assert.strictEqual(resolveGameProfile('Demo Custom Deluxe').id, 'demo-custom');
    console.log('PASS Test 2');
  } catch (e) { console.error('FAIL Test 2:', e.message); failed.push('profiles.generic'); }

  try {
    console.log('Test 3: prompt builder carries profile + history + stuck...');
    const prompt = player.buildNativeGamePrompt({
      profile: getProfile('hl2-ep2'),
      recentActions: [{ type: 'hold_keys', target: 'w,shift' }],
      stuck: true,
      extraRules: 'test rules'
    });
    assert(prompt.includes('Half-Life 2: Episode Two'));
    assert(prompt.includes('STUCK WARNING'));
    assert(prompt.includes('w,shift'));
    assert(prompt.includes('JSON ONLY') || prompt.includes('ONLY with JSON'));
    console.log('PASS Test 3');
  } catch (e) { console.error('FAIL Test 3:', e.message); failed.push('player.prompt'); }

  try {
    console.log('Test 4: action normalization clamps safely...');
    assert.deepStrictEqual(player.normalizeNativeAction({ type: 'click', params: { x: 9999, y: -5 } }).params, { x: 1000, y: 0, button: 'left' });
    assert.deepStrictEqual(player.normalizeNativeAction({ type: 'hold_keys', target: 'W, SHIFT' }).params, { keys: ['w', 'shift'] });
    assert.deepStrictEqual(player.normalizeNativeAction({ type: 'drag_look', target: '999,999' }).params, { dx: 500, dy: 500 });
    assert.strictEqual(player.normalizeNativeAction({ type: 'nonsense' }).type, 'hold_keys');
    assert.deepStrictEqual(player.toInputSimArgs({ type: 'drag_look', params: { dx: 120, dy: -30 } }), ['look', '120', '-30']);
    assert.deepStrictEqual(player.toInputSimArgs({ type: 'hold_keys', params: { keys: ['w', 'shift'] }, duration_ms: 650 }), ['hold_keys', 'w,shift', '650']);
    assert.deepStrictEqual(player.toInputSimArgs({ type: 'click', params: { x: 500, y: 500 } }), ['click', '500', '500']);
    assert.strictEqual(player.toInputSimArgs({ type: 'wait' }), null);
    console.log('PASS Test 4');
  } catch (e) { console.error('FAIL Test 4:', e.message); failed.push('player.normalize'); }

  try {
    console.log('Test 5: DeepSeek harness vision decision (mocked LLM)...');
    const calls = [];
    const mockBrain = {
      config: { provider: 'deepseek', modelName: 'deepseek-auto' },
      callLLM: async (prompt, shot) => {
        calls.push({ prompt, shotLen: String(shot).length });
        return { status: 'combat', reasoning: 'Enemy center-screen, firing.', action: { type: 'click', target: '500,480', params: { x: 500, y: 480 } } };
      }
    };
    const decision = await player.decideNativeActionViaDeepSeek(mockBrain, {
      screenshotBase64: Buffer.from('fake-frame').toString('base64'),
      windowTitle: 'Half-Life 2',
      recentActions: []
    });
    assert.strictEqual(decision.profile, 'hl2-ep2');
    assert.strictEqual(decision.action.type, 'click');
    assert(calls[0].prompt.includes('Half-Life 2'));
    assert.strictEqual(mockBrain.config.modelName, 'deepseek-auto', 'model override must restore');
    // String-JSON tolerant parse
    const parsed = player.parseNativeDecision('noise {"status":"playing","reasoning":"go","action":{"type":"press_key","target":"e"}} tail');
    assert.strictEqual(parsed.action.target, 'e');
    console.log('PASS Test 5');
  } catch (e) { console.error('FAIL Test 5:', e.message); failed.push('player.vision'); }

  try {
    console.log('Test 6: deepseek_harness.decideNativeGameAction entry point...');
    const { decideNativeGameAction } = require(path.join(projectRoot, 'lib', 'deepseek_harness'));
    const mockBrain = {
      config: { provider: 'deepseek', modelName: 'deepseek-auto' },
      callLLM: async () => ({ status: 'playing', reasoning: 'Advancing.', action: { type: 'hold_keys', target: 'w,shift', duration_ms: 650 } })
    };
    const d = await decideNativeGameAction(mockBrain, {
      screenshotBase64: Buffer.from('frame').toString('base64'),
      windowTitle: 'Half-Life 2'
    });
    assert.strictEqual(d.profile, 'hl2-ep2');
    assert.strictEqual(d.action.params.keys.join(','), 'w,shift');
    console.log('PASS Test 6');
  } catch (e) { console.error('FAIL Test 6:', e.message); failed.push('harness.native'); }

  try {
    console.log('Test 7: offline bandit still works for HL2 titles...');
    const director = new NativeGameDirector();
    director.setTarget('Half-Life 2');
    const d = director.choose('frame-bytes');
    assert(d && d.action && typeof d.action.type === 'string');
    console.log('PASS Test 7');
  } catch (e) { console.error('FAIL Test 7:', e.message); failed.push('director.fallback'); }

  try {
    console.log('Test 8: Episode Two end-to-end play path (launch + startup + bridge)...');
    // Steam AppId wiring: CLI --launch must resolve to 420 for Episode Two.
    assert.strictEqual(getProfile('hl2-ep2').steamAppId, 420);
    assert.strictEqual(getProfile('peggle-deluxe').steamAppId, 3483);
    // Profile id as director target must still take the FPS route (not generic).
    const ep2Director = new NativeGameDirector();
    ep2Director.setTarget('hl2-ep2');
    const startup1 = ep2Director.chooseStartup('hl2-ep2', true);
    assert(startup1 && startup1.action.type === 'press_key', 'EP2 fresh run starts with Enter');
    const startup2 = ep2Director.chooseStartup('hl2-ep2', true);
    assert(startup2 && startup2.action.type === 'press_key', 'EP2 fresh run confirms difficulty');
    assert.strictEqual(ep2Director.chooseStartup('hl2-ep2', true), null, 'startup queue is exactly 2 steps');
    // Offline FPS bandit emits window-relative combos the bridge can run in one spawn.
    const offline = ep2Director.choose('ep2-frame-1');
    assert(offline && offline.action, 'offline director must return an action');
    const offlineArgs = player.toInputSimArgs(player.normalizeNativeAction(offline.action));
    assert(Array.isArray(offlineArgs) || offlineArgs === null, 'offline action must map to bridge argv or local wait');
    // Middle-mouse alt-fire routes to a dedicated bridge verb (not silent left-click).
    assert.deepStrictEqual(
      player.toInputSimArgs({ type: 'click', params: { x: 500, y: 500, button: 'middle' } }),
      ['middle_click', '500', '500']
    );
    assert.deepStrictEqual(
      player.normalizeNativeAction({ type: 'combo', target: 'x', duration_ms: 500, params: { steps: [{ op: 'middle_click', x: 500, y: 500 }] } }).params.steps[0],
      { op: 'click', x: 500, y: 500, button: 'middle' }
    );
    // CLI parsing: --game hl2-ep2 --launch --steps N drives a live run.
    const { parseArgs } = require(path.join(projectRoot, 'scripts', 'node', 'run_hl2_playtest'));
    const parsed = parseArgs(['node', 'run_hl2_playtest.js', '--game', 'hl2-ep2', '--launch', '--steps', '200']);
    assert.strictEqual(parsed.game, 'hl2-ep2');
    assert.strictEqual(parsed.launch, true);
    assert.strictEqual(parsed.steps, 200);
    assert.strictEqual(parsed.newGame, true);
    assert.strictEqual(resolveGameProfile('hl2-ep2').id, 'hl2-ep2');
    console.log('PASS Test 8');
  } catch (e) { console.error('FAIL Test 8:', e.message); failed.push('hl2.ep2.e2e'); }

  try {
    console.log('Test 9: Xonotic takes the FPS route with a fire combo (single-kill capable)...');
    assert.strictEqual(resolveGameProfile('xonotic').id, 'xonotic');
    assert.strictEqual(resolveGameProfile('xonotic').genre, 'arena-fps');
    const xonDirector = new NativeGameDirector();
    xonDirector.setTarget('xonotic');
    const seen = new Set();
    for (let i = 0; i < 8; i += 1) {
      const d = xonDirector.choose(`xonotic-frame-${i}`);
      assert(d && d.action, 'xonotic director must return an action');
      seen.add(d.action.type);
    }
    assert(seen.has('combo') || seen.has('hold_keys'), 'xonotic must use FPS movement combos, not generic probes');
    const fireDirector = new NativeGameDirector();
    fireDirector.setTarget('xonotic');
    let fired = false;
    for (let i = 0; i < 8; i += 1) {
      const d = fireDirector.choose(`xonotic-kill-frame-${i}`);
      const argv = player.toInputSimArgs(player.normalizeNativeAction(d.action));
      const flat = JSON.stringify(argv || '');
      if (flat.includes('click') || flat.includes('500')) fired = true;
    }
    assert(fired, 'xonotic FPS route must emit a center-screen fire action within one route cycle');
    console.log('PASS Test 9');
  } catch (e) { console.error('FAIL Test 9:', e.message); failed.push('xonotic.fps.kill'); }

  try {
    console.log('Test 10: name-field intelligence (VibeCodeWorker first, variations, bridge-ready)...');
    assert.strictEqual(player.getPlayerNameCandidate(0), 'VibeCodeWorker');
    assert.strictEqual(player.getPlayerNameCandidate(1), 'VibeCodeWorker1');
    assert.strictEqual(player.getPlayerNameCandidate(2), 'VCW_Player');
    const later = player.getPlayerNameCandidate(99);
    assert(/^VCW_Player\d+$/.test(later), 'late attempts stay numbered, never repeat');
    assert.strictEqual(player.sanitizePlayerName('Bad Name!!##', 16), 'BadName');
    assert.strictEqual(player.sanitizePlayerName('VibeCodeWorkerSuperLongName', 16).length <= 16, true);
    // Combo steps can now carry typed text to the bridge in one spawn.
    const typed = player.normalizeNativeAction({ type: 'combo', target: 'name', duration_ms: 500, params: { steps: [{ op: 'type', text: 'VibeCodeWorker' }] } });
    assert.strictEqual(typed.params.steps[0].op, 'type');
    assert.strictEqual(typed.params.steps[0].text, 'VibeCodeWorker');
    // Director cycles focus -> type -> confirm -> save, advancing the candidate each round.
    const nameDirector = new NativeGameDirector();
    nameDirector.setTarget('xonotic');
    const n0 = nameDirector.chooseNameEntry('xonotic');
    assert.strictEqual(n0.action.type, 'double_click', 'name entry starts by focusing the field');
    const n1 = nameDirector.chooseNameEntry('xonotic');
    assert.strictEqual(n1.action.type, 'type_text');
    assert.strictEqual(n1.action.params.text, 'VibeCodeWorker');
    const n2 = nameDirector.chooseNameEntry('xonotic');
    assert.strictEqual(n2.action.type, 'press_key');
    const n3 = nameDirector.chooseNameEntry('xonotic');
    assert.strictEqual(n3.action.type, 'click', 'name entry ends the round on Save');
    const n4 = nameDirector.chooseNameEntry('xonotic');
    assert.strictEqual(n4.action.type, 'double_click');
    const n5 = nameDirector.chooseNameEntry('xonotic');
    assert.strictEqual(n5.action.params.text, 'VibeCodeWorker1', 'rejected names advance, never repeat');
    // Vision prompt teaches every game the same rule.
    const xonPrompt = player.buildNativeGamePrompt({ profile: getProfile('xonotic') });
    assert(xonPrompt.includes('VibeCodeWorker'), 'prompt names the first-try identity');
    assert(xonPrompt.includes('NAME ENTRY'), 'prompt carries the name-entry section');
    console.log('PASS Test 10');
  } catch (e) { console.error('FAIL Test 10:', e.message); failed.push('name.entry'); }

  if (failed.length) {
    console.error(`\n${failed.length} FAILED: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll native game player tests passed.');
}

if (require.main === module) runTests().catch((e) => { console.error(e); process.exit(1); });
module.exports = { runTests };
