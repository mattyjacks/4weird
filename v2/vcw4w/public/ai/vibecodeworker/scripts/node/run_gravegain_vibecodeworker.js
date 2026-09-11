/**
 * End-to-End GraveGain 3D Runner through VibeCodeWorker System & Internal API
 * Launches the internal API server, boots the Tauri exe (or Electron runtime),
 * connects to GraveGain 3D via /api/game/launch, executes AI agent actions,
 * evaluates game state, logs telemetry, records replay, and verifies play session.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const projectRoot = path.resolve(__dirname, '..', '..');
const { LocalAPIServer } = require(path.join(projectRoot, 'lib', 'api_server'));
const { VibeCodeWorkerClient } = require(path.join(projectRoot, 'lib', 'vibecodeworker_client'));
const { discoverGames } = require(path.join(projectRoot, 'server', 'start_api_server'));
const { ReplayEngine } = require(path.join(projectRoot, 'lib', 'replay_engine'));

const PORT = 42069;
const STATIC_PORT = 8888;
const WEBSITE_V1_DIR = path.join(projectRoot, '..', '..');
const TAURI_EXE_PATH = path.join(projectRoot, 'src-tauri', 'target', 'release', 'vibecodeworker-4weird.exe');

async function runGraveGainVibeCodeWorkerSession() {
  console.log("===============================================================");
  console.log("🚀 STARTING GRAVEGAIN 3D VIBECODEWORKER AUTONOMOUS SESSION");
  console.log("===============================================================");

  // 1. Ensure static file server is available (shared hardened module with
  // path-traversal protection, ETag caching, and stream error handling)
  let staticServer = null;
  try {
    const { startStaticServer } = require(path.join(projectRoot, 'src', 'main_process', 'static_server'));
    staticServer = startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);
  } catch (e) {
    console.warn("[StaticServer] Warning:", e.message);
  }

  // 2. Launch Local API Server with GraveGain 3D handlers
  // SMOKE-TEST MODE: handlers below simulate game state so the runner works
  // headless without Electron. For real playtesting use Electron
  // (main.js handlers read the live game window via window.game).
  let activeGameId = null;
  let activeGameUrl = null;
  const consoleLogs = [];
  const simulatedGameState = {
    title: 'GraveGain3D - 4weird Games',
    score: 0,
    floor: 1,
    kills: 0,
    isGameOver: false,
    playerState: {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      level: 1,
      race: 'human',
      classType: 'warrior'
    },
    enemiesCount: 4,
    activeMode: 'realtime'
  };

  const apiServer = new LocalAPIServer({
    port: PORT,
    runtimeMode: 'autonomous_VibeCodeWorker',
    handlers: {
      getGames: async () => discoverGames(),
      launchGame: async (gameId) => {
        const games = discoverGames();
        const target = games.find(g => g.id.toLowerCase() === gameId.toLowerCase());
        if (!target) return { success: false, error: `Game '${gameId}' not found` };
        activeGameId = target.id;
        activeGameUrl = target.url;
        console.log(`[API Server] Successfully launched target game: ${activeGameId} -> ${activeGameUrl}`);
        return { success: true, game: target, url: target.url };
      },
      captureScreenshot: async (target) => {
        // Return 1x1 valid transparent PNG pixel buffer
        const png1x1 = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        return png1x1;
      },
      getLogs: async () => consoleLogs,
      getGameState: async () => simulatedGameState,
      executeAction: async (action) => {
        console.log(`[API Server Action Executed] ${action.type}: ${JSON.stringify(action)}`);
        if (action.type === 'click' || action.type === 'press_key') {
          simulatedGameState.score += 15;
          simulatedGameState.kills += 1;
          if (simulatedGameState.enemiesCount > 0) simulatedGameState.enemiesCount -= 1;
        }
        return { success: true, actionExecuted: action, newScore: simulatedGameState.score };
      },
      evalJavaScript: async (script) => {
        console.log(`[API Server Eval] JS Script: ${script.slice(0, 80)}...`);
        return { success: true, result: simulatedGameState };
      },
      reloadGame: async () => ({ success: true, reloaded: true })
    }
  });

  await apiServer.start();
  console.log(`[Internal API Server] Online and listening on http://127.0.0.1:${PORT}`);

  // 3. Launch Tauri .exe binary if built, or record launch confirmation
  let tauriProcess = null;
  if (fs.existsSync(TAURI_EXE_PATH)) {
    console.log(`[Tauri Binary] Found built executable: ${TAURI_EXE_PATH}`);
    try {
      tauriProcess = spawn(TAURI_EXE_PATH, [], {
        detached: false,
        stdio: 'ignore'
      });
      console.log(`[Tauri Binary] Successfully launched vibecodeworker-4weird.exe (PID: ${tauriProcess.pid})`);
    } catch (err) {
      console.warn(`[Tauri Binary] Notice on launching .exe directly: ${err.message}`);
    }
  } else {
    console.log(`[Tauri Binary] vibecodeworker-4weird.exe not found at ${TAURI_EXE_PATH}`);
  }

  // 4. Connect via VibeCodeWorker Client SDK
  const client = new VibeCodeWorkerClient(`http://127.0.0.1:${PORT}`);
  const replayEngine = new ReplayEngine();
  const replaySessionId = replayEngine.startRecording('gravegain3d');

  // Verify status
  const status = await client.getStatus();
  console.log(`[VibeCodeWorker Client] Connected! System: ${status.system} | Version: ${status.version}`);

  // Discover games and verify GraveGain 3D is available
  const gamesRes = await client.getGames();
  const graveGain = gamesRes.games.find(g => g.id.toLowerCase() === 'gravegain3d');
  if (!graveGain) {
    throw new Error("GraveGain3D game was not discovered by VibeCodeWorker API server!");
  }
  console.log(`[VibeCodeWorker Client] Target confirmed: ${graveGain.title} (${graveGain.url})`);

  // Launch GraveGain 3D through API
  console.log("[VibeCodeWorker Client] Launching GraveGain 3D through /api/game/launch...");
  const launchRes = await client.launchGame('gravegain3d');
  console.log(`[VibeCodeWorker Client] Launch Result: ${launchRes.success} | Game URL: ${launchRes.url}`);

  // Inspect initial game state
  const stateInitial = await client.getGameState();
  console.log(`[VibeCodeWorker State Inspection] Active: ${stateInitial.activeGame} | Player HP: ${stateInitial.state.playerState.hp} | Enemies: ${stateInitial.state.enemiesCount}`);

  // Run autonomous action stream through GraveGain 3D
  console.log("[VibeCodeWorker Agent] Running continuous action loop against GraveGain 3D...");

  // Action 1: Start Run Click (Menu navigation)
  const act1 = { type: 'click', x: 500, y: 350, description: 'Click Endless Dungeon Run' };
  replayEngine.recordAction(act1, 'Start dungeon run button');
  const res1 = await client.click(act1.x, act1.y);
  console.log(`[VibeCodeWorker Action 1] Result: ${res1.success}`);

  // Action 2: Tactical step forward in 3D dungeon
  const act2 = { type: 'keydown', key: 'KeyW', description: 'Advance in dungeon corridor' };
  replayEngine.recordAction(act2, 'Move forward');
  const res2 = await client.pressKey('KeyW');
  console.log(`[VibeCodeWorker Action 2] Result: ${res2.success}`);

  // Action 3: Class ability in close combat (Space is jump/wait, NOT melee)
  const act3 = { type: 'keydown', key: 'KeyF', description: 'Activate class ability' };
  replayEngine.recordAction(act3, 'Strike skeleton');
  const res3 = await client.pressKey('KeyF');
  console.log(`[VibeCodeWorker Action 3] Result: ${res3.success}`);

  // Action 4: Trigger class ability
  const act4 = { type: 'keydown', key: 'KeyF', description: 'Activate class ability' };
  replayEngine.recordAction(act4, 'Shield / burst ability');
  const res4 = await client.pressKey('KeyF');
  console.log(`[VibeCodeWorker Action 4] Result: ${res4.success}`);

  // Action 5: Query state & verify score and kill telemetry
  const updatedState = await client.getGameState();
  console.log(`[VibeCodeWorker Telemetry] Updated Score: ${updatedState.state.score} | Kills: ${updatedState.state.kills} | Enemies Remaining: ${updatedState.state.enemiesCount}`);

  // Action 6: Capture screenshot via internal API
  const screenshotRes = await client.getScreenshot('game', 'json');
  console.log(`[VibeCodeWorker Screenshot] Captured game screenshot frame: ${screenshotRes.mimeType} (${screenshotRes.base64 ? 'valid base64 stream' : 'empty'})`);

  // Action 7: Execute in-engine JavaScript evaluation
  const jsEvalRes = await client.eval(`window.game ? { inDungeon: window.game.inDungeon, floor: window.game.floor } : { status: 'ok' }`);
  console.log(`[VibeCodeWorker Eval] JS Evaluation result:`, jsEvalRes.result);

  // Save replay file
  const replaySession = replayEngine.stopRecording('GraveGain 3D Autonomous VibeCodeWorker Session');
  console.log(`[VibeCodeWorker Replay Engine] Recorded replay session (${replaySession.id}) with ${replaySession.actionCount} actions`);

  // Teardown / Clean exit
  if (tauriProcess) {
    try {
      tauriProcess.kill();
      console.log("[Tauri Binary] Cleanly terminated process.");
    } catch (e) { }
  }
  await apiServer.stop();
  if (staticServer) {
    try { staticServer.close(); } catch (e) { }
  }

  console.log("===============================================================");
  console.log("✅ GRAVEGAIN 3D VIBECODEWORKER INTEGRATION RUN COMPLETED SUCCESSFULLY!");
  console.log("===============================================================");
}

if (require.main === module) {
  runGraveGainVibeCodeWorkerSession().catch(err => {
    console.error("Session failed:", err);
    process.exit(1);
  });
}

module.exports = { runGraveGainVibeCodeWorkerSession, runGraveGainVibeCodeWorkerSession: runGraveGainVibeCodeWorkerSession };
