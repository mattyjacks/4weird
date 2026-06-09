/**
 * Orbital Drift - Enhanced Premium Edition
 * Built with Three.js
 * Developer: Antigravity
 */

// Sound Synthesizer Class using Web Audio API
class SoundFX {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.thrustOsc = null;
        this.thrustGain = null;
        
        // Music Sequencer state
        this.musicInterval = null;
        this.musicTick = 0;
        this.tempo = 140; // BPM
        this.scale = [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63]; // C minor scale
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startMusic() {
        this.init();
        if (this.musicInterval) return;

        const noteLength = 60 / this.tempo / 2; // Eighth notes
        this.musicInterval = setInterval(() => {
            if (this.muted || !gameActive || isPaused) return;
            this.playBeatStep();
        }, noteLength * 1000);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    playBeatStep() {
        const now = this.ctx.currentTime;
        const tick = this.musicTick % 16;
        
        // Bassline pattern: C minor prog
        let noteIndex = 0;
        if (tick < 4) noteIndex = 0; // C
        else if (tick < 8) noteIndex = 2; // D#
        else if (tick < 12) noteIndex = 4; // G
        else noteIndex = 6; // A#

        // Add rhythm variance
        if (tick % 4 === 0 || tick % 4 === 2 || (tick % 4 === 3 && Math.random() > 0.5)) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Sub-bass frequency
            const freq = this.scale[noteIndex] / 2;
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }

        // Ambient higher melody note occasionally
        if (tick % 8 === 3 && Math.random() > 0.3) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            const melodyNote = this.scale[Math.floor(Math.random() * this.scale.length)];
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(melodyNote, now);
            
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        }

        this.musicTick++;
    }

    playCollect() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playPowerUp() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [392.00, 523.25, 659.25, 783.99]; // G5, C6, E6, G6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.1, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.25);
        });
    }

    playHit() {
        if (this.muted) return;
        this.init();
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

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.4);
        osc2.stop(now + 0.4);
    }

    playThrust(active) {
        if (this.muted || !active) {
            if (this.thrustOsc) {
                try { this.thrustOsc.stop(); } catch(e){}
                this.thrustOsc = null;
                this.thrustGain = null;
            }
            return;
        }

        this.init();
        if (this.thrustOsc) return;

        const now = this.ctx.currentTime;
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustGain = this.ctx.createGain();

        this.thrustOsc.type = 'triangle';
        this.thrustOsc.frequency.setValueAtTime(80, now);
        
        this.thrustGain.gain.setValueAtTime(0.06, now);

        this.thrustOsc.connect(this.thrustGain);
        this.thrustGain.connect(this.ctx.destination);
        this.thrustOsc.start(now);
    }

    updateThrustFreq(radiusRatio) {
        if (this.thrustOsc && !this.muted) {
            const freq = 60 + (radiusRatio * 90);
            this.thrustOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
        }
    }

    playStart() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.08, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.3);
        });
    }
}

const sfx = new SoundFX();

// Game State Variables
let scene, camera, renderer, container;
let planet, satellite, forcefield, orbits = [];
let collectibles = [], debris = [], powerups = [];
let particles = [], starfieldStars;
let gameActive = false;
let isPaused = false;
let score = 0;
let multiplier = 1.0;
let integrity = 100;
let orbitRadius = 100;
let targetRadius = 100;
let satelliteAngle = 0;
let thrustActive = false;
let highScore = 0;

// Spawning intervals
let spawnTimerDebris = 0;
let spawnTimerStardust = 0;
let spawnTimerPowerup = 0;
let timeElapsed = 0;
let screenShake = 0;

// Power-up durations
let magnetActive = false;
let magnetDuration = 0;
let shieldActive = false;
let shieldDuration = 0;

// Configurations
const MIN_RADIUS = 50;
const MAX_RADIUS = 180;
const PLANET_RADIUS = 35;
const SAT_BASE_SPEED = 0.045;

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    initUI();
    initThree();
    animate();
});

function initUI() {
    highScore = parseInt(localStorage.getItem('orbitaldrift_high_score') || '0');
    document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;

    const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
    const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
    const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
    const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

    startBtn.addEventListener('click', startGame);
    playAgainBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', restartGame);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    container = document.getElementById('game-container');
    container.addEventListener('mousedown', () => { if (gameActive && !isPaused) setThrust(true); });
    container.addEventListener('mouseup', () => { setThrust(false); });
    container.addEventListener('mouseleave', () => { setThrust(false); });
    
    container.addEventListener('touchstart', (e) => { 
        if (gameActive && !isPaused) {
            e.preventDefault();
            setThrust(true); 
        }
    }, { passive: false });
    
    container.addEventListener('touchend', (e) => { 
        e.preventDefault();
        setThrust(false); 
    }, { passive: false });
}

function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameActive && !isPaused) {
            setThrust(true);
        }
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) {
            togglePause();
        }
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space') {
        setThrust(false);
    }
}

function setThrust(active) {
    thrustActive = active;
    sfx.playThrust(active);
}

function initThree() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const rect = canvas.getBoundingClientRect();
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.0015);

    camera = new THREE.PerspectiveCamera(55, rect.width / rect.height, 0.1, 1000);
    camera.position.set(0, -230, 220);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0a0a23, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 2.5);
    dirLight.position.set(60, -120, 150);
    scene.add(dirLight);

    const planetPoint = new THREE.PointLight(0xa78bfa, 3, 250);
    planetPoint.position.set(0, 0, 10);
    scene.add(planetPoint);

    // Drifting Starfield Background (Three.js Points)
    const starCount = 300;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for(let i=0; i<starCount*3; i+=3) {
        starPositions[i] = (Math.random() - 0.5) * 600;
        starPositions[i+1] = (Math.random() - 0.5) * 600;
        starPositions[i+2] = -50 - Math.random() * 200; // Far behind the play field
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        transparent: true,
        opacity: 0.6
    });
    starfieldStars = new THREE.Points(starGeom, starMat);
    scene.add(starfieldStars);

    // Central Planet with Saturn-like Ring System
    const planetGeom = new THREE.SphereGeometry(PLANET_RADIUS, 32, 32);
    const planetMat = new THREE.MeshPhongMaterial({
        color: 0x070014,
        emissive: 0x1d0047,
        shininess: 90,
        flatShading: true
    });
    planet = new THREE.Mesh(planetGeom, planetMat);
    scene.add(planet);

    // Planet atmosphere glow rings
    const atmosGeom = new THREE.RingGeometry(PLANET_RADIUS + 1, PLANET_RADIUS + 3, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
    });
    const atmos = new THREE.Mesh(atmosGeom, atmosMat);
    scene.add(atmos);

    // Planet Ring System (Saturn style)
    const ringGeom = new THREE.RingGeometry(PLANET_RADIUS + 6, PLANET_RADIUS + 12, 64);
    const ringMat = new THREE.MeshPhongMaterial({
        color: 0xa78bfa,
        emissive: 0x4c1d95,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        shininess: 50
    });
    const rings = new THREE.Mesh(ringGeom, ringMat);
    rings.rotation.x = Math.PI / 6; // Angle tilt for beautiful 3D look
    rings.rotation.y = Math.PI / 10;
    scene.add(rings);

    // Orbit tracks visual guides
    createOrbitTrack(60, 0x4c1d95, 0.2);
    createOrbitTrack(100, 0x0284c7, 0.2);
    createOrbitTrack(140, 0x0f766e, 0.2);
    createOrbitTrack(180, 0x4c1d95, 0.12);

    // Satellite (Player Ship)
    const satGroup = new THREE.Group();
    
    // Core body (futuristic neon triangular fighter capsule)
    const bodyGeom = new THREE.ConeGeometry(4, 10, 4);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0891b2, shininess: 100 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    satGroup.add(body);

    // Side thrusters/solar wings
    const wingGeom = new THREE.BoxGeometry(9, 1.8, 0.4);
    const wingMat = new THREE.MeshPhongMaterial({ color: 0xa78bfa });
    const wing = new THREE.Mesh(wingGeom, wingMat);
    wing.position.set(0, -2, 0);
    satGroup.add(wing);

    // Forcefield Sphere (spawns hidden around ship)
    const fieldGeom = new THREE.SphereGeometry(7, 16, 16);
    const fieldMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.0,
        wireframe: true
    });
    forcefield = new THREE.Mesh(fieldGeom, fieldMat);
    satGroup.add(forcefield);

    satellite = satGroup;
    satellite.position.set(MIN_RADIUS, 0, 0);
    scene.add(satellite);

    window.addEventListener('resize', onWindowResize);
}

function createOrbitTrack(radius, color, opacity) {
    const geom = new THREE.RingGeometry(radius - 0.4, radius + 0.4, 64);
    const mat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: opacity
    });
    const track = new THREE.Mesh(geom, mat);
    scene.add(track);
    orbits.push(track);
}

function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Game State Controls
function startGame() {
    sfx.playStart();
    sfx.startMusic();
    gameActive = true;
    isPaused = false;
    score = 0;
    multiplier = 1.0;
    integrity = 100;
    orbitRadius = 100;
    targetRadius = 100;
    satelliteAngle = 0;
    thrustActive = false;
    spawnTimerDebris = 0;
    spawnTimerStardust = 0;
    spawnTimerPowerup = 0;
    timeElapsed = 0;
    screenShake = 0;

    magnetActive = false;
    magnetDuration = 0;
    shieldActive = false;
    shieldDuration = 0;
    forcefield.material.opacity = 0.0;

    // Clear old items
    collectibles.forEach(c => scene.remove(c.mesh));
    debris.forEach(d => scene.remove(d.mesh));
    powerups.forEach(p => scene.remove(p.mesh));
    particles.forEach(p => scene.remove(p.mesh));
    
    collectibles = [];
    debris = [];
    powerups = [];
    particles = [];

    // UI Updates
    document.getElementById('hud-score').textContent = '0';
    document.getElementById('hud-multiplier').textContent = '1.0x';
    document.getElementById('hud-integrity-bar').style.width = '100%';
    document.getElementById('game-hud').classList.remove('hidden');

    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
}

function togglePause() {
    isPaused = !isPaused;
    const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
    if (isPaused) {
        pauseScreen.classList.remove('hidden');
        sfx.playThrust(false);
    } else {
        pauseScreen.classList.add('hidden');
        if (thrustActive) sfx.playThrust(true);
    }
}

function resumeGame() {
    isPaused = false;
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    if (thrustActive) sfx.playThrust(true);
}

function restartGame() {
    startGame();
}

function gameOver() {
    gameActive = false;
    sfx.playThrust(false);
    sfx.stopMusic();
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    document.getElementById('TEMPLATE-4weird-final-score-val').textContent = Math.floor(score);

    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('orbitaldrift_high_score', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
}

// Spawners
function spawnStardust() {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    
    const geom = new THREE.OctahedronGeometry(2.5, 0);
    const mat = new THREE.MeshPhongMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        shininess: 100
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);

    collectibles.push({
        mesh: mesh,
        radius: radius,
        angle: angle,
        pulseSpeed: 3 + Math.random() * 3
    });
}

function spawnDebris() {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    
    // Choose between slow asteroid vs fast comet
    const isComet = Math.random() > 0.7;
    const speed = (isComet ? 0.035 + Math.random() * 0.025 : 0.01 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1);
    
    let geom, mat, color;
    if (isComet) {
        geom = new THREE.ConeGeometry(2, 6, 4);
        geom.rotateX(Math.PI / 2);
        color = 0x06b6d4; // Cyan/blue fast comets
        mat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x0891b2 });
    } else {
        geom = new THREE.DodecahedronGeometry(3.5 + Math.random() * 3, 0);
        color = 0xec4899; // Pink/purple heavy asteroids
        mat = new THREE.MeshPhongMaterial({ color: 0xec4899, emissive: 0x9d174d, flatShading: true });
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);

    debris.push({
        mesh: mesh,
        radius: radius,
        angle: angle,
        speed: speed,
        isComet: isComet,
        rotSpeed: {
            x: Math.random() * 0.04,
            y: Math.random() * 0.04,
            z: Math.random() * 0.04
        }
    });
}

function spawnPowerup() {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    
    // Magnet (Cyan Prism) vs Shield Boost (Green Sphere)
    const isMagnet = Math.random() > 0.5;
    
    const geom = isMagnet ? new THREE.ConeGeometry(3, 6, 3) : new THREE.SphereGeometry(3, 8, 8);
    const mat = new THREE.MeshPhongMaterial({
        color: isMagnet ? 0x06b6d4 : 0x10b981,
        emissive: isMagnet ? 0x0891b2 : 0x047857,
        shininess: 100,
        wireframe: true
    });
    
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);

    powerups.push({
        mesh: mesh,
        radius: radius,
        angle: angle,
        isMagnet: isMagnet
    });
}

// Particle System
function spawnExplosion(pos, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const geom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(pos);
        scene.add(mesh);

        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3.5;
        particles.push({
            mesh: mesh,
            vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * speed),
            life: 1.0,
            decay: 0.025 + Math.random() * 0.025
        });
    }
}

function spawnEngineTrail(pos) {
    // Engine particles trail
    const geom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    // Cyan trail unless Magnet power-up is active (changes trail color to golden yellow)
    const color = magnetActive ? 0xfacc15 : 0x06b6d4;
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geom, mat);
    
    const offsetAngle = satelliteAngle + Math.PI;
    mesh.position.set(
        pos.x + Math.cos(offsetAngle) * 4,
        pos.y + Math.sin(offsetAngle) * 4,
        pos.z
    );
    scene.add(mesh);

    particles.push({
        mesh: mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4),
        life: 0.8,
        decay: 0.05
    });
}

// Main Game Frame Logic
function animate() {
    requestAnimationFrame(animate);

    // Background stars parallax drift
    if (starfieldStars) {
        starfieldStars.rotation.z += 0.0003;
    }

    if (gameActive && !isPaused) {
        timeElapsed++;

        const difficultyFactor = Math.min(1 + timeElapsed / 1500, 2.8);

        // Planet & Rings Rotation
        planet.rotation.y += 0.006;
        planet.rotation.z += 0.003;

        // Thrust physics
        if (thrustActive) {
            targetRadius = Math.min(MAX_RADIUS, targetRadius + 4.5);
        } else {
            targetRadius = Math.max(MIN_RADIUS, targetRadius - 4.0);
        }

        // Elastic drift radius tracking
        orbitRadius += (targetRadius - orbitRadius) * 0.16;

        const ratio = (orbitRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
        sfx.updateThrustFreq(ratio);

        // Keplerian angular velocity calculation
        const KeplerSpeed = SAT_BASE_SPEED * Math.pow(100 / orbitRadius, 1.45);
        satelliteAngle += KeplerSpeed;

        const satX = Math.cos(satelliteAngle) * orbitRadius;
        const satY = Math.sin(satelliteAngle) * orbitRadius;
        satellite.position.set(satX, satY, 0);

        // Dynamic Ship Tilt Rotation (tilts slightly depending on radius change direction)
        const radiusDiff = targetRadius - orbitRadius;
        satellite.rotation.z = satelliteAngle + Math.PI / 2;
        satellite.rotation.y = THREE.MathUtils.clamp(radiusDiff * 0.06, -0.6, 0.6); // Yaw roll tilt

        // Particle trail
        if (timeElapsed % 2 === 0) {
            spawnEngineTrail(satellite.position);
        }

        // Power-ups updates
        if (magnetActive) {
            magnetDuration -= 1 / 60;
            if (magnetDuration <= 0) {
                magnetActive = false;
            }
        }
        if (shieldActive) {
            shieldDuration -= 1 / 60;
            forcefield.material.opacity = Math.max(0, Math.min(0.5, shieldDuration * 0.5));
            if (shieldDuration <= 0) {
                shieldActive = false;
            }
        }

        // Spawn Timers
        spawnTimerStardust++;
        if (spawnTimerStardust > Math.max(35, 90 / difficultyFactor)) {
            spawnStardust();
            spawnTimerStardust = 0;
        }

        spawnTimerDebris++;
        if (spawnTimerDebris > Math.max(25, 80 / difficultyFactor)) {
            spawnDebris();
            spawnTimerDebris = 0;
        }

        spawnTimerPowerup++;
        if (spawnTimerPowerup > 400 + Math.random() * 400) { // Spawns rarely
            spawnPowerup();
            spawnTimerPowerup = 0;
        }

        // Update Stardust (Collectibles)
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const item = collectibles[i];
            item.mesh.rotation.y += 0.02;
            item.mesh.rotation.z += 0.03;

            const pulse = 1 + Math.sin(timeElapsed * 0.05 * item.pulseSpeed) * 0.18;
            item.mesh.scale.set(pulse, pulse, pulse);

            // Power-up Magnet attraction mechanic
            if (magnetActive) {
                const distToSat = item.mesh.position.distanceTo(satellite.position);
                if (distToSat < 60) { // Inside pull radius
                    const dir = new THREE.Vector3().subVectors(satellite.position, item.mesh.position).normalize();
                    item.mesh.position.addScaledVector(dir, 3.5); // Pull speed
                }
            }

            // Check Collision
            const dist = satellite.position.distanceTo(item.mesh.position);
            if (dist < 8) {
                sfx.playCollect();
                spawnExplosion(item.mesh.position, 0xfacc15, 12);
                
                score += 10 * multiplier;
                multiplier = Math.min(6.0, multiplier + 0.15); // Maximum combo multiplier up to 6x
                
                document.getElementById('hud-score').textContent = Math.floor(score);
                document.getElementById('hud-multiplier').textContent = multiplier.toFixed(1) + 'x';
                
                scene.remove(item.mesh);
                collectibles.splice(i, 1);
                continue;
            }

            if (collectibles.length > 25) {
                const old = collectibles.shift();
                scene.remove(old.mesh);
            }
        }

        // Update Debris (Comets / Asteroids)
        for (let i = debris.length - 1; i >= 0; i--) {
            const item = debris[i];
            item.angle += item.speed;
            item.mesh.position.set(
                Math.cos(item.angle) * item.radius,
                Math.sin(item.angle) * item.radius,
                0
            );

            // Orient comet to point in direction of velocity
            if (item.isComet) {
                item.mesh.rotation.z = item.angle + (item.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
                // Spark trail for comets
                if (timeElapsed % 3 === 0) {
                    const sparkGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
                    const spark = new THREE.Mesh(sparkGeom, sparkMat);
                    spark.position.copy(item.mesh.position);
                    scene.add(spark);
                    particles.push({ mesh: spark, vel: new THREE.Vector3(), life: 0.6, decay: 0.08 });
                }
            } else {
                item.mesh.rotation.x += item.rotSpeed.x;
                item.mesh.rotation.y += item.rotSpeed.y;
                item.mesh.rotation.z += item.rotSpeed.z;
            }

            // Check Collision with player
            const dist = satellite.position.distanceTo(item.mesh.position);
            if (dist < 9) {
                sfx.playHit();
                
                if (shieldActive) {
                    // Shield absorbs impact completely!
                    spawnExplosion(item.mesh.position, 0x10b981, 15);
                    shieldActive = false;
                    shieldDuration = 0;
                    forcefield.material.opacity = 0.0;
                } else {
                    // Regular damage
                    spawnExplosion(item.mesh.position, 0xec4899, 20);
                    if (!window.gameDebug?.godMode) {
                        integrity = Math.max(0, integrity - 25);
                        multiplier = 1.0; // Reset combo multiplier
                    }
                    screenShake = 16;
                    document.getElementById('hud-integrity-bar').style.width = integrity + '%';
                    document.getElementById('hud-multiplier').textContent = multiplier.toFixed(1) + 'x';

                    if (integrity <= 0) {
                        gameOver();
                    }
                }

                scene.remove(item.mesh);
                debris.splice(i, 1);
                continue;
            }

            if (debris.length > 25) {
                const old = debris.shift();
                scene.remove(old.mesh);
            }
        }

        // Update Powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const item = powerups[i];
            item.mesh.rotation.y += 0.03;
            item.mesh.rotation.x += 0.01;

            const dist = satellite.position.distanceTo(item.mesh.position);
            if (dist < 8) {
                sfx.playPowerUp();
                
                if (item.isMagnet) {
                    magnetActive = true;
                    magnetDuration = 7; // 7 seconds magnet pull
                    spawnExplosion(item.mesh.position, 0x06b6d4, 15);
                } else {
                    shieldActive = true;
                    shieldDuration = 8; // 8 seconds active bubble field
                    integrity = 100;    // Fully restores integrity
                    document.getElementById('hud-integrity-bar').style.width = '100%';
                    spawnExplosion(item.mesh.position, 0x10b981, 15);
                }

                scene.remove(item.mesh);
                powerups.splice(i, 1);
                continue;
            }

            // Powerup expiration cleanup
            if (powerups.length > 3) {
                const old = powerups.shift();
                scene.remove(old.mesh);
            }
        }

        // Slowly bleed combo multiplier
        if (timeElapsed % 100 === 0 && multiplier > 1.0) {
            multiplier = Math.max(1.0, multiplier - 0.1);
            document.getElementById('hud-multiplier').textContent = multiplier.toFixed(1) + 'x';
        }
    }

    // Screen shake update
    if (screenShake > 0) {
        camera.position.x = (Math.random() - 0.5) * screenShake;
        camera.position.y = -230 + (Math.random() - 0.5) * screenShake;
        screenShake *= 0.88;
        if (screenShake < 0.1) screenShake = 0;
    } else {
        camera.position.x = 0;
        camera.position.y = -230;
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= p.decay;
        p.mesh.scale.set(p.life, p.life, p.life);
        
        if (p.mesh.material) {
            p.mesh.material.opacity = p.life;
        }

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Orbital Drift",
    getScore: () => score,
    setScore: (s) => { score = s; document.getElementById('hud-score').textContent = Math.floor(score); },
    getHealth: () => integrity,
    setHealth: (h) => { integrity = h; document.getElementById('hud-integrity-bar').style.width = integrity + '%'; },
    win: () => {
        score += 5000;
        gameOver();
    },
    lose: () => {
        integrity = 0;
        gameOver();
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
