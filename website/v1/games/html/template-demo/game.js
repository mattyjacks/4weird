/**
 * Template Demo - 4weird Games
 * A minimal example showing the standardized game structure.
 * Copy this pattern for your own games.
 */

(function() {
    'use strict';
    
    // ===== SETUP =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // ===== GAME STATE =====
    const state = {
        score: 0,
        highScore: parseInt(localStorage.getItem('template-demo_highScore') || '0'),
        isPlaying: false,
        isPaused: false,
        frames: 0
    };
    
    // ===== PLAYER =====
    const player = {
        x: 400,
        y: 300,
        radius: 20,
        color: '#8b5cf6',
        speed: 200,
        vx: 0,
        vy: 0
    };
    
    const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    let colorIndex = 0;
    
    // ===== INPUT =====
    const keys = {};
    const touch = { active: false, x: 0, y: 0, startX: 0, startY: 0 };
    
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (state.isPlaying) togglePause();
        }
        
        if (e.code === 'Space' && state.isPlaying && !state.isPaused) {
            e.preventDefault();
            colorIndex = (colorIndex + 1) % colors.length;
            player.color = colors[colorIndex];
            state.score += 10;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Touch handling for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touch.active = true;
        const t = e.touches[0];
        touch.startX = t.clientX;
        touch.startY = t.clientY;
        touch.x = t.clientX;
        touch.y = t.clientY;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!touch.active) return;
        const t = e.touches[0];
        touch.x = t.clientX;
        touch.y = t.clientY;
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
        if (touch.active) {
            // Tap to change color
            if (state.isPlaying && !state.isPaused) {
                colorIndex = (colorIndex + 1) % colors.length;
                player.color = colors[colorIndex];
                state.score += 10;
            }
        }
        touch.active = false;
    });
    
    // ===== RESIZE =====
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    // ===== GAME LOOP =====
    let lastTime = 0;
    
    function gameLoop(timestamp) {
        if (!state.isPlaying || state.isPaused) return;
        
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;
        
        update(dt);
        render();
        
        state.frames++;
        requestAnimationFrame(gameLoop);
    }
    
    function update(dt) {
        // Movement
        let dx = 0;
        let dy = 0;
        
        // Keyboard
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        
        // Touch - relative movement
        if (touch.active) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = 800 / rect.width;
            const scaleY = 600 / rect.height;
            dx = (touch.x - touch.startX) * scaleX * 0.01;
            dy = (touch.y - touch.startY) * scaleY * 0.01;
        }
        
        // Normalize and apply
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 1) {
                dx /= len;
                dy /= len;
            }
            player.x += dx * player.speed * dt;
            player.y += dy * player.speed * dt;
        }
        
        // Boundaries
        const margin = player.radius;
        player.x = Math.max(margin, Math.min(800 - margin, player.x));
        player.y = Math.max(margin, Math.min(600 - margin, player.y));
        
        // Score for staying alive
        if (state.frames % 60 === 0) {
            state.score += 1;
        }
    }
    
    function render() {
        const w = 800;
        const h = 600;
        
        // Clear
        ctx.fillStyle = '#1a1a25';
        ctx.fillRect(0, 0, w, h);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y <= h; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        // Player glow
        const gradient = ctx.createRadialGradient(
            player.x, player.y, 0,
            player.x, player.y, player.radius * 2
        );
        gradient.addColorStop(0, player.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Player
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // UI text
        ctx.fillStyle = '#f5f5f5';
        ctx.font = '20px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + state.score, 20, 30);
        ctx.fillText('High: ' + state.highScore, 20, 55);
        
        // Touch indicator
        if (touch.active) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(touch.startX, touch.startY, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // ===== CONTROLS =====
    function togglePause() {
        state.isPaused = !state.isPaused;
        const overlay = document.getElementById('pause-screen');
        
        if (state.isPaused) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }
    
    function startGame() {
        state.isPlaying = true;
        state.isPaused = false;
        state.score = 0;
        state.frames = 0;
        player.x = 400;
        player.y = 300;
        player.color = colors[0];
        colorIndex = 0;
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        
        resizeCanvas();
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
    
    function endGame() {
        state.isPlaying = false;
        
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('template-demo_highScore', state.highScore);
        }
        
        document.getElementById('final-score').textContent = state.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    // ===== EVENT WIRING =====
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        startGame();
    });
    
    document.getElementById('resume-btn').addEventListener('click', () => {
        if (state.isPaused) togglePause();
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
        togglePause();
        startGame();
    });
    
    window.addEventListener('resize', resizeCanvas);
    
    // ===== INIT =====
    document.getElementById('high-score').textContent = state.highScore;
    resizeCanvas();
    
    console.log('[Template Demo] 4weird Games - Initialized');
})();
