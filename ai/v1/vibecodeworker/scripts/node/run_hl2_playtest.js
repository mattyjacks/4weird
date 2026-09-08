/**
 * HL2: Episode Two - first real game the AI plays (demo of "play any game").
 *
 * Universal loop, no HL2-only engine code:
 *   resolve profile -> screenshot -> DeepSeek harness vision -> input_sim.py
 *
 * Usage:
 *   node run_hl2_playtest.js --window "Half-Life 2" --steps 200 --dry-run
 *   node run_hl2_playtest.js --game hl2-ep2 --steps 50
 *   node run_hl2_playtest.js --game "Doom Eternal" --steps 50 --dry-run  (any game works)
 *
 * Env: DEEPSEEK_API_KEY (or use --heuristic for offline bandit fallback).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..', '..');
const AgentBrain = require(path.join(projectRoot, 'automation', 'agent_brain'));
const { resolveGameProfile, listProfiles } = require(path.join(projectRoot, 'src', 'runtime', 'native_game_profiles'));
const { decideNativeActionViaDeepSeek, toInputSimArgs } = require(path.join(projectRoot, 'src', 'runtime', 'native_game_player'));
const { NativeGameDirector } = require(path.join(projectRoot, 'src', 'runtime', 'native_game_director'));

function parseArgs(argv) {
  const out = { window: 'Half-Life 2', game: '', steps: 20, dryRun: false, heuristic: false, delayMs: 400 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--window') out.window = argv[++i] || out.window;
    else if (a === '--game') out.game = argv[++i] || '';
    else if (a === '--steps') out.steps = Math.max(1, parseInt(argv[++i], 10) || 20);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--heuristic') out.heuristic = true;
    else if (a === '--delay') out.delayMs = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--list-games') { out.listGames = true; }
  }
  return out;
}

function captureScreenshot(windowTitle, destPath) {
  const py = path.join(projectRoot, 'scripts', 'python', 'input_sim.py');
  const res = spawnSync('python', [py, 'screenshot', destPath, windowTitle], { encoding: 'utf8', timeout: 30000 });
  if (res.status !== 0) {
    throw new Error(`screenshot failed: ${(res.stderr || res.stdout || '').slice(0, 300)}`);
  }
  const fs = require('fs');
  return fs.readFileSync(destPath).toString('base64');
}

function runBridge(pyArgs, windowTitle) {
  const py = path.join(projectRoot, 'scripts', 'python', 'input_sim.py');
  const res = spawnSync('python', [py, ...pyArgs, windowTitle], { encoding: 'utf8', timeout: 30000 });
  return { ok: res.status === 0, out: ((res.stdout || '') + (res.stderr || '')).slice(0, 300) };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.listGames) {
    console.log(JSON.stringify(listProfiles(), null, 2));
    return;
  }
  const query = args.game || args.window;
  const profile = resolveGameProfile(query);
  console.log(`[hl2-demo] Profile: ${profile.id} - ${profile.name} (query: "${query}")`);
  console.log(`[hl2-demo] Goal: ${profile.goal.slice(0, 160)}...`);

  const brain = new AgentBrain();
  brain.updateConfig({
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    modelName: 'deepseek-auto',
    gameRules: profile.goal
  });

  const director = new NativeGameDirector();
  director.setTarget(query);
  const os = require('os');
  const fs = require('fs');
  const tmpShot = path.join(os.tmpdir(), `hl2-demo-shot-${Date.now()}.jpg`);
  const history = [];

  for (let step = 1; step <= args.steps; step++) {
    let shot = null;
    let fakeFrame = false;
    try {
      if (args.dryRun) throw new Error('dry-run: no screen capture');
      shot = captureScreenshot(query, tmpShot);
    } catch (e) {
      // Dry-run / CI without the game open: still exercise the full decision path.
      fakeFrame = true;
      shot = Buffer.from(`hl2-demo-step-${step}-${Date.now()}`).toString('base64');
    }

    let decision = null;
    const hasKey = !!(process.env.DEEPSEEK_API_KEY || brain.config.apiKey);
    if (hasKey && !args.heuristic) {
      try {
        decision = await decideNativeActionViaDeepSeek(brain, {
          screenshotBase64: shot,
          windowTitle: query,
          profile,
          recentActions: history.slice(),
          stuck: false
        });
      } catch (e) {
        console.log(`[hl2-demo] step ${step}: vision failed (${e.message}), bandit fallback.`);
      }
    }
    if (!decision) {
      decision = director.choose(shot);
      decision.profile = profile.id;
    }
    history.push(decision.action);
    if (history.length > 6) history.shift();

    const pyArgs = toInputSimArgs(decision.action);
    let execNote = 'waited locally';
    if (pyArgs && !args.dryRun && !fakeFrame) {
      const r = runBridge(pyArgs, query);
      execNote = r.ok ? `bridge ok: ${pyArgs.join(' ')}` : `bridge FAIL: ${r.out}`;
    } else if (pyArgs) {
      execNote = `dry-run bridge argv: ${pyArgs.join(' ')} + "${query}"`;
    }
    console.log(`[hl2-demo] step ${step}/${args.steps} [${decision.status || 'playing'}] ${decision.reasoning} :: ${execNote}`);
    if (args.delayMs) await new Promise((r) => setTimeout(r, args.delayMs));
  }
  try { fs.unlinkSync(tmpShot); } catch (_) {}
  console.log(`[hl2-demo] done. Bandit summary: ${JSON.stringify(director.summary())}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(`[hl2-demo] fatal: ${e.message}`); process.exit(1); });
}

module.exports = { parseArgs };
