let audioCtx = null;
let isAudioEnabled = false;

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

module.exports = {
  playSynth,
  getAudioEnabled,
  setAudioEnabled,
  playAgentActionSound,
  playBugAlertSound,
  playClickSound
};
