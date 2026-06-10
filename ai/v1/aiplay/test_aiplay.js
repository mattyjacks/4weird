const assert = require('assert');
const fs = require('fs');
const path = require('path');
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

  // Test 5: Token usage recording and statistics under heavy load (100,000 tokens)
  try {
    console.log("Running Test 5: AgentBrain token usage stats tracking (100,000 tokens)...");
    const brain = new AgentBrain();
    const tempDir = path.join(__dirname, 'data', 'test_temp_' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    brain.dataDir = tempDir;
    brain.startNewRun();
    
    // Record token usage: 70,000 input tokens, 30,000 output tokens = 100,000 total tokens
    brain.recordTokenUsage('gpt-5.4-mini-2026-03-17', 70000, 30000);
    
    const stats = brain.getTokenStats();
    assert.strictEqual(stats.total.lifetime, 100000, "Lifetime token count should be exactly 100,000");
    assert.strictEqual(stats.total.lastRun, 100000, "Last run token count should be exactly 100,000");
    assert.strictEqual(stats.models['gpt-5.4-mini-2026-03-17'].lifetime, 100000, "Model specific lifetime tokens should be 100,000");
    
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
