// Game Worker - Runs all game logic on separate thread
// Communicates with main thread via message passing

// ============================================
// CONSTANTS & CONFIG
// ============================================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    FIXED_TIMESTEP: 1000 / 60, // 60 FPS target
    MAX_SUBSTEPS: 3,
    POOL_SIZE: {
        BULLETS: 100,
        PARTICLES: 200,
        ENEMIES: 50,
        FLOATING_TEXTS: 20
    }
};

// ============================================
// OBJECT POOLS - Reusable objects to eliminate garbage collection
// ============================================
class ObjectPool {
    constructor(factory, reset, size) {
        this.factory = factory;
        this.reset = reset;
        this.objects = new Array(size);
        this.available = new Array(size);
        this.availableCount = size;
        
        for (let i = 0; i < size; i++) {
            this.objects[i] = factory();
            this.available[i] = i;
        }
    }
    
    acquire() {
        if (this.availableCount === 0) {
            // Pool exhausted - create temporary object
            const obj = this.factory();
            obj._pooled = false;
            return obj;
        }
        
        const index = this.available[--this.availableCount];
        const obj = this.objects[index];
        obj._poolIndex = index;
        obj._pooled = true;
        obj._active = true;
        return obj;
    }
    
    release(obj) {
        if (!obj._pooled) {
            // Temporary object - let GC handle it
            return;
        }
        
        obj._active = false;
        this.reset(obj);
        this.available[this.availableCount++] = obj._poolIndex;
    }
    
    releaseAll(activeObjects) {
        for (let i = activeObjects.length - 1; i >= 0; i--) {
            this.release(activeObjects[i]);
            activeObjects.pop();
        }
    }
}

// ============================================
// SPATIAL HASH GRID - Optimized collision detection
// ============================================
class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.tempSet = new Set();
    }
    
    clear() {
        this.cells.clear();
    }
    
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    insert(obj, x, y, radius) {
        const minCellX = Math.floor((x - radius) / this.cellSize);
        const maxCellX = Math.floor((x + radius) / this.cellSize);
        const minCellY = Math.floor((y - radius) / this.cellSize);
        const maxCellY = Math.floor((y + radius) / this.cellSize);
        
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                const key = `${cx},${cy}`;
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key).push(obj);
            }
        }
    }
    
    query(x, y, radius, callback) {
        this.tempSet.clear();
        
        const minCellX = Math.floor((x - radius) / this.cellSize);
        const maxCellX = Math.floor((x + radius) / this.cellSize);
        const minCellY = Math.floor((y - radius) / this.cellSize);
        const maxCellY = Math.floor((y + radius) / this.cellSize);
        
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);
                if (cell) {
                    for (const obj of cell) {
                        if (!this.tempSet.has(obj)) {
                            this.tempSet.add(obj);
                            callback(obj);
                        }
                    }
                }
            }
        }
    }
}

// ============================================
// GAME STATE
// ============================================
let gameState = {
    running: false,
    paused: false,
    balance: 1000,
    incomePerSec: 10,
    customerTrust: 100,
    reputation: 50,
    serverCount: 3,
    bankruptcyTimer: 0,
    fraudsterCount: 0,
    cryptominerCount: 0,
    totalComputeUsed: 0,
    maxComputeUsed: 0,
    incomeMultiplier: 1.0
};

let player = { x: 400, y: 500, radius: 15, hasCompanion: false };
let wave = 1;
let score = 0;
let kills = 0;
let maxCombo = 1;
let comboCount = 0;
let comboTimer = 0;
let spawnTimer = 0;
let waveTimer = 0;
let difficulty = 'easy';
let weaponTimer = 0;
let currentWeapon = 'standard';
let shieldTimer = 0;
let isShooting = false;
let inputX = 400;
let inputY = 300;

// Arrays for active objects
let enemies = [];
let bullets = [];
let powerups = [];
let particles = [];
let floatingTexts = [];
let killHistory = [];
let staff = [];
let servers = [];

// Object pools
const bulletPool = new ObjectPool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 60, damage: 1, radius: 4, color: '#fbbf24', _pooled: false, _active: false }),
    (b) => { b.life = 60; b.damage = 1; },
    CONFIG.POOL_SIZE.BULLETS
);

const particlePool = new ObjectPool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 1.0, decay: 0.02, radius: 3, color: '#fff', _pooled: false, _active: false }),
    (p) => { p.life = 1.0; p.radius = 3; },
    CONFIG.POOL_SIZE.PARTICLES
);

const enemyPool = new ObjectPool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, currentHp: 1, maxHp: 1, wobble: 0, typeKey: '', _pooled: false, _active: false }),
    (e) => { e.currentHp = 1; e.wobble = 0; },
    CONFIG.POOL_SIZE.ENEMIES
);

const textPool = new ObjectPool(
    () => ({ x: 0, y: 0, text: '', color: '#fff', size: 14, life: 1.0, vy: -1, _pooled: false, _active: false }),
    (t) => { t.life = 1.0; t.text = ''; },
    CONFIG.POOL_SIZE.FLOATING_TEXTS
);

// Spatial hash for collisions
const enemySpatialGrid = new SpatialHashGrid(100);

// ============================================
// FAST MATH UTILITIES
// ============================================
const FastMath = {
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    random: Math.random,
    floor: Math.floor,
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    
    // Pre-calculated lookup tables
    sinTable: new Float32Array(360),
    cosTable: new Float32Array(360),
    
    init() {
        for (let i = 0; i < 360; i++) {
            const rad = i * Math.PI / 180;
            this.sinTable[i] = Math.sin(rad);
            this.cosTable[i] = Math.cos(rad);
        }
    },
    
    fastSin(degrees) {
        const idx = ((degrees % 360) + 360) % 360;
        return this.sinTable[idx];
    },
    
    fastCos(degrees) {
        const idx = ((degrees % 360) + 360) % 360;
        return this.cosTable[idx];
    },
    
    // Fast distance check (squared, no sqrt)
    distSq(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    },
    
    // Fast distance with early exit
    distFast(x1, y1, x2, y2, maxDist) {
        const dx = x1 - x2;
        if (dx > maxDist || dx < -maxDist) return maxDist + 1;
        const dy = y1 - y2;
        if (dy > maxDist || dy < -maxDist) return maxDist + 1;
        return this.sqrt(dx * dx + dy * dy);
    }
};

FastMath.init();

// ============================================
// ENEMY DEFINITIONS (Compact)
// ============================================
const ENEMIES = {
    blackhat: { hp: 1, speed: 2.5, score: 10, color: '#a855f7', radius: 18, reputationDmg: 2, computeUsage: 50, emoji: '🎩' },
    trojan: { hp: 3, speed: 1.5, score: 50, color: '#f59e0b', radius: 24, reputationDmg: 3, computeUsage: 80, emoji: '🐴' },
    pentester: { hp: 2, speed: 3.5, score: 30, color: '#06b6d4', radius: 16, reputationDmg: 1, computeUsage: 40, emoji: '🤖' },
    agency: { hp: 4, speed: 2, score: 60, color: '#8b5cf6', radius: 22, reputationDmg: 4, computeUsage: 120, emoji: '🧠' },
    ddos: { hp: 5, speed: 1, score: 100, color: '#dc2626', radius: 30, reputationDmg: 5, computeUsage: 200, emoji: '🔥' },
    ransomware: { hp: 4, speed: 1.2, score: 80, color: '#ec4899', radius: 26, reputationDmg: 6, computeUsage: 150, emoji: '🔒' },
    fraudster: { hp: 2, speed: 2, score: 40, color: '#f97316', radius: 16, reputationDmg: 7, computeUsage: 100, emoji: '💰' },
    socialeng: { hp: 1, speed: 2.8, score: 25, color: '#06b6d4', radius: 14, reputationDmg: 8, computeUsage: 60, emoji: '🎭' },
    cryptominer: { hp: 3, speed: 1.8, score: 55, color: '#f59e0b', radius: 20, reputationDmg: 4, computeUsage: 180, emoji: '⛏️' }
};

// ============================================
// UPDATE FUNCTIONS (Optimized)
// ============================================
function updatePlayer(deltaTime) {
    // Smooth movement toward input
    const dx = inputX - player.x;
    const dy = inputY - player.y;
    const speed = 0.15 * deltaTime;
    
    player.x += dx * speed;
    player.y += dy * speed;
    
    // Clamp to canvas
    player.x = FastMath.max(player.radius, FastMath.min(CONFIG.CANVAS_WIDTH - player.radius, player.x));
    player.y = FastMath.max(player.radius, FastMath.min(CONFIG.CANVAS_HEIGHT - 100 - player.radius, player.y));
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * deltaTime;
        b.y += b.vy * deltaTime;
        b.life -= deltaTime;
        
        if (b.life <= 0 || b.x < 0 || b.x > CONFIG.CANVAS_WIDTH || b.y < 0 || b.y > CONFIG.CANVAS_HEIGHT) {
            bulletPool.release(bullets[i]);
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies(deltaTime) {
    const diffMult = difficulty === 'easy' ? 0.7 : 1.5;
    spawnTimer -= deltaTime;
    
    if (spawnTimer <= 0) {
        spawnTimer = FastMath.max(20, (60 - wave * 4) * diffMult);
        spawnEnemy();
    }
    
    // Clear spatial grid
    enemySpatialGrid.clear();
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const type = ENEMIES[e.typeKey];
        
        // Movement
        e.x += e.vx * deltaTime;
        e.y += e.vy * deltaTime;
        e.wobble += 0.05 * deltaTime;
        
        if (e.typeKey === 'pentester') {
            e.x += FastMath.fastSin(e.wobble * 57.3) * 2 * deltaTime; // rad to deg approximation
        }
        
        // Insert into spatial grid
        enemySpatialGrid.insert(e, e.x, e.y, type.radius);
        
        // Check if reached bottom
        if (e.y > CONFIG.CANVAS_HEIGHT - 50) {
            enemyPool.release(enemies[i]);
            enemies.splice(i, 1);
            // Server damage handled separately
            continue;
        }
    }
}

function spawnEnemy() {
    const types = ['blackhat', 'pentester'];
    if (wave >= 2) types.push('agency');
    if (wave >= 3) types.push('trojan');
    if (wave >= 4) types.push('ddos');
    if (wave >= 5) types.push('ransomware');
    if (wave >= 6) types.push('fraudster');
    if (wave >= 7) types.push('socialeng');
    if (wave >= 8) types.push('cryptominer');
    
    const typeKey = types[FastMath.floor(FastMath.random() * types.length)];
    const type = ENEMIES[typeKey];
    
    const enemy = enemyPool.acquire();
    enemy.x = FastMath.random() * (CONFIG.CANVAS_WIDTH - 100) + 50;
    enemy.y = -40;
    enemy.vx = (FastMath.random() - 0.5) * 2;
    enemy.vy = type.speed + (wave * 0.1);
    enemy.currentHp = type.hp;
    enemy.maxHp = type.hp;
    enemy.typeKey = typeKey;
    enemy.wobble = FastMath.random() * Math.PI * 2;
    
    enemies.push(enemy);
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.life -= p.decay * deltaTime;
        
        if (p.life <= 0) {
            particlePool.release(particles[i]);
            particles.splice(i, 1);
        }
    }
}

function updateFloatingTexts(deltaTime) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i];
        t.y += t.vy * deltaTime;
        t.life -= 0.015 * deltaTime;
        
        if (t.life <= 0) {
            textPool.release(floatingTexts[i]);
            floatingTexts.splice(i, 1);
        }
    }
}

// ============================================
// COLLISION DETECTION (Spatial Hash Optimized)
// ============================================
function checkBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.life <= 0) continue;
        
        const searchRadius = 50; // Max enemy radius + bullet radius + padding
        let hit = false;
        
        enemySpatialGrid.query(b.x, b.y, searchRadius, (e) => {
            if (hit || e.currentHp <= 0) return;
            
            const type = ENEMIES[e.typeKey];
            const distSq = FastMath.distSq(b.x, b.y, e.x, e.y);
            const minDist = b.radius + type.radius;
            
            if (distSq < minDist * minDist) {
                hit = true;
                b.life = 0;
                
                let dmg = b.damage * (difficulty === 'easy' ? 1.3 : 0.8);
                if (player.hasCompanion) dmg *= 1.5;
                if (staff.some(s => s.type === 'pentester')) dmg *= 1.5;
                
                e.currentHp -= dmg;
                spawnParticles(b.x, b.y, type.color, 5);
                
                if (e.currentHp <= 0) {
                    handleEnemyDeath(e);
                }
            }
        });
        
        if (hit) {
            bulletPool.release(bullets[i]);
            bullets.splice(i, 1);
        }
    }
}

function handleEnemyDeath(e) {
    kills++;
    comboCount++;
    comboTimer = 180;
    if (comboCount > maxCombo) maxCombo = comboCount;
    killHistory.push(e.typeKey);
    
    const type = ENEMIES[e.typeKey];
    const comboMult = FastMath.min(comboCount, 5);
    const points = type.score * comboMult;
    score += points;
    
    spawnParticles(e.x, e.y, type.color, 15);
    addFloatingText(e.x, e.y, '+' + points, '#f59e0b', comboMult > 1 ? 18 : 14);
    
    gameState.totalComputeUsed += type.computeUsage;
    if (gameState.totalComputeUsed > gameState.maxComputeUsed) {
        gameState.maxComputeUsed = gameState.totalComputeUsed;
    }
    
    // Check for powerup spawn (30% chance)
    if (FastMath.random() < 0.3) {
        spawnPowerup(e.x, e.y);
    }
}

function spawnParticles(x, y, color, count, emoji) {
    for (let i = 0; i < count; i++) {
        const p = particlePool.acquire();
        p.x = x;
        p.y = y;
        const angle = FastMath.random() * Math.PI * 2;
        const speed = FastMath.random() * 3 + 1;
        p.vx = FastMath.cos(angle) * speed;
        p.vy = FastMath.sin(angle) * speed;
        p.color = color;
        p.decay = 0.02 + FastMath.random() * 0.02;
        particles.push(p);
    }
}

function addFloatingText(x, y, text, color, size) {
    const t = textPool.acquire();
    t.x = x;
    t.y = y;
    t.text = text;
    t.color = color;
    t.size = size;
    t.life = 1.0;
    floatingTexts.push(t);
}

function spawnPowerup(x, y) {
    const types = ['heal', 'shield', 'nuke', 'weapon'];
    const type = types[FastMath.floor(FastMath.random() * types.length)];
    
    powerups.push({
        x: x,
        y: y,
        type: type,
        radius: 20,
        pulse: 0
    });
}

// ============================================
// MAIN GAME LOOP
// ============================================
let lastTime = 0;
let accumulator = 0;

function gameLoop(currentTime) {
    if (!gameState.running || gameState.paused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Fixed timestep with accumulator
    accumulator += deltaTime;
    
    while (accumulator >= CONFIG.FIXED_TIMESTEP) {
        update(CONFIG.FIXED_TIMESTEP);
        accumulator -= CONFIG.FIXED_TIMESTEP;
    }
    
    // Send render data to main thread
    sendRenderData();
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    updatePlayer(deltaTime);
    updateBullets(deltaTime);
    updateEnemies(deltaTime);
    updateParticles(deltaTime);
    updateFloatingTexts(deltaTime);
    
    checkBulletEnemyCollisions();
    
    // Decay combo
    comboTimer -= deltaTime;
    if (comboTimer <= 0) {
        comboCount = 0;
    }
    
    // Update game state
    gameState.customerTrust = FastMath.max(0, FastMath.min(100, 
        gameState.customerTrust - 0.01 + (staff.some(s => s.type === 'pr') ? 0.05 : 0)));
    
    // Calculate income
    const onlineServers = servers.filter(s => s.status !== 'offline').length;
    if (onlineServers === 3) gameState.incomeMultiplier = 1.0;
    else if (onlineServers === 2) gameState.incomeMultiplier = 0.7;
    else if (onlineServers === 1) gameState.incomeMultiplier = 0.4;
    else gameState.incomeMultiplier = 0.1;
    
    const totalSalary = staff.reduce((sum, s) => sum + s.salary, 0);
    const revenue = (gameState.incomePerSec * gameState.customerTrust / 100 * gameState.incomeMultiplier) / 60;
    gameState.balance += revenue - totalSalary;
    
    // Check bankruptcy
    if (gameState.balance < 0) {
        gameState.bankruptcyTimer += deltaTime;
        if (gameState.bankruptcyTimer > 600) {
            postMessage({ type: 'gameOver', score, wave, kills });
        }
    } else {
        gameState.bankruptcyTimer = 0;
    }
    
    // Check victory
    if (wave >= 10 && waveTimer > 100 && enemies.length === 0) {
        postMessage({ type: 'victory', score, maxCombo, balance: gameState.balance });
    }
}

function sendRenderData() {
    // Serialize only necessary data for rendering
    const renderData = {
        type: 'render',
        timestamp: performance.now(),
        player: { x: player.x, y: player.y, radius: player.radius, hasCompanion: player.hasCompanion },
        enemies: enemies.map(e => ({
            x: e.x, y: e.y, typeKey: e.typeKey, currentHp: e.currentHp, maxHp: e.maxHp
        })),
        bullets: bullets.map(b => ({ x: b.x, y: b.y, color: b.color })),
        particles: particles.map(p => ({ x: p.x, y: p.y, color: p.color, life: p.life, radius: p.radius })),
        powerups: powerups.map(p => ({ x: p.x, y: p.y, type: p.type })),
        floatingTexts: floatingTexts.map(t => ({ x: t.x, y: t.y, text: t.text, color: t.color, size: t.size, life: t.life })),
        servers: servers.map(s => ({ x: s.x, y: s.y, hp: s.hp, maxHp: s.maxHp, status: s.status, emoji: s.emoji })),
        gameState: {
            balance: FastMath.floor(gameState.balance),
            incomePerSec: gameState.incomePerSec,
            customerTrust: FastMath.floor(gameState.customerTrust),
            reputation: FastMath.floor(gameState.reputation),
            incomeMultiplier: gameState.incomeMultiplier
        },
        wave,
        score,
        kills,
        comboCount,
        comboTimer,
        currentWeapon,
        weaponTimer,
        shieldTimer,
        isShooting
    };
    
    postMessage(renderData);
}

// ============================================
// MESSAGE HANDLING
// ============================================
self.onmessage = function(e) {
    const data = e.data;
    
    switch (data.type) {
        case 'init':
            // Initialize game
            gameState.running = true;
            gameState.paused = false;
            lastTime = performance.now();
            
            // Initialize servers
            servers = [
                { x: CONFIG.CANVAS_WIDTH * 0.2, y: CONFIG.CANVAS_HEIGHT - 60, hp: 100, maxHp: 100, status: 'online', emoji: '🖥️' },
                { x: CONFIG.CANVAS_WIDTH * 0.5, y: CONFIG.CANVAS_HEIGHT - 60, hp: 100, maxHp: 100, status: 'online', emoji: '💻' },
                { x: CONFIG.CANVAS_WIDTH * 0.8, y: CONFIG.CANVAS_HEIGHT - 60, hp: 100, maxHp: 100, status: 'online', emoji: '🗄️' }
            ];
            
            requestAnimationFrame(gameLoop);
            break;
            
        case 'input':
            inputX = data.x;
            inputY = data.y;
            break;
            
        case 'shoot':
            isShooting = data.shooting;
            break;
            
        case 'pause':
            gameState.paused = data.paused;
            break;
            
        case 'weapon':
            currentWeapon = data.weapon;
            break;
            
        case 'fireBullet':
            // Fire bullet from main thread request
            const b = bulletPool.acquire();
            b.x = data.x;
            b.y = data.y;
            b.vx = data.vx;
            b.vy = data.vy;
            b.damage = data.damage;
            b.color = data.color;
            bullets.push(b);
            break;
            
        case 'reset':
            // Reset game state
            score = 0;
            wave = 1;
            kills = 0;
            gameState.balance = 1000;
            gameState.reputation = 50;
            gameState.customerTrust = 100;
            
            // Release all objects to pools
            bulletPool.releaseAll(bullets);
            particlePool.releaseAll(particles);
            enemyPool.releaseAll(enemies);
            textPool.releaseAll(floatingTexts);
            
            powerups = [];
            staff = [];
            killHistory = [];
            
            // Reset servers
            servers.forEach(s => {
                s.hp = s.maxHp;
                s.status = 'online';
            });
            break;
    }
};
