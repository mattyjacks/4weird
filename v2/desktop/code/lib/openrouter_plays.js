/**
 * OpenRouter 25 plays for VibeCodeWorker (desktop).
 * Same catalog as v2/vcw4w/lib/openrouter-plays.ts, in CommonJS so
 * `node tests/test_openrouter_plays.js` and app/main.js can require it
 * with zero new dependencies.
 *
 * Voice truth: OpenRouter writes the lines; speech comes from the backends
 * already in this folder (elevenlabs.js, OpenAI TTS, fal via web, or
 * speechSynthesis). See voiceBackend/voiceId per play.
 */

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_REFERER = 'https://github.com/mattyjacks/4weird';
const OPENROUTER_TITLE = '4weird VibeCodeWorker';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

function clean(v, max = 800) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max) || '(no input provided)';
}

// id/title/category/blurb/voiceBackend/voiceId/system/user/maxTokens
const PLAY_DEFS = [
  ['npc-barks', 'NPC Bark Generator', 'voice', '3 short voice lines (idle/alert/KO).', 'openai-tts', 'fable', 'You write 4weird NPC voice lines. Exactly 3 numbered lines under 14 words each. Playful, clean.', (i) => `NPC + scene: ${clean(i)}. Lines for IDLE, ALERT, KNOCKED-OUT.`, 160],
  ['hype-caster', 'Hype Caster', 'voice', '30-second streamer play-by-play.', 'openai-tts', 'onyx', 'You are the 4weird hype caster. 3-4 shouted sentences, clean, end with one fair tip.', (i) => `Call this moment: ${clean(i, 600)}.`, 200],
  ['cozy-narrator', 'Cozy Narrator', 'voice', 'Calm lore bedtime read.', 'openai-tts', 'sage', 'Calm bedtime lore narrator. 4-6 slow sentences, gentle, end warm.', (i) => `Tell the cozy lore of: ${clean(i, 600)}.`, 220],
  ['villain-monologue', 'Villain Monologue', 'voice', 'Boss taunt + one fair counter.', 'elevenlabs', 'Rachel', 'Clearly fictional boss taunt in 3 sentences, then ONE fair counter-tactic. No real threats.', (i) => `Boss + arena: ${clean(i, 600)}. Taunt then tactic.`, 200],
  ['multilingual-dub', 'Multilingual Dub', 'voice', 'One line in ES/FR/DE/JA.', 'fal-minimax', 'fal-minimax/speech-02-hd', 'Dub writer. Output 4 lines ES:/FR:/DE:/JA:, natural translations under 20 words. No explanations.', (i) => `Dub this line: ${clean(i, 300)}.`, 200],
  ['robot-sidekick', 'Robot Sidekick Script', 'voice', 'Bleepy lines with [pause] marks.', 'elevenlabs', 'Rachel', 'Cute robot sidekick. 3 lines, each with one [pause] or [beep], under 16 words.', (i) => `Robot reacts to: ${clean(i, 600)}.`, 160],
  ['sfx-smith', 'SFX Prompt Smith', 'voice', 'stable-audio SFX prompts for fal.', 'none', 'stable-audio-v2', 'Write text-to-SFX prompts. 3 prompts: <sound> + <material> + <space> + <duration>. No music.', (i) => `Need SFX for: ${clean(i, 600)}.`, 180],
  ['voice-command-parser', 'Voice Command Parser', 'voice', 'Transcript -> game-action JSON.', 'none', 'none', 'Parse to JSON only: {"action":"move|jump|attack|pause|none","target":"...","confidence":0-1}.', (i) => `Transcript: "${clean(i, 400)}"`, 120],
  ['dungeon-master', 'AI Dungeon Master', 'game', 'Scene + 2 choices.', 'openai-tts', 'echo', 'Dungeon master. 3 sentences + exactly 2 numbered choices. Never reveal the exit.', (i) => `Party state: ${clean(i)}.`, 220],
  ['quest-crafter', 'Quest Crafter', 'game', '3 objectives + reward.', 'none', 'none', 'Quest crafter. GOAL (1 line), 3 OBJECTIVES, REWARD (1 line). Family-friendly.', (i) => `Quest theme: ${clean(i, 300)}.`, 220],
  ['loadout-dj', 'Loadout DJ', 'game', 'Build + walk-up announce script.', 'openai-tts', 'nova', 'Loadout DJ. BUILD: (3 items), ANNOUNCE: (2 hype sentences). Clean.', (i) => `Game + playstyle: ${clean(i, 500)}.`, 220],
  ['rival-mind-reader', 'Rival Mind Reader', 'game', 'Prediction + counter.', 'none', 'none', 'Read rival patterns. PREDICTION: (1 line + %), COUNTER: (1 tactic). Never claim certainty.', (i) => `Rival history: ${clean(i)}.`, 160],
  ['tutorial-ghost', 'Tutorial Ghost', 'game', 'Gentle hint, never the solution.', 'browser-speech', 'default', 'Tutorial ghost. One hint in 2 sentences max. Never the full solution.', (i) => `Player stuck at: ${clean(i, 600)}.`, 140],
  ['accessibility-describer', 'Accessibility Describer', 'game', '2-sentence audio-description script.', 'openai-tts', 'coral', 'Audio-description. 2 clear sentences: layout then action. Plain words only.', (i) => `Screen text: ${clean(i)}.`, 160],
  ['autoplay-coach', 'Autoplay Coach', 'game', 'Telemetry -> next action JSON.', 'none', 'none', 'Autoplay coach. JSON only: {"action":"click|move|wait|report","detail":"...","why":"..."}.', (i) => `Telemetry: ${clean(i)}.`, 140],
  ['postmatch-roast', 'Post-Match Roast + Pep', 'game', 'Kind roast + pep talk.', 'openai-tts', 'shimmer', 'Kind roast line 1, genuine pep + tip line 2. Clean, 2 lines total.', (i) => `Match result: ${clean(i, 500)}.`, 160],
  ['crossover-mashup', 'Crossover Mashup', 'game', 'Fuse 2 games into a mode pitch.', 'none', 'none', 'Crossover pitch. TITLE:, HOOK:, RULES: (3 bullets). Playable, family-friendly.', (i) => `Fuse: ${clean(i, 400)}.`, 220],
  ['trash-talk-royale', 'Trash-Talk Royale Announcer', 'chaos', 'Silly callouts, friends after.', 'openai-tts', 'alloy', 'Royale announcer. 3 hype callouts, silly not mean, end with cheer line.', (i) => `Lobby moment: ${clean(i, 600)}.`, 200],
  ['meme-oracle', 'Meme Oracle (for fun)', 'chaos', 'Silly fortune, entertainment only.', 'browser-speech', 'default', 'Meme oracle, pure entertainment. 2 silly sentences + LUCKY ITEM. Say for fun. No real advice.', (i) => `Question: ${clean(i, 400)}.`, 140],
  ['dream-glitch', 'Dream Glitch Sequencer', 'chaos', '3 surreal but beatable modifiers.', 'none', 'none', 'Dream glitches. 3 numbered surreal modifiers, level stays beatable. No horror.', (i) => `Level theme: ${clean(i, 500)}.`, 200],
  ['bug-bard', 'Bug Bard', 'chaos', 'Bug -> poem + fix hint.', 'elevenlabs', 'Rachel', 'Bug bard. 4-line rhyming poem, then HINT: (one debug step). Kind, no blame.', (i) => `Bug: ${clean(i)}.`, 200],
  ['cheat-poet', 'Cheat-Code Poet', 'chaos', 'Cheat flags -> riddle hints.', 'none', 'none', 'Hint at cheats via 2-line riddle. Never raw code or exploit steps.', (i) => `Cheat/level: ${clean(i, 500)}.`, 140],
  ['clan-herald', 'Clan Herald', 'chaos', 'News -> epic proclamation.', 'openai-tts', 'echo', 'Clan herald. Epic 3-sentence proclamation. Inclusive, no politics.', (i) => `Clan news: ${clean(i, 600)}.`, 180],
  ['shopkeeper-haggle', 'Shopkeeper Haggle', 'chaos', 'In-character fair deal.', 'openai-tts', 'ash', 'Cheeky shopkeeper. 3 haggle lines, then DEAL: (fair coins). Player can walk away.', (i) => `Item + offer: ${clean(i, 500)}.`, 180],
  ['lorekeeper', 'Lorekeeper', 'chaos', '3 keywords -> bible entry.', 'none', 'none', 'Lorekeeper. 5 sentences: origin, quirk, rivalry, motto, mystery. Family-friendly.', (i) => `Keywords: ${clean(i, 300)}.`, 220],
];

const OPENROUTER_PLAYS = PLAY_DEFS.map(([id, title, category, blurb, voiceBackend, voiceId, system, userPrompt, maxTokens]) => ({
  id, title, category, blurb, voiceBackend, voiceId, model: DEFAULT_MODEL, system, userPrompt, maxTokens,
}));

function getPlay(id) {
  return OPENROUTER_PLAYS.find((p) => p.id === String(id == null ? '' : id).trim().toLowerCase());
}

function fallbackPlay(play, input) {
  const snippet = clean(input, 140);
  if (play.id === 'voice-command-parser') return '{"action":"none","target":"","confidence":0.0}';
  if (play.id === 'autoplay-coach') return '{"action":"wait","detail":"observe one more frame","why":"offline fallback"}';
  if (play.id === 'multilingual-dub') return `ES: ${snippet}\nFR: ${snippet}\nDE: ${snippet}\nJA: ${snippet}`;
  if (play.id === 'sfx-smith') return '1. soft UI click, plastic, small room, 0.5s\n2. deep dungeon thud, stone, large cave, 1.2s\n3. bright coin shimmer, metal, close-up, 0.8s';
  return `[offline ${play.id}] Free local take on "${snippet}". Set OPENROUTER_API_KEY for the full ${play.title}.`;
}

function isPlaceholderKey(k) {
  const s = String(k == null ? '' : k).trim();
  return !s || s.includes('your-openrouter') || s.includes('your-meta-or-openrouter') || s === 'sk-or-v1-your-openrouter-api-key-here';
}

function resolveKey(explicit) {
  if (explicit && !isPlaceholderKey(explicit)) return String(explicit).trim();
  try {
    const { getResolvedApiKey } = require('./storage');
    const stored = getResolvedApiKey('openrouter', '');
    if (stored && !isPlaceholderKey(stored)) return stored;
  } catch (_) {}
  const env = process.env.OPENROUTER_API_KEY || process.env.META_API_KEY || '';
  return isPlaceholderKey(env) ? '' : String(env).trim();
}

async function runPlay(playId, input, opts = {}) {
  const play = getPlay(playId);
  if (!play) throw new Error(`unknown playId: ${playId}`);
  const text = clean(input, 2000);
  const key = resolveKey(opts.apiKey);
  if (!key) return { playId: play.id, output: fallbackPlay(play, text), fallback: true, voiceBackend: play.voiceBackend, voiceId: play.voiceId };
  const fetchFn = opts.fetch || globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 15000);
  try {
    const res = await fetchFn(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': OPENROUTER_REFERER, 'X-Title': OPENROUTER_TITLE },
      body: JSON.stringify({ model: play.model, messages: [{ role: 'system', content: play.system }, { role: 'user', content: play.userPrompt(text) }], max_tokens: play.maxTokens, temperature: 0.8 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const out = String((payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content) || '').trim().slice(0, 2000);
    if (!out) throw new Error('empty completion');
    return { playId: play.id, output: out, fallback: false, voiceBackend: play.voiceBackend, voiceId: play.voiceId };
  } catch (e) {
    return { playId: play.id, output: fallbackPlay(play, text), fallback: true, voiceBackend: play.voiceBackend, voiceId: play.voiceId, error: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { OPENROUTER_ENDPOINT, OPENROUTER_PLAYS, getPlay, fallbackPlay, resolveKey, isPlaceholderKey, runPlay };
