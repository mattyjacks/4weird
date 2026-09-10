// Game Flow Management
var highScore = 0;

function updateHighScoreDisplay() {
    const display = document.getElementById('highScoreDisplay');
    if (display) display.textContent = highScore.toLocaleString();
}

function startGame() {
    initAudio();
    resetGameState();
    
    // Clear active game entities for a clean restart
    if (typeof clearEnemies === 'function') clearEnemies();
    if (typeof clearBullets === 'function') clearBullets();
    if (typeof clearPowerups === 'function') clearPowerups();
    if (typeof clearParticles === 'function') clearParticles();
    
    initServers();
    initStars();
    
    // Set management zone grace period
    if (typeof managementZoneGracePeriod !== 'undefined') {
        managementZoneGracePeriod = 180; // 3 second grace period
    }
    
    // Animate start screen out
    const startScreen = document.getElementById('startScreen');
    startScreen.style.opacity = '0';
    startScreen.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        startScreen.classList.add('hidden');
        startScreen.style.opacity = '';
        startScreen.style.transform = '';
    }, 500);
    
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    
    // Start game after transition
    setTimeout(() => {
        gameRunning = true;
        gamePaused = false;
        showWaveAnnouncement(1);
    }, 600);
}

// Wave announcement system
function showWaveAnnouncement(waveNum) {
    // Remove any existing announcement
    const existing = document.querySelector('.wave-announcement');
    if (existing) existing.remove();
    
    // Create announcement element
    const announcement = document.createElement('div');
    announcement.className = 'wave-announcement';
    
    // Different messages for different waves
    const messages = {
        1: '🌊 WAVE 1',
        2: '⚡ WAVE 2 - Speed Increase!',
        3: '🎯 WAVE 3 - New Enemies!',
        5: '🔥 BOSS WAVE 5',
        10: '👑 FINAL WAVE 10'
    };
    
    announcement.innerHTML = `
        <div>${messages[waveNum] || `🌊 WAVE ${waveNum}`}</div>
        <div style="font-size: 1rem; margin-top: 10px; opacity: 0.8;">Incoming threats detected!</div>
    `;
    
    document.body.appendChild(announcement);
    
    // Remove after animation
    setTimeout(() => {
        announcement.remove();
    }, 2000);
}

function pauseGame() {
    gamePaused = true;
    document.getElementById('pauseScreen').classList.remove('hidden');
}

function resumeGame() {
    gamePaused = false;
    document.getElementById('pauseScreen').classList.add('hidden');
}

function gameOver() {
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        updateHighScoreDisplay();
    }
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
    if (score > highScore) {
        highScore = score;
        updateHighScoreDisplay();
    }
    document.getElementById('victoryScore').textContent = score.toLocaleString();
    document.getElementById('victoryCombo').textContent = 'x' + maxCombo;
    document.getElementById('victoryBalance').textContent = '$' + Math.floor(gameState.balance);
    if (document.getElementById('victoryCompute')) document.getElementById('victoryCompute').textContent = gameState.maxComputeUsed.toLocaleString();
    if (document.getElementById('victoryReputation')) document.getElementById('victoryReputation').textContent = Math.floor(gameState.reputation) + '%';
    document.getElementById('victoryScreen').classList.remove('hidden');
    playSound('powerup');
}
