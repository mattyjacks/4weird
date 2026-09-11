'use strict';

// VibeCodeWorker's cloud-native Xonotic pilot.  It is deliberately separate
// from noVNC: the local vision model observes display :1 and this worker alone
// emits the bounded X11 inputs.  That makes the recorded menu-to-match path
// attributable to the AI rather than to a remote operator.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DISPLAY = process.env.VIBE_XONOTIC_DISPLAY || ':1';
const MODEL = process.env.VIBE_MODEL || 'qwen2.5vl:3b';
const OLLAMA = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const ROOT = path.resolve(__dirname, '..', '..');
const ARTIFACTS = path.join(ROOT, 'data', 'xonotic-agent');
const MAX_STEPS = Math.max(20, Math.min(180, Number(process.env.VCW_XONOTIC_AGENT_STEPS) || 110));
const STEP_DELAY_MS = Math.max(1200, Math.min(9000, Number(process.env.VCW_XONOTIC_STEP_DELAY_MS) || 2400));
fs.mkdirSync(ARTIFACTS, { recursive: true });

function command(bin, args, timeout = 8000) {
  return new Promise((resolve, reject) => execFile(bin, args, { env: { ...process.env, DISPLAY }, timeout, windowsHide: true }, (error, stdout, stderr) => {
    if (error) reject(new Error(`${bin}: ${(stderr || error.message).slice(-500)}`)); else resolve(stdout);
  }));
}
function boundedAction(raw) {
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  if (!match) return { type: 'wait', reason: 'model did not return JSON' };
  let value;
  try { value = JSON.parse(match[0]); } catch (_) { return { type: 'wait', reason: 'invalid JSON' }; }
  if (value.type === 'click' && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))) return { type: 'click', x: Math.max(0, Math.min(1439, Math.round(Number(value.x)))), y: Math.max(0, Math.min(899, Math.round(Number(value.y)))), reason: String(value.reason || '').slice(0, 160) };
  const allowed = new Set(['Return', 'Escape', 'Up', 'Down', 'Left', 'Right', 'space', 'w', 'a', 's', 'd', 'e', 'r', 'f', 'q', '1', '2', '3', '4', '5', 'Tab']);
  if (value.type === 'key' && allowed.has(String(value.key))) return { type: 'key', key: String(value.key), reason: String(value.reason || '').slice(0, 160) };
  if (value.type === 'hold' && allowed.has(String(value.key))) return { type: 'hold', key: String(value.key), ms: Math.max(150, Math.min(2200, Number(value.ms) || 500)), reason: String(value.reason || '').slice(0, 160) };
  if (value.type === 'fire') return { type: 'fire', ms: Math.max(100, Math.min(1400, Number(value.ms) || 450)), reason: String(value.reason || '').slice(0, 160) };
  return { type: 'wait', reason: String(value.reason || 'wait').slice(0, 160) };
}
async function choose(frame) {
  const prompt = `You are VibeCodeWorker controlling Xonotic singleplayer through an X11 desktop. Goal: visibly progress from menus into a singleplayer bot arena and earn two player kills. Read this 1440x900 screenshot. Return exactly one JSON object only. Actions are click with x,y; key with key; hold with key,ms; fire with ms; or wait. Prefer visible menu buttons. In an arena, move toward visible opponents, use click/fire, and keep fighting. Never open console, settings, quit, or use cheats. If the HUD/scoreboard confirms 2 player kills, return {"type":"wait","reason":"two kills confirmed"}.`;
  const response = await fetch(`${OLLAMA}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, prompt, images: [frame.toString('base64')], stream: false, options: { temperature: 0.15, num_predict: 120 } }) });
  if (!response.ok) throw new Error(`Ollama vision ${response.status}`);
  const body = await response.json();
  return boundedAction(body.response);
}
async function act(action) {
  if (action.type === 'click') return command('xdotool', ['mousemove', String(action.x), String(action.y), 'click', '1']);
  if (action.type === 'key') return command('xdotool', ['key', action.key]);
  if (action.type === 'hold') return command('xdotool', ['keydown', action.key]).then(() => new Promise(resolve => setTimeout(resolve, action.ms))).then(() => command('xdotool', ['keyup', action.key]));
  if (action.type === 'fire') return command('xdotool', ['mousedown', '1']).then(() => new Promise(resolve => setTimeout(resolve, action.ms))).then(() => command('xdotool', ['mouseup', '1']));
}
(async () => {
  const events = [];
  await new Promise(resolve => setTimeout(resolve, 45000));
  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const framePath = path.join(ARTIFACTS, `step-${String(step).padStart(3, '0')}.png`);
    try {
      await command('scrot', [framePath]);
      const action = await choose(fs.readFileSync(framePath));
      if (action.reason === 'two kills confirmed') { events.push({ step, action, at: new Date().toISOString() }); break; }
      await act(action);
      events.push({ step, action, at: new Date().toISOString() });
    } catch (error) {
      events.push({ step, error: error.message, at: new Date().toISOString() });
    }
    await new Promise(resolve => setTimeout(resolve, STEP_DELAY_MS));
  }
  fs.writeFileSync(path.join(ARTIFACTS, 'run.json'), JSON.stringify({ model: MODEL, display: DISPLAY, objective: 'menus to singleplayer arena to two player kills', events }, null, 2));
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
