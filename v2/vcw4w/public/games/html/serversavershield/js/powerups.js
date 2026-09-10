// Powerup Management
var powerups = [];

function spawnPowerup(x, y) {
    if (Math.random() > 0.20) return;
    const weaponKeys = Object.keys(WEAPONS);
    const types = [
        { type: 'heal', emoji: '💖', c: 0.15 },
        { type: 'shield', emoji: '🛡️', c: 0.10 },
        { type: 'companion', emoji: '👨‍💻', c: 0.10 },
        { type: 'nuke', emoji: '💣', c: 0.05 }
    ];
    weaponKeys.forEach(key => { types.push({ type: 'weapon_' + key, emoji: WEAPONS[key].emoji, c: 0.60 / weaponKeys.length }); });
    let r = Math.random(), sel = types[0], cum = 0;
    for (const t of types) { cum += t.c; if (r <= cum) { sel = t; break; } }
    powerups.push({ x, y, vy: 1.5, radius: 18, ...sel, life: 400, pulse: 0 });
}

function updatePowerups() {
    powerups.forEach(p => { p.y += p.vy; p.pulse += 0.1; });
    powerups = powerups.filter(p => p.life-- > 0 && p.y < CANVAS_HEIGHT + 50);
}

function getPowerups() {
    return powerups;
}

function clearPowerups() {
    powerups = [];
}

function applyPowerup(type) {
    if (type.startsWith('weapon_')) {
        const weaponKey = type.replace('weapon_', '');
        if (WEAPONS[weaponKey]) {
            setCurrentWeapon(weaponKey);
            const weapon = WEAPONS[weaponKey];
            addText(player.x, player.y - 40, weapon.emoji + ' ' + weapon.name.toUpperCase() + '!', '#10b981', 16);
            playSound('powerup');
        }
    } else {
        switch(type) {
            case 'heal': gameState.balance = Math.min(gameState.balance + 100, 9999); addText(player.x, player.y - 40, '💖 +100 Balance!', '#ec4899', 16); break;
            case 'shield': shieldTimer = 400; addText(player.x, player.y - 40, '🛡️ SHIELD ACTIVE!', '#3b82f6', 18); break;
            case 'companion': player.hasCompanion = true; player.companionTimer = 500; addText(player.x, player.y - 40, '👨‍💻 WHITE HAT ALLY!', '#10b981', 18); break;
            case 'nuke': enemies.forEach(e => { score += e.score; spawnParticles(e.x, e.y, '#f59e0b', 10); }); enemies = []; addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '💣 SYSTEM PURGE! 💣', '#f59e0b', 24); playSound('nuke'); break;
        }
    }
}
