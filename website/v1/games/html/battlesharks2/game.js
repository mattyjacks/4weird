/* ──────────────────────────────────────────────────────────
   BATTLESHARKS II - UPGRADED ENGINE
   Advanced Systems: Schooling AI, Homing Missiles, Boss Battle
   Changes: Drop-launch splash animation, eat enemies, 3s death
   ────────────────────────────────────────────────────────── */

// Game State
const state = {
    running: false,
    paused: false,
    score: 0,
    biomass: 0,
    debris: 0,
    mutagens: 0,
    upgrades: {
        lasers: false,
        thruster: false,
        shield: false,
        electric: false,
        acid: false,
        scales: false,
        missiles: false
    },
    shieldActive: false,
    shieldRechargeTimer: 0,
    electricTimer: 0,
    acidTimer: 0,
    missileTimer: 0,
    spawnTimer: 0,
    difficultyTimer: 0,
    difficulty: 1,
    mutationsCount: 0,
    cameraShake: 0,
    bossSpawned: false,
    bossDefeated: false,
    bossActive: false,
    bossAlertTimer: 0,
    // Death animation state
    dying: false,
    deathTimer: 0,
    // Launch Drop animation state
    launching: false,
    launchTimer: 0,
    hasSplashed: false,
    waterLevel: 140
};

// Player Object
const player = {
    x: 500,
    y: 350,
    vx: 0,
    vy: 0,
    radius: 28,
    baseRadius: 28,
    angle: 0,
    speed: 3.5,
    maxSpeed: 6,
    health: 100,
    maxHealth: 100,
    dashCooldown: 0,
    dashTimer: 0,
    isDashing: false,
    damageReduction: 1.0,
    facingLeft: false,
    // Growth system
    level: 1,
    xp: 0,
    nextLevelXp: 120,
    scaleMultiplier: 1.0
};

// Boss Object
const boss = {
    x: 500,
    y: -150,
    targetY: 150,
    vx: 2.5,
    vy: 1.0,
    radius: 80,
    health: 1000,
    maxHealth: 1000,
    shootCooldown: 90,
    state: 'enter', // enter, fight, sweep
    sweepTimer: 0
};

// Game Canvas & Context
let canvas, ctx;

// Input Management
const keys = {};
const mouse = { x: 500, y: 350, down: false };

// Entity Lists
let preys = [];
let enemies = [];
let projectiles = [];
let particles = [];
let aquariumItems = [];
let floatingItems = [];
let damageClouds = []; // For Acid Puddles

// Configuration
const PREY_TYPES = [
    { emoji: '🐟', name: 'Blue Fish', size: 14, biomass: 1, speed: 1.2, score: 10 },
    { emoji: '🐠', name: 'Tang Fish', size: 16, biomass: 2, speed: 1.5, score: 15 },
    { emoji: '🐡', name: 'Puffer Fish', size: 18, biomass: 3, speed: 0.8, score: 20 },
    { emoji: '🦐', name: 'Shrimp', size: 12, biomass: 1, speed: 1.0, score: 5 },
    { emoji: '🦀', name: 'Crab', size: 15, biomass: 2, speed: 0.5, score: 15, bottomWalker: true },
    { emoji: '🐙', name: 'Octopus', size: 24, biomass: 5, speed: 0.9, score: 40 },
    { emoji: '🦑', name: 'Squid', size: 22, biomass: 4, speed: 2.2, score: 35 }
];

const ENEMY_TYPES = [
    { emoji: '💣', name: 'Naval Mine', size: 20, damage: 35, debris: 3, speed: 0, isStatic: true },
    { emoji: '🛢️', name: 'Toxic Waste', size: 18, damage: 20, debris: 1, speed: 0.3, isDrifting: true },
    { emoji: 'scuba', name: 'Cyber Diver', size: 22, damage: 15, health: 30, debris: 5, speed: 1.0, shoots: true },
    { emoji: 'robot', name: 'Mecha Sentinel', size: 25, damage: 25, health: 55, debris: 8, speed: 1.6, shoots: true }
];

// Initialize Game
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Event Listeners
    setupInputListeners();
    setupUIListeners();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial Stats Load
    updateStatsHUD();
});

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// ─── Input Management ───
function setupInputListeners() {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        
        if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'tab') {
            e.preventDefault();
            toggleLab();
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            togglePause();
        }
        if (e.key === ' ' && state.upgrades.thruster) {
            triggerDash();
        }
    });

    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) { // Left Click
            mouse.down = true;
            if (state.running && !state.paused) {
                fireWeapon();
            }
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) {
            mouse.down = false;
        }
    });

    // Touch support for mobile
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    }, { passive: false });

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        mouse.down = true;
        if (state.running && !state.paused) {
            fireWeapon();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        mouse.down = false;
    });
}

function setupUIListeners() {
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnRestart').addEventListener('click', restartGame);
    document.getElementById('btnPauseGame').addEventListener('click', togglePause);
    document.getElementById('btnResume').addEventListener('click', togglePause);
    document.getElementById('btnRestartFromPause').addEventListener('click', restartGame);
    document.getElementById('btnOpenLab').addEventListener('click', toggleLab);
    document.getElementById('btnCloseLab').addEventListener('click', toggleLab);
    document.getElementById('btnResumeFromLab').addEventListener('click', toggleLab);

    const tabs = document.querySelectorAll('.lab-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const paneId = 'pane-' + tab.dataset.tab;
            document.querySelectorAll('.lab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(paneId).classList.add('active');
        });
    });
}

// ─── Game Control Functions ───
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    resetGameState();
    state.running = true;
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    resetGameState();
    state.running = true;
    state.paused = false;
    requestAnimationFrame(gameLoop);
}

function resetGameState() {
    state.score = 0;
    state.biomass = 0;
    state.debris = 0;
    state.mutagens = 0;
    state.difficulty = 1;
    state.difficultyTimer = 0;
    state.mutationsCount = 0;
    state.cameraShake = 0;
    state.bossSpawned = false;
    state.bossDefeated = false;
    state.bossActive = false;
    state.bossAlertTimer = 0;
    state.dying = false;
    state.deathTimer = 0;

    // Drop Launch Init
    state.launching = true;
    state.launchTimer = 90; // 1.5 seconds drop/splash
    state.hasSplashed = false;

    // Reset warnings
    document.getElementById('bossWarningAlert').classList.add('hidden');
    document.getElementById('bossHPBarContainer').classList.add('hidden');
    
    // Upgrades
    Object.keys(state.upgrades).forEach(key => state.upgrades[key] = false);
    state.shieldActive = false;
    
    // Player starts high above water
    player.x = canvas ? canvas.width / 2 : 500;
    player.y = -80; 
    player.vx = 0;
    player.vy = 0.5; // Dropping velocity
    player.angle = Math.PI / 2; // Facing straight down
    
    player.level = 1;
    player.xp = 0;
    player.nextLevelXp = 120;
    player.scaleMultiplier = 1.0;
    player.radius = player.baseRadius;
    player.health = 100;
    player.maxHealth = 100;
    player.speed = 3.5;
    player.damageReduction = 1.0;
    player.dashCooldown = 0;
    player.dashTimer = 0;
    player.isDashing = false;

    // Boss Reset
    boss.health = 1000;
    boss.maxHealth = 1000;
    boss.y = -150;
    boss.state = 'enter';

    // Clear lists
    preys = [];
    enemies = [];
    projectiles = [];
    particles = [];
    aquariumItems = [];
    floatingItems = [];
    damageClouds = [];

    // Spawn initial prey
    for (let i = 0; i < 15; i++) {
        spawnPrey();
    }

    updateStatsHUD();
    updateUpgradesStoreUI();
}

function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    const pauseScreen = document.getElementById('pauseScreen');
    if (state.paused) {
        pauseScreen.classList.remove('hidden');
    } else {
        pauseScreen.classList.add('hidden');
        requestAnimationFrame(gameLoop);
    }
}

function toggleLab() {
    if (!state.running) return;
    state.paused = !state.paused;
    const lab = document.getElementById('rdLabOverlay');
    if (state.paused) {
        document.getElementById('labBiomass').textContent = state.biomass;
        document.getElementById('labDebris').textContent = state.debris;
        document.getElementById('labMutagens').textContent = state.mutagens;
        updateUpgradesStoreUI();
        lab.classList.remove('hidden');
    } else {
        lab.classList.add('hidden');
        requestAnimationFrame(gameLoop);
    }
}

function gameOver() {
    state.running = false;
    document.getElementById('finalScore').textContent = state.score;
    document.getElementById('finalBiomass').textContent = state.biomass;
    document.getElementById('finalDebris').textContent = state.debris;
    document.getElementById('finalMutations').textContent = state.mutationsCount;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ─── Upgrade System Logic ───
window.buyUpgrade = function(type) {
    if (state.upgrades[type]) return;

    let canAfford = false;
    if (type === 'lasers' && state.debris >= 20) {
        state.debris -= 20;
        canAfford = true;
    } else if (type === 'thruster' && state.debris >= 30 && state.biomass >= 10) {
        state.debris -= 30;
        state.biomass -= 10;
        canAfford = true;
    } else if (type === 'shield' && state.debris >= 40 && state.mutagens >= 1) {
        state.debris -= 40;
        state.mutagens -= 1;
        canAfford = true;
        state.shieldActive = true;
    } else if (type === 'electric' && state.biomass >= 35 && state.mutagens >= 1) {
        state.biomass -= 35;
        state.mutagens -= 1;
        canAfford = true;
    } else if (type === 'acid' && state.biomass >= 25 && state.mutagens >= 2) {
        state.biomass -= 25;
        state.mutagens -= 2;
        canAfford = true;
    } else if (type === 'scales' && state.biomass >= 50) {
        state.biomass -= 50;
        canAfford = true;
        player.maxHealth += 50;
        player.health = Math.min(player.health + 50, player.maxHealth);
        player.damageReduction = 0.75;
    } else if (type === 'missiles' && state.debris >= 50 && state.mutagens >= 2) {
        state.debris -= 50;
        state.mutagens -= 2;
        canAfford = true;
    }

    if (canAfford) {
        state.upgrades[type] = true;
        state.mutationsCount++;
        state.score += 500;
        
        createExplosion(player.x, player.y, '#00f2fe', 30);
        state.cameraShake = 10;
        
        document.getElementById('labBiomass').textContent = state.biomass;
        document.getElementById('labDebris').textContent = state.debris;
        document.getElementById('labMutagens').textContent = state.mutagens;
        
        updateStatsHUD();
        updateUpgradesStoreUI();
        showNotification(`System Upgraded: ${type.toUpperCase()}`);
    } else {
        showNotification("Insufficient resources!");
    }
};

window.spawnAquariumItem = function(itemType) {
    let canAfford = false;
    if (itemType === 'coral' && state.biomass >= 15) {
        state.biomass -= 15;
        canAfford = true;
    } else if (itemType === 'wreckage' && state.debris >= 20) {
        state.debris -= 20;
        canAfford = true;
    } else if (itemType === 'vent' && state.biomass >= 30 && state.debris >= 15) {
        state.biomass -= 30;
        state.debris -= 15;
        canAfford = true;
    }

    if (canAfford) {
        aquariumItems.push({
            type: itemType,
            x: player.x + (Math.random() - 0.5) * 150,
            y: Math.min(canvas.height - 80, player.y + (Math.random() - 0.5) * 100),
            timer: 0,
            emoji: itemType === 'coral' ? '🪸' : (itemType === 'wreckage' ? '🚢' : '🌋'),
            size: 32
        });

        createExplosion(player.x, player.y, '#8b5cf6', 25);
        state.cameraShake = 5;

        document.getElementById('labBiomass').textContent = state.biomass;
        document.getElementById('labDebris').textContent = state.debris;
        document.getElementById('labMutagens').textContent = state.mutagens;

        updateStatsHUD();
        updateUpgradesStoreUI();
        showNotification(`Deployed ${itemType.toUpperCase()} to aquarium!`);
    } else {
        showNotification("Insufficient resources to deploy!");
    }
};

function updateUpgradesStoreUI() {
    const upgradeTypes = ['lasers', 'thruster', 'shield', 'electric', 'acid', 'scales', 'missiles'];
    upgradeTypes.forEach(type => {
        const card = document.getElementById(`up-${type}`);
        if (!card) return;
        const btn = card.querySelector('.btn-upgrade');
        if (state.upgrades[type]) {
            btn.textContent = 'Installed';
            btn.className = 'btn-upgrade installed';
            btn.disabled = true;
        } else {
            btn.textContent = type === 'scales' || type === 'electric' || type === 'acid' ? 'Mutate' : 'Install';
            btn.className = 'btn-upgrade';
            btn.disabled = false;
        }
    });

    // Update Equipped visual slots in bottom row
    const equipped = document.getElementById('equippedSlots');
    let slotHTML = '';
    
    // Weapon slot
    if (state.upgrades.lasers || state.upgrades.missiles) {
        let text = '🔫';
        if (state.upgrades.lasers) text += ' Laser';
        if (state.upgrades.missiles) text += ' Missiles';
        slotHTML += `<span class="equipped-item" title="Cyber Weapon">${text}</span>`;
    } else {
        slotHTML += `<span class="equipped-item empty">🔫 None</span>`;
    }

    // Bio Mutation slot
    if (state.upgrades.electric || state.upgrades.acid) {
        let name = '';
        if (state.upgrades.electric) name += '⚡Electric ';
        if (state.upgrades.acid) name += '🤮Acid ';
        slotHTML += `<span class="equipped-item" title="Bio Mutation">${name}</span>`;
    } else {
        slotHTML += `<span class="equipped-item empty">🧬 None</span>`;
    }

    // Thruster slot
    if (state.upgrades.thruster) {
        slotHTML += `<span class="equipped-item" title="Engine">🚀 Jet Engine</span>`;
    } else {
        slotHTML += `<span class="equipped-item empty">🚀 None</span>`;
    }

    equipped.innerHTML = slotHTML;
}

function updateStatsHUD() {
    document.getElementById('hudBiomass').textContent = state.biomass;
    document.getElementById('hudDebris').textContent = state.debris;
    document.getElementById('hudMutagens').textContent = state.mutagens;
    document.getElementById('hudScore').textContent = state.score;

    // Health Bar
    const healthBar = document.getElementById('healthBar');
    const healthPercentage = (player.health / player.maxHealth) * 100;
    healthBar.style.width = `${Math.max(0, healthPercentage)}%`;
    document.getElementById('hudHealthText').textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;

    // Growth Experience Bar
    const growthBar = document.getElementById('growthBar');
    const xpPercentage = (player.xp / player.nextLevelXp) * 100;
    growthBar.style.width = `${Math.min(100, xpPercentage)}%`;
    
    let classification = 'Pup';
    if (player.level === 2) classification = 'Juvenile';
    if (player.level === 3) classification = 'Hunter';
    if (player.level === 4) classification = 'Predator';
    if (player.level >= 5) classification = 'Apex Megalodon';
    document.getElementById('hudLevelText').textContent = `LVL ${player.level} (${classification})`;
}

// ─── Weapons Shooting ───
function fireWeapon() {
    if (state.upgrades.lasers && !state.dying && !state.launching) {
        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        projectiles.push({
            type: 'laser',
            x: player.x + Math.cos(angle) * player.radius,
            y: player.y + Math.sin(angle) * player.radius,
            vx: Math.cos(angle) * 13,
            vy: Math.sin(angle) * 13,
            radius: 4,
            color: '#00f2fe'
        });
        createBubble(player.x - Math.cos(angle)*20, player.y - Math.sin(angle)*20, 2);
    }
}

function triggerDash() {
    if (player.dashCooldown > 0 || player.isDashing || state.dying || state.launching) return;
    
    player.isDashing = true;
    player.dashTimer = 14;
    player.dashCooldown = 75; // Dash faster cooldown
    
    const moveAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.vx = Math.cos(moveAngle) * 17;
    player.vy = Math.sin(moveAngle) * 17;

    state.cameraShake = 5;

    // Biomass displacement shockwave pushes mines/enemies back
    preys.forEach(pr => {
        if (Math.hypot(pr.x - player.x, pr.y - player.y) < 130) {
            const ang = Math.atan2(pr.y - player.y, pr.x - player.x);
            pr.vx += Math.cos(ang) * 4;
            pr.vy += Math.sin(ang) * 4;
        }
    });

    enemies.forEach(en => {
        if (Math.hypot(en.x - player.x, en.y - player.y) < 130) {
            const ang = Math.atan2(en.y - player.y, en.x - player.x);
            en.vx += Math.cos(ang) * 5;
            en.vy += Math.sin(ang) * 5;
        }
    });

    for (let i = 0; i < 18; i++) {
        particles.push({
            x: player.x - Math.cos(moveAngle) * 20,
            y: player.y - Math.sin(moveAngle) * 20,
            vx: -Math.cos(moveAngle) * 6 + (Math.random() - 0.5) * 3,
            vy: -Math.sin(moveAngle) * 6 + (Math.random() - 0.5) * 3,
            radius: Math.random() * 6 + 2.5,
            color: 'rgba(0, 242, 254, 0.75)',
            life: 35,
            maxLife: 35
        });
    }
}

// ─── Entities Spawners ───
function spawnPrey() {
    const type = PREY_TYPES[Math.floor(Math.random() * PREY_TYPES.length)];
    const isBottomWalker = type.bottomWalker;
    
    preys.push({
        type: type,
        x: Math.random() < 0.5 ? -30 : canvas.width + 30,
        y: isBottomWalker ? canvas.height - 40 - Math.random() * 20 : Math.random() * (canvas.height - 180) + state.waterLevel + 30,
        vx: (Math.random() > 0.5 ? 1 : -1) * type.speed,
        vy: isBottomWalker ? 0 : (Math.random() - 0.5) * 0.5,
        radius: type.size,
        emoji: type.emoji
    });
}

function spawnEnemy() {
    if (state.bossActive) return; // Stop minor spawns during Boss fight to balance focus
    
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    let x, y, vx, vy;

    if (type.isStatic) {
        x = Math.random() * (canvas.width - 100) + 50;
        y = state.waterLevel - 20; // drop down below water level
        vx = 0;
        vy = 1.3;
    } else {
        x = Math.random() < 0.5 ? -30 : canvas.width + 30;
        y = Math.random() * (canvas.height - 200) + state.waterLevel + 40;
        vx = (x < 0 ? 1 : -1) * type.speed;
        vy = (Math.random() - 0.5) * 0.5;
    }

    enemies.push({
        type: type,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        radius: type.size,
        emoji: type.emoji,
        health: type.health || 1,
        shootCooldown: 60 + Math.random() * 60
    });
}

function spawnFloatingCollectibles() {
    floatingItems.push({
        type: Math.random() < 0.3 ? 'mutagen' : 'debris',
        x: Math.random() * (canvas.width - 100) + 50,
        y: state.waterLevel - 25,
        vy: 1.1 + Math.random() * 0.4,
        radius: 12,
        emoji: Math.random() < 0.3 ? '🧪' : '⚙️'
    });
}

// ─── Particle Systems ───
function createBubble(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -0.6 - Math.random() * 1.5,
            radius: Math.random() * 4.5 + 1,
            color: 'rgba(255, 255, 255, 0.4)',
            life: 45 + Math.random() * 20,
            maxLife: 60
        });
    }
}

function createExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 6 + 1.5,
            color: color,
            life: 30 + Math.random() * 15,
            maxLife: 45
        });
    }
}

function createBloodSplat(x, y, count = 8) {
    createExplosion(x, y, 'rgba(255, 0, 50, 0.75)', count);
}

function createSplash(x, y, count = 35) {
    for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6; // Spray upwards
        const speed = Math.random() * 6 + 3;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 5 + 2,
            color: Math.random() < 0.4 ? 'rgba(0, 242, 254, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            life: 35 + Math.random() * 15,
            maxLife: 50,
            isSplashDrop: true
        });
    }
}

// Notification Text
let notificationTimer = 0;
let notificationText = '';
function showNotification(msg) {
    notificationText = msg;
    notificationTimer = 130;
}

// ─── Boss Mechanics ───
function triggerBossAlert() {
    state.bossSpawned = true;
    state.bossAlertTimer = 180; // 3 seconds warning
    document.getElementById('bossWarningAlert').classList.remove('hidden');
    state.cameraShake = 20;
}

function activateBossFight() {
    state.bossActive = true;
    document.getElementById('bossWarningAlert').classList.add('hidden');
    document.getElementById('bossHPBarContainer').classList.remove('hidden');
}

// ─── Game Loop & Systems Update ───
function gameLoop(timestamp) {
    if (!state.running || state.paused) return;

    update(timestamp);
    render(timestamp);

    requestAnimationFrame(gameLoop);
}

function update(timestamp) {
    // Screen shake decay
    if (state.cameraShake > 0) {
        state.cameraShake *= 0.92;
        if (state.cameraShake < 0.2) {
            state.cameraShake = 0;
            document.getElementById('viewportContainer').classList.remove('shake-screen');
        } else {
            document.getElementById('viewportContainer').classList.add('shake-screen');
        }
    }

    // Boss Alert Check
    if (state.score >= 3500 && !state.bossSpawned) {
        triggerBossAlert();
    }

    if (state.bossSpawned && state.bossAlertTimer > 0) {
        state.bossAlertTimer--;
        if (state.bossAlertTimer === 0) {
            activateBossFight();
        }
    }

    // 1. Spawning Mechanics
    if (!state.dying && !state.launching) {
        state.spawnTimer++;
        if (state.spawnTimer % Math.floor(75 / state.difficulty) === 0) {
            spawnPrey();
        }
        if (state.spawnTimer % Math.floor(170 / state.difficulty) === 0) {
            spawnEnemy();
        }
        if (state.spawnTimer % 380 === 0) {
            spawnFloatingCollectibles();
        }
    }

    // Prey Schooling Flocking AI + Fleeing Behavior
    preys.forEach((pr, idx) => {
        let flockX = 0;
        let flockY = 0;
        let flockCount = 0;
        
        preys.forEach(other => {
            if (other !== pr && Math.hypot(other.x - pr.x, other.y - pr.y) < 80) {
                flockX += other.x;
                flockY += other.y;
                flockCount++;
            }
        });

        if (flockCount > 0) {
            flockX /= flockCount;
            flockY /= flockCount;
            pr.vx += (flockX - pr.x) * 0.003;
            pr.vy += (flockY - pr.y) * 0.003;
        }

        const distToPlayer = Math.hypot(player.x - pr.x, player.y - pr.y);
        if (distToPlayer < 180 && !state.dying && !state.launching) {
            const angleAway = Math.atan2(pr.y - player.y, pr.x - player.x);
            pr.vx += Math.cos(angleAway) * 0.25;
            pr.vy += Math.sin(angleAway) * 0.25;
        }
    });

    // 2. Player Steering / Launch Dropping Physics
    if (state.launching) {
        player.vx = 0;
        
        if (!state.hasSplashed) {
            player.vy += 0.38; // gravity drop acceleration
            player.y += player.vy;
            player.angle = Math.PI / 2; // Face down

            // Check water line cross
            if (player.y >= state.waterLevel) {
                state.hasSplashed = true;
                createSplash(player.x, state.waterLevel, 45); // Explode water splash upwards
                state.cameraShake = 30; // Splash impact shake!
                player.vy *= 0.25; // Drag slowdown
            }
        } else {
            // Settle in water
            player.vy += (0 - player.vy) * 0.08;
            player.y += player.vy;
            // Level out angle
            player.angle += (0 - player.angle) * 0.1;
        }

        state.launchTimer--;
        if (state.launchTimer <= 0) {
            state.launching = false;
            player.angle = 0;
            player.vy = 0;
        }
    } else if (state.dying) {
        player.vx = 0;
        player.vy = 0.55; // Sink slowly
        player.angle += 0.075; // Spin slowly
        player.x += Math.sin(timestamp * 0.005) * 0.45;
        player.y += player.vy;

        if (state.deathTimer % 2 === 0) {
            particles.push({
                x: player.x + (Math.random() - 0.5) * 15,
                y: player.y + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 3.5,
                vy: -0.6 + (Math.random() - 0.5) * 1.5,
                radius: Math.random() * 8 + 4,
                color: Math.random() < 0.35 ? 'rgba(160, 0, 10, 0.75)' : 'rgba(240, 10, 30, 0.85)',
                life: 95 + Math.random() * 50,
                maxLife: 150,
                isBlood: true
            });
            state.cameraShake = Math.max(state.cameraShake, 9);
        }

        state.deathTimer--;
        if (state.deathTimer <= 0) {
            state.dying = false;
            gameOver();
        }
    } else {
        // Normal Steering Physics
        let targetX = mouse.x;
        let targetY = mouse.y;

        let keyMoving = false;
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['arrowup']) { dy = -1; keyMoving = true; }
        if (keys['s'] || keys['arrowdown']) { dy = 1; keyMoving = true; }
        if (keys['a'] || keys['arrowleft']) { dx = -1; keyMoving = true; }
        if (keys['d'] || keys['arrowright']) { dx = 1; keyMoving = true; }

        if (player.isDashing) {
            player.dashTimer--;
            if (player.dashTimer <= 0) {
                player.isDashing = false;
            }
        } else {
            if (keyMoving) {
                const len = Math.sqrt(dx * dx + dy * dy);
                player.vx = (dx / len) * player.speed;
                player.vy = (dy / len) * player.speed;
            } else {
                const distance = Math.hypot(targetX - player.x, targetY - player.y);
                if (distance > 10) {
                    const angle = Math.atan2(targetY - player.y, targetX - player.x);
                    player.vx = Math.cos(angle) * player.speed;
                    player.vy = Math.sin(angle) * player.speed;
                } else {
                    player.vx *= 0.85;
                    player.vy *= 0.85;
                }
            }
        }

        player.x += player.vx;
        player.y += player.vy;

        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius + 20, Math.min(canvas.height - player.radius - 20, player.y));

        if (Math.hypot(player.vx, player.vy) > 0.5) {
            player.angle = Math.atan2(player.vy, player.vx);
            player.facingLeft = Math.cos(player.angle) < 0;
        }
    }

    // Cooldown updates
    if (player.dashCooldown > 0) player.dashCooldown--;
    if (state.shieldRechargeTimer > 0) {
        state.shieldRechargeTimer--;
        if (state.shieldRechargeTimer === 0 && state.upgrades.shield) {
            state.shieldActive = true;
            createExplosion(player.x, player.y, '#00f2fe', 10);
            showNotification("Shield Recharged");
        }
    }

    // 3. Automated Cyber weapons (Homing Missiles)
    if (state.upgrades.missiles && !state.dying && !state.launching) {
        state.missileTimer++;
        if (state.missileTimer >= 140) {
            state.missileTimer = 0;
            fireHomingMissile();
        }
    }

    // Passive mutations ticks
    if (state.upgrades.electric && !state.dying && !state.launching) {
        state.electricTimer++;
        if (state.electricTimer >= 150) {
            state.electricTimer = 0;
            triggerElectricBlast();
        }
    }

    if (state.upgrades.acid && !state.dying && !state.launching) {
        state.acidTimer++;
        if (state.acidTimer >= 90) {
            state.acidTimer = 0;
            triggerAcidSpit();
        }
    }

    // 4. Update Damage clouds (Acid puddles)
    damageClouds.forEach((cloud, cIdx) => {
        cloud.timer--;
        enemies.forEach((en, eIdx) => {
            if (Math.hypot(en.x - cloud.x, en.y - cloud.y) < cloud.radius) {
                en.health -= 0.5;
                createBubble(en.x, en.y, 1);
                if (en.health <= 0) {
                    destroyEnemy(en, eIdx);
                }
            }
        });

        if (state.bossActive) {
            if (Math.hypot(boss.x - cloud.x, boss.y - cloud.y) < cloud.radius + boss.radius) {
                boss.health -= 1.0;
                updateBossHPBar();
                if (boss.health <= 0) {
                    triggerBossDefeat();
                }
            }
        }

        if (cloud.timer <= 0) {
            damageClouds.splice(cIdx, 1);
        }
    });

    // 5. Boss Fight loop
    if (state.bossActive) {
        updateBoss(timestamp);
    }

    // Update Particles (including gravity falls for splashes)
    particles.forEach((p, idx) => {
        if (p.isBlood) {
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.vy += 0.025;
            p.x += Math.sin(timestamp * 0.005 + p.y) * 0.25;
        }
        if (p.isSplashDrop) {
            p.vy += 0.22; // gravity fall of droplets in lab air
        }
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(idx, 1);
    });

    preys.forEach((pr, idx) => {
        pr.x += pr.vx;
        pr.y += pr.vy;

        if (!pr.type.bottomWalker) {
            pr.vy += Math.sin(timestamp * 0.005 + pr.x) * 0.06;
        }

        if (Math.random() < 0.015) {
            createBubble(pr.x, pr.y, 1);
        }

        if (pr.x < -80 || pr.x > canvas.width + 80) {
            preys.splice(idx, 1);
        }
    });

    aquariumItems.forEach(item => {
        item.timer++;
        
        if (item.type === 'coral' && item.timer % 280 === 0) {
            preys.push({
                type: PREY_TYPES[Math.floor(Math.random() * 3)],
                x: item.x,
                y: item.y - 20,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1.0,
                radius: 12,
                emoji: '🐠'
            });
            createBubble(item.x, item.y, 2);
        }

        if (item.type === 'wreckage' && item.timer % 380 === 0) {
            floatingItems.push({
                type: 'debris',
                x: item.x + (Math.random() - 0.5) * 20,
                y: item.y - 15,
                vy: -0.6,
                radius: 10,
                emoji: '⚙️'
            });
        }

        if (item.type === 'vent' && item.timer % 550 === 0) {
            floatingItems.push({
                type: 'mutagen',
                x: item.x,
                y: item.y - 20,
                vy: -0.8,
                radius: 10,
                emoji: '🧪'
            });
            createExplosion(item.x, item.y, '#a78bfa', 5);
        }
    });

    floatingItems.forEach((item, idx) => {
        item.y += item.vy;
        if (item.y > canvas.height + 40 || item.y < -40) {
            floatingItems.splice(idx, 1);
        }
    });

    // Projectiles
    projectiles.forEach((proj, idx) => {
        if (proj.type === 'missile') {
            let target = null;
            let minDist = 9999;
            
            if (state.bossActive) {
                target = boss;
            } else {
                enemies.forEach(en => {
                    const d = Math.hypot(en.x - proj.x, en.y - proj.y);
                    if (d < minDist) {
                        minDist = d;
                        target = en;
                    }
                });
            }

            if (target) {
                const targetAngle = Math.atan2(target.y - proj.y, target.x - proj.x);
                proj.angle += (targetAngle - proj.angle) * 0.12;
                proj.vx = Math.cos(proj.angle) * 8.5;
                proj.vy = Math.sin(proj.angle) * 8.5;
            }

            if (Math.random() < 0.45) {
                particles.push({
                    x: proj.x,
                    y: proj.y,
                    vx: (Math.random() - 0.5) * 1.0,
                    vy: (Math.random() - 0.5) * 1.0,
                    radius: Math.random() * 3 + 1,
                    color: 'rgba(255, 100, 0, 0.45)',
                    life: 20,
                    maxLife: 20
                });
            }
        }

        proj.x += proj.vx;
        proj.y += proj.vy;

        if (proj.x < -20 || proj.x > canvas.width + 20 || proj.y < -20 || proj.y > canvas.height + 20) {
            projectiles.splice(idx, 1);
        }
    });

    enemies.forEach((enemy, idx) => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        if (enemy.type.isStatic && enemy.y >= canvas.height - 60) {
            enemy.vy = 0;
            enemy.vx = Math.sin(timestamp * 0.002) * 0.5;
        }

        if (enemy.type.shoots && !state.dying && !state.launching) {
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0) {
                enemy.shootCooldown = 120 + Math.random() * 100;
                const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                projectiles.push({
                    type: 'bullet',
                    x: enemy.x + Math.cos(ang) * enemy.radius,
                    y: enemy.y + Math.sin(ang) * enemy.radius,
                    vx: Math.cos(ang) * 5.8,
                    vy: Math.sin(ang) * 5.8,
                    radius: 3.5,
                    color: '#ff3b30'
                });
            }
        }

        if (enemy.x < -80 || enemy.x > canvas.width + 80) {
            enemies.splice(idx, 1);
        }
    });

    if (!state.dying && !state.launching) {
        checkCollisions(timestamp);
    }

    if (Math.hypot(player.vx, player.vy) > 2 && !state.dying && !state.launching) {
        createBubble(player.x - Math.cos(player.angle) * (player.radius * 0.8), player.y - Math.sin(player.angle) * (player.radius * 0.4), 1);
    }

    if (notificationTimer > 0) notificationTimer--;
}

function updateBoss(timestamp) {
    if (boss.state === 'enter') {
        boss.y += (boss.targetY - boss.y) * 0.03;
        if (Math.abs(boss.y - boss.targetY) < 5) {
            boss.state = 'fight';
        }
    } else if (boss.state === 'fight') {
        boss.x += boss.vx;
        if (boss.x < 100 || boss.x > canvas.width - 100) {
            boss.vx = -boss.vx;
        }

        boss.shootCooldown--;
        if (boss.shootCooldown <= 0) {
            boss.shootCooldown = 80 + Math.random() * 60;
            
            if (Math.random() < 0.45) {
                boss.state = 'sweep';
                boss.sweepTimer = 180;
            } else {
                for (let i = -2; i <= 2; i++) {
                    const ang = Math.atan2(player.y - boss.y, player.x - boss.x) + (i * 0.18);
                    projectiles.push({
                        type: 'bullet',
                        x: boss.x + Math.cos(ang) * boss.radius,
                        y: boss.y + Math.sin(ang) * boss.radius,
                        vx: Math.cos(ang) * 6.0,
                        vy: Math.sin(ang) * 6.0,
                        radius: 5,
                        color: '#ff3b30'
                    });
                }
                state.cameraShake = 12;
            }
        }
    } else if (boss.state === 'sweep') {
        boss.sweepTimer--;
        
        const laserAngle = Math.PI/2 + Math.sin(timestamp * 0.015) * 0.6;
        if (boss.sweepTimer % 6 === 0) {
            projectiles.push({
                type: 'bullet',
                x: boss.x,
                y: boss.y,
                vx: Math.cos(laserAngle) * 7.5,
                vy: Math.sin(laserAngle) * 7.5,
                radius: 4.5,
                color: '#ff2a00'
            });
        }

        if (boss.sweepTimer <= 0) {
            boss.state = 'fight';
        }
    }
}

function updateBossHPBar() {
    const bar = document.getElementById('bossHealthBar');
    const pct = (boss.health / boss.maxHealth) * 100;
    bar.style.width = `${Math.max(0, pct)}%`;
}

function triggerBossDefeat() {
    state.bossActive = false;
    state.bossDefeated = true;
    document.getElementById('bossHPBarContainer').classList.add('hidden');
    
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            createExplosion(boss.x + (Math.random() - 0.5) * 100, boss.y + (Math.random() - 0.5) * 80, '#ff3b30', 25);
            state.cameraShake = 15;
        }, i * 200);
    }

    state.score += 10000;
    state.debris += 150;
    state.mutagens += 10;
    updateStatsHUD();
    showNotification("🏆 ROBO-KRAKEN DESTROYED! AQUARIUM COMPLEX CLEARED!");
}

function fireHomingMissile() {
    let target = null;
    let minDist = 9999;
    
    if (state.bossActive) {
        target = boss;
    } else {
        enemies.forEach(en => {
            const d = Math.hypot(en.x - player.x, en.y - player.y);
            if (d < minDist) {
                minDist = d;
                target = en;
            }
        });
    }

    const startAngle = player.angle;
    projectiles.push({
        type: 'missile',
        x: player.x,
        y: player.y,
        vx: Math.cos(startAngle) * 6,
        vy: Math.sin(startAngle) * 6,
        angle: startAngle,
        radius: 6,
        color: '#ff9500'
    });
}

function triggerElectricBlast() {
    createExplosion(player.x, player.y, '#00ffff', 14);
    state.cameraShake = 4;
    
    const radius = 190;
    preys.forEach((pr, idx) => {
        if (Math.hypot(pr.x - player.x, pr.y - player.y) < radius) {
            createExplosion(pr.x, pr.y, '#00ffff', 6);
            state.biomass += pr.type.biomass;
            addXp(pr.type.biomass * 10);
            state.score += pr.type.score;
            preys.splice(idx, 1);
        }
    });

    enemies.forEach((enemy, idx) => {
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius) {
            createExplosion(enemy.x, enemy.y, '#ffea00', 8);
            enemy.health -= 20;
            if (enemy.health <= 0) {
                destroyEnemy(enemy, idx);
            }
        }
    });

    if (state.bossActive) {
        if (Math.hypot(boss.x - player.x, boss.y - player.y) < radius + boss.radius) {
            boss.health -= 35;
            updateBossHPBar();
            createExplosion(boss.x, boss.y, '#ffea00', 12);
            if (boss.health <= 0) {
                triggerBossDefeat();
            }
        }
    }

    updateStatsHUD();
}

function triggerAcidSpit() {
    let closest = null;
    let minDist = 300;
    enemies.forEach(enemy => {
        const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (d < minDist) {
            minDist = d;
            closest = enemy;
        }
    });

    const angle = closest ? Math.atan2(closest.y - player.y, closest.x - player.x) : player.angle;
    projectiles.push({
        type: 'acid',
        x: player.x + Math.cos(angle) * player.radius,
        y: player.y + Math.sin(angle) * player.radius,
        vx: Math.cos(angle) * 7.8,
        vy: Math.sin(angle) * 7.8,
        radius: 6,
        color: '#05f3a2'
    });
}

function addXp(amount) {
    player.xp += amount;
    if (player.xp >= player.nextLevelXp) {
        player.xp -= player.nextLevelXp;
        player.level++;
        player.nextLevelXp = Math.floor(player.nextLevelXp * 1.3);
        
        player.scaleMultiplier = 1.0 + (player.level - 1) * 0.18;
        player.radius = player.baseRadius * player.scaleMultiplier;
        
        player.maxHealth += 20;
        player.health = player.maxHealth;

        createExplosion(player.x, player.y, '#8b5cf6', 35);
        state.cameraShake = 12;
        showNotification(`📈 SHARK MUTATED TO LEVEL ${player.level}!`);
    }
}

function destroyEnemy(enemy, idx) {
    createExplosion(enemy.x, enemy.y, '#ff5500', 20);
    state.cameraShake = 6;
    state.debris += enemy.type.debris;
    state.score += (enemy.type.debris * 50);
    
    floatingItems.push({
        type: 'debris',
        x: enemy.x,
        y: enemy.y,
        vy: 0.8,
        radius: 10,
        emoji: '⚙️'
    });

    if (Math.random() < 0.28) {
        state.mutagens += 1;
        showNotification("+1 MUTAGEN 🧪 RECOVERED!");
    }

    enemies.splice(idx, 1);
    updateStatsHUD();
}

function checkCollisions(timestamp) {
    preys.forEach((pr, idx) => {
        const dist = Math.hypot(pr.x - player.x, pr.y - player.y);
        if (dist < player.radius + pr.radius) {
            createBloodSplat(pr.x, pr.y, 6);
            player.health = Math.min(player.health + pr.type.biomass * 3, player.maxHealth);
            state.biomass += pr.type.biomass;
            state.score += pr.type.score;
            addXp(pr.type.biomass * 10);
            preys.splice(idx, 1);
            updateStatsHUD();
        }
    });

    floatingItems.forEach((item, idx) => {
        const dist = Math.hypot(item.x - player.x, item.y - player.y);
        if (dist < player.radius + item.radius) {
            createExplosion(item.x, item.y, '#00f2fe', 10);
            if (item.type === 'debris') {
                state.debris += Math.floor(Math.random() * 3) + 2;
                showNotification("+Debris ⚙️");
            } else if (item.type === 'mutagen') {
                state.mutagens += 1;
                showNotification("+Mutagen 🧪");
            }
            floatingItems.splice(idx, 1);
            updateStatsHUD();
        }
    });

    enemies.forEach((enemy, idx) => {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < player.radius + enemy.radius) {
            
            if (enemy.emoji === 'scuba' || enemy.emoji === 'robot' || enemy.type.emoji === 'scuba' || enemy.type.emoji === 'robot') {
                createBloodSplat(enemy.x, enemy.y, 25);
                
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 4 + 1;
                    particles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: player.vx * 0.4 + Math.cos(angle) * speed,
                        vy: player.vy * 0.4 + Math.sin(angle) * speed,
                        radius: Math.random() * 7 + 2.5,
                        color: Math.random() < 0.35 ? 'rgba(160, 0, 10, 0.7)' : 'rgba(230, 20, 30, 0.8)',
                        life: 55 + Math.random() * 45,
                        maxLife: 100,
                        isBlood: true
                    });
                }
                
                player.health = Math.min(player.health + 15, player.maxHealth);
                state.debris += enemy.type.debris;
                state.score += (enemy.type.debris * 100);
                addXp(45);
                
                enemies.splice(idx, 1);
                state.cameraShake = 12;
                showNotification("🦈 DEVOUR ENEMY +DEBRIS!");
                updateStatsHUD();
            } else {
                dealPlayerDamage(enemy.type.damage);
                
                if (enemy.type.isStatic || enemy.type.emoji === '💣') {
                    createExplosion(enemy.x, enemy.y, '#ff3300', 30);
                    enemies.splice(idx, 1);
                } else {
                    player.vx = -player.vx * 1.5;
                    player.vy = -player.vy * 1.5;
                }
            }
        }
    });

    if (state.bossActive) {
        const distToBoss = Math.hypot(player.x - boss.x, player.y - boss.y);
        if (distToBoss < player.radius + boss.radius) {
            boss.health -= 60;
            updateBossHPBar();
            
            createBloodSplat(player.x, player.y, 18);
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 1.5;
                particles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 8 + 3,
                    color: 'rgba(190, 0, 15, 0.75)',
                    life: 60 + Math.random() * 40,
                    maxLife: 100,
                    isBlood: true
                });
            }
            
            player.vx = -player.vx * 1.2;
            player.vy = -player.vy * 1.2;
            dealPlayerDamage(8);
            
            if (boss.health <= 0) {
                triggerBossDefeat();
            }
        }
    }

    projectiles.forEach((proj, pIdx) => {
        if (proj.type === 'laser' || proj.type === 'acid' || proj.type === 'missile') {
            enemies.forEach((enemy, eIdx) => {
                const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (dist < proj.radius + enemy.radius) {
                    createExplosion(proj.x, proj.y, proj.color, 12);
                    projectiles.splice(pIdx, 1);

                    let dmg = 10;
                    if (proj.type === 'acid') {
                        dmg = 20;
                        damageClouds.push({
                            x: proj.x,
                            y: proj.y,
                            radius: 50,
                            timer: 180,
                            color: 'rgba(5, 243, 162, 0.25)'
                        });
                    }
                    if (proj.type === 'missile') dmg = 45;

                    enemy.health -= dmg;
                    if (enemy.health <= 0) {
                        destroyEnemy(enemy, eIdx);
                    }
                }
            });

            if (state.bossActive) {
                const distToBoss = Math.hypot(proj.x - boss.x, proj.y - boss.y);
                if (distToBoss < proj.radius + boss.radius) {
                    createExplosion(proj.x, proj.y, proj.color, 12);
                    projectiles.splice(pIdx, 1);

                    let dmg = proj.type === 'missile' ? 55 : (proj.type === 'acid' ? 25 : 12);
                    boss.health -= dmg;
                    updateBossHPBar();

                    if (boss.health <= 0) {
                        triggerBossDefeat();
                    }
                }
            }
        } else if (proj.type === 'bullet') {
            const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
            if (dist < proj.radius + player.radius) {
                createExplosion(proj.x, proj.y, proj.color, 6);
                projectiles.splice(pIdx, 1);
                dealPlayerDamage(12);
            }
        }
    });
}

function dealPlayerDamage(amount) {
    if (state.shieldActive) {
        state.shieldActive = false;
        state.shieldRechargeTimer = 360;
        createExplosion(player.x, player.y, '#00f2fe', 25);
        state.cameraShake = 15;
        showNotification("Shield Shattered!");
        return;
    }

    const finalDamage = amount * player.damageReduction;
    player.health -= finalDamage;
    state.cameraShake = 18;

    createBloodSplat(player.x, player.y, 16);

    if (player.health <= 0 && !state.dying) {
        state.dying = true;
        state.deathTimer = 180; // 3 seconds at 60 FPS
    }
    updateStatsHUD();
}

// ─── Canvas Renderer ───
function render(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (state.cameraShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.cameraShake;
        const shakeY = (Math.random() - 0.5) * state.cameraShake;
        ctx.translate(shakeX, shakeY);
    }

    // 1. Background (Above water vs Below water)
    // Draw Lab Bay air for top section (y < waterLevel)
    ctx.fillStyle = '#141424';
    ctx.fillRect(0, 0, canvas.width, state.waterLevel);
    
    // Draw laboratory steel pillars/crane grid lines in air
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 4;
    for (let i = 0; i < canvas.width; i += 120) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, state.waterLevel);
        ctx.stroke();
    }

    // Draw Deep water background gradients below waterLevel
    const lightGrd = ctx.createLinearGradient(0, state.waterLevel, 0, canvas.height);
    lightGrd.addColorStop(0, '#0a1d37');
    lightGrd.addColorStop(1, '#02030a');
    ctx.fillStyle = lightGrd;
    ctx.fillRect(0, state.waterLevel, canvas.width, canvas.height - state.waterLevel);

    // 2. Light Shafts (only below waterLevel)
    ctx.fillStyle = 'rgba(0, 242, 254, 0.03)';
    for (let i = 0; i < 4; i++) {
        const offset = Math.sin(timestamp * 0.001 + i) * 60;
        ctx.beginPath();
        ctx.moveTo(150 + i * 200 + offset, state.waterLevel);
        ctx.lineTo(220 + i * 200 + offset, state.waterLevel);
        ctx.lineTo(380 + i * 200 + offset * 1.5, canvas.height);
        ctx.lineTo(120 + i * 200 + offset * 1.5, canvas.height);
        ctx.fill();
    }

    // Draw wavy cyan water surface line
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, state.waterLevel);
    for (let x = 0; x <= canvas.width; x += 15) {
        const y = state.waterLevel + Math.sin(x * 0.02 + timestamp * 0.004) * 3.5;
        ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bottom floor
    ctx.fillStyle = 'rgba(2, 242, 254, 0.03)';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();

    // Render Deployed Aquarium Items
    aquariumItems.forEach(item => {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${item.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, item.x, item.y);
        
        ctx.fillStyle = item.type === 'coral' ? 'rgba(0, 242, 254, 0.1)' : (item.type === 'vent' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)');
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Render Acid damage clouds
    damageClouds.forEach(cloud => {
        ctx.fillStyle = cloud.color;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(5, 243, 162, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Render Prey
    preys.forEach(pr => {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        if (pr.vx < 0) {
            ctx.scale(-1, 1);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = `${pr.radius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pr.emoji, 0, 0);
        ctx.restore();
    });

    // Render Floating Collectibles
    floatingItems.forEach(item => {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${item.radius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, item.x, item.y);
    });

    // Render Projectiles
    projectiles.forEach(proj => {
        if (proj.type === 'missile') {
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.rotate(proj.angle);
            ctx.fillStyle = '#ffffff';
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚀', 0, 0);
            ctx.restore();
        } else {
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = proj.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });

    // Render Enemies
    enemies.forEach(enemy => {
        if (enemy.type.shoots && Math.hypot(enemy.x - player.x, enemy.y - player.y) < 500 && !state.dying && !state.launching) {
            ctx.strokeStyle = 'rgba(255, 59, 48, 0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(player.x, player.y);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.fillStyle = '#ffffff';
        
        if (enemy.emoji === 'scuba' || enemy.emoji === 'robot') {
            if (enemy.vx < 0) ctx.scale(-1, 1);
            ctx.font = `${enemy.radius * 2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.type.emoji === 'scuba' ? '🧑‍🚀' : '🤖', 0, 0);
        } else {
            ctx.font = `${enemy.radius * 2.2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.emoji, 0, 0);
        }
        ctx.restore();
    });

    // Render Robo-Kraken Boss (🐙)
    if (state.bossActive) {
        ctx.save();
        ctx.translate(boss.x, boss.y);
        
        const glowRad = boss.radius * 1.5 + Math.sin(timestamp * 0.01) * 10;
        const radialGrd = ctx.createRadialGradient(0,0, 10, 0,0, glowRad);
        radialGrd.addColorStop(0, 'rgba(255, 59, 48, 0.25)');
        radialGrd.addColorStop(1, 'rgba(255, 59, 48, 0)');
        ctx.fillStyle = radialGrd;
        ctx.beginPath();
        ctx.arc(0,0, glowRad, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `${boss.radius * 2.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐙', 0, 0);
        ctx.restore();

        if (boss.state === 'sweep' && !state.dying && !state.launching) {
            ctx.strokeStyle = 'rgba(255, 59, 48, 0.4)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(boss.x, boss.y);
            ctx.lineTo(player.x, player.y);
            ctx.stroke();
        }
    }

    // Render Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
    });

    // Render Player (Shark)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    if (state.dying) {
        ctx.scale(-1, -1);
    } else {
        if (player.facingLeft) {
            ctx.scale(1, -1);
        } else {
            ctx.scale(-1, 1);
        }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `${player.radius * 2.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦈', 0, 0);

    // Cyber weapon additions
    if (!state.dying && !state.launching) {
        if (state.upgrades.lasers || state.upgrades.missiles) {
            ctx.fillStyle = 'rgba(0, 242, 254, 0.85)';
            ctx.fillRect(-15, -12, 10, 6);
            if (state.upgrades.missiles) {
                ctx.fillStyle = '#ff9500';
                ctx.fillRect(-8, -16, 6, 4);
            }
        }

        if (state.upgrades.thruster) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.fillText('🚀', 18, 12);
        }
    }

    ctx.restore();

    // Draw Plasma Force Shield
    if (state.shieldActive && !state.dying && !state.launching) {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const shieldPulse = player.radius * 1.5 + Math.sin(timestamp * 0.01) * 3;
        ctx.arc(player.x, player.y, shieldPulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 242, 254, 0.08)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, shieldPulse, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Render Screen Alert Banner
    if (notificationTimer > 0) {
        ctx.fillStyle = 'rgba(3, 3, 13, 0.85)';
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.lineWidth = 2;
        ctx.fillRect(canvas.width / 2 - 200, 30, 400, 45);
        ctx.strokeRect(canvas.width / 2 - 200, 30, 400, 45);

        ctx.fillStyle = '#00f2fe';
        ctx.font = 'bold 13px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(notificationText, canvas.width / 2, 52);
    }
}
