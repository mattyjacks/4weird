/**
 * Orbital Drift - Enhanced Premium Edition v2
 * Built with Three.js r128
 * Upgrades: combo chains, risk zones, phases, new enemies/powerups,
 * near-miss grazes, juice (popups/flash/shake/FOV), pooled particles,
 * delta-time motion, safe audio/storage, auto-pause, bot API.
 */

// ---------- Safe storage ----------
const store = {
    get(k, f = '0') { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

// Sound Synthesizer Class using Web Audio API
class SoundFX {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.muted = store.get('orbitaldrift_muted', '0') === '1';
        this.volume = parseFloat(store.get('orbitaldrift_volume', '0.8')) || 0.8;
        this.thrustOsc = null;
        this.thrustGain = null;
        this.musicInterval = null;
        this.musicTick = 0;
        this.tempo = 140;
        this.scale = [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63];
        this.dangerTimer = 0;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            return true;
        }
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            this.ctx = new AC();
            const g = this.ctx.createGain();
            g.gain.value = this.muted ? 0 : this.volume;
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -18; comp.ratio.value = 8;
            g.connect(comp); comp.connect(this.ctx.destination);
            this.master = g;
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            return true;
        } catch { this.ctx = null; return false; }
    }

    out() { return this.master || (this.ctx && this.ctx.destination); }

    setVolume(v) {
        this.volume = v;
        store.set('orbitaldrift_volume', String(v));
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.03);
    }

    toggleMute() {
        this.muted = !this.muted;
        store.set('orbitaldrift_muted', this.muted ? '1' : '0');
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
        return this.muted;
    }

    startMusic() {
        if (!this.init()) return;
        if (this.musicInterval) return;
        const noteLength = 60 / this.tempo / 2;
        this.musicInterval = setInterval(() => {
            if (this.muted || !gameActive || isPaused) return;
            this.playBeatStep();
        }, noteLength * 1000);
    }

    stopMusic() {
        if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
    }

    setTempo(bpm) {
        if (bpm === this.tempo) return;
        this.tempo = bpm;
        if (this.musicInterval) { this.stopMusic(); this.startMusic(); }
    }

    playBeatStep() {
        if (!this.ctx || !this.out()) return;
        const now = this.ctx.currentTime;
        const tick = this.musicTick % 16;
        let noteIndex = 0;
        if (tick < 4) noteIndex = 0;
        else if (tick < 8) noteIndex = 2;
        else if (tick < 12) noteIndex = 4;
        else noteIndex = 6;
        if (tick % 4 === 0 || tick % 4 === 2 || (tick % 4 === 3 && Math.random() > 0.5)) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const freq = this.scale[noteIndex] / 2;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now); osc.stop(now + 0.2);
        }
        if (tick % 8 === 3 && Math.random() > 0.3) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const melodyNote = this.scale[Math.floor(Math.random() * this.scale.length)];
            osc.type = 'sine';
            osc.frequency.setValueAtTime(melodyNote, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now); osc.stop(now + 0.4);
        }
        this.musicTick++;
    }

    playCollect(chain = 0) {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const step = Math.min(12, Math.floor(chain * 0.6));
        const base = 523.25 * Math.pow(2, step / 12);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 2, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.out());
        osc.start(now); osc.stop(now + 0.15);
    }

    playComboLost() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.out());
        osc.start(now); osc.stop(now + 0.15);
    }

    playNearMiss() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(this.out());
        osc.start(now); osc.stop(now + 0.08);
    }

    playPhaseUp() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.09, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.25);
        });
    }

    playPowerUp() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.1, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now + idx * 0.05); osc.stop(now + idx * 0.05 + 0.25);
        });
    }

    playHit() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.4);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(90, now);
        osc2.frequency.linearRampToValueAtTime(10, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain); osc2.connect(gain); gain.connect(this.out());
        osc.start(now); osc2.start(now);
        osc.stop(now + 0.4); osc2.stop(now + 0.4);
        // noise burst layer
        try {
            const len = Math.floor(this.ctx.sampleRate * 0.2);
            const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = this.ctx.createBufferSource(); src.buffer = buf;
            const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
            f.frequency.setValueAtTime(3000, now);
            f.frequency.exponentialRampToValueAtTime(200, now + 0.2);
            const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.25, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            src.connect(f); f.connect(ng); ng.connect(this.out());
            src.start(now);
        } catch {}
    }

    playShieldBlock() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        [1200, 1800].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now); osc.stop(now + 0.25);
        });
    }

    playThrust(active) {
        if (this.muted || !active) { this.stopThrust(); return; }
        if (!this.init() || !this.ctx) return;
        if (this.thrustOsc) return;
        const now = this.ctx.currentTime;
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustGain = this.ctx.createGain();
        this.thrustOsc.type = 'triangle';
        this.thrustOsc.frequency.setValueAtTime(80, now);
        this.thrustGain.gain.setValueAtTime(0.06, now);
        this.thrustOsc.connect(this.thrustGain);
        this.thrustGain.connect(this.out());
        this.thrustOsc.start(now);
    }

    stopThrust() {
        if (this.thrustOsc) {
            try { this.thrustOsc.stop(); } catch {}
            try { this.thrustOsc.disconnect(); } catch {}
            try { this.thrustGain && this.thrustGain.disconnect(); } catch {}
            this.thrustOsc = null; this.thrustGain = null;
        }
    }

    updateThrustFreq(radiusRatio) {
        if (this.thrustOsc && !this.muted && this.ctx) {
            const freq = 60 + (radiusRatio * 90);
            this.thrustOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
        }
    }

    updateDangerLoop(integrity) {
        if (!this.ctx || this.muted || !gameActive || isPaused) return;
        const now = performance.now();
        if (integrity <= maxIntegrity * 0.3 && now - this.dangerTimer > 900) {
            this.dangerTimer = now;
            const t = this.ctx.currentTime;
            [880, 660].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t + i * 0.12);
                gain.gain.setValueAtTime(0.045, t + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.1);
                osc.connect(gain); gain.connect(this.out());
                osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.1);
            });
        }
    }

    playStart() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.08, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.3);
        });
    }
}

const sfx = new SoundFX();

// Game State Variables
let scene, camera, renderer, container;
let planet, planetUniforms, atmoMat, rings, satellite, forcefield, magnetRing, orbits = [];
let collectibles = [], debris = [], powerups = [];
let particles = [], particlePool = [], shockwaves = [], nebulas = [], starLayers = [];
let gameActive = false;
let isPaused = false;
let overFired = false;
let score = 0;
let multiplier = 1.0;
let comboChain = 0, comboTimer = 0, comboDrainAcc = 0;
const COMBO_WINDOW = 3.0, COMBO_MAX = 8.0;
const comboMult = () => Math.min(1.0 + comboChain * 0.1, COMBO_MAX);
let integrity = 100;
let orbitRadius = 100;
let targetRadius = 100;
let satelliteAngle = 0;
let thrustActive = false;
let highScore = 0;
let bestCombo = 0, bestTime = 0;
let stardustCount = 0, basePoints = 0, maxMultiplier = 1.0, nearMissCount = 0;
let hitsThisLap = 0, angleAccum = 0;

let spawnTimerDebris = 0;
let spawnTimerStardust = 0;
let spawnTimerPowerup = 0;
let timeElapsed = 0;
let elapsedSec = 0;
let phase = 1;
let surgeActive = false, surgeT = 0, surgeCooldown = 25;
let screenShake = 0;
let shakeEnabled = store.get('orbitaldrift_shake', '1') !== '0';
if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && store.get('orbitaldrift_shake', '') === '') shakeEnabled = false;

let magnetActive = false, magnetDuration = 0;
let shieldActive = false, shieldDuration = 0;
let overdriveActive = false, overdriveDuration = 0;
let cloakActive = false, cloakDuration = 0;
let chronoActive = false, chronoDuration = 0;
let timeScale = 1, dying = false, dyingT = 0;
let trailAcc = 0, bleedAcc = 0, dangerAcc = 0;
let popupPool = [];
let tutorialCycles = 0, tutorialHidden = false, lastThrust = false;
let lastFlight = null;
let beamMat = null;
const _v1 = { x: 0, y: 0 };

const MIN_RADIUS = 50;
const MAX_RADIUS = 180;
const PLANET_RADIUS = 35;
const SAT_BASE_SPEED = 0.045;
const GRAZE_MIN = 9, GRAZE_MAX = 22;

// ---------- Flyable ship classes ----------
const SHIPS = {
    cubesat: { id: 'cubesat', name: 'CubeSat', emoji: '📦', maxIntegrity: 75, thrustOut: 6.0, thrustIn: 5.2, agility: 0.22, hitMod: -2, pickupR: 8, grazeMod: 2, magnetMod: -8, scoreMult: 1.25, trail: 0xfacc15 },
    dart: { id: 'dart', name: 'Dart', emoji: '🛸', maxIntegrity: 100, thrustOut: 4.5, thrustIn: 4.0, agility: 0.16, hitMod: 0, pickupR: 8, grazeMod: 0, magnetMod: 0, scoreMult: 1.0, trail: 0x06b6d4 },
    station: { id: 'station', name: 'Harbour Station', emoji: '🛰️', maxIntegrity: 150, thrustOut: 3.2, thrustIn: 2.8, agility: 0.11, hitMod: 3, pickupR: 11, grazeMod: -2, magnetMod: 10, scoreMult: 0.9, trail: 0x10b981 }
};
let selectedShip = store.get('orbitaldrift_ship', 'dart');
if (!SHIPS[selectedShip]) selectedShip = 'dart';
let maxIntegrity = SHIPS[selectedShip].maxIntegrity;
const ship = () => SHIPS[selectedShip];

// Shared assets (no per-spawn GPU uploads)
const Assets = {};
const matCache = new Map();
function basicMat(color, opacity = 1) {
    const k = color + '|' + opacity;
    if (!matCache.has(k)) {
        matCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    }
    return matCache.get(k);
}
function acquireParticle(color, size, opacity = 1) {
    let p = particlePool.pop();
    if (!p) p = { mesh: new THREE.Mesh(Assets.box, basicMat(color, opacity)), vel: new THREE.Vector3() };
    p.mesh.material = basicMat(color, opacity);
    p.mesh.scale.set(size, size, size);
    p.mesh.visible = true;
    p.mesh.userData.noScale = false;
    return p;
}

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    initUI();
    Promise.resolve(window.__threeReady).then(() => {
        if (typeof THREE === 'undefined') return showFatal('3D library failed to load. Check your connection and reload.');
        try { initThree(); } catch (e) { showFatal('WebGL unavailable: ' + (e && e.message ? e.message : e)); return; }
        applyMuteUI();
        animate();
    }).catch(() => showFatal('3D library failed to load. Check your connection and reload.'));
});

function showFatal(msg) {
    const c = document.getElementById('game-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'fatal-overlay';
    el.textContent = msg;
    c.appendChild(el);
}

function $(id) { return document.getElementById(id); }

function initUI() {
    highScore = parseInt(store.get('orbitaldrift_high_score', '0') || '0', 10) || 0;
    bestCombo = parseFloat(store.get('orbitaldrift_best_combo', '1') || '1') || 1;
    bestTime = parseFloat(store.get('orbitaldrift_best_time', '0') || '0') || 0;
    const hs = $('TEMPLATE-4weird-high-score');
    if (hs) hs.textContent = highScore + (bestTime > 0 ? '  ·  best ' + bestTime.toFixed(1) + 's · ×' + bestCombo.toFixed(1) : '');

    const startBtn = $('TEMPLATE-4weird-start-btn');
    const playAgainBtn = $('TEMPLATE-4weird-play-again-btn');
    const resumeBtn = $('TEMPLATE-4weird-resume-btn');
    const restartBtn = $('TEMPLATE-4weird-restart-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    const hangarBtn = $('TEMPLATE-4weird-hangar-btn');
    const quitBtn = $('TEMPLATE-4weird-quit-btn');
    if (hangarBtn) hangarBtn.addEventListener('click', () => showHangar('score'));
    if (quitBtn) quitBtn.addEventListener('click', () => showHangar('pause'));
    updateHangarSummary();

    document.querySelectorAll('.TEMPLATE-4weird-ship-card').forEach((el) => {
        el.addEventListener('click', () => { sfx.init(); applyShipSelection(el.dataset.ship, true); });
    });
    applyShipSelection(selectedShip, false);

    const muteBtn = $('TEMPLATE-4weird-mute-btn');
    const pauseBtn = $('TEMPLATE-4weird-pause-btn');
    if (muteBtn) muteBtn.addEventListener('click', (e) => { e.stopPropagation(); sfx.init(); const m = sfx.toggleMute(); applyMuteUI(); });
    if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); if (gameActive) togglePause(); });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', () => sfx.init(), { once: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameActive && !isPaused) togglePause();
    });
    window.addEventListener('blur', () => { if (gameActive && !isPaused) togglePause(); });

    container = $('game-container');
    const canvas = $('TEMPLATE-4weird-gameCanvas');
    const pressOn = (e) => { if (gameActive && !isPaused) { sfx.init(); setThrust(true); } };
    const pressOff = () => setThrust(false);
    if (container) {
        container.addEventListener('mousedown', pressOn);
        window.addEventListener('mouseup', pressOff);
        container.addEventListener('touchstart', (e) => { if (gameActive && !isPaused) { e.preventDefault(); sfx.init(); setThrust(true); } }, { passive: false });
        container.addEventListener('touchend', (e) => { e.preventDefault(); setThrust(false); }, { passive: false });
        container.addEventListener('touchcancel', (e) => { e.preventDefault(); setThrust(false); }, { passive: false });
    } else if (canvas) {
        canvas.addEventListener('mousedown', pressOn);
        canvas.addEventListener('mouseup', pressOff);
    }
    if (canvas) canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function applyMuteUI() {
    const b = $('TEMPLATE-4weird-mute-btn');
    if (!b) return;
    b.textContent = sfx.muted ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', sfx.muted ? 'true' : 'false');
}

function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameActive && !isPaused) { sfx.init(); setThrust(true); }
    }
    if (e.code === 'KeyM') { sfx.init(); sfx.toggleMute(); applyMuteUI(); }
    if (e.code === 'KeyH' && (!gameActive || isPaused)) showHangar('key');
    if (!gameActive) {
        if (e.code === 'Digit1') applyShipSelection('cubesat', true);
        if (e.code === 'Digit2') applyShipSelection('dart', true);
        if (e.code === 'Digit3') applyShipSelection('station', true);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) togglePause();
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space') setThrust(false);
}

function setThrust(active) {
    if (active && !thrustActive && gameActive && !isPaused) {
        tutorialCycles += (lastThrust === false ? 0.5 : 0);
    }
    if (!active && thrustActive) tutorialCycles += 0.5;
    lastThrust = thrustActive = active;
    if (active) sfx.playThrust(true); else sfx.stopThrust();
}

function initThree() {
    const canvas = $('TEMPLATE-4weird-gameCanvas');
    container = container || $('game-container');
    const w = container.clientWidth || canvas.getBoundingClientRect().width || 800;
    const h = container.clientHeight || canvas.getBoundingClientRect().height || 600;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.0015);

    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1500);
    camera.position.set(0, -230, 220);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const isMobile = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(w, h, false);

    const ambientLight = new THREE.AmbientLight(0x0a0a23, 1.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x00ffff, 2.5);
    dirLight.position.set(60, -120, 150);
    scene.add(dirLight);
    const planetPoint = new THREE.PointLight(0xa78bfa, 3, 250);
    planetPoint.position.set(0, 0, 10);
    scene.add(planetPoint);

    // Shared geometries
    Assets.box = new THREE.BoxGeometry(1, 1, 1);
    Assets.stardustGeo = new THREE.OctahedronGeometry(2.5, 0);
    Assets.stardustMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    Assets.asteroidGeo = new THREE.DodecahedronGeometry(4, 0);
    Assets.cometGeo = new THREE.ConeGeometry(2, 6, 4);
    Assets.cometGeo.rotateX(Math.PI / 2);
    Assets.stalkerGeo = new THREE.OctahedronGeometry(3.2, 0);
    Assets.weaverGeo = new THREE.DodecahedronGeometry(3.4, 0);
    Assets.darterGeo = new THREE.ConeGeometry(1.8, 8, 5);
    Assets.darterGeo.rotateX(Math.PI / 2);
    Assets.shardGeo = new THREE.TetrahedronGeometry(2, 0);
    Assets.orbGeo = new THREE.SphereGeometry(3, 10, 10);
    Assets.prismGeo = new THREE.ConeGeometry(3, 6, 3);
    Assets.torusGeo = new THREE.TorusGeometry(3, 1.1, 8, 16);
    Assets.icoGeo = new THREE.IcosahedronGeometry(3, 0);
    beamMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

    // Starfield: 3 parallax layers (cheap PointsMaterial, additive)
    makeStarLayer(180, 4.5, 0x8b9bff, 0.9, -140, 700, 0.0011);
    makeStarLayer(260, 3.0, 0xffffff, 0.7, -220, 650, 0.0005);
    makeStarLayer(320, 2.0, 0xffc9ec, 0.55, -300, 600, 0.0002);

    // Nebula sprites
    addNebula('rgba(139,92,246,0.55)', 'rgba(76,29,149,0.25)', -160, 90, -320, 380, 0.5, 0.004);
    addNebula('rgba(6,182,212,0.5)', 'rgba(8,51,68,0.25)', 190, -70, -340, 420, 0.45, -0.003);
    addNebula('rgba(236,72,153,0.4)', 'rgba(80,7,36,0.2)', 20, 180, -360, 460, 0.35, 0.002);

    // Central Planet (banded shader, WebGL1-safe)
    planetUniforms = {
        uTime: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.5, -0.7, 0.8).normalize() },
        uDeep: { value: new THREE.Color(0x0b0026) },
        uBandA: { value: new THREE.Color(0x4c1d95) },
        uBandB: { value: new THREE.Color(0x0ea5e9) },
        uCity: { value: new THREE.Color(0xfacc15) }
    };
    let planetMat;
    try {
        planetMat = new THREE.ShaderMaterial({
            uniforms: planetUniforms,
            vertexShader: 'varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
            fragmentShader: [
                'precision mediump float;', 'varying vec3 vN; varying vec3 vW; varying vec2 vUv;',
                'uniform float uTime; uniform vec3 uLightDir; uniform vec3 uDeep; uniform vec3 uBandA; uniform vec3 uBandB; uniform vec3 uCity;',
                'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
                'float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }',
                'void main(){',
                '  float lat = vUv.y * 6.2831;',
                '  float bands = 0.5 + 0.5*sin(lat*5.0 + noise(vUv*6.0 + vec2(uTime*0.05,0.0))*2.2);',
                '  float clouds = smoothstep(0.45,0.85, noise(vUv*vec2(8.0,14.0) + vec2(uTime*0.03, uTime*0.008)));',
                '  vec3 base = mix(uDeep, uBandA, bands*0.7);',
                '  base = mix(base, uBandB, clouds*0.45);',
                '  float ndl = dot(normalize(vN), normalize(uLightDir));',
                '  float day = smoothstep(-0.25, 0.45, ndl);',
                '  float term = smoothstep(-0.05,0.25,ndl)*(1.0-smoothstep(0.25,0.7,ndl));',
                '  base += vec3(1.0,0.45,0.15)*term*0.35;',
                '  float night = 1.0 - smoothstep(-0.35, 0.1, ndl);',
                '  float cities = step(0.985, hash(floor(vUv*220.0))) * night;',
                '  base += uCity * cities * 0.9;',
                '  vec3 V = normalize(cameraPosition - vW);',
                '  float rim = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.5);',
                '  base += vec3(0.45,0.3,1.0)*rim*(0.35+0.65*day);',
                '  base *= (0.25 + 0.95*day);',
                '  gl_FragColor = vec4(base, 1.0);', '}'
            ].join('\n')
        });
    } catch { planetMat = new THREE.MeshPhongMaterial({ color: 0x070014, emissive: 0x1d0047, shininess: 90, flatShading: true }); }
    planet = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS, 48, 48), planetMat);
    scene.add(planet);

    try {
        atmoMat = new THREE.ShaderMaterial({
            uniforms: { uIntensity: { value: 1.0 } },
            vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(normalMatrix*normal); vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }',
            fragmentShader: 'precision mediump float; varying vec3 vN; varying vec3 vW; uniform float uIntensity; void main(){ vec3 V=normalize(cameraPosition-vW); float rim=pow(1.0-abs(dot(normalize(vN),V)),3.0); vec3 c=mix(vec3(0.35,0.2,1.0),vec3(0.1,0.9,1.0),rim); gl_FragColor=vec4(c*rim*1.6*uIntensity, rim*uIntensity); }',
            transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
        });
        const atmo = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 1.12, 48, 48), atmoMat);
        atmo.userData.isAtmo = true;
        scene.add(atmo);
    } catch { atmoMat = null; }

    // Saturn-style rings with stripe texture
    const ringMat = new THREE.MeshPhongMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, side: THREE.DoubleSide, transparent: true, opacity: 0.85, shininess: 50 });
    try { ringMat.map = makeRingTexture(); ringMat.needsUpdate = true; } catch {}
    rings = new THREE.Mesh(new THREE.RingGeometry(PLANET_RADIUS + 6, PLANET_RADIUS + 12, 64), ringMat);
    rings.rotation.x = Math.PI / 6;
    rings.rotation.y = Math.PI / 10;
    scene.add(rings);

    createOrbitTrack(62.5, 0xf59e0b, 0.28);   // inner burn zone edge glow
    createOrbitTrack(100, 0x0284c7, 0.2);
    createOrbitTrack(140, 0x0f766e, 0.2);
    createOrbitTrack(167.5, 0xa78bfa, 0.22);  // outer void zone edge glow

    // Satellite (Player Ship) - rebuilt per selected class
    satellite = buildSatelliteMesh(selectedShip);
    satellite.position.set(MIN_RADIUS, 0, 0);
    scene.add(satellite);

    magnetRing = new THREE.Mesh(
        new THREE.RingGeometry(49, 50.5, 72),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(magnetRing);

    fitToContainer();
    if (window.ResizeObserver && container) new ResizeObserver(fitToContainer).observe(container);
    window.addEventListener('resize', fitToContainer);
}

function makeRingTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 8;
    const g = c.getContext('2d'); g.clearRect(0, 0, 256, 8);
    for (let i = 0; i < 256; i++) {
        const a = Math.random();
        g.fillStyle = 'rgba(200,170,255,' + (0.05 + a * 0.5).toFixed(2) + ')';
        g.fillRect(i, 0, 1, 8);
    }
    g.clearRect(60, 0, 8, 8); g.clearRect(180, 0, 14, 8);
    return new THREE.CanvasTexture(c);
}

function makeNebulaTexture(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, inner); grd.addColorStop(0.4, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}

function addNebula(inner, outer, x, y, z, scale, opacity, drift) {
    const tex = makeNebulaTexture(inner, outer);
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    m.fog = false;
    const s = new THREE.Sprite(m);
    s.position.set(x, y, z); s.scale.set(scale, scale, 1);
    s.userData.drift = drift;
    scene.add(s); nebulas.push(s);
}

function makeStarLayer(count, size, color, opacity, zBase, spread, speed) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 2] = zBase - Math.random() * 120;
        const v = 0.6 + Math.random() * 0.4;
        col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    mat.fog = false;
    const pts = new THREE.Points(geom, mat);
    pts.userData.speed = speed;
    pts.userData.baseOpacity = opacity;
    scene.add(pts); starLayers.push(pts);
}

function buildSatelliteMesh(shipId) {
    const s = SHIPS[shipId] || SHIPS.dart;
    const g = new THREE.Group();
    if (shipId === 'cubesat') {
        // 1U CubeSat: compact box bus + deployable panels + whip antenna
        const bus = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 4.5, 4.5),
            new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x92400e, shininess: 80 })
        );
        g.add(bus);
        const panelMat = new THREE.MeshPhongMaterial({ color: 0x1d4ed8, emissive: 0x0c4a6e, shininess: 60 });
        [-4.2, 4.2].forEach((x) => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 5.5), panelMat);
            p.position.set(x, 0, 0);
            g.add(p);
        });
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        ant.position.set(0, 3.5, 0);
        g.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        tip.position.set(0, 6, 0);
        g.add(tip);
    } else if (shipId === 'station') {
        // Harbour Station: truss spine + cans + big arrays (ISS-like)
        const truss = new THREE.Mesh(
            new THREE.BoxGeometry(20, 1.2, 1.2),
            new THREE.MeshPhongMaterial({ color: 0x9ca3af, emissive: 0x374151, shininess: 40 })
        );
        g.add(truss);
        const modMat = new THREE.MeshPhongMaterial({ color: 0xe5e7eb, emissive: 0x6b7280, shininess: 50 });
        [-5, 0, 5].forEach((x) => {
            const mod = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5, 10), modMat);
            mod.rotation.z = Math.PI / 2;
            mod.position.set(x, -2.4, 0);
            g.add(mod);
        });
        const cupola = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 10), new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0e7490 }));
        cupola.position.set(0, 2.2, 0);
        g.add(cupola);
        const arrMat = new THREE.MeshPhongMaterial({ color: 0x1e3a8a, emissive: 0x1e40af, shininess: 70 });
        [-12.5, 12.5].forEach((x) => {
            const arr = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4.5), arrMat);
            arr.position.set(x, 1.2, 0);
            g.add(arr);
        });
    } else {
        // Dart: futuristic neon triangular fighter capsule (default)
        const bodyGeom = new THREE.ConeGeometry(4, 10, 4);
        bodyGeom.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0891b2, shininess: 100 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        g.add(body);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(9, 1.8, 0.4), new THREE.MeshPhongMaterial({ color: 0xa78bfa }));
        wing.position.set(0, -2, 0);
        g.add(wing);
        g.userData.bodyMat = bodyMat;
    }
    const fieldR = shipId === 'station' ? 11 : shipId === 'cubesat' ? 6 : 7;
    const fieldMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.0, wireframe: true });
    forcefield = new THREE.Mesh(new THREE.SphereGeometry(fieldR, 16, 16), fieldMat);
    g.add(forcefield);
    g.userData.shipId = shipId;
    g.userData.fieldR = fieldR;
    return g;
}

function applyShipSelection(id, rebuild = true) {
    if (!SHIPS[id]) return;
    selectedShip = id;
    store.set('orbitaldrift_ship', id);
    maxIntegrity = SHIPS[id].maxIntegrity;
    document.querySelectorAll('.TEMPLATE-4weird-ship-card').forEach((el) => {
        const on = el.dataset.ship === id;
        el.classList.toggle('selected', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (rebuild && scene && satellite) {
        const pos = satellite.position.clone();
        const rotZ = satellite.rotation.z;
        scene.remove(satellite);
        satellite = buildSatelliteMesh(id);
        satellite.position.copy(pos);
        satellite.rotation.z = rotZ;
        scene.add(satellite);
    }
    if (!gameActive) { integrity = maxIntegrity; updateShieldUI(); }
}

function createOrbitTrack(radius, color, opacity) {
    const geom = new THREE.RingGeometry(radius - 0.4, radius + 0.4, 64);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity });
    const track = new THREE.Mesh(geom, mat);
    scene.add(track);
    orbits.push(track);
}

function fitToContainer() {
    if (!renderer || !camera || !container) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}

// ---------- HUD helpers ----------
function hudPop(id) {
    const e = $(id);
    if (!e) return;
    e.classList.remove('hud-pop'); void e.offsetWidth; e.classList.add('hud-pop');
}
function fireHitFlash() {
    const f = $('hit-flash');
    if (!f) return;
    f.classList.remove('fire'); void f.offsetWidth; f.classList.add('fire');
}
function scorePopup(worldPos, text, cls) {
    try {
        const v = worldPos.clone().project(camera);
        const rect = container.getBoundingClientRect();
        const x = (v.x * 0.5 + 0.5) * rect.width, y = (-v.y * 0.5 + 0.5) * rect.height;
        const layer = $('popup-layer');
        if (!layer) return;
        const el = popupPool.pop() || document.createElement('div');
        el.className = 'score-popup ' + (cls || '');
        el.textContent = text;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        void el.offsetWidth; el.classList.add('rise');
        setTimeout(() => { el.classList.remove('rise'); if (el.parentNode) el.parentNode.removeChild(el); popupPool.push(el); }, 900);
    } catch {}
}
function showWaveBanner(title, sub) {
    const b = $('TEMPLATE-4weird-wave-banner');
    if (!b) return;
    $('TEMPLATE-4weird-wave-title').textContent = title;
    $('TEMPLATE-4weird-wave-sub').textContent = sub;
    b.classList.remove('hidden');
    const clone = b.cloneNode(true);
    b.parentNode.replaceChild(clone, b);
    void clone.offsetWidth;
    setTimeout(() => clone.classList.add('hidden'), 2400);
}
function updateShieldUI() {
    const bar = $('hud-integrity-bar');
    const num = $('hud-integrity-num');
    const pct = Math.max(0, Math.min(100, (integrity / maxIntegrity) * 100));
    if (bar) {
        bar.style.width = pct + '%';
        bar.classList.toggle('warn', integrity <= maxIntegrity * 0.6 && integrity > maxIntegrity * 0.3);
        bar.classList.toggle('crit', integrity <= maxIntegrity * 0.3);
    }
    if (num) num.textContent = Math.round(integrity) + '/' + maxIntegrity;
    const v = $('vignette');
    if (v) v.classList.toggle('low-hp', gameActive && integrity <= maxIntegrity * 0.3);
    const hs = $('hud-score');
    if (hs) hs.classList.toggle('low-shield', gameActive && integrity <= maxIntegrity * 0.3);
}
function updatePowerupHUD() {
    const pairs = [
        ['TEMPLATE-4weird-powerup-magnet', 'TEMPLATE-4weird-magnet-bar', 'TEMPLATE-4weird-magnet-secs', magnetActive, magnetDuration, 7],
        ['TEMPLATE-4weird-powerup-shield', 'TEMPLATE-4weird-shield-bar', 'TEMPLATE-4weird-shield-secs', shieldActive, shieldDuration, 8]
    ];
    pairs.forEach(([chip, bar, secs, active, dur, max]) => {
        const c = $(chip); if (!c) return;
        c.classList.toggle('hidden', !active);
        if (active) {
            const b = $(bar); if (b) b.style.width = Math.max(0, (dur / max) * 100) + '%';
            const s = $(secs); if (s) s.textContent = dur.toFixed(1) + 's';
        }
    });
    let fxActive = false, fxLabel = '', fxFrac = 0;
    if (overdriveActive) { fxActive = true; fxLabel = '🔥 OVERDRIVE ' + overdriveDuration.toFixed(1) + 's'; fxFrac = overdriveDuration / 10; }
    else if (cloakActive) { fxActive = true; fxLabel = '👻 CLOAK ' + cloakDuration.toFixed(1) + 's'; fxFrac = cloakDuration / 3; }
    else if (chronoActive) { fxActive = true; fxLabel = '⏳ CHRONO ' + chronoDuration.toFixed(1) + 's'; fxFrac = chronoDuration / 5; }
    const fx = $('TEMPLATE-4weird-powerup-fx');
    if (fx) {
        fx.classList.toggle('hidden', !fxActive);
        if (fxActive) {
            $('TEMPLATE-4weird-fx-label').textContent = fxLabel;
            $('TEMPLATE-4weird-fx-bar').style.width = Math.max(0, fxFrac * 100) + '%';
        }
    }
}

// Game State Controls
function startGame() {
    sfx.init(); sfx.playStart(); sfx.startMusic();
    gameActive = true; isPaused = false; overFired = false;
    score = 0; multiplier = 1.0; comboChain = 0; comboTimer = 0; comboDrainAcc = 0;
    maxIntegrity = ship().maxIntegrity;
    integrity = maxIntegrity; orbitRadius = 100; targetRadius = 100; satelliteAngle = 0;
    thrustActive = false; lastThrust = false; tutorialCycles = 0; tutorialHidden = false;
    spawnTimerDebris = 0; spawnTimerStardust = 0; spawnTimerPowerup = 250;
    timeElapsed = 0; elapsedSec = 0; phase = 1; surgeActive = false; surgeT = 0; surgeCooldown = 25;
    screenShake = 0; timeScale = 1; dying = false; dyingT = 0;
    stardustCount = 0; basePoints = 0; maxMultiplier = 1.0; nearMissCount = 0;
    hitsThisLap = 0; angleAccum = 0; trailAcc = 0; bleedAcc = 0;
    magnetActive = false; magnetDuration = 0;
    shieldActive = false; shieldDuration = 0;
    overdriveActive = false; overdriveDuration = 0;
    cloakActive = false; cloakDuration = 0;
    chronoActive = false; chronoDuration = 0;
    if (forcefield) forcefield.material.opacity = 0.0;
    if (satellite) satellite.visible = true;
    // ensure the 3D hull matches the hangar selection (no-op if unchanged)
    if (satellite && satellite.userData.shipId !== selectedShip) applyShipSelection(selectedShip, true);

    collectibles.forEach(c => scene.remove(c.mesh));
    debris.forEach(d => scene.remove(d.mesh));
    powerups.forEach(p => scene.remove(p.mesh));
    particles.forEach(p => { scene.remove(p.mesh); });
    shockwaves.forEach(s => { scene.remove(s.mesh); });
    collectibles = []; debris = []; powerups = [];
    particles = []; shockwaves = [];

    $('hud-score').textContent = '0';
    $('hud-multiplier').textContent = '1.0x';
    const cb = $('hud-combo-bar'); if (cb) cb.style.width = '0%';
    const ct = $('hud-combo-tier'); if (ct) ct.textContent = '';
    updateShieldUI();
    $('game-hud').classList.remove('hidden');
    $('TEMPLATE-4weird-start-screen').classList.add('hidden');
    $('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    $('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    const bb = $('TEMPLATE-4weird-best-badge'); if (bb) bb.classList.add('hidden');

    // tutorial for first-timers / first run of session
    try {
        const seen = sessionStorage.getItem('orbitaldrift_tutorial_done');
        if (!seen) {
            const t = $('TEMPLATE-4weird-tutorial-hint');
            if (t) t.classList.remove('hidden');
        } else tutorialHidden = true;
    } catch { tutorialHidden = true; }
    showWaveBanner('WAVE 1', ship().name + ' - stable drift');
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    const pauseScreen = $('TEMPLATE-4weird-pause-screen');
    if (isPaused) {
        if (pauseScreen) pauseScreen.classList.remove('hidden');
        sfx.stopThrust();
    } else {
        if (pauseScreen) pauseScreen.classList.add('hidden');
        if (thrustActive) sfx.playThrust(true);
    }
}

function resumeGame() {
    isPaused = false;
    $('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    if (thrustActive) sfx.playThrust(true);
}

function restartGame() { startGame(); }

// Persistent hangar: the hub you return to after every death (via the
// score screen) or when quitting from pause. Never auto-launches.
function showHangar(source) {
    gameActive = false;
    isPaused = false;
    thrustActive = false;
    sfx.stopThrust(); sfx.stopMusic();
    $('game-hud').classList.add('hidden');
    $('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    $('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    const t = $('TEMPLATE-4weird-tutorial-hint');
    if (t) t.classList.add('hidden');
    const v = $('vignette'); if (v) v.classList.remove('low-hp');
    integrity = maxIntegrity;
    updateShieldUI();
    updateHangarSummary();
    $('TEMPLATE-4weird-start-screen').classList.remove('hidden');
    const launch = $('TEMPLATE-4weird-start-btn');
    if (launch) launch.focus({ preventScroll: true });
    void source;
}

function updateHangarSummary() {
    updateShipBests();
    const el = $('hangar-last-flight');
    if (!el) return;
    if (lastFlight) {
        el.textContent = 'Last flight - ' + Math.floor(lastFlight.score) + ' pts · ' +
            lastFlight.shipName + ' · ' + lastFlight.time.toFixed(1) + 's · Best ' + highScore;
    } else if (highScore > 0) {
        el.textContent = 'Welcome back, pilot - best ' + highScore + '. Choose your hull.';
    } else {
        el.textContent = 'Choose your hull, pilot.';
    }
}

function updateShipBests() {
    document.querySelectorAll('[data-best]').forEach((el) => {
        const id = el.getAttribute('data-best');
        const best = parseInt(store.get('orbitaldrift_best_' + id, '0') || '0', 10) || 0;
        el.textContent = best > 0 ? 'BEST ' + best : 'BEST -';
    });
}

function gameOver() {
    if (overFired || !gameActive) return;
    overFired = true;
    gameActive = false;
    sfx.stopThrust(); sfx.stopMusic();
    $('game-hud').classList.add('hidden');
    $('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    $('TEMPLATE-4weird-final-score-val').textContent = Math.floor(score);
    $('TEMPLATE-4weird-stat-dust').textContent = stardustCount;
    $('TEMPLATE-4weird-stat-base').textContent = Math.floor(basePoints);
    $('TEMPLATE-4weird-stat-bonus').textContent = '+' + Math.max(0, Math.floor(score - basePoints));
    $('TEMPLATE-4weird-stat-maxmult').textContent = maxMultiplier.toFixed(1) + 'x';
    $('TEMPLATE-4weird-stat-near').textContent = nearMissCount;
    $('TEMPLATE-4weird-stat-time').textContent = elapsedSec.toFixed(1) + 's';
    $('TEMPLATE-4weird-stat-ship').textContent = ship().name;
    lastFlight = { score, shipName: ship().name, shipId: selectedShip, time: elapsedSec };
    const shipBestKey = 'orbitaldrift_best_' + selectedShip;
    const prevShipBest = parseInt(store.get(shipBestKey, '0') || '0', 10) || 0;
    if (score > prevShipBest) store.set(shipBestKey, String(Math.floor(score)));
    let isBest = false;
    if (score > highScore) { highScore = Math.floor(score); store.set('orbitaldrift_high_score', String(highScore)); isBest = true; }
    if (maxMultiplier > bestCombo) { bestCombo = maxMultiplier; store.set('orbitaldrift_best_combo', String(bestCombo)); }
    if (elapsedSec > bestTime) { bestTime = elapsedSec; store.set('orbitaldrift_best_time', String(bestTime)); }
    const bb = $('TEMPLATE-4weird-best-badge');
    if (bb) bb.classList.toggle('hidden', !isBest);
    const hs = $('TEMPLATE-4weird-high-score');
    if (hs) hs.textContent = highScore;
    const v = $('vignette'); if (v) v.classList.remove('low-hp');
}

function zoneMult(pos) {
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    if (r < 75) return 1.5;
    if (r > 155) return 2.0;
    return 1.0;
}

function phaseMix() {
    if (phase === 1) return { stalker: 0, splitter: 0.08, darter: 0, weaver: 0.08 };
    if (phase === 2) return { stalker: 0.15, splitter: 0.10, darter: 0, weaver: 0.12 };
    if (phase === 3) return { stalker: 0.20, splitter: 0.15, darter: 0.10, weaver: 0.15 };
    return { stalker: 0.25, splitter: 0.20, darter: 0.20, weaver: 0.15 };
}

// Spawners
function pickZoneBiasedRadius() {
    const r = Math.random();
    if (r < 0.25) return 50 + Math.random() * 25;       // inner burn
    if (r < 0.5) return 155 + Math.random() * 25;       // outer void
    return MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
}

function spawnStardust() {
    const radius = pickZoneBiasedRadius();
    const angle = Math.random() * Math.PI * 2;
    const mesh = new THREE.Mesh(Assets.stardustGeo, Assets.stardustMat);
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);
    collectibles.push({ mesh, radius, angle, pulseSpeed: 3 + Math.random() * 3, bornAt: elapsedSec, value: 10 });
}

function spawnDebris() {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    const w = phaseMix();
    const roll = Math.random();
    let kind = 'asteroid';
    if (roll < w.darter) kind = 'darter';
    else if (roll < w.darter + w.stalker) kind = 'stalker';
    else if (roll < w.darter + w.stalker + w.splitter) kind = 'splitter';
    else if (roll < w.darter + w.stalker + w.splitter + w.weaver) kind = 'weaver';
    else kind = Math.random() > 0.7 ? 'comet' : 'asteroid';

    let mesh, speed, damage;
    if (kind === 'stalker') {
        mesh = new THREE.Mesh(Assets.stalkerGeo, new THREE.MeshPhongMaterial({ color: 0xfb923c, emissive: 0x9a3412, flatShading: true }));
        speed = 0.008 + Math.random() * 0.004; damage = 20;
    } else if (kind === 'weaver') {
        mesh = new THREE.Mesh(Assets.weaverGeo, new THREE.MeshPhongMaterial({ color: 0x2dd4bf, emissive: 0x0f766e, flatShading: true }));
        speed = 0.012 + Math.random() * 0.012; damage = 20;
    } else if (kind === 'darter') {
        mesh = new THREE.Mesh(Assets.darterGeo, new THREE.MeshPhongMaterial({ color: 0xe0f2fe, emissive: 0x0284c7 }));
        speed = 0.01 + Math.random() * 0.008; damage = 30;
    } else if (kind === 'splitter') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5, 0), new THREE.MeshPhongMaterial({ color: 0xa855f7, emissive: 0x581c87, flatShading: true }));
        mesh.scale.setScalar(1);
        speed = 0.008; damage = 25;
    } else if (kind === 'comet') {
        mesh = new THREE.Mesh(Assets.cometGeo, new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x0891b2 }));
        speed = (0.035 + Math.random() * 0.025) * (Math.random() > 0.5 ? 1 : -1) * (phase >= 2 ? 1.15 : 1);
        damage = 25;
    } else {
        mesh = new THREE.Mesh(Assets.asteroidGeo, new THREE.MeshPhongMaterial({ color: 0xec4899, emissive: 0x9d174d, flatShading: true }));
        mesh.scale.setScalar(0.85 + Math.random() * 0.5);
        speed = (0.01 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1);
        damage = 25;
    }
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);
    debris.push({
        mesh, radius, angle, speed, kind, damage,
        isComet: kind === 'comet' || kind === 'darter',
        t: 0, baseRadius: radius, phase: Math.random() * Math.PI * 2,
        state: 'drift', stateT: 0, lockedRadius: radius, radialVel: 0,
        lastGraze: -10,
        rotSpeed: { x: Math.random() * 0.04, y: Math.random() * 0.04, z: Math.random() * 0.04 }
    });
}

function spawnShards(pos, n = 3) {
    for (let i = 0; i < n; i++) {
        const angle = Math.atan2(pos.y, pos.x) + (Math.random() - 0.5);
        const radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.sqrt(pos.x * pos.x + pos.y * pos.y)));
        const mesh = new THREE.Mesh(Assets.shardGeo, new THREE.MeshPhongMaterial({ color: 0xc084fc, emissive: 0x6b21a8, flatShading: true }));
        mesh.position.copy(pos);
        scene.add(mesh);
        debris.push({
            mesh, radius, angle,
            speed: (0.03 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
            kind: 'shard', damage: 10, isComet: false, t: 0, baseRadius: radius,
            phase: Math.random() * 6, state: 'drift', stateT: 0, lockedRadius: radius, radialVel: 0,
            lastGraze: -10, bornAt: elapsedSec,
            rotSpeed: { x: 0.05, y: 0.05, z: 0.05 }
        });
    }
}

function spawnPowerup(forceKind) {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    let kind = forceKind;
    if (!kind) {
        const r = Math.random();
        if (r < 0.25) kind = 'magnet';
        else if (r < 0.45) kind = 'shield';
        else if (r < 0.67) kind = 'overdrive';
        else if (r < 0.85) kind = 'cloak';
        else kind = 'chrono';
    }
    let mesh;
    if (kind === 'magnet') mesh = new THREE.Mesh(Assets.prismGeo, new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0891b2, shininess: 100, wireframe: true }));
    else if (kind === 'shield') mesh = new THREE.Mesh(Assets.orbGeo, new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x047857, shininess: 100, wireframe: true }));
    else if (kind === 'overdrive') mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(3.4, 0), new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0xa16207, shininess: 100, wireframe: true }));
    else if (kind === 'cloak') mesh = new THREE.Mesh(Assets.torusGeo, new THREE.MeshPhongMaterial({ color: 0xf8fafc, emissive: 0x64748b, shininess: 100, wireframe: true }));
    else mesh = new THREE.Mesh(Assets.icoGeo, new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, shininess: 100, wireframe: true }));
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);
    powerups.push({ mesh, radius, angle, kind });
}

// Particle System (pooled boxes)
function spawnExplosion(pos, color, count = 15) {
    for (let i = 0; i < count; i++) {
        if (particles.length > 280) {
            const old = particles.shift();
            scene.remove(old.mesh); particlePool.push(old);
        }
        const p = acquireParticle(color, 1.2, 1);
        p.mesh.position.copy(pos);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3.5;
        p.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * speed);
        p.life = 1.0; p.decay = 0.025 + Math.random() * 0.025;
        scene.add(p.mesh);
        particles.push(p);
    }
}

function spawnEngineTrail(pos) {
    if (particles.length > 280) return;
    const color = cloakActive ? 0xf8fafc : (magnetActive ? 0xfacc15 : (overdriveActive ? 0xfb923c : ship().trail));
    const p = acquireParticle(color, 0.8, 0.8);
    const offsetAngle = satelliteAngle + Math.PI;
    p.mesh.position.set(pos.x + Math.cos(offsetAngle) * 4, pos.y + Math.sin(offsetAngle) * 4, pos.z);
    p.vel.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
    p.life = 0.8; p.decay = 0.05;
    scene.add(p.mesh);
    particles.push(p);
}

function showMagnetBeam(from, to) {
    try {
        const len = from.distanceTo(to);
        if (len > 60 || len < 1) return;
        const g = new THREE.CylinderGeometry(0.35, 1.4, len, 6, 1, true);
        g.translate(0, len / 2, 0);
        const m = new THREE.Mesh(g, beamMat);
        m.position.copy(from);
        m.lookAt(to); m.rotateX(Math.PI / 2);
        m.userData.noScale = true;
        scene.add(m);
        particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0.18, decay: 0.18, beam: true });
    } catch {}
}

function spawnShockwave(pos) {
    const m = new THREE.Mesh(
        new THREE.RingGeometry(1, 3, 64),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.position.copy(pos);
    m.userData.noScale = true;
    scene.add(m);
    shockwaves.push({ mesh: m, t: 0 });
}

function startDeath() {
    if (dying) return;
    dying = true; dyingT = 0; timeScale = 0.16;
    sfx.playHit();
    spawnExplosion(satellite.position, 0xffffff, 30);
    spawnExplosion(satellite.position, 0x06b6d4, 30);
    spawnShockwave(satellite.position);
    satellite.visible = false;
    fireHitFlash();
    if (shakeEnabled) screenShake = 26;
}

// Speed scale against tab throttling
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(e.data.speed);
        if (!isNaN(speed) && speed > 0) window.gameSpeedMultiplier = speed;
    }
});

let lastFrameTime = performance.now();

// Main Game Frame Logic
function animate(currentTime = performance.now()) {
    requestAnimationFrame(animate);
    if (!renderer || !scene) return;
    const rawDelta = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    const delta = Math.min(rawDelta, 0.05);
    const dt60 = delta * 60;
    const extSpeed = window.gameSpeedMultiplier || 1;

    starLayers.forEach((s) => { s.rotation.z += s.userData.speed * dt60; });
    nebulas.forEach((n) => {
        n.position.x += n.userData.drift * dt60;
        if (n.position.x > 320) n.position.x = -320;
        if (n.position.x < -320) n.position.x = 320;
    });
    if (planetUniforms) planetUniforms.uTime.value += delta;
    if (atmoMat) atmoMat.uniforms.uIntensity.value += (1.0 - atmoMat.uniforms.uIntensity.value) * 0.06 * dt60;

    if (gameActive && !isPaused) {
        if (dying) {
            dyingT += rawDelta;
            timeScale += (1 - timeScale) * 0.02 * dt60;
            if (dyingT > 1.5) { dying = false; timeScale = 1; gameOver(); }
        } else {
            timeElapsed++;
            elapsedSec += delta;

            // phases
            const newPhase = elapsedSec < 45 ? 1 : elapsedSec < 100 ? 2 : elapsedSec < 180 ? 3 : 4;
            if (newPhase !== phase) {
                phase = newPhase;
                const names = { 1: 'stable drift', 2: 'debris shower', 3: 'hunter orbit', 4: 'solar storm' };
                showWaveBanner('WAVE ' + phase, names[phase] || '');
                sfx.playPhaseUp();
                score += 150 * phase;
                integrity = Math.min(maxIntegrity, integrity + 25);
                updateShieldUI();
                $('hud-score').textContent = Math.floor(score);
            }
            // surge every ~30s in phase 4
            surgeCooldown -= delta;
            if (phase === 4 && surgeCooldown <= 0 && !surgeActive) {
                surgeActive = true; surgeT = 5;
                showWaveBanner('⚠ SURGE', 'debris ×2 - stardust worth more');
                sfx.playPhaseUp();
            }
            if (surgeActive) {
                surgeT -= delta;
                if (surgeT <= 0) { surgeActive = false; surgeCooldown = 25; }
            }
            sfx.setTempo(elapsedSec < 40 ? 132 : elapsedSec < 100 ? 148 : 162);

            planet.rotation.y += 0.006 * dt60;
            planet.rotation.z += 0.003 * dt60;
            if (rings) rings.rotation.z += 0.0006 * dt60;

            const effTimeScale = timeScale * (chronoActive ? 1 : 1);
            void effTimeScale;

            if (thrustActive) targetRadius = Math.min(MAX_RADIUS, targetRadius + ship().thrustOut * dt60);
            else targetRadius = Math.max(MIN_RADIUS, targetRadius - ship().thrustIn * dt60);
            orbitRadius += (targetRadius - orbitRadius) * (1 - Math.pow(1 - ship().agility, dt60));

            const ratio = (orbitRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
            sfx.updateThrustFreq(ratio);

            const tsDebris = chronoActive ? 0.45 : 1;
            const KeplerSpeed = SAT_BASE_SPEED * Math.pow(100 / orbitRadius, 1.45);
            satelliteAngle += KeplerSpeed * dt60 * extSpeed;
            angleAccum += KeplerSpeed * dt60;
            if (angleAccum >= Math.PI * 2) {
                angleAccum = 0;
                if (hitsThisLap === 0) {
                    const bonus = 100 * comboMult() * ship().scoreMult;
                    score += bonus;
                    integrity = Math.min(maxIntegrity, integrity + 10);
                    updateShieldUI();
                    scorePopup(satellite.position, 'FLAWLESS +' + Math.floor(bonus), 'big');
                    sfx.playPhaseUp();
                    $('hud-score').textContent = Math.floor(score);
                }
                hitsThisLap = 0;
            }

            const satX = Math.cos(satelliteAngle) * orbitRadius;
            const satY = Math.sin(satelliteAngle) * orbitRadius;
            satellite.position.set(satX, satY, 0);

            const radiusDiff = targetRadius - orbitRadius;
            satellite.rotation.z = satelliteAngle + Math.PI / 2;
            satellite.rotation.y = THREE.MathUtils.clamp(radiusDiff * 0.06, -0.6, 0.6);

            // FOV kick with speed
            const targetFov = 55 + ratio * 6 + (thrustActive ? 3 : 0);
            if (Math.abs(camera.fov - targetFov) > 0.05) {
                camera.fov += (targetFov - camera.fov) * 0.08 * dt60;
                camera.updateProjectionMatrix();
            }

            trailAcc += delta;
            if (trailAcc > 1 / 30) { trailAcc = 0; spawnEngineTrail(satellite.position); }

            // tutorial hide
            if (!tutorialHidden) {
                if (elapsedSec > 6 || tutorialCycles >= 3) {
                    tutorialHidden = true;
                    const t = $('TEMPLATE-4weird-tutorial-hint');
                    if (t) t.classList.add('hidden');
                    try { sessionStorage.setItem('orbitaldrift_tutorial_done', '1'); } catch {}
                }
            }

            // powerup timers (delta-based)
            if (magnetActive) { magnetDuration -= delta; if (magnetDuration <= 0) magnetActive = false; }
            if (shieldActive) {
                shieldDuration -= delta;
                forcefield.material.opacity = Math.max(0, Math.min(0.5, shieldDuration * 0.5));
                if (shieldDuration <= 0) shieldActive = false;
            }
            if (overdriveActive) { overdriveDuration -= delta; if (overdriveDuration <= 0) overdriveActive = false; }
            if (cloakActive) { cloakDuration -= delta; if (cloakDuration <= 0) cloakActive = false; }
            if (chronoActive) { chronoDuration -= delta; if (chronoDuration <= 0) chronoActive = false; }
            if (magnetRing) {
                magnetRing.position.copy(satellite.position);
                const target = magnetActive ? 0.4 : 0;
                magnetRing.material.opacity += (target - magnetRing.material.opacity) * 0.12 * dt60;
            }
            updatePowerupHUD();

            // combo drain
            if (comboChain > 0) {
                const win = overdriveActive ? COMBO_WINDOW + 1.5 : COMBO_WINDOW;
                comboTimer -= delta;
                const cb = $('hud-combo-bar');
                if (cb) cb.style.width = Math.max(0, (comboTimer / win) * 100) + '%';
                if (comboTimer <= 0) {
                    comboDrainAcc += delta;
                    if (comboDrainAcc >= 0.25) { comboDrainAcc = 0; comboChain--; updateMultiplierUI(); }
                    if (comboChain <= 0) { comboChain = 0; if (cb) cb.style.width = '0%'; }
                }
            }

            // spawn intervals by phase
            const intervals = phase === 1 ? [80, 90] : phase === 2 ? [55, 70] : phase === 3 ? [40, 60] : [28, 55];
            spawnTimerStardust += dt60;
            if (spawnTimerStardust > intervals[1] / (surgeActive ? 0.7 : 1)) { spawnStardust(); spawnTimerStardust = 0; }
            spawnTimerDebris += dt60;
            if (spawnTimerDebris > Math.max(22, intervals[0] / (surgeActive ? 0.5 : 1))) { spawnDebris(); if (surgeActive && Math.random() > 0.4) spawnDebris(); spawnTimerDebris = 0; }
            spawnTimerPowerup += dt60;
            if (spawnTimerPowerup > 350 + Math.random() * 300) { spawnPowerup(); spawnTimerPowerup = 0; }

            // stardust
            for (let i = collectibles.length - 1; i >= 0; i--) {
                const item = collectibles[i];
                item.mesh.rotation.y += 0.02 * dt60;
                item.mesh.rotation.z += 0.03 * dt60;
                const pulse = 1 + Math.sin(elapsedSec * 3 * item.pulseSpeed * 0.3) * 0.18;
                item.mesh.scale.set(pulse, pulse, pulse);
                if (elapsedSec - item.bornAt > 20) { scene.remove(item.mesh); collectibles.splice(i, 1); continue; }
                if (magnetActive) {
                    const dx = satellite.position.x - item.mesh.position.x;
                    const dy = satellite.position.y - item.mesh.position.y;
                    const distToSat = Math.sqrt(dx * dx + dy * dy);
                    const pullR = 50 + ship().magnetMod;
                    if (distToSat < pullR && distToSat > 0.01) {
                        item.mesh.position.x += (dx / distToSat) * 3.0 * dt60;
                        item.mesh.position.y += (dy / distToSat) * 3.0 * dt60;
                        if (Math.random() > 0.7) showMagnetBeam(satellite.position, item.mesh.position);
                    }
                }
                const dx2 = satellite.position.x - item.mesh.position.x;
                const dy2 = satellite.position.y - item.mesh.position.y;
                const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                if (dist < ship().pickupR) {
                    comboChain++; comboTimer = overdriveActive ? COMBO_WINDOW + 1.5 : COMBO_WINDOW;
                    sfx.playCollect(comboChain);
                    spawnExplosion(item.mesh.position, 0xfacc15, 12);
                    let val = item.value * comboMult() * zoneMult(item.mesh.position) * ship().scoreMult;
                    if (overdriveActive) val *= 2;
                    if (surgeActive) val *= 1.5;
                    score += val; basePoints += item.value;
                    stardustCount++;
                    maxMultiplier = Math.max(maxMultiplier, comboMult());
                    if (comboChain % 10 === 0) {
                        const sb = 50 * comboMult() * ship().scoreMult; score += sb;
                        scorePopup(item.mesh.position, 'STREAK ×' + comboChain + ' +' + Math.floor(sb), 'big');
                    } else {
                        scorePopup(item.mesh.position, '+' + Math.floor(val), comboMult() >= 3 ? 'big' : '');
                    }
                    updateMultiplierUI();
                    $('hud-score').textContent = Math.floor(score);
                    hudPop('hud-score');
                    scene.remove(item.mesh);
                    collectibles.splice(i, 1);
                    continue;
                }
                if (collectibles.length > 25) { const old = collectibles.shift(); scene.remove(old.mesh); }
            }

            // debris
            const grazeMax = (cloakActive ? GRAZE_MAX * 2 : GRAZE_MAX) + ship().grazeMod;
            for (let i = debris.length - 1; i >= 0; i--) {
                const item = debris[i];
                item.t += delta;
                if (item.kind === 'shard' && item.bornAt !== undefined && elapsedSec - item.bornAt > 12) {
                    scene.remove(item.mesh); debris.splice(i, 1); continue;
                }
                if (item.kind === 'stalker') {
                    item.angle += item.speed * dt60 * tsDebris;
                    const want = THREE.MathUtils.clamp(orbitRadius, MIN_RADIUS, MAX_RADIUS);
                    item.radius += THREE.MathUtils.clamp(want - item.radius, -0.9 * dt60, 0.9 * dt60);
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    item.mesh.material.emissive.setHex(0.5 + 0.5 * Math.sin(elapsedSec * 8) > 0 ? 0x9a3412 : 0x7c2d12);
                } else if (item.kind === 'weaver') {
                    item.angle += item.speed * dt60 * tsDebris;
                    const rr = item.baseRadius + Math.sin(elapsedSec * 2 + item.phase) * 18;
                    item.radius = THREE.MathUtils.clamp(rr, MIN_RADIUS, MAX_RADIUS);
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    item.mesh.rotation.x += item.rotSpeed.x * dt60;
                    item.mesh.rotation.y += item.rotSpeed.y * dt60;
                } else if (item.kind === 'darter') {
                    item.stateT += delta;
                    if (item.state === 'drift' && item.stateT > 1.2) { item.state = 'telegraph'; item.stateT = 0; item.lockedRadius = orbitRadius; }
                    else if (item.state === 'telegraph') {
                        const s = 1 + Math.sin(elapsedSec * 20) * 0.25;
                        item.mesh.scale.set(s, s, s);
                        if (item.stateT > 0.8) { item.state = 'lunge'; item.stateT = 0; item.radialVel = (item.lockedRadius - item.radius) / 45; }
                    } else if (item.state === 'lunge') {
                        item.radius += item.radialVel * dt60 * tsDebris;
                        item.angle += item.speed * dt60 * tsDebris;
                        if (item.stateT > 1.5) { item.state = 'drift'; item.stateT = 0; item.mesh.scale.set(1, 1, 1); }
                    } else {
                        item.angle += item.speed * dt60 * tsDebris;
                    }
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    item.mesh.rotation.z = item.angle + (item.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
                } else {
                    item.angle += item.speed * dt60 * tsDebris;
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    if (item.isComet) {
                        item.mesh.rotation.z = item.angle + (item.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
                        if (Math.random() > 0.85 && particles.length < 250) {
                            const p = acquireParticle(0x00ffff, 0.5, 0.6);
                            p.mesh.position.copy(item.mesh.position);
                            p.vel.set(0, 0, 0); p.life = 0.6; p.decay = 0.08;
                            scene.add(p.mesh); particles.push(p);
                        }
                    } else {
                        item.mesh.rotation.x += item.rotSpeed.x * dt60;
                        item.mesh.rotation.y += item.rotSpeed.y * dt60;
                        item.mesh.rotation.z += item.rotSpeed.z * dt60;
                    }
                }

                const dx = satellite.position.x - item.mesh.position.x;
                const dy = satellite.position.y - item.mesh.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const hitR = (item.kind === 'shard' ? 7 : item.kind === 'darter' ? 10 : 9) + ship().hitMod;
                if (dist < hitR) {
                    if (cloakActive) {
                        spawnExplosion(item.mesh.position, 0xf8fafc, 8);
                        if (item.kind === 'splitter') spawnShards(item.mesh.position, 3);
                        scene.remove(item.mesh); debris.splice(i, 1); continue;
                    }
                    if (shieldActive) {
                        sfx.playShieldBlock();
                        spawnExplosion(item.mesh.position, 0x10b981, 15);
                        score += 25 * comboMult() * ship().scoreMult;
                        $('hud-score').textContent = Math.floor(score);
                        scorePopup(item.mesh.position, 'BLOCKED +' + Math.floor(25 * comboMult()), 'graze');
                        shieldActive = false; shieldDuration = 0;
                        forcefield.material.opacity = 0.0;
                        if (item.kind === 'splitter') spawnShards(item.mesh.position, 3);
                    } else {
                        sfx.playHit();
                        fireHitFlash();
                        if (atmoMat) atmoMat.uniforms.uIntensity.value = 2.4;
                        spawnExplosion(item.mesh.position, 0xec4899, 20);
                        if (!window.gameDebug?.godMode) {
                            let dmg = item.damage;
                            if (orbitRadius < 75) dmg += 5;
                            integrity = Math.max(0, integrity - dmg);
                            hitsThisLap++;
                            if (comboChain > 0) sfx.playComboLost();
                            comboChain = 0; multiplier = 1.0;
                            updateMultiplierUI();
                        }
                        if (shakeEnabled && window.navigator && navigator.vibrate) { try { navigator.vibrate(40); } catch {} }
                        if (shakeEnabled) screenShake = 16;
                        updateShieldUI();
                        if (item.kind === 'splitter') spawnShards(item.mesh.position, 3);
                        if (integrity <= 0) {
                            scene.remove(item.mesh); debris.splice(i, 1);
                            startDeath();
                            continue;
                        }
                    }
                    scene.remove(item.mesh);
                    debris.splice(i, 1);
                    continue;
                }
                // graze / near-miss
                if (dist >= hitR && dist < grazeMax && elapsedSec - item.lastGraze > 1.0) {
                    item.lastGraze = elapsedSec;
                    nearMissCount++;
                    comboTimer = Math.min(comboTimer + 0.5, (overdriveActive ? COMBO_WINDOW + 1.5 : COMBO_WINDOW) + 1.0);
                    let gv = 5 * comboMult() * zoneMult(satellite.position) * ship().scoreMult;
                    if (cloakActive) gv *= 2;
                    if (orbitRadius > 155) gv *= 1.5;
                    score += gv;
                    $('hud-score').textContent = Math.floor(score);
                    sfx.playNearMiss();
                    scorePopup(item.mesh.position, '+' + Math.floor(gv) + ' GRAZE', 'graze');
                    const p = acquireParticle(0x06b6d4, 0.7, 0.8);
                    p.mesh.position.copy(item.mesh.position);
                    p.vel.set(0, 0, 0); p.life = 0.5; p.decay = 0.08;
                    scene.add(p.mesh); particles.push(p);
                }
                const cap = phase >= 4 ? 30 : 25;
                if (debris.length > cap) { const old = debris.shift(); scene.remove(old.mesh); }
            }

            // powerups
            for (let i = powerups.length - 1; i >= 0; i--) {
                const item = powerups[i];
                item.mesh.rotation.y += 0.03 * dt60;
                item.mesh.rotation.x += 0.01 * dt60;
                const dx = satellite.position.x - item.mesh.position.x;
                const dy = satellite.position.y - item.mesh.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 8) {
                    sfx.playPowerUp();
                    if (item.kind === 'magnet') { magnetActive = true; magnetDuration = 7; spawnExplosion(item.mesh.position, 0x06b6d4, 15); scorePopup(item.mesh.position, '🧲 MAGNET', 'graze'); }
                    else if (item.kind === 'shield') {
                        shieldActive = true; shieldDuration = 8;
                        integrity = Math.min(maxIntegrity, integrity + 25); updateShieldUI();
                        spawnExplosion(item.mesh.position, 0x10b981, 15);
                        scorePopup(item.mesh.position, '🛡️ SHIELD', 'graze');
                    } else if (item.kind === 'overdrive') { overdriveActive = true; overdriveDuration = 10; spawnExplosion(item.mesh.position, 0xfacc15, 15); scorePopup(item.mesh.position, '🔥 OVERDRIVE ×2', 'big'); }
                    else if (item.kind === 'cloak') { cloakActive = true; cloakDuration = 3; spawnExplosion(item.mesh.position, 0xf8fafc, 15); scorePopup(item.mesh.position, '👻 PHASE CLOAK', 'big'); }
                    else if (item.kind === 'chrono') { chronoActive = true; chronoDuration = 5; spawnExplosion(item.mesh.position, 0x60a5fa, 15); scorePopup(item.mesh.position, '⏳ CHRONO', 'big'); }
                    scene.remove(item.mesh);
                    powerups.splice(i, 1);
                    continue;
                }
                if (powerups.length > 3) { const old = powerups.shift(); scene.remove(old.mesh); }
            }

            dangerAcc += delta;
            if (dangerAcc > 0.5) { dangerAcc = 0; sfx.updateDangerLoop(integrity); }
        }
    }

    if (shakeEnabled && screenShake > 0) {
        camera.position.x = (Math.random() - 0.5) * screenShake;
        camera.position.y = -230 + (Math.random() - 0.5) * screenShake;
        screenShake *= Math.pow(0.88, dt60);
        if (screenShake < 0.1) screenShake = 0;
    } else {
        camera.position.x = 0;
        camera.position.y = -230;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= p.decay * dt60;
        if (!p.beam && !p.mesh.userData.noScale) p.mesh.scale.set(Math.max(0.01, p.life), Math.max(0.01, p.life), Math.max(0.01, p.life));
        if (p.mesh.material && p.mesh.material.transparent) p.mesh.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            if (p.beam) { try { p.mesh.geometry.dispose(); } catch {} }
            else particlePool.push(p);
            particles.splice(i, 1);
        }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.t += delta;
        const r = 4 + s.t * 160;
        s.mesh.scale.set(r / 3, r / 3, 1);
        s.mesh.material.opacity = Math.max(0, 0.9 - s.t * 1.1);
        if (s.t > 0.9) {
            scene.remove(s.mesh);
            try { s.mesh.geometry.dispose(); s.mesh.material.dispose(); } catch {}
            shockwaves.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

function updateMultiplierUI() {
    multiplier = comboMult();
    maxMultiplier = Math.max(maxMultiplier, multiplier);
    $('hud-multiplier').textContent = multiplier.toFixed(1) + 'x';
    const tiers = multiplier >= 5 ? 'SUPERNOVA' : multiplier >= 3 ? 'BLAZING' : multiplier >= 1.5 ? 'HOT' : '';
    const ct = $('hud-combo-tier');
    if (ct) ct.textContent = tiers;
    if (multiplier >= 3) hudPop('hud-multiplier');
}

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = Object.assign(window.gameDebug || {}, {
    name: "Orbital Drift",
    getScore: () => score,
    setScore: (s) => { score = s; $('hud-score').textContent = Math.floor(score); },
    getHealth: () => integrity,
    setHealth: (h) => { integrity = h; updateShieldUI(); },
    getState: () => !gameActive ? (integrity <= 0 || overFired ? 'game_over' : 'menu') : (isPaused ? 'paused' : 'playing'),
    isPlaying: () => gameActive && !isPaused,
    start: () => startGame(),
    pause: () => { if (gameActive && !isPaused) togglePause(); },
    resume: () => resumeGame(),
    reset: () => startGame(),
    setThrust: (on) => setThrust(!!on),
    hangar: () => showHangar('debug'),
    snapshot: () => ({
        score: Math.floor(score), integrity, maxIntegrity, multiplier, comboChain,
        ship: selectedShip,
        orbitRadius, targetRadius, satelliteAngle, elapsedSec, phase,
        counts: { stardust: collectibles.length, debris: debris.length, powerups: powerups.length, particles: particles.length },
        gameActive, isPaused
    }),
    win: () => { score += 5000; gameOver(); },
    lose: () => { integrity = 0; gameOver(); },
    ships: () => Object.values(SHIPS).map((s) => ({ id: s.id, name: s.name, maxIntegrity: s.maxIntegrity, scoreMult: s.scoreMult })),
    getShip: () => selectedShip,
    setShip: (id) => applyShipSelection(id, true),
    godMode: false,
    toggleGodMode: function () { this.godMode = !this.godMode; return this.godMode; }
});
