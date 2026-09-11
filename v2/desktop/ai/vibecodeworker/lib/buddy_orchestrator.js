/**
 * Buddy multi-agent orchestrator (desktop/CommonJS twin of
 * v2/vcw4w/lib/buddy-orchestrator.ts). Same planner, same merge, same
 * transport-agnostic runner injection. Default runner calls OpenRouter
 * directly via lib/openrouter_plays.js (offline fallback included).
 *
 * Run: node tests/test_buddy_orchestrator.js (no keys, no network).
 */

const { fallbackPlay, getPlay, runPlay } = require('./openrouter_plays');

const SPECIALIST_PLAYS = {
  voice: 'npc-barks',
  hype: 'hype-caster',
  lore: 'lorekeeper',
  sfx: 'sfx-smith',
  coach: 'tutorial-ghost',
  quest: 'quest-crafter',
  herald: 'clan-herald',
};

function planSpecialists(goalText) {
  const t = String(goalText == null ? '' : goalText).toLowerCase();
  const picked = ['coach'];
  const want = (id, re) => { if (picked.length < 4 && re.test(t) && !picked.includes(id)) picked.push(id); };
  want('voice', /(voice|say|speak|narrat|dub|announce|shout)/);
  want('hype', /(hype|victory|win|score|boss|goal|clutch|comeback)/);
  want('lore', /(lore|world|story|character|backstory|bible|faction)/);
  want('sfx', /(sfx|sound|boom|zap|explosion|ding|whoosh|audio cue)/);
  want('quest', /(quest|mission|objective|campaign|side-quest)/);
  want('herald', /(clan|lobby|team|guild|tournament)/);
  return picked;
}

function specialistInput(specialist, goal, ctx) {
  const bits = [goal];
  const game = String((ctx && ctx.gameTitle) || '').trim().slice(0, 80);
  const screen = String((ctx && ctx.screenText) || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (game) bits.push(`game: ${game}`);
  if (screen) bits.push(`screen: ${screen}`);
  if (ctx && typeof ctx.score === 'number' && Number.isFinite(ctx.score)) bits.push(`score: ${ctx.score}`);
  if (specialist === 'voice') bits.push('Deliver 3 speakable lines.');
  return bits.join(' | ').slice(0, 900);
}

function withTimeout(promise, ms, onTimeout) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(onTimeout()), ms); });
  return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

async function defaultRunner(playId, input) {
  const r = await runPlay(playId, input);
  return { text: r.output, fallback: r.fallback };
}

async function runOrchestrator(goal, ctx, runner, opts = {}) {
  const cleanGoal = String(goal == null ? '' : goal).replace(/\s+/g, ' ').trim().slice(0, 500) || '(no goal provided)';
  const context = ctx || {};
  const wanted = (opts.specialists || planSpecialists(cleanGoal)).filter((s) => typeof s === 'string' && s in SPECIALIST_PLAYS);
  const specialists = (wanted.length ? wanted : ['coach']).slice(0, 4);
  const timeoutMs = Math.min(60000, Math.max(1000, opts.timeoutMs || 20000));
  const concurrency = Math.min(4, Math.max(1, opts.concurrency || 3));

  const results = new Array(specialists.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < specialists.length) {
      const index = cursor;
      cursor += 1;
      const specialist = specialists[index];
      const playId = SPECIALIST_PLAYS[specialist];
      const play = getPlay(playId);
      if (!play) continue;
      const input = specialistInput(specialist, cleanGoal, context);
      const fallback = () => ({ specialist, playId, text: fallbackPlay(play, input), fallback: true });
      try {
        const settled = await withTimeout((runner || defaultRunner)(playId, input), timeoutMs, () => ({ text: '', fallback: true }));
        const text = String((settled && settled.text) || '').trim().slice(0, 2000);
        results[index] = text ? { specialist, playId, text, fallback: Boolean(settled && settled.fallback) } : fallback();
      } catch (_) {
        results[index] = fallback();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, specialists.length) }, () => worker()));

  const ordered = results.filter(Boolean);
  const live = ordered.filter((r) => !r.fallback);
  const pick = (id) => (ordered.find((r) => r.specialist === id) || {}).text || '';
  const first = (id) => live.find((r) => r.specialist === id);
  const reply = (first('coach') || first('voice') || live[0] || ordered[0] || {}).text
    || `[offline orchestrator] No specialists answered for "${cleanGoal.slice(0, 120)}".`;
  return {
    goal: cleanGoal,
    reply,
    specialists: ordered,
    fallbackCount: ordered.filter((r) => r.fallback).length,
    voiceLines: pick('voice'),
    sfxPrompts: pick('sfx'),
    loreNote: pick('lore'),
  };
}

module.exports = { SPECIALIST_PLAYS, planSpecialists, runOrchestrator, defaultRunner };
