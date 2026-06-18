// Neon Racer - Cyberpunk Traffic Dodger
// Game #5 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 600;

// Game state
let gameState = 'start';
let distance = 0;
let highScore = parseInt(localStorage.getItem('neonRacerHighScore')) || 0;
let coins = 0;
let speed = 3;
let animationId = null;

// Update high score
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';

// Audio
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, duration, type = 'square', volume = 0.06) {
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

// Road
const roadLines = [];
const laneCount = 3;
const laneWidth = canvas.width / laneCount;

for (let i = 0; i < 10; i++) {
    roadLines.push({ y: i * 80 });
}

// Player car
const player = {
    lane: 1,
    x: laneWidth * 1 + laneWidth / 2 - 20,
    y: canvas.height - 120,
    width: 40,
    height: 70,
    color: '#00ffff',
    targetX: 0
};
player.targetX = player.x;

// Enemy cars
let enemies = [];
let enemySpawnTimer = 0;

// Coins
let coinItems = [];
let coinSpawnTimer = 0;

// Power-ups
let powerUps = [];

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
    
    // Lane switching
    if (gameState === 'playing') {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > 0) {
            player.lane--;
            player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
            playSound(440, 0.05, 'sine', 0.05);
        }
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < laneCount - 1) {
            player.lane++;
            player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
            playSound(440, 0.05, 'sine', 0.05);
        }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            speed = Math.min(speed + 0.5, 8);
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            speed = Math.max(speed - 0.5, 2);
        }
    }
    
    e.preventDefault();
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
        if (x < canvas.width / 2 && player.lane > 0) {
            player.lane--;
            player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
        } else if (x >= canvas.width / 2 && player.lane < laneCount - 1) {
            player.lane++;
            player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
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
    coins = 0;
    speed = 3;
    
    player.lane = 1;
    player.x = laneWidth * 1 + laneWidth / 2 - player.width / 2;
    player.targetX = player.x;
    
    enemies = [];
    coinItems = [];
    powerUps = [];
    particles = [];
    
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
        localStorage.setItem('neonRacerHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = Math.floor(distance);
    document.getElementById('TEMPLATE-4weird-final-coins').textContent = coins;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function spawnEnemy() {
    const lane = Math.floor(Math.random() * laneCount);
    const colors = ['#ff0066', '#ff00ff', '#ffff00', '#ff6600'];
    
    enemies.push({
        lane: lane,
        x: laneWidth * lane + laneWidth / 2 - 20,
        y: -80,
        width: 40,
        height: 70,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: speed * (0.7 + Math.random() * 0.4)
    });
}

function spawnCoin() {
    const lane = Math.floor(Math.random() * laneCount);
    coinItems.push({
        lane: lane,
        x: laneWidth * lane + laneWidth / 2,
        y: -20,
        radius: 12,
        rotation: 0
    });
}

function spawnPowerUp() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['speed', 'slow', 'shield', 'magnet'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { speed: '#00ff66', slow: '#00ffff', shield: '#ffff00', magnet: '#ff00ff' };
    
    powerUps.push({
        lane: lane,
        x: laneWidth * lane + laneWidth / 2 - 15,
        y: -30,
        width: 30,
        height: 30,
        type: type,
        color: colors[type]
    });
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            color: color,
            life: 25
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
    // Smooth player movement
    player.x += (player.targetX - player.x) * 0.2;
    
    // Road lines
    roadLines.forEach(line => {
        line.y += speed * 2;
        if (line.y > canvas.height) {
            line.y = -40;
        }
    });
    
    // Distance
    distance += speed * 0.1;
    
    // Speed increase over time
    speed += 0.001;
    
    // Spawn enemies
    enemySpawnTimer++;
    const spawnRate = Math.max(40, 100 - distance * 0.05);
    if (enemySpawnTimer >= spawnRate) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }
    
    // Spawn coins
    coinSpawnTimer++;
    if (coinSpawnTimer >= 80) {
        spawnCoin();
        coinSpawnTimer = 0;
    }
    
    // Spawn power-ups occasionally
    if (Math.random() < 0.003) {
        spawnPowerUp();
    }
    
    // Update enemies
    enemies = enemies.filter(enemy => {
        enemy.y += speed * 2;
        return enemy.y < canvas.height + 100;
    });
    
    // Update coins
    coinItems = coinItems.filter(coin => {
        coin.y += speed * 2;
        coin.rotation += 0.1;
        return coin.y < canvas.height + 50;
    });
    
    // Update power-ups
    powerUps = powerUps.filter(pu => {
        pu.y += speed * 2;
        return pu.y < canvas.height + 50;
    });
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    // Collision - enemies
    for (const enemy of enemies) {
        if (checkCollision(player, enemy)) {
            playSound(150, 0.3, 'sawtooth', 0.1);
            createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff0066', 20);
            gameOver();
            return;
        }
    }
    
    // Collision - coins
    coinItems = coinItems.filter(coin => {
        const dx = (player.x + player.width / 2) - coin.x;
        const dy = (player.y + player.height / 2) - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 30) {
            coins++;
            playSound(880, 0.08, 'sine', 0.08);
            createParticles(coin.x, coin.y, '#ffff00', 6);
            return false;
        }
        return true;
    });
    
    // Collision - power-ups
    powerUps = powerUps.filter(pu => {
        if (checkCollision(player, pu)) {
            applyPowerUp(pu.type);
            playSound(660, 0.15, 'sine', 0.1);
            createParticles(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.color, 10);
            return false;
        }
        return true;
    });
}

function applyPowerUp(type) {
    switch (type) {
        case 'speed':
            speed = Math.min(speed + 2, 10);
            break;
        case 'slow':
            speed = Math.max(speed - 1.5, 2);
            break;
        case 'shield':
            // Shield - give bonus points
            distance += 100;
            break;
        case 'magnet':
            // Magnet - give bonus coins
            coins += 5;
            break;
    }
}

function drawCar(x, y, width, height, color, isPlayer = false) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlayer ? 20 : 10;
    
    // Car body
    ctx.fillRect(x, y, width, height);
    
    // Windshield
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 0;
    ctx.fillRect(x + 5, y + 10, width - 10, 20);
    
    // Headlights
    if (isPlayer) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x + 8, y + 5, 4, 0, Math.PI * 2);
        ctx.arc(x + width - 8, y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + 8, y + height - 5, 4, 0, Math.PI * 2);
        ctx.arc(x + width - 8, y + height - 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
}

function draw() {
    // Background - road
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road edges
    ctx.fillStyle = '#ff0066';
    ctx.fillRect(0, 0, 4, canvas.height);
    ctx.fillRect(canvas.width - 4, 0, 4, canvas.height);
    
    // Lane lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    roadLines.forEach(line => {
        for (let i = 1; i < laneCount; i++) {
            ctx.fillRect(i * laneWidth - 2, line.y, 4, 40);
        }
    });
    
    // City skyline silhouette (background)
    ctx.fillStyle = 'rgba(100, 50, 150, 0.2)';
    for (let i = 0; i < 10; i++) {
        const bx = i * 45;
        const bh = 50 + Math.sin(i * 1.5) * 30;
        ctx.fillRect(bx, canvas.height - bh - 100, 35, bh);
    }
    
    // Coins
    coinItems.forEach(coin => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.scale(Math.cos(coin.rotation) * 0.5 + 0.6, 1);
        
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        
        ctx.restore();
        ctx.shadowBlur = 0;
    });
    
    // Power-ups
    powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
        
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { speed: '⚡', slow: '🐢', shield: '🛡️', magnet: '🧲' };
        ctx.fillText(icons[pu.type] || '?', pu.x + pu.width / 2, pu.y + pu.height / 2);
    });
    
    // Enemies
    enemies.forEach(enemy => {
        drawCar(enemy.x, enemy.y, enemy.width, enemy.height, enemy.color, false);
    });
    
    // Player car
    drawCar(player.x, player.y, player.width, player.height, player.color, true);
    
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(distance)}m`, 10, 25);
    
    ctx.fillStyle = '#ffff00';
    ctx.textAlign = 'right';
    ctx.fillText(`💰 ${coins}`, canvas.width - 10, 25);
    
    ctx.fillStyle = '#ff0066';
    ctx.font = '12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${speed.toFixed(1)}x`, canvas.width / 2, 25);
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Start screen animation
function drawStartScreen() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road lines animation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roadLines.forEach(line => {
        line.y += 1;
        if (line.y > canvas.height) line.y = -40;
        for (let i = 1; i < laneCount; i++) {
            ctx.fillRect(i * laneWidth - 2, line.y, 4, 40);
        }
    });
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();
