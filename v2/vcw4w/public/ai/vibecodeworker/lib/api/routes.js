/**
 * Route dispatcher for VibeCodeWorker Local REST API.
 */
const path = require('path');
const { handlePatchFile } = require('./patch_handler');

// Security: request-influenced filesystem paths (bug filePath, targetFile,
// working dirs) must stay inside the shipped site tree (website/v1), which
// contains the games and the worker itself; and nothing else sensitive.
// Credentials live in the OS profile dir, outside this tree, so confining
// here keeps them unreadable through the API.
function confineToSiteTree(rootDir, requested) {
  if (requested == null || requested === '') return null;
  const siteRoot = path.resolve(rootDir, '..', '..', '..');
  const abs = path.resolve(siteRoot, String(requested));
  const rel = path.relative(siteRoot, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return abs;
}

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

  // ─── MediaMogul playtest video ───────────────────────
  if (pathname === '/api/game/video/status') {
    return sendJSON(200, { success: true, recording: await handlers.getVideoRecordingStatus() });
  }
  if (pathname === '/api/game/video/start') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const result = await handlers.startVideoRecording(await readBody());
    return sendJSON(result.success ? 200 : 409, result);
  }
  if (pathname === '/api/game/video/stop') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const result = await handlers.stopVideoRecording();
    return sendJSON(result.success ? 200 : 500, result);
  }
  if (pathname === '/api/game/video/layouts') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const result = await handlers.exportVideoLayouts(await readBody());
    return sendJSON(result.success ? 200 : 500, result);
  }

  // ─── GET /api/vision/state ───────────────────────────
  // AI Vision Mirror: bot pointer, recent keys, action trail. Read-only.
  if (pathname === '/api/vision/state') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    const vision = await handlers.getVisionState();
    return sendJSON(200, { success: true, vision });
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
    // Security: targetFile is read from disk and its content is returned in
    // the response. Confine it to the site tree so the endpoint cannot be
    // used as an arbitrary local-file reader (credentials, SSH keys, ...).
    const requestedTarget = body.targetFile || body.filePath;
    if (requestedTarget) {
      const confined = confineToSiteTree(rootDir, requestedTarget);
      if (!confined) return sendJSON(403, { success: false, error: 'Security Exception: target file is outside the authorized site tree' });
      body.targetFile = confined;
      delete body.filePath;
    }
    const { AutoCodeSystem } = require('../core');
    const autoCode = new AutoCodeSystem();
    const result = await autoCode.autoFixBug({
      bug: body.bug || { description: body.instruction || body.description },
      sourceFiles: body.sourceFiles || [],
      targetFile: body.targetFile,
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
          // Security: bug file paths are request-influenced (stored via
          // POST /api/bugs). Confine reads to the workspace with a
          // path.relative check; a startsWith prefix test is bypassable
          // via sibling directories (e.g. "<root>-evil").
          const abs = path.resolve(path.isAbsolute(fp) ? fp : path.join(rootDir, fp));
          const rel = path.relative(path.resolve(rootDir), abs);
          if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) continue;
          if (fs.existsSync(abs) && fs.statSync(abs).isFile() && fs.statSync(abs).size < 256 * 1024) {
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
      // Security: OpenCode edits files under dir; keep it inside the site tree.
      dir: (body.dir && confineToSiteTree(rootDir, body.dir)) || undefined,
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
  //         instructions?, bugIds? }. Returns { runId }; poll the GET below.
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
      // Security: the heal loop edits + executes under dir; site tree only.
      dir: (body.dir && confineToSiteTree(rootDir, body.dir)) || undefined,
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
    // Guardrail: only single test-ish commands, no shell metacharacters, so
    // `npm test`-shaped input cannot be turned into chained/redirected shell
    // (`;`, `&&`, `$()`, backticks, pipes, redirects, ...).
    if (!/test|bench|lint|audit|playtest|gravegain/i.test(command)) {
      return sendJSON(400, { success: false, error: 'heal-test only runs test/bench/lint/audit commands' });
    }
    if (/[;&|$`><(){}!\n\r]/.test(command) || /\|\|/.test(command) || /&&/.test(command)) {
      return sendJSON(400, { success: false, error: 'heal-test runs a single command only (no chaining, substitution, or redirects)' });
    }
    // Security: working dir must stay inside the site tree (sibling-prefix
    // startsWith checks are bypassable, so use confinement).
    const targetDir = (body.dir && confineToSiteTree(rootDir, body.dir)) || rootDir;
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

  // ─── Audio voice layer (ElevenLabs BYOK + offline PCM QA) ────
  if (pathname.startsWith('/api/audio/')) {
    const { handleAudioRequest } = require('./audio_routes');
    const handled = await handleAudioRequest(pathname, req, readBody, sendJSON, sendText);
    if (handled !== null) return handled;
  }

  // ─── GET /api/engine ─────────────────────────────
  // Unified web engine drivers: ultralight (default/main), electron (current
  // setup), chromium (standalone). Reports active engine + backends.
  if (pathname === '/api/engine') {
    if (typeof handlers.getEngines !== 'function') {
      return sendJSON(200, {
        success: true, activeEngine: 'ultralight', defaultEngine: 'ultralight',
        engines: ['ultralight', 'electron', 'chromium'],
        note: 'Host runner has no engine handlers bound (headless SDK mode).',
      });
    }
    const engines = await handlers.getEngines();
    const active = Array.isArray(engines) ? (engines.find((e) => e.active) || {}).id || 'ultralight' : 'ultralight';
    return sendJSON(200, { success: true, activeEngine: active, defaultEngine: 'ultralight', engines });
  }

  // ─── POST /api/engine/switch ─────────────────────────
  // Body: { engine: 'ultralight' | 'electron' | 'chromium' }
  if (pathname === '/api/engine/switch') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    const engine = body.engine || body.engineId;
    if (!engine) return sendJSON(400, { success: false, error: "Missing 'engine' (ultralight|electron|chromium)" });
    if (typeof handlers.setEngine !== 'function') {
      return sendJSON(501, { success: false, error: 'Host runner does not support engine switching' });
    }
    const result = await handlers.setEngine(engine);
    return sendJSON(result.success ? 200 : 400, result);
  }

  // ─── POST /api/engine/multi-qa ───────────────────────
  // Smart cross-engine pass: same URL on ultralight + electron + chromium.
  // Body: { url?, engines?: string[], actions?: object[] }
  if (pathname === '/api/engine/multi-qa') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (typeof handlers.runMultiEngineQA !== 'function') {
      return sendJSON(501, { success: false, error: 'Host runner does not support multi-engine QA' });
    }
    const result = await handlers.runMultiEngineQA({
      url: body.url, engines: body.engines, actions: body.actions,
    });
    return sendJSON(result.success ? 200 : 500, result);
  }

  // ─── Runpod cloud game + model runs (BYOK, 55 min cap, per second) ────
  // The public page calls the loopback VCW control plane, which forwards BYOK
  // calls without persistence and returns dual-desktop pod URLs.
  if (pathname.startsWith('/api/cloud/')) {
    const { handleCloudRequest } = require('./cloud_routes');
    const handled = await handleCloudRequest(pathname, req, readBody, sendJSON, sendText);
    if (handled !== null) return handled;
  }

  // ─── Godot stable runtime + cloud input bridge ───────────────────────
  if (pathname.startsWith('/api/godot/')) {
    const { handleGodotRequest } = require('./godot_routes');
    const handled = await handleGodotRequest(pathname, req, readBody, sendJSON, sendText);
    if (handled !== null) return handled;
  }

  // 404 handler
  return sendJSON(404, {
    success: false,
    error: `Endpoint '${pathname}' not found. Available endpoints: /api/status, /api/games, /api/game/launch, /api/game/screenshot, /api/game/logs, /api/game/state, /api/game/action, /api/game/eval, /api/game/patch, /api/game/video/status, /api/game/video/start, /api/game/video/stop, /api/game/video/layouts, /api/vision/state, /api/bugs, /api/audio/status, /api/audio/voices, /api/audio/tts, /api/audio/stt, /api/audio/sfx, /api/audio/music, /api/audio/analyze, /api/audio/narrate-bug, /api/audio/commentary, /api/audio/voice-command, /api/audio/npc-pack, /api/audio/cover-missing, /api/audio/subtitle-check, /api/audio/sfx-hint, /api/engine, /api/engine/switch, /api/engine/multi-qa, /api/cloud/models, /api/cloud/estimate, /api/cloud/cpu-catalog, /api/cloud/cpu-estimate, /api/cloud/launch, /api/cloud/list, /api/cloud/status, /api/cloud/stop, /api/autocode/fix, /api/autocode/report, /api/opencode/status, /api/opencode/export, /api/opencode/fix, /api/opencode/heal, /api/opencode/heal/:id, /api/opencode/heal-test, /api/opencode/revert, /api/opencode/handoff, /api/dashboard`
  });
}

module.exports = {
  handleApiRequest
};
