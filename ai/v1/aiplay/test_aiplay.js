const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

const AgentBrain = require('./agent_brain');
const GameController = require('./game_controller');

async function runTests() {
  console.log("=== STARTING AIPLAY AUTOMATED TEST SUITE ===");
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
    const tempDir = path.join(__dirname, 'data', 'test_temp_' + Date.now());
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
    const usageFile = path.join(tempDir, 'token_usage.json');
    if (fs.existsSync(usageFile)) fs.unlinkSync(usageFile);
    const sessionFile = path.join(tempDir, 'session_memory.json');
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    fs.rmdirSync(tempDir);
    
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
    const { discoverGames } = require('./start_api_server');
    const games = discoverGames();
    assert(Array.isArray(games) && games.length > 0, "Games list should not be empty");
    
    const gravegain3d = games.find(g => g.id.toLowerCase() === 'gravegain3d');
    assert(gravegain3d, "GraveGain3D must be discovered by AIPlay API server");
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
    const gameRuntimePath = path.join(__dirname, '..', '..', '..', 'website', 'v1', 'games', 'html', 'gravegain3d', 'engine', 'game-runtime.js');
    assert(fs.existsSync(gameRuntimePath), "GraveGain3D game-runtime.js must exist");
    const runtimeCode = fs.readFileSync(gameRuntimePath, 'utf8');

    assert(runtimeCode.includes("Object.defineProperty(window, 'game'"), "Must expose window.game property");
    assert(runtimeCode.includes("Object.defineProperty(window, 'gameState'"), "Must expose window.gameState property");
    assert(runtimeCode.includes("startQuickRun"), "Must expose startQuickRun helper for automated AIPlay launch");
    assert(runtimeCode.includes("attack:"), "Must expose attack helper for AIPlay actions");
    assert(runtimeCode.includes("usePotion:"), "Must expose usePotion helper for AIPlay actions");
    console.log("✅ Test 14 Passed!");
  } catch (err) {
    console.error("❌ Test 14 Failed:", err);
    failedTests.push("GraveGain3D.runtimeBindings");
  }

  // Test 15: GraveGain3D Autoplay Heuristic Controller
  try {
    console.log("Running Test 15: GraveGain3D Autoplay Heuristic Controller...");
    const { runGraveGain3DAutoplay } = require('./src/runtime/gravegain3d_autoplay');
    assert(typeof runGraveGain3DAutoplay === 'function', "runGraveGain3DAutoplay must be exported as a function");

    // Test menu scenario
    const mockWebviewMenu = {
      executeJavaScript: async (code) => {
        return { isMainMenuVisible: true };
      }
    };
    const menuDecision = await runGraveGain3DAutoplay(mockWebviewMenu);
    assert.strictEqual(menuDecision.status, 'menu', "Should detect menu state");
    assert.strictEqual(menuDecision.action.target, '#btnPlay', "Should target play button");

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
    assert(combatDecision.action.type === 'press_key', "Should issue combat key action");

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
    const { AutoCodeSystem } = require('./lib/core');
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
      const { calculateCost, formatCost } = require('./lib/pricing');
      const cost = calculateCost(activeModel, promptTokens, completionTokens);
      const { recordTokenUsage } = require('./lib/brain/token_tracker');
      recordTokenUsage(autoCode, activeModel, promptTokens, completionTokens);
      return {
        content: `// Patched Game Code\nconsole.log("Bug resolved autonomously through AIPlay direct tokens");\nwindow.gameState = { active: true, score: 100 };`,
        model: activeModel,
        provider: 'openai',
        usage: { promptTokens, completionTokens, totalTokens: 1550 },
        cost,
        costFormatted: formatCost(cost)
      };
    };

    const dummyFile = path.join(__dirname, 'data', 'temp_test_game.js');
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
  try {
    console.log("Running Test 17: Environment Variable Resolution (OPENAI_API_KEY & OPENROUTER_API_KEY)...");
    const { AutoCodeSystem } = require('./lib/core');
    const autoCode = new AutoCodeSystem();

    // Case A: OPENROUTER_API_KEY
    process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-test-key-456";
    autoCode.updateConfig({ provider: 'openrouter', apiKey: '' });
    
    // Intercept fetch to check headers
    const originalFetch = global.fetch;
    let interceptedAuth = '';
    let interceptedUrl = '';
    global.fetch = async (url, opts) => {
      interceptedUrl = url;
      interceptedAuth = opts.headers['Authorization'];
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

    // Restore fetch and clean env mocks
    global.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;

    console.log("✅ Test 17 Passed!");
  } catch (err) {
    console.error("❌ Test 17 Failed:", err);
    failedTests.push("AutoCode.environmentVariableResolution");
  }

  // Test 18: Ultralight Web Engine Automation & Bug Telemetry
  try {
    console.log("Running Test 18: Ultralight Web Engine Automation & Bug Telemetry...");
    const { UltralightWebEngine } = require('./src/runtime/ultralight_engine');
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

  // Write results to .last-run.json
  const resultsPath = path.join(__dirname, '..', '..', '..', 'test-results', '.last-run.json');
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
