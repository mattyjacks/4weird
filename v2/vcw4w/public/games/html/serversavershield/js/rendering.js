var matrixStreams = [];
var outerMatrixCanvas = null;
var outerMatrixCtx = null;
var outerStreams = [];
var outerInitialized = false;
var _outerResizeHooked = false;

function _outerStreamDensity() {
    // Beautiful = dense rain; Fast = ~40% fewer columns, shorter trails.
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    return pretty
        ? { step: 18, maxLen: 20, maxLenVar: 10 }
        : { step: 30, maxLen: 12, maxLenVar: 6 };
}

function _makeOuterStream(x, density) {
    return {
        x: x,
        y: Math.random() * outerMatrixCanvas.height - outerMatrixCanvas.height,
        speed: Math.random() * 2 + 1,
        fontSize: Math.floor(Math.random() * 6) + 12,
        opacity: Math.random() * 0.15 + 0.05,
        chars: [],
        maxLength: Math.floor(Math.random() * density.maxLenVar) + density.maxLen,
        ticksSinceChange: 0,
        changeInterval: Math.floor(Math.random() * 15) + 5
    };
}

function initOuterMatrix() {
    outerMatrixCanvas = document.getElementById('TEMPLATE-4weird-starfield');
    if (!outerMatrixCanvas) return;

    outerMatrixCtx = outerMatrixCanvas.getContext('2d');
    if (!outerMatrixCtx) return;

    resizeOuterMatrix();
    if (!_outerResizeHooked) {
        window.addEventListener('resize', resizeOuterMatrix);
        _outerResizeHooked = true;
    }

    const density = _outerStreamDensity();
    outerStreams = [];
    const columns = Math.floor(outerMatrixCanvas.width / density.step);
    for (let i = 0; i < columns; i++) {
        outerStreams.push(_makeOuterStream(i * density.step, density));
    }
    outerInitialized = true;
}

function resizeOuterMatrix() {
    if (!outerMatrixCanvas) return;
    outerMatrixCanvas.width = window.innerWidth;
    outerMatrixCanvas.height = window.innerHeight;

    if (outerInitialized) {
        const density = _outerStreamDensity();
        const columns = Math.floor(outerMatrixCanvas.width / density.step);
        const currentCount = outerStreams.length;
        if (columns > currentCount) {
            for (let i = currentCount; i < columns; i++) {
                outerStreams.push(_makeOuterStream(i * density.step, density));
            }
        } else if (columns < currentCount) {
            outerStreams.splice(columns);
        }
    }
}

function updateAndDrawOuterMatrix() {
    if (!outerInitialized || !outerMatrixCtx) return;
    
    outerMatrixCtx.fillStyle = 'rgba(2, 5, 3, 0.08)'; // Deep dark green-black matching --bg-dark
    outerMatrixCtx.fillRect(0, 0, outerMatrixCanvas.width, outerMatrixCanvas.height);
    
    outerStreams.forEach(stream => {
        stream.y += stream.speed;
        if (stream.y > outerMatrixCanvas.height + 200) {
            stream.y = -Math.random() * 200;
            stream.speed = Math.random() * 2 + 1;
            stream.opacity = Math.random() * 0.15 + 0.05;
            stream.maxLength = Math.floor(Math.random() * 20) + 10;
            stream.chars = [];
        }
        
        stream.ticksSinceChange++;
        if (stream.ticksSinceChange > stream.changeInterval) {
            stream.ticksSinceChange = 0;
            const characters = "0101010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+-/\\";
            const newChar = characters.charAt(Math.floor(Math.random() * characters.length));
            stream.chars.unshift(newChar);
            if (stream.chars.length > stream.maxLength) {
                stream.chars.pop();
            }
        }
        
        outerMatrixCtx.font = `${stream.fontSize}px monospace`;
        for (let i = 0; i < stream.chars.length; i++) {
            const charY = stream.y - i * (stream.fontSize * 0.85);
            if (charY < 0 || charY > outerMatrixCanvas.height) continue;
            
            let fillStyle;
            if (i === 0) {
                fillStyle = `rgba(168, 244, 190, ${stream.opacity * 2})`;
            } else {
                const fade = 1 - (i / stream.maxLength);
                fillStyle = `rgba(16, 185, 129, ${stream.opacity * fade})`;
            }
            outerMatrixCtx.fillStyle = fillStyle;
            outerMatrixCtx.fillText(stream.chars[i], stream.x, charY);
        }
    });
}

function initStars() {
    matrixStreams = [];
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    const streamCount = pretty ? 40 : 22;
    for (let i = 0; i < streamCount; i++) {
        matrixStreams.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT - CANVAS_HEIGHT,
            speed: Math.random() * 2.5 + 1.5,
            fontSize: Math.floor(Math.random() * 6) + 10,
            opacity: Math.random() * 0.4 + 0.2,
            chars: [],
            maxLength: pretty ? Math.floor(Math.random() * 12) + 6 : Math.floor(Math.random() * 8) + 4,
            changeInterval: Math.floor(Math.random() * 10) + 4,
            ticksSinceChange: 0
        });
    }
}

function updateStars() {
    matrixStreams.forEach(stream => {
        stream.y += stream.speed;
        if (stream.y > CANVAS_HEIGHT + 150) {
            stream.y = -Math.random() * 150;
            stream.x = Math.random() * CANVAS_WIDTH;
            stream.speed = Math.random() * 2.5 + 1.5;
            stream.fontSize = Math.floor(Math.random() * 6) + 10;
            stream.opacity = Math.random() * 0.4 + 0.2;
            stream.maxLength = Math.floor(Math.random() * 12) + 6;
            stream.chars = [];
        }

        stream.ticksSinceChange++;
        if (stream.ticksSinceChange > stream.changeInterval) {
            stream.ticksSinceChange = 0;
            const characters = "0101010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+-/\\";
            const newChar = characters.charAt(Math.floor(Math.random() * characters.length));
            stream.chars.unshift(newChar);
            if (stream.chars.length > stream.maxLength) {
                stream.chars.pop();
            }
        }
    });
}

var _bgGrad = null;
var _bgGradHeight = 0;
function drawBackground() {
    const ctx = getContext();
    // Cache the gradient: creating it every frame allocates + forces repaint.
    if (!_bgGrad || _bgGradHeight !== CANVAS_HEIGHT) {
        _bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        _bgGrad.addColorStop(0, '#020503');
        _bgGrad.addColorStop(0.5, '#051207');
        _bgGrad.addColorStop(1, '#020803');
        _bgGradHeight = CANVAS_HEIGHT;
    }
    ctx.fillStyle = _bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawStars() {
    const ctx = getContext();
    ctx.save();
    
    matrixStreams.forEach(stream => {
        ctx.font = `${stream.fontSize}px monospace`;
        
        for (let i = 0; i < stream.chars.length; i++) {
            const charY = stream.y - i * (stream.fontSize * 0.85);
            if (charY < 0 || charY > CANVAS_HEIGHT) continue;
            
            let fillStyle;
            if (i === 0) {
                fillStyle = `rgba(200, 255, 210, ${stream.opacity * 1.5})`;
            } else {
                const fade = 1 - (i / stream.maxLength);
                fillStyle = `rgba(16, 185, 129, ${stream.opacity * fade})`;
            }
            
            ctx.fillStyle = fillStyle;
            ctx.fillText(stream.chars[i], stream.x, charY);
        }
    });
    
    ctx.restore();
}

function drawPowerups() {
    const ctx = getContext();
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    if (pretty) {
        // Beautiful: per-powerup glow (GPU blur pass each — the cost Fast avoids).
        powerups.forEach(p => {
            ctx.save();
            const pulse = Math.sin(p.pulse) * 3;
            ctx.shadowBlur = 15 + pulse;
            ctx.shadowColor = p.type === 'heal' ? '#ec4899' : p.type === 'shield' ? '#3b82f6' : p.type === 'nuke' ? '#f59e0b' : '#8b5cf6';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, p.x, p.y);
            ctx.restore();
        });
        return;
    }
    // Fast: no shadowBlur. Emoji is readable without the glow.
    ctx.save();
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < powerups.length; i++) {
        ctx.fillText(powerups[i].emoji, powerups[i].x, powerups[i].y);
    }
    ctx.restore();
}

function drawParticles() {
    const ctx = getContext();
    // Batch plain circle particles into one path (one fill call per color run
    // would be ideal; a single path + per-particle fillStyle change is still
    // far cheaper than save/arc/fill/restore per particle).
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.emoji) continue;
        ctx.globalAlpha = p.life <= 0 ? 0 : (p.life >= 1 ? 1 : p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = p.radius * (p.life >= 1 ? 1 : p.life);
        ctx.arc(p.x, p.y, r > 0.5 ? r : 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    // Emoji particles are rare (kill bursts) — draw them without rotation math.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.emoji) continue;
        ctx.globalAlpha = p.life <= 0 ? 0 : (p.life >= 1 ? 1 : p.life);
        ctx.font = (p.radius * 4) + 'px Arial';
        ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.restore();
}

function drawEnemies() {
    const ctx = getContext();
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    if (pretty) {
        // Beautiful: per-enemy glow. This is the single most expensive canvas
        // state — Fast mode below skips it entirely.
        enemies.forEach(e => {
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = e.color;
            ctx.font = (e.radius * 1.8) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(e.emoji, e.x, e.y);
            ctx.restore();
        });
    } else {
        // Fast: batched, no shadowBlur.
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            ctx.font = (e.radius * 1.8) + 'px Arial';
            ctx.fillText(e.emoji, e.x, e.y);
        }
    }
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.maxHp > 1) {
            const w = 30 * (e.currentHp > 0 ? e.currentHp / e.maxHp : 0);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30, 5);
            ctx.fillStyle = e.color;
            if (w > 0) ctx.fillRect(e.x - 15, e.y - e.radius - 12, w, 5);
        }
    }
    ctx.restore();
}

function drawPlayer() {
    const ctx = getContext();
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    ctx.save();
    const t = Date.now() * 0.005;
    if (pretty) {
        // Beautiful: full glow ring + glowing shield bubble.
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
        ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(t) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 10;
    } else {
        // Fast: one cheap shadow for the ring, flat shield circle.
        ctx.strokeStyle = 'rgba(139,92,246,1)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(139,92,246,0.8)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(t) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (shieldTimer > 0) {
            ctx.strokeStyle = 'rgba(59,130,246,0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.font = (player.radius * 2.5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', player.x, player.y + 5);
    if (player.hasCompanion) {
        ctx.font = (player.radius * 2) + 'px Arial';
        ctx.fillText('👨‍💻', player.x - player.radius - 20, player.y + player.radius);
    }
    ctx.restore();
}

function drawBullets() {
    const ctx = getContext();
    // Batch bullets: group consecutive same-color bullets into one path.
    ctx.save();
    let lastColor = null;
    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        const c = b.color || '#fbbf24';
        if (c !== lastColor) {
            if (lastColor !== null) ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = c;
            lastColor = c;
        }
        // moveTo avoids connecting arcs with a line within the shared path
        ctx.moveTo(b.x + b.radius, b.y);
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    }
    if (lastColor !== null) ctx.fill();
    ctx.restore();
}

function drawCombo() {
    const ctx = getContext();
    if (comboCount > 1 && comboTimer > 0) {
        ctx.save();
        ctx.font = 'bold 20px Orbitron,sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        if ((typeof isBeautiful === 'function') && isBeautiful()) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f59e0b';
        }
        ctx.fillText('COMBO x' + comboCount, player.x, player.y - player.radius - 25);
        ctx.restore();
    }
}

function drawFloatingTexts() {
    const ctx = getContext();
    if (floatingTexts.length === 0) return;
    // Fade via life/60 (life counts down from 60). Glow only on Beautiful.
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < floatingTexts.length; i++) {
        const t = floatingTexts[i];
        ctx.globalAlpha = t.life >= 60 ? 1 : t.life / 60;
        ctx.font = 'bold ' + t.size + 'px Orbitron,sans-serif';
        ctx.fillStyle = t.color;
        if (pretty) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = t.color;
        }
        ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
}

function drawHUD() {
    const ctx = getContext();
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
    
    // Draw combo multiplier if active
    if (comboCount > 1 && comboTimer > 0) {
        drawComboEffect(ctx);
    }
    
    ctx.restore();
}

// Screen flash effect for damage
var screenFlashIntensity = 0;

function triggerScreenFlash(intensity = 0.3) {
    screenFlashIntensity = Math.min(intensity, 0.5);
}

function updateScreenFlash() {
    if (screenFlashIntensity > 0) {
        screenFlashIntensity -= 0.02;
        if (screenFlashIntensity < 0) screenFlashIntensity = 0;
    }
}

function drawScreenFlash(ctx) {
    if (screenFlashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${screenFlashIntensity})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// Enhanced combo effect
function drawComboEffect(ctx) {
    const comboMult = Math.min(comboCount, 5);
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
    
    // Draw combo badge (glow only on Beautiful — it runs every frame while combo active)
    ctx.save();
    ctx.font = `bold ${20 + comboMult * 3}px Orbitron,sans-serif`;
    ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`; // Orange with pulse
    ctx.textAlign = 'center';
    if ((typeof isBeautiful === 'function') && isBeautiful()) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f59e0b';
    }
    
    const comboText = `COMBO x${comboCount}`;
    const x = CANVAS_WIDTH / 2;
    const y = 80;
    
    // Draw background glow
    ctx.fillStyle = `rgba(245, 158, 11, ${0.2 * pulse})`;
    ctx.fillRect(x - 80, y - 25, 160, 40);
    
    // Draw text
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.fillText(comboText, x, y);
    
    // Draw multiplier bonus
    if (comboMult > 1) {
        ctx.font = '14px Orbitron,sans-serif';
        ctx.fillStyle = `rgba(16, 185, 129, ${pulse})`;
        ctx.fillText(`${comboMult}x SCORE MULTIPLIER`, x, y + 25);
    }
    
    ctx.restore();
}

// Hit feedback particles
var hitParticles = [];

function spawnHitParticles(x, y, color = '#ff0000', count = 5) {
    if (hitParticles.length > 200) return;
    for (let i = 0; i < count; i++) {
        hitParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateHitParticles() {
    for (let i = hitParticles.length - 1; i >= 0; i--) {
        const p = hitParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        p.vx *= 0.95;
        p.vy *= 0.95;
        
        if (p.life <= 0) {
            hitParticles.splice(i, 1);
        }
    }
}

function drawHitParticles(ctx) {
    if (hitParticles.length === 0) return;
    ctx.save();
    for (let i = 0; i < hitParticles.length; i++) {
        const p = hitParticles[i];
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawServers() {
    const ctx = getContext();
    const shake = getScreenShake();
    
    servers.forEach(server => {
        if (server.status === 'offline') return; // Don't draw offline servers
        
        ctx.save();
        ctx.translate(shake.x, shake.y);
        
        // Draw server emoji
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect based on status (Beautiful only — Fast skips the blur pass)
        if ((typeof isBeautiful === 'function') && isBeautiful()) {
            if (server.status === 'degraded') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f59e0b'; // Orange warning
            } else {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#10b981'; // Green online
            }
        }
        
        ctx.fillText(server.emoji, server.x, server.y);
        
        // Draw HP bar above server
        const barWidth = 60;
        const barHeight = 8;
        const barX = server.x - barWidth / 2;
        const barY = server.y - 50;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // HP fill
        const hpPercent = server.hp / server.maxHp;
        let hpColor = '#10b981'; // Green
        if (server.status === 'degraded') hpColor = '#f59e0b'; // Orange
        
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        
        // HP border
        ctx.strokeStyle = hpColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Status indicator
        ctx.font = '10px Arial';
        ctx.fillStyle = hpColor;
        ctx.fillText(server.status.toUpperCase(), server.x, barY - 8);
        
        ctx.restore();
    });
}
