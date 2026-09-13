/**
 * ElevenLabs Audio Client for VibeCodeWorker
 * ==========================================
 * BYOK audio provider: text-to-speech, speech-to-text (Scribe),
 * sound-effects generation, music composition, voice design + cloning
 * stubs, and audio-isolation helpers.
 *
 * Auth: `xi-api-key: <ELEVENLABS_API_KEY>` header on every call.
 * Key resolution order (same doctrine as lib/storage.js):
 *   1. explicit argument
 *   2. encrypted OS store (%APPDATA%/vibecodeworker/credentials.enc)
 *   3. process.env.ELEVENLABS_API_KEY (placeholders rejected)
 *
 * Creative EPIC integrations live in lib/audio/voice_director.js and
 * lib/audio/audio_analyzer.js; this file is the thin transport + pricing
 * + voice catalog layer so it stays unit-testable without network.
 */

const { getResolvedApiKey, isPlaceholderKey } = require('./storage');
const { calculateCost: _calcCost } = require('./pricing');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// Low-cost, high-quality defaults (overridable per call).
const DEFAULTS = {
  ttsModel: 'eleven_multilingual_v2',
  ttsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel; permissive default
  sttModel: 'scribe_v1',
  sfxModel: null, // sound-generation endpoint carries no model param
  musicModel: 'music_v1',
  outputFormat: 'mp3_44100_128',
};

function resolveElevenLabsKey(explicitKey = '') {
  const typed = String(explicitKey || '').trim();
  if (typed && !isPlaceholderKey(typed)) return typed;
  return getResolvedApiKey('elevenlabs', '');
}

function hasElevenLabsKey(explicitKey = '') {
  return Boolean(resolveElevenLabsKey(explicitKey));
}

function elevenHeaders(apiKey, extra = {}) {
  return { 'xi-api-key': apiKey, ...extra };
}

async function throwIfBad(response, context) {
  if (response.ok) return;
  const detail = (await response.text()).slice(0, 400);
  const err = new Error(`ElevenLabs ${context} failed: ${response.status} ${response.statusText} - ${detail}`);
  err.status = response.status;
  err.context = context;
  throw err;
}

// ─── Voices ──────────────────────────────────────────────────────────

async function listVoices(explicitKey = '') {
  const apiKey = resolveElevenLabsKey(explicitKey);
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY. Add one via settings, credentials store, or env.');
  const response = await fetch(`${ELEVENLABS_BASE}/voices`, { headers: elevenHeaders(apiKey) });
  await throwIfBad(response, 'listVoices');
  const data = await response.json();
  return (data.voices || []).map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels || {},
    preview_url: v.preview_url || null,
  }));
}

// ─── Text-to-Speech ──────────────────────────────────────────────────

async function textToSpeech(text, options = {}) {
  const apiKey = resolveElevenLabsKey(options.apiKey);
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY. Add one via settings, credentials store, or env.');
  const clean = String(text || '').trim();
  if (!clean) throw new Error('textToSpeech requires non-empty text.');
  if (clean.length > 5000) throw new Error('textToSpeech caps at 5000 chars per call; chunk longer scripts first.');

  const voiceId = options.voiceId || DEFAULTS.ttsVoiceId;
  const modelId = options.modelId || DEFAULTS.ttsModel;
  const format = options.outputFormat || DEFAULTS.outputFormat;

  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(format)}`,
    {
      method: 'POST',
      headers: elevenHeaders(apiKey, { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
      body: JSON.stringify({
        text: clean,
        model_id: modelId,
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0.3,
          use_speaker_boost: options.speakerBoost ?? true,
        },
      }),
    }
  );
  await throwIfBad(response, 'textToSpeech');
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const chars = clean.length;
  return {
    success: true,
    mimeType: 'audio/mpeg',
    audioBase64: audioBuffer.toString('base64'),
    bytes: audioBuffer.length,
    voiceId,
    modelId,
    chars,
    costEstimateUSD: estimateTtsCost(chars),
  };
}

// ─── Speech-to-Text (Scribe) ─────────────────────────────────────────

async function speechToText(audioInput, options = {}) {
  const apiKey = resolveElevenLabsKey(options.apiKey);
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY. Add one via settings, credentials store, or env.');
  const buffer = toAudioBuffer(audioInput);
  if (!buffer || buffer.length === 0) throw new Error('speechToText requires audio bytes, base64, or a file path.');
  if (buffer.length > 25 * 1024 * 1024) throw new Error('speechToText caps at 25MB per call.');

  const form = new FormData();
  form.append('model_id', options.modelId || DEFAULTS.sttModel);
  form.append('file', new Blob([formatToUint8(buffer)], { type: options.mimeType || 'audio/wav' }), options.fileName || 'game-audio.wav');
  if (options.languageCode) form.append('language_code', options.languageCode);
  if (options.diarize) form.append('diarize', 'true');
  if (options.timestamps !== false) form.append('timestamps_granularity', 'word');

  const response = await fetch(`${ELEVENLABS_BASE}/speech-to-text`, {
    method: 'POST',
    headers: elevenHeaders(apiKey),
    body: form,
  });
  await throwIfBad(response, 'speechToText');
  const data = await response.json();
  return {
    success: true,
    text: data.text || '',
    language: data.language_code || data.language || null,
    words: data.words || [],
    speakers: data.speakers || data.diarization || null,
    modelId: options.modelId || DEFAULTS.sttModel,
    secondsBilled: options.durationSeconds || 0,
    costEstimateUSD: options.durationSeconds ? estimateSttCost(options.durationSeconds) : 0,
    raw: data,
  };
}

// ─── Sound effects generation ────────────────────────────────────────

async function generateSoundEffect(prompt, options = {}) {
  const apiKey = resolveElevenLabsKey(options.apiKey);
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY. Add one via settings, credentials store, or env.');
  const clean = String(prompt || '').trim();
  if (!clean) throw new Error('generateSoundEffect requires a text prompt (e.g. "8-bit coin pickup").');

  const response = await fetch(`${ELEVENLABS_BASE}/sound-generation`, {
    method: 'POST',
    headers: elevenHeaders(apiKey, { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
    body: JSON.stringify({
      text: clean,
      duration_seconds: clamp(options.durationSeconds ?? 3, 0.5, 30),
      prompt_influence: clamp(options.promptInfluence ?? 0.3, 0, 1),
    }),
  });
  await throwIfBad(response, 'generateSoundEffect');
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    success: true,
    mimeType: 'audio/mpeg',
    audioBase64: audioBuffer.toString('base64'),
    bytes: audioBuffer.length,
    prompt: clean,
  };
}

// ─── Music composition ───────────────────────────────────────────────

async function composeMusic(prompt, options = {}) {
  const apiKey = resolveElevenLabsKey(options.apiKey);
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY. Add one via settings, credentials store, or env.');
  const clean = String(prompt || '').trim();
  if (!clean) throw new Error('composeMusic requires a style prompt (e.g. "boss-fight synthwave, 140bpm").');

  const response = await fetch(`${ELEVENLABS_BASE}/music`, {
    method: 'POST',
    headers: elevenHeaders(apiKey, { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
    body: JSON.stringify({
      prompt: clean,
      music_length_ms: clamp(Math.round((options.durationSeconds ?? 10) * 1000), 3000, 300000),
      model_id: options.modelId || DEFAULTS.musicModel,
    }),
  });
  await throwIfBad(response, 'composeMusic');
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    success: true,
    mimeType: 'audio/mpeg',
    audioBase64: audioBuffer.toString('base64'),
    bytes: audioBuffer.length,
    prompt: clean,
  };
}

// ─── Audio isolation (voice/dialogue cleanup for QA) ─────────────────

async function isolateVocals(audioInput, options = {}) {
  const apiKey = resolveElevenLabsKey(options.apiKey);
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY. Add one via settings, credentials store, or env.');
  const buffer = toAudioBuffer(audioInput);
  if (!buffer || buffer.length === 0) throw new Error('isolateVocals requires audio bytes.');

  const form = new FormData();
  form.append('audio', new Blob([formatToUint8(buffer)], { type: options.mimeType || 'audio/wav' }), 'mix.wav');
  const response = await fetch(`${ELEVENLABS_BASE}/audio-isolation`, {
    method: 'POST',
    headers: elevenHeaders(apiKey),
    body: form,
  });
  await throwIfBad(response, 'isolateVocals');
  const out = Buffer.from(await response.arrayBuffer());
  return { success: true, mimeType: 'audio/mpeg', audioBase64: out.toString('base64'), bytes: out.length };
}

// ─── Pricing (approx public rates, used for budget guards) ───────────

function estimateTtsCost(chars) {
  // ~$0.30 / 1k chars on Creator-ish tiers.
  return (chars / 1000) * 0.3;
}

function estimateSttCost(seconds) {
  // ~$0.02 / minute for Scribe-ish usage.
  return (seconds / 60) * 0.02;
}

function estimateElevenLabsCost(kind, units) {
  if (kind === 'tts-chars') return estimateTtsCost(units);
  if (kind === 'stt-seconds') return estimateSttCost(units);
  try {
    return _calcCost('elevenlabs-audio', kind === 'tts-chars' ? units * 4 : units * 100, 0, false);
  } catch (_) {
    return 0;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────

function clamp(n, lo, hi) {
  const v = Number(n);
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function formatToUint8(buffer) {
  const u8 = new Uint8Array(buffer.length);
  u8.set(buffer);
  return u8;
}

function toAudioBuffer(input) {
  if (!input) return null;
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // data: URL
    const dataUrl = trimmed.match(/^data:audio\/\w+;base64,(.+)$/);
    if (dataUrl) return Buffer.from(dataUrl[1], 'base64');
    // raw base64 (heuristic: long + base64 alphabet)
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.replace(/\s/g, '').length > 64) {
      try {
        return Buffer.from(trimmed.replace(/\s/g, ''), 'base64');
      } catch (_) { /* fall through to path */ }
    }
    // file path (audio assets only)
    // Security: this input is request-influenced (/api/audio/*). Only files
    // with audio extensions are readable, and only up to 50MB, so the
    // parameter cannot be used as an arbitrary local-file read (e.g. for
    // credential stores) or a memory-exhaustion primitive.
    try {
      const fs = require('fs');
      const path = require('path');
      const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.ogg', '.oga', '.flac', '.m4a', '.aac', '.webm', '.opus', '.mid', '.midi', '.aif', '.aiff']);
      if (fs.existsSync(trimmed)) {
        const stat = fs.statSync(trimmed);
        if (stat.isFile() && stat.size <= 50 * 1024 * 1024 && AUDIO_EXTENSIONS.has(path.extname(trimmed).toLowerCase())) {
          return fs.readFileSync(trimmed);
        }
      }
    } catch (_) {}
    return null;
  }
  if (input && input.audioBase64) return toAudioBuffer(input.audioBase64);
  return null;
}

module.exports = {
  ELEVENLABS_BASE,
  DEFAULTS,
  resolveElevenLabsKey,
  hasElevenLabsKey,
  listVoices,
  textToSpeech,
  speechToText,
  generateSoundEffect,
  composeMusic,
  isolateVocals,
  estimateTtsCost,
  estimateSttCost,
  estimateElevenLabsCost,
};
