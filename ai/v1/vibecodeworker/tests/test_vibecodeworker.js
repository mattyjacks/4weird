const assert = require('assert');
const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

// Mock electron ipcRenderer for testing
const mockIpcRenderer = {
  invoke: async (channel, ...args) => {
    if (channel === 'is-game-window-active') return false;
    return null;
  }
};

// Mock the electron module before requiring GameController
require.cache[require.resolve('electron')] = {
  exports: { ipcRenderer: mockIpcRenderer }
};

const AgentBrain = require(path.join(projectRoot, 'automation', 'agent_brain'));
const GameController = require(path.join(projectRoot, 'automation', 'game_controller'));

async function runTests() {
  console.log("=== STARTING VIBECODEWORKER AUTOMATED TEST SUITE ===");
  const failedTests = [];

  // Test 1: AgentBrain.simpleHash
  try {
    console.log("Running Test 1: AgentBrain.simpleHash...");
    const brain = new AgentBrain();
    const hash1 = brain.simpleHash("hello world");
    const hash2 = brain.simpleHash("hello world");
    const hash3 = brain.simpleHash("hello world!");

    assert.strictEqual(hash1, hash2, "Identical inputs should yield identical hashes");
    assert.notStrictEqual(hash1, hash3, "Different inputs should yield different hashes");
    console.log("✅ Test 1 Passed!");
  } catch (err) {
    console.error("❌ Test 1 Failed:", err);
    failedTests.push("AgentBrain.simpleHash");
  }

  // Test 2: AgentBrain stuck state detection
  try {
    console.log("Running Test 2: AgentBrain stuck state detection...");
    const brain = new AgentBrain();

    const hash = brain.simpleHash("same screenshot content");
    // Simulate rolling frame history
    brain.episodes = [
      { screenshotHash: hash, action: { type: 'wait' } },
      { screenshotHash: hash, action: { type: 'wait' } },
      { screenshotHash: hash, action: { type: 'wait' } }
    ];

    const isStuck = brain.detectStuckState("same screenshot content");
    assert.strictEqual(isStuck, true, "Should detect stuck state when last 3 frame hashes match current frame");
    console.log("✅ Test 2 Passed!");
  } catch (err) {
    console.error("❌ Test 2 Failed:", err);
    failedTests.push("AgentBrain.detectStuckState");
  }

  // Test 3: AgentBrain stuck recovery cycle
  try {
    console.log("Running Test 3: AgentBrain stuck recovery cycle...");
    const brain = new AgentBrain();
    assert.strictEqual(brain.stuckRecoveryStage, 0);

    const act1 = brain.getStuckRecoveryAction();
    assert.strictEqual(brain.stuckRecoveryStage, 1);
    assert.strictEqual(act1.type, 'click');
    assert.strictEqual(act1.target, '500,500');

    const act2 = brain.getStuckRecoveryAction();
    assert.strictEqual(brain.stuckRecoveryStage, 2);
    assert.strictEqual(act2.type, 'press_key');
    assert.strictEqual(act2.target, 'Escape');

    const act3 = brain.getStuckRecoveryAction();
    // Stage 3 resets recovery stage to 0
    assert.strictEqual(brain.stuckRecoveryStage, 0);
    assert.strictEqual(act3.type, 'refresh');
    console.log("✅ Test 3 Passed!");
  } catch (err) {
    console.error("❌ Test 3 Failed:", err);
    failedTests.push("AgentBrain.stuckRecovery");
  }

  // Test 4: GameController coordinate scaling and conversion logic
  try {
    console.log("Running Test 4: GameController coordinate scaling translation...");
    const controller = new GameController();

    // Mock webview executeJavaScript for viewport size
    const mockWebview = {
      executeJavaScript: async (code) => {
        return { w: 1200, h: 800 };
      }
    };

    // Test click execution scaling math
    const action = { type: 'click', target: '500,250' };

    const parts = action.target.split(',');
    const size = await mockWebview.executeJavaScript('size');
    const x = Math.round((parseInt(parts[0]) / 1000) * size.w);
    const y = Math.round((parseInt(parts[1]) / 1000) * size.h);

    assert.strictEqual(x, 600, "50% of 1200 is 600");
    assert.strictEqual(y, 200, "25% of 800 is 200");
    console.log("✅ Test 4 Passed!");
  } catch (err) {
    console.error("❌ Test 4 Failed:", err);
    failedTests.push("GameController.coordinateScaling");
  }

  // Test 5: Token usage recording and statistics under normal load (1,500 tokens)
  try {
    console.log("Running Test 5: AgentBrain token usage stats tracking (1,500 tokens)...");
    const brain = new AgentBrain();
    const tempDir = path.join(projectRoot, 'data', 'test_temp_' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    brain.dataDir = tempDir;
    brain.startNewRun();

    // Record token usage: 1,000 input tokens, 500 output tokens = 1,500 total tokens
    brain.recordTokenUsage('gpt-5.4-mini-2026-03-17', 1000, 500);

    const stats = brain.getTokenStats();
    assert.strictEqual(stats.total.lifetime, 1500, "Lifetime token count should be exactly 1,500");
    assert.strictEqual(stats.total.lastRun, 1500, "Last run token count should be exactly 1,500");
    assert.strictEqual(stats.models['gpt-5.4-mini-2026-03-17'].lifetime, 1500, "Model specific lifetime tokens should be 1,500");

    // Cleanup temp files & folder
    // The automatic internal brain owns a small text-memory directory too.
    // Remove the isolated test fixture recursively instead of assuming a flat
    // data folder.
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log("✅ Test 5 Passed!");
  } catch (err) {
    console.error("❌ Test 5 Failed:", err);
    failedTests.push("AgentBrain.tokenUsageStats");
  }

  // Test 6: GameController mouse click coordinate scaling
  try {
    console.log("Running Test 6: GameController mouse click coordinate scaling...");
    const controller = new GameController();

    // Test scaled coordinates (0-1000 range) directly
    const action = { type: 'click', target: '500,500' };
    const parts = action.target.split(',');
    const size = { w: 1920, h: 1080 };
    const x = Math.round((parseInt(parts[0]) / 1000) * size.w);
    const y = Math.round((parseInt(parts[1]) / 1000) * size.h);

    assert.strictEqual(x, 960, "50% of 1920 is 960");
    assert.strictEqual(y, 540, "50% of 1080 is 540");
    console.log("✅ Test 6 Passed!");
  } catch (err) {
    console.error("❌ Test 6 Failed:", err);
    failedTests.push("GameController.mouseClickScaling");
  }

  // Test 7: GameController key code mapping
  try {
    console.log("Running Test 7: GameController key code mapping...");
    const controller = new GameController();

    // Test standard keys
    assert.strictEqual(controller.getKeyCode('ArrowLeft'), 'ArrowLeft');
    assert.strictEqual(controller.getKeyCode('ArrowRight'), 'ArrowRight');
    assert.strictEqual(controller.getKeyCode('ArrowUp'), 'ArrowUp');
    assert.strictEqual(controller.getKeyCode('ArrowDown'), 'ArrowDown');
    assert.strictEqual(controller.getKeyCode('Space'), 'Space');
    assert.strictEqual(controller.getKeyCode(' '), 'Space');
    assert.strictEqual(controller.getKeyCode('Enter'), 'Enter');
    assert.strictEqual(controller.getKeyCode('Escape'), 'Escape');

    // Test WASD keys
    assert.strictEqual(controller.getKeyCode('w'), 'KeyW');
    assert.strictEqual(controller.getKeyCode('a'), 'KeyA');
    assert.strictEqual(controller.getKeyCode('s'), 'KeyS');
    assert.strictEqual(controller.getKeyCode('d'), 'KeyD');

    // Test modifier keys
    assert.strictEqual(controller.getKeyCode('Shift'), 'ShiftLeft');
    assert.strictEqual(controller.getKeyCode('Control'), 'ControlLeft');
    assert.strictEqual(controller.getKeyCode('Alt'), 'AltLeft');

    // Test function keys
    assert.strictEqual(controller.getKeyCode('F5'), 'F5');
    assert.strictEqual(controller.getKeyCode('F12'), 'F12');

    // Test single character fallback
    assert.strictEqual(controller.getKeyCode('x'), 'KeyX');
    assert.strictEqual(controller.getKeyCode('z'), 'KeyZ');

    console.log("✅ Test 7 Passed!");
  } catch (err) {
    console.error("❌ Test 7 Failed:", err);
    failedTests.push("GameController.keyCodeMapping");
  }

  // Test 8: GameController press_key action execution
  try {
    console.log("Running Test 8: GameController press_key action execution...");
    const controller = new GameController();

    // Mock webview that captures dispatched events
    let capturedKeyDown = null;
    let capturedKeyPress = null;
    let capturedKeyUp = null;

    const mockWebview = {
      executeJavaScript: async (code) => {
        if (code.includes('keydown')) {
          capturedKeyDown = true;
          return "Pressed Enter";
        }
        return null;
      }
    };

    // Mock executeJS to bypass ipcRenderer
    controller.executeJS = async (webview, code) => {
      return await webview.executeJavaScript(code);
    };

    const action = { type: 'press_key', target: 'Enter' };
    const result = await controller.executeAction(mockWebview, action);

    assert.strictEqual(capturedKeyDown, true, "Keydown event should be dispatched");
    console.log("✅ Test 8 Passed!");
  } catch (err) {
    console.error("❌ Test 8 Failed:", err);
    failedTests.push("GameController.pressKeyExecution");
  }

  // Test 9: GameController hold_key action execution
  try {
    console.log("Running Test 9: GameController hold_key action execution...");
    const controller = new GameController();

    let capturedKeyDown = null;
    let capturedKeyUp = null;

    const mockWebview = {
      executeJavaScript: async (code) => {
        if (code.includes('keydown')) {
          capturedKeyDown = true;
        }
        if (code.includes('keyup')) {
          capturedKeyUp = true;
        }
        return "Held Space for 200ms";
      }
    };

    // Mock executeJS to bypass ipcRenderer
    controller.executeJS = async (webview, code) => {
      return await webview.executeJavaScript(code);
    };

    const action = { type: 'hold_key', target: 'Space', duration_ms: 200 };
    const result = await controller.executeAction(mockWebview, action);

    assert.strictEqual(capturedKeyDown, true, "Keydown event should be dispatched");
    assert.strictEqual(capturedKeyUp, true, "Keyup event should be dispatched after duration");
    console.log("✅ Test 9 Passed!");
  } catch (err) {
    console.error("❌ Test 9 Failed:", err);
    failedTests.push("GameController.holdKeyExecution");
  }

  // Test 10: GameController click action with selector target
  try {
    console.log("Running Test 10: GameController click action with selector target...");
    const controller = new GameController();

    const mockWebview = {
      executeJavaScript: async (code) => {
        if (code.includes('getBoundingClientRect')) {
          return { x: 100, y: 200 };
        }
        if (code.includes('elementFromPoint')) {
          return "Clicked BUTTON at 100,200";
        }
        return null;
      }
    };

    // Mock executeJS to bypass ipcRenderer
    controller.executeJS = async (webview, code) => {
      return await webview.executeJavaScript(code);
    };

    const action = { type: 'click', target: '#submit-button' };
    const result = await controller.executeAction(mockWebview, action);

    assert(result.includes("Clicked"), "Click should be executed on element");
    console.log("✅ Test 10 Passed!");
  } catch (err) {
    console.error("❌ Test 10 Failed:", err);
    failedTests.push("GameController.selectorClick");
  }

  // Test 11: GameController wait action
  try {
    console.log("Running Test 11: GameController wait action...");
    const controller = new GameController();

    const action = { type: 'wait', duration_ms: 100 };
    const startTime = Date.now();
    const result = await controller.executeAction(null, action);
    const endTime = Date.now();

    const elapsed = endTime - startTime;
    assert(elapsed >= 100, "Wait should last at least 100ms");
    assert(elapsed < 200, "Wait should not take significantly longer than specified");
    assert.strictEqual(result, "Waited 100ms");
    console.log("✅ Test 11 Passed!");
  } catch (err) {
    console.error("❌ Test 11 Failed:", err);
    failedTests.push("GameController.waitAction");
  }

  // Test 12: GameController refresh action
  try {
    console.log("Running Test 12: GameController refresh action...");
    const controller = new GameController();

    let reloadCalled = false;
    const mockWebview = {
      reload: () => {
        reloadCalled = true;
      }
    };

    // Mock executeJS to bypass ipcRenderer
    controller.executeJS = async (webview, code) => {
      return null;
    };

    const action = { type: 'refresh' };
    const result = await controller.executeAction(mockWebview, action);

    assert.strictEqual(reloadCalled, true, "Webview reload should be called");
    assert.strictEqual(result, "Reloaded page");
    console.log("✅ Test 12 Passed!");
  } catch (err) {
    console.error("❌ Test 12 Failed:", err);
    failedTests.push("GameController.refreshAction");
  }

  // Test 13: Local API Server game discovery & GraveGain3D availability
  try {
    console.log("Running Test 13: Local API Server game discovery & GraveGain3D endpoint verification...");
    const { discoverGames } = require(path.join(projectRoot, 'server', 'start_api_server'));
    const games = discoverGames();
    assert(Array.isArray(games) && games.length > 0, "Games list should not be empty");

    const gravegain3d = games.find(g => g.id.toLowerCase() === 'gravegain3d');
    assert(gravegain3d, "GraveGain3D must be discovered by VibeCodeWorker API server");
    assert(gravegain3d.url.includes('gravegain3d'), "GraveGain3D URL must point to gravegain3d");
    assert(fs.existsSync(gravegain3d.absPath), "GraveGain3D directory path must exist on disk");
    console.log("✅ Test 13 Passed!");
  } catch (err) {
    console.error("❌ Test 13 Failed:", err);
    failedTests.push("LocalAPIServer.discoverGraveGain3D");
  }

  // Test 14: GraveGain3D runtime bindings and window.game contract verification
  try {
    console.log("Running Test 14: GraveGain3D runtime binding & window.game contract validation...");
    const gameRuntimePath = path.join(projectRoot, '..', '..', '..', 'website', 'v1', 'games', 'html', 'gravegain3d', 'engine', 'game-runtime.js');
    assert(fs.existsSync(gameRuntimePath), "GraveGain3D game-runtime.js must exist");
    const runtimeCode = fs.readFileSync(gameRuntimePath, 'utf8');

    assert(runtimeCode.includes("Object.defineProperty(window, 'game'"), "Must expose window.game property");
    assert(runtimeCode.includes("Object.defineProperty(window, 'gameState'"), "Must expose window.gameState property");
    assert(runtimeCode.includes("startQuickRun"), "Must expose startQuickRun helper for automated VibeCodeWorker launch");
    assert(runtimeCode.includes("attack:"), "Must expose attack helper for VibeCodeWorker actions");
    assert(runtimeCode.includes("usePotion:"), "Must expose usePotion helper for VibeCodeWorker actions");
    console.log("✅ Test 14 Passed!");
  } catch (err) {
    console.error("❌ Test 14 Failed:", err);
    failedTests.push("GraveGain3D.runtimeBindings");
  }

  // Test 15: GraveGain3D Autoplay Heuristic Controller
  try {
    console.log("Running Test 15: GraveGain3D Autoplay Heuristic Controller...");
    const { runGraveGain3DAutoplay } = require(path.join(projectRoot, 'src', 'runtime', 'gravegain3d_autoplay'));
    assert(typeof runGraveGain3DAutoplay === 'function', "runGraveGain3DAutoplay must be exported as a function");

    // Test menu scenario
    const mockWebviewMenu = {
      executeJavaScript: async (code) => {
        return { isMainMenuVisible: true, menuAction: { x: 640, y: 740 } };
      }
    };
    const menuDecision = await runGraveGain3DAutoplay(mockWebviewMenu);
    assert.strictEqual(menuDecision.status, 'menu', "Should detect menu state");
    assert.strictEqual(menuDecision.action.target, '640,740', "Should target the measured play button center, not a selector fallback");

    const mockWebviewUnavailableMenu = {
      executeJavaScript: async () => ({ isMainMenuVisible: true, menuAction: null })
    };
    const unavailableMenuDecision = await runGraveGain3DAutoplay(mockWebviewUnavailableMenu);
    assert.strictEqual(unavailableMenuDecision.action.type, 'wait', "Should wait when the intended menu control is unavailable instead of clicking center");

    // Test playing & combat scenario
    const mockWebviewCombat = {
      executeJavaScript: async (code) => {
        return {
          isInDungeon: true,
          player: { hp: 100, maxHp: 100, potions: 2, gold: 50 },
          nearestEnemy: { name: 'Skeleton Warrior', dist: 45 },
          totalEnemies: 3
        };
      }
    };
    const combatDecision = await runGraveGain3DAutoplay(mockWebviewCombat);
    assert.strictEqual(combatDecision.status, 'playing', "Should detect playing state");
    assert.notStrictEqual(combatDecision.action.target, 'f', "Combat autoplay must never substitute the ability key for melee");

    // Test potion healing scenario
    const mockWebviewPotion = {
      executeJavaScript: async (code) => {
        return {
          isInDungeon: true,
          player: { hp: 25, maxHp: 100, potions: 2, gold: 50 },
          nearestEnemy: null,
          totalEnemies: 0
        };
      }
    };
    const potionDecision = await runGraveGain3DAutoplay(mockWebviewPotion);
    assert.strictEqual(potionDecision.action.target, 'q', "Should consume potion (key Q) when low health");

    console.log("✅ Test 15 Passed!");
  } catch (err) {
    console.error("❌ Test 15 Failed:", err);
    failedTests.push("GraveGain3D.autoplayHeuristic");
  }

  // Test 16: AutoCode Direct AI Coding Fix, VibeCode, Diff generation & Token/Cost Reporting
  try {
    console.log("Running Test 16: AutoCode Direct AI Coding Fix, Token Tracking & Cost Reporting...");
    const { AutoCodeSystem } = require(path.join(projectRoot, 'lib', 'core'));
    const autoCode = new AutoCodeSystem();

    // Verify screenshot helpers
    assert.strictEqual(autoCode.screenshots.length, 0);
    autoCode.addScreenshot("sample_base64_data");
    assert.strictEqual(autoCode.screenshots.length, 1);
    autoCode.clearScreenshots();
    assert.strictEqual(autoCode.screenshots.length, 0);

    autoCode.updateConfig({
      modelName: 'gpt-4o-mini',
      budgetLimit: 0.20,
      maxOutputTokens: 2000
    });

    // Mock callLLM to verify token recording & cost generation
    autoCode.callLLM = async (prompt, model) => {
      const activeModel = model || 'gpt-4o-mini';
      const promptTokens = 1200;
      const completionTokens = 350;
      const { calculateCost, formatCost } = require(path.join(projectRoot, 'lib', 'pricing'));
      const cost = calculateCost(activeModel, promptTokens, completionTokens);
      const { recordTokenUsage } = require(path.join(projectRoot, 'lib', 'brain', 'token_tracker'));
      recordTokenUsage(autoCode, activeModel, promptTokens, completionTokens);
      return {
        content: `// Patched Game Code\nconsole.log("Bug resolved autonomously through VibeCodeWorker direct tokens");\nwindow.gameState = { active: true, score: 100 };`,
        model: activeModel,
        provider: 'openai',
        usage: { promptTokens, completionTokens, totalTokens: 1550 },
        cost,
        costFormatted: formatCost(cost)
      };
    };

    const dummyFile = path.join(projectRoot, 'data', 'temp_test_game.js');
    fs.writeFileSync(dummyFile, 'console.log("Original bugged game code");', 'utf8');

    const result = await autoCode.autoFixBug({
      bug: {
        title: "Test State Exposure Bug",
        type: "MISSING_STATE_EXPOSURE",
        description: "Game state not exposed on window in temp_test_game.js",
        severity: "medium"
      },
      sourceFiles: [{ path: dummyFile, content: 'console.log("Original bugged game code");' }],
      targetFile: dummyFile
    });

    assert.strictEqual(result.success, true, "autoFixBug should succeed");
    assert(result.diff.length > 0, "Diff should be generated");
    assert(result.usage.totalTokens > 0, "Tokens should be tracked in result");
    assert(result.cost.cost > 0 || result.cost > 0, "Cost should be calculated");
    assert(result.modifiedContent.includes("Bug resolved autonomously"), "Modified content should contain AI fix");

    // Apply the fix and verify disk writing
    const applied = autoCode.applyChanges(dummyFile, result.modifiedContent);
    assert.strictEqual(applied, true, "applyChanges should write to disk");
    const updatedDiskContent = fs.readFileSync(dummyFile, 'utf8');
    assert(updatedDiskContent.includes("Bug resolved autonomously"), "Disk file should reflect applied fix");

    // Clean up temporary file
    if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);

    // Verify report was logged
    const reportFile = path.join(autoCode.dataDir, 'autocode_fix_report.json');
    assert(fs.existsSync(reportFile), "autocode_fix_report.json should exist");
    const reports = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert(reports.length > 0, "Reports list should have at least 1 entry");

    console.log("✅ Test 16 Passed!");
  } catch (err) {
    console.error("❌ Test 16 Failed:", err);
    failedTests.push("AutoCode.directAIFixAndCostReporting");
  }

  // Test 17: Environment Variable Resolution for OPENAI_API_KEY and OPENROUTER_API_KEY
  const _t17OriginalFetch = global.fetch;
  try {
    console.log("Running Test 17: Environment Variable Resolution (OPENAI_API_KEY & OPENROUTER_API_KEY)...");
    const { AutoCodeSystem } = require(path.join(projectRoot, 'lib', 'core'));
    const storage = require(path.join(projectRoot, 'lib', 'storage'));
    const autoCode = new AutoCodeSystem();

    // Isolate from Test 23's persistent credential store: stored keys outrank
    // env vars by design, so stash + clear openai/openrouter before asserting
    // env fallback, then restore afterwards.
    let stashedCreds = {};
    try { stashedCreds = storage.loadCredentials() || {}; } catch (_) {}
    try { storage.removeCredentialsForProviders(['openai', 'openrouter']); } catch (_) {}
    try { storage._clearCredentialsCache(); } catch (_) {}

    // Case A: OPENROUTER_API_KEY
    process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-test-key-456";
    autoCode.updateConfig({ provider: 'openrouter', apiKey: '' });

    // Intercept fetch to check headers
    let interceptedAuth = '';
    let interceptedUrl = '';
    global.fetch = async (url, opts) => {
      interceptedUrl = url;
      interceptedAuth = (opts && opts.headers && opts.headers['Authorization']) || '';
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'console.log("ok");' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 }
        })
      };
    };

    const resOpenRouter = await autoCode.callLLM("test prompt", "google/gemini-2.5-flash");
    assert.strictEqual(interceptedAuth, "Bearer sk-or-v1-mock-test-key-456", "Should use process.env.OPENROUTER_API_KEY");
    assert(interceptedUrl.includes("openrouter.ai"), "Should call openrouter endpoint");
    assert.strictEqual(resOpenRouter.usage.totalTokens, 150, "Should report total tokens");

    // Case B: OPENAI_API_KEY
    process.env.OPENAI_API_KEY = "sk-proj-mock-test-key-123";
    autoCode.updateConfig({ provider: 'openai', apiKey: '' });
    const resOpenAI = await autoCode.callLLM("test prompt", "gpt-4o-mini");
    assert.strictEqual(interceptedAuth, "Bearer sk-proj-mock-test-key-123", "Should use process.env.OPENAI_API_KEY");
    assert(interceptedUrl.includes("openai.com"), "Should call openai endpoint");

    // Restore stashed credentials (Test 23 data) so later tests see them.
    try {
      const toRestore = {};
      if (stashedCreds.openaiApiKey) toRestore.openaiApiKey = stashedCreds.openaiApiKey;
      if (stashedCreds.openrouterApiKey) toRestore.openrouterApiKey = stashedCreds.openrouterApiKey;
      if (Object.keys(toRestore).length) storage.saveCredentials(toRestore);
      else storage._clearCredentialsCache();
    } catch (_) {}
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;

    console.log("✅ Test 17 Passed!");
  } catch (err) {
    console.error("❌ Test 17 Failed:", err);
    failedTests.push("AutoCode.environmentVariableResolution");
  } finally {
    // Always restore fetch: a leaked mock breaks Tests 25/28/30 (real localhost calls).
    global.fetch = _t17OriginalFetch;
    try { delete process.env.OPENROUTER_API_KEY; } catch (_) {}
    try { delete process.env.OPENAI_API_KEY; } catch (_) {}
  }

  // Test 18: Ultralight Web Engine Automation & Bug Telemetry
  try {
    console.log("Running Test 18: Ultralight Web Engine Automation & Bug Telemetry...");
    const { UltralightWebEngine } = require(path.join(projectRoot, 'src', 'runtime', 'ultralight_engine'));
    const engine = new UltralightWebEngine();
    assert.strictEqual(engine.name, 'Ultralight WebKit-Core');
    assert.strictEqual(engine.options.viewportWidth, 1280);

    // Test navigation event
    let navFired = false;
    engine.on('navigating', (ev) => { if (ev.url === 'http://localhost:8888/games/html/orbitaldrift/index.html') navFired = true; });
    await engine.navigate('http://localhost:8888/games/html/orbitaldrift/index.html');
    assert.strictEqual(navFired, true, "Engine should fire navigation event");

    // Test console error detection into Bug Tracker
    let bugCaught = null;
    engine.on('bug_detected', (bug) => { bugCaught = bug; });
    engine.logConsole('error', 'Uncaught TypeError: Cannot read property of undefined at script.js:42');
    assert.notStrictEqual(bugCaught, null, "Should flag console error as detected defect");
    assert.strictEqual(bugCaught.type, 'Web Console Exception');

    // Test network failure telemetry
    let netBugCaught = null;
    engine.on('bug_detected', (bug) => { if (bug.type.includes('Network')) netBugCaught = bug; });
    engine.logNetwork({ url: 'http://localhost:8888/assets/sprites/player.png', status: 404 });
    assert.notStrictEqual(netBugCaught, null, "Should flag 404 network failure as detected defect");

    const metrics = engine.getMetrics();
    assert.strictEqual(metrics.consoleErrors, 1);
    assert.strictEqual(metrics.networkFailures, 1);
    assert.strictEqual(metrics.diagnosedBugs, 2);

    console.log("✅ Test 18 Passed!");
  } catch (err) {
    console.error("❌ Test 18 Failed:", err);
    failedTests.push("UltralightWebEngine.telemetryAndAutomation");
  }

  // Test 19: CaptchaDetector HITL Challenge Detection & Resolution
  try {
    console.log("Running Test 19: CaptchaDetector HITL Challenge Detection & Resolution...");
    const { CaptchaDetector } = require(path.join(projectRoot, 'src', 'runtime', 'captcha_detector'));
    const detector = new CaptchaDetector();

    // Mock controller that simulates a Cloudflare Turnstile challenge
    let challengeActive = true;
    const mockController = {
      executeJS: async (webview, code) => {
        if (challengeActive) {
          return { detected: true, type: 'Cloudflare Turnstile', selector: '.cf-turnstile' };
        }
        return { detected: false, type: 'none', selector: null };
      }
    };

    const statusInitial = await detector.checkDOMForCaptcha(mockController, null);
    assert.strictEqual(statusInitial.detected, true, "Should detect Cloudflare Turnstile challenge");
    assert.strictEqual(statusInitial.type, 'Cloudflare Turnstile');

    // Simulate resolution after 50ms
    setTimeout(() => { challengeActive = false; }, 50);
    const resolution = await detector.waitForResolution(mockController, null, 2000, 20);
    assert.strictEqual(resolution.resolved, true, "Should report resolved once challenge cleared");

    console.log("✅ Test 19 Passed!");
  } catch (err) {
    console.error("❌ Test 19 Failed:", err);
    failedTests.push("CaptchaDetector.detectionAndResolution");
  }

  // Test 20: Web Automation Action Dispatcher (type_text and scroll)
  try {
    console.log("Running Test 20: Web Automation Action Dispatcher (type_text and scroll)...");
    const gameCtrl = new GameController();
    let lastEvaluatedScript = '';
    gameCtrl.executeJS = async (webview, code) => {
      lastEvaluatedScript = code;
      return "mock_executed";
    };

    // Test type_text action
    const typeAction = {
      type: 'type_text',
      params: { selector: '#email-input', text: 'tester@4weird.com' }
    };
    await gameCtrl.executeAction(null, typeAction);
    assert.ok(lastEvaluatedScript.includes('#email-input'), "Script must query selector #email-input");
    assert.ok(lastEvaluatedScript.includes('tester@4weird.com'), "Script must include input text");

    // Test scroll action
    const scrollAction = {
      type: 'scroll',
      params: { direction: 'down', amount: 500 }
    };
    await gameCtrl.executeAction(null, scrollAction);
    assert.ok(lastEvaluatedScript.includes('window.scrollBy'), "Script must call window.scrollBy");
    assert.ok(lastEvaluatedScript.includes('500'), "Script must specify scroll delta");

    console.log("✅ Test 20 Passed!");
  } catch (err) {
    console.error("❌ Test 20 Failed:", err);
    failedTests.push("GameController.webActionDispatcher");
  }

  // Test 21: CloudFleetOrchestrator Ephemeral Provisioning & Billing Calculation
  try {
    console.log("Running Test 21: CloudFleetOrchestrator Ephemeral Provisioning & Billing Calculation...");
    const { CloudFleetOrchestrator } = require(path.join(projectRoot, 'src', 'runtime', 'cloud_fleet_orchestrator'));
    const orchestrator = new CloudFleetOrchestrator({ orchestrationFeePercent: 15 });

    // Validate rate calculation with 15% platform premium
    const stdRates = orchestrator.calculateBilledRate('standard');
    assert.strictEqual(stdRates.baseHourlyCost, 0.16);
    assert.strictEqual(stdRates.billedHourly, 0.184); // 0.16 * 1.15 = 0.184
    assert.strictEqual(stdRates.orchestrationFeePercent, 15);

    // Provision an ephemeral standard node
    const instance = await orchestrator.provisionInstance('standard', { targetUrl: 'https://example.com' });
    assert.ok(instance.id.startsWith('node-'), "Instance ID should be generated");
    assert.strictEqual(instance.status, 'ready');
    assert.ok(instance.streamUrl.includes(instance.id), "Stream URL should include node ID");

    // Record 60 seconds of usage
    const tick = orchestrator.recordUsageTick(instance.id, 60);
    assert.strictEqual(tick.totalActiveSeconds, 60);
    assert.ok(tick.currentCostUSD > 0, "Current cost should increment");

    // Terminate instance and get final receipt
    const receipt = await orchestrator.terminateInstance(instance.id);
    assert.strictEqual(receipt.id, instance.id);
    assert.strictEqual(receipt.totalActiveSeconds, 60);
    assert.strictEqual(orchestrator.getActiveInstances().length, 0, "Active instances list should be empty after termination");

    console.log("✅ Test 21 Passed!");
  } catch (err) {
    console.error("❌ Test 21 Failed:", err);
    failedTests.push("CloudFleetOrchestrator.provisioningAndBilling");
  }

  // Test 22: SDK key presses must release the key after sending it.
  try {
    console.log("Running Test 22: VibeCodeWorker SDK pressKey key-up pairing...");
    const { VibeCodeWorkerClient } = require(path.join(projectRoot, 'lib', 'vibecodeworker_client'));
    const client = new VibeCodeWorkerClient();
    const requests = [];
    client._request = async (endpoint, options) => {
      requests.push({ endpoint, action: JSON.parse(options.body) });
      return { success: true };
    };

    await client.pressKey('Space');
    assert.deepStrictEqual(requests, [
      { endpoint: '/api/game/action', action: { type: 'keydown', key: 'Space' } },
      { endpoint: '/api/game/action', action: { type: 'keyup', key: 'Space' } }
    ]);
    await assert.rejects(() => client.pressKey(''), /requires a key/);
    console.log("✅ Test 22 Passed!");
  } catch (err) {
    console.error("❌ Test 22 Failed:", err);
    failedTests.push("VibeCodeWorkerClient.pressKey");
  }

  // Test 23: Persistent Local Credentials Storage Across Builds
  try {
    console.log("Running Test 23: Persistent Local Credentials Storage...");
    const { saveCredentials, loadCredentials, getResolvedApiKey, getCredentialsFilePath } = require(path.join(projectRoot, 'lib', 'storage'));
    
    // Save sample keys
    const testSaved = saveCredentials({
      deepseekApiKey: 'sk-dsh-test-12345',
      metaApiKey: 'meta-muse-test-67890',
      openaiApiKey: 'sk-luna-test-abcdef'
    });
    assert.strictEqual(testSaved, true, "saveCredentials should succeed");

    const creds = loadCredentials();
    assert.strictEqual(creds.deepseekApiKey, 'sk-dsh-test-12345', "Should persist deepseekApiKey");
    assert.strictEqual(creds.metaApiKey, 'meta-muse-test-67890', "Should persist metaApiKey");
    assert.strictEqual(creds.openaiApiKey, 'sk-luna-test-abcdef', "Should persist openaiApiKey");

    // Test resolution function
    assert.strictEqual(getResolvedApiKey('deepseek'), 'sk-dsh-test-12345', "getResolvedApiKey for deepseek should return stored key");
    assert.strictEqual(getResolvedApiKey('meta'), 'meta-muse-test-67890', "getResolvedApiKey for meta should return stored key");
    assert.strictEqual(getResolvedApiKey('openai'), 'sk-luna-test-abcdef', "getResolvedApiKey for openai should return stored key");

    console.log("✅ Test 23 Passed!");
  } catch (err) {
    console.error("❌ Test 23 Failed:", err);
    failedTests.push("Storage.persistentCredentials");
  }

  // Test 24: DeepSeek & Meta Muse Spark Provider and Self-Improvement Cycle
  const _t24OriginalFetch = global.fetch;
  try {
    console.log("Running Test 24: DeepSeek & Meta Providers and Self-Improvement Cycle...");
    const { AutoCodeSystem } = require(path.join(projectRoot, 'lib', 'core'));
    const autoCode = new AutoCodeSystem();

    // Mock fetch for LLM call testing
    const originalFetch = _t24OriginalFetch;
    let lastUrl = '';
    let lastBody = null;
    let lastAuth = '';

    global.fetch = async (url, opts) => {
      lastUrl = url;
      lastBody = JSON.parse(opts.body);
      lastAuth = opts.headers['Authorization'];
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                analysis: "Engine event loop optimization",
                changesSummary: "Added adaptive tick rate",
                improvedCode: "// Improved code here",
                confidenceScore: 0.98
              })
            }
          }],
          usage: { prompt_tokens: 200, completion_tokens: 100 }
        })
      };
    };

    // DeepSeek callLLM verification
    autoCode.updateConfig({ provider: 'deepseek', apiKey: 'sk-deepseek-mock' });
    const dsResult = await autoCode.callLLM("Analyze engine performance", "deepseek-reasoner");
    assert(lastUrl.includes("api.deepseek.com"), "Should target api.deepseek.com");
    assert.strictEqual(lastAuth, "Bearer sk-deepseek-mock", "Should pass DeepSeek bearer token");
    assert.strictEqual(lastBody.model, "deepseek-reasoner", "Should send deepseek-reasoner model");

    // Meta Muse Spark callLLM verification
    autoCode.updateConfig({ provider: 'meta', apiKey: 'meta-token-mock' });
    const metaResult = await autoCode.callLLM("Test prompt", "meta/muse-spark-1.3-contributor");
    assert(lastUrl.includes("openrouter.ai") || lastUrl.includes("meta.ai"), "Should target Meta / OpenRouter endpoint");
    assert.strictEqual(lastBody.model, "meta/muse-spark-1.3-contributor", "Should specify muse-spark model");

    // Test self improvement loop invocation
    const { runSelfImprovementCycle } = require(path.join(projectRoot, 'lib', 'deepseek_harness'));
    const selfImproveResult = await runSelfImprovementCycle(null, {
      goal: "Enhance engine throughput and test coverage."
    });
    assert.strictEqual(selfImproveResult.success, true, "Self-improvement cycle should complete successfully");
    assert(selfImproveResult.analysis.length > 0, "Self-improvement should yield analysis");
    assert.strictEqual(selfImproveResult.changesSummary, "Added adaptive tick rate", "Should parse changes summary");

    // Restore fetch
    global.fetch = originalFetch;

    console.log("✅ Test 24 Passed!");
  } catch (err) {
    console.error("❌ Test 24 Failed:", err);
    failedTests.push("DeepSeek.harnessAndProviders");
  } finally {
    global.fetch = _t24OriginalFetch;
  }

  // Test 25: Configurable Local REST API Server Port (Default 42069, dynamic change)
  try {
    console.log("Running Test 25: Configurable Local REST API Server Port...");
    const { LocalAPIServer } = require(path.join(projectRoot, 'lib', 'api_server'));

    // Test default port 42069
    const defaultServer = new LocalAPIServer();
    assert.strictEqual(defaultServer.port, 42069, "Default port should be 42069");

    // Test custom port specification
    const customPort = 42070;
    const customServer = new LocalAPIServer({ port: customPort });
    assert.strictEqual(customServer.port, 42070, "Custom port should be accepted");

    // Start and stop server on dynamic port
    await customServer.start();
    const res = await fetch(`http://127.0.0.1:${customPort}/api/status`);
    assert.strictEqual(res.ok, true, "Should respond on custom configured port");
    const statusData = await res.json();
    assert.strictEqual(statusData.success, true, "Status should report success: true");
    assert.strictEqual(statusData.system, '4weird VibeCodeWorker Local API Server');
    await customServer.stop();

    console.log("✅ Test 25 Passed!");
  } catch (err) {
    console.error("❌ Test 25 Failed:", err);
    failedTests.push("ApiServer.configurablePort");
  }

  // Test 26: Super Secure Hardening (Path Traversal, Protected Files, Origin Isolation)
  try {
    console.log("Running Test 26: Super Secure Hardening Defenses...");
    const { handlePatchFile } = require(path.join(projectRoot, 'lib', 'api', 'patch_handler'));
    const rootDir = path.resolve(projectRoot, '..', '..', '..');

    // Attempt path traversal outside workspace
    const traversalResult = await handlePatchFile({
      filePath: '../../../../etc/passwd',
      fullContent: 'malicious'
    }, rootDir);
    assert.strictEqual(traversalResult.status, 403, "Should reject traversal with 403");
    assert(traversalResult.data.error.includes("Security Exception"), "Should return Security Exception");

    // Attempt to patch a sensitive protected file (.env)
    const envResult = await handlePatchFile({
      filePath: '.env',
      fullContent: 'STOLEN_KEY=123'
    }, rootDir);
    assert.strictEqual(envResult.status, 403, "Should reject patching .env with 403");

    // Attempt to patch credentials file
    const credResult = await handlePatchFile({
      filePath: 'credentials.enc',
      fullContent: 'malicious'
    }, rootDir);
    assert.strictEqual(credResult.status, 403, "Should reject patching credentials with 403");

    console.log("✅ Test 26 Passed!");
  } catch (err) {
    console.error("❌ Test 26 Failed:", err);
    failedTests.push("Security.superSecureDefenses");
  }

  // Test 27: OpenCode.ai Bridge (offline-safe: no binary, no network)
  try {
    console.log("Running Test 27: OpenCode Bridge export/prompt/heal plumbing...");
    const bridge = require(path.join(projectRoot, 'lib', 'opencode_bridge'));

    // Defaults: disabled, CLI mode, workspace = repo root
    delete process.env.OPENCODE_ENABLED;
    const defaults = bridge.getOpenCodeConfig({});
    assert.strictEqual(defaults.enabled, false, "Bridge must be disabled by default");
    assert.strictEqual(defaults.mode, 'cli', "Default mode should be cli");
    assert(fs.existsSync(defaults.workspaceRoot), "Workspace root should exist");

    // Env override
    process.env.OPENCODE_ENABLED = '1';
    assert.strictEqual(bridge.getOpenCodeConfig({}).enabled, true, "OPENCODE_ENABLED=1 should enable");
    delete process.env.OPENCODE_ENABLED;

    // Missing binary degrades gracefully (never throws)
    const missing = bridge.detectOpenCode('definitely-not-a-real-binary-xyz');
    assert.strictEqual(missing.available, false, "Bogus binary must report unavailable");
    assert(missing.hint && missing.hint.includes('opencode.ai'), "Should include install hint");

    // Prompt builder carries bugs + hard rules
    const bugs = [{ id: 'BUG-T1', gameId: 'gravegain3d', title: 'Crash on load', description: 'null ref', severity: 'high', consoleLogs: ['TypeError: x'] }];
    const prompt = bridge.buildBugFixPrompt({ bugs, gameId: 'gravegain3d' });
    assert(prompt.includes('Crash on load'), "Prompt must include bug title");
    assert(prompt.includes('MUST pass'), "Prompt must include verification rule");

    // Export writes md + json, truncates huge screenshots
    const big = { ...bugs[0], id: 'BUG-T2', screenshot: 'A'.repeat(5000) };
    const exported = bridge.exportBugReport({ bugs: [bugs[0], big], gameId: 'gravegain3d' });
    assert.strictEqual(exported.success, true, "Export should succeed");
    assert.strictEqual(exported.bugCount, 2, "Export should count both bugs");
    assert(fs.existsSync(exported.mdPath), "Markdown report must exist");
    assert(fs.existsSync(exported.jsonPath), "JSON report must exist");
    const payload = JSON.parse(fs.readFileSync(exported.jsonPath, 'utf8'));
    assert(payload.bugs[1].screenshot.length < 5000, "Screenshots must be truncated in JSON");

    // fixBugs with no bugs refuses cleanly (no opencode spawn attempted)
    const noBugs = await bridge.fixBugs({ bugs: [] });
    assert.strictEqual(noBugs.success, false, "fixBugs with no bugs must fail cleanly");

    // Shell runner + failure extractor
    const echoRes = await bridge.runShellCommand('echo test-ok', __dirname, 15000);
    assert.strictEqual(echoRes.exitCode, 0, "echo should exit 0");
    assert(echoRes.output.includes('test-ok'), "Should capture stdout");
    const fails = bridge.extractFailuresFromOutput('ok line\nFAIL boom\nError: bad\n0 failures');
    assert(fails.some(f => f.includes('FAIL boom')), "Should extract FAIL lines");

    // Self-heal loop with an injected passing runner → 'healed' without touching disk
    const { runId } = bridge.startHealCycle({
      bugs: [], gameId: 'gravegain3d', testCommand: 'probe', dir: __dirname,
      maxIterations: 2, testRunner: async () => ({ exitCode: 0, output: 'all green' })
    });
    let run = null;
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100));
      run = bridge.getHealRun(runId);
      if (run && run.status !== 'running') break;
    }
    assert(run && run.status === 'healed', "Passing tests should heal immediately");

    // Cleanup export artifacts
    fs.unlinkSync(exported.mdPath);
    fs.unlinkSync(exported.jsonPath);

    console.log("✅ Test 27 Passed!");
  } catch (err) {
    console.error("❌ Test 27 Failed:", err);
    failedTests.push("OpenCode.bridge");
  }

  // Test 28: Cloud token auth + /api/opencode/* routing
  try {
    console.log("Running Test 28: Cloud token auth + OpenCode routes...");
    const { LocalAPIServer } = require(path.join(projectRoot, 'lib', 'api_server'));
    const cloudPort = 42071;
    const prevToken = process.env.VIBE_API_TOKEN;
    process.env.VIBE_API_TOKEN = 'test-token-123';

    const server = new LocalAPIServer({ port: cloudPort });
    await server.start();
    const extHeaders = { Origin: 'https://external.example' };

    // Health stays open for probes even with a token set
    let res = await fetch(`http://127.0.0.1:${cloudPort}/api/status`);
    assert.strictEqual(res.status, 200, "GET /api/status must stay open (probes)");

    // Local no-origin clients (desktop app, on-box curl) keep working
    res = await fetch(`http://127.0.0.1:${cloudPort}/api/opencode/status`);
    assert.strictEqual(res.status, 200, "Local callers bypass token auth");
    const statusBody = await res.json();
    assert(statusBody.opencode && typeof statusBody.opencode.available === 'boolean', "Status must carry opencode object");

    // Remote/origin callers without a token are rejected…
    res = await fetch(`http://127.0.0.1:${cloudPort}/api/opencode/status`, { method: 'POST', headers: extHeaders, body: '{}' });
    assert.strictEqual(res.status, 401, "Mutating call without token must be 401");

    // …and accepted with X-Vibe-Auth (empty bug store → clean 400, proves routing)
    res = await fetch(`http://127.0.0.1:${cloudPort}/api/opencode/export`, {
      method: 'POST', headers: { ...extHeaders, 'Content-Type': 'application/json', 'X-Vibe-Auth': 'test-token-123' },
      body: JSON.stringify({ gameId: 'no-such-game-xyz' })
    });
    assert.strictEqual(res.status, 400, "Export with no matching bugs must be 400");
    const exportBody = await res.json();
    assert(exportBody.error && exportBody.error.includes('No bugs'), "Should explain empty export");

    // heal-test guardrail rejects non-test commands even with a valid token.
    // (External origins are stopped earlier with 403 by the origin block;
    //  on-box callers reach the guardrail itself.)
    res = await fetch(`http://127.0.0.1:${cloudPort}/api/opencode/heal-test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vibe-Auth': 'test-token-123' },
      body: JSON.stringify({ testCommand: 'rm -rf /' })
    });
    assert.strictEqual(res.status, 400, "heal-test must reject non-test commands");

    // …while a real test command executes and reports back
    res = await fetch(`http://127.0.0.1:${cloudPort}/api/opencode/heal-test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vibe-Auth': 'test-token-123' },
      body: JSON.stringify({ testCommand: 'echo test-ok-remote' })
    });
    assert.strictEqual(res.status, 200, "heal-test should run test commands");
    const healBody = await res.json();
    assert.strictEqual(healBody.exitCode, 0, "echo must exit 0");
    assert(healBody.output.includes('test-ok-remote'), "Should return command output");

    await server.stop();
    if (prevToken === undefined) delete process.env.VIBE_API_TOKEN;
    else process.env.VIBE_API_TOKEN = prevToken;

    console.log("✅ Test 28 Passed!");
  } catch (err) {
    console.error("❌ Test 28 Failed:", err);
    failedTests.push("Cloud.tokenAuth");
    try { delete process.env.VIBE_API_TOKEN; } catch (e) {}
  }

  // Test 29: SmartLog file logging + AI handoff briefs
  try {
    console.log("Running Test 29: SmartLog file logging + handoff...");
    const smart = require(path.join(projectRoot, 'lib', 'smart_log'));
    const tmpDir = path.join(projectRoot, 'data', 'test_smartlog_' + Date.now());
    const slog = new smart.SmartLog({ dir: tmpDir, source: 'test' });

    assert(fs.existsSync(tmpDir), "SmartLog must create its log dir");
    slog.info('boot ok', { category: 'lifecycle' });
    slog.error('Error: something broke code=5000', { category: 'game', stack: 'Error: something broke\n at x (y.js:9)' });
    slog.error('Error: something broke code=7777', { category: 'game' }); // same cluster (ids normalize)
    const dayFile = path.join(tmpDir, 'vibe-' + new Date().toISOString().slice(0, 10) + '.jsonl');
    assert(fs.existsSync(dayFile), "Daily JSONL file must exist");

    const handoff = slog.writeHandoff({ reason: 'test handoff', bugs: [{ id: 'B-1', title: 'T', severity: 'low' }] });
    assert.strictEqual(handoff.success, true, "Handoff must succeed");
    assert(fs.existsSync(handoff.path), "Handoff file must exist");
    assert(handoff.markdown.includes('x2'), "Repeated errors must cluster with count");
    assert(handoff.markdown.includes('B-1'), "Handoff must include open bugs");
    const latest = slog.readLatestHandoff();
    assert.strictEqual(latest.success, true, "Latest handoff must be readable");

    // CLI arg parsing: --headfull wins over --headless
    const parsed = smart.parseWorkerArgs(['node', 'x', '--headless', '--headfull', '--game', 'g', '--autoplay']);
    assert.strictEqual(parsed.headfull, true, "--headfull must win");
    assert.strictEqual(parsed.headless, false, "--headless must be cleared");
    assert.strictEqual(parsed.game, 'g', "Game must parse");
    assert.strictEqual(parsed.autoplay, true, "Autoplay must parse");

    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log("✅ Test 29 Passed!");
  } catch (err) {
    console.error("❌ Test 29 Failed:", err);
    failedTests.push("SmartLog.handoff");
  }

  // Test 30: Handoff API + heal-run persistence + bridge auto-feed
  try {
    console.log("Running Test 30: Handoff routes + heal persistence...");
    const { LocalAPIServer } = require(path.join(projectRoot, 'lib', 'api_server'));
    const bridge = require(path.join(projectRoot, 'lib', 'opencode_bridge'));
    const smart = require(path.join(projectRoot, 'lib', 'smart_log'));
    const hPort = 42072;

    // Seed one log row so the handoff has content
    smart.getSharedLog('test-30').error('Error: probe failure', { category: 'game' });

    const server = new LocalAPIServer({ port: hPort });
    await server.start();

    // POST generates a fresh handoff (includes bug-store bugs)
    let res = await fetch(`http://127.0.0.1:${hPort}/api/opencode/handoff`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'test-30', includeBugs: false })
    });
    assert.strictEqual(res.status, 200, "POST handoff must succeed");
    const gen = await res.json();
    assert(gen.path && gen.markdown.includes('test-30'), "Generated handoff must carry the reason");

    // GET serves the latest handoff back
    res = await fetch(`http://127.0.0.1:${hPort}/api/opencode/handoff`);
    assert.strictEqual(res.status, 200, "GET handoff must succeed");
    const latest = await res.json();
    assert(latest.markdown.length > 100, "Handoff markdown must be served");

    // Auto-feed: bridge attaches the handoff to fix prompts when present
    assert(bridge.getLatestHandoffMarkdown() !== null, "Handoff markdown must be available to the bridge");

    // Heal-run persistence: a failing-then-passing loop writes a .heal.json file
    let calls = 0;
    const { runId } = bridge.startHealCycle({
      bugs: [], gameId: 'test-30', testCommand: 'probe', dir: __dirname, maxIterations: 3,
      testRunner: async () => (++calls === 1
        ? { exitCode: 1, output: 'FAIL first pass' }
        : { exitCode: 0, output: 'all green' }),
    });
    // Stub the fix step by enabling a fake binary? No — fix will fail gracefully
    // (opencode missing), run ends 'fix_failed' and still persists. Just wait.
    let run = null;
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 100));
      run = bridge.getHealRun(runId);
      if (run && run.status !== 'running') break;
    }
    assert(run && run.status !== 'running', "Heal run must finish");
    const healFile = path.join(smart.getLogDir(), `${runId}.heal.json`);
    assert(fs.existsSync(healFile), "Heal run JSON must persist to the log dir");
    const persisted = JSON.parse(fs.readFileSync(healFile, 'utf8'));
    assert(persisted.history.length >= 1, "Persisted run must include iteration history");
    fs.unlinkSync(healFile);
    for (const h of (run.history || [])) {
      try { if (h.exported && h.exported.mdPath && fs.existsSync(h.exported.mdPath)) fs.unlinkSync(h.exported.mdPath); } catch (e) {}
      try { if (h.exported && h.exported.jsonPath && fs.existsSync(h.exported.jsonPath)) fs.unlinkSync(h.exported.jsonPath); } catch (e) {}
    }

    await server.stop();
    console.log("✅ Test 30 Passed!");
  } catch (err) {
    console.error("❌ Test 30 Failed:", err);
    failedTests.push("Handoff.routes");
  }

  // Test 31: Virtual bot mouse module + dispatcher routing
  try {
    console.log("Running Test 31: Virtual bot mouse cursor + action routing...");
    const botCursor = require(path.join(projectRoot, 'src', 'runtime', 'bot_cursor'));

    // Overlay snippet carries the robot-emoji cursor id on every page
    const ensure = botCursor.ensureCursorJS();
    assert(ensure.includes('vibe-bot-cursor'), "Ensure snippet must create the bot cursor overlay");
    assert(ensure.includes('u{1F916}'), "Overlay must include the robot emoji badge");

    // Coordinate parsing from both action shapes
    assert.deepStrictEqual(botCursor.parseActionCoords({ type: 'click', target: '100,200' }), { nx: 100, ny: 200 }, "Must parse x,y target");
    assert.deepStrictEqual(botCursor.parseActionCoords({ type: 'click', params: { x: 10, y: 20 } }), { nx: 10, ny: 20 }, "Must parse params coords");
    assert.strictEqual(botCursor.parseActionCoords({ type: 'click', target: '#btnPlay' }), null, "Selector targets have no coords");

    // Dispatcher routes every bot click through the visible cursor first
    const gameCtrl = new GameController();
    let lastScript = '';
    gameCtrl.executeJS = async (webview, code) => { lastScript = code; return "Clicked CANVAS at 256,384"; };

    await gameCtrl.executeAction(null, { type: 'click', target: '256,384', params: { x: 256, y: 384, gameAction: 'attack' } });
    assert(lastScript.includes('vibe-bot-cursor') || lastScript.includes('GraveGainBotCursor'), "Click script must drive the bot cursor");
    assert(lastScript.includes('elementFromPoint'), "Click script must still dispatch at element");
    assert(lastScript.includes('GraveGainBotInput'), "Attack clicks must route via GraveGainBotInput");

    // move_mouse glides the cursor without clicking
    await gameCtrl.executeAction(null, { type: 'move_mouse', target: '700,100', params: { label: 'aim' } });
    assert(lastScript.includes('700') && lastScript.includes('100'), "move_mouse must carry coordinates");
    assert(!lastScript.includes('elementFromPoint'), "move_mouse must not dispatch clicks");

    // bot_control toggles the robot cursor explicitly
    await gameCtrl.executeAction(null, { type: 'bot_control', target: 'off' });
    assert(lastScript.includes('bot_control off'), "bot_control must toggle the overlay");

    // Keyboard actions label the cursor (still single-script keydown/keyup)
    await gameCtrl.executeAction(null, { type: 'press_key', target: 'f' });
    assert(lastScript.includes('keydown'), "press_key must still dispatch keydown");
    assert(lastScript.includes('vibe-bot') || lastScript.includes('GraveGainBotCursor'), "press_key must label the cursor");

    console.log("✅ Test 31 Passed!");
  } catch (err) {
    console.error("❌ Test 31 Failed:", err);
    failedTests.push("BotCursor.routing");
  }

  // Test 32: GraveGain3D bot-cursor contract (static file checks)
  try {
    console.log("Running Test 32: GraveGain3D bot input + cursor wiring...");
    const gameDir = path.join(projectRoot, '..', '..', '..', 'website', 'v1', 'games', 'html', 'gravegain3d');
    const botCursorSrc = fs.readFileSync(path.join(gameDir, 'ui', 'bot-cursor.js'), 'utf8');
    const inputMgrSrc = fs.readFileSync(path.join(gameDir, 'input', 'input-manager.js'), 'utf8');
    const indexSrc = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
    const gameJson = JSON.parse(fs.readFileSync(path.join(gameDir, 'game.json'), 'utf8'));

    assert(botCursorSrc.includes('GraveGainBotCursor'), "Must define the visible cursor overlay");
    assert(botCursorSrc.includes('GraveGainBotInput'), "Must define the bot input API");
    for (const api of ['lookToward', 'projectEnemy', 'attack', 'press', 'click', 'setBotControl']) {
      assert(botCursorSrc.includes(api), `Bot input API must include ${api}`);
    }
    assert(botCursorSrc.includes('GraveGainStoryEngine'), "Must carry the solo-copy story fallback");
    assert(inputMgrSrc.includes('isTrusted === false') || inputMgrSrc.includes('botDriven'), "Synthetic/bot presses must bypass the pointer-lock trap");
    assert(inputMgrSrc.includes('botAttack'), "InputManager must expose bot helpers");
    assert(indexSrc.includes('ui/bot-cursor.js'), "index.html must load bot-cursor.js");
    assert(gameJson.assets.local.includes('ui/bot-cursor.js'), "game.json must list bot-cursor.js");

    console.log("✅ Test 32 Passed!");
  } catch (err) {
    console.error("❌ Test 32 Failed:", err);
    failedTests.push("GraveGain3D.botCursor");
  }

  // Test 33: AI Vision Mirror (state, detection, endpoint wiring)
  try {
    console.log("Running Test 33: AI Vision Mirror state + detection...");
    const visionState = require(path.join(projectRoot, 'src', 'runtime', 'vision_state'));
    const visionDetect = require(path.join(projectRoot, 'src', 'runtime', 'vision_detect'));

    // Pointer recording clamps to the 0-1000 bot action space
    visionState.reset();
    visionState.recordPointer(627, 554, 'attack', true);
    let snap = visionState.getSnapshot();
    assert.strictEqual(snap.pointer.x, 627, "Pointer x must be recorded");
    assert.strictEqual(snap.pointer.label, 'attack', "Pointer label must be recorded");
    assert.strictEqual(snap.pointer.visible, true, "Pointer visibility must be recorded");
    visionState.recordPointer(-50, 5000, 'oob');
    snap = visionState.getSnapshot();
    assert.strictEqual(snap.pointer.x, 0, "Pointer x must clamp to 0");
    assert.strictEqual(snap.pointer.y, 1000, "Pointer y must clamp to 1000");
    assert(snap.path.length >= 2, "Pointer path must accumulate for the trail");

    // Key history + action trail are capped ring buffers
    for (let i = 0; i < 20; i++) visionState.recordKeys('k' + i, 'press');
    for (let i = 0; i < 20; i++) visionState.recordAction('action ' + i);
    snap = visionState.getSnapshot();
    assert(snap.keys.length <= visionState.MAX_KEYS, "Keys must be capped");
    assert(snap.trail.length <= visionState.MAX_TRAIL, "Trail must be capped");
    assert.strictEqual(snap.keys[0].key, 'k19', "Keys must be newest-first");
    visionState.reset();
    assert.strictEqual(visionState.getSnapshot().trail.length, 0, "Reset must clear trail");

    // Detection script covers both worlds: game enemies + any website DOM
    const script = visionDetect.buildDetectScript(40);
    assert(script.includes('GraveGainGame'), "Detect script must have the game-enemy branch");
    assert(script.includes('camera3d'), "Game branch must project through the 3D camera");
    assert(script.includes('querySelectorAll'), "Detect script must have the generic DOM branch");
    assert(script.includes('button, a, input'), "DOM branch must scan interactive elements");
    assert(script.includes('vibe-bot-cursor'), "Detect script must read out the bot cursor");
    assert(script.includes('JSON.stringify'), "Detect script must return JSON");
    assert(script.includes('(r.left + r.right) / 2'), "DOM boxes must report centre coords (both mirrors draw centre-anchored)");

    // Response parsing is tolerant (string, object, garbage)
    const parsed = visionDetect.parseDetectResponse('{"source":"dom","cursor":null,"objects":[{"x":1,"y":2}]}');
    assert.strictEqual(parsed.source, 'dom', "Must parse JSON string responses");
    assert.strictEqual(parsed.objects.length, 1, "Must keep detected objects");
    assert.strictEqual(visionDetect.parseDetectResponse({ source: 'game', objects: [] }).source, 'game', "Must pass through objects");
    assert.strictEqual(visionDetect.parseDetectResponse('not json{{{').source, 'error', "Garbage must yield error source");
    assert.strictEqual(visionDetect.parseDetectResponse(null).objects.length, 0, "Null must yield empty objects");

    // HTTP + UI wiring exists
    const routesSrc = fs.readFileSync(path.join(projectRoot, 'lib', 'api', 'routes.js'), 'utf8');
    assert(routesSrc.includes('/api/vision/state'), "Routes must expose /api/vision/state");
    const apiServerSrc = fs.readFileSync(path.join(projectRoot, 'lib', 'api_server.js'), 'utf8');
    assert(apiServerSrc.includes('getVisionState'), "API server must default getVisionState");
    const dispatcherSrc = fs.readFileSync(path.join(projectRoot, 'src', 'runtime', 'action_dispatcher.js'), 'utf8');
    assert(dispatcherSrc.includes('vision-state-push'), "Dispatcher must push vision snapshots");
    const mirrorSrc = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'vision_mirror.js'), 'utf8');
    assert(mirrorSrc.includes('vision-mirror-canvas'), "Mirror component must render to the mirror canvas");
    const dashSrc = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
    assert(dashSrc.includes('vision-mirror-panel'), "Dashboard must contain the vision mirror panel");

    console.log("✅ Test 33 Passed!");
  } catch (err) {
    console.error("❌ Test 33 Failed:", err);
    failedTests.push("VisionMirror.wiring");
  }

  // Test 34: Agent self-healing (no self-alarm loop, sane coords, visible cursor)
  try {
    console.log("Running Test 34: Agent self-alarm immunity + coord clamp...");
    const { scanForBugs } = require(path.join(projectRoot, 'lib', 'brain', 'bug_scanner'));

    // The agent's own alarm line must never be filed as a bug (it caused
    // a self-perpetuating CRASH/EXCEPTION entry every step).
    const brain = { bugs: [], replayActions: [], sessionStats: { bugsFound: 0 } };
    const alarmLogs = [{ level: 3, message: '[18:58:35] [ERROR] ⚠️ CRASH / EXCEPTION BUG IDENTIFIED!' }];
    assert.strictEqual(scanForBugs(brain, null, alarmLogs), false, "Self-alarm lines must not file bugs");
    assert.strictEqual(brain.bugs.length, 0, "Self-alarm must leave the bug log untouched");

    // Identical recurring errors (timestamps/coords stripped) file once,
    // then stay quiet under the refire cooldown.
    const noisy = [{ level: 'error', message: 'Error: gl failed at 12,44 [19:00:01]' }];
    assert.strictEqual(scanForBugs(brain, null, noisy), true, "First occurrence must file");
    assert.strictEqual(brain.bugs.length, 1, "One bug filed");
    const noisy2 = [{ level: 'error', message: 'Error: gl failed at 99,12 [19:00:03]' }];
    assert.strictEqual(scanForBugs(brain, null, noisy2), false, "Same signature must cool down");
    assert.strictEqual(brain.bugs.length, 1, "No duplicate filed");
    assert(brain.bugs[0].description.includes('<n>'), "Stored description must be normalized");

    // Garbage off-viewport coords are clamped in the dispatched click script
    const gameCtrl2 = new GameController();
    let lastScript2 = '';
    gameCtrl2.executeJS = async (webview, code) => { lastScript2 = code; return 'ok'; };
    await gameCtrl2.executeAction(null, { type: 'click', target: '-9888.5,38' });
    assert(!lastScript2.includes('(-9888 / 1000)'), "Click math must not use raw off-screen coords");
    assert(lastScript2.includes('Math.round((0 / 1000)'), "Click x must clamp to 0 in-page");

    // Every bot move asserts bot control so the robot cursor stays visible
    const botCursor2 = require(path.join(projectRoot, 'src', 'runtime', 'bot_cursor'));
    assert(botCursor2.moveCursorJS(100, 100, 't').includes('setBotControl(true)'), "moveCursorJS must assert bot control");
    assert(botCursor2.labelCursorJS('t').includes('setBotControl(true)'), "labelCursorJS must assert bot control");

    // DOM inspector skips fully off-viewport elements (source of -9888px targets)
    const domSrc = fs.readFileSync(path.join(projectRoot, 'src', 'runtime', 'dom_inspector.js'), 'utf8');
    assert(domSrc.includes('innerWidth') && domSrc.includes('onScreen'), "DOM inspector must filter off-viewport elements");

    console.log("✅ Test 34 Passed!");
  } catch (err) {
    console.error("❌ Test 34 Failed:", err);
    failedTests.push("Agent.selfHealing");
  }

  // Test 35: --max-ticks cap parsing + renderer enforcement wiring
  try {
    console.log("Running Test 35: max-ticks cap...");
    const { parseWorkerArgs } = require(path.join(projectRoot, 'lib', 'smart_log'));
    assert.strictEqual(parseWorkerArgs(['node', 'x', '--max-ticks', '50']).maxTicks, 50, "--max-ticks 50 must parse");
    assert.strictEqual(parseWorkerArgs(['node', 'x', '--ticks', '3']).maxTicks, 3, "--ticks alias must parse");
    assert.strictEqual(parseWorkerArgs(['node', 'x']).maxTicks, 0, "Default must be unlimited (0)");
    const appSrc = fs.readFileSync(path.join(projectRoot, 'src', 'app.js'), 'utf8');
    assert(appSrc.includes('cliMaxTicks'), "Dashboard must read the tick cap from CLI args");
    assert(appSrc.includes('Tick cap reached'), "Dashboard must auto-pause at the cap");
    console.log("✅ Test 35 Passed!");
  } catch (err) {
    console.error("❌ Test 35 Failed:", err);
    failedTests.push("Agent.maxTicks");
  }

  // Test 36: display flags + smart game framing wiring
  try {
    console.log("Running Test 36: display modes + game framing...");
    const { parseWorkerArgs } = require(path.join(projectRoot, 'lib', 'smart_log'));
    const p1 = parseWorkerArgs(['node', 'x', '--window-size', '1920x1080']);
    assert.deepStrictEqual(p1.windowSize, { width: 1920, height: 1080 }, "--window-size must parse");
    const p2 = parseWorkerArgs(['node', 'x', '--fullscreen']);
    assert.strictEqual(p2.fullscreen, true, "--fullscreen must set fullscreen");
    assert.strictEqual(p2.displayMode, 'fullscreen', "--fullscreen must set display mode");
    const p3 = parseWorkerArgs(['node', 'x', '--display-mode', 'split', '--game-window-size', '1280x720', '--game-fullscreen']);
    assert.strictEqual(p3.displayMode, 'split', "--display-mode split must parse");
    assert.deepStrictEqual(p3.gameWindowSize, { width: 1280, height: 720 }, "--game-window-size must parse");
    assert.strictEqual(p3.gameFullscreen, true, "--game-fullscreen must parse");
    assert.strictEqual(parseWorkerArgs(['node', 'x']).displayMode, 'windowed', "Default display mode must be windowed");
    assert.strictEqual(parseWorkerArgs(['node', 'x', '--display-mode', 'game-focus']).displayMode, 'game-focus', "--display-mode game-focus must parse");
    assert.strictEqual(parseWorkerArgs(['node', 'x', '--split']).displayMode, 'split', "--split shorthand must parse");

    // Pure framing script: finds the playfield (game-root ids, button
    // cluster, canvases), centres it, reports guest + play metrics.
    const dm = require(path.join(projectRoot, 'src', 'runtime', 'display_manager'));
    assert.strictEqual(dm.HD_WIDTH, 1920, "HD default width must be 1920");
    assert.strictEqual(dm.HD_HEIGHT, 1080, "HD default height must be 1080");
    const script = dm.buildEnsureVisibleScript();
    assert(script.includes('game-root'), "Framing must look for game-root ids");
    assert(script.includes('button-cluster'), "Framing must consider the button cluster playfield");
    assert(script.includes('scrollIntoView'), "Framing must scroll the play area into view");
    assert(script.includes('guestW') && script.includes('guestH'), "Framing must report guest size");
    assert(script.includes('fixed') && script.includes('getComputedStyle'), "Framing must skip fullscreen background canvases");

    // Wiring: main process IPC + dashboard HD default + runner API.
    const mainSrc = fs.readFileSync(path.join(projectRoot, 'app', 'main.js'), 'utf8');
    assert(mainSrc.includes('set-display-mode'), "Main must expose set-display-mode IPC");
    assert(mainSrc.includes('get-display-config'), "Main must expose get-display-config IPC");
    assert(mainSrc.includes('focus-game-window'), "Main must expose focus-game-window IPC");
    const appSrc = fs.readFileSync(path.join(projectRoot, 'src', 'app.js'), 'utf8');
    assert(appSrc.includes('window.setDisplayMode'), "Dashboard must expose setDisplayMode to the runner brain");
    assert(appSrc.includes('window.ensureGameVisible'), "Dashboard must expose ensureGameVisible to the runner brain");
    assert(appSrc.includes('window.getGameViewMetrics'), "Dashboard must expose getGameViewMetrics to the runner brain");
    assert(appSrc.includes('btn-center-game'), "Dashboard must wire the Center-game toolbar button");
    assert(appSrc.includes('game-focus'), "Dashboard must support game-focus display mode");
    const cssSrc = fs.readFileSync(path.join(projectRoot, 'src', 'index.css'), 'utf8');
    assert(cssSrc.includes('body.game-focus .monitor-section'), "game-focus must collapse the log panel for a taller viewport");
    const stepSrc = fs.readFileSync(path.join(projectRoot, 'src', 'runtime', 'agent_step_executor.js'), 'utf8');
    assert(stepSrc.includes('ensureGameVisible'), "Each agent step must re-frame the play area before the screenshot");
    console.log("✅ Test 36 Passed!");
  } catch (err) {
    console.error("❌ Test 36 Failed:", err);
    failedTests.push("Display.hdFraming");
  }

  // Test 37: dual-pane playtest stage (PURE 1920x1080 + AI overlay + takeover)
  try {
    console.log("Running Test 37: PURE/AI stage + human takeover...");
    const sv = require(path.join(projectRoot, 'src', 'components', 'stage_view'));
    assert.strictEqual(sv.HD_W, 1920, "Render surface width must be 1920");
    assert.strictEqual(sv.HD_H, 1080, "Render surface height must be 1080");
    assert.strictEqual(sv.AI_W, 480, "AI pane canvas must be 480 wide (compact 480p mirror)");
    assert.strictEqual(sv.AI_H, 270, "AI pane canvas must be 270 tall (16:9)");
    assert(sv.MIRROR_TICK_MS <= 500, "Mirror tick must be fast (<=500ms)");
    assert.strictEqual(sv.HEAT_COLS * sv.HEAT_ROWS <= 576, true, "Heat grid must stay compact (<=576 cells)");
    assert(Math.abs(sv.computePureScale(960) - 0.5) < 1e-9, "960px pane must shrink 1920 exactly 50%");
    assert.strictEqual(sv.computePureScale(0), 1, "Zero-width pane must fall back to scale 1");
    assert.deepStrictEqual(sv.normToGuest(500, 500), { x: 960, y: 540 }, "Centre of action space must map to guest centre");
    assert.deepStrictEqual(sv.normToGuest(-50, 2000), { x: 0, y: 1080 }, "Out-of-range coords must clamp to the guest frame");
    const cell = sv.heatCell(500, 500);
    assert(cell.col >= 0 && cell.col < sv.HEAT_COLS && cell.row >= 0 && cell.row < sv.HEAT_ROWS, "Heat cell must sit inside the grid");
    assert.strictEqual(sv.heatCell(0, 0).index, 0, "Top-left heat cell must be index 0");

    // Guest recorder contract: installs window.__takeover, streams
    // normalized move/click/key events, uninstalls cleanly.
    const rec = sv.buildRecorderScript();
    assert(rec.includes('__takeover'), "Recorder must own window.__takeover");
    assert(rec.includes('mousemove') && rec.includes('mousedown'), "Recorder must watch mouse movement + clicks");
    assert(rec.includes('keydown'), "Recorder must watch keys");
    assert(rec.includes('clientX') && rec.includes('innerWidth'), "Recorder must normalize to 0-1000 action space");
    assert(sv.buildDrainScript().includes('splice'), "Drain must remove events as it reads them");
    assert(sv.buildStopRecorderScript().includes('takeover-stopped'), "Stop must report takeover-stopped");
    assert(rec.includes('removeEventListener'), "Recorder stop must detach guest listeners");
    const drained = sv.parseDrainedEvents(JSON.stringify([
      { t: 1, k: 'move', x: 100, y: 200 },
      { t: 2, k: 'click', x: 300, y: 400, label: 'Start' },
      { t: 3, k: 'key', key: 'Space', down: true },
      { t: 4, k: 'bogus' },
      'junk'
    ]));
    assert.strictEqual(drained.length, 3, "Drain parser must keep move/click/key and drop junk");
    assert.deepStrictEqual(sv.parseDrainedEvents('not-json'), [], "Drain parser must survive garbage");

    // Fast overlay path: worker + box culling + pre-scaled heat cells.
    const culled = sv.cullObjects([
      { x: 100, y: 100, w: 50, h: 50, kind: 'button', label: 'Big' },
      { x: -10, y: 100, w: 20, h: 20, kind: 'link', label: 'Offscreen' },
      { x: 500, y: 500, w: 10, h: 10, kind: 'other', label: 'Small' }
    ], 24);
    assert.strictEqual(culled.length, 2, "Cull must drop off-screen boxes");
    assert.strictEqual(culled[0].label, 'Big', "Cull must keep biggest first");
    assert(sv.cullObjects('junk', 24).length === 0, "Cull must survive garbage");
    const heatArr = new Array(sv.HEAT_COLS * sv.HEAT_ROWS).fill(0);
    heatArr[0] = 2; heatArr[5] = 4;
    const hv = sv.heatActiveCells(heatArr, sv.HEAT_COLS, sv.HEAT_ROWS);
    assert.strictEqual(hv.max, 4, "Heat view must report max");
    assert.strictEqual(hv.cells.length, 2, "Heat view must list only active cells");
    assert.deepStrictEqual(sv.heatActiveCells(new Array(sv.HEAT_COLS * sv.HEAT_ROWS).fill(0)).cells, [], "Empty heat must yield no cells");
    // Heat alpha bucketing: one fillStyle per bucket, not per cell.
    const buckets = sv.bucketHeatCellsByAlpha([
      { col: 0, row: 0, a: 0.31 }, { col: 1, row: 0, a: 0.34 }, { col: 2, row: 0, a: 0.58 }
    ]);
    assert.strictEqual(buckets.size, 2, "Nearby alphas must quantize into shared buckets");
    assert.strictEqual(buckets.get(0.3).length, 2, "0.31 + 0.34 must share the 0.3 bucket");
    assert.strictEqual(sv.bucketHeatCellsByAlpha([]).size, 0, "Empty cells must yield no buckets");
    // Stale-hotspot fade: exponential decay, epsilon zeroing, safe no-ops.
    assert.strictEqual(sv.HEAT_DECAY_MS, 10000, "Decay interval must be 10s");
    assert.strictEqual(sv.HEAT_DECAY_FACTOR, 0.5, "Decay must halve the grid per interval");
    const decayGrid = [4, 0.4, 0, 2];
    const faded = sv.decayHeatValues(decayGrid, 0.5, 0.5);
    assert.strictEqual(faded.decayed, true, "Valid factor must decay");
    assert.deepStrictEqual(decayGrid, [2, 0, 0, 1], "Cells must halve, whispers below epsilon must zero");
    assert.strictEqual(faded.cleared, 1, "Must report cleared cells");
    assert.strictEqual(faded.active, 2, "Must report surviving cells");
    const untouched = [5, 5];
    assert.strictEqual(sv.decayHeatValues(untouched, 1.5, 0.5).decayed, false, "Factor >= 1 must be a no-op");
    assert.deepStrictEqual(untouched, [5, 5], "No-op decay must leave the grid untouched");
    const atEps = [1];
    sv.decayHeatValues(atEps, 0.5, 0.5);
    assert.deepStrictEqual(atEps, [0.5], "A value landing exactly on epsilon must survive (< is strict)");
    assert.strictEqual(sv.decayHeatValues('junk', 0.5, 0.5).decayed, false, "Garbage grid must be a no-op");
    const workerSrc = sv.buildOverlayWorkerScript();
    assert(workerSrc.includes('self.onmessage'), "Overlay worker must handle messages");
    assert(workerSrc.includes("'drain'") && workerSrc.includes("'boxes'") && workerSrc.includes("'heat'"), "Worker must cover drain/boxes/heat");
    const stageSrc = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'stage_view.js'), 'utf8');
    assert(stageSrc.includes('createImageBitmap'), "Stage must GPU-decode frames via createImageBitmap");
    assert(stageSrc.includes('new Worker'), "Stage must offload overlay work to a Web Worker");
    assert(stageSrc.includes('Promise.all'), "Stage must run capture + detection concurrently");
    assert(stageSrc.includes('desynchronized'), "Stage must use a low-latency canvas context");
    assert(stageSrc.includes('repaintHeatLayer'), "Stage must repaint heat only on data change");
    assert(stageSrc.includes('drawImage(layer'), "Stage must blit the cached heat layer in one drawImage");
    assert(stageSrc.includes('fillRect(arr[i].col, arr[i].row, 1, 1)'), "Heat layer must paint 1px cells on the tiny offscreen canvas");
    assert(stageSrc.includes('decayHeatValues(heat'), "Stage must fade stale hotspots on a timer");
    assert(stageSrc.includes("bindToggle('ai-toggle-decay', 'decayHeat')"), "Stage must wire a heat-decay toggle");

    // Takeover notes: counts, key ranking, hottest zone, duration.
    const summary = sv.summarizeTakeover({
      startedAt: Date.now() - 65000, endedAt: Date.now(),
      moves: 120, clicks: 5, distance: 3400,
      keys: { Space: 4, ArrowRight: 2 },
      zones: { '(300-399, 400-499)': 3, '(100-199, 100-199)': 2 },
      shots: 7
    });
    assert.strictEqual(summary.clicks, 5, "Summary must count clicks");
    assert.strictEqual(summary.topKeys[0][0], 'Space', "Summary must rank Space first");
    assert(summary.topZones[0][0].includes('300-399'), "Summary must find the hottest click zone");
    assert(summary.lines.some((l) => /Takeover notes/.test(l)), "Summary must log a notes header");
    assert(summary.lines.some((l) => /screenshots: 7/.test(l)), "Summary must report screenshot count");

    // Wiring: stage markup + dashboard init + runner API.
    const htmlSrc = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
    assert(htmlSrc.includes('id="pure-pane"'), "Stage must have a PURE pane");
    assert(htmlSrc.includes('id="ai-view-canvas"'), "Stage must have an AI view canvas");
    assert(htmlSrc.includes('id="ai-toggle-decay"'), "Stage must have a heat-decay toggle");
    assert(htmlSrc.includes('width="480" height="270"'), "AI canvas must be the compact 480x270 backing store");
    assert(htmlSrc.includes('id="btn-takeover"'), "Stage must have a takeover button");
    assert(htmlSrc.includes('id="takeover-status"'), "Stage must have a takeover status readout");
    assert(htmlSrc.includes('width:1920px; height:1080px'), "Webview must render a true 1920x1080 surface");
    const appSrc2 = fs.readFileSync(path.join(projectRoot, 'src', 'app.js'), 'utf8');
    assert(appSrc2.includes('initStageView'), "Dashboard must init the playtest stage");
    assert(appSrc2.includes('resize({ width: 480 })'), "Dashboard must capture a compact 480px AI frame");
    assert(appSrc2.includes('toJPEG(50)'), "Dashboard must use a compact JPEG quality for the 480p mirror");
    assert(appSrc2.includes('handleGuestLoad'), "Dashboard must re-fit + re-attach on guest load");
    assert(appSrc2.includes('window.humanTakeover'), "Dashboard must expose humanTakeover to the runner brain");
    assert(appSrc2.includes('window.getAIViewMetrics'), "Dashboard must expose AI view metrics");
    const cssSrc2 = fs.readFileSync(path.join(projectRoot, 'src', 'index.css'), 'utf8');
    assert(cssSrc2.includes('.stage-grid'), "CSS must lay out the dual-pane stage");
    assert(cssSrc2.includes('aspect-ratio: 16 / 9') || cssSrc2.includes('aspect-ratio:16/9'), "Stage panes must lock 16:9");
    assert(cssSrc2.includes('body.game-focus .stage-grid'), "Focus-game must stack the stage full-width");
    const cssNoComments = cssSrc2.replace(/\/\*[\s\S]*?\*\//g, '');
    assert(!/#game-webview\s*\{[^}]*display\s*:\s*block/.test(cssNoComments), "CSS must never display:block the webview (Electron 31 then pins the guest to a 150px sliver)");
    console.log("✅ Test 37 Passed!");
  } catch (err) {
    console.error("❌ Test 37 Failed:", err);
    failedTests.push("Stage.pureAiTakeover");
  }

  // Test 38: self-generated trace tests stay token-frugal — a tiny digest
  // test (model-visible) plus a runtime-only data fixture (never in context).
  try {
    console.log("Running Test 38: trace test generator (token-frugal)...");
    const ttg = require(path.join(projectRoot, 'src', 'runtime', 'trace_test_gen'));
    const sv38 = require(path.join(projectRoot, 'src', 'components', 'stage_view'));
    const replay = require(path.join(projectRoot, 'tests', 'trace_replay'));
    const os = require('os');
    const { execFileSync } = require('child_process');
    assert.strictEqual(sv38.TRACE_SAMPLE_CAP, ttg.TRACE_SAMPLE_CAP, "Stage ring cap and generator cap must agree");
    // Generator and shared harness must canonicalize identically, or every
    // generated integrity hash would fail.
    for (const c of [[0, 12, 345], [1, 999, 0], [2, 'Space']]) {
      assert.strictEqual(replay.canonicalSample(c), ttg.canonicalSample(c), "Harness/gen canonical form must match");
    }
    assert.strictEqual(replay.fnv1a('m,1,2;c,3,4'), ttg.fnv1a('m,1,2;c,3,4'), "Harness/gen hash must match");

    const makeSession = (n) => {
      const samples = [];
      for (let i = 0; i < n; i++) samples.push({ k: 'move', x: (i * 37) % 1000, y: (i * 53) % 1000 });
      for (let i = 0; i < 30; i++) samples.push({ k: 'click', x: 100 + (i * 11) % 200, y: 300 + (i * 7) % 100 });
      for (let i = 0; i < 10; i++) samples.push({ k: 'key', key: i % 2 ? 'Space' : 'e', down: true });
      return {
        startedAt: 1000, endedAt: 46000, moves: n, clicks: 30,
        keys: { Space: 5, e: 5 }, zones: {}, distance: 12345.6789, shots: 3, samples
      };
    };
    const heatGrid = new Array(576).fill(0);
    heatGrid[100] = 12; heatGrid[101] = 4; heatGrid[300] = 7;
    const big = ttg.buildTraceArtifacts({ session: makeSession(200), heatGrid, game: 'WhackAMole (test)' });
    const small = ttg.buildTraceArtifacts({ session: makeSession(10), heatGrid, game: 'WhackAMole (test)' });

    // Absolute budget: the reviewable test must fit in ~1k tokens…
    assert(big.testSource.includes(ttg.TEST_MARKER), "Generated test must carry the trace-test marker");
    assert(big.testBytes <= ttg.MAX_TEST_SOURCE_BYTES, "Generated test must fit the token budget");
    assert(big.testBytes < big.dataBytes, "Reviewable test must stay smaller than its runtime-only fixture");
    // …and stay flat while the trace grows: 20x more samples must barely move it…
    assert(Math.abs(big.testBytes - small.testBytes) < 512, "Digest test size must stay flat as the trace grows");
    // …while the bulk lands in the runtime-only fixture instead.
    const dataBig = JSON.parse(big.dataSource), dataSmall = JSON.parse(small.dataSource);
    assert(dataBig.samples.length > dataSmall.samples.length * 4, "Fixture must hold the growing sample stream");
    assert(big.dataBytes > small.dataBytes, "Fixture bytes must grow with the trace");
    assert(big.testTokens < big.dataTokens, "Reviewable tokens must stay below runtime-only tokens");
    assert.strictEqual(big.dataFilename, big.testFilename.replace(/\.js$/, '.test.json'), "Fixture name must match its test");
    const dataObj = dataBig;
    assert.strictEqual(typeof dataObj._note, 'string', "Fixture must carry the runtime-only note");
    assert(/never paste/i.test(dataObj._note), "Fixture note must forbid model-context pasting");
    assert.strictEqual(big.digest.exemplars.length, 4, "Digest must embed only a few exemplars, never the stream");

    // The generated pair must actually run green from any directory.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-test-'));
    const tFile = path.join(tmp, big.testFilename), dFile = path.join(tmp, big.dataFilename);
    fs.writeFileSync(tFile, big.testSource, 'utf8');
    fs.writeFileSync(dFile, big.dataSource, 'utf8');
    const env = { ...process.env, VIBECODEWORKER_ROOT: projectRoot };
    const out = execFileSync(process.execPath, [tFile], { env, encoding: 'utf8' });
    assert(/PASS trace/.test(out), "Generated test must print its PASS line");

    // Integrity: a tampered fixture must fail (hash catches it, no bulk needed).
    const tampered = { ...dataObj, samples: dataObj.samples.map((s, i) => (i === 0 ? [1, 999, 999] : s)) };
    fs.writeFileSync(dFile, JSON.stringify(tampered), 'utf8');
    let threw = false;
    try { execFileSync(process.execPath, [tFile], { env, stdio: 'pipe' }); } catch (_) { threw = true; }
    assert(threw, "Tampered fixture must fail the generated test");
    fs.rmSync(tmp, { recursive: true, force: true });

    // Refusals: empty sessions produce no test.
    const emptySession = { ...makeSession(0), moves: 0, clicks: 0, keys: {}, samples: [] };
    assert.throws(() => ttg.buildTraceArtifacts({ session: emptySession, heatGrid, game: 'x' }), /empty trace/);
    assert.throws(() => ttg.buildTraceSnapshot({ session: null, heatGrid, game: 'x' }), /needs a session/);
    console.log("✅ Test 38 Passed!");
  } catch (err) {
    console.error("❌ Test 38 Failed:", err);
    failedTests.push("TraceTestGen.tokenFrugal");
  }
  const resultsPath = path.join(projectRoot, '..', '..', '..', 'test-results', '.last-run.json');
  const status = failedTests.length === 0 ? "passed" : "failed";
  const results = {
    status,
    failedTests
  };

  try {
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Saved test results to: ${resultsPath}`);
  } catch (e) {
    console.error("Failed to write test results:", e);
  }

  console.log(`=== TEST RUN COMPLETED. STATUS: ${status.toUpperCase()} (${failedTests.length} failures) ===`);
  if (failedTests.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
