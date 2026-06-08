// 3-Server Defense Line System
// Servers are positioned at bottom of screen and take damage from enemies
var servers = [];
var serverHitEffects = [];

function initServers() {
    servers = [];
    // Create 3 servers at bottom of screen
    const positions = [0.2, 0.5, 0.8]; // x positions as percentage of canvas width
    const emojis = ['🖥️', '💻', '🗄️'];
    
    for (let i = 0; i < 3; i++) {
        servers.push({
            id: i,
            x: CANVAS_WIDTH * positions[i],
            y: CANVAS_HEIGHT - 60,
            hp: 100,
            maxHp: 100,
            emoji: emojis[i],
            status: 'online', // online, degraded, offline
            lastHit: 0,
            incomeContribution: 0.33 // Each server contributes 1/3 of income
        });
    }
    updateServerIncomeContribution();
}

function updateServerIncomeContribution() {
    const onlineServers = servers.filter(s => s.status !== 'offline').length;
    servers.forEach(s => {
        if (s.status === 'online') {
            s.incomeContribution = 1 / onlineServers;
        } else {
            s.incomeContribution = 0;
        }
    });
    
    // Update global income based on server status
    if (onlineServers === 3) {
        gameState.incomeMultiplier = 1.0;
    } else if (onlineServers === 2) {
        gameState.incomeMultiplier = 0.7;
    } else if (onlineServers === 1) {
        gameState.incomeMultiplier = 0.4;
    } else {
        gameState.incomeMultiplier = 0.1;
    }
}

function checkServerCollisions() {
    const serverZoneY = CANVAS_HEIGHT - 100;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Check if enemy reached server zone
        if (enemy.y > serverZoneY) {
            // Find nearest server
            let nearestServer = null;
            let minDistance = Infinity;
            
            servers.forEach(server => {
                if (server.status !== 'offline') {
                    const dist = Math.abs(enemy.x - server.x);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestServer = server;
                    }
                }
            });
            
            if (nearestServer) {
                // Damage server
                const damage = ENEMIES[enemy.typeKey].reputationDmg || 5;
                damageServer(nearestServer.id, damage, enemy.typeKey);
                
                // Remove enemy
                enemies.splice(i, 1);
                
                // Screen shake effect
                triggerScreenShake(3, 200);
            }
        }
    }
}

function damageServer(serverId, damage, enemyType) {
    const server = servers[serverId];
    if (!server || server.status === 'offline') return;
    
    server.hp -= damage;
    server.lastHit = Date.now();
    
    // Add hit effect
    serverHitEffects.push({
        serverId: serverId,
        time: Date.now(),
        damage: damage
    });
    
    // Reputation damage
    const repDamage = ENEMIES[enemyType]?.reputationDmg || 5;
    gameState.reputation = Math.max(0, gameState.reputation - repDamage);
    
    // Generate bad review
    generateBadReview(enemyType);
    
    // Check server status
    if (server.hp <= 0) {
        server.hp = 0;
        server.status = 'offline';
        updateServerIncomeContribution();
        playSound('die');
    } else if (server.hp < 30) {
        server.status = 'degraded';
    }
}

function healServer(serverId, amount) {
    const server = servers[serverId];
    if (!server) return;
    
    server.hp = Math.min(server.maxHp, server.hp + amount);
    
    if (server.hp > 30 && server.status === 'degraded') {
        server.status = 'online';
        updateServerIncomeContribution();
    } else if (server.status === 'offline' && amount > 50) {
        // Emergency repair can bring server back online
        server.status = 'degraded';
        updateServerIncomeContribution();
    }
}

function emergencyRepairAll() {
    servers.forEach(s => {
        if (s.status !== 'online') {
            healServer(s.id, 50);
        }
    });
}

function getServerStatusColor(server) {
    if (server.status === 'offline') return '#ef4444';
    if (server.status === 'degraded') return '#f59e0b';
    return '#10b981';
}

function getServers() {
    return servers;
}

function getOnlineServerCount() {
    return servers.filter(s => s.status !== 'offline').length;
}

// Screen shake effect
var screenShake = { x: 0, y: 0, duration: 0, intensity: 0 };

function triggerScreenShake(intensity, duration) {
    screenShake.intensity = intensity;
    screenShake.duration = duration;
    screenShake.startTime = Date.now();
}

function updateScreenShake() {
    if (screenShake.duration > 0) {
        const elapsed = Date.now() - screenShake.startTime;
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

function getScreenShake() {
    return screenShake;
}

// Stub for review generation - full implementation in reviews.js
function generateBadReview(enemyType) {
    // This will be implemented fully in Phase 4
    console.log('Bad review generated from:', enemyType);
}
