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

function checkEnemyServerCollisions() {
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
