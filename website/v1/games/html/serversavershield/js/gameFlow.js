// Game Flow Management
var highScore = 0;

function updateHighScoreDisplay() {
    const display = document.getElementById('highScoreDisplay');
    if (display) display.textContent = highScore.toLocaleString();
}

function startGame() {
    initAudio();
    resetGameState();
    initServers();
    initStars();
    gameRunning = true;
    gamePaused = false;
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
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
