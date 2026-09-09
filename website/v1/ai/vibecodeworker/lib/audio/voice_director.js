/**
 * Voice Director — EPIC ElevenLabs x Muse Spark 1.3 game-audio integrations
 * ==========================================================================
 * Each static maps to a real playtest superpower:
 *
 *  1. narrateBug() ........... speak bug reports (TTS) so streamers + a11y
 *                               players hear defects instead of reading logs.
 *  2. thinkOutLoud() .......... voice the agent's reasoning_path as a
 *                               streamer-style commentary track (TTS).
 *  3. voiceCommandToAction() ... STT transcript -> discrete game action
 *                               ("jump", "attack", "scroll down") for
 *                               hands-free playtesting + a11y input.
 *  4. generateNpcPack() ........ procedural NPC dialogue + tutorial VO lines
 *                               (text plans + optional TTS audio per line).
 *  5. coverMissingSfx() ........ when network telemetry 404s an audio asset,
 *                               synthesize a placeholder SFX so QA continues.
 *  6. stereoQaVerdict() ........ mono-default / stereo-opt-in PCM analysis +
 *                               Muse Spark 1.3 audio prompt block builder.
 *  7. subtitleDriftCheck() ..... compare expected VO script vs STT heard
 *                               transcript; flag subtitle/VO drift bugs.
 */

const eleven = require('../elevenlabs');
const { analyzeAudio, compareTranscript, buildAudioQABlock } = require('./audio_analyzer');

const PERSONALITIES = {
  streamer: { stability: 0.35, similarityBoost: 0.8, style: 0.65, speakerBoost: true },
  qa: { stability: 0.6, similarityBoost: 0.7, style: 0.15, speakerBoost: true },
  narrator: { stability: 0.5, similarityBoost: 0.75, style: 0.3, speakerBoost: true },
  villain: { stability: 0.3, similarityBoost: 0.85, style: 0.8, speakerBoost: true },
};

// Voice-command vocabulary -> normalized game actions (0-1000 coord space
// + key names match GameController.getKeyCode()).
const VOICE_COMMAND_PATTERNS = [
  { re: /\b(jump|hop|leap)\b/i, action: { type: 'press_key', target: 'Space', duration_ms: 150 } },
  { re: /\b(attack|hit|strike|whack|shoot|fire)\b/i, action: { type: 'click', target: '500,500', duration_ms: 150 } },
  // Multi-word scroll commands first — "scroll down" must not match "down".
  { re: /\b(scroll down|page down)\b/i, action: { type: 'scroll', target: 'down', duration_ms: 200, params: { direction: 'down', amount: 600 } } },
  { re: /\b(scroll up|page up)\b/i, action: { type: 'scroll', target: 'up', duration_ms: 200, params: { direction: 'up', amount: 600 } } },
  { re: /\b(left|move left)\b/i, action: { type: 'press_key', target: 'ArrowLeft', duration_ms: 200 } },
  { re: /\b(right|move right)\b/i, action: { type: 'press_key', target: 'ArrowRight', duration_ms: 200 } },
  { re: /\b(up|move up|forward)\b/i, action: { type: 'press_key', target: 'ArrowUp', duration_ms: 200 } },
  { re: /\b(down|move down|back|crouch)\b/i, action: { type: 'press_key', target: 'ArrowDown', duration_ms: 200 } },
  { re: /\b(pause|wait|hold)\b/i, action: { type: 'press_key', target: 'Escape', duration_ms: 150 } },
  { re: /\b(restart|retry|again|refresh)\b/i, action: { type: 'refresh', target: '', duration_ms: 200 } },
  { re: /\b(heal|potion|drink)\b/i, action: { type: 'press_key', target: 'q', duration_ms: 150 } },
  { re: /\b(confirm|enter|start|go|yes|ok)\b/i, action: { type: 'press_key', target: 'Enter', duration_ms: 150 } },
];

function commandFromTranscript(transcript) {
  const text = String(transcript || '');
  for (const { re, action } of VOICE_COMMAND_PATTERNS) {
    if (re.test(text)) return { matched: true, transcript: text, action: { ...action } };
  }
  return { matched: false, transcript: text, action: { type: 'wait', target: '', duration_ms: 500 } };
}

async function narrateBug(bug, options = {}) {
  const title = bug?.title || bug?.description || 'Unknown defect';
  const severity = bug?.severity || 'medium';
  const text = `QA alert. ${severity} severity bug in ${options.gameId || 'the current game'}. ${title}.`.slice(0, 500);
  return eleven.textToSpeech(text, {
    apiKey: options.apiKey,
    voiceId: options.voiceId,
    ...(PERSONALITIES[options.personality || 'qa'] || PERSONALITIES.qa),
  });
}

async function thinkOutLoud(reasoning, options = {}) {
  const text = Array.isArray(reasoning) ? reasoning.join(', ') : String(reasoning || '');
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!clean) throw new Error('thinkOutLoud requires reasoning text.');
  const prefix = options.personality === 'streamer' ? 'Here is my play: ' : 'Agent reasoning: ';
  return eleven.textToSpeech(prefix + clean, {
    apiKey: options.apiKey,
    voiceId: options.voiceId,
    ...(PERSONALITIES[options.personality || 'streamer'] || PERSONALITIES.streamer),
  });
}

async function transcribeVoiceCommand(audioInput, options = {}) {
  const stt = await eleven.speechToText(audioInput, { apiKey: options.apiKey, ...options.stt });
  const parsed = commandFromTranscript(stt.text);
  return { ...parsed, stt };
}

/**
 * Procedural VO pack: deterministic line plans for NPC barks + tutorial,
 * with optional per-line TTS (set synthesize:true; off by default so the
 * planner stays free/offline and tests never hit network).
 */
async function generateNpcPack({ theme = 'dungeon crawler', lineCount = 6, voiceId, apiKey, synthesize = false, personality = 'narrator' } = {}) {
  const count = Math.min(Math.max(parseInt(lineCount, 10) || 6, 1), 20);
  const bank = {
    greet: [`Welcome to the ${theme}, traveler.`, `You made it. The ${theme} remembers you.`],
    hint: [`Watch the shadows — that is where the ${theme} hides its teeth.`, `Listen: the music changes before the ambush.`],
    bark: [`Another one for the ${theme} depths!`, `You fight like a ${theme} tutorial popup!`, `The ${theme} always wins.`],
    victory: [`The ${theme} yields... this time.`, `Clean run. The crowd goes mild.`],
    defeat: [`Respawn is just a state machine.`, `The ${theme} keeps your high score.`],
  };
  const keys = Object.keys(bank);
  const lines = [];
  for (let i = 0; i < count; i++) {
    const kind = keys[i % keys.length];
    const pool = bank[kind];
    lines.push({ kind, text: pool[Math.floor(i / keys.length) % pool.length] });
  }
  let audio = null;
  if (synthesize) {
    audio = [];
    for (const line of lines) {
      const clip = await eleven.textToSpeech(line.text, {
        apiKey, voiceId, ...(PERSONALITIES[personality] || PERSONALITIES.narrator),
      });
      audio.push({ kind: line.kind, text: line.text, ...clip });
    }
  }
  return { success: true, theme, count, lines, audio, synthesized: Boolean(synthesize) };
}

/**
 * Missing-asset cover: turn a 404'd audio URL into a generated placeholder.
 * Maps file-name hints (coin, hit, jump, boss, ui) to SFX prompts.
 */
function sfxPromptForAsset(url) {
  const u = String(url || '').toLowerCase();
  if (/coin|pickup|collect/.test(u)) return '8-bit arcade coin pickup blip, bright and short';
  if (/hit|attack|slash|shoot|laser/.test(u)) return 'retro laser hit zap, punchy arcade impact';
  if (/jump|bounce/.test(u)) return 'cartoon boing jump, quick upward sweep';
  if (/boss|alarm|danger/.test(u)) return 'dark boss warning horn, ominous low swell';
  if (/click|ui|hover|select/.test(u)) return 'soft UI click tick, minimal and clean';
  if (/win|fanfare|victory/.test(u)) return 'tiny victory fanfare arpeggio, chiptune';
  if (/lose|death|gameover/.test(u)) return 'sad descending game-over tone, 8-bit';
  return 'neutral placeholder blip, short sine pop';
}

async function coverMissingSfx(assetUrl, options = {}) {
  const prompt = options.prompt || sfxPromptForAsset(assetUrl);
  const clip = await eleven.generateSoundEffect(prompt, { apiKey: options.apiKey, durationSeconds: options.durationSeconds ?? 2 });
  return { success: true, assetUrl, prompt, ...clip };
}

/**
 * Stereo QA verdict: PCM in, brain-ready block out.
 * `pcm` accepts mono or {left,right}; mode 'mono' (default, one stream)
 * or 'stereo' (keeps L/R + reports differences).
 */
function stereoQaVerdict(pcm, { mode = 'mono', transcript = null } = {}) {
  const report = analyzeAudio(pcm, { mode });
  return {
    ...report,
    promptBlock: buildAudioQABlock(report, transcript),
    recommendation: report.verdict === 'pass'
      ? 'Ship it: levels clean, channels healthy.'
      : report.verdict === 'warn'
        ? 'Review before ship: minor audio issues listed in findings.'
        : 'Block ship: fail-grade audio defects (silence/clipping/channel loss).',
  };
}

function subtitleDriftCheck(expectedScript, heardTranscript) {
  const cmp = compareTranscript(expectedScript, heardTranscript);
  return {
    ...cmp,
    bug: cmp.match ? null : {
      has_bug: true,
      description: `VO/subtitle drift (similarity ${(cmp.similarity * 100).toFixed(0)}%): expected "${cmp.expected.slice(0, 120)}" but heard "${cmp.heard.slice(0, 120)}"`,
      severity: cmp.similarity < 0.4 ? 'high' : 'medium',
    },
  };
}

module.exports = {
  PERSONALITIES,
  VOICE_COMMAND_PATTERNS,
  commandFromTranscript,
  narrateBug,
  thinkOutLoud,
  transcribeVoiceCommand,
  generateNpcPack,
  sfxPromptForAsset,
  coverMissingSfx,
  stereoQaVerdict,
  subtitleDriftCheck,
};
