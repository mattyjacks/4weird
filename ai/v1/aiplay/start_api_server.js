/**
 * Standalone Local API Server Launcher & Game Debugger Host
 */

const path = require('path');
const { LocalAPIServer } = require('./lib/api_server');
const { startStaticServer } = require('./src/main_process/static_server');
const { discoverGames: scanGames } = require('./src/main_process/game_discovery');

const WEBSITE_V1_DIR = path.join(__dirname, '..', '..', '..', 'website', 'v1');
const PORT = process.env.PORT || 9999;
const STATIC_PORT = 8888;

function discoverGames() {
  return scanGames(WEBSITE_V1_DIR, STATIC_PORT);
}

async function main() {
  console.log('Starting 4weird AIPlay Local API Server & Static Host...');
  startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);
  console.log(`Static game server hosting at http://localhost:${STATIC_PORT}`);

  let activeGameId = null;
  let activeGameUrl = null;
  const consoleLogs = [];

  const apiServer = new LocalAPIServer({
    port: PORT,
    runtimeMode: 'standalone_api',
    handlers: {
      getGames: async () => discoverGames(),
      launchGame: async (gameId) => {
        const games = discoverGames();
        const target = games.find(g => g.id.toLowerCase() === gameId.toLowerCase());
        if (!target) return { success: false, error: `Game '${gameId}' not found` };
        activeGameId = target.id;
        activeGameUrl = target.url;
        console.log(`[API Server] Launched game: ${activeGameId} (${activeGameUrl})`);
        return { success: true, game: target, url: target.url };
      },
      captureScreenshot: async (target) => {
        return null;
      },
      getLogs: async () => consoleLogs,
      getGameState: async () => ({ activeGameId, activeGameUrl }),
      executeAction: async (action) => ({ success: true, actionExecuted: action }),
      evalJavaScript: async (script) => ({ success: true, note: 'Stand-alone mode evaluation' }),
      reloadGame: async () => ({ success: true, reloaded: true })
    }
  });

  await apiServer.start();
  console.log(`AIPlay Local REST API Server is ready at http://localhost:${PORT}`);
}

if (require.main === module) {
  main().catch(err => console.error('Failed to start standalone API server:', err));
}

module.exports = { main, discoverGames };
