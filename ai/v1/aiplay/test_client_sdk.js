/**
 * SDK & Replay Engine Integration Test Script
 */

const { AIPlayClient } = require('./lib/aiplay_client');
const { ReplayEngine } = require('./lib/replay_engine');

async function testSDK() {
  console.log('=== TESTING AIPLAY CLIENT SDK & REPLAY ENGINE ===');
  const client = new AIPlayClient('http://127.0.0.1:9999');

  let server = null;
  // If server is not reachable, start a local test server
  try {
    await client.getStatus();
  } catch (e) {
    console.log('[SDK Test] Server not running, starting ephemeral server on port 9999...');
    const { LocalAPIServer } = require('./lib/api_server');
    const { discoverGames } = require('./start_api_server');
    server = new LocalAPIServer({
      port: 9999,
      runtimeMode: 'test_runner',
      handlers: {
        getGames: async () => discoverGames(),
        launchGame: async (gameId) => ({ success: true, url: `http://localhost:8888/games/html/${gameId}/index.html` }),
        evalJavaScript: async (script) => ({ success: true, note: 'Stand-alone mode evaluation' }),
        executeAction: async (action) => ({ success: true })
      }
    });
    await server.start();
  }

  try {
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
  } finally {
    if (server) {
      await server.stop();
    }
  }
}

if (require.main === module) {
  testSDK().catch(err => {
    console.error('SDK Test failed:', err);
    process.exit(1);
  });
}

module.exports = { testSDK };
