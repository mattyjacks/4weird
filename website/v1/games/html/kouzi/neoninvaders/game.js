// Neon Invaders - Cyberpunk Space Shooter
// Game #4 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'start'; // start, playing, paused, gameOver
let score = 0;
let highScore = parseInt(localStorage.getItem('neonInvadersHighScore')) || 0;
let wave = 1;
let lives = 3;
let animationId = null;

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;

// Audio context for sound effects
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(frequency, duration, type = 'square', volume = 0.1) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function playShootSound() {
    playSound(880, 0.1, 'square', 0.08);
}

function playExplosionSound() {
    playSound(150, 0.2, 'sawtooth', 0.1);
    setTimeout(() => playSound(80, 0.15, 'sawtooth', 0.08), 50);
}

function playPowerUpSound() {
    playSound(523, 0.1, 'sine', 0.1);
    setTimeout(() => playSound(659, 0.1, 'sine', 0.1), 80);
    setTimeout(() => playSound(784, 0.15, 'sine', 0.1), 160);
}

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 40,
    height: 30,
    speed: 6,
    color: '#00ffff',
    hasShield: false,
    shieldTimer: 0,
    tripleShot: false,
    tripleShotTimer: 0,
    rapidFire: false,
    rapidFireTimer: 0
};

// Bullets
let bullets = [];
let bulletCooldown = 0;
const baseBulletCooldown = 15;

// Enemies
let enemies = [];
let enemyRows = 4;
let enemyCols = 8;
let enemySpeed = 1;
let enemyDirection = 1;

// Power-ups
let powerUps = [];

// Particles
let particles = [];

// Stars (background)
let stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.5 + 0.3
    });
}

// Input
const keys = {};
let canShoot = true;

// Input handlers
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Start game with space on start screen
    if (e.code === 'Space' && gameState === 'start') {
        startGame();
    }
    
    // Pause toggle
    if ((e.code === 'KeyP' || e.code === 'Escape') && gameState === 'playing') {
        pauseGame();
    } else if ((e.code === 'KeyP' || e.code === 'Escape') && gameState === 'paused') {
        resumeGame();
    }
    
    // Restart on game over
    if (e.code === 'Space' && gameState === 'gameOver') {
        restartGame();
    }
    
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Template UI button bindings
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);
document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', resumeGame);
document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', restartGame);
document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', restartGame);

function startGame() {
    initAudio();
    gameState = 'playing';
    score = 0;
    wave = 1;
    lives = 3;
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    resetPlayer();
    spawnWave();
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
        localStorage.setItem('neonInvadersHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = score;
    document.getElementById('TEMPLATE-4weird-final-wave').textContent = wave;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function resetPlayer() {
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 60;
    player.hasShield = false;
    player.tripleShot = false;
    player.rapidFire = false;
}

function spawnWave() {
    enemies = [];
    const startX = 50;
    const startY = 50;
    const spacingX = 80;
    const spacingY = 50;
    
    const colors = ['#ff0066', '#ff00ff', '#00ff66', '#ffff00'];
    const types = ['basic', 'zigzag', 'tank', 'speedy'];
    
    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemyCols; col++) {
            const type = row === 0 ? 'tank' : (row === 1 ? 'zigzag' : 'basic');
            const hp = row === 0 ? 3 : (row === 1 ? 2 : 1);
            
            enemies.push({
                x: startX + col * spacingX,
                y: startY + row * spacingY,
                width: 40,
                height: 30,
                color: colors[row % colors.length],
                type: type,
                hp: hp,
                maxHp: hp,
                points: hp * 10,
                moveTimer: 0,
                shootTimer: Math.random() * 120 + 60
            });
        }
    }
    
    enemySpeed = 1 + wave * 0.2;
    enemyDirection = 1;
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.15) {
        const types = ['triple', 'shield', 'life', 'rapid'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const colors = {
            triple: '#00ffff',
            shield: '#00ff00',
            life: '#ff0066',
            rapid: '#ffff00'
        };
        
        powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            type: type,
            color: colors[type],
            speed: 2
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 / 15) * i;
        const speed = Math.random() * 4 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 2,
            color: color,
            life: 30
        });
    }
}

function update() {
    // Player movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] || keys['KeyW']) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        player.y += player.speed;
    }
    
    // Clamp player
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(canvas.height / 2, Math.min(canvas.height - player.height - 10, player.y));
    
    // Shooting
    const cooldown = player.rapidFire ? 5 : baseBulletCooldown;
    if (keys['Space'] && bulletCooldown <= 0) {
        if (player.tripleShot) {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: -2, color: '#00ffff' });
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 0, color: '#00ffff' });
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 2, color: '#00ffff' });
        } else {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 0, color: '#00ffff' });
        }
        bulletCooldown = cooldown;
        playShootSound();
    }
    bulletCooldown--;
    
    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.y += bullet.vy;
        bullet.x += bullet.vx || 0;
        return bullet.y > -10 && bullet.y < canvas.height + 10 && bullet.x > -10 && bullet.x < canvas.width + 10;
    });
    
    // Update power-ups
    powerUps = powerUps.filter(powerUp => {
        powerUp.y += powerUp.speed;
        
        // Check collision with player
        if (checkCollision(player, powerUp)) {
            applyPowerUp(powerUp.type);
            playPowerUpSound();
            return false;
        }
        
        return powerUp.y < canvas.height + 20;
    });
    
    // Update enemies
    let moveDown = false;
    let leftMost = canvas.width;
    let rightMost = 0;
    
    enemies.forEach(enemy => {
        if (enemy.x < leftMost) leftMost = enemy.x;
        if (enemy.x + enemy.width > rightMost) rightMost = enemy.x + enemy.width;
    });
    
    if (rightMost >= canvas.width - 20 && enemyDirection > 0) {
        moveDown = true;
        enemyDirection = -1;
    }
    if (leftMost <= 20 && enemyDirection < 0) {
        moveDown = true;
        enemyDirection = 1;
    }
    
    enemies.forEach(enemy => {
        enemy.x += enemySpeed * enemyDirection;
        if (moveDown) {
            enemy.y += 20;
        }
        
        // Zigzag movement for zigzag type
        if (enemy.type === 'zigzag') {
            enemy.moveTimer++;
            enemy.x += Math.sin(enemy.moveTimer * 0.05) * 1.5;
        }
        
        // Enemy shooting
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0 && Math.random() < 0.3) {
            bullets.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                vy: 4 + wave * 0.3,
                vx: 0,
                color: enemy.color,
                isEnemy: true
            });
            enemy.shootTimer = Math.random() * 180 + 120;
        }
        
        // Check if enemy reached bottom
        if (enemy.y + enemy.height >= canvas.height - 20) {
            gameOver();
            return;
        }
    });
    
    // Bullet-enemy collisions
    bullets = bullets.filter(bullet => {
        if (bullet.isEnemy) return true;
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (checkCollision(
                { x: bullet.x - 2, y: bullet.y, width: 4, height: 8 },
                enemies[i]
            )) {
                enemies[i].hp--;
                playExplosionSound();
                createExplosion(bullet.x, bullet.y, enemies[i].color);
                
                if (enemies[i].hp <= 0) {
                    score += enemies[i].points;
                    spawnPowerUp(enemies[i].x + enemies[i].width / 2, enemies[i].y + enemies[i].height / 2);
                    enemies.splice(i, 1);
                }
                return false;
            }
        }
        return true;
    });
    
    // Enemy bullets - player collision
    bullets = bullets.filter(bullet => {
        if (!bullet.isEnemy) return true;
        
        if (checkCollision(
            { x: bullet.x - 2, y: bullet.y, width: 4, height: 8 },
            player
        )) {
            if (player.hasShield) {
                player.hasShield = false;
                playExplosionSound();
                createExplosion(bullet.x, bullet.y, '#00ff00');
            } else {
                lives--;
                playExplosionSound();
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff0066');
                
                if (lives <= 0) {
                    gameOver();
                }
            }
            return false;
        }
        return true;
    });
    
    // Player - enemy collision
    enemies.forEach(enemy => {
        if (checkCollision(player, enemy)) {
            if (player.hasShield) {
                player.hasShield = false;
            } else {
                lives--;
            }
            playExplosionSound();
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
            
            // Remove enemy on collision
            const idx = enemies.indexOf(enemy);
            if (idx > -1) enemies.splice(idx, 1);
            
            if (lives <= 0) {
                gameOver();
            }
        }
    });
    
    // Check wave complete
    if (enemies.length === 0 && gameState === 'playing') {
        wave++;
        spawnWave();
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
    
    // Update power-up timers
    if (player.tripleShot) {
        player.tripleShotTimer--;
        if (player.tripleShotTimer <= 0) player.tripleShot = false;
    }
    if (player.hasShield) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) player.hasShield = false;
    }
    if (player.rapidFire) {
        player.rapidFireTimer--;
        if (player.rapidFireTimer <= 0) player.rapidFire = false;
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function applyPowerUp(type) {
    switch (type) {
        case 'triple':
            player.tripleShot = true;
            player.tripleShotTimer = 600;
            break;
        case 'shield':
            player.hasShield = true;
            player.shieldTimer = 600;
            break;
        case 'life':
            lives = Math.min(lives + 1, 5);
            break;
        case 'rapid':
            player.rapidFire = true;
            player.rapidFireTimer = 480;
            break;
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 15;
    
    // Draw triangle ship
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Draw engine glow
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height + 3, 5 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw shield
    if (player.hasShield) {
        ctx.strokeStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 30, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 10;
        
        // Draw enemy shape
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y + enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 4, enemy.y);
        ctx.lineTo(enemy.x + enemy.width * 3/4, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width * 0.35, enemy.y + enemy.height * 0.4, 3, 0, Math.PI * 2);
        ctx.arc(enemy.x + enemy.width * 0.65, enemy.y + enemy.height * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.shadowBlur = 0;
    
    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(bullet.x - 2, bullet.y, 4, bullet.isEnemy ? 12 : 8);
    });
    
    ctx.shadowBlur = 0;
    
    // Draw power-ups
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.color;
        ctx.shadowColor = powerUp.color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const icons = { triple: '3', shield: 'S', life: '+', rapid: 'R' };
        ctx.fillText(icons[powerUp.type] || '?', powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2 + 4);
    });
    
    ctx.shadowBlur = 0;
    
    // Draw HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = '18px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
    
    ctx.fillStyle = '#ff0066';
    ctx.fillText(`WAVE: ${wave}`, canvas.width / 2 - 40, 30);
    
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`LIVES: ${lives}`, canvas.width - 110, 30);
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

// Initialize
drawStartScreen();

// ===== Mobile Touch Controls =====
let touchStartX = 0;
let isTouching = false;

function setupTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    // Touch start - record position and shoot
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        isTouching = true;
        
        // Auto-fire on touch
        if (gameState === 'playing' && bulletCooldown <= 0) {
            shootBullet();
        }
        
        // Start screen / game over - tap to start
        if (gameState === 'start' || gameState === 'gameOver') {
            if (gameState === 'start') startGame();
            else resetGame();
        }
    }, { passive: false });
    
    // Touch move - move player
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (gameState !== 'playing') return;
        
        const touch = e.touches[0];
        const touchX = touch.clientX;
        const deltaX = touchX - touchStartX;
        
        // Move player based on touch delta
        player.x += deltaX * 0.5;
        player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
        
        touchStartX = touchX;
        
        // Auto-fire while moving
        if (bulletCooldown <= 0) {
            shootBullet();
        }
    }, { passive: false });
    
    // Touch end
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isTouching = false;
    }, { passive: false });
}

// Initialize touch controls when game loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTouchControls);
} else {
    setupTouchControls();
}
