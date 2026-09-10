// Server Saver Shield - Strategic Security Management Game (SSSSS)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function resize() {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 140;
    const scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT, 1);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    switch(type) {
        case 'shoot': osc.type = 'square'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.1); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); break;
        case 'hit': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08); osc.start(now); osc.stop(now + 0.08); break;
        case 'die': osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
        case 'powerup': osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.15); osc.start(now); osc.stop(now + 0.15); break;
        case 'nuke': osc.type = 'square'; osc.frequency.setValueAtTime(400, now); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.5); osc.start(now); osc.stop(now + 0.5); break;
        case 'damage': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2); break;
    }
}

let gameRunning = false, gamePaused = false;
let score = 0, wave = 1, kills = 0, maxCombo = 1;
let inputX = CANVAS_WIDTH / 2, inputY = CANVAS_HEIGHT - 100, inputDown = false;
let player = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, radius: 25, shootCooldown: 0, hasCompanion: false, companionTimer: 0 };
let bullets = [], enemies = [], particles = [], powerups = [], floatingTexts = [], stars = [];
let spawnTimer = 0, waveTimer = 0, waveDuration = 600, comboCount = 0, comboTimer = 0;
let shieldTimer = 0;
let isShooting = false;
let currentWeapon = 'standard';
let weaponTimer = 0;
let weaponTimerMax = 600;
let difficulty = 'easy';
let killHistory = [];
let difficultyMultipliers = { easy: { spawnRate: 0.7, playerDamage: 1.3 }, hard: { spawnRate: 1.5, playerDamage: 0.8 } };

let gameState = {
    balance: 1000,
    incomePerSec: 10,
    customerTrust: 100,
    reputation: 50,
    serverCount: 1,
    bankruptcyTimer: 0,
    selectedServer: 0,
    fraudsterCount: 0,
    cryptominerCount: 0,
    totalComputeUsed: 0,
    maxComputeUsed: 0
};

let servers = [];
let staff = [];
let upgrades = { serverHPBoost: 0, rapidFire: 0, multiShot: 0, cdn: 0, firewall: 0, prCampaign: 0 };

const STAFF_TYPES = {
    firewall: { name: 'Firewall Tech', emoji: '\uD83D\uDD25', hireCost: 200, salarySec: 5, ability: 'DDOS 15s->8s' },
    responder: { name: 'Incident Responder', emoji: '\uD83D\uDE98', hireCost: 300, salarySec: 8, ability: 'Ransom -50%' },
    analyst: { name: 'SOC Analyst', emoji: '\uD83D\uDD0D', hireCost: 250, salarySec: 6, ability: 'Stealth detect' },
    pentester: { name: 'Pen Tester', emoji: '\uD83E\uDD16', hireCost: 280, salarySec: 7, ability: 'Dmg +50%' },
    ciso: { name: 'CISO', emoji: '\uD83D\uDC74', hireCost: 400, salarySec: 12, ability: 'Trust protect' },
    pr: { name: 'PR Officer', emoji: '\uD83D\uDCE2', hireCost: 350, salarySec: 9, ability: 'Reputation +2/s' },
    writer: { name: 'Article Writer', emoji: '\u270D\uFE0F', hireCost: 280, salarySec: 7, ability: 'Social Eng -50%' },
    networkeng: { name: 'Network Engineer', emoji: '\uD83D\uDD17', hireCost: 320, salarySec: 8, ability: 'Crypto -30%' },
    devops: { name: 'DevOps Engineer', emoji: '\uD83D\uDE80', hireCost: 380, salarySec: 10, ability: 'Server +20HP' },
    architect: { name: 'Solutions Architect', emoji: '\uD83C\uDFD7', hireCost: 450, salarySec: 14, ability: 'Income +15%' },
    compliance: { name: 'Compliance Officer', emoji: '\u2696\uFE0F', hireCost: 300, salarySec: 8, ability: 'Fraud -40%' },
    backup: { name: 'Backup Admin', emoji: '\uD83D\uDCBE', hireCost: 220, salarySec: 6, ability: 'Recovery +2x' },
    monitor: { name: 'Monitoring Specialist', emoji: '\uD83D\uDCCA', hireCost: 270, salarySec: 7, ability: 'Threat +5s warn' },
    trainer: { name: 'Security Trainer', emoji: '\uD83C\uDFAB', hireCost: 260, salarySec: 6, ability: 'Trust +1/s' },
    vendor: { name: 'Vendor Manager', emoji: '\uD83D\uDCB1', hireCost: 290, salarySec: 7, ability: 'Cost -10%' },
    hr: { name: 'HR Manager', emoji: '\uD83D\uDC65', hireCost: 240, salarySec: 6, ability: 'Morale +5%' },
    legal: { name: 'Legal Counsel', emoji: '\uD83D\uDCDC', hireCost: 500, salarySec: 15, ability: 'Ransom -70%' }
};

const ENEMIES = {
    blackhat: { name: 'Black Hat', emoji: '\uD83C\uDFA9', hp: 1, speed: 2.5, score: 10, color: '#a855f7', radius: 18, behavior: 'direct', reputationDmg: 2, computeUsage: 50 },
    trojan: { name: 'Trojan Horse', emoji: '\uD83D\uDC34', hp: 3, speed: 1.5, score: 50, color: '#f59e0b', radius: 24, behavior: 'stealth', reputationDmg: 3, computeUsage: 80 },
    pentester: { name: 'AI Pen Tester', emoji: '\uD83E\uDD16', hp: 2, speed: 3.5, score: 30, color: '#06b6d4', radius: 16, behavior: 'evasive', reputationDmg: 1, computeUsage: 40 },
    agency: { name: 'Intelligence Agency', emoji: '\uD83E\uDDE0', hp: 4, speed: 2, score: 60, color: '#8b5cf6', radius: 22, behavior: 'strategic', reputationDmg: 4, computeUsage: 120 },
    ddos: { name: 'DDOS Attack', emoji: '\uD83D\uDD25', hp: 5, speed: 1, score: 100, color: '#dc2626', radius: 30, behavior: 'direct', reputationDmg: 5, computeUsage: 200 },
    ransomware: { name: 'Ransomware', emoji: '\uD83D\uDD12', hp: 4, speed: 1.2, score: 80, color: '#ec4899', radius: 26, behavior: 'stealth', reputationDmg: 6, computeUsage: 150 },
    fraudster: { name: 'Fraudster', emoji: '\uD83D\uDCB5', hp: 2, speed: 2, score: 40, color: '#f97316', radius: 16, behavior: 'economic', reputationDmg: 7, computeUsage: 100 },
    socialeng: { name: 'Social Engineer', emoji: '\uD83D\uDC40', hp: 1, speed: 2.8, score: 25, color: '#06b6d4', radius: 14, behavior: 'direct', reputationDmg: 8, computeUsage: 60 },
    cryptominer: { name: 'Cryptominer', emoji: '\u26CF', hp: 3, speed: 1.8, score: 55, color: '#f59e0b', radius: 20, behavior: 'stealth', reputationDmg: 4, computeUsage: 180 }
};

function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, size: Math.random() * 2 + 0.5, speed: Math.random() * 2 + 0.5, brightness: Math.random(), twinkle: Math.random() * 0.1 });
    }
}

function initServers() {
    servers = [];
    for (let i = 0; i < 5; i++) {
        servers.push({
            id: i, status: i === 0 ? 'ONLINE' : 'OFFLINE', hp: 100, maxHp: 100, incomePerSec: 10, customers: i === 0 ? 100 : 0,
            backupLinked: false, backupTarget: -1, ddosCountdown: 0, ransomAmount: 0, cryptoMinerDamage: 0
        });
    }
}

canvas.addEventListener('mousemove', (e) => { const rect = canvas.getBoundingClientRect(); const scale = canvas.width / rect.width; inputX = (e.clientX - rect.left) * scale; inputY = (e.clientY - rect.top) * scale; });
canvas.addEventListener('mousedown', (e) => { e.preventDefault(); isShooting = !isShooting; });
canvas.addEventListener('mouseup', () => {});
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const rect = canvas.getBoundingClientRect(); const scale = canvas.width / rect.width; const t = e.touches[0]; inputX = (t.clientX - rect.left) * scale; inputY = (t.clientY - rect.top) * scale; }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isShooting = !isShooting; const rect = canvas.getBoundingClientRect(); const scale = canvas.width / rect.width; const t = e.touches[0]; inputX = (t.clientX - rect.left) * scale; inputY = (t.clientY - rect.top) * scale; }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); });
window.addEventListener('keydown', (e) => { if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (gameRunning && !gamePaused) pauseGame(); else if (gamePaused) resumeGame(); } });

const WEAPONS = {
    standard: { name: 'Standard', emoji: '🔵', fireRate: 8, bulletCount: 1, spread: 0, speed: 8, radius: 6, color: '#fbbf24', damage: 1 },
    spreadshot: { name: 'Spreadshot', emoji: '🔶', fireRate: 10, bulletCount: 5, spread: 0.6, speed: 6, radius: 5, color: '#f97316', damage: 0.8 },
    laser: { name: 'Laser', emoji: '🔴', fireRate: 4, bulletCount: 1, spread: 0, speed: 12, radius: 3, color: '#dc2626', damage: 2 },
    flamethrower: { name: 'Flamethrower', emoji: '🔥', fireRate: 2, bulletCount: 8, spread: 1.2, speed: 4, radius: 4, color: '#f59e0b', damage: 0.6 },
    sniper: { name: 'Sniper', emoji: '🎯', fireRate: 20, bulletCount: 1, spread: 0, speed: 15, radius: 2, color: '#10b981', damage: 3 },
    grenadelauncher: { name: 'Grenade Launcher', emoji: '💣', fireRate: 15, bulletCount: 1, spread: 0, speed: 5, radius: 8, color: '#8b5cf6', damage: 2.5 },
    machinegun: { name: 'Machine Gun', emoji: '🔫', fireRate: 2, bulletCount: 2, spread: 0.3, speed: 10, radius: 4, color: '#6b7280', damage: 1.2 },
    icebeam: { name: 'Ice Beam', emoji: '❄️', fireRate: 6, bulletCount: 3, spread: 0.4, speed: 7, radius: 5, color: '#06b6d4', damage: 1.5 },
    plasma: { name: 'Plasma Cannon', emoji: '⚡', fireRate: 5, bulletCount: 2, spread: 0.5, speed: 9, radius: 6, color: '#a78bfa', damage: 1.8 },
    railgun: { name: 'Railgun', emoji: '💫', fireRate: 12, bulletCount: 1, spread: 0, speed: 14, radius: 2, color: '#06b6d4', damage: 2.8 },
    shotgun: { name: 'Shotgun', emoji: '🔱', fireRate: 12, bulletCount: 7, spread: 0.8, speed: 8, radius: 4, color: '#ef4444', damage: 1.3 },
    burstfire: { name: 'Burst Fire', emoji: '💥', fireRate: 3, bulletCount: 3, spread: 0.2, speed: 10, radius: 5, color: '#f59e0b', damage: 1.4 },
    minigun: { name: 'Mini Gun', emoji: '⚙️', fireRate: 1, bulletCount: 4, spread: 0.7, speed: 8, radius: 3, color: '#6b7280', damage: 0.9 },
    photon: { name: 'Photon Blaster', emoji: '✨', fireRate: 7, bulletCount: 2, spread: 0.3, speed: 11, radius: 5, color: '#fbbf24', damage: 1.6 },
    vortex: { name: 'Vortex Cannon', emoji: '🌀', fireRate: 8, bulletCount: 6, spread: 1.0, speed: 6, radius: 4, color: '#8b5cf6', damage: 1.1 },
    inferno: { name: 'Inferno', emoji: '🌋', fireRate: 3, bulletCount: 10, spread: 1.5, speed: 5, radius: 3, color: '#dc2626', damage: 0.7 },
    frostbolt: { name: 'Frostbolt', emoji: '🧊', fireRate: 9, bulletCount: 2, spread: 0.2, speed: 9, radius: 4, color: '#0ea5e9', damage: 1.7 },
    thunderstrike: { name: 'Thunderstrike', emoji: '⚡', fireRate: 11, bulletCount: 3, spread: 0.4, speed: 10, radius: 5, color: '#eab308', damage: 1.5 },
    voidbeam: { name: 'Void Beam', emoji: '🌑', fireRate: 6, bulletCount: 1, spread: 0, speed: 13, radius: 4, color: '#1f2937', damage: 2.2 },
    starlight: { name: 'Starlight', emoji: '⭐', fireRate: 5, bulletCount: 4, spread: 0.5, speed: 8, radius: 5, color: '#fbbf24', damage: 1.3 }
};

function spawnBullet() {
    if (player.shootCooldown > 0) return;
    const weapon = WEAPONS[currentWeapon] || WEAPONS.standard;
    player.shootCooldown = weapon.fireRate;
    for (let i = 0; i < weapon.bulletCount; i++) {
        const angle = (i - (weapon.bulletCount - 1) / 2) * weapon.spread;
        bullets.push({ x: player.x, y: player.y - 30, vx: Math.sin(angle) * 2, vy: -weapon.speed, radius: weapon.radius, life: 120, color: weapon.color, damage: weapon.damage, weapon: currentWeapon });
    }
    playSound('shoot');
}

function spawnEnemy() {
    let types = ['blackhat', 'pentester'];
    if (wave >= 2) types.push('agency');
    if (wave >= 3) types.push('trojan');
    if (wave >= 4) types.push('ddos');
    if (wave >= 5) types.push('ransomware');
    if (wave >= 6) types.push('fraudster');
    if (wave >= 7) types.push('socialeng');
    if (wave >= 8) types.push('cryptominer');
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = ENEMIES[typeKey];
    enemies.push({
        x: Math.random() * (CANVAS_WIDTH - 100) + 50, y: -40,
        vx: (Math.random() - 0.5) * 2, vy: type.speed + (wave * 0.1),
        ...type, currentHp: type.hp, maxHp: type.hp, wobble: Math.random() * Math.PI * 2, typeKey
    });
}

function spawnPowerup(x, y) {
    if (Math.random() > 0.20) return;
    const weaponKeys = Object.keys(WEAPONS);
    const types = [
        { type: 'heal', emoji: '\uD83D\uDC96', c: 0.15 },
        { type: 'shield', emoji: '\uD83D\uDEE1', c: 0.10 },
        { type: 'companion', emoji: '\uD83D\uDC68\u200D\uD83D\uDCBB', c: 0.10 },
        { type: 'nuke', emoji: '\uD83D\uDCA3', c: 0.05 }
    ];
    weaponKeys.forEach(key => { types.push({ type: 'weapon_' + key, emoji: WEAPONS[key].emoji, c: 0.60 / weaponKeys.length }); });
    let r = Math.random(), sel = types[0], cum = 0;
    for (const t of types) { cum += t.c; if (r <= cum) { sel = t; break; } }
    powerups.push({ x, y, vy: 1.5, radius: 18, ...sel, life: 400, pulse: 0 });
}

function applyPowerup(type) {
    if (type.startsWith('weapon_')) {
        const weaponKey = type.replace('weapon_', '');
        if (WEAPONS[weaponKey]) {
            currentWeapon = weaponKey;
            weaponTimer = weaponTimerMax;
            const weapon = WEAPONS[weaponKey];
            addText(player.x, player.y - 40, weapon.emoji + ' ' + weapon.name.toUpperCase() + '!', '#10b981', 16);
            playSound('powerup');
        }
    } else {
        switch(type) {
            case 'heal': gameState.balance = Math.min(gameState.balance + 100, 9999); addText(player.x, player.y - 40, '\uD83D\uDC96 +100 Balance!', '#ec4899', 16); break;
            case 'shield': shieldTimer = 400; addText(player.x, player.y - 40, '\uD83D\uDEE1 SHIELD ACTIVE!', '#3b82f6', 18); break;
            case 'companion': player.hasCompanion = true; player.companionTimer = 500; addText(player.x, player.y - 40, '\uD83D\uDC68\u200D\uD83D\uDCBB WHITE HAT ALLY!', '#10b981', 18); break;
            case 'nuke': enemies.forEach(e => { score += e.score; spawnParticles(e.x, e.y, '#f59e0b', 10); }); enemies = []; addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '\uD83D\uDCA3 SYSTEM PURGE! \uD83D\uDCA3', '#f59e0b', 24); playSound('nuke'); break;
        }
    }
}

function addText(x, y, text, color, size) {
    floatingTexts.push({ x, y, text, color, size, life: 60 });
}

function spawnParticles(x, y, color, count, emoji) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 2;
        particles.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            color, radius: 3, life: 60, emoji
        });
    }
}

function update() {
    if (!gameRunning || gamePaused) return;
    if (window.gameDebug?.godMode) {
        gameState.balance = Math.max(gameState.balance, 1000);
        gameState.customerTrust = 100;
        gameState.reputation = 100;
        servers.forEach(s => { s.hp = 100; if (s.status === 'DDOS_FROZEN' || s.status === 'RANSOMED') s.status = 'ONLINE'; });
        shieldTimer = 400;
    }
    player.x += (inputX - player.x) * 0.12;
    player.y += (inputY - player.y) * 0.12;
    player.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius + 30, Math.min(CANVAS_HEIGHT - player.radius, player.y));
    if (isShooting) spawnBullet();
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (weaponTimer > 0) weaponTimer--; else currentWeapon = 'standard';
    if (shieldTimer > 0) shieldTimer--;
    if (player.companionTimer > 0) player.companionTimer--; else player.hasCompanion = false;
    if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) comboCount = 0; }

    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    bullets = bullets.filter(b => b.life > 0 && b.y > -20);

    const diffMult = difficultyMultipliers[difficulty].spawnRate;
    spawnTimer--; if (spawnTimer <= 0) { spawnTimer = Math.max(20, Math.floor((60 - wave * 4) * diffMult)); spawnEnemy(); }
    waveTimer++; if (waveTimer >= waveDuration) {
        wave++; waveTimer = 0; waveDuration = 600 + wave * 50;
        document.getElementById('hudWave').textContent = wave;
        addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '\u26A0 WAVE ' + wave + ' \u26A0', '#f59e0b', 24);
        playSound('powerup');
        const bonus = wave * 50; score += bonus; addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '+' + bonus + ' WAVE BONUS!', '#10b981', 20);
    }

    enemies.forEach(e => {
        e.wobble += 0.05;
        e.x += e.vx + Math.sin(e.wobble) * 0.5;
        e.y += e.vy;
        if (e.x < e.radius || e.x > CANVAS_WIDTH - e.radius) e.vx *= -1;
    });
    enemies = enemies.filter(e => e.y < CANVAS_HEIGHT + 50);

    powerups.forEach(p => { p.y += p.vy; p.pulse += 0.1; });
    powerups = powerups.filter(p => p.y < CANVAS_HEIGHT + 50);

    powerups.forEach(p => {
        const dx = player.x - p.x, dy = player.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + p.radius) { applyPowerup(p.type); powerups = powerups.filter(x => x !== p); playSound('powerup'); }
    });

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; });
    particles = particles.filter(p => p.life > 0);

    floatingTexts.forEach(t => { t.y -= 1; t.life--; });
    floatingTexts = floatingTexts.filter(t => t.life > 0);

    stars.forEach(s => { s.y += s.speed; if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; } s.brightness += s.twinkle; if (s.brightness > 1 || s.brightness < 0.3) s.twinkle *= -1; });

    bullets.forEach(b => {
        if (b.life <= 0) return;
        enemies.forEach(e => {
            if (e.currentHp <= 0) return;
            const dx = b.x - e.x, dy = b.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.radius + e.radius) {
                b.life = 0;
                let dmg = (b.damage || 1);
                dmg *= difficultyMultipliers[difficulty].playerDamage;
                if (player.hasCompanion) dmg *= 1.5;
                if (staff.some(s => s.type === 'pentester')) dmg *= 1.5;
                e.currentHp -= dmg;
                spawnParticles(b.x, b.y, e.color, 5);
                playSound('hit');
                if (e.currentHp <= 0) {
                    kills++; comboCount++; comboTimer = 180; if (comboCount > maxCombo) maxCombo = comboCount;
                    killHistory.push(e.typeKey);
                    const comboMult = Math.min(comboCount, 5), points = e.score * comboMult;
                    score += points; spawnParticles(e.x, e.y, e.color, 15, e.emoji); playSound('die');
                    addText(e.x, e.y, '+' + points + (comboMult > 1 ? ' x' + comboMult : ''), '#f59e0b', comboMult > 1 ? 18 : 14);
                    gameState.totalComputeUsed += e.computeUsage || 0;
                    if (gameState.totalComputeUsed > gameState.maxComputeUsed) gameState.maxComputeUsed = gameState.totalComputeUsed;
                    spawnPowerup(e.x, e.y);
                    if (e.typeKey === 'fraudster') gameState.fraudsterCount--;
                    if (e.typeKey === 'cryptominer') gameState.cryptominerCount--;
                }
            }
        });
    });

    enemies.forEach(e => {
        if (e.currentHp <= 0) return;
        servers.forEach(s => {
            if (s.status === 'OFFLINE') return;
            const dx = e.x - s.x, dy = e.y - s.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < e.radius + 30) {
                let repDmg = e.reputationDmg || 0;
                if (e.typeKey === 'socialeng' && staff.some(st => st.type === 'writer')) repDmg *= 0.5;
                if (e.typeKey === 'fraudster' && staff.some(st => st.type === 'compliance')) repDmg *= 0.6;
                gameState.reputation = Math.max(0, gameState.reputation - repDmg);
                if (e.typeKey === 'ddos') { s.status = 'DDOS_FROZEN'; s.ddosCountdown = staff.some(st => st.type === 'firewall') ? 480 : 900; e.currentHp = 0; }
                else if (e.typeKey === 'ransomware') { s.status = 'RANSOMED'; s.ransomAmount = 500 * (difficulty === 'hard' ? 1.5 : 1); e.currentHp = 0; }
                else if (e.typeKey === 'fraudster') { gameState.balance -= 2; gameState.fraudsterCount++; }
                else if (e.typeKey === 'socialeng') { gameState.customerTrust -= 5 * (staff.some(st => st.type === 'ciso') ? 0.5 : 1); }
                else if (e.typeKey === 'cryptominer') { s.cryptoMinerDamage = 0.2; gameState.cryptominerCount++; }
                else { s.hp -= 10; }
            }
        });
    });

    servers.forEach(s => {
        if (s.ddosCountdown > 0) s.ddosCountdown--;
        if (s.ddosCountdown === 0 && s.status === 'DDOS_FROZEN') s.status = 'ONLINE';
        if (s.status === 'ONLINE') {
            const reputationMultiplier = 0.5 + (gameState.reputation / 100) * 0.5;
            gameState.balance += (s.incomePerSec * gameState.customerTrust / 100 * reputationMultiplier) / 60;
        }
    });

    if (staff.some(s => s.type === 'pr')) gameState.reputation = Math.min(100, gameState.reputation + 2 / 60);
    if (staff.some(s => s.type === 'trainer')) gameState.customerTrust = Math.min(100, gameState.customerTrust + 1 / 60);

    let totalSalary = 0;
    staff.forEach(s => { totalSalary += s.salarySec; });
    gameState.balance -= totalSalary / 60;

    if (gameState.balance < 0) gameState.bankruptcyTimer++;
    else gameState.bankruptcyTimer = 0;

    if (gameState.bankruptcyTimer > 600) gameOver();

    gameState.customerTrust = Math.max(0, Math.min(100, gameState.customerTrust - 0.01 + (upgrades.prCampaign ? 0.05 : 0)));

    if (gameState.balance <= 0 && gameState.serverCount === 0) gameOver();
    if (wave >= 10 && waveTimer > 100 && enemies.length === 0) victory();
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0f0f23');
    bgGrad.addColorStop(0.5, '#1a1a3e');
    bgGrad.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    stars.forEach(s => { s.brightness += s.twinkle; if (s.brightness > 1 || s.brightness < 0.3) s.twinkle *= -1; ctx.fillStyle = 'rgba(255,255,255,' + s.brightness + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); });

    powerups.forEach(p => { ctx.save(); ctx.globalAlpha = 1; const pulse = Math.sin(p.pulse) * 3; ctx.shadowBlur = 15 + pulse; ctx.shadowColor = p.type === 'heal' ? '#ec4899' : p.type === 'rapid' ? '#06b6d4' : p.type === 'shield' ? '#3b82f6' : p.type === 'nuke' ? '#f59e0b' : '#8b5cf6'; ctx.font = '24px Arial'; ctx.fillText(p.emoji, p.x, p.y); ctx.restore(); });

    particles.forEach(p => { ctx.save(); ctx.globalAlpha = Math.min(1, p.life); if (p.emoji) { ctx.font = p.radius * 4 + 'px Arial'; ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillText(p.emoji, 0, 0); } else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); });

    enemies.forEach(e => { ctx.save(); ctx.globalAlpha = 1; if (e.maxHp > 1) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30, 5); ctx.fillStyle = e.color; ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30 * (e.currentHp / e.maxHp), 5); } ctx.shadowBlur = 15; ctx.shadowColor = e.color; ctx.font = e.radius * 1.8 + 'px Arial'; ctx.fillText(e.emoji, e.x, e.y); ctx.restore(); });

    ctx.save();
    ctx.globalAlpha = 1;
    if (shieldTimer > 0) { ctx.strokeStyle = 'rgba(59,130,246,' + (0.8 + Math.sin(Date.now() * 0.01) * 0.2) + ')'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6'; ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = rapidFireTimer > 0 ? 'rgba(6,182,212,1)' : 'rgba(139,92,246,1)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = rapidFireTimer > 0 ? 'rgba(6,182,212,0.8)' : 'rgba(139,92,246,0.8)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(Date.now() * 0.005) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.font = '40px Arial';
    ctx.fillText('\uD83D\uDEE1', player.x, player.y);
    if (player.hasCompanion) { ctx.font = '32px Arial'; ctx.fillText('\uD83D\uDC68\u200D\uD83D\uDCBB', player.x - 50, player.y + 20); }
    ctx.restore();

    bullets.forEach(b => { ctx.fillStyle = b.color || '#fbbf24'; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });

    if (comboCount > 1 && comboTimer > 0) { ctx.save(); ctx.font = 'bold 20px Orbitron,sans-serif'; ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = '#f59e0b'; ctx.fillText('COMBO x' + comboCount, player.x, player.y - player.radius - 25); ctx.restore(); }

    floatingTexts.forEach(t => { ctx.save(); ctx.globalAlpha = Math.min(1, t.life); ctx.font = 'bold ' + t.size + 'px Orbitron,sans-serif'; ctx.fillStyle = t.color; ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = t.color; ctx.fillText(t.text, t.x, t.y); ctx.restore(); });

    ctx.save();
    ctx.font = '12px Orbitron,sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'left';
    ctx.fillText('\uD83D\uDCB5 $' + Math.floor(gameState.balance), 10, 20);
    ctx.fillText('\uD83D\uDCB8 +$' + gameState.incomePerSec + '/s', 10, 35);
    ctx.fillText('\uD83E\uDDE0 Trust: ' + Math.floor(gameState.customerTrust) + '%', 10, 50);
    ctx.fillText('\ud83d\udcaf Rep: ' + Math.floor(gameState.reputation) + '%', 10, 65);
    const weapon = WEAPONS[currentWeapon] || WEAPONS.standard;
    ctx.fillStyle = weaponTimer > 0 ? '#10b981' : '#9ca3af';
    ctx.fillText(weapon.emoji + ' ' + weapon.name + (weaponTimer > 0 ? ' (' + Math.ceil(weaponTimer / 60) + 's)' : ''), 10, 80);
    ctx.fillStyle = '#10b981';
    ctx.fillText('\uD83C\uDF0A Wave: ' + wave, CANVAS_WIDTH - 150, 20);
    ctx.fillText('\uD83D\uDC80 Kills: ' + kills, CANVAS_WIDTH - 150, 35);
    ctx.fillText('\uD83C\uDFAF Score: ' + score, CANVAS_WIDTH - 150, 50);
    ctx.fillText('Firing: ' + (isShooting ? '\u2705 ON' : '\u274C OFF'), CANVAS_WIDTH - 150, 65);
    ctx.restore();
}

function gameLoop() {
    if (gameRunning) { update(); draw(); }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initAudio();
    initStars();
    initServers();
    score = 0;
    wave = 1;
    kills = 0;
    maxCombo = 1;
    killHistory = [];
    gameState = { balance: 1000, incomePerSec: 10, customerTrust: 100, serverCount: 1, bankruptcyTimer: 0, selectedServer: 0, fraudsterCount: 0, cryptominerCount: 0 };
    staff = [];
    upgrades = { serverHPBoost: 0, rapidFire: 0, multiShot: 0, cdn: 0, firewall: 0, prCampaign: 0 };
    player = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, radius: 25, shootCooldown: 0, hasCompanion: false, companionTimer: 0 };
    bullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    floatingTexts = [];
    spawnTimer = 0;
    waveTimer = 0;
    comboCount = 0;
    comboTimer = 0;
    rapidFireTimer = 0;
    shieldTimer = 0;
    document.getElementById('hudScore').textContent = '0';
    document.getElementById('hudWave').textContent = '1';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    gameRunning = true;
    gamePaused = false;
}

function pauseGame() { gamePaused = true; document.getElementById('pauseScreen').classList.remove('hidden'); }
function resumeGame() { gamePaused = false; document.getElementById('pauseScreen').classList.add('hidden'); }

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score.toLocaleString();
    document.getElementById('finalWave').textContent = wave;
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('finalBalance').textContent = '$' + Math.floor(gameState.balance);
    if (document.getElementById('finalCompute')) document.getElementById('finalCompute').textContent = gameState.maxComputeUsed.toLocaleString();
    if (document.getElementById('finalReputation')) document.getElementById('finalReputation').textContent = Math.floor(gameState.reputation) + '%';
    const killStatsEl = document.getElementById('killStats');
    if (killStatsEl) {
        let html = '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:15px 0;">';
        killHistory.forEach(typeKey => { html += '<span style="font-size:1.5rem;">' + ENEMIES[typeKey].emoji + '</span>'; });
        html += '</div>';
        const countMap = {};
        killHistory.forEach(typeKey => { countMap[typeKey] = (countMap[typeKey] || 0) + 1; });
        html += '<div style="text-align:center;font-size:0.9rem;color:#9ca3af;">';
        Object.entries(countMap).forEach(([typeKey, count]) => { html += ENEMIES[typeKey].emoji + ' ' + ENEMIES[typeKey].name + ': ' + count + '<br>'; });
        html += '</div>';
        killStatsEl.innerHTML = html;
    }
    document.getElementById('gameOverScreen').classList.remove('hidden');
    playSound('die');
}

function victory() {
    gameRunning = false;
    document.getElementById('victoryScore').textContent = score.toLocaleString();
    document.getElementById('victoryCombo').textContent = 'x' + maxCombo;
    document.getElementById('victoryBalance').textContent = '$' + Math.floor(gameState.balance);
    if (document.getElementById('victoryCompute')) document.getElementById('victoryCompute').textContent = gameState.maxComputeUsed.toLocaleString();
    if (document.getElementById('victoryReputation')) document.getElementById('victoryReputation').textContent = Math.floor(gameState.reputation) + '%';
    document.getElementById('victoryScreen').classList.remove('hidden');
    playSound('powerup');
}

document.getElementById('btnEasy').addEventListener('click', () => { difficulty = 'easy'; document.getElementById('btnEasy').style.background = 'linear-gradient(135deg, #10b981, #059669)'; document.getElementById('btnHard').style.background = 'transparent'; });
document.getElementById('btnHard').addEventListener('click', () => { difficulty = 'hard'; document.getElementById('btnHard').style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; document.getElementById('btnEasy').style.background = 'transparent'; });
document.getElementById('btnStart').addEventListener('click', startGame);
document.getElementById('btnResume').addEventListener('click', resumeGame);
document.getElementById('btnRestart').addEventListener('click', startGame);
document.getElementById('btnRestartPause').addEventListener('click', startGame);
document.getElementById('btnMenuPause').addEventListener('click', () => { gameRunning = false; document.getElementById('pauseScreen').classList.add('hidden'); document.getElementById('startScreen').classList.remove('hidden'); });
document.getElementById('btnVictoryRestart').addEventListener('click', startGame);
document.getElementById('btnEasy').click();

initStars();
function idleLoop() {
    if (!gameRunning) {
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGrad.addColorStop(0, '#0f0f23');
        bgGrad.addColorStop(0.5, '#1a1a3e');
        bgGrad.addColorStop(1, '#16213e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        stars.forEach(s => { s.y += s.speed; if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; } s.brightness += s.twinkle; if (s.brightness > 1 || s.brightness < 0.3) s.twinkle *= -1; ctx.fillStyle = 'rgba(255,255,255,' + s.brightness + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); });
    }
    requestAnimationFrame(idleLoop);
}
idleLoop();
gameLoop();

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Server Saver Shield",
    getScore: () => score,
    setScore: (s) => { score = s; document.getElementById('hudScore').textContent = score; },
    getHealth: () => gameState.balance,
    setHealth: (b) => { gameState.balance = b; },
    win: () => {
        victory();
    },
    lose: () => {
        gameOver();
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
