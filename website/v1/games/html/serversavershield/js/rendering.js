// Rendering System
let stars = [];

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

function updateStars() {
    stars.forEach(s => {
        s.y += s.speed;
        if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; }
        s.brightness += s.twinkle;
        if (s.brightness > 1 || s.brightness < 0.3) s.twinkle *= -1;
    });
}

function drawBackground() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0f0f23');
    bgGrad.addColorStop(0.5, '#1a1a3e');
    bgGrad.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawStars() {
    stars.forEach(s => {
        ctx.fillStyle = 'rgba(255,255,255,' + s.brightness + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPowerups() {
    powerups.forEach(p => {
        ctx.save();
        ctx.globalAlpha = 1;
        const pulse = Math.sin(p.pulse) * 3;
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = p.type === 'heal' ? '#ec4899' : p.type === 'shield' ? '#3b82f6' : p.type === 'nuke' ? '#f59e0b' : '#8b5cf6';
        ctx.font = '24px Arial';
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life);
        if (p.emoji) {
            ctx.font = p.radius * 4 + 'px Arial';
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillText(p.emoji, 0, 0);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        ctx.save();
        ctx.globalAlpha = 1;
        if (e.maxHp > 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30, 5);
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30 * (e.currentHp / e.maxHp), 5);
        }
        ctx.shadowBlur = 15;
        ctx.shadowColor = e.color;
        ctx.font = e.radius * 1.8 + 'px Arial';
        ctx.fillText(e.emoji, e.x, e.y);
        ctx.restore();
    });
}

function drawPlayer() {
    ctx.save();
    ctx.globalAlpha = 1;
    if (shieldTimer > 0) {
        ctx.strokeStyle = 'rgba(59,130,246,' + (0.8 + Math.sin(Date.now() * 0.01) * 0.2) + ')';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#3b82f6';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(139,92,246,1)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(139,92,246,0.8)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(Date.now() * 0.005) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.font = '40px Arial';
    ctx.fillText('🛡️', player.x, player.y);
    if (player.hasCompanion) { ctx.font = '32px Arial'; ctx.fillText('👨‍💻', player.x - 50, player.y + 20); }
    ctx.restore();
}

function drawBullets() {
    bullets.forEach(b => {
        ctx.fillStyle = b.color || '#fbbf24';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawCombo() {
    if (comboCount > 1 && comboTimer > 0) {
        ctx.save();
        ctx.font = 'bold 20px Orbitron,sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f59e0b';
        ctx.fillText('COMBO x' + comboCount, player.x, player.y - player.radius - 25);
        ctx.restore();
    }
}

function drawFloatingTexts() {
    floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, t.life);
        ctx.font = 'bold ' + t.size + 'px Orbitron,sans-serif';
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });
}

function drawHUD() {
    ctx.save();
    ctx.font = '12px Orbitron,sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'left';
    ctx.fillText('💵 $' + Math.floor(gameState.balance), 10, 20);
    ctx.fillText('💸 +$' + gameState.incomePerSec + '/s', 10, 35);
    ctx.fillText('🧠 Trust: ' + Math.floor(gameState.customerTrust) + '%', 10, 50);
    ctx.fillText('💯 Rep: ' + Math.floor(gameState.reputation) + '%', 10, 65);
    const weapon = WEAPONS[currentWeapon] || WEAPONS.standard;
    ctx.fillStyle = weaponTimer > 0 ? '#10b981' : '#9ca3af';
    ctx.fillText(weapon.emoji + ' ' + weapon.name + (weaponTimer > 0 ? ' (' + Math.ceil(weaponTimer / 60) + 's)' : ''), 10, 80);
    ctx.fillStyle = '#10b981';
    ctx.fillText('🌊 Wave: ' + wave, CANVAS_WIDTH - 150, 20);
    ctx.fillText('💀 Kills: ' + kills, CANVAS_WIDTH - 150, 35);
    ctx.fillText('🏆 Score: ' + score, CANVAS_WIDTH - 150, 50);
    ctx.fillText('Firing: ' + (isShooting ? '✅ ON' : '❌ OFF'), CANVAS_WIDTH - 150, 65);
    ctx.restore();
}
