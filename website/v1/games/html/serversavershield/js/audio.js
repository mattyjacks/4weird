// Audio System
var audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    switch(type) {
        case 'shoot': osc.type = 'square'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.1); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); break;
        case 'hit': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08); osc.start(now); osc.stop(now + 0.08); break;
        case 'die': osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
        case 'powerup': osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.15); osc.start(now); osc.stop(now + 0.15); break;
        case 'nuke': osc.type = 'square'; osc.frequency.setValueAtTime(400, now); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.5); osc.start(now); osc.stop(now + 0.5); break;
        case 'damage': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2); break;
    }
}
