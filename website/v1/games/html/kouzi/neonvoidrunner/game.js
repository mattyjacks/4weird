// Neon Void Runner - Cyberpunk Endless Runner
// Game #1 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 600;

// Game state
let gameState = 'start';
let distance = 0;
let highScore = parseInt(localStorage.getItem('neonVoidRunnerHighScore')) || 0;
let speed = 4;
let animationId = null;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';

// Audio
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, duration, type = 'square', volume = 0.08) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Player
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 120,
    width: 40,
    height: 60,
    color: '#00ffff',
    speed: 6,
    shield: false,
    shieldTimer: 0
};

// Lanes for positioning
const laneCount = 3;
const laneWidth = canvas.width / laneCount;

// Obstacles
let obstacles = [];
let obstacleTimer = 0;

// Collectibles
let collectibles = [];
let collectibleTimer = 0;

// Background layers
let bgOffset = 0;
let gridOffset = 0;

// Particles
let particles = [];

// Input
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        if (gameState === 'start') startGame();
        else if (gameState === 'gameOver') restartGame();
    }
    
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
    }
    
    // Lane switching with arrow keys
    if (gameState === 'playing') {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.x > laneWidth / 2) {
            player.x -= laneWidth;
            playSound(440, 0.05, 'sine', 0.05);
        }
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.x < canvas.width - laneWidth * 1.5) {
            player.x += laneWidth;
            playSound(440, 0.05, 'sine', 0.05);
        }
    }
});

document.addEventListener('keyup', (e) => keys[e.code] = false);

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'gameOver') {
        restartGame();
    } else if (gameState === 'playing') {
        if (x < canvas.width / 2) {
            player.x = Math.max(laneWidth / 2 - player.width / 2, player.x - laneWidth);
        } else {
            player.x = Math.min(canvas.width - laneWidth * 1.5 - player.width / 2, player.x + laneWidth);
        }
        playSound(440, 0.05, 'sine', 0.05);
    }
});

// Mouse controls
canvas.addEventListener('click', (e) => {
    if (gameState === 'playing') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < canvas.width / 2) {
            player.x = Math.max(laneWidth / 2 - player.width / 2, player.x - laneWidth);
        } else {
            player.x = Math.min(canvas.width - laneWidth * 1.5 - player.width / 2, player.x + laneWidth);
        }
    }
});

// Template UI bindings
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);
document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', resumeGame);
document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', restartGame);
document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', restartGame);

// Fullscreen
document.getElementById('TEMPLATE-4weird-fullscreen-btn').addEventListener('click', () => {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!document.fullscreenElement) {
        frame.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
});

function startGame() {
    initAudio();
    gameState = 'playing';
    distance = 0;
    speed = 4;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 120;
    player.shield = false;
    
    obstacles = [];
    collectibles = [];
    particles = [];
    obstacleTimer = 0;
    collectibleTimer = 0;
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    gameLoop();
}

function pauseGame() {
    gameState = 'paused';
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
    if (animationId) cancelAnimationFrame(animationId);
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    
    if (distance > highScore) {
        highScore = Math.floor(distance);
        localStorage.setItem('neonVoidRunnerHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = Math.floor(distance);
    document.getElementById('TEMPLATE-4weird-high-score-final').textContent = highScore;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['block', 'spike', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = ['#ff0066', '#ff00ff', '#ff6600'];
    
    obstacles.push({
        x: lane * laneWidth + laneWidth / 2 - 25,
        y: -60,
        width: 50,
        height: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type
    });
}

function spawnCollectible() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['coin', 'shield', 'slowmo'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { coin: '#ffff00', shield: '#00ff66', slowmo: '#00ffff' };
    
    collectibles.push({
        x: lane * laneWidth + laneWidth / 2 - 15,
        y: -30,
        width: 30,
        height: 30,
        type: type,
        color: colors[type],
        rotation: 0
    });
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const vel = Math.random() * 4 + 2;
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * vel,
            vy: Math.sin(angle) * vel,
            size: Math.random() * 4 + 2,
            color: color,
            life: 25 + Math.random() * 10
        });
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function update() {
    // Update distance and speed
    distance += speed * 0.1;
    speed = 4 + distance * 0.002; // Gradually increase speed
    
    // Background scrolling
    bgOffset += speed * 0.5;
    gridOffset += speed * 2;
    if (gridOffset > 100) gridOffset = 0;
    
    // Player input (smooth movement with keyboard hold)
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] || keys['KeyW']) {
        speed = Math.min(speed + 0.1, 12);
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        speed = Math.max(speed - 0.2, 2);
    }
    
    // Clamp player position
    player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));
    
    // Shield timer
    if (player.shield) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) player.shield = false;
    }
    
    // Spawn obstacles
    obstacleTimer++;
    const spawnRate = Math.max(30, 80 - distance * 0.05);
    if (obstacleTimer >= spawnRate) {
        spawnObstacle();
        obstacleTimer = 0;
    }
    
    // Spawn collectibles
    collectibleTimer++;
    if (collectibleTimer >= 120) {
        spawnCollectible();
        collectibleTimer = 0;
    }
    
    // Update obstacles
    obstacles = obstacles.filter(obs => {
        obs.y += speed * 2;
        return obs.y < canvas.height + 100;
    });
    
    // Update collectibles
    collectibles = collectibles.filter(col => {
        col.y += speed * 2;
        col.rotation += 0.05;
        return col.y < canvas.height + 50;
    });
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life--;
        p.size *= 0.96;
        return p.life > 0;
    });
    
    // Check obstacle collisions
    for (const obs of obstacles) {
        if (checkCollision(player, obs)) {
            if (player.shield) {
                player.shield = false;
                createParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#00ff66', 15);
                const idx = obstacles.indexOf(obs);
                if (idx > -1) obstacles.splice(idx, 1);
                playSound(220, 0.2, 'sawtooth', 0.1);
            } else {
                createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff0066', 25);
                playSound(100, 0.5, 'sawtooth', 0.15);
                gameOver();
                return;
            }
        }
    }
    
    // Check collectible collisions
    collectibles = collectibles.filter(col => {
        if (checkCollision(player, col)) {
            createParticles(col.x + col.width / 2, col.y + col.height / 2, col.color, 8);
            
            switch (col.type) {
                case 'coin':
                    distance += 50; // Bonus distance
                    playSound(880, 0.1, 'sine', 0.08);
                    break;
                case 'shield':
                    player.shield = true;
                    player.shieldTimer = 300; // 5 seconds
                    playSound(660, 0.15, 'sine', 0.1);
                    break;
                case 'slowmo':
                    speed = Math.max(speed * 0.5, 2);
                    playSound(440, 0.2, 'sine', 0.08);
                    break;
            }
            return false;
        }
        return true;
    });
    
    // Engine trail particles
    if (Math.random() < 0.4) {
        particles.push({
            x: player.x + player.width / 2 + (Math.random() - 0.5) * 10,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 1,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 3 + 2,
            color: '#ff6600',
            life: 15 + Math.random() * 10
        });
    }
}

function draw() {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.5, '#1a0a30');
    gradient.addColorStop(1, '#0a0020');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines (perspective effect)
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.15)';
    ctx.lineWidth = 1;
    
    // Horizontal grid
    for (let i = 0; i < 10; i++) {
        const y = (i * 100 + gridOffset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Lane dividers
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -gridOffset * 0.5;
    
    for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    
    // Side glow
    const leftGlow = ctx.createLinearGradient(0, 0, 60, 0);
    leftGlow.addColorStop(0, 'rgba(255, 0, 102, 0.3)');
    leftGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, 60, canvas.height);
    
    const rightGlow = ctx.createLinearGradient(canvas.width, 0, canvas.width - 60, 0);
    rightGlow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
    rightGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(canvas.width - 60, 0, 60, canvas.height);
    
    // Particles (underneath)
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 35;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 20;
        
        if (obs.type === 'block') {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Inner detail
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, 5);
        } else if (obs.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
        } else {
            // barrier
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height * 0.4);
            ctx.fillRect(obs.x, obs.y + obs.height * 0.6, obs.width, obs.height * 0.4);
        }
    });
    ctx.shadowBlur = 0;
    
    // Collectibles
    collectibles.forEach(col => {
        ctx.save();
        ctx.translate(col.x + col.width / 2, col.y + col.height / 2);
        ctx.rotate(col.rotation);
        
        ctx.fillStyle = col.color;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 15;
        
        if (col.type === 'coin') {
            ctx.beginPath();
            ctx.arc(0, 0, col.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, 0);
        } else if (col.type === 'shield') {
            ctx.beginPath();
            ctx.moveTo(0, -col.height / 2);
            ctx.lineTo(col.width / 2, -col.height / 4);
            ctx.lineTo(col.width / 2, col.height / 4);
            ctx.lineTo(0, col.height / 2);
            ctx.lineTo(-col.width / 2, col.height / 4);
            ctx.lineTo(-col.width / 2, -col.height / 4);
            ctx.closePath();
            ctx.fill();
        } else {
            // slowmo - hourglass shape
            ctx.beginPath();
            ctx.moveTo(-col.width / 3, -col.height / 2);
            ctx.lineTo(col.width / 3, -col.height / 2);
            ctx.lineTo(-col.width / 3, col.height / 2);
            ctx.lineTo(col.width / 3, col.height / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    });
    ctx.shadowBlur = 0;
    
    // Player ship
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 25;
    
    // Ship body
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width * 0.3, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.7, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width / 2, player.y + player.height * 0.4, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shield effect
    if (player.shield) {
        ctx.strokeStyle = '#00ff66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`${Math.floor(distance)}m`, 15, 35);
    
    ctx.fillStyle = '#ff0066';
    ctx.shadowColor = '#ff0066';
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${speed.toFixed(1)}x`, canvas.width - 15, 35);
    
    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Start screen animation
function drawStartScreen() {
    ctx.fillStyle = '#0a0020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated grid
    gridOffset += 1;
    if (gridOffset > 100) gridOffset = 0;
    
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const y = (i * 100 + gridOffset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();
