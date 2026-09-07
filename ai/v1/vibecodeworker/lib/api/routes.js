/**
 * Route dispatcher for VibeCodeWorker Local REST API.
 */
const { handlePatchFile } = require('./patch_handler');

async function handleApiRequest(context, req, res, pathname, parsedUrl, readBody, sendJSON, sendText, rootDir) {
  const { appState, handlers, bugStore } = context;

  // ─── GET /api/status ─────────────────────────────────
  if (pathname === '/api/status' || pathname === '/status') {
    return sendJSON(200, {
      success: true,
      system: '4weird VibeCodeWorker Local API Server',
      version: '2.0.0',
      uptimeSeconds: Math.floor((Date.now() - appState.startTime) / 1000),
      runtimeMode: appState.runtimeMode,
      activeGame: appState.activeGame,
      activeGameUrl: appState.activeGameUrl,
      totalBugs: bugStore.getBugs().length,
      totalApiRequests: appState.apiRequests,
      memoryUsage: process.memoryUsage()
    });
  }

  // ─── GET /api/games ──────────────────────────────────
  if (pathname === '/api/games') {
    const games = await handlers.getGames();
    return sendJSON(200, { success: true, count: games.length, games });
  }

  // ─── POST /api/game/launch ───────────────────────────
  if (pathname === '/api/game/launch') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const gameId = body.gameId || body.game;
    if (!gameId) return sendJSON(400, { success: false, error: 'Missing gameId in request body' });

    const result = await handlers.launchGame(gameId);
    if (result.success) {
      appState.activeGame = gameId;
      appState.activeGameUrl = result.url || null;
    }
    return sendJSON(result.success ? 200 : 500, result);
  }

  // ─── GET /api/game/screenshot ───────────────────────
  if (pathname === '/api/game/screenshot' || pathname === '/screenshot') {
    const target = parsedUrl.searchParams.get('target') || 'game';
    const format = parsedUrl.searchParams.get('format') || 'png';
    const acceptHeader = req.headers['accept'] || '';

    const imageBuffer = await handlers.captureScreenshot(target);
    if (!imageBuffer) {
      return sendJSON(500, { success: false, error: 'Game window/canvas screenshot unavailable' });
    }

    if (format === 'json' || acceptHeader.includes('application/json')) {
      return sendJSON(200, {
        success: true,
        target,
        mimeType: 'image/png',
        base64: imageBuffer.toString('base64')
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(imageBuffer);
      context.logRequest(req.method, pathname, 200, 0);
      return;
    }
  }

  // ─── GET /api/game/logs ──────────────────────────────
  if (pathname === '/api/game/logs') {
    const liveLogs = await handlers.getLogs();
    const combinedLogs = [...appState.logs, ...liveLogs];
    return sendJSON(200, { success: true, count: combinedLogs.length, logs: combinedLogs });
  }

  // ─── GET /api/game/state ─────────────────────────────
  if (pathname === '/api/game/state') {
    const state = await handlers.getGameState();
    return sendJSON(200, { success: true, activeGame: appState.activeGame, state });
  }

  // ─── POST /api/game/action ───────────────────────────
  if (pathname === '/api/game/action' || pathname === '/action') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const result = await handlers.executeAction(body);
    return sendJSON(result.success ? 200 : 500, result);
  }

  // ─── POST /api/game/eval ─────────────────────────────
  if (pathname === '/api/game/eval' || pathname === '/eval') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const script = body.script;
    if (!script) return sendJSON(400, { success: false, error: 'Missing script in body' });

    const result = await handlers.evalJavaScript(script);
    return sendJSON(200, { success: true, result });
  }

  // ─── POST /api/game/patch ────────────────────────────
  if (pathname === '/api/game/patch') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const patchResult = await handlePatchFile(
      body,
      rootDir,
      handlers.reloadGame,
      (lvl, msg, src) => context.addConsoleLog(lvl, msg, src)
    );
    return sendJSON(patchResult.status, patchResult.data);
  }

  // ─── GET & POST /api/bugs ────────────────────────────
  if (pathname === '/api/bugs' || pathname === '/data') {
    if (req.method === 'GET') {
      return sendJSON(200, { success: true, bugs: bugStore.getBugs() });
    } else if (req.method === 'POST') {
      const body = await readBody();
      const bug = bugStore.addBug(body, appState.activeGame);
      return sendJSON(200, { success: true, bug });
    } else {
      return sendText(405, 'Method Not Allowed');
    }
  }

  // ─── GET /api/dashboard ──────────────────────────────
  if (pathname === '/api/dashboard') {
    const games = await handlers.getGames();
    return sendJSON(200, {
      success: true,
      status: {
        activeGame: appState.activeGame,
        activeGameUrl: appState.activeGameUrl,
        uptimeSeconds: Math.floor((Date.now() - appState.startTime) / 1000),
        totalApiRequests: appState.apiRequests,
        runtimeMode: appState.runtimeMode
      },
      games,
      bugs: bugStore.getBugs(),
      logs: appState.logs.slice(-50),
      recentActions: appState.recentActions.slice(0, 15)
    });
  }

  // ─── POST /api/autocode/fix ─────────────────────────
  if (pathname === '/api/autocode/fix') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const { AutoCodeSystem } = require('../core');
    const autoCode = new AutoCodeSystem();
    const result = await autoCode.autoFixBug({
      bug: body.bug || { description: body.instruction || body.description },
      sourceFiles: body.sourceFiles || [],
      targetFile: body.targetFile || body.filePath,
      customInstruction: body.customInstruction || body.instruction
    });
    return sendJSON(result.success ? 200 : 500, result);
  }

  // ─── GET /api/autocode/report ────────────────────────
  if (pathname === '/api/autocode/report') {
    const fs = require('fs');
    const reportFile = path.join(context.dataDir, 'autocode_fix_report.json');
    let reports = [];
    if (fs.existsSync(reportFile)) {
      try {
        reports = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      } catch (e) {}
    }
    return sendJSON(200, { success: true, count: reports.length, reports });
  }

  // 404 handler
  return sendJSON(404, {
    success: false,
    error: `Endpoint '${pathname}' not found. Available endpoints: /api/status, /api/games, /api/game/launch, /api/game/screenshot, /api/game/logs, /api/game/state, /api/game/action, /api/game/eval, /api/game/patch, /api/bugs, /api/autocode/fix, /api/autocode/report, /api/dashboard`
  });
}

module.exports = {
  handleApiRequest
};
