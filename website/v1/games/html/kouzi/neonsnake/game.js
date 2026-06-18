// Neon Snake - Cyberpunk Snake Game
// Game #2 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 600;

// Game state
let gameState = 'start';
let score = 0;
let highScore = parseInt(localStorage.getItem('neonSnakeHighScore')) || 0;
let animationId = null;
let gameSpeed = 120; // ms per move
let lastMoveTime = 0;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;

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

// Grid setup
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Snake
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

// Food
let food = { x: 0, y: 0 };
let foodType = 'normal';
let foodPulse = 0;

// Special foods
const foodTypes = [
    { type: 'normal', color: '#ff0066', points: 10, chance: 0.6 },
    { type: 'bonus', color: '#ffff00', points: 25, chance: 0.2 },
    { type: 'speed', color: '#00ffff', points: 15, chance: 0.1 },
    { type: 'slow', color: '#00ff66', points: 10, chance: 0.1 }
];

// Particles
let particles = [];

// Touch tracking
let touchStartX = 0;
let touchStartY = 0;

// Input
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState === 'start') startGame();
        else if (gameState === 'gameOver') restartGame();
        return;
    }
    
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
        return;
    }
    
    if (gameState !== 'playing') return;
    
    // Direction control
    switch(e.code) {
        case 'ArrowUp':
        case 'KeyW':
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'KeyA':
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'KeyD':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
    
    e.preventDefault();
});

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchStartY = touch.clientY - rect.top;
    
    if (gameState === 'start') startGame();
    else if (gameState === 'gameOver') restartGame();
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const dx = x - touchStartX;
    const dy = y - touchStartY;
    
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
            else if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        } else {
            // Vertical
            if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
            else if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        }
        touchStartX = x;
        touchStartY = y;
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
    score = 0;
    gameSpeed = 120;
    
    // Reset snake
    snake = [
        { x: 10, y: 15 },
        { x: 9, y: 15 },
        { x: 8, y: 15 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    
    particles = [];
    
    spawnFood();
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    lastMoveTime = performance.now();
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
    lastMoveTime = performance.now();
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neonSnakeHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = score;
    document.getElementById('TEMPLATE-4weird-high-score-final').textContent = highScore;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
    
    // Game over particles
    for (let i = 0; i < 30; i++) {
        createParticles(
            snake[0].x * gridSize + gridSize / 2,
            snake[0].y * gridSize + gridSize / 2,
            '#ff0066'
        );
    }
}

function restartGame() {
    startGame();
}

function spawnFood() {
    let newFood;
    let attempts = 0;
    
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        attempts++;
    } while (isOnSnake(newFood.x, newFood.y) && attempts < 100);
    
    food = newFood;
    
    // Determine food type
    const rand = Math.random();
    let cumulative = 0;
    for (const ft of foodTypes) {
        cumulative += ft.chance;
        if (rand < cumulative) {
            foodType = ft.type;
            break;
        }
    }
}

function isOnSnake(x, y) {
    return snake.some(segment => segment.x === x && segment.y === y);
}

function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 4 + 2,
            color: color,
            life: 20 + Math.random() * 10
        });
    }
}

function update() {
    direction = { ...nextDirection };
    
    // Move snake
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        playSound(100, 0.3, 'sawtooth', 0.15);
        gameOver();
        return;
    }
    
    // Self collision
    if (isOnSnake(head.x, head.y)) {
        playSound(100, 0.3, 'sawtooth', 0.15);
        gameOver();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Food collision
    if (head.x === food.x && head.y === food.y) {
        // Find food type and points
        const ft = foodTypes.find(f => f.type === foodType) || foodTypes[0];
        score += ft.points;
        
        // Effects
        const fx = food.x * gridSize + gridSize / 2;
        const fy = food.y * gridSize + gridSize / 2;
        createParticles(fx, fy, ft.color, 12);
        
        playSound(660 + ft.points * 5, 0.1, 'sine', 0.1);
        
        // Speed up slightly
        if (foodType === 'speed') {
            gameSpeed = Math.max(50, gameSpeed - 15);
        } else if (foodType === 'slow') {
            gameSpeed = Math.min(200, gameSpeed + 20);
        } else {
            gameSpeed = Math.max(60, gameSpeed - 2);
        }
        
        spawnFood();
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    // Food pulse animation
    foodPulse += 0.15;
}

function draw() {
    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    // Border glow
    ctx.strokeStyle = 'rgba(255, 0, 102, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Food
    const ft = foodTypes.find(f => f.type === foodType) || foodTypes[0];
    const pulseScale = 1 + Math.sin(foodPulse) * 0.15;
    const foodSize = gridSize * 0.6 * pulseScale;
    const foodX = food.x * gridSize + gridSize / 2;
    const foodY = food.y * gridSize + gridSize / 2;
    
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(foodX - 2, foodY - 2, foodSize / 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Snake body
    for (let i = snake.length - 1; i >= 0; i--) {
        const segment = snake[i];
        const isHead = i === 0;
        
        // Color gradient along body
        const hue = 180 + (i / snake.length) * 60; // cyan to magenta
        const color = isHead ? '#00ffff' : `hsl(${hue}, 100%, 60%)`;
        
        const size = isHead ? gridSize * 0.85 : gridSize * 0.7;
        const offset = (gridSize - size) / 2;
        
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHead ? 15 : 8;
        
        // Rounded rectangle for segments
        const x = segment.x * gridSize + offset;
        const y = segment.y * gridSize + offset;
        const radius = isHead ? 6 : 4;
        
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, radius);
        ctx.fill();
        
        // Eyes on head
        if (isHead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            
            const eyeSize = 3;
            let eye1X, eye1Y, eye2X, eye2Y;
            
            if (direction.x === 1) { // right
                eye1X = x + size * 0.65; eye1Y = y + size * 0.3;
                eye2X = x + size * 0.65; eye2Y = y + size * 0.7;
            } else if (direction.x === -1) { // left
                eye1X = x + size * 0.25; eye1Y = y + size * 0.3;
                eye2X = x + size * 0.25; eye2Y = y + size * 0.7;
            } else if (direction.y === 1) { // down
                eye1X = x + size * 0.3; eye1Y = y + size * 0.65;
                eye2X = x + size * 0.7; eye2Y = y + size * 0.65;
            } else { // up
                eye1X = x + size * 0.3; eye1Y = y + size * 0.25;
                eye2X = x + size * 0.7; eye2Y = y + size * 0.25;
            }
            
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.shadowBlur = 0;
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 22px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`SCORE: ${score}`, 15, 35);
    
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LENGTH: ${snake.length}`, canvas.width - 15, 35);
    
    ctx.shadowBlur = 0;
}

function gameLoop(timestamp = 0) {
    if (gameState !== 'playing') return;
    
    if (timestamp - lastMoveTime >= gameSpeed) {
        update();
        lastMoveTime = timestamp;
    }
    
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Start screen animation
let startAnim = 0;
function drawStartScreen() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    startAnim += 0.02;
    
    // Animated grid
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.05 + Math.sin(startAnim) * 0.02})`;
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        const offset = (i * gridSize + startAnim * 20) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, canvas.height);
        ctx.stroke();
    }
    
    // Demo snake (decorative)
    const demoSnake = [];
    const baseY = Math.floor(tileCount * 0.7);
    for (let i = 0; i < 8; i++) {
        demoSnake.push({
            x: (Math.floor(startAnim * 3) + i) % (tileCount + 4) - 2,
            y: baseY + Math.floor(Math.sin(startAnim + i * 0.5) * 2)
        });
    }
    
    demoSnake.forEach((seg, i) => {
        const hue = 180 + (i / demoSnake.length) * 60;
        const size = gridSize * 0.6;
        const x = seg.x * gridSize + (gridSize - size) / 2;
        const y = seg.y * gridSize + (gridSize - size) / 2;
        
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 4);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();
