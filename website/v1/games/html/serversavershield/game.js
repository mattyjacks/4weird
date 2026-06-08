// Server Saver Shield - Enhanced Arcade Shooter
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
        case 'shoot':
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'hit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
        case 'die':
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'powerup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'nuke':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
            break;
        case 'damage':
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
    }
}

let gameRunning = false, gamePaused = false;
let score = 0, wave = 1, serverHealth = 100, kills = 0, maxCombo = 1;
let inputX = CANVAS_WIDTH / 2, inputY = CANVAS_HEIGHT - 100, inputDown = false;
let player = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, radius: 25, shootCooldown: 0, hasCompanion: false, companionTimer: 0 };
let bullets = [], enemies = [], particles = [], powerups = [], floatingTexts = [], stars = [];
let spawnTimer = 0, waveTimer = 0, waveDuration = 600, comboCount = 0, comboTimer = 0;
let rapidFireTimer = 0, shieldTimer = 0;
let difficulty = 'easy';
let killHistory = [];
let difficultyMultipliers = { easy: { spawnRate: 0.7, playerDamage: 1.3 }, hard: { spawnRate: 1.5, playerDamage: 0.8 } };

const ENEMIES = {
    blackhat: { name: 'Black Hat Hacker', emoji: '🎩', hp: 1, speed: 2.5, score: 10, color: '#1f2937', radius: 18, behavior: 'direct' },
    trojan: { name: 'Trojan Horse', emoji: '�', hp: 3, speed: 1.5, score: 50, color: '#f59e0b', radius: 24, behavior: 'stealth' },
    pentester: { name: 'AI Pen Tester', emoji: '�', hp: 2, speed: 3.5, score: 30, color: '#06b6d4', radius: 16, behavior: 'evasive' },
    agency: { name: 'Intelligence Agency', emoji: '🧠', hp: 4, speed: 2, score: 60, color: '#8b5cf6', radius: 22, behavior: 'strategic' },
    ddos: { name: 'DDOS Attack', emoji: '🔥', hp: 5, speed: 1, score: 100, color: '#dc2626', radius: 30, behavior: 'direct' },
    ransomware: { name: 'Ransomware', emoji: '🔒', hp: 4, speed: 1.2, score: 80, color: '#ec4899', radius: 26, behavior: 'stealth' }
};

function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 2 + 0.5,
            brightness: Math.random(),
            twinkle: Math.random() * 0.1
        });
    }
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    inputX = (e.clientX - rect.left) * scale;
    inputY = (e.clientY - rect.top) * scale;
});
canvas.addEventListener('mousedown', (e) => { e.preventDefault(); inputDown = true; });
canvas.addEventListener('mouseup', () => inputDown = false);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const rect = canvas.getBoundingClientRect(); const scale = canvas.width / rect.width; const t = e.touches[0]; inputX = (t.clientX - rect.left) * scale; inputY = (t.clientY - rect.top) * scale; }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); inputDown = true; const rect = canvas.getBoundingClientRect(); const scale = canvas.width / rect.width; const t = e.touches[0]; inputX = (t.clientX - rect.left) * scale; inputY = (t.clientY - rect.top) * scale; }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); inputDown = false; });
window.addEventListener('keydown', (e) => { if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (gameRunning && !gamePaused) pauseGame(); else if (gamePaused) resumeGame(); } });

function spawnBullet() {
    const fireRate = rapidFireTimer > 0 ? 3 : 8;
    if (player.shootCooldown > 0) return;
    player.shootCooldown = fireRate;
    bullets.push({ x: player.x, y: player.y - player.radius, vx: 0, vy: -12, radius: 4, life: 100, color: rapidFireTimer > 0 ? '#06b6d4' : '#3b82f6' });
    if (rapidFireTimer > 0) {
        bullets.push({ x: player.x - 15, y: player.y - player.radius + 5, vx: -0.5, vy: -11, radius: 3, life: 100, color: '#06b6d4' });
        bullets.push({ x: player.x + 15, y: player.y - player.radius + 5, vx: 0.5, vy: -11, radius: 3, life: 100, color: '#06b6d4' });
    }
    playSound('shoot');
}

function spawnEnemy() {
    let types = ['blackhat', 'pentester'];
    if (wave >= 2) types.push('agency');
    if (wave >= 3) types.push('trojan');
    if (wave >= 4) types.push('ddos');
    if (wave >= 5) types.push('ransomware');
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = ENEMIES[typeKey];
    enemies.push({
        x: Math.random() * (CANVAS_WIDTH - 100) + 50, y: -40,
        vx: (Math.random() - 0.5) * 2, vy: type.speed + (wave * 0.1),
        ...type, currentHp: type.hp, maxHp: type.hp, wobble: Math.random() * Math.PI * 2, typeKey
    });
}

function spawnPowerup(x, y) {
    if (Math.random() > 0.15) return;
    const types = [
        { type: 'heal', emoji: '💖', c: 0.3 }, { type: 'rapid', emoji: '⚡', c: 0.25 },
        { type: 'shield', emoji: '🛡️', c: 0.15 }, { type: 'companion', emoji: '👨‍💻', c: 0.15 }, 
        { type: 'nuke', emoji: '💣', c: 0.1 }, { type: 'multi', emoji: '🔫', c: 0.05 }
    ];
    let r = Math.random(), sel = types[0], cum = 0;
    for (const t of types) { cum += t.c; if (r <= cum) { sel = t; break; } }
    powerups.push({ x, y, vy: 1.5, radius: 18, ...sel, life: 400, pulse: 0 });
}

function spawnParticles(x, y, color, count, emoji) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = Math.random() * 4 + 1;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: Math.random() * 3 + 1, color, life: 1, emoji, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2 });
    }
}

function addText(x, y, text, color, size) {
    floatingTexts.push({ x, y, text, color, size: size || 16, life: 1, vy: -1.5 });
}

function update() {
    if (!gameRunning || gamePaused) return;
    player.x += (inputX - player.x) * 0.12;
    player.y += (inputY - player.y) * 0.12;
    player.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius + 30, Math.min(CANVAS_HEIGHT - player.radius, player.y));
    if (inputDown) spawnBullet();
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (rapidFireTimer > 0) rapidFireTimer--;
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
        addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, `⚠️ WAVE ${wave} ⚠️`, '#f59e0b', 24);
        playSound('powerup');
        const bonus = wave * 50; score += bonus; addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, `+${bonus} WAVE BONUS!`, '#10b981', 20);
    }

    enemies.forEach(e => {
        e.wobble += 0.05;
        e.x += e.vx + Math.sin(e.wobble) * 0.5;
        e.y += e.vy;
        if (e.x < e.radius || e.x > CANVAS_WIDTH - e.radius) e.vx *= -1;
        if (e.y > CANVAS_HEIGHT - 50) {
            e.currentHp = 0; serverHealth -= 10; updateHealth(); playSound('damage');
            addText(e.x, CANVAS_HEIGHT - 80, '-10 Server HP!', '#ef4444', 14);
            spawnParticles(e.x, CANVAS_HEIGHT - 50, '#ef4444', 10);
        }
        const dx = e.x - player.x, dy = e.y - player.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < e.radius + player.radius && e.currentHp > 0) {
            if (shieldTimer > 0) { e.currentHp = 0; spawnParticles(e.x, e.y, '#3b82f6', 15); playSound('die'); addText(e.x, e.y, 'SHIELD BLOCK!', '#3b82f6', 14); }
            else { 
                e.currentHp -= 1; 
                serverHealth -= Math.max(1, Math.floor(serverHealth * 0.01)); 
                updateHealth(); 
                playSound('damage'); 
                spawnParticles(player.x, player.y, '#ef4444', 8); 
                const dmg = Math.max(1, Math.floor(serverHealth * 0.01));
                addText(player.x, player.y - 30, `-${dmg} Server HP!`, '#ef4444', 16); 
            }
        }
    });

    bullets.forEach(b => {
        if (b.life <= 0) return;
        enemies.forEach(e => {
            if (e.currentHp <= 0) return;
            const dx = b.x - e.x, dy = b.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.radius + e.radius) {
                b.life = 0; 
                let dmg = 1;
                dmg *= difficultyMultipliers[difficulty].playerDamage;
                if (player.hasCompanion) dmg *= 1.5;
                e.currentHp -= dmg; 
                spawnParticles(b.x, b.y, e.color, 5); playSound('hit');
                if (e.currentHp <= 0) {
                    kills++; comboCount++; comboTimer = 180; if (comboCount > maxCombo) maxCombo = comboCount;
                    killHistory.push(e.typeKey);
                    const comboMult = Math.min(comboCount, 5), points = e.score * comboMult;
                    score += points; spawnParticles(e.x, e.y, e.color, 15, e.emoji); playSound('die');
                    addText(e.x, e.y, `+${points}${comboMult > 1 ? ' x' + comboMult : ''}`, '#f59e0b', comboMult > 1 ? 18 : 14);
                    spawnPowerup(e.x, e.y);
                }
            }
        });
    });
    enemies = enemies.filter(e => e.currentHp > 0);

    powerups.forEach(p => {
        p.y += p.vy; p.pulse += 0.1; p.life--;
        const dx = p.x - player.x, dy = p.y - player.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + player.radius) {
            p.life = 0; applyPowerup(p.type); playSound('powerup');
        }
    });
    powerups = powerups.filter(p => p.life > 0 && p.y < CANVAS_HEIGHT + 30);

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; p.rotation += p.rotSpeed; p.vx *= 0.98; p.vy *= 0.98; });
    particles = particles.filter(p => p.life > 0);
    floatingTexts.forEach(t => { t.y += t.vy; t.life -= 0.02; });
    floatingTexts = floatingTexts.filter(t => t.life > 0);

    document.getElementById('hudScore').textContent = score.toLocaleString();
    const ind = document.getElementById('powerupIndicator');
    let html = ''; if (rapidFireTimer > 0) html += '<span style="animation:pulse 1s infinite">⚡</span>'; if (shieldTimer > 0) html += '<span style="animation:pulse 1s infinite">🛡️</span>';
    ind.innerHTML = html;

    if (serverHealth <= 0) { serverHealth = 0; updateHealth(); gameOver(); }
    if (wave >= 10 && waveTimer > 100 && enemies.length === 0) victory();
}

function applyPowerup(type) {
    switch(type) {
        case 'heal': serverHealth = Math.min(100, serverHealth + 25); updateHealth(); addText(player.x, player.y - 40, '💖 +25 Server HP!', '#ec4899', 16); break;
        case 'rapid': rapidFireTimer = 300; addText(player.x, player.y - 40, '⚡ RAPID FIRE!', '#06b6d4', 18); break;
        case 'shield': shieldTimer = 400; addText(player.x, player.y - 40, '🛡️ SHIELD ACTIVE!', '#3b82f6', 18); break;
        case 'companion': player.hasCompanion = true; player.companionTimer = 500; addText(player.x, player.y - 40, '👨‍💻 WHITE HAT ALLY!', '#10b981', 18); break;
        case 'nuke': enemies.forEach(e => { score += e.score; spawnParticles(e.x, e.y, '#f59e0b', 10); }); enemies = []; addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '💣 SYSTEM PURGE! 💣', '#f59e0b', 24); playSound('nuke'); break;
        case 'multi': rapidFireTimer = 600; addText(player.x, player.y - 40, '🔫 MULTI SHOT!', '#8b5cf6', 18); break;
    }
}

function updateHealth() {
    const pct = Math.max(0, serverHealth);
    document.getElementById('hpBar').style.width = pct + '%';
    document.getElementById('hpText').textContent = Math.floor(pct) + '%';
}

function draw() {
    ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0f0f23'); bgGrad.addColorStop(0.5, '#1a1a3e'); bgGrad.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    stars.forEach(s => {
        s.y += s.speed; if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; }
        s.brightness += s.twinkle; if (s.brightness > 1 || s.brightness < 0.3) s.twinkle *= -1;
        ctx.fillStyle = `rgba(255,255,255,${s.brightness})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    });

    ctx.strokeStyle = 'rgba(139,92,246,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for (let i = 0; i < CANVAS_HEIGHT; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    ctx.fillStyle = 'rgba(16,185,129,0.1)'; ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60);
    ctx.strokeStyle = 'rgba(16,185,129,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT - 60); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 60); ctx.stroke();
    ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(16,185,129,0.5)';
    ctx.fillText('🖥️', CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT - 30);
    ctx.fillText('🖥️', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    ctx.fillText('🖥️', CANVAS_WIDTH / 2 + 60, CANVAS_HEIGHT - 30);
    ctx.shadowBlur = 0;

    particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life);
        if (p.emoji) { ctx.font = `${p.radius * 4}px Arial`; ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillText(p.emoji, 0, 0); }
        else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    });

    powerups.forEach(p => {
        ctx.save();
        ctx.globalAlpha = 1;
        const pulse = Math.sin(p.pulse) * 3;
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = p.type === 'heal' ? '#ec4899' : p.type === 'rapid' ? '#06b6d4' : p.type === 'shield' ? '#3b82f6' : p.type === 'nuke' ? '#f59e0b' : '#8b5cf6';
        ctx.font = '24px Arial'; ctx.fillText(p.emoji, p.x, p.y);
        ctx.restore();
    });

    bullets.forEach(b => {
        ctx.save(); ctx.fillStyle = b.color; ctx.shadowBlur = 8; ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = b.color + '40'; ctx.beginPath(); ctx.arc(b.x - b.vx * 0.3, b.y - b.vy * 0.3, b.radius * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });

    enemies.forEach(e => {
        ctx.save();
        ctx.globalAlpha = 1;
        if (e.maxHp > 1) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30, 5); ctx.fillStyle = e.color; ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30 * (e.currentHp / e.maxHp), 5); }
        ctx.shadowBlur = 15; ctx.shadowColor = e.color; ctx.font = `${e.radius * 1.8}px Arial`; ctx.fillText(e.emoji, e.x, e.y);
        ctx.restore();
    });

    ctx.save();
    ctx.globalAlpha = 1;
    if (shieldTimer > 0) {
        ctx.strokeStyle = `rgba(59,130,246,${0.8 + Math.sin(Date.now() * 0.01) * 0.2})`; ctx.lineWidth = 3;
        ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = rapidFireTimer > 0 ? 'rgba(6,182,212,1)' : 'rgba(139,92,246,1)';
    ctx.lineWidth = 2; ctx.shadowBlur = 20; ctx.shadowColor = rapidFireTimer > 0 ? 'rgba(6,182,212,0.8)' : 'rgba(139,92,246,0.8)';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(Date.now() * 0.005) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 10; ctx.font = '40px Arial'; ctx.fillText('🛡️', player.x, player.y);
    if (player.hasCompanion) {
        ctx.font = '32px Arial'; ctx.fillText('👨‍💻', player.x - 50, player.y + 20);
    }
    ctx.restore();

    if (comboCount > 1 && comboTimer > 0) {
        ctx.save(); ctx.font = 'bold 20px Orbitron,sans-serif'; ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = '#f59e0b';
        ctx.fillText(`COMBO x${comboCount}`, player.x, player.y - player.radius - 25);
        ctx.restore();
    }

    floatingTexts.forEach(t => {
        ctx.save(); ctx.globalAlpha = Math.min(1, t.life); ctx.font = `bold ${t.size}px Orbitron,sans-serif`;
        ctx.fillStyle = t.color; ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = t.color;
        ctx.fillText(t.text, t.x, t.y); ctx.restore();
    });
}

function gameLoop() {
    if (gameRunning) { update(); draw(); }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initAudio(); initStars();
    score = 0; wave = 1; serverHealth = 100; kills = 0; maxCombo = 1;
    killHistory = [];
    player = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, radius: 25, shootCooldown: 0, hasCompanion: false, companionTimer: 0 };
    bullets = []; enemies = []; particles = []; powerups = []; floatingTexts = [];
    spawnTimer = 0; waveTimer = 0; comboCount = 0; comboTimer = 0; rapidFireTimer = 0; shieldTimer = 0;
    updateHealth();
    document.getElementById('hudScore').textContent = '0';
    document.getElementById('hudWave').textContent = '1';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    gameRunning = true; gamePaused = false;
}

function pauseGame() { gamePaused = true; document.getElementById('pauseScreen').classList.remove('hidden'); }
function resumeGame() { gamePaused = false; document.getElementById('pauseScreen').classList.add('hidden'); }

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score.toLocaleString();
    document.getElementById('finalWave').textContent = wave;
    document.getElementById('finalKills').textContent = kills;
    const killStatsEl = document.getElementById('killStats');
    if (killStatsEl) {
        let html = '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:15px 0;">';
        killHistory.forEach(typeKey => {
            html += `<span style="font-size:1.5rem;">${ENEMIES[typeKey].emoji}</span>`;
        });
        html += '</div>';
        const countMap = {};
        killHistory.forEach(typeKey => { countMap[typeKey] = (countMap[typeKey] || 0) + 1; });
        html += '<div style="text-align:center;font-size:0.9rem;color:#9ca3af;">';
        Object.entries(countMap).forEach(([typeKey, count]) => {
            html += `${ENEMIES[typeKey].emoji} ${ENEMIES[typeKey].name}: ${count}<br>`;
        });
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
    document.getElementById('victoryScreen').classList.remove('hidden');
    playSound('powerup');
}

// Event bindings
document.getElementById('btnEasy').addEventListener('click', () => { difficulty = 'easy'; document.getElementById('btnEasy').style.background = 'linear-gradient(135deg, #10b981, #059669)'; document.getElementById('btnHard').style.background = 'transparent'; });
document.getElementById('btnHard').addEventListener('click', () => { difficulty = 'hard'; document.getElementById('btnHard').style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; document.getElementById('btnEasy').style.background = 'transparent'; });
document.getElementById('btnStart').addEventListener('click', startGame);
document.getElementById('btnResume').addEventListener('click', resumeGame);
document.getElementById('btnRestart').addEventListener('click', startGame);
document.getElementById('btnRestartPause').addEventListener('click', startGame);
document.getElementById('btnMenuPause').addEventListener('click', () => { gameRunning = false; document.getElementById('pauseScreen').classList.add('hidden'); document.getElementById('startScreen').classList.remove('hidden'); });
document.getElementById('btnVictoryRestart').addEventListener('click', startGame);
document.getElementById('btnEasy').click();

// Start starfield animation immediately
initStars();
function idleLoop() {
    if (!gameRunning) {
        ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGrad.addColorStop(0, '#0f0f23'); bgGrad.addColorStop(0.5, '#1a1a3e'); bgGrad.addColorStop(1, '#16213e');
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        stars.forEach(s => {
            s.y += s.speed; if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; }
            s.brightness += s.twinkle; if (s.brightness > 1 || s.brightness < 0.3) s.twinkle *= -1;
            ctx.fillStyle = `rgba(255,255,255,${s.brightness})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });
    }
    requestAnimationFrame(idleLoop);
}
idleLoop();
gameLoop();
