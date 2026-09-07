/**
 * Route dispatcher for VibeCodeWorker Local REST API.
 */
const { handlePatchFile } = require('./patch_handler');

async function handleApiRequest(context, req, res, pathname, parsedUrl, readBody, sendJSON, sendText, rootDir) {
  const { appState, handlers, bugStore } = context;

  // The API base URL is commonly opened in a browser while setting up the
  // desktop app. Return a useful health response instead of an alarming 404.
  if (pathname === '/') {
    return sendJSON(200, {
      success: true,
      system: '4weird VibeCodeWorker Local API Server',
      message: 'VibeCodeWorker is running. Use the desktop app for the playtest workspace.',
      links: {
        status: '/api/status',
        dashboard: '/api/dashboard',
        games: '/api/games'
      }
    });
  }

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

  // ─── GET /api/opencode/status ────────────────────────
  // Optional OpenCode.ai integration: reports whether the bridge is enabled
  // and whether an `opencode` binary / serve instance is reachable.
  if (pathname === '/api/opencode/status') {
    const bridge = require('../opencode_bridge');
    const status = await bridge.getStatus();
    return sendJSON(200, { success: true, opencode: status });
  }

  // ─── POST /api/opencode/export ───────────────────────
  // Export open bugs as an OpenCode-ready bug report (markdown + JSON).
  // Body: { bugIds?: string[], gameId?: string, instructions?: string,
  //         testCommand?: string, includeFileContents?: boolean }
  if (pathname === '/api/opencode/export') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const bridge = require('../opencode_bridge');
    const allBugs = bugStore.getBugs();
    const bugs = Array.isArray(body.bugIds) && body.bugIds.length > 0
      ? allBugs.filter(b => body.bugIds.includes(b.id))
      : allBugs.filter(b => !body.gameId || (b.gameId || '').toLowerCase() === String(body.gameId).toLowerCase());
    let fileContents = [];
    if (body.includeFileContents) {
      const fs = require('fs');
      const seen = new Set();
      for (const b of bugs) {
        const fp = b.filePath || b.file;
        if (!fp || seen.has(fp)) continue;
        seen.add(fp);
        try {
          const abs = path.isAbsolute(fp) ? fp : path.join(rootDir, fp);
          if (abs.startsWith(path.resolve(rootDir)) && fs.existsSync(abs) && fs.statSync(abs).size < 256 * 1024) {
            fileContents.push({ path: fp, content: fs.readFileSync(abs, 'utf8').slice(0, 60000) });
          }
        } catch (e) { /* best effort */ }
      }
    }
    const result = bridge.exportBugReport({
      bugs,
      gameId: body.gameId || appState.activeGame,
      instructions: body.instructions,
      testCommand: body.testCommand,
      fileContents,
    });
    return sendJSON(result.success ? 200 : 400, result);
  }

  // ─── POST /api/opencode/fix ──────────────────────────
  // Export + hand N bugs to OpenCode direct-code-editing (CLI or serve).
  // Body: same as /export plus { dir?, model?, agent?, sessionId? }.
  if (pathname === '/api/opencode/fix') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const bridge = require('../opencode_bridge');
    const allBugs = bugStore.getBugs();
    const bugs = Array.isArray(body.bugIds) && body.bugIds.length > 0
      ? allBugs.filter(b => body.bugIds.includes(b.id))
      : allBugs.filter(b => !body.gameId || (b.gameId || '').toLowerCase() === String(body.gameId).toLowerCase());
    const result = await bridge.fixBugs({
      bugs,
      gameId: body.gameId || appState.activeGame,
      instructions: body.instructions,
      testCommand: body.testCommand,
      dir: body.dir,
      sessionId: body.sessionId,
    });
    if (typeof context.addConsoleLog === 'function') {
      context.addConsoleLog('info', `OpenCode fix: ${result.success ? 'succeeded' : 'failed'} for ${result.bugCount || 0} bug(s)`, 'opencode');
    }
    return sendJSON(result.success ? 200 : 500, result);
  }

  // ─── POST /api/opencode/heal ─────────────────────────
  // Start the self-healing loop (test -> export -> fix -> re-test).
  // Body: { gameId?, testCommand?, maxIterations?, instance?: 'same'|'fresh'|{remoteUrl,token},
  //         instructions?, bugIds? }. Returns { runId } — poll the GET below.
  if (pathname === '/api/opencode/heal') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const bridge = require('../opencode_bridge');
    const allBugs = bugStore.getBugs();
    const bugs = Array.isArray(body.bugIds) && body.bugIds.length > 0
      ? allBugs.filter(b => body.bugIds.includes(b.id))
      : undefined;
    const instance = body.instance
      ? body.instance
      : (body.remoteUrl ? { remoteUrl: body.remoteUrl, token: body.token } : 'same');
    const started = bridge.startHealCycle({
      bugs,
      gameId: body.gameId || appState.activeGame,
      instructions: body.instructions,
      testCommand: body.testCommand,
      dir: body.dir,
      maxIterations: Math.min(parseInt(body.maxIterations, 10) || 3, 10),
      instance,
    });
    if (typeof context.addConsoleLog === 'function') {
      context.addConsoleLog('info', `OpenCode heal cycle started: ${started.runId}`, 'opencode');
    }
    return sendJSON(200, { success: true, ...started });
  }

  // ─── GET /api/opencode/heal/:id ──────────────────────
  if (pathname.startsWith('/api/opencode/heal/')) {
    const runId = pathname.slice('/api/opencode/heal/'.length);
    const bridge = require('../opencode_bridge');
    const run = bridge.getHealRun(runId);
    if (!run) return sendJSON(404, { success: false, error: `Heal run '${runId}' not found` });
    return sendJSON(200, { success: true, run });
  }

  // ─── POST /api/opencode/heal-test ────────────────────
  // Remote-test hook: ANOTHER VibeCodeWorker instance (fresh child process,
  // droplet, etc.) hits this to run a test command HERE and report back.
  if (pathname === '/api/opencode/heal-test') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const bridge = require('../opencode_bridge');
    const command = String(body.testCommand || '').slice(0, 500);
    if (!command) return sendJSON(400, { success: false, error: 'Missing testCommand' });
    // Guardrail: only allow test-ish commands through this hook.
    if (!/test|bench|lint|audit|playtest|gravegain/i.test(command)) {
      return sendJSON(400, { success: false, error: 'heal-test only runs test/bench/lint/audit commands' });
    }
    const targetDir = (body.dir && String(body.dir).startsWith(path.resolve(rootDir)))
      ? body.dir
      : rootDir;
    const result = await bridge.runShellCommand(command, targetDir, 300000);
    return sendJSON(200, { success: true, exitCode: result.exitCode, output: result.output });
  }

  // ─── POST /api/opencode/revert ───────────────────────
  // Server-mode undo: revert an OpenCode session message that made things worse.
  if (pathname === '/api/opencode/revert') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (!body.sessionId) return sendJSON(400, { success: false, error: 'Missing sessionId' });
    const bridge = require('../opencode_bridge');
    const config = bridge.getOpenCodeConfig();
    try {
      const ok = await bridge.serverRevert(config, body.sessionId, body.messageId);
      return sendJSON(200, { success: true, result: ok });
    } catch (e) {
      return sendJSON(500, { success: false, error: e.message });
    }
  }

  // ─── GET /api/opencode/handoff ───────────────────
  // Serve the latest smart-log handoff brief (manual feed: paste into any
  // vibecoding tool; auto feed: the bridge attaches it to fix prompts).
  if (pathname === '/api/opencode/handoff' && req.method === 'GET') {
    const { getSharedLog } = require('../smart_log');
    const res = getSharedLog().readLatestHandoff();
    return sendJSON(res.success ? 200 : 404, res);
  }

  // ─── POST /api/opencode/handoff ──────────────────
  // Generate a fresh handoff. Body: { reason?, includeBugs?: boolean }.
  if (pathname === '/api/opencode/handoff') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const { getSharedLog } = require('../smart_log');
    const log = getSharedLog();
    const res = log.writeHandoff({
      reason: body.reason || 'api handoff request',
      bugs: body.includeBugs === false ? [] : bugStore.getBugs(),
    });
    return sendJSON(res.success ? 200 : 500, res);
  }

  // 404 handler
  return sendJSON(404, {
    success: false,
    error: `Endpoint '${pathname}' not found. Available endpoints: /api/status, /api/games, /api/game/launch, /api/game/screenshot, /api/game/logs, /api/game/state, /api/game/action, /api/game/eval, /api/game/patch, /api/bugs, /api/autocode/fix, /api/autocode/report, /api/opencode/status, /api/opencode/export, /api/opencode/fix, /api/opencode/heal, /api/opencode/heal/:id, /api/opencode/heal-test, /api/opencode/revert, /api/opencode/handoff, /api/dashboard`
  });
}

module.exports = {
  handleApiRequest
};
