/**
 * HL2: Episode Two - first real game the AI plays (demo of "play any game").
 *
 * Universal loop, no HL2-only engine code:
 *   resolve profile -> screenshot -> DeepSeek harness vision -> input_sim.py
 *
 * Usage:
 *   node run_hl2_playtest.js --window "Half-Life 2" --steps 200 --dry-run
 *   node run_hl2_playtest.js --game hl2-ep2 --steps 50
 *   node run_hl2_playtest.js --game hl2-ep2 --unpause --steps 120
 *   node run_hl2_playtest.js --game hl2-ep2 --launch --steps 200
 *   node run_hl2_playtest.js --game "Doom Eternal" --steps 50 --dry-run  (any game works)
 * Flags: --launch (Steam launch AppId 420), --no-new-game (skip New Game
 * startup), --mode <exclusive-fullscreen|borderless|windowed-fullscreen|partial-windowed>
 *
 * Safety: live inputs are sent ONLY when the target window/process is found;
 * otherwise the script forces --dry-run automatically (decisions + bridge
 * argv are printed, nothing is executed).
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
  const out = { window: 'Half-Life 2', game: '', steps: 20, dryRun: false, heuristic: false, delayMs: 400, launch: false, newGame: true, unpause: false, headless: false, mode: 'exclusive-fullscreen' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--window') out.window = argv[++i] || out.window;
    else if (a === '--game') out.game = argv[++i] || '';
    else if (a === '--steps') out.steps = Math.max(1, parseInt(argv[++i], 10) || 20);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--heuristic') out.heuristic = true;
    else if (a === '--delay') out.delayMs = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--list-games') { out.listGames = true; }
    else if (a === '--launch') out.launch = true;
    else if (a === '--no-new-game') out.newGame = false;
    else if (a === '--new-game') out.newGame = true;
    else if (a === '--unpause') out.unpause = true;
    else if (a === '--headless') out.headless = true;
    else if (a === '--mode') out.mode = argv[++i] || out.mode;
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

// Safety: input_sim.py screenshots the whole desktop (exit 0) when the
// target window is missing, so a failed screenshot can NOT be used to detect
// "game not running" — without this check the loop would send REAL inputs to
// whatever window has focus. Verify the target exists first via the overlay
// command (throws "Window not found") or the process list, and force dry-run
// when it is absent so only decisions are printed, never executed.
function targetWindowPresent(query) {
  const py = path.join(projectRoot, 'scripts', 'python', 'input_sim.py');
  const res = spawnSync('python', [py, 'overlay', query], { encoding: 'utf8', timeout: 15000 });
  return res.status === 0;
}

function targetProcessRunning(processNames) {
  try {
    const res = spawnSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8', timeout: 15000 });
    const out = String(res.stdout || '').toLowerCase();
    return (processNames || []).some((n) => n && out.includes(String(n).toLowerCase()));
  } catch (_) {
    return false;
  }
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

  // A hidden game-control loop is unsafe: it can keep moving the system
  // pointer after the operator has lost sight of the target. Keep its policy
  // and reporting available, but never send live input in headless mode.
  if (args.headless) {
    args.dryRun = true;
    console.log('[hl2-demo] --headless requested: forcing --dry-run; no mouse or keyboard input will be sent. Use the visible desktop runner for live playtests.');
  }

  // Optional Steam launch: `node run_hl2_playtest.js --game hl2-ep2 --launch`
  // opens Episode Two (AppId 420) via the steam://run protocol before attaching.
  if (args.launch && !args.dryRun) {
    try {
      const { buildSteamRunUrl } = require(path.join(projectRoot, 'src', 'main_process', 'native_runner'));
      const appId = profile.steamAppId || 420;
      const launch = buildSteamRunUrl(appId, { mode: args.mode });
      console.log(`[hl2-demo] Launching Steam game ${appId} (${profile.name}) via ${launch.url} ...`);
      const { shell } = process.versions.electron ? require('electron') : {};
      if (shell && shell.openExternal) await shell.openExternal(launch.url);
      else {
        const { execSync } = require('child_process');
        execSync(`start "" "${launch.url}"`, { stdio: 'ignore' });
      }
      console.log('[hl2-demo] Waiting 12s for the game window to appear...');
      await new Promise((r) => setTimeout(r, 12000));
    } catch (e) {
      console.log(`[hl2-demo] Steam launch failed (${e.message}), continuing to attach check.`);
    }
  }

  // Never send real inputs unless the target is actually on screen. Profile
  // ids (e.g. "hl2-ep2") are checked against the process list; title queries
  // are checked against visible window titles.
  if (!args.dryRun) {
    const knownIds = new Set(listProfiles().map((p) => String(p.id).toLowerCase()));
    const looksLikeId = !!args.game && knownIds.has(String(args.game).toLowerCase());
    const present = looksLikeId
      ? targetProcessRunning(profile.processNames)
      : (targetWindowPresent(query) || targetProcessRunning(profile.processNames));
    if (!present) {
      args.dryRun = true;
      console.log(`[hl2-demo] Target "${query}" is not running — forcing --dry-run (decisions printed, NO inputs sent). Start the game first for a live run (or re-run with --launch).`);
    }
  }

  // Opt-in recovery for a session the operator knows is paused.  Keep this
  // explicit: Escape toggles the Source pause menu, so it must never be sent
  // blindly during normal gameplay.
  if (args.unpause && !args.dryRun) {
    const resumed = runBridge(['press', 'escape'], query);
    if (!resumed.ok) {
      throw new Error(`unpause failed: ${resumed.out}`);
    }
    console.log('[hl2-demo] Unpause requested: Escape sent to the verified game window.');
    await new Promise((r) => setTimeout(r, 500));
  }

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
  // Fresh-run startup: Episode Two opens on menus/intros, so the first ticks
  // press Enter through New Game + difficulty (mirrors the dashboard flow).
  const startupQueue = [];
  if (args.newGame) {
    let s = null;
    // chooseStartup returns at most 2 sequenced actions for hl2-ep2.
    for (let i = 0; i < 2; i++) {
      s = director.chooseStartup(profile.id, true);
      if (!s) break;
      startupQueue.push(s);
    }
  }

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
    if (startupQueue.length) {
      decision = startupQueue.shift();
      decision.profile = profile.id;
      decision.status = decision.status || 'menu';
    }
    const hasKey = !!(process.env.DEEPSEEK_API_KEY || brain.config.apiKey);
    if (!decision && hasKey && !args.heuristic) {
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
