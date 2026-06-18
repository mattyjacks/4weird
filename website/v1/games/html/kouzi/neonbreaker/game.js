// Neon Breaker - Cyberpunk Brick Breaker
// Game #3 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game state
let gameState = 'start'; // start, playing, paused, gameOver
let score = 0;
let highScore = parseInt(localStorage.getItem('neonBreakerHighScore')) || 0;
let lives = 3;
let level = 1;
let animationId = null;

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

// Paddle
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    width: 100,
    height: 12,
    speed: 8,
    color: '#00ffff'
};

// Ball
let balls = [];

// Bricks
let bricks = [];
const brickRowCount = 5;
const brickColCount = 10;
const brickWidth = 70;
const brickHeight = 25;
const brickPadding = 5;
const brickOffsetTop = 60;
const brickOffsetLeft = 30;

// Power-ups
let powerUps = [];

// Particles
let particles = [];

// Stars background
let stars = [];
for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.3
    });
}

// Input
const keys = {};
let mouseX = canvas.width / 2;

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        if (gameState === 'start') startGame();
        else if (gameState === 'gameOver') restartGame();
        else if (gameState === 'playing' && balls.length > 0 && balls[0].stuck) {
            balls[0].stuck = false;
            balls[0].dy = -5;
        }
    }
    
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
    }
    
    e.preventDefault();
});

document.addEventListener('keyup', (e) => keys[e.code] = false);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
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
    level = 1;
    lives = 3;
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    resetGame();
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
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neonBreakerHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = score;
    document.getElementById('TEMPLATE-4weird-final-level').textContent = level;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function resetGame() {
    paddle.x = canvas.width / 2 - paddle.width / 2;
    paddle.width = 100;
    balls = [{
        x: paddle.x + paddle.width / 2,
        y: paddle.y - 10,
        radius: 8,
        dx: 3,
        dy: -5,
        color: '#ff0066',
        stuck: true
    }];
    powerUps = [];
    particles = [];
    createBricks();
}

function createBricks() {
    bricks = [];
    const colors = ['#ff0066', '#ff00ff', '#00ffff', '#00ff66', '#ffff00'];
    const points = [50, 40, 30, 20, 10];
    
    for (let row = 0; row < brickRowCount; row++) {
        for (let col = 0; col < brickColCount; col++) {
            const hits = row < 2 ? 2 : 1;
            bricks.push({
                x: col * (brickWidth + brickPadding) + brickOffsetLeft,
                y: row * (brickHeight + brickPadding) + brickOffsetTop,
                width: brickWidth,
                height: brickHeight,
                color: colors[row % colors.length],
                hits: hits,
                maxHits: hits,
                points: points[row % points.length],
                alive: true
            });
        }
    }
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.2) {
        const types = ['multiball', 'wide', 'laser', 'life', 'slow'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { multiball: '#00ffff', wide: '#00ff66', laser: '#ff0066', life: '#ff6600', slow: '#ffff00' };
        
        powerUps.push({
            x: x, y: y, width: 20, height: 15,
            type: type, color: colors[type],
            dy: 2
        });
    }
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            color: color,
            life: 30
        });
    }
}

function update() {
    // Paddle movement
    if (keys['ArrowLeft'] || keys['KeyA']) paddle.x -= paddle.speed;
    if (keys['ArrowRight'] || keys['KeyD']) paddle.x += paddle.speed;
    
    // Mouse control
    paddle.x = mouseX - paddle.width / 2;
    
    // Clamp paddle
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
    
    // Update balls
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        
        if (ball.stuck) {
            ball.x = paddle.x + paddle.width / 2;
            ball.y = paddle.y - ball.radius;
            continue;
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Wall collision
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
            ball.dx = -ball.dx;
            playSound(440, 0.05, 'square', 0.05);
        }
        if (ball.y - ball.radius <= 0) {
            ball.dy = -ball.dy;
            playSound(440, 0.05, 'square', 0.05);
        }
        
        // Paddle collision
        if (ball.y + ball.radius >= paddle.y && 
            ball.y - ball.radius <= paddle.y + paddle.height &&
            ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
            
            ball.dy = -Math.abs(ball.dy);
            
            // Angle based on hit position
            const hitPos = (ball.x - paddle.x) / paddle.width;
            ball.dx = (hitPos - 0.5) * 8;
            
            // Speed cap
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (speed > 8) {
                ball.dx = (ball.dx / speed) * 8;
                ball.dy = (ball.dy / speed) * 8;
            }
            
            playSound(523, 0.08, 'square', 0.06);
        }
        
        // Ball lost
        if (ball.y - ball.radius > canvas.height) {
            balls.splice(i, 1);
            if (balls.length === 0) {
                lives--;
                if (lives <= 0) {
                    gameOver();
                    return;
                }
                // Respawn ball
                balls.push({
                    x: paddle.x + paddle.width / 2,
                    y: paddle.y - 10,
                    radius: 8,
                    dx: 3,
                    dy: -5,
                    color: '#ff0066',
                    stuck: true
                });
            }
        }
    }
    
    // Brick collision
    balls.forEach(ball => {
        if (ball.stuck) return;
        
        bricks.forEach(brick => {
            if (!brick.alive) return;
            
            if (ball.x + ball.radius > brick.x && 
                ball.x - ball.radius < brick.x + brick.width &&
                ball.y + ball.radius > brick.y && 
                ball.y - ball.radius < brick.y + brick.height) {
                
                // Determine collision side
                const overlapLeft = ball.x + ball.radius - brick.x;
                const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
                const overlapTop = ball.y + ball.radius - brick.y;
                const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
                
                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);
                
                if (minOverlapX < minOverlapY) {
                    ball.dx = -ball.dx;
                } else {
                    ball.dy = -ball.dy;
                }
                
                brick.hits--;
                if (brick.hits <= 0) {
                    brick.alive = false;
                    score += brick.points;
                    spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 12);
                    playSound(880, 0.1, 'square', 0.08);
                } else {
                    playSound(660, 0.08, 'square', 0.06);
                }
            }
        });
    });
    
    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.y += pu.dy;
        
        // Paddle collision
        if (pu.y + pu.height >= paddle.y && 
            pu.x + pu.width >= paddle.x && 
            pu.x <= paddle.x + paddle.width) {
            
            applyPowerUp(pu.type);
            powerUps.splice(i, 1);
            playSound(784, 0.15, 'sine', 0.1);
        } else if (pu.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    // Update stars
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
    
    // Check level complete
    const aliveBricks = bricks.filter(b => b.alive).length;
    if (aliveBricks === 0) {
        level++;
        createBricks();
        // Reset ball
        balls = [{
            x: paddle.x + paddle.width / 2,
            y: paddle.y - 10,
            radius: 8,
            dx: 3 + level * 0.3,
            dy: -5 - level * 0.3,
            color: '#ff0066',
            stuck: true
        }];
    }
}

function applyPowerUp(type) {
    switch (type) {
        case 'multiball':
            if (balls.length > 0 && !balls[0].stuck) {
                balls.push({ ...balls[0], dx: balls[0].dx + 2, dy: -Math.abs(balls[0].dy) });
                balls.push({ ...balls[0], dx: balls[0].dx - 2, dy: -Math.abs(balls[0].dy) });
            }
            break;
        case 'wide':
            paddle.width = Math.min(paddle.width + 30, 180);
            break;
        case 'laser':
            // Laser power-up - instant score bonus for simplicity
            score += 100;
            break;
        case 'life':
            lives = Math.min(lives + 1, 5);
            break;
        case 'slow':
            balls.forEach(b => {
                b.dx *= 0.7;
                b.dy *= 0.7;
            });
            break;
    }
}

function draw() {
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Stars
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // Bricks
    bricks.forEach(brick => {
        if (!brick.alive) return;
        
        const alpha = brick.hits / brick.maxHits;
        ctx.fillStyle = brick.color;
        ctx.globalAlpha = 0.5 + alpha * 0.5;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 10;
        
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
    
    // Paddle
    ctx.fillStyle = paddle.color;
    ctx.shadowColor = paddle.color;
    ctx.shadowBlur = 15;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
    
    // Balls
    balls.forEach(ball => {
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    // Power-ups
    powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(pu.x - pu.width / 2, pu.y, pu.width, pu.height);
        ctx.shadowBlur = 0;
        
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const icons = { multiball: '3B', wide: 'W', laser: 'L', life: '+', slow: 'S' };
        ctx.fillText(icons[pu.type] || '?', pu.x, pu.y + 11);
    });
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = '16px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 15, 25);
    
    ctx.fillStyle = '#ff0066';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL: ${level}`, canvas.width / 2, 25);
    
    ctx.fillStyle = '#00ff66';
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${lives}`, canvas.width - 15, 25);
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Draw start screen background
function drawStartScreen() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        star.y += star.speed * 0.3;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();

// ===== Mobile Touch Controls =====
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    
    // Tap to start / launch ball
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'gameOver') {
        resetGame();
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
}, { passive: false });
