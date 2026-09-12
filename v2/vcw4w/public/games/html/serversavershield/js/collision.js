// Collision Detection and Handling
// Uses squared distances (no Math.sqrt per pair) and skips dead entities early,
// so high bullet counts stay cheap.
function checkBulletEnemyCollisions() {
    const hasPentester = staff.some(s => s.type === 'pentester');
    const dmgMult = DIFFICULTY_MULTIPLIERS[difficulty].playerDamage *
        (player.hasCompanion ? 1.5 : 1) *
        (hasPentester ? 1.5 : 1) *
        (player.damageMultiplier || 1);
    for (let bi = 0; bi < bullets.length; bi++) {
        const b = bullets[bi];
        if (b.life <= 0) continue;
        for (let ei = 0; ei < enemies.length; ei++) {
            const e = enemies[ei];
            if (e.currentHp <= 0) continue;
            const dx = b.x - e.x;
            if (dx > 48 || dx < -48) continue;
            const dy = b.y - e.y;
            if (dy > 48 || dy < -48) continue;
            const rr = b.radius + e.radius;
            if (dx * dx + dy * dy >= rr * rr) continue;
            b.life = 0;
            e.currentHp -= (b.damage || 1) * dmgMult;
            spawnParticles(b.x, b.y, e.color, 3);
            playSound('hit');
            if (e.currentHp <= 0) {
                kills++;
                comboCount++;
                comboTimer = 180;
                if (comboCount > maxCombo) maxCombo = comboCount;
                killHistory.push(e.typeKey);
                const comboMult = Math.min(comboCount, 5), points = e.score * comboMult;
                score += points;
                spawnParticles(e.x, e.y, e.color, 8, e.emoji);
                playSound('die');
                addText(e.x, e.y, '+' + points + (comboMult > 1 ? ' x' + comboMult : ''), '#f59e0b', comboMult > 1 ? 18 : 14);
                gameState.totalComputeUsed += e.computeUsage || 0;
                if (gameState.totalComputeUsed > gameState.maxComputeUsed) gameState.maxComputeUsed = gameState.totalComputeUsed;
                spawnPowerup(e.x, e.y);
                if (e.typeKey === 'fraudster') gameState.fraudsterCount--;
                if (e.typeKey === 'cryptominer') gameState.cryptominerCount--;
            }
            break;
        }
    }
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
