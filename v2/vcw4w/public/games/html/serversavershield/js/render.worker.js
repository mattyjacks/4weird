// Render Worker - Handles all canvas drawing
// Receives render data from game worker and draws to OffscreenCanvas

let canvas = null;
let ctx = null;
let width = 800;
let height = 600;

// Screen shake effect
let screenShake = { x: 0, y: 0, duration: 0, intensity: 0, startTime: 0 };

// Cached assets
const emojiCache = new Map();
const imageCache = new Map();

// Pre-rendered patterns
let starPattern = null;
let gridPattern = null;

// Font settings
const FONTS = {
    display: 'Orbitron, sans-serif',
    body: 'Inter, sans-serif',
    emoji: 'Arial, sans-serif'
};

self.onmessage = function(e) {
    const data = e.data;
    
    switch (data.type) {
        case 'init':
            canvas = data.canvas;
            width = data.width || 800;
            height = data.height || 600;
            ctx = canvas.getContext('2d', { alpha: false }); // Optimize: no alpha
            
            // Enable image smoothing for crisp text
            ctx.imageSmoothingEnabled = false;
            
            // Pre-render patterns
            initPatterns();
            
            // Start render loop
            requestAnimationFrame(renderLoop);
            break;
            
        case 'render':
            // Update render data
            renderState = data;
            break;
            
        case 'screenShake':
            screenShake.intensity = data.intensity;
            screenShake.duration = data.duration;
            screenShake.startTime = performance.now();
            break;
    }
};

let renderState = null;

function initPatterns() {
    // Create star pattern for background
    const starCanvas = new OffscreenCanvas(100, 100);
    const starCtx = starCanvas.getContext('2d');
    
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 0.5;
        const alpha = Math.random() * 0.5 + 0.3;
        
        starCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        starCtx.beginPath();
        starCtx.arc(x, y, size, 0, Math.PI * 2);
        starCtx.fill();
    }
    
    starPattern = ctx.createPattern(starCanvas, 'repeat');
}

function renderLoop() {
    if (!ctx || !renderState) {
        requestAnimationFrame(renderLoop);
        return;
    }
    
    // Apply screen shake
    updateScreenShake();
    
    // Clear canvas
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    
    // Draw layers in order
    drawBackground();
    drawShopZone();
    drawManagementZone();
    drawServers();
    drawPowerups();
    drawParticles();
    drawEnemies();
    drawPlayer();
    drawBullets();
    drawFloatingTexts();
    drawHUD();
    
    ctx.restore();
    
    requestAnimationFrame(renderLoop);
}

function updateScreenShake() {
    if (screenShake.duration > 0) {
        const elapsed = performance.now() - screenShake.startTime;
        if (elapsed < screenShake.duration) {
            screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        } else {
            screenShake.x = 0;
            screenShake.y = 0;
            screenShake.duration = 0;
        }
    }
}

function drawBackground() {
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(0.5, '#1a1a3e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw stars if pattern exists
    if (starPattern) {
        ctx.fillStyle = starPattern;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
    }
}

function drawShopZone() {
    const zoneY = height * 0.85;
    const zoneHeight = height * 0.1;
    
    // Zone background
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.fillRect(0, zoneY, width, zoneHeight);
    
    // Label
    ctx.font = 'bold 14px ' + FONTS.display;
    ctx.fillStyle = '#8b5cf6';
    ctx.textAlign = 'center';
    ctx.fillText('🔽 WEAPON SHOP 🔽', width / 2, zoneY + 20);
    
    // 3 laptops
    const positions = [0.25, 0.5, 0.75];
    const items = ['$500', '$300', '$200'];
    
    positions.forEach((pos, i) => {
        const x = width * pos;
        const y = zoneY + zoneHeight / 2 + 10;
        
        // Laptop emoji
        ctx.font = '40px ' + FONTS.emoji;
        ctx.fillText('💻', x, y);
        
        // Price
        ctx.font = '12px ' + FONTS.display;
        ctx.fillStyle = '#10b981';
        ctx.fillText(items[i], x, y + 30);
    });
}

function drawManagementZone() {
    const zoneY = height * 0.75;
    const zoneHeight = height * 0.08;
    
    // Pulsing background
    const pulse = Math.sin(performance.now() * 0.003) * 0.1 + 0.2;
    ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
    ctx.fillRect(0, zoneY, width, zoneHeight);
    
    // Border
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, zoneY, width, zoneHeight);
    
    // Business people
    ctx.font = '50px ' + FONTS.emoji;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const people = ['🧑‍💼', '👨‍💼', '👩‍💼'];
    const positions = [0.35, 0.5, 0.65];
    
    people.forEach((emoji, i) => {
        ctx.fillText(emoji, width * positions[i], zoneY + zoneHeight / 2);
    });
    
    // Label
    ctx.font = 'bold 16px ' + FONTS.display;
    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';
    ctx.fillText('👇 MANAGE BUSINESS 👇', width / 2, zoneY + zoneHeight - 10);
    ctx.shadowBlur = 0;
}

function drawServers() {
    if (!renderState.servers) return;
    
    renderState.servers.forEach(server => {
        if (server.status === 'offline') return;
        
        // Status color
        let color = '#10b981';
        let shadowColor = '#10b981';
        if (server.status === 'degraded') {
            color = '#f59e0b';
            shadowColor = '#f59e0b';
        }
        
        // Server emoji
        ctx.save();
        ctx.font = '50px ' + FONTS.emoji;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 15;
        ctx.shadowColor = shadowColor;
        ctx.fillText(server.emoji, server.x, server.y);
        ctx.restore();
        
        // HP bar
        const barWidth = 60;
        const barHeight = 8;
        const barX = server.x - barWidth / 2;
        const barY = server.y - 50;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Fill
        const hpPercent = server.hp / server.maxHp;
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        
        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Status text
        ctx.font = '10px ' + FONTS.body;
        ctx.fillStyle = color;
        ctx.fillText(server.status.toUpperCase(), server.x, barY - 8);
    });
}

function drawPlayer() {
    const p = renderState.player;
    if (!p) return;
    
    // Shield effect
    if (renderState.shieldTimer > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59,130,246,' + (0.8 + Math.sin(performance.now() * 0.01) * 0.2) + ')';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#3b82f6';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    // Shield emoji
    ctx.save();
    ctx.font = (p.radius * 2.5) + 'px ' + FONTS.emoji;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(139,92,246,0.8)';
    ctx.fillText('🛡️', p.x, p.y + 5);
    ctx.restore();
    
    // Companion
    if (p.hasCompanion) {
        ctx.font = (p.radius * 2) + 'px ' + FONTS.emoji;
        ctx.fillText('👨‍💻', p.x - p.radius - 20, p.y + p.radius);
    }
}

function drawEnemies() {
    if (!renderState.enemies) return;
    
    renderState.enemies.forEach(e => {
        const type = getEnemyType(e.typeKey);
        
        // HP bar for multi-HP enemies
        if (e.maxHp > 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(e.x - 15, e.y - type.radius - 12, 30, 5);
            ctx.fillStyle = type.color;
            ctx.fillRect(e.x - 15, e.y - type.radius - 12, 30 * (e.currentHp / e.maxHp), 5);
        }
        
        // Emoji
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = type.color;
        ctx.font = (type.radius * 1.8) + 'px ' + FONTS.emoji;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(type.emoji, e.x, e.y);
        ctx.restore();
    });
}

function drawBullets() {
    if (!renderState.bullets) return;
    
    ctx.fillStyle = '#fbbf24';
    
    renderState.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawParticles() {
    if (!renderState.particles) return;
    
    renderState.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawPowerups() {
    if (!renderState.powerups) return;
    
    renderState.powerups.forEach(p => {
        ctx.save();
        const pulse = Math.sin(performance.now() * 0.01) * 3;
        ctx.shadowBlur = 15 + pulse;
        
        const colors = {
            heal: '#ec4899',
            shield: '#3b82f6',
            nuke: '#f59e0b',
            weapon: '#8b5cf6'
        };
        
        ctx.shadowColor = colors[p.type] || '#8b5cf6';
        ctx.font = '24px ' + FONTS.emoji;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const emojis = {
            heal: '💖',
            shield: '🛡️',
            nuke: '💣',
            weapon: '⚡'
        };
        
        ctx.fillText(emojis[p.type] || '⚡', p.x, p.y);
        ctx.restore();
    });
}

function drawFloatingTexts() {
    if (!renderState.floatingTexts) return;
    
    renderState.floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, t.life);
        ctx.font = 'bold ' + t.size + 'px ' + FONTS.display;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });
}

function drawHUD() {
    if (!renderState.gameState) return;
    
    const gs = renderState.gameState;
    
    ctx.save();
    ctx.font = '12px ' + FONTS.display;
    ctx.textAlign = 'left';
    
    // Left side stats
    ctx.fillStyle = '#10b981';
    ctx.fillText('💵 $' + gs.balance, 10, 20);
    ctx.fillText('💸 +$' + gs.incomePerSec + '/s', 10, 35);
    ctx.fillText('🧠 Trust: ' + Math.floor(gs.customerTrust) + '%', 10, 50);
    ctx.fillText('💯 Rep: ' + Math.floor(gs.reputation) + '%', 10, 65);
    
    // Weapon info
    ctx.fillStyle = renderState.weaponTimer > 0 ? '#10b981' : '#9ca3af';
    ctx.fillText('⚔️ ' + renderState.currentWeapon + (renderState.weaponTimer > 0 ? ' (' + Math.ceil(renderState.weaponTimer / 60) + 's)' : ''), 10, 80);
    
    // Right side stats
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'right';
    ctx.fillText('🌊 Wave: ' + renderState.wave, width - 10, 20);
    ctx.fillText('💀 Kills: ' + renderState.kills, width - 10, 35);
    ctx.fillText('🏆 Score: ' + renderState.score, width - 10, 50);
    ctx.fillText('Firing: ' + (renderState.isShooting ? '✅ ON' : '❌ OFF'), width - 10, 65);
    
    // Combo display
    if (renderState.comboCount > 1 && renderState.comboTimer > 0) {
        ctx.save();
        ctx.font = 'bold 20px ' + FONTS.display;
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f59e0b';
        ctx.fillText('COMBO x' + renderState.comboCount, renderState.player?.x || width/2, (renderState.player?.y || height/2) - 40);
        ctx.restore();
    }
    
    ctx.restore();
}

function getEnemyType(typeKey) {
    const types = {
        blackhat: { color: '#a855f7', radius: 18, emoji: '🎩' },
        trojan: { color: '#f59e0b', radius: 24, emoji: '🐴' },
        pentester: { color: '#06b6d4', radius: 16, emoji: '🤖' },
        agency: { color: '#8b5cf6', radius: 22, emoji: '🧠' },
        ddos: { color: '#dc2626', radius: 30, emoji: '🔥' },
        ransomware: { color: '#ec4899', radius: 26, emoji: '🔒' },
        fraudster: { color: '#f97316', radius: 16, emoji: '💰' },
        socialeng: { color: '#06b6d4', radius: 14, emoji: '🎭' },
        cryptominer: { color: '#f59e0b', radius: 20, emoji: '⛏️' }
    };
    return types[typeKey] || types.blackhat;
}
