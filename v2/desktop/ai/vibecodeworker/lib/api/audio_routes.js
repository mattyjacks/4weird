/**
 * Audio route handlers - ElevenLabs voice layer + offline PCM QA.
 * Mounted by lib/api/routes.js under /api/audio/*. All TTS/STS/SFX/Music
 * calls need ELEVENLABS_API_KEY (BYOK); /analyze, /npc-plan (synthesize
 * off), /voice-command-parse, and /subtitle-check work fully offline.
 */

const eleven = require('../elevenlabs');
const { stereoQaVerdict, subtitleDriftCheck, commandFromTranscript, generateNpcPack, coverMissingSfx, narrateBug, thinkOutLoud, sfxPromptForAsset } = require('../audio/voice_director');
const { getResolvedApiKey, maskApiKey } = require('../storage');

function audioStatus() {
  const key = getResolvedApiKey('elevenlabs');
  return {
    success: true,
    provider: 'elevenlabs',
    hasKey: Boolean(key),
    keyPreview: maskApiKey(key),
    channelModes: ['mono (default single stream)', 'stereo (L/R + differences)'],
    features: [
      'tts: text-to-speech narration + bug alerts',
      'stt: Scribe speech-to-text for voice commands + dialogue QA',
      'sfx: sound-effect generation for missing assets',
      'music: style-prompted composition for menus/bosses',
      'analyze: mono-default / stereo-opt-in PCM QA (offline)',
      'npc-pack: procedural NPC + tutorial VO lines',
      'subtitle-check: expected script vs heard transcript drift',
      'muse-spark-audio: PCM telemetry + transcript ride the brain prompt',
    ],
  };
}

async function handleAudioRequest(pathname, req, readBody, sendJSON, sendText) {
  // ─── GET /api/audio/status ───
  if (pathname === '/api/audio/status') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    return sendJSON(200, audioStatus());
  }

  // ─── GET /api/audio/voices ───
  if (pathname === '/api/audio/voices') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    try {
      const voices = await eleven.listVoices();
      return sendJSON(200, { success: true, count: voices.length, voices });
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/tts ─── Body: { text, voiceId?, modelId?, personality? }
  if (pathname === '/api/audio/tts') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const result = await eleven.textToSpeech(body.text, {
        apiKey: body.apiKey, voiceId: body.voiceId, modelId: body.modelId,
        stability: body.stability, similarityBoost: body.similarityBoost,
        style: body.style, speakerBoost: body.speakerBoost,
        outputFormat: body.outputFormat,
      });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : /Missing|requires|caps/i.test(e.message) ? 400 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/stt ─── Body: { audioBase64|audio, mimeType?, durationSeconds? }
  if (pathname === '/api/audio/stt') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const result = await eleven.speechToText(body.audioBase64 || body.audio, {
        apiKey: body.apiKey, mimeType: body.mimeType, fileName: body.fileName,
        modelId: body.modelId, languageCode: body.languageCode,
        diarize: body.diarize, durationSeconds: body.durationSeconds,
      });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : /Missing|requires|caps/i.test(e.message) ? 400 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/sfx ─── Body: { prompt, durationSeconds? }
  if (pathname === '/api/audio/sfx') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const result = await eleven.generateSoundEffect(body.prompt, {
        apiKey: body.apiKey, durationSeconds: body.durationSeconds, promptInfluence: body.promptInfluence,
      });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : /Missing|requires/i.test(e.message) ? 400 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/music ─── Body: { prompt, durationSeconds? }
  if (pathname === '/api/audio/music') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const result = await eleven.composeMusic(body.prompt, {
        apiKey: body.apiKey, durationSeconds: body.durationSeconds, modelId: body.modelId,
      });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : /Missing|requires/i.test(e.message) ? 400 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/analyze ─── Body: { pcm:{mono|left,right,sampleRate}, mode?, transcript? }
  if (pathname === '/api/audio/analyze') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      if (!body.pcm) return sendJSON(400, { success: false, error: 'Missing pcm ({ mono:[...] } or { left:[...], right:[...] })' });
      const verdict = stereoQaVerdict(body.pcm, { mode: body.mode || 'mono', transcript: body.transcript || null });
      return sendJSON(200, verdict);
    } catch (e) {
      return sendJSON(400, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/narrate-bug ─── Body: { bug:{title,description,severity}, gameId?, personality? }
  if (pathname === '/api/audio/narrate-bug') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const result = await narrateBug(body.bug || {}, {
        apiKey: body.apiKey, voiceId: body.voiceId, gameId: body.gameId, personality: body.personality,
      });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/commentary ─── Body: { reasoning, personality? }
  if (pathname === '/api/audio/commentary') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const result = await thinkOutLoud(body.reasoning, {
        apiKey: body.apiKey, voiceId: body.voiceId, personality: body.personality || 'streamer',
      });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : /requires/i.test(e.message) ? 400 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/voice-command ─── Body: { transcript? } OR { audioBase64... } (STT path needs key)
  if (pathname === '/api/audio/voice-command') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      if (body.transcript) {
        return sendJSON(200, { success: true, offline: true, ...commandFromTranscript(body.transcript) });
      }
      if (!body.audioBase64 && !body.audio) return sendJSON(400, { success: false, error: 'Provide transcript (offline) or audioBase64 (STT).' });
      const stt = await eleven.speechToText(body.audioBase64 || body.audio, { apiKey: body.apiKey, mimeType: body.mimeType });
      return sendJSON(200, { success: true, offline: false, ...commandFromTranscript(stt.text), stt });
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/npc-pack ─── Body: { theme?, lineCount?, synthesize?, voiceId? }
  if (pathname === '/api/audio/npc-pack') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    try {
      const pack = await generateNpcPack({
        theme: body.theme, lineCount: body.lineCount, voiceId: body.voiceId,
        apiKey: body.apiKey, synthesize: body.synthesize === true, personality: body.personality,
      });
      return sendJSON(200, pack);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/cover-missing ─── Body: { assetUrl, prompt?, durationSeconds? }
  if (pathname === '/api/audio/cover-missing') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    if (!body.assetUrl && !body.prompt) return sendJSON(400, { success: false, error: 'Provide assetUrl (or prompt).' });
    try {
      const result = await coverMissingSfx(body.assetUrl, { apiKey: body.apiKey, prompt: body.prompt, durationSeconds: body.durationSeconds });
      return sendJSON(200, result);
    } catch (e) {
      return sendJSON(e.status === 401 ? 401 : 500, { success: false, error: e.message });
    }
  }

  // ─── POST /api/audio/subtitle-check ─── Body: { expected, heard }
  if (pathname === '/api/audio/subtitle-check') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body._error) return sendJSON(400, { success: false, error: body._error });
    if (!body.expected || !body.heard) return sendJSON(400, { success: false, error: 'Provide expected and heard strings.' });
    return sendJSON(200, { success: true, offline: true, ...subtitleDriftCheck(body.expected, body.heard) });
  }

  // ─── GET /api/audio/sfx-hint ─── ?assetUrl=... (offline prompt mapper) ───
  if (pathname === '/api/audio/sfx-hint') {
    const assetUrl = req.method === 'GET' ? new URL(req.url, 'http://localhost').searchParams.get('assetUrl') : null;
    return sendJSON(200, { success: true, offline: true, assetUrl, prompt: sfxPromptForAsset(assetUrl || '') });
  }

  return null; // not an audio route; let the main dispatcher continue
}

module.exports = { handleAudioRequest, audioStatus };
