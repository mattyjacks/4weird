/**
 * ElevenLabs voice layer + PCM audio QA tests (offline-first).
 * Network calls are mocked; PCM math, voice commands, NPC packs,
 * subtitle drift, stereo diffs, key storage, prompt blocks, and the
 * /api/audio/* routes are all verified for real.
 */
const assert = require('assert');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

async function runTests() {
  console.log('=== ELEVENLABS AUDIO TEST SUITE ===');
  const failed = [];
  const pass = (n) => console.log(`✅ Test ${n} Passed!`);

  // 1. PCM mono analysis passes on a healthy sine
  try {
    console.log('Running Test 1: mono sine QA passes...');
    const { analyzeAudio, synthSine } = require(path.join(projectRoot, 'lib', 'audio', 'audio_analyzer'));
    const report = analyzeAudio(synthSine({ seconds: 0.5, gain: 0.4 }), { mode: 'mono' });
    assert.strictEqual(report.mode, 'mono');
    assert.strictEqual(report.verdict, 'pass', JSON.stringify(report.findings));
    assert(report.mono.dbfs < -6 && report.mono.dbfs > -24, `sane level, got ${report.mono.dbfs}`);
    pass(1);
  } catch (e) { console.error('❌ Test 1 Failed:', e); failed.push('mono-sine-pass'); }

  // 2. Silence is a fail-grade finding
  try {
    console.log('Running Test 2: silence flagged fail...');
    const { analyzeAudio, synthSilence } = require(path.join(projectRoot, 'lib', 'audio', 'audio_analyzer'));
    const report = analyzeAudio(synthSilence({ seconds: 0.5 }), { mode: 'mono' });
    assert.strictEqual(report.verdict, 'fail');
    assert(report.findings.some((f) => f.code === 'SILENCE'));
    pass(2);
  } catch (e) { console.error('❌ Test 2 Failed:', e); failed.push('silence-fail'); }

  // 3. Stereo opt-in notices L/R differences (imbalanced right channel)
  try {
    console.log('Running Test 3: stereo L/R imbalance diff...');
    const { analyzeAudio, synthSine } = require(path.join(projectRoot, 'lib', 'audio', 'audio_analyzer'));
    const stereo = synthSine({ seconds: 0.5, gain: 0.5, stereo: true, rightGain: 0.05 });
    const report = analyzeAudio(stereo, { mode: 'stereo' });
    assert.strictEqual(report.mode, 'stereo');
    assert(report.stereoDiff, 'stereo diff block present');
    assert(Math.abs(report.stereoDiff.levelImbalanceDb) > 6, `imbalance, got ${report.stereoDiff.levelImbalanceDb}`);
    assert(report.findings.some((f) => f.code === 'STEREO_IMBALANCE'), JSON.stringify(report.findings));
    // Mono default folds down without a stereo diff
    const mono = analyzeAudio(stereo, { mode: 'mono' });
    assert.strictEqual(mono.mode, 'mono');
    assert(!mono.stereoDiff, 'mono default must not carry L/R diff');
    pass(3);
  } catch (e) { console.error('❌ Test 3 Failed:', e); failed.push('stereo-diff'); }

  // 4. Phase-inverted R flagged
  try {
    console.log('Running Test 4: phase inversion flagged...');
    const { analyzeAudio, synthSine } = require(path.join(projectRoot, 'lib', 'audio', 'audio_analyzer'));
    const report = analyzeAudio(synthSine({ seconds: 0.5, stereo: true, phaseInvertR: true }), { mode: 'stereo' });
    assert(report.stereoDiff.correlation < -0.9, `correlation, got ${report.stereoDiff.correlation}`);
    assert(report.findings.some((f) => f.code === 'PHASE_INVERTED'));
    pass(4);
  } catch (e) { console.error('❌ Test 4 Failed:', e); failed.push('phase-inverted'); }

  // 5. Voice command transcript parsing (offline)
  try {
    console.log('Running Test 5: voice command parsing...');
    const { commandFromTranscript } = require(path.join(projectRoot, 'lib', 'audio', 'voice_director'));
    assert.deepStrictEqual(commandFromTranscript('please jump now').action.target, 'Space');
    assert.deepStrictEqual(commandFromTranscript('attack the skeleton').action.type, 'click');
    assert.deepStrictEqual(commandFromTranscript('scroll down a bit').action.params.direction, 'down');
    assert.deepStrictEqual(commandFromTranscript('drink a potion').action.target, 'q');
    const unknown = commandFromTranscript('recite poetry');
    assert.strictEqual(unknown.matched, false);
    assert.strictEqual(unknown.action.type, 'wait');
    pass(5);
  } catch (e) { console.error('❌ Test 5 Failed:', e); failed.push('voice-commands'); }

  // 6. NPC pack planner is deterministic + offline
  try {
    console.log('Running Test 6: NPC pack generation (offline)...');
    const { generateNpcPack } = require(path.join(projectRoot, 'lib', 'audio', 'voice_director'));
    const pack = await generateNpcPack({ theme: 'space diner', lineCount: 4 });
    assert.strictEqual(pack.success, true);
    assert.strictEqual(pack.lines.length, 4);
    assert.strictEqual(pack.synthesized, false);
    assert(pack.lines.every((l) => l.text.includes('space diner')));
    pass(6);
  } catch (e) { console.error('❌ Test 6 Failed:', e); failed.push('npc-pack'); }

  // 7. Subtitle drift check flags VO mismatch
  try {
    console.log('Running Test 7: subtitle drift check...');
    const { subtitleDriftCheck } = require(path.join(projectRoot, 'lib', 'audio', 'voice_director'));
    const ok = subtitleDriftCheck('welcome to the dungeon traveler', 'welcome to the dungeon traveler');
    assert.strictEqual(ok.match, true);
    assert.strictEqual(ok.bug, null);
    const drift = subtitleDriftCheck('welcome to the dungeon traveler', 'goodbye to the space station pilot');
    assert.strictEqual(drift.match, false);
    assert(drift.bug && drift.bug.has_bug === true);
    pass(7);
  } catch (e) { console.error('❌ Test 7 Failed:', e); failed.push('subtitle-drift'); }

  // 8. ElevenLabs key resolution: explicit > store > env, placeholders rejected
  try {
    console.log('Running Test 8: ElevenLabs key resolution...');
    const eleven = require(path.join(projectRoot, 'lib', 'elevenlabs'));
    const storage = require(path.join(projectRoot, 'lib', 'storage'));
    const prevEnv = process.env.ELEVENLABS_API_KEY;
    const prevStore = storage.loadCredentials();
    process.env.ELEVENLABS_API_KEY = 'sk_env-elevenlabs-12345678';
    assert.strictEqual(eleven.resolveElevenLabsKey('sk_explicit-elevenlabs-12345678'), 'sk_explicit-elevenlabs-12345678');
    assert.strictEqual(eleven.resolveElevenLabsKey('sk-your-elevenlabs-key-here'), 'sk_env-elevenlabs-12345678', 'placeholder must fall through to env');
    assert.strictEqual(eleven.hasElevenLabsKey(), true);
    delete process.env.ELEVENLABS_API_KEY;
    assert.strictEqual(eleven.resolveElevenLabsKey(''), storage.getResolvedApiKey('elevenlabs'));
    if (prevEnv === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevEnv;
    assert.deepStrictEqual(prevStore.elevenlabsApiKey, storage.loadCredentials().elevenlabsApiKey, 'store untouched');
    pass(8);
  } catch (e) { console.error('❌ Test 8 Failed:', e); failed.push('key-resolution'); }

  // 9. TTS/STT transport uses xi-api-key + hints (mocked fetch)
  try {
    console.log('Running Test 9: TTS/STT transport headers...');
    const eleven = require(path.join(projectRoot, 'lib', 'elevenlabs'));
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, opts) => {
      calls.push({ url, headers: opts.headers, bodySize: (opts.body && opts.body.length) || 0 });
      return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer, json: async () => ({ text: 'hello', words: [] }) };
    };
    const tts = await eleven.textToSpeech('Hello adventurer', { apiKey: 'sk_mock-elevenlabs-key-12345678' });
    assert.strictEqual(tts.success, true);
    assert(calls[0].url.includes('/text-to-speech/'));
    assert.strictEqual(calls[0].headers['xi-api-key'], 'sk_mock-elevenlabs-key-12345678');
    assert(tts.audioBase64.length > 0 && tts.costEstimateUSD > 0);
    global.fetch = originalFetch;
    pass(9);
  } catch (e) { console.error('❌ Test 9 Failed:', e); failed.push('transport-headers'); }

  // 10. Missing key throws a helpful error (no silent 401)
  try {
    console.log('Running Test 10: missing key error...');
    const eleven = require(path.join(projectRoot, 'lib', 'elevenlabs'));
    const storage = require(path.join(projectRoot, 'lib', 'storage'));
    const prevEnv = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    const hadStore = Boolean(storage.getResolvedApiKey('elevenlabs'));
    if (!hadStore) {
      await assert.rejects(() => eleven.textToSpeech('hi', { apiKey: '' }), /ELEVENLABS_API_KEY/);
    }
    if (prevEnv !== undefined) process.env.ELEVENLABS_API_KEY = prevEnv;
    pass(10);
  } catch (e) { console.error('❌ Test 10 Failed:', e); failed.push('missing-key'); }

  // 11. Muse Spark audio prompt block + llm_caller audio part
  try {
    console.log('Running Test 11: Muse Spark audio prompt wiring...');
    const { analyzeAudio, buildAudioQABlock, synthSine } = require(path.join(projectRoot, 'lib', 'audio', 'audio_analyzer'));
    const report = analyzeAudio(synthSine({ seconds: 0.3 }), { mode: 'stereo' });
    const block = buildAudioQABlock(report, 'welcome traveler');
    assert(block.includes('AUDIO QA') && block.includes('STEREO') === false); // mono sine synth is mono
    const AgentBrain = require(path.join(projectRoot, 'lib', 'brain', 'agent_brain_refactored'));
    const brain = new AgentBrain();
    const prompt = brain.buildPrompt([], [], false, { report, transcript: 'welcome traveler' });
    assert(prompt.includes('AUDIO QA'), 'brain prompt carries audio block');

    // llm_caller attaches input_audio for meta provider (mocked fetch)
    const { callLLM } = require(path.join(projectRoot, 'lib', 'brain', 'llm_caller'));
    brain.updateConfig({ provider: 'meta', apiKey: 'meta-audio-test-key-12345678', modelName: 'meta-llama/llama-4-scout-17b-16e-instruct' });
    const originalFetch = global.fetch;
    let sentBody = null;
    global.fetch = async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"status":"playing","action":{"type":"wait"}}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }) };
    };
    const fakeAudio = Buffer.from([0, 1, 2, 3]).toString('base64');
    await callLLM(brain, 'probe', null, { base64: fakeAudio, transcript: 'go left', report });
    const parts = sentBody.messages[0].content;
    assert(Array.isArray(parts) && parts.some((p) => p.type === 'input_audio'), 'audio part attached');
    global.fetch = originalFetch;
    pass(11);
  } catch (e) { console.error('❌ Test 11 Failed:', e); failed.push('muse-spark-audio'); }

  // 12. /api/audio/* routes: status, analyze, voice-command, subtitle-check, npc-plan (offline)
  try {
    console.log('Running Test 12: audio API routes...');
    const { LocalAPIServer } = require(path.join(projectRoot, 'lib', 'api_server'));
    const server = new LocalAPIServer({ port: 42073 });
    await server.start();
    const base = 'http://127.0.0.1:42073';
    let res = await fetch(`${base}/api/audio/status`);
    assert.strictEqual(res.status, 200);
    const status = await res.json();
    assert(status.features.length >= 7);

    const small = Array.from({ length: 200 }, (_, i) => Math.sin(i / 10) * 0.4);
    res = await fetch(`${base}/api/audio/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcm: { mono: small, sampleRate: 8000 }, mode: 'mono' }),
    });
    assert.strictEqual(res.status, 200);
    const verdict = await res.json();
    assert.strictEqual(verdict.success, true);
    assert(verdict.promptBlock.includes('AUDIO QA'));

    res = await fetch(`${base}/api/audio/voice-command`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'jump!' }),
    });
    const cmd = await res.json();
    assert.strictEqual(cmd.matched, true);
    assert.strictEqual(cmd.action.target, 'Space');

    res = await fetch(`${base}/api/audio/subtitle-check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected: 'hello hero', heard: 'hello hero' }),
    });
    const sub = await res.json();
    assert.strictEqual(sub.match, true);

    res = await fetch(`${base}/api/audio/npc-pack`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'boss arena', lineCount: 2 }),
    });
    const pack = await res.json();
    assert.strictEqual(pack.lines.length, 2);

    res = await fetch(`${base}/api/audio/sfx-hint?assetUrl=https://x/coin.wav`);
    const hint = await res.json();
    assert(hint.prompt.includes('coin'));

    await server.stop();
    pass(12);
  } catch (e) { console.error('❌ Test 12 Failed:', e); failed.push('audio-routes'); }

  console.log(failed.length ? `\n❌ ${failed.length} FAILED: ${failed.join(', ')}` : '\n🎉 ALL ELEVENLABS AUDIO TESTS PASSED');
  process.exit(failed.length ? 1 : 0);
}

runTests().catch((e) => { console.error('Fatal:', e); process.exit(1); });
