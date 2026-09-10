/**
 * 4weird Games - Standard Game Template Harness
 * Version 2.0.0 (Neon Cyberpunk Edition)
 * 
 * This file serves as:
 * 1. A modular boilerplate harness for developers to attach their custom game logic.
 * 2. A fully playable, sensory-rich demo game (Neon Grid Runner) demonstrating the features.
 * 
 * Game developers can replace the demo-specific classes with their own code,
 * using the standard interface bindings provided at the bottom of the file.
 */

// ==========================================
// 1. SOUND ENGINE (Web Audio API Synthesizer)
// ==========================================
class SoundFX {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.synthInterval = null;
        this.seqStep = 0;
        
        // C-minor pentatonic scale frequencies for retro melodies
        this.scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63]; 
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playMenuClick() {
        this.init();
        if (this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playCollect() {
        this.init();
        if (this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playHit() {
        this.init();
        if (this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noise = this.createNoiseBuffer();
        const noiseSource = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();

        // Sub bass drop
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        // Noise buffer connection
        if (noise) {
            noiseSource.buffer = noise;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(400, now);
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(gain);
        }

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        if (noise) {
            noiseSource.start(now);
            noiseSource.stop(now + 0.25);
        }
    }

    playGameOver() {
        this.init();
        if (this.muted) return;
        const now = this.ctx.currentTime;
        
        // Deep cyber boom explosion
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(90, now);
        osc1.frequency.linearRampToValueAtTime(10, now + 1.2);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(45, now);
        osc2.frequency.linearRampToValueAtTime(10, now + 1.5);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
    }

    startAmbientMusic() {
        this.init();
        if (this.synthInterval) return;

        const stepTime = 160; // ms per step (approx 93 BPM eighth notes)
        this.synthInterval = setInterval(() => {
            if (this.muted || !gameEngine || !gameEngine.isActive || gameEngine.isPaused) return;
            this.playSynthStep();
        }, stepTime);
    }

    stopAmbientMusic() {
        if (this.synthInterval) {
            clearInterval(this.synthInterval);
            this.synthInterval = null;
        }
    }

    playSynthStep() {
        const now = this.ctx.currentTime;
        const step = this.seqStep % 16;
        
        // Cyberpunk style bass arp
        const bassNotes = [65.41, 65.41, 73.42, 73.42, 82.41, 82.41, 98.00, 110.00]; // C2 -> D2 -> E2 -> G2 -> A2
        const noteIndex = Math.floor(step / 2) % bassNotes.length;
        const baseFreq = bassNotes[noteIndex];

        // 1. Play Sub-Bass Arp
        if (step % 2 === 0 || step % 3 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(baseFreq, now);
            
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }

        // 2. Play ambient melody trigger on specific sequences
        if (step % 8 === 4 && Math.random() > 0.4) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Random pentatonic note
            const scaleNote = this.scale[Math.floor(Math.random() * this.scale.length)];
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(scaleNote * 2, now);
            osc.frequency.exponentialRampToValueAtTime(scaleNote, now + 0.4);
            
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
        }

        this.seqStep++;
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
}

// Instantiate Sound Engine
const sfx = new SoundFX();

// ==========================================
// 2. DEMO GAME LOGIC: NEON GRID RUNNER
// ==========================================
class DemoGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.isActive = false;
        this.isPaused = false;
        this.score = 0;
        this.renderedScore = 0; // Odometer animated score
        this.highScore = parseInt(localStorage.getItem('4weird_template_highscore') || '0', 10);
        this.shield = 100;
        this.level = 1;
        this.lives = 3;
        this.isBoosting = false;
        this.gameSpeed = 4;
        this.distance = 0;

        // Player Avatar
        this.player = {
            x: 0,
            y: 0,
            size: 20,
            targetX: 0,
            targetY: 0,
            speed: 8,
            trail: []
        };

        // Arrays for entity management
        this.particles = [];
        this.obstacles = [];
        this.cores = [];

        // Input states
        this.keys = {};
        this.touchAxes = { x: 0, y: 0 };

        // Bind canvas listeners & setup canvas sizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupInput();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        // In template mode, respect parent containers but maintain correct 4:3 aspects
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Mobile full viewport height/width fallback for standalone
        if (document.fullscreenElement === this.canvas.parentElement) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            this.canvas.width = rect.width || 800;
            this.canvas.height = rect.height || 600;
        }

        // Reset player positions on resize to middle
        if (!this.isActive) {
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height * 0.75;
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
        }
    }

    setupInput() {
        // Keyboard mapping
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.isBoosting = true;
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'Space') {
                this.isBoosting = false;
            }
        });

        // Virtual Touch Input bindings
        this.bindTouchControls();
    }

    bindTouchControls() {
        // Touch buttons/dpad and joystick integration
        // We'll set these properties from index.html elements dynamically
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.touch-action-btn');
            if (btn) {
                const action = btn.getAttribute('data-action');
                if (action === 'boost') {
                    this.isBoosting = true;
                    setTimeout(() => { this.isBoosting = false; }, 200);
                }
            }
        });

        // Hook virtual Joystick events
        const joystickZone = document.getElementById('joystick-zone');
        if (joystickZone) {
            let joystickActive = false;
            let startX = 0, startY = 0;
            const knob = joystickZone.querySelector('.joystick-knob');

            joystickZone.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                joystickActive = true;
                e.preventDefault();
            });

            joystickZone.addEventListener('touchmove', (e) => {
                if (!joystickActive) return;
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                const distance = Math.min(Math.hypot(deltaX, deltaY), 40); // Max travel 40px
                const angle = Math.atan2(deltaY, deltaX);

                const knobX = Math.cos(angle) * distance;
                const knobY = Math.sin(angle) * distance;

                if (knob) {
                    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
                }

                // Map joystick position to axes (-1 to 1)
                this.touchAxes.x = knobX / 40;
                this.touchAxes.y = knobY / 40;
                e.preventDefault();
            });

            const resetJoystick = () => {
                joystickActive = false;
                this.touchAxes.x = 0;
                this.touchAxes.y = 0;
                if (knob) knob.style.transform = 'translate(0px, 0px)';
            };

            joystickZone.addEventListener('touchend', resetJoystick);
            joystickZone.addEventListener('touchcancel', resetJoystick);
        }

        // Hook virtual D-pad buttons
        const dpadDirections = ['up', 'down', 'left', 'right'];
        dpadDirections.forEach(dir => {
            const btn = document.getElementById(`dpad-${dir}`);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    this.keys[`Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`] = true;
                    e.preventDefault();
                });
                btn.addEventListener('touchend', (e) => {
                    this.keys[`Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`] = false;
                    e.preventDefault();
                });
            }
        });
    }

    start() {
        this.isActive = true;
        this.isPaused = false;
        this.score = 0;
        this.renderedScore = 0;
        this.shield = 100;
        this.level = 1;
        this.lives = 3;
        this.gameSpeed = 4;
        this.distance = 0;
        this.obstacles = [];
        this.cores = [];
        this.particles = [];

        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height * 0.75;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;

        sfx.startAmbientMusic();
        
        // Hide overlay screens
        document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
        document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
        
        // Show real-time HUD
        const hud = document.getElementById('game-hud');
        if (hud) hud.classList.remove('hidden');

        this.updateHUD();
    }

    pause() {
        this.isPaused = true;
        sfx.stopAmbientMusic();
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
    }

    resume() {
        this.isPaused = false;
        sfx.startAmbientMusic();
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    }

    gameOver(completed = false) {
        this.isActive = false;
        sfx.stopAmbientMusic();
        sfx.playGameOver();

        // Save high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('4weird_template_highscore', this.highScore.toString());
        }

        const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
        const finalScoreVal = document.getElementById('TEMPLATE-4weird-final-score-val');
        const highscoreVal = document.getElementById('TEMPLATE-4weird-gameover-highscore');

        if (finalScoreVal) finalScoreVal.textContent = this.score;
        if (highscoreVal) highscoreVal.textContent = this.highScore;
        
        gameOverScreen.classList.remove('hidden');
        this.updateHUD();
    }

    updateHUD() {
        // Standard elements updates
        const scoreEl = document.getElementById('hud-score');
        const livesContainer = document.getElementById('hud-lives-container');
        const integrityBar = document.getElementById('hud-integrity-bar');
        const multiplierEl = document.getElementById('hud-multiplier');
        const levelEl = document.getElementById('hud-level-val');
        const mainHighScore = document.getElementById('TEMPLATE-4weird-high-score');

        // Main high score panel updates
        if (mainHighScore) mainHighScore.textContent = this.highScore;
        
        // Animate score counter smoothly (odometer effect)
        if (scoreEl) {
            const step = Math.ceil((this.score - this.renderedScore) / 10);
            this.renderedScore += step;
            if (this.renderedScore > this.score) this.renderedScore = this.score;
            scoreEl.textContent = this.renderedScore.toLocaleString();
        }

        if (levelEl) levelEl.textContent = this.level;
        if (multiplierEl) multiplierEl.textContent = this.isBoosting ? '2.5x' : '1.0x';

        // Shield bar styling based on remaining strength
        if (integrityBar) {
            integrityBar.style.width = `${this.shield}%`;
            if (this.shield > 50) {
                integrityBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
            } else if (this.shield > 25) {
                integrityBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            } else {
                integrityBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
            }
        }

        // Cyber heart/lives icons renderer
        if (livesContainer) {
            let hearts = '';
            for (let i = 0; i < 3; i++) {
                if (i < this.lives) {
                    hearts += '<span class="hud-life-icon active">⚡</span>';
                } else {
                    hearts += '<span class="hud-life-icon depleted">⚡</span>';
                }
            }
            livesContainer.innerHTML = hearts;
        }
    }

    tick(dt) {
        if (!this.isActive || this.isPaused) return;

        this.distance += this.gameSpeed * 0.1;
        this.score += Math.floor((this.isBoosting ? 2.5 : 1.0) * (1 + this.level * 0.2));

        // Advance level every 1000 score
        const targetLevel = 1 + Math.floor(this.score / 1500);
        if (targetLevel > this.level) {
            this.level = targetLevel;
            this.gameSpeed = 4 + this.level * 0.8;
            sfx.playCollect();
        }

        this.updatePlayerMovement();
        this.spawnEntities();
        this.updateEntities();
        this.checkCollisions();
        this.updateHUD();
    }

    updatePlayerMovement() {
        let dx = 0;
        let dy = 0;

        // 1. Process Keyboard Directional Input
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx = -1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) dx = 1;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) dy = -1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) dy = 1;

        // Normalize keyboard input vector
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        // 2. Process Touch joystick/axis inputs (takes priority if active)
        if (Math.abs(this.touchAxes.x) > 0.1 || Math.abs(this.touchAxes.y) > 0.1) {
            dx = this.touchAxes.x;
            dy = this.touchAxes.y;
        }

        // Apply speed factors (increase during cyber boost mode)
        const speedFactor = this.isBoosting ? this.player.speed * 1.5 : this.player.speed;
        this.player.x += dx * speedFactor;
        this.player.y += dy * speedFactor;

        // Boundaries constraints
        const borderPadding = this.player.size;
        this.player.x = Math.max(borderPadding, Math.min(this.canvas.width - borderPadding, this.player.x));
        this.player.y = Math.max(borderPadding, Math.min(this.canvas.height - borderPadding, this.player.y));

        // Add coordinates to trail sequence
        this.player.trail.push({ x: this.player.x, y: this.player.y });
        if (this.player.trail.length > (this.isBoosting ? 20 : 10)) {
            this.player.trail.shift();
        }
    }

    spawnEntities() {
        // Obstacles spawn logic
        if (Math.random() < 0.02 + (this.level * 0.005)) {
            this.obstacles.push({
                x: Math.random() * this.canvas.width,
                y: -30,
                width: 30 + Math.random() * 50,
                height: 15 + Math.random() * 15,
                speed: this.gameSpeed + Math.random() * 3,
                hue: Math.random() < 0.5 ? 330 : 270 // Pink or magenta theme colors
            });
        }

        // Energy cores spawn logic
        if (Math.random() < 0.015) {
            this.cores.push({
                x: Math.random() * this.canvas.width,
                y: -20,
                size: 10,
                speed: this.gameSpeed,
                pulse: 0
            });
        }
    }

    updateEntities() {
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.y += obs.speed;
            if (obs.y > this.canvas.height + 50) {
                this.obstacles.splice(i, 1);
            }
        }

        // Update cores
        for (let i = this.cores.length - 1; i >= 0; i--) {
            const core = this.cores[i];
            core.y += core.speed;
            core.pulse += 0.1;
            if (core.y > this.canvas.height + 50) {
                this.cores.splice(i, 1);
            }
        }

        // Update particle glow trails
        if (this.isBoosting && Math.random() < 0.6) {
            this.particles.push({
                x: this.player.x + (Math.random() * 10 - 5),
                y: this.player.y + this.player.size / 2,
                vx: Math.random() * 2 - 1,
                vy: 4 + Math.random() * 4,
                life: 1.0,
                decay: 0.05 + Math.random() * 0.05,
                size: 3 + Math.random() * 5,
                color: 'cyan'
            });
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        // Collide obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            const isColliding = 
                this.player.x + this.player.size / 2 > obs.x - obs.width / 2 &&
                this.player.x - this.player.size / 2 < obs.x + obs.width / 2 &&
                this.player.y + this.player.size / 2 > obs.y - obs.height / 2 &&
                this.player.y - this.player.size / 2 < obs.y + obs.height / 2;

            if (isColliding) {
                sfx.playHit();
                this.shield -= 20;
                
                // Spawn explosion particle bursts
                for (let j = 0; j < 15; j++) {
                    this.particles.push({
                        x: this.player.x,
                        y: this.player.y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 1.0,
                        decay: 0.03 + Math.random() * 0.04,
                        size: 4 + Math.random() * 6,
                        color: 'magenta'
                    });
                }

                this.obstacles.splice(i, 1);

                if (this.shield <= 0) {
                    this.lives--;
                    this.shield = 100;
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
            }
        }

        // Collide battery cores
        for (let i = this.cores.length - 1; i >= 0; i--) {
            const core = this.cores[i];
            const dist = Math.hypot(this.player.x - core.x, this.player.y - core.y);
            
            if (dist < this.player.size + core.size) {
                sfx.playCollect();
                this.shield = Math.min(100, this.shield + 15);
                this.score += 250;
                
                // Collect cyber particles
                for (let j = 0; j < 8; j++) {
                    this.particles.push({
                        x: core.x,
                        y: core.y,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 1.0,
                        decay: 0.05,
                        size: 2 + Math.random() * 3,
                        color: 'yellow'
                    });
                }

                this.cores.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines (subtle cyberpunk visual depth)
        this.drawGrid();

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color === 'cyan' ? '#00f2fe' : (p.color === 'yellow' ? '#fcf003' : '#ff0055');
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Draw collectible energy cores
        this.cores.forEach(c => {
            const bounce = Math.sin(c.pulse) * 3;
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ffcc';
            this.ctx.fillStyle = '#00ffcc';
            
            // Draw a diamond energy battery
            this.ctx.beginPath();
            this.ctx.moveTo(c.x, c.y - c.size + bounce);
            this.ctx.lineTo(c.x + c.size, c.y + bounce);
            this.ctx.lineTo(c.x, c.y + c.size + bounce);
            this.ctx.lineTo(c.x - c.size, c.y + bounce);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        });

        // Draw firewalls obstacles
        this.obstacles.forEach(o => {
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            const strokeColor = o.hue === 330 ? '#ff0077' : '#9900ff';
            this.ctx.shadowColor = strokeColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2;
            this.ctx.fillStyle = 'rgba(15, 10, 25, 0.8)';
            
            // Neon Cyber box
            this.ctx.beginPath();
            this.ctx.rect(o.x - o.width / 2, o.y - o.height / 2, o.width, o.height);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Internal HUD design lines in box
            this.ctx.strokeStyle = `rgba(${o.hue === 330 ? '255, 0, 119' : '153, 0, 255'}, 0.4)`;
            this.ctx.beginPath();
            this.ctx.moveTo(o.x - o.width / 2 + 5, o.y);
            this.ctx.lineTo(o.x + o.width / 2 - 5, o.y);
            this.ctx.stroke();
            this.ctx.restore();
        });

        // Draw player avatar (Cyberpunk delta ship)
        this.drawPlayer();
    }

    drawGrid() {
        const gridOffset = (this.distance * 2) % 40;
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
        this.ctx.lineWidth = 1;

        // Vertical lines mapping perspective
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines rushing forward
        for (let y = gridOffset; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawPlayer() {
        // Draw trailing boost shadows
        if (this.player.trail.length > 1) {
            this.ctx.save();
            this.ctx.lineWidth = 2;
            for (let i = 0; i < this.player.trail.length - 1; i++) {
                const ratio = i / this.player.trail.length;
                this.ctx.strokeStyle = this.isBoosting ? `rgba(0, 242, 254, ${ratio * 0.4})` : `rgba(139, 92, 246, ${ratio * 0.2})`;
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.trail[i].x, this.player.trail[i].y);
                this.ctx.lineTo(this.player.trail[i + 1].x, this.player.trail[i + 1].y);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        // Draw active delta ship
        this.ctx.save();
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = this.isBoosting ? '#00f2fe' : '#8b5cf6';
        this.ctx.fillStyle = '#110c22';
        this.ctx.strokeStyle = this.isBoosting ? '#00f2fe' : '#a78bfa';
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        // Nose point
        this.ctx.moveTo(this.player.x, this.player.y - this.player.size);
        // Right wing point
        this.ctx.lineTo(this.player.x + this.player.size, this.player.y + this.player.size * 0.8);
        // Rear inner gap
        this.ctx.lineTo(this.player.x, this.player.y + this.player.size * 0.3);
        // Left wing point
        this.ctx.lineTo(this.player.x - this.player.size, this.player.y + this.player.size * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Draw thruster fire glow
        this.ctx.fillStyle = this.isBoosting ? '#00f2fe' : '#ff00ff';
        this.ctx.beginPath();
        const thrusterLength = this.isBoosting ? 25 : 12;
        this.ctx.moveTo(this.player.x - 6, this.player.y + this.player.size * 0.4);
        this.ctx.lineTo(this.player.x, this.player.y + this.player.size * 0.4 + thrusterLength + Math.random() * 5);
        this.ctx.lineTo(this.player.x + 6, this.player.y + this.player.size * 0.4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }
}

// Global Game Engine instantiation
let gameEngine = null;

// ==========================================
// 3. PAGE LIFE-CYCLE & INTERACTION HANDLERS
// ==========================================
function initGame() {
    // Canvas target
    gameEngine = new DemoGame('TEMPLATE-4weird-gameCanvas');

    // Attach overlay buttons
    document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', () => {
        sfx.playMenuClick();
        startGame();
    });

    document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', () => {
        sfx.playMenuClick();
        resumeGame();
    });

    document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => {
        sfx.playMenuClick();
        startGame();
    });

    document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', () => {
        sfx.playMenuClick();
        startGame();
    });

    // Mute button attachment (if template contains it)
    const muteBtn = document.getElementById('TEMPLATE-4weird-mute-btn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const isMuted = sfx.toggleMute();
            muteBtn.innerHTML = isMuted ? '🔇 Muted' : '🔊 Sound';
            muteBtn.classList.toggle('active', isMuted);
        });
    }

    // Dynamic "More Games" Carousel injection
    initMoreGamesCarousel();

    // Start request animation frame loop
    let lastTime = performance.now();
    function loop(now) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        if (gameEngine && gameEngine.isActive && !gameEngine.isPaused) {
            gameEngine.tick(dt);
            gameEngine.draw();
        } else if (gameEngine && !gameEngine.isActive) {
            // Draw background stars/grid while inactive or waiting to start
            gameEngine.drawGrid();
        }

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

function startGame() {
    if (gameEngine) {
        gameEngine.start();
    }
}

function togglePause() {
    if (!gameEngine || !gameEngine.isActive) return;
    if (gameEngine.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {
    if (gameEngine) {
        gameEngine.pause();
    }
}

function resumeGame() {
    if (gameEngine) {
        gameEngine.resume();
    }
}

// Carousel populator from components.js ALL_GAMES array
function initMoreGamesCarousel() {
    const carouselContainer = document.getElementById('more-games-carousel-track');
    if (!carouselContainer) return;

    // Wait until ALL_GAMES is populated (from components.js)
    if (typeof ALL_GAMES !== 'undefined' && Array.isArray(ALL_GAMES)) {
        // Exclude current game (using slug 'neonracer' or default _TEMPLATE)
        const currentSlug = 'neonracer';
        const filteredGames = ALL_GAMES.filter(g => g.path !== currentSlug);

        // Build carousel HTML
        carouselContainer.innerHTML = filteredGames.map(game => `
            <div class="carousel-card" style="background: ${game.bg || 'var(--bg-card)'}">
                <div class="carousel-card-emoji">${game.emoji || '🎮'}</div>
                <h3>${game.title}</h3>
                <p>${game.desc}</p>
                <div class="carousel-tags">
                    ${(game.tags || []).slice(0, 2).map(t => `<span class="carousel-tag">${t}</span>`).join('')}
                </div>
                <a href="../../../games/html/${game.path}/index.html" class="carousel-play-btn">Launch Systems</a>
            </div>
        `).join('');

        // Basic Carousel Slide Buttons configuration
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        if (prevBtn && nextBtn) {
            let offset = 0;
            const cardWidth = 270; // width + gap
            
            prevBtn.addEventListener('click', () => {
                sfx.playMenuClick();
                offset = Math.min(0, offset + cardWidth);
                carouselContainer.style.transform = `translateX(${offset}px)`;
            });

            nextBtn.addEventListener('click', () => {
                sfx.playMenuClick();
                const maxOffset = -(filteredGames.length - 3) * cardWidth;
                offset = Math.max(maxOffset, offset - cardWidth);
                carouselContainer.style.transform = `translateX(${offset}px)`;
            });
        }
    }
}

// Clipboard copying for Share link
function copyGameLink() {
    sfx.playMenuClick();
    const tempInput = document.createElement('input');
    tempInput.value = window.location.href;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    const shareBtn = document.querySelector('.share-btn.copy');
    if (shareBtn) {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = '📂 Link Copied!';
        shareBtn.classList.add('copied');
        setTimeout(() => {
            shareBtn.innerHTML = originalText;
            shareBtn.classList.remove('copied');
        }, 2000);
    }
}

// Load initialization hook
window.addEventListener('load', () => {
    // Injected loading screen spinner fades out
    const spinner = document.getElementById('TEMPLATE-4weird-loading-screen');
    if (spinner) {
        setTimeout(() => {
            spinner.classList.add('hidden');
            initGame();
        }, 800);
    } else {
        initGame();
    }
});
