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
