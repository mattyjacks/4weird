// Collision Detection and Handling
function checkBulletEnemyCollisions() {
    bullets.forEach(b => {
        if (b.life <= 0) return;
        enemies.forEach((e, eIndex) => {
            if (e.currentHp <= 0) return;
            const dx = b.x - e.x, dy = b.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.radius + e.radius) {
                b.life = 0;
                let dmg = (b.damage || 1);
                dmg *= DIFFICULTY_MULTIPLIERS[difficulty].playerDamage;
                if (player.hasCompanion) dmg *= 1.5;
                if (staff.some(s => s.type === 'pentester')) dmg *= 1.5;
                if (player.damageMultiplier) dmg *= player.damageMultiplier;
                e.currentHp -= dmg;
                spawnParticles(b.x, b.y, e.color, 5);
                playSound('hit');
                if (e.currentHp <= 0) {
                    kills++;
                    comboCount++;
                    comboTimer = 180;
                    if (comboCount > maxCombo) maxCombo = comboCount;
                    killHistory.push(e.typeKey);
                    const comboMult = Math.min(comboCount, 5), points = e.score * comboMult;
                    score += points;
                    spawnParticles(e.x, e.y, e.color, 15, e.emoji);
                    playSound('die');
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
}

// Old server collision system - deprecated, use checkServerCollisions() in servers.js
function checkEnemyServerCollisions_OLD() {
    // This function is deprecated. The new 3-server defense line system
    // uses checkServerCollisions() in servers.js
}

function checkPowerupCollisions() {
    powerups.forEach((p, pIndex) => {
        const dx = player.x - p.x, dy = player.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + p.radius) {
            applyPowerup(p.type);
            powerups.splice(pIndex, 1);
        }
    });
}
