let audioCtx = null;
let isAudioEnabled = false;
// Mono (default single stream) | stereo (L/R + differences surfaced by QA).
let channelMode = 'mono';
let lastElevenLabsClip = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSynth(frequency, type, duration) {
  if (!isAudioEnabled) return;
  try {
    initAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    if (type === 'sine') {
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.6, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.warn("Synth playback failed:", err);
  }
}

function getAudioEnabled() {
  return isAudioEnabled;
}

function setAudioEnabled(val) {
  isAudioEnabled = val;
}

function playAgentActionSound() { playSynth(260, 'triangle', 0.12); }
function playBugAlertSound() { playSynth(160, 'sawtooth', 0.35); }
function playClickSound() { playSynth(880, 'sine', 0.08); }

function getChannelMode() { return channelMode; }
function setChannelMode(mode) {
  if (mode === 'mono' || mode === 'stereo') channelMode = mode;
  return channelMode;
}

// Renderer-side ElevenLabs clip playback (base64 mp3 from /api/audio/tts).
// Falls back to the synth blip when Audio is unavailable (headless/tests).
function playElevenLabsClip(audioBase64, mimeType) {
  lastElevenLabsClip = audioBase64 || null;
  if (!isAudioEnabled || !audioBase64) return false;
  try {
    if (typeof Audio === 'undefined') { playClickSound(); return true; }
    const audio = new Audio('data:' + (mimeType || 'audio/mpeg') + ';base64,' + audioBase64);
    audio.play().catch(function () {});
    return true;
  } catch (err) {
    console.warn("ElevenLabs playback failed, synth fallback:", err);
    playClickSound();
    return false;
  }
}

function getLastElevenLabsClip() { return lastElevenLabsClip; }

module.exports = {
  playSynth,
  getAudioEnabled,
  setAudioEnabled,
  playAgentActionSound,
  playBugAlertSound,
  playClickSound,
  getChannelMode,
  setChannelMode,
  playElevenLabsClip,
  getLastElevenLabsClip
};
