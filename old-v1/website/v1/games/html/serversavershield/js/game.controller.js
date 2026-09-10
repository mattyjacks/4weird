// Game Controller - Main Thread
// Handles rendering and user input, offloads logic to worker

class GameController {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.offscreen = null;
        this.worker = null;
        this.initialized = false;
        
        // Render state (received from worker)
        this.renderState = {
            player: null,
            enemies: [],
            bullets: [],
            particles: [],
            powerups: [],
            floatingTexts: [],
            servers: [],
            gameState: null,
            wave: 1,
            score: 0,
            kills: 0,
            comboCount: 0,
            comboTimer: 0,
            currentWeapon: 'standard',
            weaponTimer: 0,
            shieldTimer: 0,
            isShooting: false
        };
        
        // Input state
        this.input = { x: 400, y: 300, shooting: false };
        this.lastFireTime = 0;
        this.fireRate = 8; // Frames between shots
        
        // Visual effects cache
        this.starField = [];
        this.frameCount = 0;
        
        // FPS tracking
        this.fps = 60;
        this.lastFrameTime = 0;
        this.frameTimes = new Float32Array(60);
        this.frameTimeIndex = 0;
        
        // Bind methods
        this.handleWorkerMessage = this.handleWorkerMessage.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.render = this.render.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas not found:', canvasId);
            return false;
        }
        
        // Create OffscreenCanvas for worker rendering
        this.offscreen = this.canvas.transferControlToOffscreen();
        
        // Get 2D context for main thread (fallback if needed)
        // Note: With OffscreenCanvas, we can't use this.ctx directly
        // Instead, we'll render to the offscreen canvas from worker
        
        // Initialize star field for background
        this.initStarField();
        
        // Initialize worker
        this.initWorker();
        
        // Setup input handlers
        this.setupInput();
        
        this.initialized = true;
        return true;
    }
    
    initWorker() {
        // Create worker
        this.worker = new Worker('js/game.worker.js');
        this.worker.onmessage = this.handleWorkerMessage;
        
        // Transfer offscreen canvas to worker
        this.worker.postMessage({
            type: 'init',
            canvas: this.offscreen,
            width: this.canvas.width || 800,
            height: this.canvas.height || 600
        }, [this.offscreen]);
        
        // Start game loop
        requestAnimationFrame(this.gameLoop);
    }
    
    initStarField() {
        // Pre-generate star positions for background
        const starCount = 100;
        this.starField = new Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            this.starField[i] = {
                x: Math.random() * 800,
                y: Math.random() * 600,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                twinkle: Math.random() * 0.1
            };
        }
    }
    
    handleWorkerMessage(e) {
        const data = e.data;
        
        switch (data.type) {
            case 'render':
                // Update render state with data from worker
                this.renderState = data;
                break;
                
            case 'gameOver':
                this.handleGameOver(data);
                break;
                
            case 'victory':
                this.handleVictory(data);
                break;
                
            case 'serverDamage':
                // Handle server damage notification
                this.triggerScreenShake(3, 200);
                break;
        }
    }
    
    setupInput() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scale = this.canvas.width / rect.width;
            this.input.x = (e.clientX - rect.left) * scale;
            this.input.y = (e.clientY - rect.top) * scale;
            
            // Send to worker
            this.worker.postMessage({
                type: 'input',
                x: this.input.x,
                y: this.input.y
            });
        });
        
        // Touch movement (mobile)
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const scale = this.canvas.width / rect.width;
            const touch = e.touches[0];
            this.input.x = (touch.clientX - rect.left) * scale;
            this.input.y = (touch.clientY - rect.top) * scale;
            
            this.worker.postMessage({
                type: 'input',
                x: this.input.x,
                y: this.input.y
            });
        }, { passive: false });
        
        // Shooting toggle
        this.canvas.addEventListener('mousedown', () => {
            this.input.shooting = !this.input.shooting;
            this.worker.postMessage({
                type: 'shoot',
                shooting: this.input.shooting
            });
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.shooting = !this.input.shooting;
            this.worker.postMessage({
                type: 'shoot',
                shooting: this.input.shooting
            });
            
            // Also update position
            const rect = this.canvas.getBoundingClientRect();
            const scale = this.canvas.width / rect.width;
            const touch = e.touches[0];
            this.input.x = (touch.clientX - rect.left) * scale;
            this.input.y = (touch.clientY - rect.top) * scale;
            
            this.worker.postMessage({
                type: 'input',
                x: this.input.x,
                y: this.input.y
            });
        }, { passive: false });
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });
    }
    
    togglePause() {
        const newPaused = !this.renderState.paused;
        this.worker.postMessage({ type: 'pause', paused: newPaused });
    }
    
    handleInput() {
        // Handle shooting on main thread (for lower latency)
        if (this.input.shooting && this.renderState.player) {
            const now = performance.now();
            if (now - this.lastFireTime > this.fireRate * 16.67) { // Convert frames to ms
                this.fireBullet();
                this.lastFireTime = now;
            }
        }
    }
    
    fireBullet() {
        const player = this.renderState.player;
        if (!player) return;
        
        // Calculate weapon properties based on current weapon
        let weapon = this.getWeaponProperties();
        
        // Fire bullets
        for (let i = 0; i < weapon.bulletCount; i++) {
            const angle = -Math.PI / 2 + (i - (weapon.bulletCount - 1) / 2) * weapon.spread;
            const vx = Math.cos(angle) * weapon.speed;
            const vy = Math.sin(angle) * weapon.speed;
            
            this.worker.postMessage({
                type: 'fireBullet',
                x: player.x,
                y: player.y - player.radius,
                vx: vx,
                vy: vy,
                damage: weapon.damage,
                color: weapon.color
            });
        }
    }
    
    getWeaponProperties() {
        // Simplified weapon data
        const weapons = {
            standard: { fireRate: 8, bulletCount: 1, spread: 0, speed: 10, color: '#fbbf24', damage: 1 },
            rapidfire: { fireRate: 3, bulletCount: 3, spread: 0.4, speed: 10, color: '#eab308', damage: 1 },
            sniper: { fireRate: 15, bulletCount: 1, spread: 0, speed: 20, color: '#ec4899', damage: 3 },
            spreadshot: { fireRate: 8, bulletCount: 5, spread: 0.8, speed: 8, color: '#8b5cf6', damage: 0.8 },
            laser: { fireRate: 4, bulletCount: 1, spread: 0, speed: 25, color: '#06b6d4', damage: 2 }
        };
        
        return weapons[this.renderState.currentWeapon] || weapons.standard;
    }
    
    gameLoop(currentTime) {
        // Calculate FPS
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.frameTimes[this.frameTimeIndex] = deltaTime;
        this.frameTimeIndex = (this.frameTimeIndex + 1) % 60;
        
        // Average FPS
        const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / 60;
        this.fps = Math.round(1000 / avgDelta);
        
        // Handle input
        this.handleInput();
        
        // Update visual effects
        this.updateStarField();
        
        // Note: Rendering is now done by the worker via OffscreenCanvas
        // The worker receives the render command and draws directly to canvas
        
        this.frameCount++;
        requestAnimationFrame(this.gameLoop);
    }
    
    updateStarField() {
        // Update star positions for parallax effect
        for (const star of this.starField) {
            star.y += star.speed;
            if (star.y > 600) {
                star.y = 0;
                star.x = Math.random() * 800;
            }
            star.brightness += star.twinkle;
            if (star.brightness > 1 || star.brightness < 0.3) {
                star.twinkle *= -1;
            }
        }
    }
    
    triggerScreenShake(intensity, duration) {
        // Screen shake is handled by the worker
        this.worker.postMessage({
            type: 'screenShake',
            intensity,
            duration
        });
    }
    
    handleGameOver(data) {
        // Show game over UI
        document.getElementById('gameOverScreen')?.classList.remove('hidden');
        document.getElementById('finalScore')?.textContent = data.score;
        document.getElementById('finalWave')?.textContent = data.wave;
        document.getElementById('finalKills')?.textContent = data.kills;
    }
    
    handleVictory(data) {
        // Show victory UI
        document.getElementById('victoryScreen')?.classList.remove('hidden');
        document.getElementById('victoryScore')?.textContent = data.score;
        document.getElementById('victoryCombo')?.textContent = data.maxCombo;
        document.getElementById('victoryBalance')?.textContent = Math.floor(data.balance);
    }
    
    reset() {
        this.worker.postMessage({ type: 'reset' });
        this.input.shooting = false;
    }
    
    getFPS() {
        return this.fps;
    }
}

// Create global instance
window.gameController = new GameController();
