/**
 * Standalone Local API Server Launcher & Game Debugger Host
 */

const path = require('path');
const { LocalAPIServer } = require('../lib/api_server');
const { startStaticServer } = require('../src/main_process/static_server');
const { discoverGames: scanGames } = require('../src/main_process/game_discovery');
const { getSharedLog, teeConsole, parseWorkerArgs } = require('../lib/smart_log');

const cliOpts = parseWorkerArgs(process.argv);
const smartlog = getSharedLog('headless-server');
teeConsole(smartlog);

// --handoff: generate (or print latest) AI handoff brief and exit. The manual
// feed path for any vibecoding tool: `node start_api_server.js --handoff`.
if (cliOpts.handoffOnly) {
  const res = smartlog.writeHandoff({ reason: 'cli --handoff' });
  console.log(res.success ? res.path : ('HANDOFF FAILED: ' + res.error));
  if (res.success) console.log('---\n' + res.markdown.slice(0, 3000));
  process.exit(res.success ? 0 : 1);
}

const WEBSITE_V1_DIR = path.join(__dirname, '..', '..', '..');
// Cloud-ready: PORT/HOST from env (droplet, Fly, Render all inject PORT).
// HOST defaults to 0.0.0.0 so containers and droplets serve externally;
// set HOST=127.0.0.1 for loopback-only desktop use.
const PORT = process.env.PORT || process.env.VIBECODEWORKER_PORT || 42069;
const HOST = process.env.HOST || process.env.VIBECODEWORKER_HOST || '0.0.0.0';
const STATIC_PORT = process.env.STATIC_PORT || 8888;

function discoverGames() {
  return scanGames(WEBSITE_V1_DIR, STATIC_PORT);
}

async function main() {
  console.log('Starting 4weird VibeCodeWorker Local API Server & Static Host...');
  startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);
  console.log(`Static game server hosting at http://localhost:${STATIC_PORT}`);

  let activeGameId = null;
  let activeGameUrl = null;
  const consoleLogs = [];

  // Headless unified engine manager (ultralight default; no viewport needed
  // for telemetry-only passes, chromium headless when deps are installed).
  const { WebEngineManager } = require('../src/runtime/web_engine_manager');
  const validHeadless = ['ultralight', 'electron', 'chromium'];
  const configuredHeadless = validHeadless.includes(process.env.VIBE_WEB_ENGINE) ? process.env.VIBE_WEB_ENGINE : 'ultralight';
  const headlessEngines = new WebEngineManager({ activeEngine: configuredHeadless });

  if (process.env.VIBE_API_TOKEN) {
    console.log('[API Server] Token auth ENABLED (VIBE_API_TOKEN set). Mutating /api calls require X-Vibe-Auth.');
  } else {
    console.log('[API Server] Token auth disabled — set VIBE_API_TOKEN before exposing this port to the internet!');
  }

  const apiServer = new LocalAPIServer({
    port: PORT,
    host: HOST,
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
      reloadGame: async () => ({ success: true, reloaded: true }),
      // Unified web engines in headless mode: ultralight default drives
      // telemetry; chromium uses playwright/puppeteer when installed.
      getEngines: async () => headlessEngines.describeEngines(),
      setEngine: async (engineId) => headlessEngines.setActiveEngine(engineId),
      runMultiEngineQA: async ({ url, engines, actions } = {}) => {
        const target = url || activeGameUrl;
        if (!target) return { success: false, error: 'No URL provided and no active game' };
        return await headlessEngines.runMultiEngineQA(target, { engines, actions });
      },
    }
  });

  await apiServer.start();
  smartlog.info(`Headless API ready at http://${HOST}:${PORT}`, { category: 'lifecycle' });
  console.log(`VibeCodeWorker Local REST API Server is ready at http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/api/status | Dashboard: http://${HOST}:${PORT}/api/dashboard | OpenCode: http://${HOST}:${PORT}/api/opencode/status`);
  console.log(`Logs: ${smartlog.dir} | Handoff: node start_api_server.js --handoff`);

  if (cliOpts.handoffOnExit) {
    const writeOnExit = (reason) => {
      try {
        const res = smartlog.writeHandoff({ reason });
        if (res.success) console.log(`[SmartLog] Handoff written: ${res.path}`);
      } catch (e) {}
    };
    process.on('SIGINT', () => { writeOnExit('SIGINT'); process.exit(0); });
    process.on('SIGTERM', () => { writeOnExit('SIGTERM'); process.exit(0); });
  }
}

if (require.main === module) {
  main().catch(err => console.error('Failed to start standalone API server:', err));
}

module.exports = { main, discoverGames };
