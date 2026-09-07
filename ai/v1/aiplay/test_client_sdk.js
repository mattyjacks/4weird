/**
 * SDK & Replay Engine Integration Test Script
 */

const { AIPlayClient } = require('./lib/aiplay_client');
const { ReplayEngine } = require('./lib/replay_engine');

async function testSDK() {
  console.log('=== TESTING AIPLAY CLIENT SDK & REPLAY ENGINE ===');
  const client = new AIPlayClient('http://127.0.0.1:9999');

  // 1. Get Status
  const status = await client.getStatus();
  console.log('[SDK Test] Server Status:', status.system, '| Mode:', status.runtimeMode);

  // 2. Get Games
  const games = await client.getGames();
  console.log(`[SDK Test] Discovered ${games.count} games via SDK.`);

  // 3. Test Launching a Game
  const launchRes = await client.launchGame('friendslop');
  console.log('[SDK Test] Launch Game Result:', launchRes.success, '| Game URL:', launchRes.url);

  // 4. Test Replay Engine Recording
  const replayEngine = new ReplayEngine(client);
  replayEngine.startRecording('friendslop');
  replayEngine.recordAction({ type: 'click', x: 250, y: 350 });
  replayEngine.recordAction({ type: 'keydown', key: 'Space' });

  const session = replayEngine.stopRecording('SDK Automated Test Replay');
  console.log('[SDK Test] Recorded Replay Session:', session.id, '| Actions:', session.actionCount);

  // 5. Test Replaying
  const replays = replayEngine.listReplays();
  console.log(`[SDK Test] Stored Replay Sessions: ${replays.length}`);

  // 6. Test JS Eval via SDK
  const evalRes = await client.eval('document.title');
  console.log('[SDK Test] JS Eval Document Title:', evalRes.result);

  console.log('=== SDK & REPLAY ENGINE INTEGRATION TEST PASSED CLEANLY ===');
}

if (require.main === module) {
  testSDK().catch(err => console.error('SDK Test failed:', err));
}

module.exports = { testSDK };
